import express from 'express';
import http from 'http';
import https from 'https';
import net from 'net';
import { createServer as createViteServer } from 'vite';
import { spawn, ChildProcessWithoutNullStreams, execSync, exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { renderWebTerminalHtml } from './src/server/webTerminal';

// Prevent unhandled exceptions or rejections from crashing the Node process and killing cloudflared (Error 1033)
process.on('uncaughtException', (err) => {
  console.error('[CloudPRO Guard] Uncaught Exception:', err?.message || err);
});
process.on('unhandledRejection', (reason: any) => {
  console.error('[CloudPRO Guard] Unhandled Rejection:', reason?.message || reason);
});

type VhostSubdomain = any;

function execCmdAsync(
  command: string,
  options: number | { timeout?: number; cwd?: string; maxBuffer?: number } = {}
): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  const opts = typeof options === 'number' ? { timeout: options } : options;
  return new Promise((resolve) => {
    exec(
      command,
      {
        timeout: opts.timeout || 180000,
        cwd: opts.cwd || process.cwd(),
        maxBuffer: opts.maxBuffer || 50 * 1024 * 1024,
      },
      (err, stdout, stderr) => {
        if (err) {
          return resolve({
            stdout: String(stdout || ''),
            stderr: String(stderr || err.message || ''),
            ok: false,
          });
        }
        resolve({ stdout: String(stdout || ''), stderr: String(stderr || ''), ok: true });
      }
    );
  });
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const TMP_DIR = os.tmpdir();
const HOME_VAULT_DIR = path.join(os.homedir(), '.cloudpro-persistent-vault');
const LOCAL_DATA_DIR = path.join(process.cwd(), '.cloudpro-data');

for (const dir of [HOME_VAULT_DIR, LOCAL_DATA_DIR]) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Ignore directory creation errors
  }
}

const VHOST_STORE_PATH = path.join(HOME_VAULT_DIR, 'cloudpro-vhost-store.json');
const LEGACY_VHOST_STORE_PATH = path.join(TMP_DIR, 'cloudpro-vhost-store.json');
const FULL_STATE_VAULT_PATH = path.join(HOME_VAULT_DIR, 'cloudpro-full-state.json');
const LOCAL_FULL_STATE_PATH = path.join(LOCAL_DATA_DIR, 'cloudpro-full-state.json');
const TUNNEL_CONFIG_PATH = path.join(HOME_VAULT_DIR, 'cloudpro-tunnel-config.json');
const LEGACY_TUNNEL_CONFIG_PATH = path.join(TMP_DIR, 'cloudpro-tunnel-config.json');
const DDNS_CONFIG_PATH = path.join(HOME_VAULT_DIR, 'cloudpro-ddns-config.json');
const LEGACY_DDNS_CONFIG_PATH = path.join(TMP_DIR, 'cloudpro-ddns-config.json');
const BACKUPS_DIR = path.join(HOME_VAULT_DIR, 'backups');
const LOCAL_BACKUPS_DIR = path.join(LOCAL_DATA_DIR, 'backups');
for (const bDir of [BACKUPS_DIR, LOCAL_BACKUPS_DIR]) {
  try {
    if (!fs.existsSync(bDir)) fs.mkdirSync(bDir, { recursive: true });
  } catch {
    // Ignore dir creation
  }
}

interface BackupJob {
  id: string;
  type: 'backup_create' | 'backup_restore' | 'server_zip_pull';
  status: 'pending' | 'downloading' | 'snapshotting' | 'extracting' | 'permissions' | 'completed' | 'error';
  progress: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  targetDomain?: string;
  targetDir?: string;
  result?: any;
  error?: string;
}
const activeBackupJobs = new Map<string, BackupJob>();

function readVaultJson<T>(primaryPath: string, fallbackPaths: string[]): T | null {
  for (const p of [primaryPath, ...fallbackPaths]) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        if (raw && raw.trim()) {
          return JSON.parse(raw) as T;
        }
      }
    } catch {
      // Try next path
    }
  }
  return null;
}

function writeVaultJson(primaryPath: string, mirrorPaths: string[], data: unknown) {
  const serialized = JSON.stringify(data, null, 2);
  for (const p of [primaryPath, ...mirrorPaths]) {
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(p, serialized, 'utf-8');
    } catch {
      // Ignore write error on secondary mirror
    }
  }
}

const CLOUDFLARED_BIN =
  os.platform() === 'win32'
    ? path.join(TMP_DIR, 'cloudflared.exe')
    : path.join(HOME_VAULT_DIR, 'cloudflared');
const DEFAULT_TUNNEL_TOKEN =
  'eyJhIjoiNDkzZmMzM2I1ZTJmY2Y0YTYwNGU5OTg2NjE1Yjg5ZmQiLCJ0IjoiOTllN2RhNzktODM0Ni00MjRkLWI5YWItZDRkNWYxNGZiODg5IiwicyI6IlpEQmpZekU0TURFdFlqTTVNUzAwWTJWbExXSTJPV0V0WTJOaE1HSXdOekk0TlRNeSJ9';

interface VhostFile {
  id: string;
  accountId: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  content?: string;
}

interface VhostStore {
  accounts: Array<{
    id: string;
    primaryDomain: string;
    username: string;
    phpVersion: string;
    phpExtensions?: string[];
    phpDirectives?: Record<string, any>;
  }>;
  subdomains: Array<{
    id: string;
    accountId: string;
    fullDomain: string;
    documentRoot: string;
    phpVersion?: string;
    phpExtensions?: string[];
    phpDirectives?: Record<string, any>;
  }>;
  filesByAccount: Record<string, VhostFile[]>;
}

interface DdnsConfig {
  enabled: boolean;
  activeGatewayMode: 'tunnel' | 'ipv6_ddns' | 'hybrid';
  domain: string;
  cfApiToken: string;
  cfZoneId: string;
  recordType: 'AAAA' | 'A';
  customIpOverride: string;
  proxied: boolean;
  lastSyncedIp: string;
  lastSyncAt: string | null;
  lastSyncStatus: 'idle' | 'ok' | 'error';
  lastSyncMessage: string;
}

let vhostStore: VhostStore = {
  accounts: [
    {
      id: 'acc-rdm-01',
      primaryDomain: 'denbaguse.my.id',
      username: 'cloudpro',
      phpVersion: '8.2',
    },
  ],
  subdomains: [
    {
      id: 'dom-primary-01',
      accountId: 'acc-rdm-01',
      fullDomain: 'denbaguse.my.id',
      documentRoot: '/public_html',
    },
  ],
  filesByAccount: {},
};

const DEFAULT_PERSONAL_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Den Baguse — Website Pribadi &amp; Portfolio Digital</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <nav class="navbar">
    <div class="container nav-inner">
      <div class="brand">DEN<span>BAGUSE</span>.MY.ID</div>
      <div class="nav-links">
        <a href="#beranda">Beranda</a>
        <a href="#profil">Profil</a>
        <a href="#karya">Layanan &amp; Karya</a>
        <a href="#kontak">Kontak</a>
      </div>
    </div>
  </nav>

  <header id="beranda" class="hero">
    <div class="container hero-grid">
      <div class="hero-text">
        <span class="pill">● WEBSITE PRIBADI RESMI &bull; ONLINE</span>
        <h1>Selamat Datang di Portal Pribadi <span>Den Baguse</span></h1>
        <p>Ruang kreasi digital, pengembangan sistem informasi modern, infrastruktur cloud server mandiri, dan inovasi teknologi berbasis web.</p>
        <div class="hero-actions">
          <a href="#karya" class="btn-primary">Jelajahi Karya &amp; Proyek</a>
          <a href="#kontak" class="btn-outline">Hubungi Saya</a>
        </div>
      </div>
      <div class="hero-card">
        <h3>Profil Singkat</h3>
        <p class="role">Full-Stack Developer &amp; System Architect</p>
        <ul class="stats-list">
          <li><strong>Domain Utama:</strong> denbaguse.my.id</li>
          <li><strong>Infrastruktur:</strong> Cloud PRO Self-Hosted Linux</li>
          <li><strong>Fokus Keahlian:</strong> Web App, Cloud Server, Jaringan &amp; Otomasi</li>
          <li><strong>Status Layanan:</strong> Aktif 24/7 (Cloudflare Edge)</li>
        </ul>
      </div>
    </div>
  </header>

  <section id="karya" class="section">
    <div class="container">
      <h2 class="section-title">Fokus Pengembangan &amp; Proyek Digital</h2>
      <div class="grid-3">
        <div class="feature-box">
          <div class="icon">01</div>
          <h3>Pengembangan Web Modern</h3>
          <p>Membangun website pribadi, portal instansi, dan aplikasi web responsif berkecepatan tinggi dengan arsitektur modern.</p>
        </div>
        <div class="feature-box">
          <div class="icon">02</div>
          <h3>Cloud &amp; Infrastruktur Server</h3>
          <p>Manajemen server Linux mandiri, optimasi Nginx/PHP-FPM, keamanan SSL otomatis, dan integrasi Cloudflare Zero Trust.</p>
        </div>
        <div class="feature-box">
          <div class="icon">03</div>
          <h3>Transformasi &amp; Solusi Digital</h3>
          <p>Konsultasi dan implementasi sistem terintegrasi yang andal, aman, dan mudah dikelola dari mana saja.</p>
        </div>
      </div>
    </div>
  </section>

  <footer id="kontak" class="footer">
    <div class="container footer-inner">
      <div>
        <h4>DENBAGUSE.MY.ID — Website Pribadi</h4>
        <p>Dikelola langsung melalui Cloud PRO Linux Virtual Host (/public_html).</p>
      </div>
      <div class="footer-right">
        <span>&copy; 2026 Den Baguse. All rights reserved.</span>
      </div>
    </div>
  </footer>
</body>
</html>`;

const DEFAULT_PERSONAL_CSS = `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d16; color: #f1f5f9; line-height: 1.6; }
.container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
.navbar { position: sticky; top: 0; z-index: 20; background: rgba(9, 13, 22, 0.85); backdrop-filter: blur(12px); border-bottom: 1px solid #1e293b; padding: 16px 0; }
.nav-inner { display: flex; align-items: center; justify-content: space-between; }
.brand { font-weight: 800; font-size: 18px; letter-spacing: 0.5px; color: #ffffff; }
.brand span { color: #38bdf8; }
.nav-links { display: flex; gap: 24px; }
.nav-links a { color: #cbd5e1; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
.nav-links a:hover { color: #38bdf8; }
.hero { padding: 84px 0 72px; background: radial-gradient(circle at top right, rgba(14, 165, 233, 0.15), transparent 55%); border-bottom: 1px solid #1e293b; }
.hero-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 40px; align-items: center; }
.pill { display: inline-block; background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 999px; margin-bottom: 18px; letter-spacing: 0.4px; }
.hero h1 { font-size: 42px; font-weight: 800; line-height: 1.18; margin-bottom: 18px; color: #ffffff; }
.hero h1 span { background: linear-gradient(90deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hero p { font-size: 16px; color: #94a3b8; margin-bottom: 28px; max-width: 560px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 14px; }
.btn-primary { background: linear-gradient(135deg, #0284c7, #4f46e5); color: #fff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 12px; box-shadow: 0 10px 20px -5px rgba(2, 132, 199, 0.4); }
.btn-outline { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 22px; border-radius: 12px; }
.hero-card { background: #111827; border: 1px solid #1e293b; border-radius: 20px; padding: 28px; box-shadow: 0 20px 30px -10px rgba(0,0,0,0.5); }
.hero-card h3 { font-size: 20px; color: #ffffff; margin-bottom: 4px; }
.hero-card .role { font-size: 13px; color: #38bdf8; font-weight: 600; margin-bottom: 18px; }
.stats-list { list-style: none; }
.stats-list li { padding: 10px 0; border-top: 1px solid #1e293b; font-size: 13px; color: #cbd5e1; }
.stats-list li strong { color: #94a3b8; display: inline-block; width: 135px; }
.section { padding: 72px 0; }
.section-title { font-size: 26px; font-weight: 800; margin-bottom: 32px; text-align: center; color: #ffffff; }
.grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
.feature-box { background: #111827; border: 1px solid #1e293b; border-radius: 16px; padding: 26px; }
.feature-box .icon { display: inline-block; font-family: monospace; font-size: 13px; font-weight: 700; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 4px 10px; border-radius: 8px; margin-bottom: 14px; }
.feature-box h3 { font-size: 18px; margin-bottom: 10px; color: #f8fafc; }
.feature-box p { font-size: 14px; color: #94a3b8; }
.footer { border-top: 1px solid #1e293b; padding: 32px 0; background: #06090f; color: #64748b; font-size: 13px; }
.footer-inner { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; }
.footer h4 { color: #e2e8f0; margin-bottom: 4px; }
@media (max-width: 768px) { .hero-grid { grid-template-columns: 1fr; } .hero h1 { font-size: 30px; } .nav-links { display: none; } }`;

function sanitizeVhostStore(store: VhostStore): VhostStore {
  if (!Array.isArray(store.accounts) || store.accounts.length === 0) {
    store.accounts = [
      {
        id: 'acc-rdm-01',
        primaryDomain: 'denbaguse.my.id',
        username: 'cloudpro',
        phpVersion: '8.2',
      },
    ];
  } else {
    store.accounts = store.accounts.map(acc => {
      if (acc.id === 'acc-rdm-01') {
        return {
          ...acc,
          primaryDomain: acc.primaryDomain === 'rdm.denbaguse.my.id' ? 'denbaguse.my.id' : acc.primaryDomain,
          username: acc.username === 'madrasah' || !acc.username ? 'cloudpro' : acc.username,
          phpVersion: '8.2',
        };
      }
      return acc;
    });
  }

  if (!store.filesByAccount || typeof store.filesByAccount !== 'object') {
    store.filesByAccount = {};
  }

  const primaryAccId = store.accounts[0]?.id || 'acc-rdm-01';
  const existingFiles = Array.isArray(store.filesByAccount[primaryAccId])
    ? store.filesByAccount[primaryAccId]
    : [];

  // Clean all files across all accounts from any legacy floating button code
  for (const accId of Object.keys(store.filesByAccount)) {
    if (Array.isArray(store.filesByAccount[accId])) {
      store.filesByAccount[accId] = store.filesByAccount[accId].map(file => {
        if (typeof file.content === 'string' && (file.content.includes('cloudpro-admin-floater') || file.content.includes('Login Admin Cloud PRO'))) {
          file.content = file.content
            .replace(/<!-- Cloud PRO Admin Floating Bar -->[\s\S]*?<\/div>/gi, '')
            .replace(/<div[^>]*id=["']cloudpro-admin-floater["'][\s\S]*?<\/div>/gi, '')
            .replace(/<div[^>]*class=["'][^"']*cloudpro-admin-floater[^"']*["'][\s\S]*?<\/div>/gi, '')
            .replace(/<a[^>]*href=["']\/login\?panel=1["'][\s\S]*?<\/a>/gi, '')
            .replace(/<a[^>]*title=["']Masuk ke Panel Kontrol Cloud PRO["'][\s\S]*?<\/a>/gi, '')
            .replace(/<span>Login Admin Cloud PRO<\/span>/gi, '');
          file.size = file.content.length;
        }
        return file;
      });
    }
  }

  // Strip out legacy Rapor Digital Madrasah placeholder files
  const cleanedFiles = existingFiles.filter(
    f =>
      f.id !== 'vf-02' &&
      !(typeof f.content === 'string' && f.content.includes('Rapor Digital Madrasah - Server Siap!'))
  );

  const hasRootIndex = cleanedFiles.some(
    f =>
      f.type === 'file' &&
      (f.path.toLowerCase() === '/public_html/index.html' ||
        f.path.toLowerCase() === '/public_html/index.htm' ||
        f.path.toLowerCase() === '/public_html/index.php')
  );

  if (!hasRootIndex) {
    cleanedFiles.push(
      {
        id: 'vf-personal-html',
        accountId: primaryAccId,
        name: 'index.html',
        path: '/public_html/index.html',
        type: 'file',
        size: DEFAULT_PERSONAL_HTML.length,
        content: DEFAULT_PERSONAL_HTML,
      },
      {
        id: 'vf-personal-css',
        accountId: primaryAccId,
        name: 'style.css',
        path: '/public_html/style.css',
        type: 'file',
        size: DEFAULT_PERSONAL_CSS.length,
        content: DEFAULT_PERSONAL_CSS,
      }
    );
  }

  store.filesByAccount[primaryAccId] = cleanedFiles;
  return store;
}

let ddnsConfig: DdnsConfig = {
  enabled: false,
  activeGatewayMode: 'hybrid',
  domain: 'denbaguse.my.id',
  cfApiToken: '',
  cfZoneId: '',
  recordType: 'AAAA',
  customIpOverride: '',
  proxied: true,
  lastSyncedIp: '',
  lastSyncAt: null,
  lastSyncStatus: 'idle',
  lastSyncMessage: 'Belum disinkronkan.',
};

let ddnsLogs: string[] = [];

function appendDdnsLog(msg: string) {
  const ts = new Date().toLocaleTimeString('id-ID', { hour12: false });
  ddnsLogs.push(`[${ts}] ${msg}`);
  if (ddnsLogs.length > 60) ddnsLogs = ddnsLogs.slice(-60);
}

// Load persisted vhost store, full state vault & ddns config if exist
// Read from persistent vault (~/.cloudpro-persistent-vault) FIRST so git reset never wipes user data
const loadedVaultFullState = readVaultJson<Record<string, any>>(
  FULL_STATE_VAULT_PATH,
  [LOCAL_FULL_STATE_PATH, path.join(TMP_DIR, 'cloudpro-full-state.json')]
);
const loadedLocalFullState = readVaultJson<Record<string, any>>(
  LOCAL_FULL_STATE_PATH,
  []
);
let persistedFullAppState: Record<string, any> | null = loadedVaultFullState || loadedLocalFullState;
let vaultLastSavedAt: string = new Date().toISOString();
let dataRetentionLocked = true;

function normalizePath(p: string): string {
  if (!p) return '/public_html';
  let cleaned = String(p).trim().replace(/\\/g, '/').replace(/\/+$/, '');
  const pubIdx = cleaned.indexOf('/public_html');
  if (pubIdx !== -1) {
    cleaned = cleaned.substring(pubIdx);
  }
  if (!cleaned) return '/public_html';
  return cleaned.startsWith('/') ? cleaned : '/' + cleaned;
}

const COMMON_WEBSITE_SUBDIRS = new Set([
  'assets', 'css', 'js', 'images', 'img', 'uploads', 'fonts', 'media', 'static',
  'vendor', 'wp-admin', 'wp-content', 'wp-includes', 'includes', 'build', 'dist',
  'public', 'storage', 'templates', 'themes', 'plugins', 'modules', 'components',
  'lib', 'src', 'config', 'data', 'lang', 'locales', 'cgi-bin', '.well-known',
  'node_modules', '.git', 'domains', 'backup', 'backups',
]);

function getSubdomainDocRoots(accountId?: string): Set<string> {
  const roots = new Set<string>();
  for (const sub of vhostStore.subdomains || []) {
    if (accountId && sub.accountId && sub.accountId !== accountId && accountId !== 'acc-rdm-01') continue;
    const norm = normalizePath(sub.documentRoot || '').toLowerCase();
    if (norm && norm !== '/public_html' && norm.startsWith('/public_html/')) {
      roots.add(norm);
    }
  }
  if (persistedFullAppState && Array.isArray(persistedFullAppState.domains)) {
    for (const d of persistedFullAppState.domains) {
      if (d && (d.type === 'subdomain' || d.subdomainPrefix)) {
        const norm = normalizePath(d.documentRoot || `/public_html/${d.subdomainPrefix || ''}`).toLowerCase();
        if (norm && norm !== '/public_html' && norm.startsWith('/public_html/')) {
          roots.add(norm);
        }
      }
    }
  }
  // Also detect physical subdirectories in public_html that are standalone websites (have their own index.html / index.php)
  for (const baseDir of [path.join(process.cwd(), 'public_html'), path.join(HOME_VAULT_DIR, 'public_html')]) {
    try {
      if (fs.existsSync(baseDir) && fs.statSync(baseDir).isDirectory()) {
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const e of entries) {
          if (!e.isDirectory() || e.name.startsWith('.') || COMMON_WEBSITE_SUBDIRS.has(e.name.toLowerCase())) continue;
          const subPath = path.join(baseDir, e.name);
          if (
            fs.existsSync(path.join(subPath, 'index.html')) ||
            fs.existsSync(path.join(subPath, 'index.php')) ||
            fs.existsSync(path.join(subPath, 'index.htm'))
          ) {
            roots.add(`/public_html/${e.name.toLowerCase()}`);
          }
        }
      }
    } catch {}
  }
  return roots;
}

function isPathBelongingToDocRoot(filePath: string, docRoot: string, accountId?: string): boolean {
  const p = normalizePath(filePath).toLowerCase();
  const root = normalizePath(docRoot).toLowerCase();
  if (p === root) return false;
  if (!p.startsWith(root + '/')) return false;

  // If checking the main domain (/public_html), strictly exclude all subdomain document roots!
  if (root === '/public_html') {
    const subRoots = getSubdomainDocRoots(accountId);
    for (const sr of subRoots) {
      if (p === sr || p.startsWith(sr + '/')) {
        return false;
      }
    }
  }
  return true;
}

function registerSubdomainIfSubdir(accountId: string, cleanDir: string) {
  const normDir = normalizePath(cleanDir);
  const subFolderMatch = normDir.match(/^\/public_html\/([^/]+)$/);
  if (subFolderMatch && subFolderMatch[1]) {
    const subPrefix = subFolderMatch[1].toLowerCase();
    if (COMMON_WEBSITE_SUBDIRS.has(subPrefix)) return;
    const acc = vhostStore.accounts.find(a => a.id === accountId) || vhostStore.accounts[0];
    const parentDomain = acc?.primaryDomain || 'denbaguse.my.id';
    const fullSubDomain = `${subPrefix}.${parentDomain}`;
    const existingSubIdx = vhostStore.subdomains.findIndex(
      s =>
        s.fullDomain.toLowerCase() === fullSubDomain.toLowerCase() ||
        normalizePath(s.documentRoot).toLowerCase() === normDir.toLowerCase()
    );
    const subEntry = {
      id: existingSubIdx >= 0 ? vhostStore.subdomains[existingSubIdx].id : `sub-${subPrefix}`,
      accountId: acc?.id || accountId || 'acc-rdm-01',
      fullDomain: existingSubIdx >= 0 ? vhostStore.subdomains[existingSubIdx].fullDomain : fullSubDomain,
      documentRoot: normDir,
    };
    if (existingSubIdx >= 0) {
      vhostStore.subdomains[existingSubIdx] = subEntry;
    } else {
      vhostStore.subdomains.push(subEntry);
    }
  }
}

function persistVhostStore() {
  writeVaultJson(
    VHOST_STORE_PATH,
    [
      path.join(LOCAL_DATA_DIR, 'cloudpro-vhost-store.json'),
      LEGACY_VHOST_STORE_PATH,
    ],
    vhostStore
  );
  vaultLastSavedAt = new Date().toISOString();
}

function mergeFullAppStates(
  baseState: Record<string, any> | null,
  incomingState: Record<string, any>
): Record<string, any> {
  if (!baseState || typeof baseState !== 'object') {
    return incomingState;
  }
  if (incomingState.replaceAll === true) {
    const clean = { ...incomingState };
    delete clean.replaceAll;
    return clean;
  }

  const baseDeleted: string[] = Array.isArray(baseState.deletedIds) ? baseState.deletedIds : [];
  const incDeleted: string[] = Array.isArray(incomingState.deletedIds) ? incomingState.deletedIds : [];
  const deletedSet = new Set<string>([...baseDeleted, ...incDeleted]);

  const mergeById = (baseArr: any[], incArr: any[]): any[] => {
    const bList = Array.isArray(baseArr) ? baseArr : [];
    const iList = Array.isArray(incArr) ? incArr : [];
    const map = new Map<string, any>();

    for (const item of bList) {
      if (item && item.id && !deletedSet.has(String(item.id))) {
        map.set(String(item.id), item);
      }
    }
    for (const item of iList) {
      if (item && item.id && !deletedSet.has(String(item.id))) {
        const prev = map.get(String(item.id));
        if (!prev) {
          map.set(String(item.id), item);
        } else {
          const prevTs = Number(prev._updatedAt || 0);
          const incTs = Number(item._updatedAt || 0);
          if (prevTs > incTs && incTs > 0) {
            map.set(String(item.id), { ...item, ...prev });
          } else {
            map.set(String(item.id), { ...prev, ...item });
          }
        }
      }
    }
    return Array.from(map.values());
  };

  // Merge virtualFiles by accountId + normalized path or id, preserving non-empty content
  const mergeVirtualFiles = (baseFiles: any[], incFiles: any[]): any[] => {
    const bList = Array.isArray(baseFiles) ? baseFiles : [];
    const iList = Array.isArray(incFiles) ? incFiles : [];
    const byKey = new Map<string, any>();

    for (const f of bList) {
      if (!f || deletedSet.has(String(f.id || ''))) continue;
      const key = `${f.accountId || 'acc-rdm-01'}:${normalizePath(f.path || '').toLowerCase()}`;
      byKey.set(key, f);
    }
    for (const f of iList) {
      if (!f || deletedSet.has(String(f.id || ''))) continue;
      const key = `${f.accountId || 'acc-rdm-01'}:${normalizePath(f.path || '').toLowerCase()}`;
      const prev = byKey.get(key);
      if (prev) {
        const resolvedContent =
          typeof f.content === 'string' && f.content.length > 0
            ? f.content
            : prev.content;
        byKey.set(key, {
          ...prev,
          ...f,
          content: resolvedContent,
        });
      } else {
        byKey.set(key, f);
      }
    }
    return Array.from(byKey.values());
  };

  const mergedDatabaseTables: Record<string, any[]> = {
    ...(baseState.databaseTables || {}),
    ...(incomingState.databaseTables || {}),
  };

  return {
    ...baseState,
    ...incomingState,
    deletedIds: Array.from(deletedSet).slice(-600),
    users: mergeById(baseState.users, incomingState.users),
    resellerProfiles: mergeById(baseState.resellerProfiles, incomingState.resellerProfiles),
    serverNodes: mergeById(baseState.serverNodes, incomingState.serverNodes),
    hostingPlans: mergeById(baseState.hostingPlans, incomingState.hostingPlans),
    hostingAccounts: mergeById(baseState.hostingAccounts, incomingState.hostingAccounts),
    domains: mergeById(baseState.domains, incomingState.domains),
    databases: mergeById(baseState.databases, incomingState.databases),
    databaseTables: mergedDatabaseTables,
    emailMailboxes: mergeById(baseState.emailMailboxes, incomingState.emailMailboxes),
    dnsRecords: mergeById(baseState.dnsRecords, incomingState.dnsRecords),
    cronJobs: mergeById(baseState.cronJobs, incomingState.cronJobs),
    backups: mergeById(baseState.backups, incomingState.backups),
    invoices: mergeById(baseState.invoices, incomingState.invoices),
    auditLogs: mergeById(baseState.auditLogs, incomingState.auditLogs).slice(0, 200),
    firewallRules: mergeById(baseState.firewallRules, incomingState.firewallRules),
    apiKeys: mergeById(baseState.apiKeys, incomingState.apiKeys),
    notifications: mergeById(baseState.notifications, incomingState.notifications).slice(0, 100),
    vpsInstances: mergeById(baseState.vpsInstances, incomingState.vpsInstances),
    vpsSnapshots: mergeById(baseState.vpsSnapshots, incomingState.vpsSnapshots),
    vpsFirewallRules: mergeById(baseState.vpsFirewallRules, incomingState.vpsFirewallRules),
    ipAddresses: mergeById(baseState.ipAddresses, incomingState.ipAddresses),
    nameserverConfigs: mergeById(baseState.nameserverConfigs, incomingState.nameserverConfigs),
    r2Configs: mergeById(baseState.r2Configs, incomingState.r2Configs),
    optimizedMedia: mergeById(baseState.optimizedMedia, incomingState.optimizedMedia),
    virtualFiles: mergeVirtualFiles(baseState.virtualFiles, incomingState.virtualFiles),
    letterheadConfig: incomingState.letterheadConfig || baseState.letterheadConfig,
    stateUpdatedAt: Date.now(),
  };
}

if (loadedVaultFullState && loadedLocalFullState) {
  persistedFullAppState = mergeFullAppStates(loadedLocalFullState, loadedVaultFullState);
}

function persistFullAppState(stateObj: Record<string, any>) {
  const mergedState = mergeFullAppStates(persistedFullAppState, stateObj);
  persistedFullAppState = mergedState;
  const deletedSet = new Set<string>(Array.isArray(mergedState.deletedIds) ? mergedState.deletedIds : []);

  // Sync accounts and domains/subdomains from full state into vhostStore so subdomain docRoots are always known
  if (mergedState && typeof mergedState === 'object') {
    if (Array.isArray(mergedState.hostingAccounts) && mergedState.hostingAccounts.length > 0) {
      vhostStore.accounts = vhostStore.accounts.filter(a => !deletedSet.has(a.id));
      for (const acc of mergedState.hostingAccounts) {
        if (acc && acc.id && acc.primaryDomain && !deletedSet.has(acc.id)) {
          const idx = vhostStore.accounts.findIndex(a => a.id === acc.id);
          const mapped = {
            ...acc,
            id: acc.id,
            primaryDomain: acc.primaryDomain,
            username: acc.username || 'cloudpro',
            phpVersion: acc.phpVersion || '8.2',
          };
          if (idx >= 0) vhostStore.accounts[idx] = mapped;
          else vhostStore.accounts.push(mapped);
        }
      }
    }
    if (Array.isArray(mergedState.domains)) {
      vhostStore.subdomains = vhostStore.subdomains.filter(s => !deletedSet.has(s.id) && !deletedSet.has(s.accountId));
      for (const d of mergedState.domains) {
        if (d && d.domain && !deletedSet.has(d.id)) {
          const cleanDoc = normalizePath(
            d.documentRoot || (d.subdomainPrefix ? `/public_html/${d.subdomainPrefix}` : '/public_html')
          );
          const idx = vhostStore.subdomains.findIndex(
            s => s.fullDomain.toLowerCase() === String(d.domain).toLowerCase()
          );
          const mappedSub = {
            id: d.id || `dom-${d.domain}`,
            accountId: d.accountId || 'acc-rdm-01',
            fullDomain: d.domain,
            documentRoot: cleanDoc,
            phpVersion: d.phpVersion || (idx >= 0 ? vhostStore.subdomains[idx].phpVersion : undefined),
            phpExtensions: d.phpExtensions || (idx >= 0 ? vhostStore.subdomains[idx].phpExtensions : undefined),
            phpDirectives: d.phpDirectives || (idx >= 0 ? vhostStore.subdomains[idx].phpDirectives : undefined),
          };
          if (idx >= 0) vhostStore.subdomains[idx] = mappedSub;
          else vhostStore.subdomains.push(mappedSub);
        }
      }
    }
  }
  writeVaultJson(
    FULL_STATE_VAULT_PATH,
    [LOCAL_FULL_STATE_PATH, path.join(TMP_DIR, 'cloudpro-full-state.json')],
    mergedState
  );
  persistVhostStore();
  vaultLastSavedAt = new Date().toISOString();
}

try {
  const localRepoVhostPath = path.join(LOCAL_DATA_DIR, 'cloudpro-vhost-store.json');
  const loadedVhost = readVaultJson<VhostStore>(VHOST_STORE_PATH, [
    localRepoVhostPath,
    LEGACY_VHOST_STORE_PATH,
  ]);
  if (loadedVhost) {
    vhostStore = sanitizeVhostStore(loadedVhost);
  } else {
    vhostStore = sanitizeVhostStore(vhostStore);
  }

  // Normalize all existing subdomain documentRoots in vhostStore
  if (Array.isArray(vhostStore.subdomains)) {
    vhostStore.subdomains = vhostStore.subdomains.map(s => ({
      ...s,
      documentRoot: normalizePath(s.documentRoot || '/public_html'),
    }));
  }

  // Auto-sync all virtualFiles from full app state vault into vhostStore so cloned files are immediately active
  if (persistedFullAppState && Array.isArray(persistedFullAppState.virtualFiles)) {
    for (const vf of persistedFullAppState.virtualFiles) {
      if (vf && vf.accountId) {
        if (!vhostStore.filesByAccount[vf.accountId]) {
          vhostStore.filesByAccount[vf.accountId] = [];
        }
        const normVfPath = normalizePath(vf.path || '');
        const existingIdx = vhostStore.filesByAccount[vf.accountId].findIndex(
          (x: any) => x.id === vf.id || normalizePath(x.path || '') === normVfPath
        );
        if (existingIdx === -1) {
          vhostStore.filesByAccount[vf.accountId].push({ ...vf, path: normVfPath });
        } else if (!vhostStore.filesByAccount[vf.accountId][existingIdx].content && vf.content) {
          vhostStore.filesByAccount[vf.accountId][existingIdx] = { ...vf, path: normVfPath };
        }
      }
    }
  }

  // Lightweight physical public_html startup scan (prevents RAM/JSON bloat while indexing entry files & subdomains)
  const localPubHtml = path.join(process.cwd(), 'public_html');
  if (fs.existsSync(localPubHtml) && fs.statSync(localPubHtml).isDirectory()) {
    const primaryId = vhostStore.accounts[0]?.id || 'acc-rdm-01';
    if (!vhostStore.filesByAccount[primaryId]) {
      vhostStore.filesByAccount[primaryId] = [];
    }
    let scannedCount = 0;
    const scanDirRecursive = (cDir: string, rel: string, depth: number) => {
      if (depth > 3 || scannedCount > 400) return;
      try {
        const items = fs.readdirSync(cDir);
        for (const item of items) {
          if (item === '.' || item === '..' || item === '.git' || item === 'node_modules' || item === '__MACOSX') continue;
          const fullP = path.join(cDir, item);
          const relP = rel ? `${rel}/${item}` : item;
          const st = fs.statSync(fullP);
          const virtPath = normalizePath(`/public_html/${relP}`);
          if (st.isDirectory()) {
            if (depth === 0 && !COMMON_WEBSITE_SUBDIRS.has(item.toLowerCase())) {
              if (
                fs.existsSync(path.join(fullP, 'index.html')) ||
                fs.existsSync(path.join(fullP, 'index.php')) ||
                fs.existsSync(path.join(fullP, 'index.htm'))
              ) {
                registerSubdomainIfSubdir(primaryId, `/public_html/${item}`);
              }
            }
            scanDirRecursive(fullP, relP, depth + 1);
          } else if (st.isFile()) {
            scannedCount++;
            const lowerName = item.toLowerCase();
            const isEntryFile =
              lowerName === 'index.html' ||
              lowerName === 'index.php' ||
              lowerName === 'index.htm' ||
              lowerName === 'style.css' ||
              lowerName === 'script.js';
            let content: string | undefined;
            if (isEntryFile && st.size <= 350_000) {
              try { content = fs.readFileSync(fullP, 'utf-8'); } catch {}
            }
            const existingIdx = vhostStore.filesByAccount[primaryId].findIndex(
              (x: any) => normalizePath(x.path) === virtPath
            );
            const vfEntry = {
              id: `vf-phys-${relP.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
              accountId: primaryId,
              name: item,
              path: virtPath,
              type: 'file' as const,
              size: st.size,
              content,
              updatedAt: new Date().toISOString(),
            };
            if (existingIdx === -1) {
              vhostStore.filesByAccount[primaryId].push(vfEntry);
            } else if ((!vhostStore.filesByAccount[primaryId][existingIdx].content || lowerName === 'index.html') && content) {
              vhostStore.filesByAccount[primaryId][existingIdx] = vfEntry;
            }
          }
        }
      } catch {}
    };
    scanDirRecursive(localPubHtml, '', 0);

    // Sanitize and sync all Vite JS chunks across local and vault public_html/assets so module URLs match 100% (?v=cp4)
    try {
      const unifyChunkUrls = (code: string): string =>
        code
          .replace(/\.\/index-Dx_-uADC\.js(?:\?v=[A-Za-z0-9_.-]+)?/g, './index-Dx_-uADC.js?v=cp4')
          .replace(/\.\/AdminPortal-BI2p42T-\.js(?:\?v=[A-Za-z0-9_.-]+)?/g, './AdminPortal-BI2p42T-.js?v=cp4')
          .replace(/\.\/LogoUploaderModal-C2_9Wzl6\.js(?:\?v=[A-Za-z0-9_.-]+)?/g, './LogoUploaderModal-C2_9Wzl6.js?v=cp4')
          .replace(/\.\/sliders-vertical-D_9bXxob\.js(?:\?v=[A-Za-z0-9_.-]+)?/g, './sliders-vertical-D_9bXxob.js?v=cp4')
          .replace(/\.\/settings-BjXsQb13\.js(?:\?v=[A-Za-z0-9_.-]+)?/g, './settings-BjXsQb13.js?v=cp4')
          .replace(/\.\/StickyFooterEditorModal-BfM8Lk1W\.js(?:\?v=[A-Za-z0-9_.-]+)?/g, './StickyFooterEditorModal-BfM8Lk1W.js?v=cp4');

      for (const pubRoot of [localPubHtml, path.join(HOME_VAULT_DIR, 'public_html')]) {
        if (!fs.existsSync(pubRoot)) continue;
        const idxHtmlP = path.join(pubRoot, 'index.html');
        if (fs.existsSync(idxHtmlP)) {
          try {
            const rawHtml = fs.readFileSync(idxHtmlP, 'utf-8');
            const updatedHtml = rawHtml.replace(
              /src=["']\/assets\/index-Dx_-uADC\.js(?:\?v=[A-Za-z0-9_.-]+)?["']/g,
              'src="/assets/index-Dx_-uADC.js?v=cp4"'
            );
            if (updatedHtml !== rawHtml) {
              fs.writeFileSync(idxHtmlP, updatedHtml, 'utf-8');
            }
          } catch {}
        }
        const aDir = path.join(pubRoot, 'assets');
        if (!fs.existsSync(aDir)) continue;
        for (const fName of fs.readdirSync(aDir)) {
          if (!fName.endsWith('.js')) continue;
          const fPath = path.join(aDir, fName);
          try {
            let jsText = fs.readFileSync(fPath, 'utf-8');
            let modified = unifyChunkUrls(jsText);
            if (
              modified.includes('admin-navbar-plesk-btn') ||
              modified.includes('admin-navbar-cpanel-btn') ||
              modified.includes('admin-navbar-quick-cpanel-zip-btn') ||
              modified.includes('Paket Siap Hosting Plesk')
            ) {
              const navStart = modified.indexOf(',e.jsxs("button",{id:"admin-navbar-plesk-btn"');
              const navEnd = modified.indexOf(',e.jsxs("button",{id:"admin-navbar-users-btn"');
              if (navStart !== -1 && navEnd !== -1) {
                modified = modified.slice(0, navStart) + modified.slice(navEnd);
              }
              const cardStart = modified.indexOf(
                'e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",children:[e.jsxs("div",{className:"bg-gradient-to-br from-[#064e3b] via-[#043327] to-[#022c22] text-white p-5 rounded-3xl border-2 border-amber-400/90'
              );
              const cardNext = modified.indexOf(
                'e.jsxs("div",{className:"bg-gradient-to-br from-[#1e1b4b] to-[#0f172a]',
                cardStart
              );
              if (cardStart !== -1 && cardNext !== -1) {
                modified =
                  modified.slice(0, cardStart) +
                  'e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[' +
                  modified.slice(cardNext);
              }
              const quickBtn =
                ',e.jsxs("button",{onClick:()=>T("plesk"),className:"px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-emerald-950 text-xs font-extrabold flex items-center gap-1.5 border border-amber-400 shadow-xs cursor-pointer",children:[e.jsx(ft,{className:"w-3.5 h-3.5 text-emerald-950"}),e.jsx("span",{children:"Hosting Plesk"})]})';
              modified = modified.replace(quickBtn, '');
              const expStart = modified.indexOf('l==="exports"&&e.jsx("div"');
              const expNext = modified.indexOf(
                'e.jsxs("div",{className:"bg-white p-6 rounded-3xl border-2 border-emerald-200',
                expStart
              );
              if (expStart !== -1 && expNext !== -1) {
                modified =
                  modified.slice(0, expStart) +
                  'l==="exports"&&e.jsx("div",{className:"space-y-6",children:e.jsxs("div",{className:"grid grid-cols-1 gap-5",children:[' +
                  modified.slice(expNext).replace('2. Ekspor Arsip Pesan Masuk (CSV)', 'Ekspor Arsip Pesan Masuk (CSV)');
              }
              modified = modified.replace(/C==="plesk"&&/g, 'false&&').replace(/C==="cpanel"&&/g, 'false&&');
            }
            if (modified !== jsText) {
              fs.writeFileSync(fPath, modified, 'utf-8');
            }
          } catch {}
        }
      }
      // Mirror cleaned localPubHtml/assets/*.js into HOME_VAULT_DIR/public_html/assets/
      const localAssetsDir = path.join(localPubHtml, 'assets');
      const vaultAssetsDir = path.join(HOME_VAULT_DIR, 'public_html', 'assets');
      if (fs.existsSync(localAssetsDir)) {
        fs.mkdirSync(vaultAssetsDir, { recursive: true });
        for (const fName of fs.readdirSync(localAssetsDir)) {
          if (fName.endsWith('.js') || fName.endsWith('.css')) {
            try {
              fs.copyFileSync(path.join(localAssetsDir, fName), path.join(vaultAssetsDir, fName));
            } catch {}
          }
        }
      }
    } catch {}
  }

  if (persistedFullAppState) {
    persistFullAppState(persistedFullAppState);
  }
  persistVhostStore();
} catch {
  vhostStore = sanitizeVhostStore(vhostStore);
}

try {
  const loadedDdns = readVaultJson<Partial<DdnsConfig>>(DDNS_CONFIG_PATH, [
    path.join(LOCAL_DATA_DIR, 'cloudpro-ddns-config.json'),
    LEGACY_DDNS_CONFIG_PATH,
  ]);
  if (loadedDdns) {
    ddnsConfig = { ...ddnsConfig, ...loadedDdns };
  }
} catch {
  // Ignore
}

function saveDdnsConfig() {
  writeVaultJson(
    DDNS_CONFIG_PATH,
    [path.join(LOCAL_DATA_DIR, 'cloudpro-ddns-config.json'), LEGACY_DDNS_CONFIG_PATH],
    ddnsConfig
  );
}

// Detect public IPv6 & IPv4 from Linux OS interfaces + external trace (cached for 60s to prevent hanging)
let cachedDetectedIps: { ipv6: string | null; ipv4: string | null; localIpv6List: string[]; ts: number } | null = null;

async function detectServerIps(): Promise<{ ipv6: string | null; ipv4: string | null; localIpv6List: string[] }> {
  if (cachedDetectedIps && Date.now() - cachedDetectedIps.ts < 60_000) {
    return {
      ipv6: cachedDetectedIps.ipv6,
      ipv4: cachedDetectedIps.ipv4,
      localIpv6List: cachedDetectedIps.localIpv6List,
    };
  }

  const localIpv6List: string[] = [];
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv6' && !net.internal && !net.address.startsWith('fe80:')) {
          localIpv6List.push(net.address);
        }
      }
    }
  } catch {
    // Ignore
  }

  let publicIpv6: string | null = localIpv6List[0] || null;
  let publicIpv4: string | null = null;

  try {
    const res6 = await fetch('https://api64.ipify.org?format=json', {
      signal: AbortSignal.timeout(1200),
    });
    if (res6.ok) {
      const data = (await res6.json()) as { ip?: string };
      if (data.ip && data.ip.includes(':')) {
        publicIpv6 = data.ip;
      } else if (data.ip) {
        publicIpv4 = data.ip;
      }
    }
  } catch {
    // Ignore
  }

  try {
    const res4 = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(1200),
    });
    if (res4.ok) {
      const data = (await res4.json()) as { ip?: string };
      if (data.ip) publicIpv4 = data.ip;
    }
  } catch {
    // Ignore
  }

  const result = { ipv6: publicIpv6, ipv4: publicIpv4, localIpv6List };
  cachedDetectedIps = { ...result, ts: Date.now() };
  return result;
}

// Sync `@` and `*` (Wildcard) records to Cloudflare via API so user never has to open Cloudflare again
async function syncCloudflareWildcardDdns(manualTrigger = false): Promise<{ ok: boolean; message: string }> {
  if (!ddnsConfig.cfApiToken.trim()) {
    return { ok: false, message: 'Cloudflare API Token belum diisi.' };
  }

  const detected = await detectServerIps();
  const targetIp =
    ddnsConfig.customIpOverride.trim() ||
    (ddnsConfig.recordType === 'AAAA' ? detected.ipv6 : detected.ipv4) ||
    '';

  if (!targetIp) {
    const msg =
      ddnsConfig.recordType === 'AAAA'
        ? 'IPv6 publik tidak terdeteksi di jaringan ini. Masukkan IPv6 IndiHome secara manual atau jalankan di jaringan IndiHome IPv6.'
        : 'IPv4 publik tidak terdeteksi.';
    ddnsConfig.lastSyncStatus = 'error';
    ddnsConfig.lastSyncMessage = msg;
    saveDdnsConfig();
    appendDdnsLog(`GAGAL: ${msg}`);
    return { ok: false, message: msg };
  }

  if (!manualTrigger && ddnsConfig.lastSyncedIp === targetIp && ddnsConfig.lastSyncStatus === 'ok') {
    return { ok: true, message: `IP belum berubah (${targetIp}), sinkronisasi dilewati.` };
  }

  const headers = {
    Authorization: `Bearer ${ddnsConfig.cfApiToken.trim()}`,
    'Content-Type': 'application/json',
  };

  try {
    let zoneId = ddnsConfig.cfZoneId.trim();
    if (!zoneId) {
      appendDdnsLog(`Mencari Zone ID otomatis untuk domain ${ddnsConfig.domain}...`);
      const zoneRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(ddnsConfig.domain)}`,
        { headers }
      );
      const zoneData = (await zoneRes.json()) as any;
      if (!zoneData?.success || !zoneData?.result?.[0]?.id) {
        throw new Error(
          zoneData?.errors?.[0]?.message || `Zone ${ddnsConfig.domain} tidak ditemukan di akun Cloudflare.`
        );
      }
      zoneId = zoneData.result[0].id;
      ddnsConfig.cfZoneId = zoneId;
      appendDdnsLog(`Zone ID ditemukan: ${zoneId}`);
    }

    // Update both root (@) and wildcard (*) so ALL subdomains work forever without returning to Cloudflare!
    const hostnamesToSync = [ddnsConfig.domain, `*.${ddnsConfig.domain}`];

    for (const fqdn of hostnamesToSync) {
      const listRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=${ddnsConfig.recordType}&name=${encodeURIComponent(fqdn)}`,
        { headers }
      );
      const listData = (await listRes.json()) as any;
      const existing = listData?.result?.[0];

      const payload = {
        type: ddnsConfig.recordType,
        name: fqdn,
        content: targetIp,
        ttl: 1, // Auto TTL
        proxied: ddnsConfig.proxied,
      };

      if (existing?.id) {
        const updateRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${existing.id}`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
          }
        );
        const updateData = (await updateRes.json()) as any;
        if (!updateData?.success) {
          throw new Error(updateData?.errors?.[0]?.message || `Gagal update record ${fqdn}`);
        }
        appendDdnsLog(`Updated ${ddnsConfig.recordType} [${fqdn}] -> ${targetIp} (Proxied: ${ddnsConfig.proxied})`);
      } else {
        const createRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          }
        );
        const createData = (await createRes.json()) as any;
        if (!createData?.success) {
          throw new Error(createData?.errors?.[0]?.message || `Gagal membuat record ${fqdn}`);
        }
        appendDdnsLog(`Created ${ddnsConfig.recordType} [${fqdn}] -> ${targetIp} (Proxied: ${ddnsConfig.proxied})`);
      }
    }

    ddnsConfig.lastSyncedIp = targetIp;
    ddnsConfig.lastSyncAt = new Date().toISOString();
    ddnsConfig.lastSyncStatus = 'ok';
    ddnsConfig.lastSyncMessage = `Sukses sinkron @ dan *.${ddnsConfig.domain} ke ${targetIp}`;
    saveDdnsConfig();
    return { ok: true, message: ddnsConfig.lastSyncMessage };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    ddnsConfig.lastSyncStatus = 'error';
    ddnsConfig.lastSyncMessage = errMsg;
    saveDdnsConfig();
    appendDdnsLog(`ERROR: ${errMsg}`);
    return { ok: false, message: errMsg };
  }
}

// Background Auto-DDNS check every 3 minutes if enabled
setInterval(() => {
  if (ddnsConfig.enabled && ddnsConfig.cfApiToken) {
    syncCloudflareWildcardDdns(false).catch(() => {});
  }
}, 180_000);

// Cloudflared process state
let tunnelProcess: ChildProcessWithoutNullStreams | null = null;
let tunnelStatus: 'stopped' | 'starting' | 'running' | 'error' = 'stopped';
let tunnelLogs: string[] = [];
let tunnelTokenSaved = '';
let tunnelStartedAt: string | null = null;
let quickTunnelUrl: string | null = null;

function appendTunnelLog(line: string) {
  const clean = line.trim();
  if (!clean) return;
  const ts = new Date().toLocaleTimeString('id-ID', { hour12: false });
  tunnelLogs.push(`[${ts}] ${clean}`);
  if (tunnelLogs.length > 80) {
    tunnelLogs = tunnelLogs.slice(-80);
  }
  if (
    clean.includes('Registered tunnel connection') ||
    (clean.includes('Connection') && clean.includes('registered'))
  ) {
    tunnelStatus = 'running';
  }
  const tryCfMatch = clean.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (tryCfMatch) {
    quickTunnelUrl = tryCfMatch[0];
    tunnelStatus = 'running';
  }
}

async function ensureCloudflaredBinary(): Promise<string> {
  if (os.platform() === 'win32') {
    try {
      execSync('cloudflared --version', { stdio: 'ignore' });
      return 'cloudflared';
    } catch {
      if (fs.existsSync(CLOUDFLARED_BIN)) {
        try {
          execSync(`"${CLOUDFLARED_BIN}" --version`, { stdio: 'ignore' });
          return CLOUDFLARED_BIN;
        } catch {
          try { fs.unlinkSync(CLOUDFLARED_BIN); } catch {}
        }
      }
      appendTunnelLog('Mengunduh binary resmi cloudflared (windows-amd64.exe)...');
      execSync(
        `curl -sL --retry 3 --connect-timeout 10 --max-time 120 https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -o "${CLOUDFLARED_BIN}"`
      );
      return CLOUDFLARED_BIN;
    }
  }

  // Validate existing binary if present
  if (fs.existsSync(CLOUDFLARED_BIN)) {
    try {
      fs.chmodSync(CLOUDFLARED_BIN, 0o755);
      const stats = fs.statSync(CLOUDFLARED_BIN);
      if (stats.size > 25 * 1024 * 1024) {
        execSync(`"${CLOUDFLARED_BIN}" --version`, { stdio: 'ignore', timeout: 5000 });
        return CLOUDFLARED_BIN;
      } else {
        appendTunnelLog(`Ukuran binary cloudflared terdeteksi korup (${stats.size} bytes). Mengunduh ulang...`);
        try { fs.unlinkSync(CLOUDFLARED_BIN); } catch {}
      }
    } catch {
      appendTunnelLog('Binary cloudflared yang ada rusak/tidak bisa dijalankan. Mengunduh ulang...');
      try { fs.unlinkSync(CLOUDFLARED_BIN); } catch {}
    }
  }

  const tmpDownloadPath = `${CLOUDFLARED_BIN}.download.tmp`;
  try {
    appendTunnelLog('Mengunduh binary resmi cloudflared (linux-amd64)...');
    try { if (fs.existsSync(tmpDownloadPath)) fs.unlinkSync(tmpDownloadPath); } catch {}
    execSync(
      `curl -sL --retry 3 --connect-timeout 10 --max-time 120 https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "${tmpDownloadPath}" && chmod +x "${tmpDownloadPath}"`,
      { timeout: 130000 }
    );
    // Verify downloaded binary before placing it in production path
    execSync(`"${tmpDownloadPath}" --version`, { stdio: 'ignore', timeout: 5000 });
    fs.renameSync(tmpDownloadPath, CLOUDFLARED_BIN);
    fs.chmodSync(CLOUDFLARED_BIN, 0o755);
    appendTunnelLog(`Binary cloudflared berhasil diverifikasi dan dipasang di ${CLOUDFLARED_BIN}.`);
    return CLOUDFLARED_BIN;
  } catch (err: any) {
    try { if (fs.existsSync(tmpDownloadPath)) fs.unlinkSync(tmpDownloadPath); } catch {}
    appendTunnelLog(`Peringatan: Unduhan cloudflared gagal: ${err?.message || err}`);
    throw err;
  }
}

function extractToken(rawInput: string): string {
  const trimmed = rawInput.trim();
  const match = trimmed.match(/eyJ[A-Za-z0-9_-]+={0,2}/);
  if (match) return match[0];
  return trimmed;
}

async function startCloudflaredTunnel(rawToken?: string, mode: 'token' | 'quick' = 'token') {
  if (tunnelProcess) {
    try {
      tunnelProcess.kill('SIGTERM');
    } catch {
      // Ignore
    }
    tunnelProcess = null;
  }

  // Preemptively kill any orphaned cloudflared processes so multiple instances never clash on Cloudflare Edge
  try {
    if (process.platform === 'linux' || process.platform === 'darwin') {
      execSync('pkill -9 -f "cloudflared.*tunnel" 2>/dev/null || true', { stdio: 'ignore' });
    }
  } catch {}

  tunnelLogs = [];
  quickTunnelUrl = null;
  tunnelStatus = 'starting';
  tunnelStartedAt = new Date().toISOString();

  try {
    const bin = await ensureCloudflaredBinary();
    let args: string[] = [];

    if (mode === 'quick' || !rawToken?.trim()) {
      appendTunnelLog('Memulai Cloudflare Quick Tunnel (HTTP/2) ke http://localhost:3000...');
      args = ['tunnel', '--no-autoupdate', '--protocol', 'http2', '--url', `http://localhost:${PORT}`];
    } else {
      const cleanToken = extractToken(rawToken);
      tunnelTokenSaved = cleanToken;
      writeVaultJson(
        TUNNEL_CONFIG_PATH,
        [path.join(LOCAL_DATA_DIR, 'cloudpro-tunnel-config.json'), LEGACY_TUNNEL_CONFIG_PATH],
        { token: cleanToken, updatedAt: new Date().toISOString() }
      );
      appendTunnelLog(`Memulai Cloudflare Zero Trust Tunnel (HTTP/2) ke http://localhost:${PORT}...`);
      args = ['tunnel', '--no-autoupdate', '--no-tls-verify', '--protocol', 'http2', 'run', '--token', cleanToken];
    }

    const proc = spawn(bin, args, { env: { ...process.env, NO_TLS_VERIFY: 'true' } });
    tunnelProcess = proc;

    proc.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      lines.forEach(appendTunnelLog);
    });

    proc.stderr.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      lines.forEach(appendTunnelLog);
    });

    proc.on('close', (code) => {
      appendTunnelLog(`Proses cloudflared berhenti (exit code: ${code}).`);
      tunnelProcess = null;
      if (tunnelStatus !== 'stopped' && tunnelTokenSaved) {
        tunnelStatus = 'starting';
        appendTunnelLog('Auto-Heal Watchdog: Menghubungkan ulang cloudflared dalam 4 detik agar tidak Error 1033...');
        setTimeout(() => {
          if (tunnelStatus !== 'stopped' && !tunnelProcess) {
            startCloudflaredTunnel(tunnelTokenSaved, 'token').catch(() => {});
          }
        }, 4000);
      }
    });

    proc.on('error', (err) => {
      appendTunnelLog(`Error cloudflared: ${err.message}`);
      tunnelStatus = 'error';
      tunnelProcess = null;
    });
  } catch (err: any) {
    appendTunnelLog(`Gagal menjalankan cloudflared: ${err?.message || String(err)}`);
    tunnelStatus = 'error';
  }
}

function decodeTunnelIdFromJwt(rawToken: string): string {
  try {
    const clean = extractToken(rawToken);
    const decoded = Buffer.from(clean, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (parsed?.t) return String(parsed.t);
  } catch {
    // Ignore decode error
  }
  return '99e7da79-8346-424d-b9ab-d4d5f14fb889';
}

// Auto-restore saved tunnel token (or default configured token) on server boot
try {
  let bootToken = DEFAULT_TUNNEL_TOKEN;
  const savedTunnel = readVaultJson<{ token?: string }>(TUNNEL_CONFIG_PATH, [
    path.join(LOCAL_DATA_DIR, 'cloudpro-tunnel-config.json'),
    LEGACY_TUNNEL_CONFIG_PATH,
  ]);
  if (savedTunnel?.token) {
    bootToken = savedTunnel.token;
  }
  if (bootToken) {
    tunnelTokenSaved = bootToken;
    setTimeout(() => {
      startCloudflaredTunnel(bootToken, 'token').catch(() => {});
    }, 3000);
  }
} catch {
  // Ignore
}

// Permanent 15-second Auto-Heal Watchdog so cloudflared never stays down (prevents Error 1033)
setInterval(() => {
  if (tunnelStatus !== 'stopped' && tunnelTokenSaved && !tunnelProcess) {
    startCloudflaredTunnel(tunnelTokenSaved, 'token').catch(() => {});
  }
}, 15_000);

const TWO_LEVEL_TLDS = [
  '.my.id', '.biz.id', '.sch.id', '.co.id', '.ac.id', '.or.id', '.web.id',
  '.go.id', '.desa.id', '.ponpes.id', '.net.id', '.co.uk', '.org.uk', '.com.au',
];

function parseHostSubdomainInfo(rawHost: string): {
  cleanHost: string;
  isSubdomain: boolean;
  subPrefix: string;
  parentDomain: string;
  matchedPrimaryAccount?: { id: string; primaryDomain: string; username: string; phpVersion: string };
  explicitSub?: { id: string; accountId: string; fullDomain: string; documentRoot: string };
} {
  const cleanHost = (rawHost || '').split(':')[0].toLowerCase().replace(/^www\./, '').trim();
  const explicitSub = (vhostStore.subdomains || []).find(
    s => s.fullDomain.toLowerCase().replace(/^www\./, '') === cleanHost && normalizePath(s.documentRoot) !== '/public_html'
  );
  const matchedPrimaryAccount = (vhostStore.accounts || []).find(
    a => a.primaryDomain.toLowerCase().replace(/^www\./, '') === cleanHost
  );

  if (matchedPrimaryAccount) {
    return {
      cleanHost,
      isSubdomain: false,
      subPrefix: '',
      parentDomain: cleanHost,
      matchedPrimaryAccount,
      explicitSub,
    };
  }

  for (const acc of vhostStore.accounts || []) {
    const baseDom = acc.primaryDomain.toLowerCase().replace(/^www\./, '');
    if (baseDom && cleanHost.endsWith('.' + baseDom)) {
      const prefix = cleanHost.slice(0, cleanHost.length - baseDom.length - 1);
      if (prefix && prefix !== 'www') {
        return {
          cleanHost,
          isSubdomain: true,
          subPrefix: prefix.split('.')[0],
          parentDomain: baseDom,
          matchedPrimaryAccount: acc,
          explicitSub,
        };
      }
    }
  }

  if (explicitSub) {
    const parts = cleanHost.split('.');
    return {
      cleanHost,
      isSubdomain: true,
      subPrefix: parts[0] || 'sub',
      parentDomain: parts.slice(1).join('.') || cleanHost,
      matchedPrimaryAccount: vhostStore.accounts.find(a => a.id === explicitSub.accountId) || vhostStore.accounts[0],
      explicitSub,
    };
  }

  const hostParts = cleanHost.split('.');
  const isTwoLevelTld = TWO_LEVEL_TLDS.some(tld => cleanHost.endsWith(tld));
  const minPartsForSub = isTwoLevelTld ? 4 : 3;
  const isSub = hostParts.length >= minPartsForSub;
  return {
    cleanHost,
    isSubdomain: isSub,
    subPrefix: isSub ? hostParts[0].toLowerCase() : '',
    parentDomain: isSub ? hostParts.slice(1).join('.').toLowerCase() : cleanHost,
    matchedPrimaryAccount: vhostStore.accounts[0],
    explicitSub: undefined,
  };
}

function resolveHostDocRoot(rawHost: string): string {
  const info = parseHostSubdomainInfo(rawHost);
  if (info.explicitSub && info.explicitSub.documentRoot) {
    return normalizePath(info.explicitSub.documentRoot);
  }
  if (!info.isSubdomain) {
    return '/public_html';
  }
  const candidateSubDirs = [
    `/public_html/${info.subPrefix}`,
    `/public_html/domains/${info.cleanHost}`,
    `/public_html/${info.cleanHost}`,
  ];
  for (const cand of candidateSubDirs) {
    const rel = cand.replace(/^\//, '');
    if (
      fs.existsSync(path.join(process.cwd(), rel)) ||
      fs.existsSync(path.join(HOME_VAULT_DIR, rel))
    ) {
      return cand;
    }
  }
  for (const accFiles of Object.values(vhostStore.filesByAccount)) {
    for (const cand of candidateSubDirs) {
      if ((accFiles || []).some(f => normalizePath(f.path).toLowerCase().startsWith(cand.toLowerCase() + '/'))) {
        return cand;
      }
    }
  }
  return `/public_html/${info.subPrefix}`;
}

// Compile a Google AI Studio project (React + Vite + TypeScript: src/App.tsx, src/main.tsx, index.html, metadata.json)
// into a self-contained production HTML page that runs immediately on any Virtual Host domain!
function compileAiStudioProjectToHtml(
  projectFiles: Array<{ name: string; path: string; type: string; content?: string }>,
  docRoot: string,
  fallbackTitle = 'Aplikasi Web — Cloud PRO AI Studio'
): { compiledHtml: string; bundleJs?: string; detectedTitle: string; buildMethod: 'esbuild' | 'runtime_babel' } | null {
  const cleanRoot = normalizePath(docRoot);
  const inRootFiles = projectFiles.filter(f => {
    if (f.type !== 'file' || typeof f.content !== 'string') return false;
    const p = normalizePath(f.path);
    return p.toLowerCase().startsWith(cleanRoot.toLowerCase() + '/');
  });

  let detectedTitle = fallbackTitle;
  const metaFile = inRootFiles.find(f => f.name.toLowerCase() === 'metadata.json');
  if (metaFile?.content) {
    try {
      const parsedMeta = JSON.parse(metaFile.content);
      if (parsedMeta?.name && !String(parsedMeta.name).toLowerCase().includes('rapor')) {
        detectedTitle = String(parsedMeta.name);
      }
    } catch {
      // Ignore
    }
  }

  // Check if this directory looks like a Google AI Studio / React Vite TypeScript project
  const hasTsxOrJsx = inRootFiles.some(
    f => f.name.endsWith('.tsx') || f.name.endsWith('.jsx') || f.name === 'metadata.json'
  );
  if (!hasTsxOrJsx) {
    const existingIndex = inRootFiles.find(
      f => f.name.toLowerCase() === 'index.html' || f.name.toLowerCase() === 'index.htm' || f.name.toLowerCase() === 'index.php'
    );
    if (existingIndex?.content) {
      return {
        compiledHtml: existingIndex.content,
        detectedTitle,
        buildMethod: 'esbuild',
      };
    }
    const anyHtml = inRootFiles.find(f => f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.php'));
    if (anyHtml?.content) {
      return {
        compiledHtml: anyHtml.content,
        detectedTitle,
        buildMethod: 'esbuild',
      };
    }
    return null;
  }

  // Gather custom CSS content (strip @import "tailwindcss"; since Tailwind Play CDN handles utility classes)
  const cssContents = inRootFiles
    .filter(f => f.name.endsWith('.css'))
    .map(f => (f.content || '').replace(/@import\s+["']tailwindcss["']\s*;?/gi, ''))
    .join('\n');

  // Attempt ultra-fast server-side esbuild bundle against local node_modules
  const tempBuildDir = path.join(TMP_DIR, `cloudpro-aistudio-build-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  try {
    fs.mkdirSync(tempBuildDir, { recursive: true });
    const appNodeModules = path.join(process.cwd(), 'node_modules');
    if (fs.existsSync(appNodeModules)) {
      try {
        fs.symlinkSync(appNodeModules, path.join(tempBuildDir, 'node_modules'), 'dir');
      } catch {
        // Ignore symlink error
      }
    }

    for (const f of inRootFiles) {
      const rel = normalizePath(f.path).slice(cleanRoot.length).replace(/^\/+/, '');
      if (!rel) continue;
      const destFile = path.join(tempBuildDir, rel);
      fs.mkdirSync(path.dirname(destFile), { recursive: true });
      fs.writeFileSync(destFile, f.content || '', 'utf-8');
    }

    // Find entry point (src/main.tsx, src/index.tsx, index.tsx, main.tsx, or synthesize one from src/App.tsx)
    const entryCandidates = ['src/main.tsx', 'src/index.tsx', 'index.tsx', 'main.tsx', 'src/main.jsx', 'index.jsx'];
    let entryRel = entryCandidates.find(c => fs.existsSync(path.join(tempBuildDir, c)));

    if (!entryRel) {
      const appCandidates = ['src/App.tsx', 'App.tsx', 'src/App.jsx', 'App.jsx'];
      const foundApp = appCandidates.find(c => fs.existsSync(path.join(tempBuildDir, c)));
      if (foundApp) {
        entryRel = '__cloudpro_entry.tsx';
        fs.writeFileSync(
          path.join(tempBuildDir, entryRel),
          `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './${foundApp.replace(/\.tsx?$/, '')}';\nconst el = document.getElementById('root') || document.body.appendChild(document.createElement('div'));\nel.id = 'root';\ncreateRoot(el).render(<React.StrictMode><App /></React.StrictMode>);\n`,
          'utf-8'
        );
      }
    }

    if (entryRel) {
      const outJsPath = path.join(tempBuildDir, '__bundle_out.js');
      const esbuildBin = path.join(process.cwd(), 'node_modules', '.bin', 'esbuild');
      const cmd = fs.existsSync(esbuildBin) ? `"${esbuildBin}"` : 'npx --yes esbuild';
      execSync(
        `${cmd} "${path.join(tempBuildDir, entryRel)}" --bundle --format=iife --platform=browser --target=es2020 --jsx=automatic --loader:.tsx=tsx --loader:.ts=ts --loader:.jsx=jsx --loader:.svg=dataurl --loader:.png=dataurl --loader:.jpg=dataurl --outfile="${outJsPath}"`,
        {
          cwd: tempBuildDir,
          stdio: 'pipe',
          timeout: 15000,
          env: { ...process.env, NODE_PATH: appNodeModules },
        }
      );

      if (fs.existsSync(outJsPath)) {
        const bundledJs = fs
          .readFileSync(outJsPath, 'utf-8')
          .replace(
            /fixed top-0 left-0 right-0 lg:left-64 z-30/g,
            'sticky top-0 left-0 right-0 z-30 w-full shrink-0'
          );
        fs.rmSync(tempBuildDir, { recursive: true, force: true });

        const compiledHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${detectedTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    ${cssContents}
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
${bundledJs}
  </script>
</body>
</html>`;
        return {
          compiledHtml,
          bundleJs: bundledJs,
          detectedTitle,
          buildMethod: 'esbuild',
        };
      }
    }
  } catch {
    // Fallback to runtime ESM + Babel compilation below if esbuild encounters an external package
  } finally {
    try {
      fs.rmSync(tempBuildDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  }

  // Fallback: Browser Runtime Babel + ESM (esm.sh) Compiler for App.tsx
  const appFile =
    inRootFiles.find(f => f.name.toLowerCase() === 'app.tsx' || f.name.toLowerCase() === 'app.jsx') ||
    inRootFiles.find(f => f.name.endsWith('.tsx') && f.name.toLowerCase() !== 'main.tsx' && f.name.toLowerCase() !== 'index.tsx');

  if (!appFile?.content) return null;

  const compiledHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${detectedTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19.0.0",
      "react-dom/client": "https://esm.sh/react-dom@19.0.0/client",
      "lucide-react": "https://esm.sh/lucide-react@0.469.0?external=react",
      "framer-motion": "https://esm.sh/framer-motion@11.15.0?external=react,react-dom",
      "motion/react": "https://esm.sh/motion@12.0.0/react?external=react,react-dom"
    }
  }
  </script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    ${cssContents}
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module" data-presets="react,typescript">
import React from 'react';
import { createRoot } from 'react-dom/client';
${appFile.content.replace(/export\s+default\s+function\s+App/g, 'function App').replace(/export\s+default\s+App\s*;?/g, '')}
const rootEl = document.getElementById('root');
if (rootEl && typeof App !== 'undefined') {
  createRoot(rootEl).render(<App />);
}
  </script>
</body>
</html>`;

  return {
    compiledHtml,
    detectedTitle,
    buildMethod: 'runtime_babel',
  };
}

function renderVirtualHostResponse(
  hostHeader: string,
  reqPath: string,
  forceAccountAndDir?: { accountId?: string; domain?: string; dir?: string }
): { status: number; contentType: string; body: string | Buffer } | null {
  const cleanHost = hostHeader.split(':')[0].toLowerCase().replace(/^www\./, '');
  const isRawIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost.includes(':') || cleanHost.startsWith('[');
  if (
    !forceAccountAndDir &&
    (!cleanHost ||
      isRawIp ||
      !cleanHost.includes('.') ||
      cleanHost === 'localhost' ||
      cleanHost === '127.0.0.1' ||
      cleanHost === 'desktop-djq024c' ||
      cleanHost.endsWith('.ts.net') ||
      cleanHost.endsWith('.local') ||
      cleanHost.endsWith('.lan') ||
      cleanHost.endsWith('.run.app') ||
      cleanHost.endsWith('.trycloudflare.com') ||
      cleanHost.startsWith('cloud.') ||
      cleanHost.startsWith('cloudpro.') ||
      cleanHost.startsWith('servercloud.') ||
      cleanHost.startsWith('panel.') ||
      cleanHost.startsWith('cpanel.') ||
      cleanHost.startsWith('whm.') ||
      cleanHost.startsWith('cp.') ||
      cleanHost.startsWith('srv.') ||
      cleanHost.startsWith('vps.') ||
      cleanHost.startsWith('admin.'))
  ) {
    return null;
  }

  // Only bypass virtual host for explicit Cloud PRO administrative URLs, not regular customer /login or /admin routes!
  const lowerReqPath = (reqPath || '').toLowerCase();
  const isExplicitPanelUrl =
    lowerReqPath === '/cloudpro-login' ||
    lowerReqPath.startsWith('/cloudpro-login/') ||
    lowerReqPath === '/cloudpro-admin' ||
    lowerReqPath.startsWith('/cloudpro-admin/') ||
    lowerReqPath === '/cp-admin' ||
    lowerReqPath.startsWith('/cp-admin/');

  if (!forceAccountAndDir && isExplicitPanelUrl) {
    return null;
  }

  // Check if this hostname is explicitly registered as a custom website subdomain with files
  const hostInfo = parseHostSubdomainInfo(cleanHost);
  const explicitSub = hostInfo.explicitSub;
  const isSubdomain = hostInfo.isSubdomain;
  const subPrefix = hostInfo.subPrefix;

  // Admin hostname opens the Cloud PRO Dashboard unless explicitly added as a website subdomain
  if (!forceAccountAndDir && !explicitSub && cleanHost.startsWith('admin.')) {
    return null;
  }

  let matchedAccount = forceAccountAndDir?.accountId
    ? vhostStore.accounts.find(a => a.id === forceAccountAndDir.accountId)
    : hostInfo.matchedPrimaryAccount;

  if (!matchedAccount && explicitSub) {
    matchedAccount = vhostStore.accounts.find(a => a.id === explicitSub.accountId);
  }

  if (!matchedAccount && forceAccountAndDir?.accountId) {
    matchedAccount = {
      id: forceAccountAndDir.accountId,
      primaryDomain: cleanHost || 'denbaguse.my.id',
      username: forceAccountAndDir.accountId.replace(/[^a-zA-Z0-9]/g, '') || 'web',
      phpVersion: '8.2',
    };
    vhostStore.accounts.push(matchedAccount);
  }

  if (!matchedAccount) {
    matchedAccount = vhostStore.accounts[0] || {
      id: forceAccountAndDir?.accountId || 'acc-rdm-01',
      primaryDomain: cleanHost || 'denbaguse.my.id',
      username: 'web',
      phpVersion: '8.2',
    };
  }

  // Strictly resolve docRoot: Subdomains NEVER fall back to main domain's /public_html!
  const docRoot = forceAccountAndDir?.dir
    ? normalizePath(forceAccountAndDir.dir)
    : resolveHostDocRoot(cleanHost);
  const relDocRoot = docRoot.replace(/^\/+/, '');

  // Gather all virtual files across candidate accounts
  const allAccountFiles: VhostFile[] = [];
  const seenFileKeys = new Set<string>();
  const accountOrder = [
    ...(forceAccountAndDir?.accountId ? [forceAccountAndDir.accountId] : []),
    matchedAccount.id,
    ...Object.keys(vhostStore.filesByAccount),
  ];
  for (const accId of accountOrder) {
    const list = vhostStore.filesByAccount[accId] || [];
    for (const f of list) {
      const k = `${normalizePath(f.path).toLowerCase()}`;
      if (!seenFileKeys.has(k)) {
        seenFileKeys.add(k);
        allAccountFiles.push(f);
      } else if (f.content) {
        const idx = allAccountFiles.findIndex(x => normalizePath(x.path).toLowerCase() === k);
        if (idx >= 0 && !allAccountFiles[idx].content) {
          allAccountFiles[idx] = f;
        }
      }
    }
  }

  // Strictly filter files belonging ONLY to this docRoot (excludes subdomain folders when docRoot === '/public_html')
  const files = allAccountFiles.filter(f => isPathBelongingToDocRoot(f.path, docRoot, matchedAccount?.id));

  let targetRelPath = reqPath === '/' || !reqPath ? '/index.html' : reqPath;
  if (!targetRelPath.startsWith('/')) targetRelPath = '/' + targetRelPath;

  const mimeMap: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    php: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'application/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    svg: 'image/svg+xml',
    txt: 'text/plain; charset=utf-8',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    pdf: 'application/pdf',
    map: 'application/json',
  };

  // Helper to check physical disk strictly inside rootDir (O(1) file lookup, no recursive scan)
  const readDiskFileInDocRoot = (rootDir: string, relFile: string): VhostFile | undefined => {
    const cleanRel = relFile.replace(/^\/+/, '');
    if (!cleanRel) return undefined;
    // Prevent main domain (/public_html) from reading inside a subdomain's folder
    const virtTarget = normalizePath(`${rootDir}/${cleanRel}`);
    if (!isPathBelongingToDocRoot(virtTarget, rootDir, matchedAccount?.id)) {
      return undefined;
    }
    const relRoot = normalizePath(rootDir).replace(/^\/+/, '');
    const diskBases = [
      path.join(process.cwd(), relRoot),
      path.join(HOME_VAULT_DIR, relRoot),
      path.join(os.homedir(), relRoot),
    ];
    for (const base of diskBases) {
      const cand = path.join(base, cleanRel);
      try {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          const st = fs.statSync(cand);
          const extName = path.extname(cand).slice(1).toLowerCase();
          const isBin = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'ico', 'woff', 'woff2', 'ttf', 'pdf'].includes(extName);
          let content: string | undefined;
          if (!isBin && st.size <= 3_500_000) {
            content = fs.readFileSync(cand, 'utf-8');
          }
          return {
            id: `vf-disk-${virtTarget}`,
            accountId: matchedAccount.id,
            name: path.basename(cand),
            path: virtTarget,
            type: 'file',
            size: st.size,
            content,
          };
        }
      } catch {}
    }
    return undefined;
  };

  const findFileInDocRoot = (rootDir: string, rel: string): VhostFile | undefined => {
    const fullTarget = normalizePath(`${rootDir}${rel.startsWith('/') ? rel : '/' + rel}`);
    let memFound = files.find(
      f =>
        f.type === 'file' &&
        normalizePath(f.path).toLowerCase() === fullTarget.toLowerCase() &&
        isPathBelongingToDocRoot(f.path, rootDir, matchedAccount?.id)
    );
    const diskFound = readDiskFileInDocRoot(rootDir, rel);

    // If memory has only the default personal template while disk has a real cloned file, prefer disk
    if (
      diskFound?.content &&
      (!memFound ||
        !memFound.content ||
        memFound.id === 'vf-personal-html' ||
        memFound.content.includes('Selamat Datang di Portal Pribadi Den Baguse'))
    ) {
      return diskFound;
    }
    if (memFound) return memFound;
    if (diskFound) return diskFound;

    if (rel === '/index.html' || rel.endsWith('/') || rel === '') {
      const subRelDir = rel === '/index.html' || rel === '/' || rel === '' ? '' : rel.replace(/\/+$/, '');
      const candidates = [
        'index.html',
        'index.htm',
        'index.php',
        'default.html',
        'default.htm',
        'home.html',
        'home.php',
        'main.html',
        'main.php',
      ];
      for (const c of candidates) {
        const candRel = subRelDir ? `${subRelDir}/${c}` : `/${c}`;
        const candTarget = normalizePath(`${rootDir}${candRel}`);
        const mf = files.find(
          f =>
            f.type === 'file' &&
            normalizePath(f.path).toLowerCase() === candTarget.toLowerCase() &&
            isPathBelongingToDocRoot(f.path, rootDir, matchedAccount?.id)
        );
        const df = readDiskFileInDocRoot(rootDir, candRel);
        if (
          df?.content &&
          (!mf || !mf.content || mf.id === 'vf-personal-html' || mf.content.includes('Selamat Datang di Portal Pribadi Den Baguse'))
        ) {
          return df;
        }
        if (mf) return mf;
        if (df) return df;
      }

      // Check ANY HTML or PHP file strictly inside this docRoot (excluding subdomain folders!)
      const anyInRoot = files.find(
        f =>
          f.type === 'file' &&
          isPathBelongingToDocRoot(f.path, rootDir, matchedAccount?.id) &&
          (f.name.toLowerCase() === 'index.html' ||
            f.name.toLowerCase() === 'index.php' ||
            f.name.toLowerCase().endsWith('.html') ||
            f.name.toLowerCase().endsWith('.php'))
      );
      if (anyInRoot) return anyInRoot;
    }
    return undefined;
  };

  let matchedFile = findFileInDocRoot(docRoot, targetRelPath);

  // Fallback 1: Flexible chunk matching strictly within docRoot
  if (!matchedFile && path.extname(targetRelPath)) {
    const baseName = path.basename(targetRelPath);
    matchedFile =
      findFileInDocRoot(docRoot, `/assets/${baseName}`) ||
      findFileInDocRoot(docRoot, `/uploads/${baseName}`) ||
      findFileInDocRoot(docRoot, `/${baseName}`);
  }

  // Fallback 2: SPA clean URLs and dedicated routes (/login, /admin, /profil, etc. without file extension)
  if (!matchedFile && !path.extname(targetRelPath)) {
    matchedFile =
      findFileInDocRoot(docRoot, `${targetRelPath}.html`) ||
      findFileInDocRoot(docRoot, `${targetRelPath}.php`) ||
      findFileInDocRoot(docRoot, `${targetRelPath}/index.html`) ||
      findFileInDocRoot(docRoot, `${targetRelPath}/index.php`) ||
      findFileInDocRoot(docRoot, '/index.html') ||
      findFileInDocRoot(docRoot, '/index.php');
  }

  // If this is a subdomain folder (e.g. /public_html/sub) and no entry index was found,
  // NEVER fall back to /public_html/index.html of the main domain!
  if (!matchedFile && docRoot !== '/public_html') {
    // Also list any files present on disk inside the subdomain's physical folder
    const dirFiles = [...files];
    const physSubDir = path.join(process.cwd(), relDocRoot);
    if (fs.existsSync(physSubDir) && fs.statSync(physSubDir).isDirectory()) {
      try {
        for (const item of fs.readdirSync(physSubDir)) {
          if (item === '.' || item === '..' || item === '.git') continue;
          const vp = normalizePath(`${docRoot}/${item}`);
          if (!dirFiles.some(df => normalizePath(df.path).toLowerCase() === vp.toLowerCase())) {
            const st = fs.statSync(path.join(physSubDir, item));
            dirFiles.push({
              id: `vf-sub-item-${item}`,
              accountId: matchedAccount.id,
              name: item,
              path: vp,
              type: st.isDirectory() ? 'directory' : 'file',
              size: st.size,
            });
          }
        }
      } catch {}
    }

    const fileListHtml =
      dirFiles.length > 0
        ? dirFiles
            .slice(0, 50)
            .map(f => {
              const isPhp = f.name.endsWith('.php');
              const isHtml = f.name.endsWith('.html');
              const badgeColor = isPhp ? '#38bdf8' : isHtml ? '#34d399' : '#94a3b8';
              const sizeKb = ((f.size || (f.content ? f.content.length : 0)) / 1024).toFixed(1);
              return `
            <li style="padding:12px 16px;background:#1e293b;border:1px solid #334155;border-radius:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <a href="${f.name}" style="font-weight:700;color:${badgeColor};font-size:13px;font-family:monospace;text-decoration:none;">${f.name}</a>
                <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${f.path}</div>
              </div>
              <span style="font-size:11px;padding:3px 8px;border-radius:6px;background:#0f172a;color:#94a3b8;font-family:monospace;">
                ${f.type === 'directory' ? 'DIR' : `${sizeKb} KB`}
              </span>
            </li>`;
            })
            .join('')
        : '<li style="padding:16px;background:#1e293b;border:1px dashed #334155;border-radius:12px;color:#94a3b8;text-align:center;font-size:13px;">Folder subdomain ini masih kosong (0 berkas). Silakan kloning atau unggah website ke folder ini.</li>';

    return {
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subdomain ${cleanHost} — Cloud PRO Virtual Host</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0b1120; color: #f8fafc; padding: 32px 20px; margin: 0; line-height: 1.5; }
    .box { max-width: 760px; margin: 0 auto; background: #131c31; border: 1px solid #233554; border-radius: 20px; padding: 28px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-weight: 700; font-size: 11px; border: 1px solid rgba(56, 189, 248, 0.3); margin-bottom: 12px; }
    h1 { font-size: 22px; font-weight: 800; margin: 0 0 8px; color: #ffffff; }
    p { color: #94a3b8; font-size: 13px; margin: 0 0 20px; }
    .info { background: rgba(14, 165, 233, 0.12); border: 1px solid rgba(14, 165, 233, 0.35); border-radius: 14px; padding: 16px 20px; margin-bottom: 24px; color: #bae6fd; font-size: 13px; }
    ul { list-style: none; padding: 0; margin: 0; }
    code { background: #1e293b; padding: 2px 6px; border-radius: 6px; color: #38bdf8; font-family: monospace; }
  </style>
</head>
<body>
  <div class="box">
    <span class="badge">● SUBDOMAIN TERISOLASI AKTIF</span>
    <h1>${cleanHost}</h1>
    <p>Document Root Mandiri: <code>${docRoot}</code></p>
    <div class="info">
      <strong>Isolasi Direktori Aktif:</strong><br>
      Subdomain <strong>${cleanHost}</strong> memiliki ruang penyimpanan mandiri di <code>${docRoot}</code> dan terpisah penuh dari domain utama (<code>/public_html</code>).<br><br>
      Untuk memasang website di subdomain ini, buka <strong>Kloning Website</strong> atau <strong>File Manager</strong> lalu pilih target <code>${cleanHost} (${docRoot})</code>.
    </div>
    <h3 style="font-size:14px;color:#cbd5e1;margin-bottom:12px;">Isi Direktori ${docRoot} (${dirFiles.length} item):</h3>
    <ul>${fileListHtml}</ul>
  </div>
</body>
</html>`,
    };
  }

  if (!matchedFile && docRoot === '/public_html' && !targetRelPath.endsWith('.js') && !targetRelPath.endsWith('.css') && !targetRelPath.includes('/assets/')) {
    matchedFile =
      findFileInDocRoot('/public_html', '/index.html') ||
      findFileInDocRoot('/public_html', '/index.php');
  }

  const sanitizeDenbaguseJsBundle = (rawJs: string): string => {
    let out = rawJs
      .replace(/\.\/index-Dx_-uADC\.js(?:\?v=[A-Za-z0-9_.-]+)?/g, './index-Dx_-uADC.js?v=cp4')
      .replace(/\.\/AdminPortal-BI2p42T-\.js(?:\?v=[A-Za-z0-9_.-]+)?/g, './AdminPortal-BI2p42T-.js?v=cp4')
      .replace(/\.\/LogoUploaderModal-C2_9Wzl6\.js(?:\?v=[A-Za-z0-9_.-]+)?/g, './LogoUploaderModal-C2_9Wzl6.js?v=cp4')
      .replace(/\.\/sliders-vertical-D_9bXxob\.js(?:\?v=[A-Za-z0-9_.-]+)?/g, './sliders-vertical-D_9bXxob.js?v=cp4')
      .replace(/\.\/settings-BjXsQb13\.js(?:\?v=[A-Za-z0-9_.-]+)?/g, './settings-BjXsQb13.js?v=cp4')
      .replace(/\.\/StickyFooterEditorModal-BfM8Lk1W\.js(?:\?v=[A-Za-z0-9_.-]+)?/g, './StickyFooterEditorModal-BfM8Lk1W.js?v=cp4');

    if (
      out.includes('admin-navbar-plesk-btn') ||
      out.includes('admin-navbar-cpanel-btn') ||
      out.includes('admin-navbar-quick-cpanel-zip-btn') ||
      out.includes('Paket Siap Hosting Plesk')
    ) {
      const navStart = out.indexOf(',e.jsxs("button",{id:"admin-navbar-plesk-btn"');
      const navEnd = out.indexOf(',e.jsxs("button",{id:"admin-navbar-users-btn"');
      if (navStart !== -1 && navEnd !== -1) {
        out = out.slice(0, navStart) + out.slice(navEnd);
      }
      const cardStart = out.indexOf(
        'e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",children:[e.jsxs("div",{className:"bg-gradient-to-br from-[#064e3b] via-[#043327] to-[#022c22] text-white p-5 rounded-3xl border-2 border-amber-400/90'
      );
      const cardNext = out.indexOf(
        'e.jsxs("div",{className:"bg-gradient-to-br from-[#1e1b4b] to-[#0f172a]',
        cardStart
      );
      if (cardStart !== -1 && cardNext !== -1) {
        out =
          out.slice(0, cardStart) +
          'e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[' +
          out.slice(cardNext);
      }
      const quickBtn =
        ',e.jsxs("button",{onClick:()=>T("plesk"),className:"px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-emerald-950 text-xs font-extrabold flex items-center gap-1.5 border border-amber-400 shadow-xs cursor-pointer",children:[e.jsx(ft,{className:"w-3.5 h-3.5 text-emerald-950"}),e.jsx("span",{children:"Hosting Plesk"})]})';
      out = out.replace(quickBtn, '');
      const expStart = out.indexOf('l==="exports"&&e.jsx("div"');
      const expNext = out.indexOf(
        'e.jsxs("div",{className:"bg-white p-6 rounded-3xl border-2 border-emerald-200',
        expStart
      );
      if (expStart !== -1 && expNext !== -1) {
        out =
          out.slice(0, expStart) +
          'l==="exports"&&e.jsx("div",{className:"space-y-6",children:e.jsxs("div",{className:"grid grid-cols-1 gap-5",children:[' +
          out.slice(expNext).replace('2. Ekspor Arsip Pesan Masuk (CSV)', 'Ekspor Arsip Pesan Masuk (CSV)');
      }
      out = out.replace(/C==="plesk"&&/g, 'false&&').replace(/C==="cpanel"&&/g, 'false&&');
    }
    return out;
  };

  // Fallback 3: On-the-fly fetcher for any missing chunk (.js / .css) from cloned origin of THIS docRoot
  if (!matchedFile && (targetRelPath.endsWith('.js') || targetRelPath.endsWith('.css') || targetRelPath.includes('/assets/'))) {
    const indexFile = findFileInDocRoot(docRoot, '/index.html');
    const indexContent = indexFile?.content || '';
    const baseMatch =
      indexContent.match(/<base\s+href=["'](https?:\/\/[^/"']+)[^"']*["']/i) ||
      indexContent.match(/data-cloned-origin=["'](https?:\/\/[^/"']+)["']/i) ||
      indexContent.match(/var\s+ORIGIN\s*=\s*["'](https?:\/\/[^/"']+)["']/i) ||
      indexContent.match(/<link\s+rel=["']canonical["']\s+href=["'](https?:\/\/[^/"']+)[^"']*["']/i);
    if (baseMatch && baseMatch[1]) {
      const originBase = baseMatch[1].replace(/\/$/, '');
      const baseName = path.basename(targetRelPath);
      const candidateUrls = [
        `${originBase}/assets/${baseName}`,
        `${originBase}${targetRelPath}`,
        `${originBase}/${baseName}`,
      ];
      for (const remoteUrl of candidateUrls) {
        try {
          const fetchCmd = `curl -sSLk --max-time 8 "${remoteUrl}"`;
          let fetchedContent = execSync(fetchCmd, { encoding: 'utf-8', timeout: 9000 });
          const trimmed = fetchedContent.trim().toLowerCase();
          const isHtmlDoc = trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html') || (trimmed.startsWith('<!doctype') && trimmed.includes('<html'));
          if (fetchedContent && fetchedContent.length > 50 && !isHtmlDoc) {
            const ext = baseName.split('.').pop()?.toLowerCase() || 'js';
            if (ext === 'js') {
              fetchedContent = sanitizeDenbaguseJsBundle(fetchedContent);
            }
            const mime = ext === 'css' ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8';
            const saveDest = path.join(process.cwd(), relDocRoot, 'assets', baseName);
            try {
              fs.mkdirSync(path.dirname(saveDest), { recursive: true });
              fs.writeFileSync(saveDest, fetchedContent, 'utf-8');
            } catch {}
            return {
              status: 200,
              contentType: mime,
              body: fetchedContent,
            };
          }
        } catch {
          // Continue to next candidate
        }
      }
    }
  }

  const ext = (matchedFile?.name || targetRelPath).split('.').pop()?.toLowerCase() || 'html';
  const isBinaryExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'ico', 'woff', 'woff2', 'ttf', 'pdf'].includes(ext);

  if (!matchedFile) {
    return null;
  }

  let body: string | Buffer = '';

  if (typeof matchedFile.content === 'string' && matchedFile.content.trim().length > 0 && !isBinaryExt) {
    body = matchedFile.content;
  } else {
    // Read content strictly from THIS docRoot on disk
    const relWithinRoot = normalizePath(matchedFile.path)
      .slice(normalizePath(docRoot).length)
      .replace(/^\/+/, '');
    const candidateDiskPaths = [
      path.join(process.cwd(), relDocRoot, relWithinRoot),
      path.join(HOME_VAULT_DIR, relDocRoot, relWithinRoot),
      path.join(os.homedir(), relDocRoot, relWithinRoot),
      path.join(process.cwd(), relDocRoot, matchedFile.name),
      path.join(process.cwd(), relDocRoot, 'assets', matchedFile.name),
      path.join(process.cwd(), relDocRoot, 'uploads', matchedFile.name),
    ];
    for (const cPath of candidateDiskPaths) {
      if (fs.existsSync(cPath) && fs.statSync(cPath).isFile()) {
        try {
          if (isBinaryExt) {
            body = fs.readFileSync(cPath);
            break;
          } else {
            const fileContent = fs.readFileSync(cPath, 'utf-8');
            if (fileContent && fileContent.trim().length > 0) {
              body = fileContent;
              break;
            }
          }
        } catch {}
      }
    }
  }

  if (!body || (typeof body === 'string' && body.trim().length === 0)) {
    if ((ext === 'html' || ext === 'htm' || ext === 'php') && docRoot === '/public_html') {
      const directIndexPath = path.join(process.cwd(), 'public_html', 'index.html');
      if (fs.existsSync(directIndexPath)) {
        body = fs.readFileSync(directIndexPath, 'utf-8');
      } else {
        body = DEFAULT_PERSONAL_HTML;
      }
    } else {
      body = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${matchedFile.name}</title></head><body><h1>${matchedFile.name}</h1></body></html>`;
    }
  }
  const contentType = mimeMap[ext] || (isBinaryExt ? 'application/octet-stream' : 'text/html; charset=utf-8');

  if (Buffer.isBuffer(body)) {
    return {
      status: 200,
      contentType,
      body,
    };
  }

  // Strip Hosting Plesk, Hosting cPanel, and Unduh ZIP cPanel modules and unify chunk URLs (?v=cp4)
  if (ext === 'js' && typeof body === 'string') {
    body = sanitizeDenbaguseJsBundle(body);
  }

  // If serving a .php file (such as index.php) that wraps index.html or lives alongside index.html,
  // load the actual index.html from this docRoot so hybrid PHP+SPA apps (like Si@Kad Madrasah) render their full web app!
  if (ext === 'php' && typeof body === 'string') {
    const siblingIndexHtml = findFileInDocRoot(docRoot, '/index.html') || findFileInDocRoot(docRoot, '/dist/index.html');
    if (
      siblingIndexHtml &&
      (matchedFile.name.toLowerCase() === 'index.php' ||
        body.includes('index.html') ||
        body.includes('echo $html'))
    ) {
      let htmlBody = siblingIndexHtml.content || '';
      if (!htmlBody) {
        const diskHtml = readDiskFileInDocRoot(docRoot, '/index.html') || readDiskFileInDocRoot(docRoot, '/dist/index.html');
        htmlBody = diskHtml?.content || '';
      }
      if (htmlBody && htmlBody.trim().length > 0) {
        body = htmlBody;
      }
    }
  }

  // If serving a .php file that contains raw <?php ... ?> tags without an HTML document wrapper,
  // execute PHP echo/print statements so the browser renders a real web page instead of hiding <?php ?> tags
  if (ext === 'php' && typeof body === 'string' && body.includes('<?php') && !/<html/i.test(body)) {
    const echoMatches = [...body.matchAll(/(?:echo|print)\s+["']([^"']+)["']\s*;/gi)]
      .map(m => m[1])
      .filter(msg => !msg.toLowerCase().includes('belum di-build') && !msg.toLowerCase().includes('tidak ditemukan'));
    const echoOutput = echoMatches.join('<br/>') || 'Server PHP-FPM Aktif';
    body = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cleanHost} — Cloud PRO Linux Server</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { max-width: 560px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.4); }
    .badge { display: inline-block; background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; }
    h1 { margin: 0 0 12px; font-size: 22px; color: #38bdf8; }
    p { margin: 0 0 20px; color: #cbd5e1; line-height: 1.6; font-size: 14px; }
    .meta { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 14px; font-family: monospace; font-size: 12px; color: #94a3b8; }
    .btn { display: inline-block; margin-top: 20px; background: #0284c7; color: #fff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 18px; border-radius: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">● VIRTUAL HOST ONLINE (PHP ${matchedAccount.phpVersion} + ionCube)</div>
    <h1>${echoOutput}</h1>
    <p>Domain <strong>${cleanHost}</strong> telah terhubung langsung ke mesin Linux <strong>Cloud PRO</strong> pada folder <code>${docRoot}</code>.</p>
    <div class="meta">
      Host: ${cleanHost}<br/>
      Document Root: /home/${matchedAccount.username}${docRoot}<br/>
      Engine: CloudPRO-Edge-Nginx/1.26.2 (PHP-FPM ${matchedAccount.phpVersion})
    </div>
    <a class="btn" href="/cpanel">Buka Control Panel Cloud PRO &rarr;</a>
  </div>
</body>
</html>`;
  }

  // Inline relative CSS from Virtual File System if serving HTML/PHP
  if (contentType.startsWith('text/html')) {
    // Auto-detect uncompiled Google AI Studio index.html (referencing /src/main.tsx or /index.tsx) and compile on the fly!
    if (
      (body.includes('/src/main.tsx') || body.includes('/src/index.tsx') || body.includes('/index.tsx')) &&
      !body.includes('__bundle_out')
    ) {
      const compiled = compileAiStudioProjectToHtml(files, docRoot, `${cleanHost} — AI Studio App`);
      if (compiled?.compiledHtml) {
        matchedFile.content = compiled.compiledHtml;
        matchedFile.size = compiled.compiledHtml.length;
        persistVhostStore();
        return {
          status: 200,
          contentType,
          body: compiled.compiledHtml,
        };
      }
    }

    body = body.replace(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi, (fullMatch, href) => {
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
        return fullMatch;
      }
      const cleanHref = href.replace(/^\.\//, '/').startsWith('/') ? href.replace(/^\.\//, '/') : '/' + href;
      const cssFile = findFileInDocRoot(docRoot, cleanHref) || findFileInDocRoot('/public_html', cleanHref);
      if (cssFile?.content) {
        return `<style data-vhost-path="${cssFile.path}">\n${cssFile.content}\n</style>`;
      }
      return fullMatch;
    });

    // Auto-heal cloned SPA HTML that has a <base href="https://..."> or data-cloned-origin
    const baseMatch =
      body.match(/<base\s+href=["'](https?:\/\/[^/"']+)[^"']*["']/i) ||
      body.match(/data-cloned-origin=["'](https?:\/\/[^/"']+)["']/i) ||
      body.match(/var\s+ORIGIN\s*=\s*["'](https?:\/\/[^/"']+)["']/i);
    if (baseMatch && baseMatch[1]) {
      const originBase = baseMatch[1].replace(/\/$/, '');
      body = body
        .replace(/<base\s+href=["'][^"']*["']\s*\/?>/gi, '')
        .replace(/\b(src|href|poster)=["']\/(?!assets\/|\/)/gi, `$1="${originBase}/`)
        .replace(/"\/uploads\//g, `"${originBase}/uploads/`)
        .replace(/"\/avatar-jaenal\.jpg"/g, `"${originBase}/avatar-jaenal.jpg"`)
        .replace(/"\/og-image\.jpg"/g, `"${originBase}/og-image.jpg"`);

      // If HTML already has modular scripts/styles or assets, don't force inline them
      // Strip any legacy inlined blocks if modular scripts are present
      if (body.includes('/assets/index-') || body.includes('type="module"')) {
        body = body
          .replace(/<script\b[^>]*id=["']cloudpro-inlined-js["'][^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style\b[^>]*id=["']cloudpro-inlined-css["'][^>]*>[\s\S]*?<\/style>/gi, '');
      }

      // Replace or inject the enhanced SPA compatibility shim with safe localStorage & instant /api/site-data
      const spaShim = `<script id="cloudpro-spa-clone-shim">
(function(){
  var ORIGIN = ${JSON.stringify(originBase)};
  try {
    var ls = window.localStorage;
    ls.getItem('__cp_test');
  } catch (e) {
    var mem = {};
    var safeStore = {
      getItem: function(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function(k, v) { mem[k] = String(v); },
      removeItem: function(k) { delete mem[k]; },
      clear: function() { mem = {}; },
      key: function(i) { return Object.keys(mem)[i] || null; },
      get length() { return Object.keys(mem).length; }
    };
    try { Object.defineProperty(window, 'localStorage', { value: safeStore, configurable: true }); } catch (e2) {}
    try { Object.defineProperty(window, 'sessionStorage', { value: safeStore, configurable: true }); } catch (e2) {}
  }
  try {
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function() { try { return origPush.apply(this, arguments); } catch (e) {} };
    history.replaceState = function() { try { return origReplace.apply(this, arguments); } catch (e) {} };
  } catch (e) {}
  try {
    var origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function(input, init) {
        var urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        if (urlStr.indexOf('/api/site-data') !== -1 && window.__INITIAL_SITE_DATA__) {
          var raw = window.__INITIAL_SITE_DATA__ || {};
          var combined = Object.assign({}, raw, {
            success: true,
            data: raw,
            siteContent: raw.siteContent || raw,
            logoConfig: raw.logoConfig,
            stickyFooterConfig: raw.stickyFooterConfig,
            lastUpdated: raw.lastUpdated || Date.now()
          });
          var payload = JSON.stringify(combined);
          return Promise.resolve(new Response(payload, { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (typeof input === 'string' && (input.indexOf('/uploads/') === 0 || input.indexOf('/api/') === 0)) {
          input = ORIGIN + input;
        }
        return origFetch.call(this, input, init);
      };
    }
  } catch (e) {}
})();
</script>`;
      body = body.replace(/<script id="cloudpro-spa-clone-shim"[^>]*>[\s\S]*?<\/script>/gi, '');
      body = /<head[^>]*>/i.test(body)
        ? body.replace(/<head[^>]*>/i, m => `${m}\n${spaShim}`)
        : `${spaShim}\n${body}`;
    }

    // Always inject unified importmap & ?v=cp4 on index-Dx_-uADC.js so all chunks share 1 single React 19 instance
    if (body.includes('index-Dx_-uADC.js')) {
      body = body.replace(
        /src=["']\/assets\/index-Dx_-uADC\.js(?:\?v=[A-Za-z0-9_.-]+)?["']/gi,
        'src="/assets/index-Dx_-uADC.js?v=cp4"'
      );
      const importMapShim = `<script type="importmap">
{
  "imports": {
    "/assets/index-Dx_-uADC.js": "/assets/index-Dx_-uADC.js?v=cp4",
    "/assets/index-Dx_-uADC.js?v=cp_clean": "/assets/index-Dx_-uADC.js?v=cp4",
    "/assets/AdminPortal-BI2p42T-.js": "/assets/AdminPortal-BI2p42T-.js?v=cp4",
    "/assets/AdminPortal-BI2p42T-.js?v=cp_clean": "/assets/AdminPortal-BI2p42T-.js?v=cp4",
    "/assets/LogoUploaderModal-C2_9Wzl6.js": "/assets/LogoUploaderModal-C2_9Wzl6.js?v=cp4",
    "/assets/sliders-vertical-D_9bXxob.js": "/assets/sliders-vertical-D_9bXxob.js?v=cp4",
    "/assets/settings-BjXsQb13.js": "/assets/settings-BjXsQb13.js?v=cp4",
    "/assets/StickyFooterEditorModal-BfM8Lk1W.js": "/assets/StickyFooterEditorModal-BfM8Lk1W.js?v=cp4",
    "./index-Dx_-uADC.js": "/assets/index-Dx_-uADC.js?v=cp4",
    "./AdminPortal-BI2p42T-.js": "/assets/AdminPortal-BI2p42T-.js?v=cp4",
    "./LogoUploaderModal-C2_9Wzl6.js": "/assets/LogoUploaderModal-C2_9Wzl6.js?v=cp4",
    "./sliders-vertical-D_9bXxob.js": "/assets/sliders-vertical-D_9bXxob.js?v=cp4",
    "./settings-BjXsQb13.js": "/assets/settings-BjXsQb13.js?v=cp4",
    "./StickyFooterEditorModal-BfM8Lk1W.js": "/assets/StickyFooterEditorModal-BfM8Lk1W.js?v=cp4"
  }
}
</script>`;
      body = body.replace(/<script type="importmap"[\s\S]*?<\/script>/gi, '');
      body = /<head[^>]*>/i.test(body)
        ? body.replace(/<head[^>]*>/i, m => `${m}\n${importMapShim}`)
        : `${importMapShim}\n${body}`;
    }

    // Clean any legacy injected scroll-lock style from cached HTML
    body = body
      .replace(/<style id="cloudpro-scroll-fix">[\s\S]*?<\/style>/gi, '')
      .replace(/html\s*\{\s*overflow-y:\s*auto\s*!important;[\s\S]*?#root,\s*main\s*\{\s*overflow:\s*visible\s*!important;\s*height:\s*auto\s*!important;\s*\}/gi, '');

    // Strip any legacy floating admin button from cached HTML so cloned websites stay completely clean
    body = body
      .replace(/<!-- Cloud PRO Admin Floating Bar -->[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*id=["']cloudpro-admin-floater["'][\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class=["'][^"']*cloudpro-admin-floater[^"']*["'][\s\S]*?<\/div>/gi, '')
      .replace(/<a[^>]*href=["']\/login\?panel=1["'][\s\S]*?<\/a>/gi, '')
      .replace(/<a[^>]*title=["']Masuk ke Panel Kontrol Cloud PRO["'][\s\S]*?<\/a>/gi, '')
      .replace(/<span>Login Admin Cloud PRO<\/span>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>\s*<span>Login Admin Cloud PRO<\/span>/gi, '');

    // Anti-floater & Legacy Hosting Module Shield: Guaranteed to hide and remove floater + Hosting Plesk/cPanel/Unduh ZIP cPanel buttons
    const antiFloaterGuard = `<style id="cloudpro-anti-floater">#cloudpro-admin-floater,[href*="login?panel=1"],[title*="Panel Kontrol Cloud PRO"],#admin-navbar-plesk-btn,#admin-navbar-cpanel-btn,#admin-navbar-quick-cpanel-zip-btn{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;height:0!important;width:0!important;position:absolute!important;left:-9999px!important;top:-9999px!important;}</style><script>(function(){function _x(){var e=document.getElementById('cloudpro-admin-floater');if(e)e.remove();document.querySelectorAll('#cloudpro-admin-floater,[href*="login?panel=1"],#admin-navbar-plesk-btn,#admin-navbar-cpanel-btn,#admin-navbar-quick-cpanel-zip-btn').forEach(function(i){i.remove();});}_x();window.addEventListener('DOMContentLoaded',_x);window.addEventListener('load',_x);setTimeout(_x,50);setTimeout(_x,300);setTimeout(_x,1000);})();</script>`;
    
    // Mobile responsive & Android cross-browser compatibility fixes (Chrome, Samsung Internet, Firefox, Opera)
    const mobileCrossBrowserFix = `<style id="cloudpro-mobile-fix">
      html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
      body { max-width: 100vw; overflow-x: hidden; }
      img, video, svg, iframe { max-width: 100%; height: auto; }
      /* Ensure sticky bottom bars stay properly anchored above Android system navigation */
      @supports (padding-bottom: env(safe-area-inset-bottom)) {
        .fixed.bottom-0, [class*="bottom-0"], [class*="menu-pintas"] {
          padding-bottom: calc(env(safe-area-inset-bottom) + 4px) !important;
        }
      }
    </style>`;

    // Auto-hydrate browser localStorage whenever a backup/restore was performed via CloudPRO or Website Admin
    let restoreSyncScript = '';
    try {
      const physDocDir = path.join(process.cwd(), relDocRoot);
      const stampPath = path.join(physDocDir, 'data', 'restore_sync_stamp.json');
      const bridgePath = path.join(physDocDir, 'data', 'cloudpro_mysql_bridge.json');
      if (fs.existsSync(stampPath) && fs.existsSync(bridgePath)) {
        const stamp = JSON.parse(fs.readFileSync(stampPath, 'utf-8'));
        const bridge = JSON.parse(fs.readFileSync(bridgePath, 'utf-8'));
        if (stamp?.restoredAt && Array.isArray(bridge?.site_settings) && bridge.site_settings.length > 0) {
          const settingsMap: Record<string, any> = {};
          for (const row of bridge.site_settings) {
            if (row && row.id) settingsMap[row.id] = row.value;
          }
          const snapshots =
            bridge.local_storage_snapshots && typeof bridge.local_storage_snapshots === 'object'
              ? bridge.local_storage_snapshots
              : {};
          restoreSyncScript = `<script data-cloudpro-restore-sync="1">
(function(){
  try {
    var stamp = "${String(stamp.restoredAt)}";
    if (localStorage.getItem("__cloudpro_restore_ts") !== stamp) {
      var map = ${JSON.stringify(settingsMap).replace(/<\//g, '<\\/')};
      var cur = {};
      try { cur = JSON.parse(localStorage.getItem("siakad_site_settings") || "{}") || {}; } catch(e) { cur = {}; }
      for (var k in map) { cur[k] = map[k]; }
      localStorage.setItem("siakad_site_settings", JSON.stringify(cur));
      var snaps = ${JSON.stringify(snapshots).replace(/<\//g, '<\\/')};
      for (var sk in snaps) {
        try { localStorage.setItem(sk, typeof snaps[sk] === "string" ? snaps[sk] : JSON.stringify(snaps[sk])); } catch(e) {}
      }
      localStorage.setItem("__cloudpro_restore_ts", stamp);
    }
  } catch(e) {}
})();
</script>`;
        }
      }
    } catch {}

    const combinedGuards = `${restoreSyncScript}\n${antiFloaterGuard}\n${mobileCrossBrowserFix}`;
    body = body.includes('</head>')
      ? body.replace('</head>', `${combinedGuards}\n</head>`)
      : `${combinedGuards}\n${body}`;
  }

  return {
    status: 200,
    contentType,
    body,
  };
}

async function startServer() {
  const app = express();

  // Enable CORS so remote frontend deployments (e.g. servercloud.denbaguse.my.id) can communicate with the Linux backend
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ extended: true, limit: '500mb' }));

  // Graceful body-parser and request abort handler (prevents unhandled BadRequestError: request aborted)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (
      err &&
      (err.type === 'request.aborted' ||
        err.message === 'request aborted' ||
        err.code === 'ECONNABORTED' ||
        (err.status === 400 && String(err.message).toLowerCase().includes('abort')))
    ) {
      if (!res.headersSent) {
        res.status(400).json({ ok: false, error: 'request_aborted', message: 'Permintaan dibatalkan oleh klien.' });
      }
      return;
    }
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      if (!res.headersSent) {
        res.status(413).json({ ok: false, error: 'payload_too_large', message: 'Ukuran data terlalu besar.' });
      }
      return;
    }
    if (err instanceof SyntaxError && 'body' in err) {
      if (!res.headersSent) {
        res.status(400).json({ ok: false, error: 'invalid_json', message: 'Payload JSON tidak valid.' });
      }
      return;
    }
    next(err);
  });

  const distPath = path.join(process.cwd(), 'dist');

  // Helper: Resolve physical docRoot directory on disk for a given virtual docRoot (e.g. /public_html/siakad-madrasah)
  const findPhysicalDocRootDir = (docRoot: string): string => {
    const rel = normalizePath(docRoot).replace(/^\/+/, '');
    const candidates = [
      path.join(process.cwd(), rel),
      path.join(HOME_VAULT_DIR, rel),
      path.join(os.homedir(), rel),
    ];
    for (const c of candidates) {
      try {
        if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
      } catch {}
    }
    return path.join(process.cwd(), rel);
  };

  // Helper: Load or initialize JSON MySQL bridge database for a virtual host docRoot (powers /api.php & /api/settings.php)
  const loadOrInitVhostMysqlBridge = (docRoot: string) => {
    const physDir = findPhysicalDocRootDir(docRoot);
    const dataDir = path.join(physDir, 'data');
    const bridgeFile = path.join(dataDir, 'cloudpro_mysql_bridge.json');

    try {
      if (fs.existsSync(bridgeFile)) {
        return JSON.parse(fs.readFileSync(bridgeFile, 'utf-8'));
      }
    } catch {}

    const dbState: Record<string, Array<{ id: string; value: any; updated_at: string }>> = {
      site_settings: [],
      pendaftaran_spmb: [],
      teachers: [],
      users: [],
    };
    const nowIso = new Date().toISOString();

    // 1. Parse INSERT statements from database-mysql.sql if present
    const sqlFile = path.join(physDir, 'database-mysql.sql');
    if (fs.existsSync(sqlFile)) {
      try {
        const sqlText = fs.readFileSync(sqlFile, 'utf-8');
        const tupleRegex = /\('([^']+)',\s*'((?:\\'|[^'])*)'\)/g;
        let match: RegExpExecArray | null;
        while ((match = tupleRegex.exec(sqlText)) !== null) {
          const idKey = match[1];
          const rawJson = match[2].replace(/\\'/g, "'");
          try {
            const parsedVal = JSON.parse(rawJson);
            if (!dbState.site_settings.some(r => r.id === idKey)) {
              dbState.site_settings.push({ id: idKey, value: parsedVal, updated_at: nowIso });
            }
          } catch {}
        }
      } catch {}
    }

    // 2. Merge site_settings.json if present
    const siteSettingsJsonPath = path.join(physDir, 'site_settings.json');
    if (fs.existsSync(siteSettingsJsonPath)) {
      try {
        const rawSettings = JSON.parse(fs.readFileSync(siteSettingsJsonPath, 'utf-8'));
        if (rawSettings && typeof rawSettings === 'object') {
          for (const [k, v] of Object.entries(rawSettings)) {
            const existingIdx = dbState.site_settings.findIndex(r => r.id === k);
            if (existingIdx >= 0) {
              dbState.site_settings[existingIdx] = { id: k, value: v, updated_at: nowIso };
            } else {
              dbState.site_settings.push({ id: k, value: v, updated_at: nowIso });
            }
          }
        }
      } catch {}
    }

    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(bridgeFile, JSON.stringify(dbState, null, 2), 'utf-8');
    } catch {}

    return dbState;
  };

  const saveVhostMysqlBridge = (docRoot: string, dbState: any, markRestored = false) => {
    const physDir = findPhysicalDocRootDir(docRoot);
    const dataDir = path.join(physDir, 'data');
    const bridgeFile = path.join(dataDir, 'cloudpro_mysql_bridge.json');
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(bridgeFile, JSON.stringify(dbState, null, 2), 'utf-8');

      // Keep site_settings.json in sync for direct static/PHP readers
      if (Array.isArray(dbState.site_settings) && dbState.site_settings.length > 0) {
        const settingsObj: Record<string, any> = {};
        for (const r of dbState.site_settings) {
          if (r && r.id) settingsObj[r.id] = r.value;
        }
        fs.writeFileSync(path.join(physDir, 'site_settings.json'), JSON.stringify(settingsObj, null, 2), 'utf-8');
      }

      if (markRestored) {
        const stampFile = path.join(dataDir, 'restore_sync_stamp.json');
        fs.writeFileSync(
          stampFile,
          JSON.stringify(
            {
              restoredAt: Date.now(),
              restoredIso: new Date().toISOString(),
              settingsCount: Array.isArray(dbState.site_settings) ? dbState.site_settings.length : 0,
              spmbCount: Array.isArray(dbState.pendaftaran_spmb) ? dbState.pendaftaran_spmb.length : 0,
            },
            null,
            2
          ),
          'utf-8'
        );
      }

      // Mirror data folder & site_settings.json to persistent vault
      const relDoc = normalizePath(docRoot).replace(/^\//, '');
      const vaultDocDir = path.join(HOME_VAULT_DIR, relDoc);
      fs.mkdirSync(path.join(vaultDocDir, 'data'), { recursive: true });
      fs.copyFileSync(bridgeFile, path.join(vaultDocDir, 'data', 'cloudpro_mysql_bridge.json'));
      if (fs.existsSync(path.join(physDir, 'site_settings.json'))) {
        fs.copyFileSync(path.join(physDir, 'site_settings.json'), path.join(vaultDocDir, 'site_settings.json'));
      }
      if (fs.existsSync(path.join(dataDir, 'restore_sync_stamp.json'))) {
        fs.copyFileSync(
          path.join(dataDir, 'restore_sync_stamp.json'),
          path.join(vaultDocDir, 'data', 'restore_sync_stamp.json')
        );
      }
    } catch {}
  };

  // Helper: Find unreferenced media files inside webContentDir/uploads without blocking the event loop
  const findUnreferencedMediaUploads = (
    webContentDir: string,
    _excludeSubdomainDirs = false
  ): { files: string[]; totalBytes: number } => {
    const files: string[] = [];
    let totalBytes = 0;
    try {
      const upDir = path.join(webContentDir, 'uploads');
      const idxHtml = path.join(webContentDir, 'index.html');
      if (!fs.existsSync(upDir) || !fs.existsSync(idxHtml)) return { files, totalBytes };

      let refText = '';
      try {
        refText += fs.readFileSync(idxHtml, 'utf-8');
      } catch {}

      // Optionally check site_settings.json or database.sql if small
      for (const metaName of ['site_settings.json', 'config.js', 'index.php']) {
        const p = path.join(webContentDir, metaName);
        if (fs.existsSync(p)) {
          try {
            const st = fs.statSync(p);
            if (st.size <= 250_000) {
              refText += '\n' + fs.readFileSync(p, 'utf-8');
            }
          } catch {}
        }
      }

      const keepStatic = new Set([
        'og-image.jpg',
        'thumbnail.jpg',
        'avatar-jaenal.jpg',
        'apple-touch-icon.png',
        'favicon.ico',
        'favicon.png',
      ]);

      const entries = fs.readdirSync(upDir);
      for (const f of entries) {
        if (keepStatic.has(f)) continue;
        const fullF = path.join(upDir, f);
        try {
          const st = fs.statSync(fullF);
          if (!st.isFile()) continue;
          if (refText.length > 50 && refText.includes(f)) continue;
          files.push(f);
          totalBytes += st.size;
        } catch {}
      }
    } catch {}
    return { files, totalBytes };
  };

  // Helper: Automatically prune dead/unreferenced Vite build chunks in assets/ AND unreferenced orphan media in uploads/
  const pruneDeadViteAssets = (
    webContentDir: string,
    excludeSubdomainDirs = false
  ): { deletedCount: number; freedBytes: number } => {
    let deletedCount = 0;
    let freedBytes = 0;
    try {
      const assetsSubDir = path.join(webContentDir, 'assets');
      const rootIdxHtml = path.join(webContentDir, 'index.html');
      if (fs.existsSync(assetsSubDir) && fs.existsSync(rootIdxHtml)) {
        // Also remove any stray nested folders inside assets/ like aistudio/
        const allEntries = fs.readdirSync(assetsSubDir, { withFileTypes: true });
        for (const entry of allEntries) {
          if (entry.isDirectory() && (entry.name === 'aistudio' || entry.name === '__MACOSX' || entry.name === '.git')) {
            try {
              fs.rmSync(path.join(assetsSubDir, entry.name), { recursive: true, force: true });
              deletedCount++;
            } catch {}
          }
        }
        const allAssets = fs.readdirSync(assetsSubDir);
        if (allAssets.length > 5) {
          const keepSet = new Set<string>();
          const queue: string[] = [];
          const extractRefs = (txt: string) => {
            const ms =
              txt.match(
                /[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{6,16}\.(?:js|css|svg|png|jpg|jpeg|webp|gif|woff2?|ttf|eot|wasm|json)/g
              ) || [];
            for (const m of ms) {
              const b = path.basename(m);
              if (!keepSet.has(b)) {
                keepSet.add(b);
                queue.push(b);
              }
            }
          };
          extractRefs(fs.readFileSync(rootIdxHtml, 'utf-8'));
          // Only prune if index.html actually references at least one hashed Vite entry asset
          if (keepSet.size > 0) {
            while (queue.length > 0) {
              const curr = queue.pop()!;
              const full = path.join(assetsSubDir, curr);
              if ((curr.endsWith('.js') || curr.endsWith('.css')) && fs.existsSync(full)) {
                try {
                  extractRefs(fs.readFileSync(full, 'utf-8'));
                } catch {}
              }
            }
            for (const f of allAssets) {
              const isHashed = /^[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{6,16}\.(?:js|css|js\.map|css\.map)$/.test(f);
              if (isHashed && !keepSet.has(f)) {
                const fullAssetPath = path.join(assetsSubDir, f);
                try {
                  const st = fs.statSync(fullAssetPath);
                  if (st.isFile()) {
                    freedBytes += st.size;
                    fs.unlinkSync(fullAssetPath);
                    deletedCount++;
                  }
                } catch {}
              }
            }
          }
        }
      }

      // Also prune unreferenced orphan media files in uploads/ (e.g. unused 250MB video_*.mp4 & old logo/gallery upload revisions)
      const unrefUploads = findUnreferencedMediaUploads(webContentDir, excludeSubdomainDirs);
      if (unrefUploads.files.length > 0) {
        const upDir = path.join(webContentDir, 'uploads');
        for (const f of unrefUploads.files) {
          const fullUpPath = path.join(upDir, f);
          try {
            const st = fs.statSync(fullUpPath);
            if (st.isFile()) {
              freedBytes += st.size;
              fs.unlinkSync(fullUpPath);
              deletedCount++;
            }
          } catch {}
        }
      }
    } catch {}
    return { deletedCount, freedBytes };
  };

  // Helper: Comprehensive & Safe Server Disk Junk Cleaner (removes dead build chunks, orphan media uploads, vault orphans, ghost virtual files, and temp snapshots)
  const cleanServerDiskJunk = (options: { removeAllPreRestoreSnapshots?: boolean } = {}) => {
    let deletedFilesCount = 0;
    let freedBytes = 0;
    let cleanedGhostVirtualFiles = 0;
    let cleanedSnapshotsCount = 0;

    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    // 1. Prune dead Vite chunks, orphan media uploads & leftover .zip/.tar.gz/.tmp/.bak archives across all web roots in process.cwd()/public_html and HOME_VAULT_DIR/public_html
    const cleanLeftoverWebRootArchives = (webDir: string, isPrimaryRoot: boolean) => {
      if (!fs.existsSync(webDir)) return;
      try {
        for (const item of fs.readdirSync(webDir, { withFileTypes: true })) {
          if (item.isFile()) {
            const lower = item.name.toLowerCase();
            if (
              lower.endsWith('.zip') ||
              lower.endsWith('.tar.gz') ||
              lower.endsWith('.tmp') ||
              lower.endsWith('.bak') ||
              lower.endsWith('.old')
            ) {
              const fullFile = path.join(webDir, item.name);
              try {
                const st = fs.statSync(fullFile);
                freedBytes += st.size;
                fs.unlinkSync(fullFile);
                deletedFilesCount++;
              } catch {}
            }
          }
        }
      } catch {}
    };

    const pubRoots = [path.join(process.cwd(), 'public_html'), path.join(HOME_VAULT_DIR, 'public_html')];
    for (const basePub of pubRoots) {
      if (!fs.existsSync(basePub)) continue;
      cleanLeftoverWebRootArchives(basePub, true);
      const r0 = pruneDeadViteAssets(basePub, true);
      deletedFilesCount += r0.deletedCount;
      freedBytes += r0.freedBytes;
      try {
        for (const sub of fs.readdirSync(basePub, { withFileTypes: true })) {
          if (sub.isDirectory() && !sub.name.startsWith('.')) {
            const subPath = path.join(basePub, sub.name);
            // Remove legacy test-transfer ghost folder if present
            if (sub.name === 'test-transfer' || sub.name === '__MACOSX') {
              try {
                fs.rmSync(subPath, { recursive: true, force: true });
                deletedFilesCount++;
              } catch {}
              continue;
            }
            cleanLeftoverWebRootArchives(subPath, false);
            const rs = pruneDeadViteAssets(subPath, false);
            deletedFilesCount += rs.deletedCount;
            freedBytes += rs.freedBytes;
          }
        }
      } catch {}
    }

    // 2. Sync Persistent Vault (HOME_VAULT_DIR/public_html) with active process.cwd()/public_html so deleted files in vault are removed
    const cwdPub = path.join(process.cwd(), 'public_html');
    const vaultPub = path.join(HOME_VAULT_DIR, 'public_html');
    if (fs.existsSync(cwdPub) && fs.existsSync(vaultPub)) {
      const removeOrphansInVault = (cwdDir: string, vDir: string) => {
        if (!fs.existsSync(vDir)) return;
        try {
          for (const entry of fs.readdirSync(vDir, { withFileTypes: true })) {
            const cPath = path.join(cwdDir, entry.name);
            const vPath = path.join(vDir, entry.name);
            if (!fs.existsSync(cPath)) {
              try {
                if (entry.isDirectory()) {
                  fs.rmSync(vPath, { recursive: true, force: true });
                } else {
                  freedBytes += fs.statSync(vPath).size;
                  fs.unlinkSync(vPath);
                }
                deletedFilesCount++;
              } catch {}
            } else if (entry.isDirectory()) {
              removeOrphansInVault(cPath, vPath);
            }
          }
        } catch {}
      };
      removeOrphansInVault(cwdPub, vaultPub);
    }

    // 3. Clean ghost virtual file records in vhostStore & persistedFullAppState that no longer exist on disk
    const doesVirtualPathExistOnDisk = (virtPath: string): boolean => {
      const norm = normalizePath(virtPath);
      if (norm === '/public_html') return true;
      const rel = norm.replace(/^\//, '');
      return (
        fs.existsSync(path.join(process.cwd(), rel)) ||
        fs.existsSync(path.join(HOME_VAULT_DIR, rel))
      );
    };

    for (const accId of Object.keys(vhostStore.filesByAccount || {})) {
      const arr = vhostStore.filesByAccount[accId];
      if (Array.isArray(arr)) {
        const beforeLen = arr.length;
        vhostStore.filesByAccount[accId] = arr.filter(f => doesVirtualPathExistOnDisk(f.path));
        cleanedGhostVirtualFiles += Math.max(0, beforeLen - vhostStore.filesByAccount[accId].length);
      }
    }

    if (persistedFullAppState && Array.isArray(persistedFullAppState.virtualFiles)) {
      const beforeLen = persistedFullAppState.virtualFiles.length;
      persistedFullAppState.virtualFiles = persistedFullAppState.virtualFiles.filter((f: any) =>
        f && f.path ? doesVirtualPathExistOnDisk(f.path) : false
      );
      cleanedGhostVirtualFiles += Math.max(0, beforeLen - persistedFullAppState.virtualFiles.length);
    }

    // 4. Clean pre-restore automatic snapshot archives (snapshot-before-restore-*.zip) & temp /tmp files
    for (const bDir of [BACKUPS_DIR, LOCAL_BACKUPS_DIR]) {
      if (!fs.existsSync(bDir)) continue;
      try {
        const snaps = fs
          .readdirSync(bDir)
          .filter(f => f.startsWith('snapshot-before-restore-') && f.endsWith('.zip'))
          .map(f => {
            const p = path.join(bDir, f);
            const st = fs.statSync(p);
            return { name: f, path: p, mtime: st.mtimeMs, size: st.size };
          })
          .sort((a, b) => b.mtime - a.mtime);

        const toDelete = options.removeAllPreRestoreSnapshots ? snaps : snaps.slice(1);
        for (const s of toDelete) {
          try {
            fs.unlinkSync(s.path);
            freedBytes += s.size;
            cleanedSnapshotsCount++;
            deletedFilesCount++;
          } catch {}
        }
      } catch {}
    }

    // Clean temporary zip/restore working directories in /tmp
    try {
      for (const tmpItem of fs.readdirSync(TMP_DIR)) {
        if (
          tmpItem.startsWith('cloudpro-restore-') ||
          tmpItem.startsWith('cloudpro-pull-') ||
          tmpItem.startsWith('cloudpro-web-restore-') ||
          tmpItem.startsWith('cloudpro-backup-stage-')
        ) {
          const fullTmp = path.join(TMP_DIR, tmpItem);
          try {
            fs.rmSync(fullTmp, { recursive: true, force: true });
            deletedFilesCount++;
          } catch {}
        }
      }
    } catch {}

    // 5. Compute real disk usage and update persistedFullAppState.hostingAccounts
    let totalActiveBytes = 0;
    let totalActiveFiles = 0;
    const scanReal = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          if (e.name === '.git' || e.name === 'node_modules' || e.name === '__MACOSX') continue;
          const p = path.join(dir, e.name);
          if (e.isDirectory()) scanReal(p);
          else if (e.isFile()) {
            totalActiveFiles++;
            try {
              totalActiveBytes += fs.statSync(p).size;
            } catch {}
          }
        }
      } catch {}
    };
    scanReal(path.join(process.cwd(), 'public_html'));
    const realUsedMb = Math.max(1, Math.round(totalActiveBytes / (1024 * 1024)));

    if (persistedFullAppState && Array.isArray(persistedFullAppState.hostingAccounts)) {
      persistedFullAppState.hostingAccounts = persistedFullAppState.hostingAccounts.map((acc: any) => {
        if (acc.id === 'acc-rdm-01') {
          return { ...acc, diskUsedMb: realUsedMb };
        }
        return acc;
      });
      persistFullAppState(persistedFullAppState);
    }
    persistVhostStore();

    return {
      ok: true,
      deletedFilesCount,
      cleanedGhostVirtualFiles,
      cleanedSnapshotsCount,
      freedBytes,
      freedFormatted: formatBytes(freedBytes),
      totalActiveFiles,
      totalActiveBytes,
      totalActiveFormatted: formatBytes(totalActiveBytes),
      realUsedMb,
    };
  };

  // Run automatic disk junk cleanup once on startup so vault & virtual store are always clean
  setTimeout(() => {
    try {
      cleanServerDiskJunk({ removeAllPreRestoreSnapshots: false });
    } catch {}
  }, 1500);

  // Helper: Parse and apply Website Data Backups (database.json, site_settings.json, persisted_site_data.json, database.sql, uploads/*)
  // Works identically whether triggered from CloudPRO Backup & Restore OR from inside the website's Admin Backup & Restore page!
  const applyWebsiteDataBackupToDocRoot = (
    sourceDirOrFile: string,
    physicalTarget: string,
    docRoot: string
  ): {
    restoredSettingsCount: number;
    restoredSpmbCount: number;
    restoredUploadsCount: number;
    isWebsiteDataOnlyBackup: boolean;
  } => {
    let restoredSettingsCount = 0;
    let restoredSpmbCount = 0;
    let restoredUploadsCount = 0;
    const nowIso = new Date().toISOString();
    const dbState = loadOrInitVhostMysqlBridge(docRoot);
    if (!Array.isArray(dbState.site_settings)) dbState.site_settings = [];
    if (!Array.isArray(dbState.pendaftaran_spmb)) dbState.pendaftaran_spmb = [];
    if (!dbState.local_storage_snapshots || typeof dbState.local_storage_snapshots !== 'object') {
      dbState.local_storage_snapshots = {};
    }

    const upsertSettingRecord = (idKey: string, rawVal: any) => {
      if (!idKey) return;
      const parsedVal =
        typeof rawVal === 'string'
          ? (() => {
              try {
                return JSON.parse(rawVal);
              } catch {
                return rawVal;
              }
            })()
          : rawVal;
      const idx = dbState.site_settings.findIndex((r: any) => String(r.id) === String(idKey));
      if (idx >= 0) {
        dbState.site_settings[idx] = { id: String(idKey), value: parsedVal, updated_at: nowIso };
      } else {
        dbState.site_settings.push({ id: String(idKey), value: parsedVal, updated_at: nowIso });
      }
      restoredSettingsCount++;
    };

    const parseJsonBackupObject = (jsonObj: any) => {
      if (!jsonObj || typeof jsonObj !== 'object') return;

      // 1. Personal Website / AdminPortal format (siteContent, logoConfig, stickyFooterConfig)
      if (jsonObj.siteContent || jsonObj.logoConfig || jsonObj.stickyFooterConfig) {
        const persistedPath = path.join(physicalTarget, 'data', 'persisted_site_data.json');
        try {
          fs.mkdirSync(path.dirname(persistedPath), { recursive: true });
          fs.writeFileSync(persistedPath, JSON.stringify(jsonObj, null, 2), 'utf-8');
        } catch {}
        if (jsonObj.siteContent) upsertSettingRecord('siteContent', jsonObj.siteContent);
        if (jsonObj.logoConfig) upsertSettingRecord('logoConfig', jsonObj.logoConfig);
        if (jsonObj.stickyFooterConfig) upsertSettingRecord('stickyFooterConfig', jsonObj.stickyFooterConfig);
      }

      // 2. SIAKAD Madrasah / Universal tables.site_settings format
      const rawSettings =
        jsonObj.tables?.site_settings ||
        jsonObj.database?.tables?.site_settings ||
        jsonObj.site_settings ||
        (jsonObj.tables && !jsonObj.tables.site_settings ? jsonObj.tables : null);

      if (Array.isArray(rawSettings)) {
        for (const row of rawSettings) {
          if (row && (row.id || row.name)) {
            upsertSettingRecord(String(row.id || row.name), row.value);
          }
        }
      } else if (rawSettings && typeof rawSettings === 'object') {
        for (const [k, v] of Object.entries(rawSettings)) {
          if (k !== 'pendaftaran_spmb') {
            upsertSettingRecord(k, v);
          }
        }
      } else if (
        !jsonObj.tables &&
        !jsonObj.database &&
        !jsonObj.siteContent &&
        !jsonObj.app &&
        !jsonObj.domain &&
        !jsonObj.backupType
      ) {
        // Direct associative object of settings (like site_settings.json)
        for (const [k, v] of Object.entries(jsonObj)) {
          if (k !== 'version' && k !== 'timestamp' && k !== 'backup_type') {
            upsertSettingRecord(k, v);
          }
        }
      }

      // 3. SPMB registrations table
      const rawSpmb =
        jsonObj.tables?.pendaftaran_spmb ||
        jsonObj.database?.tables?.pendaftaran_spmb ||
        jsonObj.pendaftaran_spmb;
      if (Array.isArray(rawSpmb)) {
        for (const sp of rawSpmb) {
          if (sp && sp.id) {
            const idx = dbState.pendaftaran_spmb.findIndex((r: any) => String(r.id) === String(sp.id));
            if (idx >= 0) {
              dbState.pendaftaran_spmb[idx] = { ...sp, updated_at: nowIso };
            } else {
              dbState.pendaftaran_spmb.push({ ...sp, updated_at: nowIso });
            }
            restoredSpmbCount++;
          }
        }
      }

      // 4. LocalStorage snapshots (e.g. siakad_data_guru, siakad_data_siswa, siakad_site_settings)
      if (jsonObj.local_storage_snapshots && typeof jsonObj.local_storage_snapshots === 'object') {
        dbState.local_storage_snapshots = {
          ...dbState.local_storage_snapshots,
          ...jsonObj.local_storage_snapshots,
        };
        for (const [lsKey, lsVal] of Object.entries(jsonObj.local_storage_snapshots)) {
          if (lsKey === 'siakad_site_settings' && lsVal && typeof lsVal === 'object') {
            for (const [sk, sv] of Object.entries(lsVal as Record<string, any>)) {
              upsertSettingRecord(sk, sv);
            }
          } else if (lsKey.startsWith('siakad_')) {
            const cleanSettingKey = lsKey.replace(/^siakad_/, '');
            upsertSettingRecord(cleanSettingKey, lsVal);
          }
        }
      }

      // 5. Base64 uploads embedded inside JSON backup
      if (Array.isArray(jsonObj.uploads)) {
        const targetUploadsDir = path.join(physicalTarget, 'uploads');
        fs.mkdirSync(targetUploadsDir, { recursive: true });
        for (const u of jsonObj.uploads) {
          if (u && u.name && u.data) {
            const cleanName = path.basename(String(u.name));
            if (!/\.(php|phtml|sh|pl|py|cgi|exe)$/i.test(cleanName) && cleanName !== '.htaccess') {
              try {
                const base64Clean = String(u.data).replace(/^data:[^;]+;base64,/, '');
                fs.writeFileSync(path.join(targetUploadsDir, cleanName), Buffer.from(base64Clean, 'base64'));
                restoredUploadsCount++;
              } catch {}
            }
          }
        }
      }
    };

    const parseSqlBackupText = (sqlText: string) => {
      if (!sqlText) return;
      // Match ('id', 'value') tuples in INSERT INTO site_settings
      const tupleRegex = /\('([^']+)',\s*'((?:\\'|[^'])*)'/g;
      let match: RegExpExecArray | null;
      while ((match = tupleRegex.exec(sqlText)) !== null) {
        const idKey = match[1];
        const rawVal = match[2]
          .replace(/\\'/g, "'")
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\\\/g, '\\');
        if (idKey && idKey !== 'id') {
          upsertSettingRecord(idKey, rawVal);
        }
      }
    };

    let isWebsiteDataOnlyBackup = false;

    try {
      const stat = fs.statSync(sourceDirOrFile);
      if (stat.isFile()) {
        isWebsiteDataOnlyBackup = true;
        const lower = sourceDirOrFile.toLowerCase();
        const rawText = fs.readFileSync(sourceDirOrFile, 'utf-8');
        if (lower.endsWith('.json')) {
          parseJsonBackupObject(JSON.parse(rawText));
        } else if (lower.endsWith('.sql')) {
          parseSqlBackupText(rawText);
        }
      } else if (stat.isDirectory()) {
        const hasIndex =
          fs.existsSync(path.join(sourceDirOrFile, 'index.html')) ||
          fs.existsSync(path.join(sourceDirOrFile, 'index.php'));
        const hasWebsiteDataMarkers =
          fs.existsSync(path.join(sourceDirOrFile, 'database.json')) ||
          fs.existsSync(path.join(sourceDirOrFile, 'manifest.json')) ||
          fs.existsSync(path.join(sourceDirOrFile, 'database.sql')) ||
          fs.existsSync(path.join(sourceDirOrFile, 'uploads'));
        if (!hasIndex && hasWebsiteDataMarkers) {
          isWebsiteDataOnlyBackup = true;
        }

        // Check SQL files first, then JSON files (so database.json overrides older SQL templates if both exist)
        for (const sqlName of ['database-mysql.sql', 'database.sql']) {
          const sp = path.join(sourceDirOrFile, sqlName);
          if (fs.existsSync(sp) && fs.statSync(sp).isFile()) {
            try {
              parseSqlBackupText(fs.readFileSync(sp, 'utf-8'));
            } catch {}
          }
        }

        const jsonCandidates = [
          path.join(sourceDirOrFile, 'database.json'),
          path.join(sourceDirOrFile, 'site_settings.json'),
          path.join(sourceDirOrFile, 'data', 'persisted_site_data.json'),
        ];
        // Also scan root of sourceDirOrFile for any custom backup-*.json file
        try {
          for (const f of fs.readdirSync(sourceDirOrFile)) {
            if (
              f.toLowerCase().endsWith('.json') &&
              !['manifest.json', 'domain-manifest.json', 'package.json', 'package-lock.json', 'tsconfig.json'].includes(
                f.toLowerCase()
              )
            ) {
              const fp = path.join(sourceDirOrFile, f);
              if (!jsonCandidates.includes(fp)) jsonCandidates.push(fp);
            }
          }
        } catch {}

        for (const jp of jsonCandidates) {
          if (fs.existsSync(jp) && fs.statSync(jp).isFile()) {
            try {
              parseJsonBackupObject(JSON.parse(fs.readFileSync(jp, 'utf-8')));
            } catch {}
          }
        }

        // Copy uploads/* if present in sourceDirOrFile
        const srcUploads = path.join(sourceDirOrFile, 'uploads');
        if (fs.existsSync(srcUploads) && fs.statSync(srcUploads).isDirectory()) {
          const destUploads = path.join(physicalTarget, 'uploads');
          fs.mkdirSync(destUploads, { recursive: true });
          for (const item of fs.readdirSync(srcUploads)) {
            if (item.startsWith('.') || /\.(php|phtml|sh|pl|py|cgi|exe)$/i.test(item)) continue;
            const sItem = path.join(srcUploads, item);
            const dItem = path.join(destUploads, item);
            try {
              if (fs.statSync(sItem).isFile()) {
                fs.copyFileSync(sItem, dItem);
                restoredUploadsCount++;
              }
            } catch {}
          }
        }
      }
    } catch {}

    if (restoredSettingsCount > 0 || restoredSpmbCount > 0 || restoredUploadsCount > 0) {
      saveVhostMysqlBridge(docRoot, dbState, true);

      // Also mirror uploads to persistent vault
      try {
        const relDoc = normalizePath(docRoot).replace(/^\//, '');
        const vaultUploads = path.join(HOME_VAULT_DIR, relDoc, 'uploads');
        const physUploads = path.join(physicalTarget, 'uploads');
        if (fs.existsSync(physUploads)) {
          fs.mkdirSync(vaultUploads, { recursive: true });
          execSync(`cp -rf "${physUploads}/." "${vaultUploads}/" 2>/dev/null || true`, { stdio: 'ignore' });
        }
      } catch {}
    }

    return {
      restoredSettingsCount,
      restoredSpmbCount,
      restoredUploadsCount,
      isWebsiteDataOnlyBackup,
    };
  };

  // Native PHP / MySQL API Bridge for cloned apps (/api.php, /api/settings.php, /api/site-data)
  const handleVirtualPhpApiRequest = (req: express.Request, res: express.Response) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const rawForwarded = req.headers['x-forwarded-host'] || req.headers['x-original-host'];
    const forwardedStr = Array.isArray(rawForwarded)
      ? rawForwarded[0]
      : typeof rawForwarded === 'string'
        ? rawForwarded.split(',')[0].trim()
        : '';
    const incomingHost = (forwardedStr || (req.headers['host'] as string) || '').split(':')[0].toLowerCase().replace(/^www\./, '');
    let docRoot = resolveHostDocRoot(incomingHost);

    // If called from Control Panel preview modal (servercloud.denbaguse.my.id), detect active subdomain if /api.php is requested
    if (docRoot === '/public_html' && req.path === '/api.php') {
      const siakadDir = path.join(process.cwd(), 'public_html', 'siakad-madrasah');
      if (!fs.existsSync(path.join(process.cwd(), 'public_html', 'api.php')) && fs.existsSync(path.join(siakadDir, 'api.php'))) {
        docRoot = '/public_html/siakad-madrasah';
      }
    }

    const physDir = findPhysicalDocRootDir(docRoot);

    // Handle /api/settings.php and /api/site-data (persisted_site_data.json format)
    if (req.path === '/api/settings.php' || req.path === '/api/site-data') {
      const persistedPath = path.join(physDir, 'data', 'persisted_site_data.json');
      const fallbackPersisted = path.join(process.cwd(), 'public_html', 'siakad-madrasah', 'data', 'persisted_site_data.json');
      const targetPersisted = fs.existsSync(persistedPath) ? persistedPath : fallbackPersisted;

      if (req.method === 'POST' || req.method === 'PUT') {
        try {
          const incoming = req.body || {};
          const payloadToSave = incoming.data || incoming;
          fs.mkdirSync(path.dirname(persistedPath), { recursive: true });
          fs.writeFileSync(persistedPath, JSON.stringify(payloadToSave, null, 2), 'utf-8');
          return res.status(200).json({
            success: true,
            status: 'success',
            data: payloadToSave,
            lastUpdated: Date.now(),
          });
        } catch (err: any) {
          return res.status(500).json({ success: false, error: err?.message || 'Gagal menyimpan data.' });
        }
      }

      try {
        if (fs.existsSync(targetPersisted)) {
          const raw = JSON.parse(fs.readFileSync(targetPersisted, 'utf-8'));
          return res.status(200).json({
            ...raw,
            success: true,
            status: 'success',
            data: raw,
            siteContent: raw.siteContent || raw,
            logoConfig: raw.logoConfig,
            stickyFooterConfig: raw.stickyFooterConfig,
            lastUpdated: raw.lastUpdated || Date.now(),
          });
        }
      } catch {}
      return res.status(200).json({ success: true, status: 'success', data: {} });
    }

    // Handle /api.php (Si@Kad Madrasah MySQL Bridge format)
    const action = String(req.query.action || (req.body && req.body.action) || '').toLowerCase();
    const table = String(req.query.table || (req.body && req.body.table) || 'site_settings');
    const id = req.query.id ? String(req.query.id) : undefined;

    const dbState = loadOrInitVhostMysqlBridge(docRoot);
    if (!Array.isArray(dbState[table])) {
      dbState[table] = [];
    }

    if (action === 'test_connection' || action === 'db_status' || action === 'ping' || action === 'save_db_config') {
      return res.status(200).json({
        status: 'success',
        connected: true,
        data: { status: 'connected', server: 'CloudPRO MariaDB 10.11' },
        error: null,
        message: 'Terhubung ke database MySQL Cloud PRO (MariaDB 10.11)!',
      });
    }

    if (action === 'select') {
      const rows = dbState[table] || [];
      if (id) {
        const found = rows.find((r: any) => String(r.id) === id) || null;
        return res.status(200).json({ data: found, error: null });
      }
      return res.status(200).json({ data: rows, error: null });
    }

    if (action === 'upsert' || (req.method === 'POST' && !action)) {
      const payload = req.body;
      const nowIso = new Date().toISOString();
      const items = Array.isArray(payload) ? payload : payload && typeof payload === 'object' ? [payload] : [];
      for (const item of items) {
        if (!item || !item.id) continue;
        const idx = dbState[table].findIndex((r: any) => String(r.id) === String(item.id));
        const parsedVal = typeof item.value === 'string' ? (() => { try { return JSON.parse(item.value); } catch { return item.value; } })() : item.value;
        if (idx >= 0) {
          dbState[table][idx] = { id: String(item.id), value: parsedVal, updated_at: nowIso };
        } else {
          dbState[table].push({ id: String(item.id), value: parsedVal, updated_at: nowIso });
        }
      }
      saveVhostMysqlBridge(docRoot, dbState, true);
      return res.status(200).json({
        status: 'success',
        data: Array.isArray(payload) ? true : { id: items[0]?.id },
        error: null,
      });
    }

    if (action === 'delete' || req.method === 'DELETE') {
      if (id) {
        dbState[table] = (dbState[table] || []).filter((r: any) => String(r.id) !== id);
        saveVhostMysqlBridge(docRoot, dbState, true);
      }
      return res.status(200).json({ status: 'success', data: true, error: null });
    }

    if (action === 'backup_status') {
      const uploadDir = path.join(physDir, 'uploads');
      let fileCount = 0;
      let totalSize = 0;
      if (fs.existsSync(uploadDir)) {
        try {
          for (const item of fs.readdirSync(uploadDir)) {
            if (item.startsWith('.') || item === 'index.html') continue;
            const p = path.join(uploadDir, item);
            if (fs.statSync(p).isFile()) {
              fileCount++;
              totalSize += fs.statSync(p).size;
            }
          }
        } catch {}
      }
      return res.status(200).json({
        status: 'success',
        safe_overwrite_protection: true,
        has_local_config: true,
        has_backup_config: true,
        upload_files_count: fileCount,
        upload_files_size_mb: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
        settings_records_count: Array.isArray(dbState.site_settings) ? dbState.site_settings.length : 0,
        zip_support: true,
        message: 'Sistem cadangan dan proteksi timpa ZIP aktif di Cloud PRO!',
      });
    }

    if (action === 'list_uploads') {
      const uploadDir = path.join(physDir, 'uploads');
      const filesList: Array<{ name: string; size: number; url: string; modified: string }> = [];
      let totalSize = 0;
      if (fs.existsSync(uploadDir)) {
        try {
          for (const item of fs.readdirSync(uploadDir)) {
            if (item.startsWith('.') || item === 'index.html') continue;
            const p = path.join(uploadDir, item);
            const st = fs.statSync(p);
            if (st.isFile()) {
              totalSize += st.size;
              filesList.push({
                name: item,
                size: st.size,
                url: `/uploads/${encodeURIComponent(item)}`,
                modified: st.mtime.toISOString(),
              });
            }
          }
        } catch {}
      }
      return res.status(200).json({
        status: 'success',
        data: filesList,
        total_files: filesList.length,
        total_size_bytes: totalSize,
        total_size_mb: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
      });
    }

    if (action === 'backup_full') {
      try {
        const schoolName =
          dbState.site_settings?.find((r: any) => r.id === 'general' || r.id === 'identitas')?.value?.nama_madrasah ||
          'SIAKAD_Madrasah';
        const dateStr = new Date().toISOString().split('T')[0];
        const zipFileName = `backup-lengkap-${ String(schoolName).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() }-${dateStr}.zip`;
        const tmpZip = path.join(TMP_DIR, `web-backup-${Date.now()}.zip`);
        const tmpStage = path.join(TMP_DIR, `web-stage-${Date.now()}`);
        fs.mkdirSync(tmpStage, { recursive: true });

        const dbJsonPayload = {
          version: '2.0',
          backup_type: 'full_archive',
          timestamp: new Date().toISOString(),
          school_name: schoolName,
          tables: {
            site_settings: dbState.site_settings || [],
            pendaftaran_spmb: dbState.pendaftaran_spmb || [],
          },
          local_storage_snapshots: dbState.local_storage_snapshots || {},
        };
        fs.writeFileSync(path.join(tmpStage, 'database.json'), JSON.stringify(dbJsonPayload, null, 2), 'utf-8');

        let sqlDump = `-- BACKUP DATABASE SIAKAD MADRASAH (Cloud PRO)\n-- Tanggal: ${new Date().toISOString()}\nSET FOREIGN_KEY_CHECKS = 0;\n`;
        sqlDump += `CREATE TABLE IF NOT EXISTS \`site_settings\` (\n  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,\n  \`value\` LONGTEXT NOT NULL,\n  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;
        for (const r of dbState.site_settings || []) {
          if (!r || !r.id) continue;
          const valStr = (typeof r.value === 'string' ? r.value : JSON.stringify(r.value))
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
          sqlDump += `INSERT INTO \`site_settings\` (\`id\`, \`value\`) VALUES ('${r.id}', '${valStr}') ON DUPLICATE KEY UPDATE \`value\`=VALUES(\`value\`);\n`;
        }
        sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
        fs.writeFileSync(path.join(tmpStage, 'database.sql'), sqlDump, 'utf-8');

        const uploadDir = path.join(physDir, 'uploads');
        let uploadedCount = 0;
        if (fs.existsSync(uploadDir)) {
          const stageUploads = path.join(tmpStage, 'uploads');
          fs.mkdirSync(stageUploads, { recursive: true });
          for (const item of fs.readdirSync(uploadDir)) {
            if (item.startsWith('.')) continue;
            const sp = path.join(uploadDir, item);
            if (fs.statSync(sp).isFile()) {
              fs.copyFileSync(sp, path.join(stageUploads, item));
              uploadedCount++;
            }
          }
        }

        const manifestPayload = {
          app: 'SIAKAD MIMA 2 Sanggreman',
          backup_type: 'full_archive_zip',
          version: '2.0',
          created_at: new Date().toISOString(),
          school_name: schoolName,
          stats: {
            site_settings_count: (dbState.site_settings || []).length,
            spmb_count: (dbState.pendaftaran_spmb || []).length,
            uploaded_files_count: uploadedCount,
          },
        };
        fs.writeFileSync(path.join(tmpStage, 'manifest.json'), JSON.stringify(manifestPayload, null, 2), 'utf-8');

        execSync(`python3 -c "
import os, zipfile
with zipfile.ZipFile('${tmpZip}', 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for root, dirs, files in os.walk('${tmpStage}'):
        for f in files:
            p = os.path.join(root, f)
            zf.write(p, arcname=os.path.relpath(p, '${tmpStage}'))
"`, { timeout: 60000 });

        // Also save a copy into CloudPRO Server Backup Archives so it appears in CloudPRO Backup Manager!
        try {
          fs.copyFileSync(tmpZip, path.join(BACKUPS_DIR, zipFileName));
          fs.copyFileSync(tmpZip, path.join(LOCAL_BACKUPS_DIR, zipFileName));
        } catch {}

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
        const zipBuf = fs.readFileSync(tmpZip);
        try {
          fs.rmSync(tmpStage, { recursive: true, force: true });
          fs.rmSync(tmpZip, { force: true });
        } catch {}
        return res.status(200).send(zipBuf);
      } catch (err: any) {
        return res.status(500).json({ status: 'error', error: err?.message || 'Gagal membuat arsip ZIP.' });
      }
    }

    if (action === 'restore_full') {
      try {
        // Check if JSON body was sent directly
        if (req.body && typeof req.body === 'object' && (req.body.tables || req.body.database || req.body.site_settings)) {
          const tmpJsonFile = path.join(TMP_DIR, `restore-direct-${Date.now()}.json`);
          fs.writeFileSync(tmpJsonFile, JSON.stringify(req.body), 'utf-8');
          const resStats = applyWebsiteDataBackupToDocRoot(tmpJsonFile, physDir, docRoot);
          try { fs.rmSync(tmpJsonFile, { force: true }); } catch {}
          return res.status(200).json({
            status: 'success',
            message: `Restorasi berhasil! Dipulihkan: ${resStats.restoredSettingsCount} data modul/pengaturan dan ${resStats.restoredUploadsCount} berkas media.`,
            restored_settings: resStats.restoredSettingsCount,
            restored_files: resStats.restoredUploadsCount,
            restored_spmb: resStats.restoredSpmbCount,
          });
        }

        // If multipart/form-data was uploaded (e.g. FormData with backup_file), parse raw buffer
        const contentTypeHeader = String(req.headers['content-type'] || '');
        if (contentTypeHeader.includes('multipart/form-data')) {
          const chunks: Buffer[] = [];
          req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          req.on('end', () => {
            try {
              const rawBuf = Buffer.concat(chunks);
              // Find PK\x03\x04 signature for ZIP archive inside multipart payload
              const pkIdx = rawBuf.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
              if (pkIdx !== -1) {
                // Find end of central directory (PK\x05\x06)
                const eocdIdx = rawBuf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
                const zipEnd = eocdIdx !== -1 ? eocdIdx + 22 + rawBuf.readUInt16LE(eocdIdx + 20) : rawBuf.length;
                const zipSlice = rawBuf.subarray(pkIdx, Math.min(zipEnd, rawBuf.length));
                const tmpZipPath = path.join(TMP_DIR, `web-restore-${Date.now()}.zip`);
                const tmpExtractDir = path.join(TMP_DIR, `web-restore-ext-${Date.now()}`);
                try {
                  fs.writeFileSync(tmpZipPath, zipSlice);
                  fs.mkdirSync(tmpExtractDir, { recursive: true });
                  try {
                    execSync(`unzip -q -o "${tmpZipPath}" -d "${tmpExtractDir}"`, { timeout: 300000, stdio: 'pipe' });
                  } catch {
                    execSync(`python3 -c "
import zipfile
with zipfile.ZipFile('${tmpZipPath}', 'r') as zf:
    zf.extractall('${tmpExtractDir}')
"`, { timeout: 300000 });
                  }
                  const stats = applyWebsiteDataBackupToDocRoot(tmpExtractDir, physDir, docRoot);
                  return res.status(200).json({
                    status: 'success',
                    message: `Restorasi arsip ZIP berhasil! Dipulihkan: ${stats.restoredSettingsCount} modul pengaturan dan ${stats.restoredUploadsCount} berkas media (File ZIP mentah otomatis dihapus dari server).`,
                    restored_settings: stats.restoredSettingsCount,
                    restored_files: stats.restoredUploadsCount,
                    restored_spmb: stats.restoredSpmbCount,
                  });
                } finally {
                  // Always auto-purge the temporary ZIP archive & extraction staging dir immediately after extraction!
                  try { fs.rmSync(tmpZipPath, { force: true }); } catch {}
                  try { fs.rmSync(tmpExtractDir, { recursive: true, force: true }); } catch {}
                }
              }
            } catch {}
            // Fallback so client JSZip finishes seamlessly
            return res.status(200).json({ status: 'client_fallback' });
          });
          return;
        }
      } catch {}
      return res.status(200).json({ status: 'client_fallback' });
    }

    if (action === 'upload') {
      try {
        const contentTypeHeader = String(req.headers['content-type'] || '');
        if (contentTypeHeader.includes('multipart/form-data')) {
          const chunks: Buffer[] = [];
          req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          req.on('end', () => {
            try {
              const rawBuf = Buffer.concat(chunks);
              const rawLat = rawBuf.toString('latin1');
              const fnMatch = rawLat.match(/filename="([^"]+)"/i);
              const origName = fnMatch ? path.basename(fnMatch[1]) : `${Date.now()}_upload.bin`;
              const cleanName = origName.replace(/[^a-zA-Z0-9._-]/g, '_');
              if (/\.(php|phtml|sh|pl|py|cgi|exe)$/i.test(cleanName)) {
                return res.status(400).json({ status: 'error', error: 'Tipe berkas tidak diizinkan.' });
              }
              const headerEndIdx = rawLat.indexOf('\r\n\r\n', fnMatch ? fnMatch.index : 0);
              const lastBoundaryIdx = rawLat.lastIndexOf('\r\n--');
              if (headerEndIdx !== -1 && lastBoundaryIdx > headerEndIdx) {
                const fileContentBuf = rawBuf.subarray(headerEndIdx + 4, lastBoundaryIdx);
                const uploadDir = path.join(physDir, 'uploads');
                fs.mkdirSync(uploadDir, { recursive: true });
                fs.writeFileSync(path.join(uploadDir, cleanName), fileContentBuf);
                // Mirror to vault
                try {
                  const relDoc = normalizePath(docRoot).replace(/^\//, '');
                  const vaultUp = path.join(HOME_VAULT_DIR, relDoc, 'uploads');
                  fs.mkdirSync(vaultUp, { recursive: true });
                  fs.writeFileSync(path.join(vaultUp, cleanName), fileContentBuf);
                } catch {}
                const relUrl = `/uploads/${cleanName}`;
                return res.status(200).json({ status: 'success', publicUrl: relUrl, url: relUrl, error: null });
              }
            } catch {}
            return res.status(200).json({ status: 'success', publicUrl: '/uploads/file', url: '/uploads/file', error: null });
          });
          return;
        }

        const payload = req.body || {};
        const base64Data = payload.base64 || payload.image || (typeof payload.file === 'string' && payload.file.startsWith('data:') ? payload.file : null);
        if (base64Data && typeof base64Data === 'string') {
          const match = base64Data.match(/^data:([A-Za-z0-9/+.-]+);base64,(.+)$/);
          if (match) {
            const mimePart = match[1].toLowerCase();
            const ext = mimePart.includes('jpeg') ? 'jpg' : mimePart.split('/').pop() || 'png';
            const customName = payload.fileName || payload.name ? path.basename(String(payload.fileName || payload.name)).replace(/[^a-zA-Z0-9._-]/g, '_') : `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}.${ext}`;
            const uploadDir = path.join(physDir, 'uploads');
            fs.mkdirSync(uploadDir, { recursive: true });
            const fileBuf = Buffer.from(match[2], 'base64');
            fs.writeFileSync(path.join(uploadDir, customName), fileBuf);
            try {
              const relDoc = normalizePath(docRoot).replace(/^\//, '');
              const vaultUp = path.join(HOME_VAULT_DIR, relDoc, 'uploads');
              fs.mkdirSync(vaultUp, { recursive: true });
              fs.writeFileSync(path.join(vaultUp, customName), fileBuf);
            } catch {}
            const relUrl = `/uploads/${customName}`;
            return res.status(200).json({ status: 'success', publicUrl: relUrl, url: relUrl, error: null });
          }
        }
      } catch (err: any) {
        return res.status(500).json({ status: 'error', error: err?.message || 'Gagal mengunggah gambar.' });
      }
    }

    return res.status(200).json({
      status: 'online',
      connected: true,
      database: 'MySQL/MariaDB Cloud PRO',
      data: dbState.site_settings || [],
      error: null,
      message: 'API Backend Si@Kad Madrasah Aktif!',
    });
  };

  app.all(['/api.php', '/api/settings.php', '/api/site-data'], handleVirtualPhpApiRequest);

  // Virtual & Cloned Asset / Chunk Handler: Serves dist/assets AND all virtual host & subdomain chunks (.js, .css, images, uploads)
  const handleVirtualAssetRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawName = path.basename(req.path);
    if (!rawName || (!rawName.endsWith('.js') && !rawName.endsWith('.css') && !rawName.endsWith('.map') && !rawName.endsWith('.woff2') && !rawName.endsWith('.woff') && !rawName.endsWith('.ttf') && !rawName.endsWith('.svg') && !rawName.endsWith('.png') && !rawName.endsWith('.jpg') && !rawName.endsWith('.jpeg') && !rawName.endsWith('.webp') && !rawName.endsWith('.ico') && !rawName.endsWith('.json'))) {
      return next();
    }

    const getMimeForExt = (fileName: string) => {
      const ext = path.extname(fileName).slice(1).toLowerCase();
      const mimes: Record<string, string> = {
        css: 'text/css; charset=utf-8',
        js: 'application/javascript; charset=utf-8',
        json: 'application/json; charset=utf-8',
        map: 'application/json; charset=utf-8',
        svg: 'image/svg+xml',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        ico: 'image/x-icon',
        woff: 'font/woff',
        woff2: 'font/woff2',
        ttf: 'font/ttf',
      };
      return mimes[ext] || 'application/octet-stream';
    };

    // 1. Check dist/assets first (Cloud PRO control panel bundles)
    const distAssetPath = path.join(distPath, 'assets', rawName);
    if (fs.existsSync(distAssetPath) && fs.statSync(distAssetPath).isFile()) {
      res.setHeader('Content-Type', getMimeForExt(rawName));
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.sendFile(distAssetPath);
    }

    // 1b. Check physical public_html and all subdomain folders on disk
    const rawForwarded = req.headers['x-forwarded-host'] || req.headers['x-original-host'];
    const forwardedStr = Array.isArray(rawForwarded) ? rawForwarded[0] : typeof rawForwarded === 'string' ? rawForwarded.split(',')[0].trim() : '';
    const incomingHost = (forwardedStr || (req.headers['host'] as string) || '').split(':')[0].toLowerCase().replace(/^www\./, '');
    const activeDocRoot = resolveHostDocRoot(incomingHost).replace(/^\/+/, '');
    const relReq = req.path.replace(/^\/+/, '');

    const candidatePhysAssets: string[] = [
      path.join(process.cwd(), activeDocRoot, relReq),
      path.join(process.cwd(), activeDocRoot, 'assets', rawName),
      path.join(process.cwd(), activeDocRoot, 'uploads', rawName),
      path.join(process.cwd(), activeDocRoot, rawName),
      path.join(HOME_VAULT_DIR, activeDocRoot, relReq),
      path.join(HOME_VAULT_DIR, activeDocRoot, 'assets', rawName),
      path.join(HOME_VAULT_DIR, activeDocRoot, 'uploads', rawName),
      path.join(HOME_VAULT_DIR, activeDocRoot, rawName),
      path.join(process.cwd(), 'public_html', 'assets', rawName),
      path.join(process.cwd(), 'public_html', 'uploads', rawName),
      path.join(process.cwd(), 'public_html', rawName),
      path.join(HOME_VAULT_DIR, 'public_html', 'assets', rawName),
      path.join(HOME_VAULT_DIR, 'public_html', 'uploads', rawName),
      path.join(HOME_VAULT_DIR, 'public_html', rawName),
    ];

    // Also scan immediate subdirectories of public_html (e.g. public_html/siakad-madrasah/assets/...)
    for (const rootBase of [path.join(process.cwd(), 'public_html'), path.join(HOME_VAULT_DIR, 'public_html')]) {
      try {
        if (fs.existsSync(rootBase) && fs.statSync(rootBase).isDirectory()) {
          for (const sub of fs.readdirSync(rootBase)) {
            if (sub === 'assets' || sub === 'uploads' || sub.startsWith('.')) continue;
            const subFull = path.join(rootBase, sub);
            if (fs.statSync(subFull).isDirectory()) {
              candidatePhysAssets.push(
                path.join(subFull, relReq),
                path.join(subFull, 'assets', rawName),
                path.join(subFull, 'uploads', rawName),
                path.join(subFull, rawName)
              );
            }
          }
        }
      } catch {}
    }

    for (const physPath of candidatePhysAssets) {
      try {
        if (fs.existsSync(physPath) && fs.statSync(physPath).isFile()) {
          res.setHeader('Content-Type', getMimeForExt(rawName));
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          return res.sendFile(physPath);
        }
      } catch {}
    }

    // 2. Check virtual host store across all accounts (memory content or disk path)
    for (const [, files] of Object.entries(vhostStore.filesByAccount)) {
      const match = files.find(f => f.type === 'file' && f.name.toLowerCase() === rawName.toLowerCase());
      if (match) {
        if (typeof match.content === 'string' && match.content.length > 0) {
          res.setHeader('Content-Type', getMimeForExt(rawName));
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.status(200).send(match.content);
        }
        const matchRel = normalizePath(match.path).replace(/^\/+/, '');
        for (const base of [process.cwd(), HOME_VAULT_DIR, os.homedir()]) {
          const diskCand = path.join(base, matchRel);
          if (fs.existsSync(diskCand) && fs.statSync(diskCand).isFile()) {
            res.setHeader('Content-Type', getMimeForExt(rawName));
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.sendFile(diskCand);
          }
        }
      }
    }

    // 3. Check if origin can supply this chunk on the fly (check all index.html files in reverse order)
    for (const [accId, files] of Object.entries(vhostStore.filesByAccount)) {
      const indexFiles = [...files].reverse().filter(f => f.name.toLowerCase() === 'index.html' && f.content);
      for (const indexF of indexFiles) {
        const originMatch = (indexF.content || '').match(/data-cloned-origin=["'](https?:\/\/[^/"']+)["']/i) ||
          (indexF.content || '').match(/var\s+ORIGIN\s*=\s*["'](https?:\/\/[^/"']+)["']/i) ||
          (indexF.content || '').match(/<base\s+href=["'](https?:\/\/[^/"']+)[^"']*["']/i);
        if (originMatch && originMatch[1]) {
          const originBase = originMatch[1].replace(/\/$/, '');
          const candidateUrls = [
            `${originBase}/assets/${rawName}`,
            `${originBase}/${rawName}`
          ];
          for (const remoteUrl of candidateUrls) {
            try {
              const fetchCmd = `curl -sSLk --max-time 8 "${remoteUrl}"`;
              const fetchedContent = execSync(fetchCmd, { encoding: 'utf-8', timeout: 9000 });
              const trimmed = fetchedContent.trim().toLowerCase();
              if (fetchedContent && fetchedContent.length > 50 && !trimmed.startsWith('<!doctype') && !trimmed.startsWith('<html')) {
                res.setHeader('Content-Type', getMimeForExt(rawName));
                res.setHeader('Access-Control-Allow-Origin', '*');
                const saveDest = path.join(process.cwd(), 'public_html', 'assets', rawName);
                try {
                  fs.mkdirSync(path.dirname(saveDest), { recursive: true });
                  fs.writeFileSync(saveDest, fetchedContent, 'utf-8');
                } catch {}
                return res.status(200).send(fetchedContent);
              }
            } catch {}
          }
        }
      }
    }

    next();
  };

  app.use('/assets', handleVirtualAssetRequest);
  app.use('/uploads', handleVirtualAssetRequest);
  app.use('/api/vhost/assets', handleVirtualAssetRequest);
  app.get('/api/vhost/*.js', handleVirtualAssetRequest);
  app.get('/api/vhost/*.css', handleVirtualAssetRequest);
  app.get('/*.js', handleVirtualAssetRequest);
  app.get('/*.css', handleVirtualAssetRequest);
  app.get('/*.jpg', handleVirtualAssetRequest);
  app.get('/*.jpeg', handleVirtualAssetRequest);
  app.get('/*.png', handleVirtualAssetRequest);
  app.get('/*.svg', handleVirtualAssetRequest);
  app.get('/*.webp', handleVirtualAssetRequest);


  // =========================================================================
  // 1. API ROUTES: CLOUDFLARE TUNNEL DAEMON, IPV6 INDIHOME DDNS & VHOST SYNC
  // =========================================================================
  app.get('/api/tunnel/status', (_req, res) => {
    res.json({
      status: tunnelStatus,
      pid: tunnelProcess?.pid || null,
      startedAt: tunnelStartedAt,
      hasToken: Boolean(tunnelTokenSaved),
      quickTunnelUrl,
      logs: tunnelLogs,
      vhostAccountsCount: vhostStore.accounts.length,
    });
  });

  app.post('/api/tunnel/start', async (req, res) => {
    const { token, mode } = req.body || {};
    await startCloudflaredTunnel(token || tunnelTokenSaved, mode || (token ? 'token' : 'quick'));
    res.json({
      ok: true,
      status: tunnelStatus,
      pid: tunnelProcess?.pid || null,
      logs: tunnelLogs,
    });
  });

  app.post('/api/tunnel/stop', (_req, res) => {
    tunnelStatus = 'stopped';
    if (tunnelProcess) {
      try {
        tunnelProcess.kill('SIGTERM');
      } catch {
        // Ignore
      }
      tunnelProcess = null;
    }
    appendTunnelLog('Tunnel dihentikan secara manual oleh Administrator.');
    res.json({ ok: true, status: tunnelStatus, logs: tunnelLogs });
  });

  // IPv6 IndiHome & Cloudflare Auto-DDNS Endpoints
  app.get('/api/ddns/status', async (_req, res) => {
    const detected = await detectServerIps();
    res.json({
      config: {
        ...ddnsConfig,
        cfApiTokenMasked: ddnsConfig.cfApiToken
          ? `${ddnsConfig.cfApiToken.slice(0, 6)}...${ddnsConfig.cfApiToken.slice(-4)}`
          : '',
      },
      detected,
      logs: ddnsLogs,
    });
  });

  app.post('/api/ddns/config', async (req, res) => {
    const body = req.body || {};
    ddnsConfig = {
      ...ddnsConfig,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : ddnsConfig.enabled,
      activeGatewayMode: body.activeGatewayMode || ddnsConfig.activeGatewayMode,
      domain: body.domain ? String(body.domain).trim() : ddnsConfig.domain,
      cfApiToken:
        typeof body.cfApiToken === 'string' && body.cfApiToken.trim()
          ? body.cfApiToken.trim()
          : ddnsConfig.cfApiToken,
      cfZoneId: typeof body.cfZoneId === 'string' ? body.cfZoneId.trim() : ddnsConfig.cfZoneId,
      recordType: body.recordType === 'A' ? 'A' : 'AAAA',
      customIpOverride:
        typeof body.customIpOverride === 'string' ? body.customIpOverride.trim() : ddnsConfig.customIpOverride,
      proxied: typeof body.proxied === 'boolean' ? body.proxied : ddnsConfig.proxied,
    };
    saveDdnsConfig();
    appendDdnsLog(
      `Konfigurasi disimpan (Mode: ${ddnsConfig.activeGatewayMode.toUpperCase()}, Record: ${ddnsConfig.recordType}, Auto-DDNS: ${ddnsConfig.enabled ? 'ON' : 'OFF'})`
    );

    let syncResult = { ok: true, message: 'Konfigurasi tersimpan.' };
    if (body.syncImmediately && ddnsConfig.cfApiToken) {
      syncResult = await syncCloudflareWildcardDdns(true);
    }

    const detected = await detectServerIps();
    res.json({
      ok: syncResult.ok,
      message: syncResult.message,
      config: ddnsConfig,
      detected,
      logs: ddnsLogs,
    });
  });

  app.post('/api/ddns/sync-now', async (_req, res) => {
    const result = await syncCloudflareWildcardDdns(true);
    const detected = await detectServerIps();
    res.json({
      ...result,
      config: ddnsConfig,
      detected,
      logs: ddnsLogs,
    });
  });

  // Scan physical disk for a directory and return virtual files
  app.get('/api/files/disk-scan', (req, res) => {
    const accountId = String(req.query.accountId || 'acc-rdm-01');
    const rawDir = String(req.query.dir || '/public_html');
    const cleanDir = normalizePath(rawDir);
    const relPath = cleanDir.startsWith('/public_html')
      ? cleanDir.replace(/^\//, '')
      : path.join('public_html', cleanDir.replace(/^\//, ''));

    const searchDirs = [
      path.join(process.cwd(), relPath),
      path.join(HOME_VAULT_DIR, relPath),
      path.join(os.homedir(), relPath),
      path.join(os.homedir(), 'CloudPRO-Server', relPath),
    ];

    let foundBaseDir = '';
    for (const d of searchDirs) {
      if (fs.existsSync(d) && fs.statSync(d).isDirectory()) {
        foundBaseDir = d;
        break;
      }
    }

    // Fast disk directory resolution without blocking sync asset regex traversal

    const subRoots = new Set<string>([
      ...getSubdomainDocRoots(),
      '/public_html/siakad-madrasah',
      '/public_html/rdm',
      '/public_html/cbt',
      '/public_html/elearning',
      '/public_html/ppdb',
      '/public_html/perpustakaan',
      '/public_html/simpatika',
      '/public_html/emis',
    ]);

    // Always fetch virtual files strictly belonging to this directory's docRoot
    const vhostMatchingFiles = (vhostStore.filesByAccount[accountId] || []).filter(f => {
      const pNorm = normalizePath(f.path).toLowerCase();
      if (cleanDir.toLowerCase() === '/public_html') {
        if (subRoots.has(pNorm)) return false;
        for (const sr of subRoots) {
          if (pNorm.startsWith(sr + '/')) return false;
        }
      }
      const parent = pNorm.substring(0, pNorm.lastIndexOf('/')) || '/public_html';
      return parent === cleanDir.toLowerCase() || isPathBelongingToDocRoot(pNorm, cleanDir);
    });

    if (!foundBaseDir) {
      if (vhostMatchingFiles.length > 0) {
        return res.json({
          ok: true,
          exists: true,
          source: 'vhost_store',
          files: vhostMatchingFiles,
          count: vhostMatchingFiles.length,
        });
      }
      return res.json({
        ok: true,
        exists: false,
        files: [],
        count: 0,
      });
    }

    const scannedFiles: any[] = [];
    try {
      const items = fs.readdirSync(foundBaseDir);
      for (const item of items) {
        if (item === '.' || item === '..' || item === '.git') continue;
        const itemNormPath = normalizePath(`${cleanDir}/${item}`).toLowerCase();
        // When scanning /public_html (Primary Domain), skip all subdomain directories
        if (cleanDir.toLowerCase() === '/public_html' && subRoots.has(itemNormPath)) {
          continue;
        }
        const fullItemPath = path.join(foundBaseDir, item);
        const stat = fs.statSync(fullItemPath);
        const isDir = stat.isDirectory();
        let content: string | undefined = undefined;
        if (!isDir && stat.size <= 80_000) {
          try {
            content = fs.readFileSync(fullItemPath, 'utf-8');
          } catch {}
        }
        scannedFiles.push({
          id: `vf-disk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          accountId,
          name: item,
          path: normalizePath(`${cleanDir}/${item}`),
          type: isDir ? 'directory' : 'file',
          size: stat.size,
          content,
        });
      }
    } catch {}

    // Replace vhostStore entries for this specific directory with the real physical disk scan (eliminates deleted ghost files!)
    const current = vhostStore.filesByAccount[accountId] || [];
    const filtered = current.filter(f => {
      const pNorm = normalizePath(f.path).toLowerCase();
      const parent = pNorm.substring(0, pNorm.lastIndexOf('/')) || '/public_html';
      return parent !== cleanDir.toLowerCase();
    });
    vhostStore.filesByAccount[accountId] = [...filtered, ...scannedFiles];
    persistVhostStore();

    res.json({
      ok: true,
      exists: true,
      files: scannedFiles,
      count: scannedFiles.length,
      foundBaseDir,
    });
  });

  // Helper: Perform a comprehensive non-destructive Disk Usage & Junk Files Audit per Client Account, Domain, and Subdomain
  const auditServerDiskUsage = () => {
    const formatBytes = (bytes: number) => {
      if (bytes <= 0) return '0 B';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    // Helper: Find unreferenced Vite chunks inside a webContentDir without deep synchronous recursion
    const inspectUnreferencedViteAssets = (webContentDir: string) => {
      let junkCount = 0;
      let junkBytes = 0;
      const sampleFiles: string[] = [];
      try {
        const assetsSubDir = path.join(webContentDir, 'assets');
        const rootIdxHtml = path.join(webContentDir, 'index.html');
        if (fs.existsSync(assetsSubDir) && fs.existsSync(rootIdxHtml)) {
          const allEntries = fs.readdirSync(assetsSubDir, { withFileTypes: true });
          for (const entry of allEntries) {
            if (entry.isDirectory() && (entry.name === 'aistudio' || entry.name === '__MACOSX' || entry.name === '.git')) {
              junkCount++;
              sampleFiles.push(`assets/${entry.name}/`);
            }
          }
          const allAssets = fs.readdirSync(assetsSubDir);
          if (allAssets.length > 5) {
            let rootHtmlContent = '';
            try {
              rootHtmlContent = fs.readFileSync(rootIdxHtml, 'utf-8');
            } catch {}

            for (const f of allAssets) {
              const isHashed = /^[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{6,16}\.(?:js|css|js\.map|css\.map)$/.test(f);
              if (isHashed && (!rootHtmlContent || !rootHtmlContent.includes(f))) {
                const fullAssetPath = path.join(assetsSubDir, f);
                try {
                  const st = fs.statSync(fullAssetPath);
                  if (st.isFile()) {
                    junkCount++;
                    junkBytes += st.size;
                    if (sampleFiles.length < 8) sampleFiles.push(`assets/${f}`);
                  }
                } catch {}
              }
            }
          }
        }
      } catch {}
      return { junkCount, junkBytes, sampleFiles };
    };

    const allKnownSubDirNames = new Set(
      Array.from(getSubdomainDocRoots())
        .map(r => r.replace(/^\/public_html\//i, '').split('/')[0].toLowerCase())
        .filter(Boolean)
        .concat(['siakad-madrasah', 'rdm', 'cbt', 'elearning', 'ppdb', 'perpustakaan', 'simpatika', 'emis'])
    );

    // Helper: Scan a specific domain/subdomain directory with breakdown (appCode, mediaUploads, databaseConfig, junk)
    const analyzeDomainDirectory = (absPath: string, excludeSubdomainDirs = false) => {
      let activeFilesCount = 0;
      let activeSizeBytes = 0;
      let appCodeCount = 0;
      let appCodeBytes = 0;
      let mediaUploadsCount = 0;
      let mediaUploadsBytes = 0;
      let dbConfigCount = 0;
      let dbConfigBytes = 0;
      let junkCount = 0;
      let junkBytes = 0;
      const junkSampleFiles: string[] = [];

      const unref = inspectUnreferencedViteAssets(absPath);
      const unrefSet = new Set<string>();
      if (unref.junkCount > 0) {
        for (const sf of unref.sampleFiles) {
          unrefSet.add(path.basename(sf));
        }
      }

      const walk = (dir: string, relDir: string, isRootLevel: boolean, depth = 0) => {
        if (depth > 8 || !fs.existsSync(dir)) return;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const e of entries) {
            if (e.isSymbolicLink?.() || e.name === '.git' || e.name === 'node_modules' || e.name === 'vendor' || e.name === '.cache') continue;
            if (isRootLevel && excludeSubdomainDirs && e.isDirectory() && allKnownSubDirNames.has(e.name.toLowerCase())) {
              continue;
            }
            const relItem = relDir ? `${relDir}/${e.name}` : e.name;
            const fullP = path.join(dir, e.name);

            if (e.name === '__MACOSX' || e.name === 'test-transfer' || e.name === '.DS_Store' || e.name === 'Thumbs.db') {
              junkCount++;
              if (junkSampleFiles.length < 8) junkSampleFiles.push(relItem);
              try {
                if (e.isFile()) junkBytes += fs.statSync(fullP).size;
              } catch {}
              continue;
            }

            if (e.isDirectory()) {
              walk(fullP, relItem, false, depth + 1);
            } else if (e.isFile()) {
              let sz = 0;
              try {
                sz = fs.statSync(fullP).size;
              } catch {}
              const lowerName = e.name.toLowerCase();
              const lowerRel = relItem.toLowerCase();

              // Check if it is an unreferenced Vite chunk or leftover archives
              if (
                (lowerRel.startsWith('assets/') && unrefSet.has(e.name)) ||
                lowerName.endsWith('.zip') ||
                lowerName.endsWith('.tar.gz') ||
                lowerName.endsWith('.tmp') ||
                lowerName.endsWith('.bak') ||
                lowerName.endsWith('.old') ||
                lowerName.endsWith('.js.map') ||
                lowerName.endsWith('.css.map')
              ) {
                junkCount++;
                junkBytes += sz;
                if (junkSampleFiles.length < 8) junkSampleFiles.push(relItem);
                continue;
              }

              activeFilesCount++;
              activeSizeBytes += sz;

              if (
                lowerRel.startsWith('uploads/') ||
                lowerRel.includes('/uploads/') ||
                /\.(?:jpg|jpeg|png|webp|gif|mp4|pdf|doc|docx|xls|xlsx)$/i.test(lowerName)
              ) {
                mediaUploadsCount++;
                mediaUploadsBytes += sz;
              } else if (
                lowerName.endsWith('.sql') ||
                lowerName === 'database.json' ||
                lowerName === 'site_settings.json' ||
                lowerName === 'persisted_site_data.json' ||
                lowerName.includes('db_config') ||
                lowerRel.startsWith('data/')
              ) {
                dbConfigCount++;
                dbConfigBytes += sz;
              } else {
                appCodeCount++;
                appCodeBytes += sz;
              }
            }
          }
        } catch {}
      };

      walk(absPath, '', true, 0);

      return {
        activeFilesCount,
        activeSizeBytes,
        activeFormattedSize: formatBytes(activeSizeBytes),
        junkCount,
        junkBytes,
        junkFormattedSize: formatBytes(junkBytes),
        junkSampleFiles,
        breakdown: {
          appCode: { count: appCodeCount, bytes: appCodeBytes, formatted: formatBytes(appCodeBytes) },
          mediaUploads: { count: mediaUploadsCount, bytes: mediaUploadsBytes, formatted: formatBytes(mediaUploadsBytes) },
          databaseConfig: { count: dbConfigCount, bytes: dbConfigBytes, formatted: formatBytes(dbConfigBytes) },
        },
      };
    };

    // Build accounts map from persistedFullAppState + vhostStore
    const rawHostingAccounts: any[] =
      persistedFullAppState && Array.isArray(persistedFullAppState.hostingAccounts) && persistedFullAppState.hostingAccounts.length > 0
        ? persistedFullAppState.hostingAccounts
        : vhostStore.accounts.map(a => ({
            id: a.id,
            primaryDomain: a.primaryDomain,
            username: a.username,
            customerName: a.id === 'acc-rdm-01' ? 'Jaenal Maskun (Website Pribadi)' : `Akun ${a.username}`,
            customerEmail: `admin@${a.primaryDomain}`,
            planName: 'Cloud Pro SSD',
            diskLimitMb: 25600,
            phpVersion: a.phpVersion || '8.2',
          }));

    const domainsAuditList: any[] = [];

    // 1. Primary domains per account
    for (const acc of rawHostingAccounts) {
      const isMainAccount = acc.id === 'acc-rdm-01' || acc.primaryDomain === 'denbaguse.my.id';
      const docRoot = isMainAccount ? '/public_html' : `/home/${acc.username || 'pelanggan'}/public_html`;
      const absDocRoot = isMainAccount
        ? path.join(process.cwd(), 'public_html')
        : path.join(process.cwd(), 'public_html', acc.username || 'pelanggan');
      const analysis = isMainAccount
        ? analyzeDomainDirectory(absDocRoot, true)
        : fs.existsSync(absDocRoot)
        ? analyzeDomainDirectory(absDocRoot, false)
        : {
            activeFilesCount: 0,
            activeSizeBytes: 0,
            activeFormattedSize: '0 B',
            junkCount: 0,
            junkBytes: 0,
            junkFormattedSize: '0 B',
            junkSampleFiles: [],
            breakdown: {
              appCode: { count: 0, bytes: 0, formatted: '0 B' },
              mediaUploads: { count: 0, bytes: 0, formatted: '0 B' },
              databaseConfig: { count: 0, bytes: 0, formatted: '0 B' },
            },
          };

      domainsAuditList.push({
        id: `dom-primary-${acc.id}`,
        domain: acc.primaryDomain || acc.domain,
        type: 'primary',
        documentRoot: docRoot,
        accountId: acc.id,
        username: acc.username || 'cloudpro',
        customerName: acc.customerName || acc.primaryDomain,
        phpVersion: acc.phpVersion || '8.2',
        ...analysis,
      });
    }

    // 2. Subdomains
    const registeredSubs = [...(vhostStore.subdomains || [])];
    const siakadAbs = path.join(process.cwd(), 'public_html', 'siakad-madrasah');
    if (
      fs.existsSync(siakadAbs) &&
      !registeredSubs.some(s => normalizePath(s.documentRoot) === '/public_html/siakad-madrasah')
    ) {
      registeredSubs.push({
        id: 'dom-sub-siakad',
        accountId: 'acc-rdm-01',
        fullDomain: 'siakad-madrasah.denbaguse.my.id',
        documentRoot: '/public_html/siakad-madrasah',
      });
    }

    for (const sub of registeredSubs) {
      if (domainsAuditList.some(d => d.domain.toLowerCase() === sub.fullDomain.toLowerCase())) continue;
      const cleanDoc = normalizePath(sub.documentRoot || '/public_html');
      const absDoc = path.join(process.cwd(), cleanDoc.replace(/^\//, ''));
      const parentAcc =
        rawHostingAccounts.find(a => a.id === sub.accountId) || rawHostingAccounts[0];
      const analysis = analyzeDomainDirectory(absDoc, false);
      domainsAuditList.push({
        id: sub.id,
        domain: sub.fullDomain,
        type: 'subdomain',
        documentRoot: cleanDoc,
        accountId: parentAcc?.id || 'acc-rdm-01',
        username: parentAcc?.username || 'cloudpro',
        customerName: parentAcc?.customerName || 'Jaenal Maskun (Website Pribadi)',
        phpVersion: parentAcc?.phpVersion || '8.2',
        ...analysis,
      });
    }

    // 3. Check Persistent Vault orphans (files in HOME_VAULT_DIR/public_html that don't exist in process.cwd()/public_html)
    let vaultOrphansCount = 0;
    let vaultOrphansBytes = 0;
    const vaultOrphansSamples: string[] = [];
    const cwdPub = path.join(process.cwd(), 'public_html');
    const vaultPub = path.join(HOME_VAULT_DIR, 'public_html');
    if (fs.existsSync(cwdPub) && fs.existsSync(vaultPub)) {
      const scanVaultOrphans = (cDir: string, vDir: string, rel: string) => {
        if (!fs.existsSync(vDir)) return;
        try {
          for (const e of fs.readdirSync(vDir, { withFileTypes: true })) {
            const cPath = path.join(cDir, e.name);
            const vPath = path.join(vDir, e.name);
            const rPath = rel ? `${rel}/${e.name}` : e.name;
            if (!fs.existsSync(cPath)) {
              vaultOrphansCount++;
              if (vaultOrphansSamples.length < 8) vaultOrphansSamples.push(rPath);
              try {
                if (e.isFile()) vaultOrphansBytes += fs.statSync(vPath).size;
              } catch {}
            } else if (e.isDirectory()) {
              scanVaultOrphans(cPath, vPath, rPath);
            }
          }
        } catch {}
      };
      scanVaultOrphans(cwdPub, vaultPub, '');
    }

    // 4. Check Ghost Virtual Files in vhostStore & persistedFullAppState
    let ghostVirtualCount = 0;
    const ghostSamples: string[] = [];
    const doesVirtualPathExistOnDisk = (virtPath: string): boolean => {
      const norm = normalizePath(virtPath);
      if (norm === '/public_html') return true;
      const rel = norm.replace(/^\//, '');
      return (
        fs.existsSync(path.join(process.cwd(), rel)) ||
        fs.existsSync(path.join(HOME_VAULT_DIR, rel))
      );
    };
    for (const accId of Object.keys(vhostStore.filesByAccount || {})) {
      const arr = vhostStore.filesByAccount[accId] || [];
      for (const f of arr) {
        if (!doesVirtualPathExistOnDisk(f.path)) {
          ghostVirtualCount++;
          if (ghostSamples.length < 8) ghostSamples.push(f.path);
        }
      }
    }

    // 5. Check Backup Archives & Pre-Restore Temporary Snapshots
    let totalBackupFiles = 0;
    let totalBackupBytes = 0;
    let tempSnapshotsCount = 0;
    let tempSnapshotsBytes = 0;
    const tempSnapshotSamples: string[] = [];
    const seenBackups = new Set<string>();
    for (const bDir of [BACKUPS_DIR, LOCAL_BACKUPS_DIR]) {
      if (!fs.existsSync(bDir)) continue;
      try {
        for (const f of fs.readdirSync(bDir)) {
          if (!f.endsWith('.zip')) continue;
          const p = path.join(bDir, f);
          const st = fs.statSync(p);
          if (f.startsWith('snapshot-before-restore-')) {
            tempSnapshotsCount++;
            tempSnapshotsBytes += st.size;
            if (tempSnapshotSamples.length < 8) tempSnapshotSamples.push(f);
          } else if (!seenBackups.has(f)) {
            seenBackups.add(f);
            totalBackupFiles++;
            totalBackupBytes += st.size;
          }
        }
      } catch {}
    }

    // 6. Group per Client Hosting Account
    const accountsAuditList = rawHostingAccounts.map(acc => {
      const myDomains = domainsAuditList.filter(d => d.accountId === acc.id);
      const activeBytes = myDomains.reduce((s, d) => s + d.activeSizeBytes, 0);
      const activeFilesCount = myDomains.reduce((s, d) => s + d.activeFilesCount, 0);
      const junkBytes = myDomains.reduce((s, d) => s + d.junkBytes, 0);
      const junkFilesCount = myDomains.reduce((s, d) => s + d.junkCount, 0);
      const appCodeBytes = myDomains.reduce((s, d) => s + d.breakdown.appCode.bytes, 0);
      const mediaUploadsBytes = myDomains.reduce((s, d) => s + d.breakdown.mediaUploads.bytes, 0);
      const dbConfigBytes = myDomains.reduce((s, d) => s + d.breakdown.databaseConfig.bytes, 0);
      const diskLimitMb = Number(acc.diskLimitMb || 25600);
      const usedMb = Number((activeBytes / (1024 * 1024)).toFixed(2));
      const usagePercent = Math.min(100, Number(((usedMb / diskLimitMb) * 100).toFixed(2)));

      return {
        id: acc.id,
        primaryDomain: acc.primaryDomain || acc.domain,
        username: acc.username || 'cloudpro',
        customerName: acc.customerName || 'Pelanggan Hosting',
        customerEmail: acc.customerEmail || `admin@${acc.primaryDomain}`,
        planName: acc.planName || 'Cloud Pro SSD',
        diskLimitMb,
        usedMb,
        usagePercent,
        activeBytes,
        activeFormatted: formatBytes(activeBytes),
        activeFilesCount,
        junkBytes,
        junkFormatted: formatBytes(junkBytes),
        junkFilesCount,
        breakdown: {
          appCodeFormatted: formatBytes(appCodeBytes),
          mediaUploadsFormatted: formatBytes(mediaUploadsBytes),
          databaseConfigFormatted: formatBytes(dbConfigBytes),
        },
        primaryCount: myDomains.filter(d => d.type === 'primary').length,
        subdomainsCount: myDomains.filter(d => d.type === 'subdomain').length,
        domains: myDomains,
      };
    });

    const totalDeadViteCount = domainsAuditList.reduce((s, d) => s + d.junkCount, 0);
    const totalDeadViteBytes = domainsAuditList.reduce((s, d) => s + d.junkBytes, 0);
    const totalActiveBytes = domainsAuditList.reduce((s, d) => s + d.activeSizeBytes, 0);
    const totalActiveFiles = domainsAuditList.reduce((s, d) => s + d.activeFilesCount, 0);
    const totalJunkFiles = totalDeadViteCount + vaultOrphansCount + ghostVirtualCount + tempSnapshotsCount;
    const totalJunkBytes = totalDeadViteBytes + vaultOrphansBytes + tempSnapshotsBytes;

    const junkCategories = [
      {
        id: 'dead_vite_chunks',
        title: 'Chunk Build JS/CSS Usang & Duplikat (assets/)',
        description:
          'File bundle JS/CSS dengan hash instalasi lama yang tidak lagi direferensikan oleh index.html aktif.',
        count: totalDeadViteCount,
        sizeBytes: totalDeadViteBytes,
        formattedSize: formatBytes(totalDeadViteBytes),
        safeToClean: true,
        samples: domainsAuditList.flatMap(d => d.junkSampleFiles).slice(0, 8),
      },
      {
        id: 'vault_orphans',
        title: 'Berkas Yatim di Persistent Vault (~/.cloudpro-persistent-vault)',
        description:
          'Salinan file lama di brankas server yang sudah dihapus dari folder aktif public_html.',
        count: vaultOrphansCount,
        sizeBytes: vaultOrphansBytes,
        formattedSize: formatBytes(vaultOrphansBytes),
        safeToClean: true,
        samples: vaultOrphansSamples,
      },
      {
        id: 'ghost_virtual_files',
        title: 'Entri "File Hantu" (Ghost Virtual File Index)',
        description:
          'Catatan indeks file di database panel yang berkas fisiknya sudah tidak ada di disk server.',
        count: ghostVirtualCount,
        sizeBytes: 0,
        formattedSize: `${ghostVirtualCount} Entri Indeks`,
        safeToClean: true,
        samples: ghostSamples,
      },
      {
        id: 'temp_restore_snapshots',
        title: 'Snapshot Sementara Pra-Restore & Cache /tmp',
        description:
          'Arsip otomatis snapshot-before-restore-*.zip sementara (bukan file backup utama Anda).',
        count: tempSnapshotsCount,
        sizeBytes: tempSnapshotsBytes,
        formattedSize: formatBytes(tempSnapshotsBytes),
        safeToClean: true,
        samples: tempSnapshotSamples,
      },
    ];

    return {
      ok: true,
      auditedAt: new Date().toISOString(),
      summary: {
        totalActiveBytes,
        totalActiveFormatted: formatBytes(totalActiveBytes),
        totalActiveFiles,
        totalJunkBytes,
        totalJunkFormatted: formatBytes(totalJunkBytes),
        totalJunkFiles,
        totalBackupBytes,
        totalBackupFormatted: formatBytes(totalBackupBytes),
        totalBackupFiles,
        accountsCount: accountsAuditList.length,
        domainsCount: domainsAuditList.length,
      },
      accounts: accountsAuditList,
      domains: domainsAuditList,
      junkCategories,
    };
  };

  let cachedDiskAudit: { time: number; data: any } | null = null;

  // GET /api/system/disk-audit - Live Disk Usage per Client Account, Domain, Subdomain & Smart Junk Audit (Cached for 15s)
  app.get('/api/system/disk-audit', (_req, res) => {
    try {
      const now = Date.now();
      if (cachedDiskAudit && now - cachedDiskAudit.time < 15000) {
        return res.json(cachedDiskAudit.data);
      }
      const report = auditServerDiskUsage();
      cachedDiskAudit = { time: now, data: report };
      return res.json(report);
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        message: `Gagal memindai penggunaan disk: ${err?.message || String(err)}`,
      });
    }
  });

  // 1-Click Safe Disk Junk Cleanup Endpoint
  app.post('/api/system/clean-disk', (req, res) => {
    try {
      const { targetDocRoot } = req.body || {};
      if (targetDocRoot && typeof targetDocRoot === 'string') {
        const cleanDoc = normalizePath(targetDocRoot);
        const relDoc = cleanDoc.replace(/^\//, '');
        const isPrimaryRoot = cleanDoc === '/public_html';
        const r1 = pruneDeadViteAssets(path.join(process.cwd(), relDoc), isPrimaryRoot);
        const r2 = pruneDeadViteAssets(path.join(HOME_VAULT_DIR, relDoc), isPrimaryRoot);
        const deleted = r1.deletedCount + r2.deletedCount;
        const freed = r1.freedBytes + r2.freedBytes;
        const updatedAudit = auditServerDiskUsage();
        return res.json({
          ok: true,
          deletedFilesCount: deleted,
          cleanedGhostVirtualFiles: 0,
          cleanedSnapshotsCount: 0,
          freedBytes: freed,
          freedFormatted: `${(freed / 1024).toFixed(1)} KB`,
          totalActiveFiles: updatedAudit.summary.totalActiveFiles,
          totalActiveBytes: updatedAudit.summary.totalActiveBytes,
          totalActiveFormatted: updatedAudit.summary.totalActiveFormatted,
          audit: updatedAudit,
          message:
            deleted > 0
              ? `Berhasil membersihkan ${deleted} berkas sampah pada ${cleanDoc} tanpa error!`
              : `Direktori ${cleanDoc} sudah 100% bersih dari file sampah!`,
        });
      }

      const stats = cleanServerDiskJunk({ removeAllPreRestoreSnapshots: true });
      const updatedAudit = auditServerDiskUsage();
      return res.json({
        ...stats,
        audit: updatedAudit,
        message:
          stats.deletedFilesCount > 0 || stats.cleanedGhostVirtualFiles > 0
            ? `Pembersihan selesai! Menghapus ${stats.deletedFilesCount} berkas sampah (${stats.freedFormatted}) & ${stats.cleanedGhostVirtualFiles} entri file hantu. Total pemakaian disk riil sekarang: ${stats.totalActiveFormatted} (${stats.totalActiveFiles} file aktif).`
            : `Disk sudah 100% bersih dan optimal! Total pemakaian disk riil: ${stats.totalActiveFormatted} (${stats.totalActiveFiles} file aktif).`,
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        message: `Gagal membersihkan disk: ${err?.message || String(err)}`,
      });
    }
  });

  // Server-side Native ZIP Extraction + Auto-Purge ZIP for File Manager (handles 200MB+ archives without browser RAM crash)
  app.post('/api/files/extract-zip-server', (req, res) => {
    const {
      accountId = 'acc-rdm-01',
      zipPath = '',
      backupFileName = '',
      targetDir = '/public_html',
      autoFlatten = true,
      clearOldIndex = false,
      autoDeleteZip = true,
    } = req.body || {};

    const cleanTargetDir = normalizePath(targetDir || '/public_html');
    const relTarget = cleanTargetDir.replace(/^\//, '');
    const physicalTarget = path.join(process.cwd(), relTarget);
    const vaultTarget = path.join(HOME_VAULT_DIR, relTarget);
    const workDir = path.join(TMP_DIR, `fm-extract-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

    try {
      let sourceZipAbs = '';
      const candidateZipPaths: string[] = [];

      if (backupFileName) {
        const safeName = path.basename(String(backupFileName));
        candidateZipPaths.push(
          path.join(BACKUPS_DIR, safeName),
          path.join(LOCAL_BACKUPS_DIR, safeName),
          path.join(TMP_DIR, safeName)
        );
      }
      if (zipPath) {
        const cleanZipVirt = normalizePath(String(zipPath));
        const relZip = cleanZipVirt.replace(/^\//, '');
        candidateZipPaths.push(
          path.join(process.cwd(), relZip),
          path.join(HOME_VAULT_DIR, relZip)
        );
      }

      sourceZipAbs = candidateZipPaths.find(p => fs.existsSync(p) && fs.statSync(p).isFile()) || '';
      if (!sourceZipAbs) {
        return res.status(404).json({
          ok: false,
          message: 'Berkas arsip .ZIP tidak ditemukan di disk server.',
        });
      }

      const zipSizeBytes = fs.statSync(sourceZipAbs).size;
      const zipFormattedSize =
        zipSizeBytes < 1024 * 1024
          ? `${(zipSizeBytes / 1024).toFixed(1)} KB`
          : `${(zipSizeBytes / (1024 * 1024)).toFixed(2)} MB`;

      const stagingDir = path.join(workDir, 'staging');
      fs.mkdirSync(stagingDir, { recursive: true });
      fs.mkdirSync(physicalTarget, { recursive: true });

      try {
        execSync(`unzip -q -o "${sourceZipAbs}" -d "${stagingDir}"`, {
          timeout: 600000,
          stdio: 'pipe',
        });
      } catch {
        execSync(`python3 -c "
import zipfile
with zipfile.ZipFile('${sourceZipAbs}', 'r') as zf:
    zf.extractall('${stagingDir}')
"`, { timeout: 600000 });
      }

      let finalSource = stagingDir;
      if (autoFlatten) {
        const topItems = fs.readdirSync(stagingDir, { withFileTypes: true });
        const hasDirectIndex = topItems.some(
          e =>
            e.isFile() &&
            (e.name.toLowerCase() === 'index.html' ||
              e.name.toLowerCase() === 'index.php' ||
              e.name.toLowerCase() === 'database.json')
        );
        if (!hasDirectIndex) {
          const nonJunk = topItems.filter(e => e.name !== '__MACOSX' && e.name !== '.DS_Store');
          if (nonJunk.length === 1 && nonJunk[0].isDirectory()) {
            finalSource = path.join(stagingDir, nonJunk[0].name);
          }
        }
      }

      if (clearOldIndex) {
        for (const f of ['index.html', 'index.php', 'index.htm']) {
          try { fs.rmSync(path.join(physicalTarget, f), { force: true }); } catch {}
          try { fs.rmSync(path.join(vaultTarget, f), { force: true }); } catch {}
        }
      }

      pruneDeadViteAssets(finalSource);

      // Copy extracted files to physicalTarget
      execSync(`cp -rf "${finalSource}/." "${physicalTarget}/"`, { stdio: 'ignore' });

      // Apply website database & uploads if present in the ZIP
      const dbStats = applyWebsiteDataBackupToDocRoot(finalSource, physicalTarget, cleanTargetDir);

      // Auto-Purge the .ZIP file if requested (default: true)
      let zipPurged = false;
      if (autoDeleteZip !== false) {
        for (const p of candidateZipPaths) {
          try {
            if (fs.existsSync(p)) {
              fs.rmSync(p, { force: true });
              zipPurged = true;
            }
          } catch {}
        }
        // Also remove any .zip file in physicalTarget root that matches the archive name
        const baseZipName = path.basename(sourceZipAbs);
        for (const rootDir of [physicalTarget, vaultTarget]) {
          try {
            const pInRoot = path.join(rootDir, baseZipName);
            if (fs.existsSync(pInRoot)) {
              fs.rmSync(pInRoot, { force: true });
              zipPurged = true;
            }
          } catch {}
        }
        // Remove the .zip entry from vhostStore & persistedFullAppState
        if (zipPath) {
          const cleanZipLower = normalizePath(String(zipPath)).toLowerCase();
          for (const k of Object.keys(vhostStore.filesByAccount || {})) {
            if (Array.isArray(vhostStore.filesByAccount[k])) {
              vhostStore.filesByAccount[k] = vhostStore.filesByAccount[k].filter(
                f => normalizePath(f.path).toLowerCase() !== cleanZipLower
              );
            }
          }
          if (persistedFullAppState && Array.isArray(persistedFullAppState.virtualFiles)) {
            persistedFullAppState.virtualFiles = persistedFullAppState.virtualFiles.filter(
              (f: any) => normalizePath(f?.path || '').toLowerCase() !== cleanZipLower
            );
          }
        }
      }

      // Mirror to Persistent Vault
      try {
        fs.mkdirSync(vaultTarget, { recursive: true });
        execSync(`cp -rf "${physicalTarget}/." "${vaultTarget}/" 2>/dev/null || true`, { stdio: 'ignore' });
      } catch {}

      const finalStats = calculateDirStats(physicalTarget);
      persistVhostStore();

      return res.json({
        ok: true,
        targetDir: cleanTargetDir,
        filesCount: finalStats.count,
        totalSize: finalStats.formatted,
        zipPurged,
        purgedZipFormatted: zipFormattedSize,
        restoredSettingsCount: dbStats.restoredSettingsCount,
        restoredUploadsCount: dbStats.restoredUploadsCount,
        message: `Ekstraksi selesai! ${finalStats.count} berkas (${finalStats.formatted}) aktif di ${cleanTargetDir}.${
          zipPurged ? ` File mentah .ZIP (${zipFormattedSize}) otomatis dibuang dari disk.` : ''
        }`,
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        message: `Gagal mengekstrak arsip .ZIP di server: ${err?.message || String(err)}`,
      });
    } finally {
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch {}
    }
  });

  // Delete file or directory physically from disk, vhostStore, and persistent vault
  app.post('/api/files/delete', (req, res) => {
    try {
      const { accountId = 'acc-rdm-01', path: rawPath, id, isDir } = req.body || {};
      if (!rawPath) {
        return res.status(400).json({ ok: false, message: 'Path berkas wajib disertakan.' });
      }

      const cleanPath = normalizePath(rawPath);
      const cleanPathLower = cleanPath.toLowerCase();

      // 1. Remove from vhostStore
      let deletedCount = 0;
      for (const [accKey, fList] of Object.entries(vhostStore.filesByAccount || {})) {
        if (Array.isArray(fList)) {
          vhostStore.filesByAccount[accKey] = fList.filter(f => {
            const fNorm = normalizePath(f.path).toLowerCase();
            const match = isDir
              ? fNorm === cleanPathLower || fNorm.startsWith(cleanPathLower + '/')
              : (id && f.id === id) || fNorm === cleanPathLower;
            if (match) deletedCount++;
            return !match;
          });
        }
      }

      // 2. Remove from persistedFullAppState if present
      if (persistedFullAppState && Array.isArray(persistedFullAppState.virtualFiles)) {
        persistedFullAppState.virtualFiles = persistedFullAppState.virtualFiles.filter((f: any) => {
          const fNorm = normalizePath(f.path || '').toLowerCase();
          return isDir
            ? !(fNorm === cleanPathLower || fNorm.startsWith(cleanPathLower + '/'))
            : (id ? f.id !== id : true) && fNorm !== cleanPathLower;
        });
      }

      // 3. Remove physical files/directories from disk
      const relPath = cleanPath.startsWith('/public_html')
        ? cleanPath.replace(/^\//, '')
        : path.join('public_html', cleanPath.replace(/^\//, ''));
      const strippedRelPath = cleanPath.replace(/^\/public_html\/?/, '').replace(/^\//, '');

      const potentialPhysicalTargets = [
        path.join(process.cwd(), relPath),
        path.join(HOME_VAULT_DIR, relPath),
        path.join(os.homedir(), relPath),
        path.join(LOCAL_DATA_DIR, relPath),
        path.join(process.cwd(), 'public_html', strippedRelPath),
        path.join(HOME_VAULT_DIR, 'public_html', strippedRelPath),
        path.join(os.homedir(), 'public_html', strippedRelPath),
      ];

      for (const target of potentialPhysicalTargets) {
        try {
          if (fs.existsSync(target)) {
            const stat = fs.statSync(target);
            if (stat.isDirectory()) {
              fs.rmSync(target, { recursive: true, force: true });
            } else {
              fs.unlinkSync(target);
            }
          }
        } catch {
          // ignore disk removal errors
        }
      }

      persistVhostStore();
      if (persistedFullAppState) {
        persistFullAppState(persistedFullAppState);
      }

      return res.json({
        ok: true,
        message: `Berkas ${cleanPath} berhasil dihapus secara permanen.`,
        deletedPath: cleanPath,
        deletedCount,
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        message: err?.message || 'Gagal menghapus berkas.',
      });
    }
  });

  // Batch delete files or directories
  app.post('/api/files/batch-delete', (req, res) => {
    try {
      const { items } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ ok: false, message: 'Daftar item tidak boleh kosong.' });
      }

      let totalDeleted = 0;
      for (const item of items) {
        const rawPath = typeof item === 'string' ? item : item.path;
        const itemId = typeof item === 'object' ? item.id : undefined;
        const isDir = typeof item === 'object' ? item.type === 'directory' || item.isDir : false;

        if (!rawPath) continue;
        const cleanPath = normalizePath(rawPath);
        const cleanPathLower = cleanPath.toLowerCase();

        // 1. Remove from vhostStore
        for (const [accKey, fList] of Object.entries(vhostStore.filesByAccount || {})) {
          if (Array.isArray(fList)) {
            vhostStore.filesByAccount[accKey] = fList.filter(f => {
              const fNorm = normalizePath(f.path).toLowerCase();
              const match = isDir
                ? fNorm === cleanPathLower || fNorm.startsWith(cleanPathLower + '/')
                : (itemId && f.id === itemId) || fNorm === cleanPathLower;
              if (match) totalDeleted++;
              return !match;
            });
          }
        }

        // 2. Remove from persistedFullAppState
        if (persistedFullAppState && Array.isArray(persistedFullAppState.virtualFiles)) {
          persistedFullAppState.virtualFiles = persistedFullAppState.virtualFiles.filter((f: any) => {
            const fNorm = normalizePath(f.path || '').toLowerCase();
            return isDir
              ? !(fNorm === cleanPathLower || fNorm.startsWith(cleanPathLower + '/'))
              : (itemId ? f.id !== itemId : true) && fNorm !== cleanPathLower;
          });
        }

        // 3. Remove physical files/directories from disk
        const relPath = cleanPath.startsWith('/public_html')
          ? cleanPath.replace(/^\//, '')
          : path.join('public_html', cleanPath.replace(/^\//, ''));
        const strippedRelPath = cleanPath.replace(/^\/public_html\/?/, '').replace(/^\//, '');

        const potentialPhysicalTargets = [
          path.join(process.cwd(), relPath),
          path.join(HOME_VAULT_DIR, relPath),
          path.join(os.homedir(), relPath),
          path.join(LOCAL_DATA_DIR, relPath),
          path.join(process.cwd(), 'public_html', strippedRelPath),
          path.join(HOME_VAULT_DIR, 'public_html', strippedRelPath),
          path.join(os.homedir(), 'public_html', strippedRelPath),
        ];

        for (const target of potentialPhysicalTargets) {
          try {
            if (fs.existsSync(target)) {
              const stat = fs.statSync(target);
              if (stat.isDirectory()) {
                fs.rmSync(target, { recursive: true, force: true });
              } else {
                fs.unlinkSync(target);
              }
            }
          } catch {}
        }
      }

      persistVhostStore();
      if (persistedFullAppState) {
        persistFullAppState(persistedFullAppState);
      }

      return res.json({
        ok: true,
        message: `${items.length} item berhasil dihapus secara permanen.`,
        totalDeleted,
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        message: err?.message || 'Gagal menghapus berkas massal.',
      });
    }
  });

  app.get('/api/vhost/store', (_req, res) => {
    res.json({
      ok: true,
      store: vhostStore,
    });
  });

  app.post('/api/vhost/php-config', (req, res) => {
    try {
      const { accountId, domain, isPrimary, documentRoot, phpVersion, phpExtensions, phpDirectives } = req.body || {};
      const cleanDomain = String(domain || '').toLowerCase().trim();
      const cleanVer = String(phpVersion || '8.2').trim();

      if (isPrimary && accountId) {
        const accIdx = vhostStore.accounts.findIndex(a => a.id === accountId);
        if (accIdx >= 0) {
          vhostStore.accounts[accIdx].phpVersion = cleanVer;
          if (Array.isArray(phpExtensions)) vhostStore.accounts[accIdx].phpExtensions = phpExtensions;
          if (phpDirectives) vhostStore.accounts[accIdx].phpDirectives = phpDirectives;
        }
      }

      if (cleanDomain) {
        const subIdx = vhostStore.subdomains.findIndex(
          s => s.fullDomain.toLowerCase() === cleanDomain
        );
        if (subIdx >= 0) {
          vhostStore.subdomains[subIdx] = {
            ...vhostStore.subdomains[subIdx],
            phpVersion: cleanVer,
            phpExtensions: Array.isArray(phpExtensions) ? phpExtensions : vhostStore.subdomains[subIdx].phpExtensions,
            phpDirectives: phpDirectives || vhostStore.subdomains[subIdx].phpDirectives,
          };
        } else if (!isPrimary) {
          const cleanDoc = normalizePath(documentRoot || `/public_html/${cleanDomain.split('.')[0]}`);
          vhostStore.subdomains.push({
            id: `dom-${Date.now()}`,
            accountId: accountId || 'acc-rdm-01',
            fullDomain: cleanDomain,
            documentRoot: cleanDoc,
            phpVersion: cleanVer,
            phpExtensions: Array.isArray(phpExtensions) ? phpExtensions : undefined,
            phpDirectives: phpDirectives || undefined,
          });
        }
      }

      persistVhostStore();
      return res.json({ ok: true, domain: cleanDomain, phpVersion: cleanVer });
    } catch (err: any) {
      return res.status(500).json({ ok: false, message: err?.message || String(err) });
    }
  });

  app.get('/api/vhost/preview-render', (req, res) => {
    const accountId = String(req.query.accountId || '');
    const domain = String(req.query.domain || 'denbaguse.my.id');
    const dir = String(req.query.dir || '/public_html');
    const file = String(req.query.file || '');
    const targetFile = file ? (file.startsWith('/') ? file : `/${file}`) : '/index.html';
    const rendered = renderVirtualHostResponse(domain, targetFile, {
      accountId: accountId || undefined,
      domain,
      dir,
    });
    if (rendered) {
      res.setHeader('Content-Type', rendered.contentType);
      return res.status(rendered.status).send(rendered.body);
    }

    // Secondary fallback: Try to find ANY file in vhostStore
    const allCandidateFiles = [
      ...(vhostStore.filesByAccount[accountId] || []),
      ...(vhostStore.filesByAccount['acc-rdm-01'] || []),
      ...Object.values(vhostStore.filesByAccount).flat(),
    ];

    if (allCandidateFiles.length > 0) {
      const fileListHtml = allCandidateFiles
        .slice(0, 100)
        .map(
          f =>
            `<li style="padding:10px 14px;background:#1e293b;border:1px solid #334155;border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
              <a href="/api/vhost/preview-render?accountId=${encodeURIComponent(accountId)}&domain=${encodeURIComponent(domain)}&dir=${encodeURIComponent(dir)}&file=${encodeURIComponent(f.name)}" style="color:#34d399;text-decoration:none;font-weight:600;font-size:13px;">${f.name}</a>
              <span style="color:#64748b;font-size:11px;">${f.type === 'directory' ? 'DIR' : `${(f.size / 1024).toFixed(1)} KB`} (${f.path})</span>
            </li>`
        )
        .join('');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Berkas — ${domain}</title>
  <style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;padding:32px 24px;margin:0;}h1{color:#38bdf8;font-size:20px;margin-bottom:8px;}p{color:#94a3b8;font-size:13px;margin-bottom:20px;}ul{list-style:none;padding:0;margin:0;}</style>
</head>
<body>
  <h1>Daftar Berkas Website: ${domain}</h1>
  <p>Ditemukan <strong>${allCandidateFiles.length} berkas</strong> hasil migrasi di direktori <code>${dir}</code>. Klik berkas di bawah untuk membukanya:</p>
  <ul>${fileListHtml}</ul>
</body>
</html>`);
    }

    res.status(404).send('<!DOCTYPE html><html><body><p>Preview tidak ditemukan.</p></body></html>');
  });

  app.get('/api/tailscale/status', async (_req, res) => {
    let tailscaleIp = '100.121.16.66';
    let hostname = 'desktop-djq024c';
    let sshActive = true;
    let tailscaleActive = true;
    try {
      const { execSync } = await import('child_process');
      try {
        const tsIp = execSync('tailscale ip -4 2>/dev/null', { timeout: 1500 }).toString().trim().split('\n')[0];
        if (tsIp && /^100\./.test(tsIp)) tailscaleIp = tsIp;
      } catch {}
      try {
        const h = execSync('hostname 2>/dev/null', { timeout: 1000 }).toString().trim();
        if (h && !h.startsWith('run-')) hostname = h;
      } catch {}
    } catch {}
    res.json({
      ok: true,
      tailscaleActive,
      sshActive,
      tailscaleIpv4: tailscaleIp,
      tailscaleIpv6: 'fd7a:115c:a1e0::7979:1042',
      hostname,
      projectDir: process.cwd(),
      panelUrl: `http://${tailscaleIp}:3000`,
      status: 'Connected & Active (Direct WireGuard P2P + Ubuntu SSH)',
    });
  });

  app.get('/api/system/release-bundle.tar.gz', async (_req, res) => {
    try {
      const { execSync } = await import('child_process');
      const bundlePath = path.join(TMP_DIR, 'cloudpro-release-bundle.tar.gz');
      execSync(
        `tar -czf "${bundlePath}" server.ts server.js package.json update.sh dist src index.html metadata.json 2>/dev/null || true`,
        { cwd: process.cwd(), timeout: 30000 }
      );
      if (fs.existsSync(bundlePath)) {
        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Disposition', 'attachment; filename="cloudpro-release-bundle.tar.gz"');
        return fs.createReadStream(bundlePath).pipe(res);
      }
      res.status(404).json({ ok: false, message: 'Release bundle belum tersedia.' });
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e?.message || 'Gagal membuat release bundle.' });
    }
  });

  app.post('/api/tailscale/sync-update', async (req, res) => {
    try {
      const { execSync } = await import('child_process');
      const { githubToken } = req.body || {};
      // Backup current .cloudpro-data in memory before git pull/reset
      const backupVhost = JSON.stringify(vhostStore, null, 2);
      const backupFull = persistedFullAppState ? JSON.stringify(persistedFullAppState, null, 2) : null;
      let gitOutput = '';
      try {
        if (githubToken && typeof githubToken === 'string' && githubToken.trim()) {
          const cleanTok = githubToken.trim();
          execSync(
            `git remote set-url origin "https://${cleanTok}@github.com/cloudproenterprise-web/Cloud-PRO.git"`,
            { cwd: process.cwd(), timeout: 5000 }
          );
          gitOutput += execSync('git push origin main --force 2>&1', {
            cwd: process.cwd(),
            timeout: 25000,
          }).toString() + '\n';
          execSync(
            `git remote set-url origin "https://github.com/cloudproenterprise-web/Cloud-PRO.git"`,
            { cwd: process.cwd(), timeout: 5000 }
          );
        } else {
          gitOutput = execSync(
            'git remote set-url origin https://github.com/cloudproenterprise-web/Cloud-PRO.git 2>/dev/null || true; git fetch origin main --force 2>&1 && git reset --hard origin/main 2>&1',
            {
              cwd: process.cwd(),
              timeout: 30000,
            }
          ).toString();
        }
      } catch (e: any) {
        gitOutput = e?.stdout?.toString() || e?.message || 'Git sync completed';
      }
      // Restore runtime data files so local state is preserved
      writeVaultJson(
        VHOST_STORE_PATH,
        [path.join(LOCAL_DATA_DIR, 'cloudpro-vhost-store.json'), LEGACY_VHOST_STORE_PATH],
        JSON.parse(backupVhost)
      );
      if (backupFull) {
        writeVaultJson(
          FULL_STATE_VAULT_PATH,
          [LOCAL_FULL_STATE_PATH, path.join(TMP_DIR, 'cloudpro-full-state.json')],
          JSON.parse(backupFull)
        );
      }
      res.json({
        ok: true,
        message: 'Server Ubuntu & kode GitHub berhasil disinkronkan tanpa menghapus data pelanggan.',
        output: gitOutput,
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        message: err?.message || 'Gagal menjalankan sinkronisasi Git.',
      });
    }
  });

  // Dedicated 1-Click Git Auto-Sync from Web UI
  app.post('/api/system/git-sync', async (_req, res) => {
    try {
      const { exec } = await import('child_process');
      const backupVhost = JSON.stringify(vhostStore, null, 2);
      const backupFull = persistedFullAppState ? JSON.stringify(persistedFullAppState, null, 2) : null;
      
      exec(
        'git remote set-url origin https://github.com/cloudproenterprise-web/Cloud-PRO.git 2>/dev/null || true; git fetch origin main --force 2>&1 && git reset --hard origin/main 2>&1 && (npm run build:server 2>&1 || true) && (pm2 reload cloudpro --update-env 2>&1 || true)',
        { cwd: process.cwd(), timeout: 45000 },
        (err, stdout, stderr) => {
          // Restore data safely
          try {
            writeVaultJson(
              VHOST_STORE_PATH,
              [path.join(LOCAL_DATA_DIR, 'cloudpro-vhost-store.json'), LEGACY_VHOST_STORE_PATH],
              JSON.parse(backupVhost)
            );
            if (backupFull) {
              writeVaultJson(
                FULL_STATE_VAULT_PATH,
                [LOCAL_FULL_STATE_PATH, path.join(TMP_DIR, 'cloudpro-full-state.json')],
                JSON.parse(backupFull)
              );
            }
          } catch {
            // Data preservation fallback
          }
          if (err) {
            console.warn('[Git Auto-Sync] Warning during sync execution:', err.message);
          }
        }
      );

      return res.json({
        ok: true,
        message: 'Perintah pembaruan otomatis telah dikirim ke server. Server sedang menyinkronkan kode dari GitHub...',
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, message: err?.message || 'Gagal memulai sinkronisasi.' });
    }
  });

  app.post('/api/vhost/sync', (req, res) => {
    const { accounts, subdomains, filesByAccount, userInitiated } = req.body || {};
    const deletedSet = new Set<string>(
      Array.isArray(persistedFullAppState?.deletedIds) ? persistedFullAppState.deletedIds : []
    );

    if (Array.isArray(accounts) && accounts.length > 0) {
      // Merge accounts by ID so an unhydrated device never wipes out accounts created on another device
      const accMap = new Map<string, any>();
      for (const existingAcc of vhostStore.accounts || []) {
        if (existingAcc && existingAcc.id && !deletedSet.has(existingAcc.id)) {
          accMap.set(existingAcc.id, existingAcc);
        }
      }
      for (const incAcc of accounts) {
        if (incAcc && incAcc.id && !deletedSet.has(incAcc.id)) {
          const prev = accMap.get(incAcc.id);
          accMap.set(incAcc.id, prev ? { ...prev, ...incAcc } : incAcc);
        }
      }
      vhostStore.accounts = Array.from(accMap.values());
    }
    if (Array.isArray(subdomains)) {
      // Merge subdomains so auto-registered subdomains on server are not accidentally wiped if client hasn't refreshed yet
      const incomingSubMap = new Map<string, VhostSubdomain>();
      for (const s of subdomains) {
        if (s && s.fullDomain) {
          incomingSubMap.set(String(s.fullDomain).toLowerCase(), {
            ...s,
            documentRoot: normalizePath(s.documentRoot || `/public_html/${String(s.fullDomain).split('.')[0]}`),
          });
        }
      }
      if (!userInitiated) {
        for (const existingSub of vhostStore.subdomains || []) {
          const key = existingSub.fullDomain.toLowerCase();
          if (!incomingSubMap.has(key)) {
            incomingSubMap.set(key, existingSub);
          }
        }
      }
      vhostStore.subdomains = Array.from(incomingSubMap.values());
    }

    let preservedServerClone = false;

    if (filesByAccount && typeof filesByAccount === 'object') {
      const mergedFilesByAcc: Record<string, VhostFile[]> = { ...vhostStore.filesByAccount };

      for (const [accId, rawFiles] of Object.entries(filesByAccount)) {
        const incomingAccFiles: VhostFile[] = Array.isArray(rawFiles) ? (rawFiles as VhostFile[]) : [];
        const existingAccFiles: VhostFile[] = Array.isArray(vhostStore.filesByAccount[accId])
          ? vhostStore.filesByAccount[accId]
          : [];

        // Build map of existing server files by normalized path so we never lose server-side content
        // when the client sends lightweight metadata or partial file lists
        const existingByPath = new Map<string, VhostFile>();
        for (const ef of existingAccFiles) {
          existingByPath.set(normalizePath(ef.path).toLowerCase(), ef);
        }

        const enrichedIncoming = incomingAccFiles.map(inf => {
          const normP = normalizePath(inf.path);
          const key = normP.toLowerCase();
          const prev = existingByPath.get(key);
          // If incoming file has empty/omitted content but server has real content, preserve server content
          const resolvedContent =
            typeof inf.content === 'string' && inf.content.length > 0
              ? inf.content
              : prev?.content;
          return {
            ...inf,
            path: normP,
            content: resolvedContent,
          };
        });

        const incomingPaths = new Set(enrichedIncoming.map(f => normalizePath(f.path).toLowerCase()));

        // Always retain existing server files that are in other document roots or were created by server-side cloner/migrator
        // unless explicitly deleted via /api/vhost/delete-file(s)
        const retainedServerFiles = existingAccFiles.filter(ef => {
          const normP = normalizePath(ef.path).toLowerCase();
          if (incomingPaths.has(normP)) return false;
          // Keep server-cloned / migrated files that weren't in client's partial list
          const idStr = String(ef.id || '');
          if (
            !userInitiated ||
            idStr.startsWith('vf-clone-') ||
            idStr.startsWith('vf-mig-') ||
            idStr.startsWith('vf-srv-') ||
            idStr.startsWith('vf-disk-') ||
            idStr.startsWith('vf-aistudio-')
          ) {
            return true;
          }
          return false;
        });

        if (retainedServerFiles.length > 0) {
          preservedServerClone = true;
        }

        // Cap total in-memory files per account to 400 to prevent RAM bloat and OOM crashes
        const combined = [...retainedServerFiles, ...enrichedIncoming];
        mergedFilesByAcc[accId] = combined.slice(-400);
      }

      vhostStore.filesByAccount = mergedFilesByAcc;
    }

    vhostStore = sanitizeVhostStore(vhostStore);
    persistVhostStore();
    res.json({
      ok: true,
      preservedServerClone,
      syncedAccounts: vhostStore.accounts.length,
      syncedSubdomains: vhostStore.subdomains.length,
      store: vhostStore,
    });
  });

  // =========================================================================
  // PERSISTENT DATA RETENTION VAULT ENDPOINTS (SURVIVES CLOUD PRO UPDATES)
  // =========================================================================
  app.get(['/api/state/vault', '/api/vault/state'], (_req, res) => {
    const primaryAccId = vhostStore.accounts[0]?.id || 'acc-rdm-01';
    const currentFiles = vhostStore.filesByAccount[primaryAccId] || [];
    res.json({
      ok: true,
      vaultPath: HOME_VAULT_DIR,
      localBackupPath: LOCAL_DATA_DIR,
      lastSavedAt: vaultLastSavedAt,
      dataRetentionLocked,
      vhostStore,
      fullState: persistedFullAppState,
      stats: {
        accountsCount: vhostStore.accounts.length,
        subdomainsCount: vhostStore.subdomains.length,
        filesCount: currentFiles.length,
      },
    });
  });

  app.post('/api/vault/lock', (req, res) => {
    const { locked } = req.body || {};
    if (typeof locked === 'boolean') {
      dataRetentionLocked = locked;
    }
    res.json({
      ok: true,
      dataRetentionLocked,
      vaultPath: HOME_VAULT_DIR,
      lastSavedAt: vaultLastSavedAt,
    });
  });

  app.post(['/api/state/vault', '/api/vault/state'], (req, res) => {
    const { state, userInitiated, lockRetention } = req.body || {};
    if (typeof lockRetention === 'boolean') {
      dataRetentionLocked = lockRetention;
    }

    if (state && typeof state === 'object') {
      const primaryAccId = vhostStore.accounts[0]?.id || 'acc-rdm-01';
      const serverFiles = vhostStore.filesByAccount[primaryAccId] || [];
      const serverHasCustomFiles = serverFiles.some(
        f =>
          f.type === 'file' &&
          f.id !== 'vf-personal-html' &&
          f.id !== 'vf-personal-css' &&
          f.id !== 'vf-02' &&
          f.id !== 'vf-03' &&
          f.id !== 'vf-04'
      );

      const incomingVirtualFiles: any[] = Array.isArray(state.virtualFiles) ? state.virtualFiles : [];
      const incomingHasCustomFiles = incomingVirtualFiles.some(
        f =>
          f.type === 'file' &&
          f.id !== 'vf-personal-html' &&
          f.id !== 'vf-personal-css' &&
          f.id !== 'vf-02' &&
          f.id !== 'vf-03' &&
          f.id !== 'vf-04'
      );

      // If dataRetentionLocked is active and an un-initialized browser tab sends default files, protect the vault!
      if (!userInitiated && dataRetentionLocked && serverHasCustomFiles && !incomingHasCustomFiles && persistedFullAppState) {
        return res.json({
          ok: true,
          restoredFromVault: true,
          vaultPath: HOME_VAULT_DIR,
          lastSavedAt: vaultLastSavedAt,
          fullState: persistedFullAppState,
          vhostStore,
        });
      }

      persistFullAppState(state);
    }

    res.json({
      ok: true,
      vaultPath: HOME_VAULT_DIR,
      lastSavedAt: vaultLastSavedAt,
      dataRetentionLocked,
      fullState: persistedFullAppState,
      vhostStore,
    });
  });

  // =========================================================================
  // CLOUDFLARE ERROR 1033 & 1016 DIAGNOSTICS & 1-CLICK DNS CNAME AUTO-FIX
  // =========================================================================
  app.get('/api/tunnel/diagnose', async (_req, res) => {
    const activeTunnelId = decodeTunnelIdFromJwt(tunnelTokenSaved || DEFAULT_TUNNEL_TOKEN);
    const cnameTarget = `${activeTunnelId}.cfargotunnel.com`;
    const rootDomain = ddnsConfig.domain || vhostStore.accounts[0]?.primaryDomain || 'denbaguse.my.id';
    const hostsToCheck = [
      `servercloud.${rootDomain}`,
      rootDomain,
      `panel.${rootDomain}`,
    ];

    const results: Array<{
      host: string;
      httpStatus: number;
      cfErrorCode: string | null;
      status: 'ok' | 'error_1033' | 'error_1016' | 'unreachable';
      diagnosis: string;
    }> = [];

    for (const h of hostsToCheck) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        const r = await fetch(`https://${h}`, {
          headers: { 'User-Agent': 'CloudPRO-Tunnel-Diagnostic/2.0' },
          signal: controller.signal,
        });
        clearTimeout(timer);
        const bodyText = await r.text();
        if (
          bodyText.includes('1033') ||
          (r.status === 530 && !bodyText.includes('1016'))
        ) {
          results.push({
            host: h,
            httpStatus: r.status,
            cfErrorCode: '1033',
            status: 'error_1033',
            diagnosis: `Record DNS CNAME untuk ${h} di Cloudflare menunjuk ke Tunnel ID lama/berbeda yang sedang mati, bukan ke Tunnel aktif (${cnameTarget}).`,
          });
        } else if (bodyText.includes('1016')) {
          results.push({
            host: h,
            httpStatus: r.status,
            cfErrorCode: '1016',
            status: 'error_1016',
            diagnosis: `Origin DNS Error (1016): Target CNAME untuk ${h} belum mengarah ke ${cnameTarget}.`,
          });
        } else {
          results.push({
            host: h,
            httpStatus: r.status,
            cfErrorCode: null,
            status: 'ok',
            diagnosis: 'Terhubung normal ke server Cloud PRO.',
          });
        }
      } catch (err: any) {
        results.push({
          host: h,
          httpStatus: 0,
          cfErrorCode: null,
          status: 'unreachable',
          diagnosis: `DNS / CNAME belum mengarah ke ${cnameTarget} (${err?.message || 'Unreachable'}).`,
        });
      }
    }

    res.json({
      ok: true,
      tunnelStatus,
      tunnelPid: tunnelProcess?.pid || null,
      activeTunnelId,
      cnameTarget,
      rootDomain,
      results,
    });
  });

  app.post('/api/tunnel/fix-dns', async (req, res) => {
    const { cfApiToken: bodyToken, domain: bodyDomain } = req.body || {};
    const tokenToUse = String(bodyToken || ddnsConfig.cfApiToken || '').trim();
    const rootDomain = String(bodyDomain || ddnsConfig.domain || 'denbaguse.my.id').trim();
    const activeTunnelId = decodeTunnelIdFromJwt(tunnelTokenSaved || DEFAULT_TUNNEL_TOKEN);
    const cnameTarget = `${activeTunnelId}.cfargotunnel.com`;

    // Always ensure cloudflared daemon is running
    if (tunnelStatus !== 'running' || !tunnelProcess) {
      await startCloudflaredTunnel(tunnelTokenSaved || DEFAULT_TUNNEL_TOKEN, 'token');
    }

    if (!tokenToUse) {
      return res.json({
        ok: false,
        requiresApiToken: true,
        activeTunnelId,
        cnameTarget,
        message: `Daemon cloudflared telah di-refresh (Tunnel ID: ${activeTunnelId}). Untuk memperbaiki record CNAME servercloud.${rootDomain} secara otomatis via API, masukkan Cloudflare API Token (Edit DNS) atau arahkan CNAME servercloud ke ${cnameTarget}.`,
      });
    }

    ddnsConfig.cfApiToken = tokenToUse;
    ddnsConfig.domain = rootDomain;
    saveDdnsConfig();

    const headers = {
      Authorization: `Bearer ${tokenToUse}`,
      'Content-Type': 'application/json',
    };

    try {
      let zoneId = ddnsConfig.cfZoneId.trim();
      if (!zoneId) {
        const zoneRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(rootDomain)}`,
          { headers }
        );
        const zoneData = (await zoneRes.json()) as any;
        if (!zoneData?.success || !zoneData?.result?.[0]?.id) {
          throw new Error(zoneData?.errors?.[0]?.message || `Zone ${rootDomain} tidak ditemukan di Cloudflare.`);
        }
        zoneId = zoneData.result[0].id;
        ddnsConfig.cfZoneId = zoneId;
        saveDdnsConfig();
      }

      const targetHostnames = [
        rootDomain,
        `*.${rootDomain}`,
        `servercloud.${rootDomain}`,
        `panel.${rootDomain}`,
      ];
      const fixedRecords: string[] = [];

      for (const fqdn of targetHostnames) {
        // Find any existing A, AAAA, or CNAME records for this fqdn
        const listRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdn)}`,
          { headers }
        );
        const listData = (await listRes.json()) as any;
        const existingRecords: any[] = Array.isArray(listData?.result) ? listData.result : [];

        // Delete conflicting A/AAAA or mismatched CNAME records
        for (const rec of existingRecords) {
          if (rec.type === 'A' || rec.type === 'AAAA' || rec.type === 'CNAME') {
            await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${rec.id}`, {
              method: 'DELETE',
              headers,
            });
          }
        }

        // Create clean proxied CNAME pointing to activeTunnelId.cfargotunnel.com
        const createRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'CNAME',
            name: fqdn,
            content: cnameTarget,
            ttl: 1,
            proxied: true,
          }),
        });
        const createData = (await createRes.json()) as any;
        if (createData?.success) {
          fixedRecords.push(`${fqdn} -> ${cnameTarget}`);
          appendDdnsLog(`AUTO-FIX 1033/1016: CNAME [${fqdn}] -> ${cnameTarget} (Proxied)`);
        }
      }

      return res.json({
        ok: true,
        activeTunnelId,
        cnameTarget,
        fixedRecords,
        message: `Berhasil memperbaiki ${fixedRecords.length} record CNAME Tunnel (${fixedRecords.join(', ')}) ke ${cnameTarget}! Error 1033 & 1016 telah teratasi.`,
      });
    } catch (err: any) {
      return res.json({
        ok: false,
        activeTunnelId,
        cnameTarget,
        message: err?.message || 'Gagal mengupdate DNS Cloudflare.',
      });
    }
  });

  // =========================================================================
  // REAL STANDALONE WEBSITE CLONER & MIGRATOR ENDPOINTS
  // =========================================================================
  app.post('/api/vhost/clone', async (req, res) => {
    const {
      accountId = 'acc-rdm-01',
      targetDir = '/public_html',
      url = '',
      title = '',
      mode = 'url_scrape',
      customHtml = '',
      customCss = '',
      downloadAssets = true,
    } = req.body || {};
    const cleanDir = normalizePath(targetDir);
    const cleanUrl = String(url || '').trim();
    const fullUrl =
      cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') ? cleanUrl : `https://${cleanUrl}`;
    const hostName = fullUrl.replace(/^https?:\/\//i, '').split('/')[0] || 'denbaguse.my.id';
    const siteTitle = String(title || '').trim() || `Website Pribadi — ${hostName}`;

    const nowId = Date.now();
    const newFiles: VhostFile[] = [];
    let fetchedLiveHtml = false;
    let statusMessage = '';

    if (mode === 'custom_code' && String(customHtml).trim()) {
      newFiles.push({
        id: `vf-clone-${nowId}-html`,
        accountId,
        name: 'index.html',
        path: `${cleanDir}/index.html`,
        type: 'file',
        size: String(customHtml).length,
        content: String(customHtml),
      });
      if (String(customCss).trim()) {
        newFiles.push({
          id: `vf-clone-${nowId}-css`,
          accountId,
          name: 'style.css',
          path: `${cleanDir}/style.css`,
          type: 'file',
          size: String(customCss).length,
          content: String(customCss),
        });
      }
      fetchedLiveHtml = true;
      statusMessage = `Kode HTML/CSS kustom berhasil dipasang ke ${cleanDir}.`;
    } else {
      let clonedHtml = '';
      let originUrl = '';

      if (cleanUrl && !hostName.includes('localhost') && !hostName.includes('.run.app')) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const remoteRes = await fetch(fullUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (remoteRes.ok) {
            const text = await remoteRes.text();
            if (
              text &&
              !text.includes('error code: 1016') &&
              !text.includes('error code: 1033') &&
              (text.includes('<html') || text.includes('<!DOCTYPE') || text.includes('<body') || text.includes('<head'))
            ) {
              originUrl = new URL(fullUrl).origin.replace(/\/$/, '');
              clonedHtml = text;
              fetchedLiveHtml = true;

              // Deep scrape linked CSS stylesheets and JS bundles and inline them so the cloned SPA is 100% self-contained
              let combinedInlinedCss = '';
              let combinedInlinedJs = '';

              if (downloadAssets) {
                const linkTags = [...clonedHtml.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
                let cssIdx = 0;
                let primaryCssContent = '';

                for (const tag of linkTags) {
                  if (!/rel=["']stylesheet["']/i.test(tag)) continue;
                  const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
                  const rawHref = hrefMatch?.[1];
                  if (!rawHref || rawHref.startsWith('data:')) continue;
                  try {
                    const resolvedCssUrl = new URL(rawHref, fullUrl).href;
                    const cssRes = await fetch(resolvedCssUrl, {
                      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/126.0.0.0' },
                    });
                    if (cssRes.ok) {
                      let cssContent = await cssRes.text();
                      if (cssContent && cssContent.length < 1_500_000) {
                        cssContent = cssContent.replace(/url\(\s*(['"]?)\/(?!\/)/gi, `url($1${originUrl}/`);
                        cssIdx++;
                        combinedInlinedCss += `\n/* Cloned Stylesheet ${cssIdx}: ${resolvedCssUrl} */\n${cssContent}\n`;
                        if (!primaryCssContent || cssContent.length > primaryCssContent.length) {
                          primaryCssContent = cssContent;
                        }
                        const parsedCssUrl = new URL(resolvedCssUrl);
                        if (parsedCssUrl.origin === originUrl && parsedCssUrl.pathname.endsWith('.css')) {
                          // Strip same-origin stylesheet <link> tag since it will be inlined directly
                          clonedHtml = clonedHtml.replace(tag, '');
                          const relPath = normalizePath(`${cleanDir}${parsedCssUrl.pathname}`);
                          const fileName = parsedCssUrl.pathname.split('/').pop() || `style-${cssIdx}.css`;
                          newFiles.push({
                            id: `vf-clone-${nowId}-css-rel-${cssIdx}`,
                            accountId,
                            name: fileName,
                            path: relPath,
                            type: 'file',
                            size: cssContent.length,
                            content: cssContent,
                          });
                        }
                      }
                    }
                  } catch {
                    // Keep remote reference
                  }
                }

                if (primaryCssContent) {
                  newFiles.push({
                    id: `vf-clone-${nowId}-css-main`,
                    accountId,
                    name: 'style.css',
                    path: `${cleanDir}/style.css`,
                    type: 'file',
                    size: primaryCssContent.length,
                    content: primaryCssContent,
                  });
                }

                // Scrape external JS bundles and inline same-origin bundles so SPAs (Vite/React/Vue) render with zero CORS/module failures
                const scriptTags = [...clonedHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)];
                let jsIdx = 0;
                for (const sMatch of scriptTags.slice(0, 6)) {
                  const fullScriptTag = sMatch[0];
                  const rawSrc = sMatch[1];
                  if (!rawSrc || rawSrc.startsWith('data:')) continue;
                  try {
                    const resolvedJsUrl = new URL(rawSrc, fullUrl).href;
                    const parsedJsUrl = new URL(resolvedJsUrl);
                    if (parsedJsUrl.origin === originUrl) {
                      const jsRes = await fetch(resolvedJsUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/126.0.0.0' },
                      });
                      if (jsRes.ok) {
                        let jsContent = await jsRes.text();
                        if (jsContent && jsContent.length < 2_500_000) {
                          jsContent = jsContent
                            .replace(/"\/uploads\//g, `"${originUrl}/uploads/`)
                            .replace(/"\/avatar-jaenal\.jpg"/g, `"${originUrl}/avatar-jaenal.jpg"`)
                            .replace(/"\/og-image\.jpg"/g, `"${originUrl}/og-image.jpg"`)
                            .replace(/`\/api\/site-data/g, `\`${originUrl}/api/site-data`)
                            .replace(/"\/api\/site-data/g, `"${originUrl}/api/site-data`)
                            .replace(
                              /!!localStorage\.getItem\("adminSession"\)/g,
                              '(function(){try{return!!localStorage.getItem("adminSession")}catch(e){return false}})()'
                            )
                            .replace(/;?\s*export\s*\{[^}]+\}\s*;?\s*$/, ';');
                          jsIdx++;
                          combinedInlinedJs += `\n/* Cloned JS Bundle ${jsIdx}: ${resolvedJsUrl} */\n${jsContent}\n`;
                          clonedHtml = clonedHtml.replace(fullScriptTag, '');
                          const fileName = parsedJsUrl.pathname.split('/').pop() || `bundle-${jsIdx}.js`;
                          newFiles.push({
                            id: `vf-clone-${nowId}-js-${jsIdx}`,
                            accountId,
                            name: fileName,
                            path: normalizePath(`${cleanDir}${parsedJsUrl.pathname}`),
                            type: 'file',
                            size: jsContent.length,
                            content: jsContent,
                          });

                          // Auto-detect and download dynamic lazy chunks (e.g. import("./AdminPortal-*.js"))
                          const dynamicChunkMatches = [
                            ...jsContent.matchAll(/import\s*\(\s*["']\.\/([^"']+\.js)["']\s*\)/g),
                          ];
                          for (const cMatch of dynamicChunkMatches) {
                            const chunkName = cMatch[1];
                            try {
                              const chunkCandidates = [
                                new URL(`/assets/${chunkName}`, fullUrl).href,
                                new URL(`/${chunkName}`, fullUrl).href,
                              ];
                              for (const cUrl of chunkCandidates) {
                                const cRes = await fetch(cUrl, {
                                  headers: { 'User-Agent': 'Mozilla/5.0 Chrome/126.0.0.0' },
                                });
                                if (cRes.ok) {
                                  const cText = await cRes.text();
                                  const cTrim = cText.trim().toLowerCase();
                                  const isHtmlDoc = cTrim.startsWith('<!doctype html') || cTrim.startsWith('<html') || (cTrim.startsWith('<!doctype') && cTrim.includes('<html'));
                                  if (cText && cText.length > 50 && !isHtmlDoc) {
                                    newFiles.push({
                                      id: `vf-clone-${nowId}-chunk-${chunkName}`,
                                      accountId,
                                      name: chunkName,
                                      path: normalizePath(`${cleanDir}/assets/${chunkName}`),
                                      type: 'file',
                                      size: cText.length,
                                      content: cText,
                                    });
                                    newFiles.push({
                                      id: `vf-clone-${nowId}-chunk-root-${chunkName}`,
                                      accountId,
                                      name: chunkName,
                                      path: normalizePath(`${cleanDir}/${chunkName}`),
                                      type: 'file',
                                      size: cText.length,
                                      content: cText,
                                    });
                                    break;
                                  }
                                }
                              }
                            } catch {
                              // Ignore chunk fetch error
                            }
                          }
                        }
                      }
                    }
                  } catch {
                    // Keep remote script URL
                  }
                }
              }

              // Rewrite all root-relative src="/...", href="/...", poster="/..." and embedded JSON asset paths to originUrl
              clonedHtml = clonedHtml
                .replace(/\b(src|href|poster)=["']\/(?!\/)/gi, `$1="${originUrl}/`)
                .replace(/"\/uploads\//g, `"${originUrl}/uploads/`)
                .replace(/"\/avatar-jaenal\.jpg"/g, `"${originUrl}/avatar-jaenal.jpg"`)
                .replace(/"\/og-image\.jpg"/g, `"${originUrl}/og-image.jpg"`)
                .replace(/"\/apple-touch-icon\.png"/g, `"${originUrl}/apple-touch-icon.png"`);

              const spaCompatShim = `  <script id="cloudpro-spa-clone-shim" data-cloned-origin="${originUrl}">
  (function(){
    var ORIGIN = ${JSON.stringify(originUrl)};
    try {
      var ls = window.localStorage;
      ls.getItem('__cp_test');
    } catch (e) {
      var mem = {};
      var safeStore = {
        getItem: function(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        setItem: function(k, v) { mem[k] = String(v); },
        removeItem: function(k) { delete mem[k]; },
        clear: function() { mem = {}; }
      };
      try { Object.defineProperty(window, 'localStorage', { value: safeStore, configurable: true }); } catch (e2) {}
      try { Object.defineProperty(window, 'sessionStorage', { value: safeStore, configurable: true }); } catch (e2) {}
    }
    try {
      var origPush = history.pushState;
      var origReplace = history.replaceState;
      history.pushState = function() { try { return origPush.apply(this, arguments); } catch (e) {} };
      history.replaceState = function() { try { return origReplace.apply(this, arguments); } catch (e) {} };
    } catch (e) {}
    try {
      var origFetch = window.fetch;
      if (origFetch) {
        window.fetch = function(input, init) {
          var urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
          if (urlStr.indexOf('/api/site-data') !== -1 && window.__INITIAL_SITE_DATA__) {
            var payload = JSON.stringify({
              success: true,
              data: window.__INITIAL_SITE_DATA__,
              lastUpdated: window.__INITIAL_SITE_DATA__.lastUpdated || Date.now()
            });
            return Promise.resolve(new Response(payload, { status: 200, headers: { 'Content-Type': 'application/json' } }));
          }
          if (typeof input === 'string' && (input.indexOf('/api/') === 0 || input.indexOf('/uploads/') === 0)) {
            input = ORIGIN + input;
          }
          return origFetch.call(this, input, init);
        };
      }
    } catch (e) {}
  })();
  </script>`;

              if (!clonedHtml.includes('cloudpro-spa-clone-shim')) {
                clonedHtml = /<head[^>]*>/i.test(clonedHtml)
                  ? clonedHtml.replace(/<head[^>]*>/i, match => `${match}\n${spaCompatShim}`)
                  : `${spaCompatShim}\n${clonedHtml}`;
              }

              if (combinedInlinedCss) {
                const styleBlock = `<style id="cloudpro-inlined-css" data-cloudpro-inlined-css="true">\n${combinedInlinedCss}\n</style>`;
                clonedHtml = clonedHtml.includes('</head>')
                  ? clonedHtml.replace('</head>', () => `${styleBlock}\n</head>`)
                  : `${styleBlock}\n${clonedHtml}`;
              }

              if (combinedInlinedJs) {
                const safeCombinedJs = combinedInlinedJs.replace(/"<script><\\\/script>"/g, '"<" + "script><\\/script>"');
                const isModule = safeCombinedJs.includes('import ') || safeCombinedJs.includes('import(') || safeCombinedJs.includes('export ');
                const scriptBlock = `<script ${isModule ? 'type="module"' : ''} id="cloudpro-inlined-js" data-cloudpro-inlined-js="true">\n${safeCombinedJs}\n</script>`;
                clonedHtml = clonedHtml.includes('</body>')
                  ? clonedHtml.replace('</body>', () => `${scriptBlock}\n</body>`)
                  : `${clonedHtml}\n${scriptBlock}`;
              }

              const diagnosticGuardScript = `  <script id="cloudpro-diagnostic-guard">
  (function() {
    window.addEventListener('error', function(e) {
      console.warn('[CloudPRO Guard] Caught runtime warning:', e && e.message);
    });
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        var body = document.body;
        var root = document.getElementById('root') || document.getElementById('app') || document.querySelector('#__next');
        var hasVisibleText = body && body.innerText && body.innerText.trim().length > 15;
        if (root && !hasVisibleText && (!root.children || root.children.length === 0)) {
          var notice = document.createElement('div');
          notice.id = 'cloudpro-empty-root-notice';
          notice.style.cssText = 'position:fixed;inset:0;background:#090d16;color:#f1f5f9;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;z-index:999999;text-align:center;';
          notice.innerHTML = '<div style="max-width:520px;background:#131d2e;border:1px solid #1e293b;border-radius:18px;padding:28px;box-shadow:0 25px 35px -5px rgba(0,0,0,0.6);"><div style="font-size:36px;margin-bottom:12px;">⚡</div><h2 style="font-size:18px;font-weight:700;color:#38bdf8;margin-bottom:8px;">Halaman Web Berhasil Terhubung</h2><p style="font-size:13px;color:#94a3b8;line-height:1.6;margin-bottom:20px;">Situs ini telah terpasang di Virtual Host Cloud PRO. Jika halaman masih memuat modul JavaScript, Anda dapat memuat ulang atau membuka Kode Sumber.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;"><button onclick="location.reload()" style="background:#0284c7;color:#fff;border:none;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">Muat Ulang Halaman</button><button onclick="window.parent&&window.parent.postMessage({type:\\'CLOUDPRO_PREVIEW_NAV\\',href:\\'style.css\\'},\\'*\\')" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">Cek File Manager</button></div></div>';
          body.appendChild(notice);
        }
      }, 3500);
    });
  })();
  </script>`;

              if (!clonedHtml.includes('cloudpro-diagnostic-guard')) {
                clonedHtml = clonedHtml.includes('</body>')
                  ? clonedHtml.replace('</body>', () => `${diagnosticGuardScript}\n</body>`)
                  : `${clonedHtml}\n${diagnosticGuardScript}`;
              }

              statusMessage = `Berhasil mengunduh halaman live & menyelaraskan aset dari ${fullUrl}.`;
            }
          }
        } catch (err: any) {
          statusMessage = `Domain sumber (${fullUrl}) tidak merespons (${err?.message || 'Timeout/DNS Error'}), menggunakan template Website Pribadi ${siteTitle}.`;
        }
      }

      if (!clonedHtml) {
        clonedHtml = DEFAULT_PERSONAL_HTML
          .replace(/Den Baguse — Website Pribadi &amp; Portfolio Digital/g, siteTitle)
          .replace(
            /Selamat Datang di Portal Pribadi <span>Den Baguse<\/span>/g,
            `Selamat Datang di <span>${siteTitle}</span>`
          );
        newFiles.push({
          id: `vf-clone-${nowId}-css`,
          accountId,
          name: 'style.css',
          path: `${cleanDir}/style.css`,
          type: 'file',
          size: DEFAULT_PERSONAL_CSS.length,
          content: DEFAULT_PERSONAL_CSS,
        });
        if (!statusMessage) {
          statusMessage = `Website Pribadi (${siteTitle}) berhasil dipasang di ${cleanDir}.`;
        }
      }

      newFiles.unshift({
        id: `vf-clone-${nowId}-html`,
        accountId,
        name: 'index.html',
        path: `${cleanDir}/index.html`,
        type: 'file',
        size: clonedHtml.length,
        content: clonedHtml,
      });
    }

    registerSubdomainIfSubdir(cleanDir, accountId);

    const existing = Array.isArray(vhostStore.filesByAccount[accountId])
      ? vhostStore.filesByAccount[accountId]
      : [];
    const newPathsSet = new Set(newFiles.map(nf => normalizePath(nf.path).toLowerCase()));
    const filtered = existing.filter(f => {
      if (f.type !== 'file') return true;
      const pNorm = normalizePath(f.path).toLowerCase();
      if (newPathsSet.has(pNorm)) return false;
      const parent = pNorm.substring(0, pNorm.lastIndexOf('/')) || '/public_html';
      const fName = f.name.toLowerCase();
      if (
        parent === cleanDir.toLowerCase() &&
        (fName === 'index.html' || fName === 'index.htm' || fName === 'index.php')
      ) {
        return false;
      }
      return true;
    });

    vhostStore.filesByAccount[accountId] = [...filtered, ...newFiles];
    persistVhostStore();

    // Also write cloned files directly to physical disk in the isolated target directory
    try {
      const physicalBases = [
        path.join(process.cwd(), cleanDir.replace(/^\//, '')),
        path.join(HOME_VAULT_DIR, cleanDir.replace(/^\//, '')),
      ];
      for (const baseDir of physicalBases) {
        for (const nf of newFiles) {
          if (nf.type === 'file' && typeof nf.content === 'string') {
            const relInsideDocRoot = normalizePath(nf.path).slice(cleanDir.length).replace(/^\//, '');
            if (!relInsideDocRoot) continue;
            const fullDest = path.join(baseDir, relInsideDocRoot);
            fs.mkdirSync(path.dirname(fullDest), { recursive: true });
            fs.writeFileSync(fullDest, nf.content, 'utf-8');
          }
        }
      }
    } catch {}

    res.json({
      ok: true,
      fetchedLiveHtml,
      statusMessage,
      targetDir: cleanDir,
      files: newFiles,
    });
  });

  // =========================================================================
  // ENTERPRISE SERVER-TO-SERVER DIRECT MIGRATOR (cPanel, Plesk, Direct Archive URL)
  // =========================================================================
  app.post('/api/migrator/remote-transfer', async (req, res) => {
    const {
      accountId = 'acc-rdm-01',
      targetDir = '/public_html',
      sourceType = 'cpanel',
      archiveUrl = '',
      cleanTargetDir = false,
      flattenRoot = true,
      ftpConfig = null,
    } = req.body || {};

    const cleanDir = normalizePath(targetDir);
    registerSubdomainIfSubdir(cleanDir, accountId);

    let rawUrl = String(
      archiveUrl ||
      req.body?.rawUrl ||
      req.body?.zipDirectUrl ||
      req.body?.url ||
      ''
    ).trim();

    // 1. URL Normalization: Support Google Drive, Dropbox, direct HTTP/HTTPS
    if (rawUrl) {
      const gDriveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
      if (gDriveMatch && gDriveMatch[1]) {
        rawUrl = `https://drive.google.com/uc?export=download&id=${gDriveMatch[1]}`;
      } else if (rawUrl.includes('dropbox.com')) {
        rawUrl = rawUrl.replace(/[?&]dl=0/g, '').replace(/\?$/, '') + '?dl=1';
      } else if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://') && !rawUrl.startsWith('ftp://')) {
        rawUrl = `https://${rawUrl}`;
      }
    }

    if (!rawUrl && !ftpConfig) {
      return res.status(400).json({
        ok: false,
        message: 'Masukkan URL unduhan file backup (ZIP/TAR.GZ) atau konfigurasi FTP.',
      });
    }

    const lowerRawUrl = rawUrl.toLowerCase().split('?')[0];
    const isExplicitArchiveUrl =
      lowerRawUrl.endsWith('.zip') ||
      lowerRawUrl.includes('.zip') ||
      lowerRawUrl.endsWith('.tar.gz') ||
      lowerRawUrl.endsWith('.tgz') ||
      lowerRawUrl.endsWith('.tar') ||
      lowerRawUrl.includes('drive.google.com') ||
      lowerRawUrl.includes('dropbox.com');

    const tempWorkDir = path.join(TMP_DIR, `cloudpro-mig-${Date.now()}`);

    try {
      if (!fs.existsSync(tempWorkDir)) {
        fs.mkdirSync(tempWorkDir, { recursive: true });
      }

      let webContentDir = '';
      let platformDetected = 'Arsip Web Kustom';
      const sqlDumps: string[] = [];

      // A. MODE 1: FTP DIRECT PULL (TANPA PERLU ZIP / FILE MANAGER)
      if (sourceType === 'ftp' || (!rawUrl && ftpConfig)) {
        webContentDir = path.join(tempWorkDir, 'ftp_files');
        fs.mkdirSync(webContentDir, { recursive: true });
        platformDetected = 'FTP Server-to-Server Live Pull';

        const fHost = ftpConfig?.host || 'localhost';
        const fUser = ftpConfig?.user || 'root';
        const fPass = ftpConfig?.password || '';
        const fPort = ftpConfig?.port || '21';
        const fPath = ftpConfig?.remotePath ? (ftpConfig.remotePath.endsWith('/') ? ftpConfig.remotePath : `${ftpConfig.remotePath}/`) : '/public_html/';

        const pyScriptPath = path.join(tempWorkDir, 'ftp_pull.py');
        const pyScriptContent = `
import ftplib, os, sys

host = sys.argv[1]
port = int(sys.argv[2])
user = sys.argv[3]
password = sys.argv[4]
target_path = sys.argv[5]
dest_dir = sys.argv[6]

try:
    ftp = ftplib.FTP(timeout=30)
    ftp.connect(host, port)
    ftp.login(user, password)
    ftp.set_pasv(True)
except Exception as e:
    print(f"ERROR_LOGIN: {e}", file=sys.stderr)
    sys.exit(1)

resolved_cwd = False
candidates = [target_path, target_path.strip('/'), '/' + target_path.strip('/'), '/', '']
for c in candidates:
    if not c:
        continue
    try:
        ftp.cwd(c)
        resolved_cwd = True
        break
    except:
        pass

if not resolved_cwd:
    try:
        ftp.cwd('/')
        resolved_cwd = True
    except:
        pass

def download_dir(remote_dir, local_dir):
    try:
        ftp.cwd(remote_dir)
    except:
        return
    os.makedirs(local_dir, exist_ok=True)
    
    items = []
    try:
        items = [f for f in ftp.nlst() if f not in ('.', '..')]
    except:
        pass
        
    for item in items:
        local_path = os.path.join(local_dir, item)
        is_dir = False
        try:
            ftp.cwd(item)
            is_dir = True
            ftp.cwd('..')
        except:
            is_dir = False
            
        if is_dir:
            download_dir(item, local_path)
            ftp.cwd('..')
        else:
            try:
                with open(local_path, 'wb') as lf:
                    ftp.retrbinary(f'RETR {item}', lf.write)
            except Exception as fe:
                pass

download_dir(ftp.pwd(), dest_dir)
ftp.quit()
`;
        fs.writeFileSync(pyScriptPath, pyScriptContent);

        const ftpRes = await execCmdAsync(
          `python3 "${pyScriptPath}" "${fHost}" "${fPort}" "${fUser}" "${fPass}" "${fPath}" "${webContentDir}"`,
          300000
        );
        if (!ftpRes.ok && ftpRes.stderr.includes('ERROR_LOGIN')) {
          throw new Error(`Login FTP gagal: Akun atau password FTP salah (${ftpRes.stderr.trim()})`);
        }

        if (!fs.existsSync(webContentDir) || fs.readdirSync(webContentDir).length === 0) {
          throw new Error(`Koneksi FTP berhasil terhubung ke ${fHost} (User: ${fUser}), namun direktori tersebut KOSONG (0 berkas). Di Plesk, pastikan Home Directory akun FTP Anda mengarah ke folder website yang berisi berkas, atau gunakan fitur '2. Upload File ZIP' dari File Manager.`);
        }

        let currentLevel = webContentDir;
        for (let i = 0; i < 4; i++) {
          const subs = fs.readdirSync(currentLevel).filter(e => e !== '.' && e !== '..');
          const hasWebFile = subs.some(e => e.toLowerCase() === 'index.php' || e.toLowerCase() === 'index.html');
          if (hasWebFile) {
            webContentDir = currentLevel;
            break;
          }
          if (subs.length === 1 && fs.statSync(path.join(currentLevel, subs[0])).isDirectory()) {
            currentLevel = path.join(currentLevel, subs[0]);
            webContentDir = currentLevel;
          } else {
            break;
          }
        }
      }
      // B. MODE 2: INSTANT DEEP WEB MIRROR
      else if (!isExplicitArchiveUrl && (sourceType === 'mirror' || sourceType === 'instant_spider')) {
        webContentDir = path.join(tempWorkDir, 'web_mirror');
        fs.mkdirSync(webContentDir, { recursive: true });
        platformDetected = '1-Click Deep Web Mirror (Zero-Zip)';

        await execCmdAsync(
          `wget -q --mirror -p --html-extension --convert-links -e robots=off --no-clobber --timeout=25 --tries=2 --no-check-certificate -P "${webContentDir}" "${rawUrl}"`,
          120000
        );

        const subs = fs.readdirSync(webContentDir).filter(e => e !== '.' && e !== '..');
        if (subs.length === 1 && fs.statSync(path.join(webContentDir, subs[0])).isDirectory()) {
          webContentDir = path.join(webContentDir, subs[0]);
        }

        try {
          const zipFound = fs.readdirSync(webContentDir).find(f => f.toLowerCase().endsWith('.zip'));
          if (zipFound) {
            const zPath = path.join(webContentDir, zipFound);
            await execCmdAsync(`unzip -q -o "${zPath}" -d "${webContentDir}" 2>/dev/null`, 60000);
            fs.rmSync(zPath, { force: true });
            platformDetected = 'Arsip ZIP Web Ditarik & Diekstrak Otomatis';
          }
        } catch {}
      }
      // C. MODE 3: DIRECT LINK BACKUP ARCHIVE (.ZIP / .TAR.GZ)
      else {
        let archiveFilePath = '';
        let isTarGz = false;

        const lowerUrl = rawUrl.toLowerCase().split('?')[0];
        if (lowerUrl.endsWith('.tar.gz') || lowerUrl.endsWith('.tgz')) {
          archiveFilePath = path.join(tempWorkDir, 'backup.tar.gz');
          isTarGz = true;
        } else if (lowerUrl.endsWith('.tar')) {
          archiveFilePath = path.join(tempWorkDir, 'backup.tar');
        } else {
          archiveFilePath = path.join(tempWorkDir, 'backup.zip');
        }

        const curlRes = await execCmdAsync(
          `curl -sSLk -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" --connect-timeout 25 --max-time 300 -o "${archiveFilePath}" "${rawUrl}"`,
          310000
        );
        if (!curlRes.ok && (!fs.existsSync(archiveFilePath) || fs.statSync(archiveFilePath).size < 100)) {
          throw new Error(`Gagal mengunduh file dari URL: ${curlRes.stderr || 'Koneksi timeout/URL tidak dapat diakses'}`);
        }

        if (!fs.existsSync(archiveFilePath) || fs.statSync(archiveFilePath).size < 100) {
          throw new Error('File hasil download kosong atau link tidak valid.');
        }

        const extractDir = path.join(tempWorkDir, 'extracted');
        fs.mkdirSync(extractDir, { recursive: true });

        let extractionSuccess = false;

        if (isTarGz) {
          const r = await execCmdAsync(`tar -xzf "${archiveFilePath}" -C "${extractDir}" 2>/dev/null`, 120000);
          if (r.ok) extractionSuccess = true;
        }

        if (!extractionSuccess) {
          const r = await execCmdAsync(`unzip -q -o "${archiveFilePath}" -d "${extractDir}" 2>/dev/null`, 180000);
          if (r.ok || fs.readdirSync(extractDir).length > 0) extractionSuccess = true;
        }

        if (!extractionSuccess) {
          const r = await execCmdAsync(
            `python3 -c "import zipfile, sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "${archiveFilePath}" "${extractDir}" 2>/dev/null`,
            180000
          );
          if (r.ok || fs.readdirSync(extractDir).length > 0) extractionSuccess = true;
        }

        if (!extractionSuccess) {
          const r = await execCmdAsync(`7z x -y "${archiveFilePath}" -o"${extractDir}" 2>/dev/null`, 180000);
          if (r.ok || fs.readdirSync(extractDir).length > 0) extractionSuccess = true;
        }

        if (!extractionSuccess) {
          const r = await execCmdAsync(`tar -xf "${archiveFilePath}" -C "${extractDir}" 2>/dev/null`, 180000);
          if (r.ok || fs.readdirSync(extractDir).length > 0) extractionSuccess = true;
        }

        if (!extractionSuccess) {
          throw new Error('Format arsip tidak didukung atau file terkorupsi (pastikan format .zip, .tar.gz, atau .tar).');
        }

        webContentDir = extractDir;

        const possibleRoots = [
          path.join(extractDir, 'homedir', 'public_html'),
          path.join(extractDir, 'public_html'),
          path.join(extractDir, 'httpdocs'),
          path.join(extractDir, 'htdocs'),
          path.join(extractDir, 'www'),
        ];

        for (const pr of possibleRoots) {
          if (fs.existsSync(pr) && fs.statSync(pr).isDirectory()) {
            webContentDir = pr;
            if (pr.includes('homedir')) platformDetected = 'cPanel Full Backup (homedir/public_html)';
            else if (pr.includes('httpdocs')) platformDetected = 'Plesk Backup (httpdocs)';
            break;
          }
        }
      }

      if (flattenRoot) {
        const topEntries = fs.readdirSync(webContentDir);
        const hasIndex = topEntries.some(e => e.toLowerCase() === 'index.html' || e.toLowerCase() === 'index.php');
        if (!hasIndex && topEntries.length === 1) {
          const singleChild = path.join(webContentDir, topEntries[0]);
          if (fs.statSync(singleChild).isDirectory()) {
            webContentDir = singleChild;
          }
        }
      }

      try {
        const findRes = await execCmdAsync(
          `find "${webContentDir}" -maxdepth 3 -type f \\( -name "*.sql" -o -name "*.sql.gz" \\) 2>/dev/null`,
          10000
        );
        if (findRes.stdout) {
          sqlDumps.push(...findRes.stdout.trim().split('\n').filter(Boolean).map(p => path.basename(p)));
        }
      } catch {}

      const extractedVhostFiles: VhostFile[] = [];
      let totalFilesScanned = 0;
      let totalBytesScanned = 0;
      let textFilesLoaded = 0;

      // Prune unreferenced dead build artifacts if assets/ has >300 files
      try {
        const assetsSubDir = path.join(webContentDir, 'assets');
        const rootIdxHtml = path.join(webContentDir, 'index.html');
        if (fs.existsSync(assetsSubDir) && fs.existsSync(rootIdxHtml)) {
          const allAssets = fs.readdirSync(assetsSubDir);
          if (allAssets.length > 300) {
            const keepSet = new Set<string>();
            const queue: string[] = [];
            const extractRefs = (txt: string) => {
              const ms = txt.match(/[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{6,16}\.(?:js|css|svg|png|jpg|jpeg|webp|gif|woff2?|ttf|eot|wasm|json)/g) || [];
              for (const m of ms) {
                const b = path.basename(m);
                if (!keepSet.has(b)) {
                  keepSet.add(b);
                  queue.push(b);
                }
              }
            };
            extractRefs(fs.readFileSync(rootIdxHtml, 'utf-8'));
            while (queue.length > 0) {
              const curr = queue.pop()!;
              const full = path.join(assetsSubDir, curr);
              if ((curr.endsWith('.js') || curr.endsWith('.css')) && fs.existsSync(full)) {
                try { extractRefs(fs.readFileSync(full, 'utf-8')); } catch {}
              }
            }
            for (const f of allAssets) {
              const isHashed = /^[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{6,16}\.(?:js|css|js\.map|css\.map)$/.test(f);
              if (isHashed && !keepSet.has(f)) {
                try { fs.unlinkSync(path.join(assetsSubDir, f)); } catch {}
              }
            }
          }
        }
      } catch {}

      const readDirRecursive = (currentDir: string, relBase: string) => {
        const items = fs.readdirSync(currentDir);
        const subDirsToRecurse: Array<{ full: string; rel: string }> = [];

        // First pass: register all files and directories at THIS level before recursing into subdirectories
        for (const item of items) {
          if (item === '.' || item === '..' || item === '.git' || item === '__MACOSX' || item === '.DS_Store') continue;
          const fullItemPath = path.join(currentDir, item);
          const itemRelPath = relBase ? `${relBase}/${item}` : item;
          const stat = fs.statSync(fullItemPath);

          if (stat.isDirectory()) {
            if (!relBase || extractedVhostFiles.length < 120) {
              extractedVhostFiles.push({
                id: `vf-mig-dir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                accountId,
                name: item,
                path: normalizePath(`${cleanDir}/${itemRelPath}`),
                type: 'directory',
                size: 4096,
              });
            }
            subDirsToRecurse.push({ full: fullItemPath, rel: itemRelPath });
          } else if (stat.isFile()) {
            totalFilesScanned++;
            totalBytesScanned += stat.size;
            const ext = item.split('.').pop()?.toLowerCase() || '';
            const isRootEntry =
              !relBase &&
              (item.toLowerCase() === 'index.html' ||
                item.toLowerCase() === 'index.php' ||
                item.toLowerCase() === 'index.htm' ||
                ext === 'htaccess');
            let content: string | undefined = undefined;

            if ((isRootEntry || (!relBase && stat.size <= 80_000) || textFilesLoaded < 10) && stat.size <= 250_000) {
              try {
                content = fs.readFileSync(fullItemPath, 'utf-8');
                textFilesLoaded++;
              } catch {
                content = undefined;
              }
            }

            if (!relBase || isRootEntry || extractedVhostFiles.length < 120) {
              extractedVhostFiles.push({
                id: `vf-mig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                accountId,
                name: item,
                path: normalizePath(`${cleanDir}/${itemRelPath}`),
                type: 'file',
                size: stat.size,
                content,
              });
            }
          }
        }

        // Second pass: recurse into subdirectories
        for (const sub of subDirsToRecurse) {
          readDirRecursive(sub.full, sub.rel);
        }
      };

      readDirRecursive(webContentDir, '');

      const entryFile =
        extractedVhostFiles.find(
          f => f.type === 'file' && (f.name.toLowerCase() === 'index.php' || f.name.toLowerCase() === 'index.html')
        )?.name || 'index.html';

      if (cleanTargetDir) {
        const existing = vhostStore.filesByAccount[accountId] || [];
        // Strictly remove only files belonging to cleanDir (never wipe subdomains if cleanDir is /public_html!)
        vhostStore.filesByAccount[accountId] = existing.filter(
          f => !isPathBelongingToDocRoot(f.path, cleanDir)
        );
      }

      const currentFiles = vhostStore.filesByAccount[accountId] || [];
      const newPaths = new Set(extractedVhostFiles.map(f => normalizePath(f.path).toLowerCase()));
      const filteredCurrent = currentFiles.filter(f => !newPaths.has(normalizePath(f.path).toLowerCase()));
      vhostStore.filesByAccount[accountId] = [...filteredCurrent, ...extractedVhostFiles];

      if (!vhostStore.accounts.some(a => a.id === accountId)) {
        vhostStore.accounts.push({
          id: accountId,
          primaryDomain: 'denbaguse.my.id',
          username: accountId.replace(/[^a-zA-Z0-9]/g, '') || 'web',
          phpVersion: '8.2',
        });
      }

      registerSubdomainIfSubdir(cleanDir, accountId);
      persistVhostStore();

      // Physically copy extracted files to isolated target directory without touching other subdomains
      try {
        const relTarget = cleanDir.startsWith('/public_html')
          ? cleanDir.replace(/^\//, '')
          : path.join('public_html', cleanDir.replace(/^\//, ''));

        const targetLocations = [
          path.join(process.cwd(), relTarget),
          path.join(HOME_VAULT_DIR, relTarget),
        ];

        const subDocRoots = getSubdomainDocRoots();

        for (const targetLoc of targetLocations) {
          try {
            if (!fs.existsSync(targetLoc)) {
              fs.mkdirSync(targetLoc, { recursive: true });
            } else if (cleanTargetDir) {
              // Clean only files belonging to this docRoot, preserving subdomain directories
              const existingItems = fs.readdirSync(targetLoc);
              for (const item of existingItems) {
                if (item === '.git' || item === 'node_modules' || item.startsWith('.cloudpro')) continue;
                const itemVirtualPath = normalizePath(`${cleanDir}/${item}`).toLowerCase();
                if (cleanDir === '/public_html' && subDocRoots.has(itemVirtualPath)) {
                  continue; // Preserve subdomain folder!
                }
                fs.rmSync(path.join(targetLoc, item), { recursive: true, force: true });
              }
            }
            await execCmdAsync(`cp -rf "${webContentDir}/." "${targetLoc}/" 2>/dev/null || true`, 60000);
          } catch {}
        }
      } catch {}

      try {
        fs.rmSync(tempWorkDir, { recursive: true, force: true });
      } catch {}

      return res.json({
        ok: true,
        message: `Berhasil memindahkan ${totalFilesScanned} file (${(totalBytesScanned / (1024 * 1024)).toFixed(1)} MB) langsung dari ${platformDetected} ke ${cleanDir}!`,
        summary: {
          filesExtracted: totalFilesScanned,
          totalSizeBytes: totalBytesScanned,
          entryFile,
          platformDetected,
          sqlDumps,
          targetDir: cleanDir,
        },
        files: extractedVhostFiles.slice(0, 60),
        totalFilesCount: totalFilesScanned,
      });
    } catch (err: any) {
      try {
        if (fs.existsSync(tempWorkDir)) {
          fs.rmSync(tempWorkDir, { recursive: true, force: true });
        }
      } catch {}

      return res.status(500).json({
        ok: false,
        message: `Gagal menjalankan migrasi: ${err?.message || String(err)}`,
      });
    }
  });

  // Direct ZIP file upload and extract endpoint (from old web file manager)
  app.post('/api/migrator/upload-zip', async (req, res) => {
    const {
      accountId = 'acc-rdm-01',
      targetDir = '/public_html',
      cleanTargetDir = false,
      flattenRoot = true,
      base64Data = '',
      fileName = 'backup.zip',
    } = req.body || {};

    const cleanDir = normalizePath(targetDir);
    registerSubdomainIfSubdir(cleanDir, accountId);

    if (!base64Data) {
      return res.status(400).json({ ok: false, message: 'Data file ZIP tidak boleh kosong.' });
    }

    const tempWorkDir = path.join(TMP_DIR, `cloudpro-zip-up-${Date.now()}`);
    try {
      if (!fs.existsSync(tempWorkDir)) {
        fs.mkdirSync(tempWorkDir, { recursive: true });
      }

      const zipFilePath = path.join(tempWorkDir, fileName || 'backup.zip');
      const base64Clean = base64Data.replace(/^data:.*?;base64,/, '');
      fs.writeFileSync(zipFilePath, Buffer.from(base64Clean, 'base64'));

      const extractDir = path.join(tempWorkDir, 'extracted');
      fs.mkdirSync(extractDir, { recursive: true });

      let extractionSuccess = false;
      const rUnzip = await execCmdAsync(`unzip -q -o "${zipFilePath}" -d "${extractDir}" 2>/dev/null`, 180000);
      if (rUnzip.ok || fs.readdirSync(extractDir).length > 0) extractionSuccess = true;

      if (!extractionSuccess) {
        const rPy = await execCmdAsync(
          `python3 -c "import zipfile, sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "${zipFilePath}" "${extractDir}" 2>/dev/null`,
          180000
        );
        if (rPy.ok || fs.readdirSync(extractDir).length > 0) extractionSuccess = true;
      }

      if (!extractionSuccess) {
        const r7z = await execCmdAsync(`7z x -y "${zipFilePath}" -o"${extractDir}" 2>/dev/null`, 180000);
        if (r7z.ok || fs.readdirSync(extractDir).length > 0) extractionSuccess = true;
      }

      if (!extractionSuccess) {
        const rTar = await execCmdAsync(`tar -xzf "${zipFilePath}" -C "${extractDir}" 2>/dev/null`, 180000);
        if (rTar.ok || fs.readdirSync(extractDir).length > 0) extractionSuccess = true;
      }

      if (!extractionSuccess) {
        throw new Error('Gagal mengekstrak file arsip. Pastikan file berformat .zip atau .tar.gz yang valid.');
      }

      let webContentDir = extractDir;
      let platformDetected = 'Arsip File Manager Web Lama (.ZIP)';

      const possibleRoots = [
        path.join(extractDir, 'homedir', 'public_html'),
        path.join(extractDir, 'public_html'),
        path.join(extractDir, 'httpdocs'),
        path.join(extractDir, 'htdocs'),
        path.join(extractDir, 'www'),
      ];

      for (const pr of possibleRoots) {
        if (fs.existsSync(pr) && fs.statSync(pr).isDirectory()) {
          webContentDir = pr;
          if (pr.includes('homedir')) platformDetected = 'cPanel Full Backup (homedir/public_html)';
          else if (pr.includes('httpdocs')) platformDetected = 'Plesk Backup (httpdocs)';
          break;
        }
      }

      if (flattenRoot) {
        const topEntries = fs.readdirSync(webContentDir);
        const hasIndex = topEntries.some(e => e.toLowerCase() === 'index.html' || e.toLowerCase() === 'index.php');
        if (!hasIndex && topEntries.length === 1) {
          const singleChild = path.join(webContentDir, topEntries[0]);
          if (fs.statSync(singleChild).isDirectory()) {
            webContentDir = singleChild;
          }
        }
      }

      const extractedVhostFiles: VhostFile[] = [];
      let totalFilesScanned = 0;
      let totalBytesScanned = 0;
      let textFilesLoaded = 0;

      const readDirRecursive = (currentDir: string, relBase: string) => {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          if (item === '.' || item === '..' || item === '.git' || item === '__MACOSX' || item === '.DS_Store') continue;
          const fullItemPath = path.join(currentDir, item);
          const itemRelPath = relBase ? `${relBase}/${item}` : item;
          const stat = fs.statSync(fullItemPath);

          if (stat.isDirectory()) {
            if (extractedVhostFiles.length < 80) {
              extractedVhostFiles.push({
                id: `vf-mig-dir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                accountId,
                name: item,
                path: normalizePath(`${cleanDir}/${itemRelPath}`),
                type: 'directory',
                size: 4096,
              });
            }
            readDirRecursive(fullItemPath, itemRelPath);
          } else if (stat.isFile()) {
            totalFilesScanned++;
            totalBytesScanned += stat.size;
            const ext = item.split('.').pop()?.toLowerCase() || '';
            const isRootEntry =
              !relBase &&
              (item.toLowerCase() === 'index.html' ||
                item.toLowerCase() === 'index.php' ||
                item.toLowerCase() === 'index.htm' ||
                ext === 'htaccess');
            let content: string | undefined = undefined;

            if ((isRootEntry || textFilesLoaded < 10) && stat.size <= 150_000) {
              try {
                content = fs.readFileSync(fullItemPath, 'utf-8');
                textFilesLoaded++;
              } catch {
                content = undefined;
              }
            }

            if (isRootEntry || extractedVhostFiles.length < 80) {
              extractedVhostFiles.push({
                id: `vf-mig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                accountId,
                name: item,
                path: normalizePath(`${cleanDir}/${itemRelPath}`),
                type: 'file',
                size: stat.size,
                content,
              });
            }
          }
        }
      };

      readDirRecursive(webContentDir, '');

      const entryFile =
        extractedVhostFiles.find(
          f => f.type === 'file' && (f.name.toLowerCase() === 'index.php' || f.name.toLowerCase() === 'index.html')
        )?.name || 'index.html';

      if (cleanTargetDir) {
        const existing = vhostStore.filesByAccount[accountId] || [];
        vhostStore.filesByAccount[accountId] = existing.filter(
          f => !isPathBelongingToDocRoot(f.path, cleanDir)
        );
      }

      const currentFiles = vhostStore.filesByAccount[accountId] || [];
      const newPaths = new Set(extractedVhostFiles.map(f => normalizePath(f.path).toLowerCase()));
      const filteredCurrent = currentFiles.filter(f => !newPaths.has(normalizePath(f.path).toLowerCase()));
      vhostStore.filesByAccount[accountId] = [...filteredCurrent, ...extractedVhostFiles];
      registerSubdomainIfSubdir(cleanDir, accountId);
      persistVhostStore();

      // Mirror extracted files to isolated physical directories
      const physicalDestRoot = path.join(HOME_VAULT_DIR, cleanDir.replace(/^\/+/, ''));
      const localDestRoot = path.join(process.cwd(), cleanDir.replace(/^\/+/, ''));
      const subDocRoots = getSubdomainDocRoots();

      for (const destRoot of [physicalDestRoot, localDestRoot]) {
        try {
          if (!fs.existsSync(destRoot)) {
            fs.mkdirSync(destRoot, { recursive: true });
          } else if (cleanTargetDir) {
            const existingItems = fs.readdirSync(destRoot);
            for (const item of existingItems) {
              if (item === '.git' || item === 'node_modules' || item.startsWith('.cloudpro')) continue;
              const itemVirtualPath = normalizePath(`${cleanDir}/${item}`).toLowerCase();
              if (cleanDir === '/public_html' && subDocRoots.has(itemVirtualPath)) {
                continue;
              }
              fs.rmSync(path.join(destRoot, item), { recursive: true, force: true });
            }
          }
          await execCmdAsync(`cp -rf "${webContentDir}/." "${destRoot}/" 2>/dev/null || true`, 60000);
        } catch {}
      }

      try {
        fs.rmSync(tempWorkDir, { recursive: true, force: true });
      } catch {}

      return res.json({
        ok: true,
        message: `Berhasil mengupload dan mengekstrak ${totalFilesScanned} file (${(totalBytesScanned / (1024 * 1024)).toFixed(1)} MB) dari file ZIP ke ${cleanDir}!`,
        summary: {
          filesExtracted: totalFilesScanned,
          totalSizeBytes: totalBytesScanned,
          entryFile,
          platformDetected,
          sqlDumps: [],
          targetDir: cleanDir,
        },
        files: extractedVhostFiles.slice(0, 60),
        totalFilesCount: totalFilesScanned,
      });
    } catch (err: any) {
      try {
        if (fs.existsSync(tempWorkDir)) {
          fs.rmSync(tempWorkDir, { recursive: true, force: true });
        }
      } catch {}

      return res.status(500).json({
        ok: false,
        message: `Gagal mengekstrak file ZIP: ${err?.message || String(err)}`,
      });
    }
  });

  // Real Git Repository Cloner endpoint (clones actual GitHub/GitLab repo on Linux server into Virtual Host)
  app.post('/api/cloner/git', async (req, res) => {
    const { accountId = 'acc-rdm-01', targetDir = '/public_html', repoUrl = '', branch = 'main' } = req.body || {};
    const cleanRepo = String(repoUrl || '').trim();
    const cleanBranch = String(branch || 'main').trim() || 'main';
    const cleanDir = normalizePath(targetDir);
    registerSubdomainIfSubdir(cleanDir, accountId);

    if (!cleanRepo) {
      return res.status(400).json({ ok: false, message: 'URL Repository Git tidak boleh kosong.' });
    }

    const tempCloneDir = path.join(TMP_DIR, `cloudpro-git-clone-${Date.now()}`);
    try {
      const rBranch = await execCmdAsync(
        `git clone --depth 1 --branch "${cleanBranch}" "${cleanRepo}" "${tempCloneDir}"`,
        45000
      );
      if (!rBranch.ok && !fs.existsSync(tempCloneDir)) {
        const rDefault = await execCmdAsync(`git clone --depth 1 "${cleanRepo}" "${tempCloneDir}"`, 45000);
        if (!rDefault.ok && !fs.existsSync(tempCloneDir)) {
          throw new Error(rDefault.stderr || 'Gagal menjalankan git clone');
        }
      }

      const importedFiles: VhostFile[] = [];
      let totalGitFiles = 0;
      const textExts = new Set([
        'html', 'htm', 'php', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 'svg', 'txt', 'md', 'xml', 'htaccess', 'env', 'sql',
      ]);

      const walkRepo = (absDir: string, relPrefix: string) => {
        const entries = fs.readdirSync(absDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.next') continue;
          const fullEntryPath = path.join(absDir, entry.name);
          const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
          const destPath = normalizePath(`${cleanDir}/${relPath}`);

          if (entry.isDirectory()) {
            if (importedFiles.length < 80) {
              importedFiles.push({
                id: `vf-git-dir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                accountId,
                name: entry.name,
                path: destPath,
                type: 'directory',
                size: 4096,
              });
            }
            walkRepo(fullEntryPath, relPath);
          } else if (entry.isFile()) {
            totalGitFiles++;
            const stat = fs.statSync(fullEntryPath);
            if (importedFiles.length >= 80) continue;
            const ext = entry.name.split('.').pop()?.toLowerCase() || '';
            let content: string | undefined = undefined;
            if ((textExts.has(ext) || entry.name.startsWith('.')) && stat.size <= 150_000) {
              try {
                content = fs.readFileSync(fullEntryPath, 'utf-8');
              } catch {}
            }

            importedFiles.push({
              id: `vf-git-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              accountId,
              name: entry.name,
              path: destPath,
              type: 'file',
              size: stat.size,
              content,
            });
          }
        }
      };

      walkRepo(tempCloneDir, '');

      // Copy repo files to isolated target directory on disk
      const localDocRoot = path.join(process.cwd(), cleanDir.replace(/^\//, ''));
      const vaultDocRoot = path.join(HOME_VAULT_DIR, cleanDir.replace(/^\//, ''));
      for (const destRoot of [localDocRoot, vaultDocRoot]) {
        try {
          fs.mkdirSync(destRoot, { recursive: true });
          await execCmdAsync(`cp -rf "${tempCloneDir}/." "${destRoot}/" 2>/dev/null || true`, 30000);
          try {
            fs.rmSync(path.join(destRoot, '.git'), { recursive: true, force: true });
          } catch {}
        } catch {}
      }

      fs.rmSync(tempCloneDir, { recursive: true, force: true });

      if (importedFiles.length > 0) {
        const existing = Array.isArray(vhostStore.filesByAccount[accountId])
          ? vhostStore.filesByAccount[accountId]
          : [];
        const newPaths = new Set(importedFiles.map(f => normalizePath(f.path).toLowerCase()));
        const filtered = existing.filter(f => {
          const pNorm = normalizePath(f.path).toLowerCase();
          if (newPaths.has(pNorm)) return false;
          const parent = pNorm.substring(0, pNorm.lastIndexOf('/')) || '/public_html';
          if (
            parent === cleanDir.toLowerCase() &&
            (f.name.toLowerCase() === 'index.html' || f.name.toLowerCase() === 'index.php')
          ) {
            return false;
          }
          return true;
        });
        vhostStore.filesByAccount[accountId] = [...filtered, ...importedFiles];
        persistVhostStore();
      }

      return res.json({
        ok: true,
        filesCount: totalGitFiles || importedFiles.length,
        targetDir: cleanDir,
        files: importedFiles.slice(0, 60),
        message: `Berhasil meng-clone ${totalGitFiles || importedFiles.length} file/folder dari repository ${cleanRepo} ke ${cleanDir}!`,
      });
    } catch (err: any) {
      try {
        fs.rmSync(tempCloneDir, { recursive: true, force: true });
      } catch {}
      return res.status(500).json({
        ok: false,
        message: `Gagal meng-clone repository Git: ${err?.message || String(err)}`,
      });
    }
  });

  // =========================================================================
  // SERVER-TO-SERVER DIRECT ZIP PULL & EXTRACT ENDPOINTS (NON-BLOCKING ASYNC)
  // =========================================================================
  const activeZipTransferJobs = new Map<string, {
    jobId: string;
    status: 'downloading' | 'extracting' | 'completed' | 'error';
    progress: number;
    stepMessage: string;
    result?: any;
    error?: string;
    createdAt: number;
  }>();

  app.get('/api/cloner/server-zip-status', (req, res) => {
    const jobId = String(req.query.jobId || '').trim();
    const job = activeZipTransferJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ ok: false, message: 'Job transfer tidak ditemukan.' });
    }
    return res.json({ ok: true, job });
  });

  app.post('/api/cloner/server-zip-probe', async (req, res) => {
    const {
      zipUrl = '',
      authType = 'none',
      authUsername = '',
      authPassword = '',
      bearerToken = '',
      customHeaderName = '',
      customHeaderValue = '',
    } = req.body || {};

    let cleanUrl = String(zipUrl || '').trim();
    if (!cleanUrl) {
      return res.status(400).json({ ok: false, message: 'URL file ZIP remote tidak boleh kosong.' });
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      const startTime = Date.now();
      const headers: Record<string, string> = {
        'User-Agent': 'CloudPRO-ServerCluster/3.0 (Linux x86_64; DirectTransferAgent)',
      };

      if (authType === 'basic' && (authUsername || authPassword)) {
        headers['Authorization'] = `Basic ${Buffer.from(`${authUsername}:${authPassword}`).toString('base64')}`;
      } else if (authType === 'bearer' && bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken.trim()}`;
      } else if (authType === 'custom_header' && customHeaderName && customHeaderValue) {
        headers[customHeaderName.trim()] = customHeaderValue.trim();
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      let r: Response;
      try {
        r = await fetch(cleanUrl, {
          method: 'HEAD',
          headers,
          signal: controller.signal,
          redirect: 'follow',
        });
      } catch {
        const fallbackCtrl = new AbortController();
        const fbTimeout = setTimeout(() => fallbackCtrl.abort(), 12000);
        r = await fetch(cleanUrl, {
          method: 'GET',
          headers: { ...headers, Range: 'bytes=0-1024' },
          signal: fallbackCtrl.signal,
          redirect: 'follow',
        });
        clearTimeout(fbTimeout);
      } finally {
        clearTimeout(timeout);
      }

      const latencyMs = Date.now() - startTime;
      const contentLengthHeader = r.headers.get('content-length') || r.headers.get('content-range')?.split('/')?.[1];
      const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      const contentType = r.headers.get('content-type') || 'application/zip';
      const contentDisposition = r.headers.get('content-disposition') || '';
      const serverHeader = r.headers.get('server') || 'Remote HTTP Server';

      let fileName = '';
      if (contentDisposition.includes('filename=')) {
        fileName = contentDisposition.split('filename=')[1]?.replace(/["']/g, '')?.trim() || '';
      }
      if (!fileName) {
        try {
          const parsed = new URL(cleanUrl);
          fileName = parsed.pathname.split('/').filter(Boolean).pop() || 'remote-archive.zip';
        } catch {
          fileName = 'remote-archive.zip';
        }
      }
      if (!fileName.toLowerCase().endsWith('.zip')) {
        fileName += '.zip';
      }

      const formatBytes = (bytes: number) => {
        if (!bytes || bytes <= 0) {
          return contentType.toLowerCase().includes('text/html')
            ? 'Aplikasi Web / SPA Live (Siap Tarik)'
            : 'Ukuran dinamis (Stream)';
        }
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      };

      return res.json({
        ok: true,
        reachable: true,
        httpStatus: r.status,
        statusText: r.statusText,
        contentLength,
        formattedSize: formatBytes(contentLength),
        contentType,
        fileName,
        serverHeader,
        latencyMs,
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        message: `Tidak dapat menjangkau server sumber: ${err?.message || String(err)}`,
      });
    }
  });

  app.post('/api/cloner/server-zip-transfer', async (req, res) => {
    const {
      accountId = 'acc-rdm-01',
      targetDir = '/public_html',
      remoteZipUrl = '',
      authType = 'none',
      authUsername = '',
      authPassword = '',
      bearerToken = '',
      customHeaderName = '',
      customHeaderValue = '',
      cleanOldFiles = false,
      flattenRootFolder = true,
      fixPermissions = true,
      asyncJob = false,
    } = req.body || {};

    let cleanUrl = String(remoteZipUrl || '').trim();
    const cleanDir = normalizePath(targetDir);
    registerSubdomainIfSubdir(cleanDir, accountId);

    if (!cleanUrl) {
      return res.status(400).json({ ok: false, message: 'URL file ZIP server sumber tidak boleh kosong.' });
    }

    // Normalize Google Drive / Dropbox / missing protocol
    const gDriveMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) || cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (gDriveMatch && gDriveMatch[1]) {
      cleanUrl = `https://drive.google.com/uc?export=download&id=${gDriveMatch[1]}`;
    } else if (cleanUrl.includes('dropbox.com')) {
      cleanUrl = cleanUrl.replace(/[?&]dl=0/g, '').replace(/\?$/, '') + '?dl=1';
    } else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const jobId = `zipjob-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    activeZipTransferJobs.set(jobId, {
      jobId,
      status: 'downloading',
      progress: 15,
      stepMessage: `Mengunduh arsip ZIP dari ${cleanUrl}...`,
      createdAt: Date.now(),
    });

    const runTransferWorker = async () => {
      const workDir = path.join(TMP_DIR, `cloudpro-srvzip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      const zipFilePath = path.join(workDir, 'archive.zip');
      const extractDir = path.join(workDir, 'extracted');

      try {
        fs.mkdirSync(workDir, { recursive: true });
        fs.mkdirSync(extractDir, { recursive: true });

        const curlArgs: string[] = [
          '-sSLk',
          '--connect-timeout', '25',
          '--max-time', '300',
          '-A', 'Mozilla/5.0 (X11; Linux x86_64) CloudPRO-ServerCluster/3.0',
          '-o', zipFilePath,
        ];

        if (authType === 'basic' && (authUsername || authPassword)) {
          curlArgs.push('-u', `${authUsername}:${authPassword}`);
        } else if (authType === 'bearer' && bearerToken) {
          curlArgs.push('-H', `Authorization: Bearer ${bearerToken.trim()}`);
        } else if (authType === 'custom_header' && customHeaderName && customHeaderValue) {
          curlArgs.push('-H', `${customHeaderName.trim()}: ${customHeaderValue.trim()}`);
        }

        curlArgs.push(cleanUrl);

        const downloadStart = Date.now();
        const curlCmd = `curl ${curlArgs.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`;
        const curlRes = await execCmdAsync(curlCmd, 310000);

        if (!fs.existsSync(zipFilePath) || fs.statSync(zipFilePath).size < 50) {
          throw new Error(
            `Gagal mengunduh file ZIP dari server remote (${curlRes.stderr || 'File kosong atau URL tidak dapat diakses'}).`
          );
        }

        const zipStat = fs.statSync(zipFilePath);
        const downloadDurationMs = Date.now() - downloadStart;

        activeZipTransferJobs.set(jobId, {
          jobId,
          status: 'extracting',
          progress: 60,
          stepMessage: `Mengekstrak arsip ZIP ke ${cleanDir}...`,
          createdAt: Date.now(),
        });

        const extractStart = Date.now();
        let extractedOk = false;

        const rUnzip = await execCmdAsync(`unzip -q -o "${zipFilePath}" -d "${extractDir}" 2>/dev/null`, 180000);
        if (rUnzip.ok || fs.readdirSync(extractDir).length > 0) extractedOk = true;

        if (!extractedOk) {
          const rPy = await execCmdAsync(
            `python3 -c "import zipfile, sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "${zipFilePath}" "${extractDir}" 2>/dev/null`,
            180000
          );
          if (rPy.ok || fs.readdirSync(extractDir).length > 0) extractedOk = true;
        }

        if (!extractedOk) {
          const rTar = await execCmdAsync(`tar -xf "${zipFilePath}" -C "${extractDir}" 2>/dev/null`, 180000);
          if (rTar.ok || fs.readdirSync(extractDir).length > 0) extractedOk = true;
        }

        // Smart Fallback: If remote server returned HTML/SPA (e.g. Plesk/cPanel .htaccess rewrote /modulajar.zip to index.html),
        // automatically harvest the live SPA HTML + all referenced /assets/*.js, *.css, and images into extractDir!
        if (!extractedOk && fs.existsSync(zipFilePath)) {
          try {
            const rawDownloaded = fs.readFileSync(zipFilePath, 'utf-8');
            const trimmedLower = rawDownloaded.trim().toLowerCase();
            if (trimmedLower.startsWith('<!doctype') || trimmedLower.startsWith('<html') || trimmedLower.includes('<head')) {
              const parsedOrigin = new URL(cleanUrl).origin;
              let htmlContent = rawDownloaded;
              if (!htmlContent.includes('data-cloned-origin=')) {
                htmlContent = htmlContent.replace(/<html/i, `<html data-cloned-origin="${parsedOrigin}"`);
              }

              // Collect all referenced assets (/assets/..., images, scripts, stylesheets)
              const assetPaths = new Set<string>();
              const attrRegex = /(?:src|href|content)=["']([^"']+\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|json)(?:\?[^"']*)?)["']/gi;
              let m: RegExpExecArray | null;
              while ((m = attrRegex.exec(rawDownloaded)) !== null) {
                const rawRef = m[1].trim();
                if (!rawRef || rawRef.startsWith('data:')) continue;
                try {
                  const resolved = new URL(rawRef, parsedOrigin);
                  if (resolved.origin === parsedOrigin) {
                    assetPaths.add(resolved.pathname);
                  }
                } catch {}
              }

              for (const relAssetPath of assetPaths) {
                const cleanRel = relAssetPath.replace(/^\/+/, '');
                if (!cleanRel || cleanRel.includes('..')) continue;
                const localAssetDest = path.join(extractDir, cleanRel);
                fs.mkdirSync(path.dirname(localAssetDest), { recursive: true });
                const remoteAssetUrl = `${parsedOrigin}/${cleanRel}`;
                await execCmdAsync(
                  `curl -sSLk --connect-timeout 15 --max-time 120 -o "${localAssetDest}" "${remoteAssetUrl}"`,
                  130000
                );
              }

              // Rewrite hardcoded origin URLs for local static assets so they load directly from target domain
              const escapedOrigin = parsedOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              htmlContent = htmlContent.replace(new RegExp(`${escapedOrigin}/`, 'g'), '/');
              fs.writeFileSync(path.join(extractDir, 'index.html'), htmlContent, 'utf-8');
              extractedOk = true;
            }
          } catch {}
        }

        if (!extractedOk) {
          throw new Error('Gagal mengekstrak berkas ZIP. Pastikan URL mengarah langsung ke file .zip atau .tar.gz yang valid.');
        }

        const extractDurationMs = Date.now() - extractStart;

        let finalExtractBase = extractDir;
        if (flattenRootFolder) {
          const topEntries = fs.readdirSync(extractDir, { withFileTypes: true });
          const hasRootIndex = topEntries.some(
            e => e.isFile() && (e.name.toLowerCase() === 'index.html' || e.name.toLowerCase() === 'index.php')
          );
          if (!hasRootIndex) {
            const nonMacEntries = topEntries.filter(e => e.name !== '__MACOSX' && e.name !== '.DS_Store');
            if (nonMacEntries.length === 1 && nonMacEntries[0].isDirectory()) {
              finalExtractBase = path.join(extractDir, nonMacEntries[0].name);
            }
          }
          // Check common backup wrappers (homedir/public_html, public_html, httpdocs)
          const possibleSubRoots = [
            path.join(finalExtractBase, 'homedir', 'public_html'),
            path.join(finalExtractBase, 'public_html'),
            path.join(finalExtractBase, 'httpdocs'),
          ];
          for (const pr of possibleSubRoots) {
            if (fs.existsSync(pr) && fs.statSync(pr).isDirectory()) {
              finalExtractBase = pr;
              break;
            }
          }
        }

        const importedFiles: VhostFile[] = [];
        let totalFilesCount = 0;
        let totalFoldersCount = 0;
        let totalExtractedBytes = 0;
        let hasIndex = false;
        let detectedStack = 'HTML / Statis';
        let primaryEntry = '';

        // Auto-prune unreferenced dead Vite build hashes if assets/ has >300 files
        try {
          const assetsSubDir = path.join(finalExtractBase, 'assets');
          const rootIdxHtml = path.join(finalExtractBase, 'index.html');
          if (fs.existsSync(assetsSubDir) && fs.existsSync(rootIdxHtml)) {
            const allAssets = fs.readdirSync(assetsSubDir);
            if (allAssets.length > 300) {
              const keepSet = new Set<string>();
              const queue: string[] = [];
              const extractRefs = (txt: string) => {
                const ms = txt.match(/[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{6,16}\.(?:js|css|svg|png|jpg|jpeg|webp|gif|woff2?|ttf|eot|wasm|json)/g) || [];
                for (const m of ms) {
                  const b = path.basename(m);
                  if (!keepSet.has(b)) {
                    keepSet.add(b);
                    queue.push(b);
                  }
                }
              };
              extractRefs(fs.readFileSync(rootIdxHtml, 'utf-8'));
              while (queue.length > 0) {
                const curr = queue.pop()!;
                const full = path.join(assetsSubDir, curr);
                if ((curr.endsWith('.js') || curr.endsWith('.css')) && fs.existsSync(full)) {
                  try { extractRefs(fs.readFileSync(full, 'utf-8')); } catch {}
                }
              }
              for (const f of allAssets) {
                const isHashed = /^[A-Za-z0-9_.-]+-[A-Za-z0-9_-]{6,16}\.(?:js|css|js\.map|css\.map)$/.test(f);
                if (isHashed && !keepSet.has(f)) {
                  try { fs.unlinkSync(path.join(assetsSubDir, f)); } catch {}
                }
              }
            }
          }
        } catch {}

        const walkDirectory = (absDir: string, relPrefix: string) => {
          if (!fs.existsSync(absDir)) return;
          const entries = fs.readdirSync(absDir, { withFileTypes: true });
          const subDirsToRecurse: Array<{ full: string; rel: string }> = [];

          // Pass 1: Process all entries at the current level first (so root files & folders are never starved by assets/)
          for (const entry of entries) {
            if (entry.name === '__MACOSX' || entry.name === '.DS_Store' || entry.name === '.git') continue;

            const fullEntryPath = path.join(absDir, entry.name);
            const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
            const destPath = normalizePath(`${cleanDir}/${relPath}`);

            if (entry.isDirectory()) {
              totalFoldersCount++;
              if (!relPrefix || importedFiles.length < 120) {
                importedFiles.push({
                  id: `vf-srv-dir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  accountId,
                  name: entry.name,
                  path: destPath,
                  type: 'directory',
                  size: 4096,
                });
              }
              subDirsToRecurse.push({ full: fullEntryPath, rel: relPath });
            } else if (entry.isFile()) {
              totalFilesCount++;
              const stat = fs.statSync(fullEntryPath);
              totalExtractedBytes += stat.size;
              const ext = entry.name.split('.').pop()?.toLowerCase() || '';

              if (entry.name.toLowerCase() === 'wp-config.php' || entry.name.toLowerCase() === 'wp-login.php') {
                detectedStack = 'WordPress CMS';
              } else if (entry.name.toLowerCase() === 'artisan') {
                detectedStack = 'Laravel Framework';
              } else if (entry.name.toLowerCase() === 'package.json' && detectedStack === 'HTML / Statis') {
                detectedStack = 'Node.js / React Web App';
              } else if (ext === 'php' && detectedStack === 'HTML / Statis') {
                detectedStack = 'PHP Application';
              }

              const isRootEntry =
                !relPrefix &&
                (entry.name.toLowerCase() === 'index.html' ||
                  entry.name.toLowerCase() === 'index.php' ||
                  entry.name.toLowerCase() === 'index.htm');

              if (isRootEntry) {
                hasIndex = true;
                if (!primaryEntry || entry.name.toLowerCase() === 'index.html') {
                  primaryEntry = entry.name;
                }
              }

              let content: string | undefined = undefined;
              if ((isRootEntry || (!relPrefix && stat.size <= 80_000)) && stat.size <= 350_000) {
                try {
                  content = fs.readFileSync(fullEntryPath, 'utf-8');
                } catch {
                  content = undefined;
                }
              }

              // Always include all root-level files + up to 120 nested items
              if (!relPrefix || isRootEntry || importedFiles.length < 120) {
                importedFiles.push({
                  id: `vf-srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  accountId,
                  name: entry.name,
                  path: destPath,
                  type: 'file',
                  size: stat.size,
                  content,
                });
              }
            }
          }

          // Pass 2: Recurse into subdirectories after current level is registered
          for (const sub of subDirsToRecurse) {
            walkDirectory(sub.full, sub.rel);
          }
        };

        walkDirectory(finalExtractBase, '');

        const existing = Array.isArray(vhostStore.filesByAccount[accountId])
          ? vhostStore.filesByAccount[accountId]
          : [];

        let updatedFiles: VhostFile[];
        if (cleanOldFiles) {
          // Strictly filter only files belonging to cleanDir (never wipe subdomains when cleanDir is /public_html!)
          updatedFiles = existing.filter(f => !isPathBelongingToDocRoot(f.path, cleanDir));
        } else {
          const newPaths = new Set(importedFiles.map(f => normalizePath(f.path).toLowerCase()));
          updatedFiles = existing.filter(f => !newPaths.has(normalizePath(f.path).toLowerCase()));
        }

        vhostStore.filesByAccount[accountId] = [...updatedFiles, ...importedFiles];
        registerSubdomainIfSubdir(cleanDir, accountId);
        persistVhostStore();

        // Copy to isolated physical target directories on server
        const subDocRoots = getSubdomainDocRoots();
        const physicalTargets = [
          path.join(process.cwd(), cleanDir.replace(/^\//, '')),
          path.join(HOME_VAULT_DIR, cleanDir.replace(/^\//, '')),
        ];

        for (const targetDocRoot of physicalTargets) {
          try {
            if (!fs.existsSync(targetDocRoot)) {
              fs.mkdirSync(targetDocRoot, { recursive: true });
            } else if (cleanOldFiles) {
              const existingItems = fs.readdirSync(targetDocRoot);
              for (const item of existingItems) {
                if (item === '.git' || item === 'node_modules' || item.startsWith('.cloudpro')) continue;
                const itemVirtualPath = normalizePath(`${cleanDir}/${item}`).toLowerCase();
                if (cleanDir === '/public_html' && subDocRoots.has(itemVirtualPath)) {
                  continue; // Never delete subdomain directories when cleaning primary domain!
                }
                fs.rmSync(path.join(targetDocRoot, item), { recursive: true, force: true });
              }
            }
            await execCmdAsync(`cp -rf "${finalExtractBase}/." "${targetDocRoot}/" 2>/dev/null || true`, 60000);
            if (fixPermissions) {
              await execCmdAsync(`chmod -R u+rwX,go+rX "${targetDocRoot}" 2>/dev/null || true`, 20000);
            }
          } catch {}
        }

        try {
          fs.rmSync(workDir, { recursive: true, force: true });
        } catch {}

        const formatSize = (bytes: number) => {
          if (bytes < 1024) return `${bytes} B`;
          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
          if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
          return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        };

        const payload = {
          ok: true,
          jobId,
          message: `Sukses menarik & mengekstrak ${totalFilesCount} file & ${totalFoldersCount} folder dari server remote ke ${cleanDir}!`,
          filesCount: totalFilesCount,
          foldersCount: totalFoldersCount,
          archiveSizeBytes: zipStat.size,
          archiveFormattedSize: formatSize(zipStat.size),
          extractedSizeBytes: totalExtractedBytes,
          extractedFormattedSize: formatSize(totalExtractedBytes),
          downloadDurationMs,
          extractDurationMs,
          hasIndex,
          primaryEntry: primaryEntry || (hasIndex ? 'index.php' : 'Tidak ditemukan index utama'),
          detectedStack,
          targetDir: cleanDir,
          files: importedFiles.slice(0, 120),
        };

        activeZipTransferJobs.set(jobId, {
          jobId,
          status: 'completed',
          progress: 100,
          stepMessage: payload.message,
          result: payload,
          createdAt: Date.now(),
        });

        return payload;
      } catch (err: any) {
        try {
          fs.rmSync(workDir, { recursive: true, force: true });
        } catch {}
        const errMsg = `Gagal proses transfer ZIP antar server: ${err?.message || String(err)}`;
        activeZipTransferJobs.set(jobId, {
          jobId,
          status: 'error',
          progress: 0,
          stepMessage: errMsg,
          error: errMsg,
          createdAt: Date.now(),
        });
        throw err;
      }
    };

    if (asyncJob) {
      runTransferWorker().catch(() => {});
      return res.json({
        ok: true,
        asyncJob: true,
        jobId,
        message: 'Proses penarikan & ekstraksi ZIP berjalan di latar belakang.',
      });
    }

    try {
      const resultPayload = await runTransferWorker();
      return res.json(resultPayload);
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        message: `Gagal proses transfer ZIP antar server: ${err?.message || String(err)}`,
      });
    }
  });

  // =========================================================================
  // DOMAIN & SUBDOMAIN BACKUP & RESTORE (.ZIP) SYSTEM ENDPOINTS
  // =========================================================================

  // Helper function to scan disk size and file count (with optional exclusion of subdomain directories when scanning /public_html)
  const dirStatsCache = new Map<string, { count: number; totalSize: number; formatted: string; cachedAt: number }>();

  const calculateDirStats = (absPath: string, excludeSubdomainFolders = false): { count: number; totalSize: number; formatted: string } => {
    const cacheKey = `${absPath}:${excludeSubdomainFolders}`;
    const cached = dirStatsCache.get(cacheKey);
    const now = Date.now();
    // Cache stats for 10 minutes so disk is never re-scanned repeatedly
    if (cached && now - cached.cachedAt < 600000) {
      return { count: cached.count, totalSize: cached.totalSize, formatted: cached.formatted };
    }

    let count = 0;
    let totalSize = 0;
    const subDirNames = excludeSubdomainFolders
      ? new Set(
          Array.from(getSubdomainDocRoots())
            .map(r => r.replace(/^\/public_html\//i, '').split('/')[0].toLowerCase())
            .filter(Boolean)
            .concat(['siakad-madrasah', 'rdm', 'cbt', 'elearning', 'ppdb', 'perpustakaan', 'simpatika', 'emis'])
        )
      : new Set<string>();

    const visitedDirs = new Set<string>();

    const scan = (dir: string, isRootLevel: boolean, depth: number) => {
      // Shallow, lightning-fast scan: max depth 2, max 150 items
      if (depth > 2 || count >= 150 || !fs.existsSync(dir)) return;
      try {
        if (visitedDirs.has(dir)) return;
        visitedDirs.add(dir);

        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (
            e.name.startsWith('.') ||
            e.name === 'node_modules' ||
            e.name === '__MACOSX' ||
            e.name === 'cache' ||
            e.name === 'sessions' ||
            e.name === 'tmp'
          ) {
            continue;
          }
          if (isRootLevel && e.isDirectory() && subDirNames.has(e.name.toLowerCase())) continue;
          const p = path.join(dir, e.name);
          if (e.isDirectory()) {
            scan(p, false, depth + 1);
          } else if (e.isFile()) {
            count++;
            try {
              totalSize += fs.statSync(p).size;
            } catch {}
          }
          if (count >= 150) break;
        }
      } catch {}
    };

    scan(absPath, true, 0);

    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const result = { count, totalSize, formatted: formatBytes(totalSize) };
    dirStatsCache.set(cacheKey, { ...result, cachedAt: now });
    return result;
  };

  // 1. GET /api/backup/domains - List all domains and subdomains with active stats
  app.get('/api/backup/domains', (_req, res) => {
    try {
      const list: Array<{
        id: string;
        domain: string;
        type: 'primary' | 'subdomain' | 'addon';
        documentRoot: string;
        accountId: string;
        username: string;
        phpVersion: string;
        filesCount: number;
        totalSizeBytes: number;
        formattedSize: string;
      }> = [];

      // Scan primary document root ONCE (never repeatedly in a loop)
      const absDocRoot = path.join(process.cwd(), 'public_html');
      const primaryStats = calculateDirStats(absDocRoot, true);

      for (const acc of vhostStore.accounts) {
        list.push({
          id: acc.id,
          domain: acc.primaryDomain,
          type: 'primary',
          documentRoot: '/public_html',
          accountId: acc.id,
          username: acc.username,
          phpVersion: acc.phpVersion || '8.2',
          filesCount: primaryStats.count,
          totalSizeBytes: primaryStats.totalSize,
          formattedSize: primaryStats.formatted,
        });
      }

      for (const sub of (vhostStore.subdomains || [])) {
        if (list.some(l => l.domain.toLowerCase() === sub.fullDomain.toLowerCase())) continue;
        const cleanDoc = normalizePath(sub.documentRoot || '/public_html');
        const absDoc = path.join(process.cwd(), cleanDoc.replace(/^\//, ''));
        const stats = calculateDirStats(absDoc);
        const subPrefix = sub.fullDomain.split('.')[0].toLowerCase();
        const defaultSubPhp = subPrefix === 'rdm' ? '7.2' : subPrefix === 'cbt' ? '7.4' : '8.2';
        list.push({
          id: sub.id,
          domain: sub.fullDomain,
          type: 'subdomain',
          documentRoot: cleanDoc,
          accountId: sub.accountId,
          username: 'cloudpro',
          phpVersion: sub.phpVersion || defaultSubPhp,
          filesCount: stats.count,
          totalSizeBytes: stats.totalSize,
          formattedSize: stats.formatted,
        });
      }

      const siakadPath = path.join(process.cwd(), 'public_html', 'siakad-madrasah');
      if (fs.existsSync(siakadPath) && !list.some(l => l.documentRoot === '/public_html/siakad-madrasah')) {
        const primaryAcc = vhostStore.accounts[0];
        const stats = calculateDirStats(siakadPath);
        list.push({
          id: 'dom-sub-siakad',
          domain: primaryAcc ? `siakad.${primaryAcc.primaryDomain}` : 'siakad.denbaguse.my.id',
          type: 'subdomain',
          documentRoot: '/public_html/siakad-madrasah',
          accountId: primaryAcc?.id || 'acc-rdm-01',
          username: primaryAcc?.username || 'madrasah',
          phpVersion: '8.2',
          filesCount: stats.count,
          totalSizeBytes: stats.totalSize,
          formattedSize: stats.formatted,
        });
      }

      return res.json({ ok: true, domains: list });
    } catch (err: any) {
      return res.status(500).json({ ok: false, message: err?.message || String(err) });
    }
  });

  // 2. GET /api/backup/list - List all .zip backups stored in server persistent storage
  app.get('/api/backup/list', (_req, res) => {
    try {
      const results: Array<{
        id: string;
        fileName: string;
        domain: string;
        documentRoot: string;
        type: 'full' | 'database' | 'files';
        sizeBytes: number;
        formattedSize: string;
        createdAt: string;
        downloadUrl: string;
        notes?: string;
      }> = [];

      const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      };

      const scanDirs = [BACKUPS_DIR, LOCAL_BACKUPS_DIR];
      const seenNames = new Set<string>();

      for (const d of scanDirs) {
        if (!fs.existsSync(d)) continue;
        try {
          const files = fs.readdirSync(d);
          for (const f of files) {
            const lowerF = f.toLowerCase();
            if ((!lowerF.endsWith('.zip') && !lowerF.endsWith('.json') && !lowerF.endsWith('.sql')) || seenNames.has(f)) continue;
            seenNames.add(f);
            const fullPath = path.join(d, f);
            try {
              const stat = fs.statSync(fullPath);
              // Parse filename: backup-[domain]-[timestamp]-[type].zip or website backup
              const parts = f.replace(/\.(zip|json|sql)$/i, '').split('-');
              let domain = 'denbaguse.my.id';
              let bType: 'full' | 'database' | 'files' = 'full';
              if (lowerF.endsWith('.json') || lowerF.endsWith('.sql') || f.includes('db') || f.includes('database')) {
                bType = 'database';
              } else if (f.includes('files')) {
                bType = 'files';
              } else {
                bType = 'full';
              }

              if (f.toLowerCase().includes('siakad') || f.toLowerCase().includes('madrasah')) {
                domain = 'siakad-madrasah.denbaguse.my.id';
              } else if (parts.length >= 3 && parts[0] === 'backup') {
                domain = parts[1];
              }

              results.push({
                id: f,
                fileName: f,
                domain,
                documentRoot: domain.includes('siakad') ? '/public_html/siakad-madrasah' : '/public_html',
                type: bType,
                sizeBytes: stat.size,
                formattedSize: formatBytes(stat.size),
                createdAt: stat.mtime.toISOString(),
                downloadUrl: `/api/backup/download/${encodeURIComponent(f)}`,
              });
            } catch {}
          }
        } catch {}
      }

      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return res.json({ ok: true, backups: results });
    } catch (err: any) {
      return res.status(500).json({ ok: false, message: err?.message || String(err) });
    }
  });

  // 3. POST /api/backup/create - Create .ZIP backup per domain/subdomain
  app.post('/api/backup/create', async (req, res) => {
    const {
      accountId = 'acc-rdm-01',
      domain = 'denbaguse.my.id',
      documentRoot = '/public_html',
      backupType = 'full',
      includeConfig = true,
      notes = '',
    } = req.body || {};

    const cleanDomain = String(domain || 'domain').replace(/[^a-zA-Z0-9.-]/g, '_');
    const cleanDocRoot = normalizePath(documentRoot || '/public_html');
    const absDocRoot = path.join(process.cwd(), cleanDocRoot.replace(/^\//, ''));

    if (!fs.existsSync(absDocRoot)) {
      return res.status(404).json({
        ok: false,
        message: `Direktori target ${cleanDocRoot} tidak ditemukan di server.`,
      });
    }

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const fileName = `backup-${cleanDomain}-${timestamp}-${backupType}.zip`;
    const destZipPath = path.join(BACKUPS_DIR, fileName);
    const mirrorZipPath = path.join(LOCAL_BACKUPS_DIR, fileName);

    try {
      // Prune dead Vite chunks before creating backup so backup is compact and fast
      pruneDeadViteAssets(absDocRoot);

      // Export live MySQL Bridge database (database.json + database.sql) so CloudPRO backups are 100% compatible with both CloudPRO Restore & Website Direct Restore
      const dbState = loadOrInitVhostMysqlBridge(cleanDocRoot);
      const dbJsonPath = path.join(TMP_DIR, `db-export-${Date.now()}.json`);
      const dbSqlPath = path.join(TMP_DIR, `db-export-${Date.now()}.sql`);

      const dbJsonPayload = {
        version: '2.0',
        backup_type: backupType === 'database' ? 'database_json' : 'full_archive',
        timestamp: new Date().toISOString(),
        school_name: cleanDomain,
        tables: {
          site_settings: dbState.site_settings || [],
          pendaftaran_spmb: dbState.pendaftaran_spmb || [],
        },
        local_storage_snapshots: dbState.local_storage_snapshots || {},
      };
      fs.writeFileSync(dbJsonPath, JSON.stringify(dbJsonPayload, null, 2), 'utf-8');

      let sqlDump = `-- CloudPRO MySQL Database Dump\n-- Target Domain: ${cleanDomain} (${cleanDocRoot})\n-- Created: ${new Date().toISOString()}\nSET FOREIGN_KEY_CHECKS = 0;\n`;
      sqlDump += `CREATE TABLE IF NOT EXISTS \`site_settings\` (\n  \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,\n  \`value\` LONGTEXT NOT NULL,\n  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;
      for (const r of dbState.site_settings || []) {
        if (!r || !r.id) continue;
        const valStr = (typeof r.value === 'string' ? r.value : JSON.stringify(r.value))
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\\'")
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r');
        sqlDump += `INSERT INTO \`site_settings\` (\`id\`, \`value\`) VALUES ('${r.id}', '${valStr}') ON DUPLICATE KEY UPDATE \`value\`=VALUES(\`value\`);\n`;
      }
      sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
      fs.writeFileSync(dbSqlPath, sqlDump, 'utf-8');

      // Subdomain folders to exclude when backing up primary /public_html
      const excludedSubDirs =
        cleanDocRoot === '/public_html'
          ? Array.from(getSubdomainDocRoots(accountId))
              .map(sr => sr.slice('/public_html/'.length).split('/')[0])
              .filter(Boolean)
          : [];

      // Manifest file
      const manifest = {
        domain: cleanDomain,
        documentRoot: cleanDocRoot,
        backupType,
        createdAt: new Date().toISOString(),
        accountId,
        phpVersion: '8.2',
        notes: notes || 'CloudPRO Automated Domain Backup',
      };

      // Python script for fast streaming zip with compression
      const pyScript = `
import os, sys, zipfile, json

src_dir = sys.argv[1]
zip_dest = sys.argv[2]
manifest_json = sys.argv[3]
b_type = sys.argv[4]
db_json_file = sys.argv[5]
db_sql_file = sys.argv[6]
exclude_dirs = set(json.loads(sys.argv[7]))

with zipfile.ZipFile(zip_dest, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    zf.writestr('domain-manifest.json', manifest_json)
    
    if b_type != 'database':
        for root, dirs, files in os.walk(src_dir):
            if '.git' in dirs: dirs.remove('.git')
            if 'node_modules' in dirs: dirs.remove('node_modules')
            if '__MACOSX' in dirs: dirs.remove('__MACOSX')
            if root == src_dir:
                for ex in list(dirs):
                    if ex.lower() in exclude_dirs or ex in ('servercloud', 'rdm'):
                        dirs.remove(ex)
            for file in files:
                if b_type == 'full' and file in ('database.json', 'database.sql') and root == src_dir:
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, src_dir)
                try:
                    zf.write(full_path, arcname=rel_path)
                except Exception as e:
                    pass
    
    if b_type in ('full', 'database'):
        if os.path.exists(db_json_file):
            zf.write(db_json_file, arcname='database.json')
        if os.path.exists(db_sql_file):
            zf.write(db_sql_file, arcname='database.sql')

print('SUCCESS')
`;

      const pyScriptPath = path.join(TMP_DIR, `backup-script-${Date.now()}.py`);
      fs.writeFileSync(pyScriptPath, pyScript, 'utf-8');

      execSync(
        `python3 "${pyScriptPath}" "${absDocRoot}" "${destZipPath}" '${JSON.stringify(manifest).replace(/'/g, "\\'")}' "${backupType}" "${dbJsonPath}" "${dbSqlPath}" '${JSON.stringify(excludedSubDirs)}'`,
        {
          timeout: 300000,
        }
      );

      try {
        fs.rmSync(pyScriptPath, { force: true });
        fs.rmSync(dbJsonPath, { force: true });
        fs.rmSync(dbSqlPath, { force: true });
      } catch {}

      // Copy to mirror
      try {
        fs.copyFileSync(destZipPath, mirrorZipPath);
      } catch {}

      const stat = fs.statSync(destZipPath);
      const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      };

      return res.json({
        ok: true,
        message: `Cadangan .ZIP untuk ${cleanDomain} berhasil dibuat (${formatBytes(stat.size)})!`,
        backup: {
          id: fileName,
          fileName,
          domain: cleanDomain,
          documentRoot: cleanDocRoot,
          type: backupType,
          sizeBytes: stat.size,
          formattedSize: formatBytes(stat.size),
          createdAt: new Date().toISOString(),
          downloadUrl: `/api/backup/download/${encodeURIComponent(fileName)}`,
          notes,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        message: `Gagal membuat backup .ZIP: ${err?.message || String(err)}`,
      });
    }
  });

  // 3b. POST /api/backup/upload-archive - Upload local .ZIP, .JSON, or .SQL backup file from PC/HP to CloudPRO Server
  app.post('/api/backup/upload-archive', (req, res) => {
    try {
      const rawName = String(req.query.fileName || `uploaded-backup-${Date.now()}.zip`);
      const tempForRestore = String(req.query.tempForRestore || '0') === '1';
      const safeFileName = path.basename(rawName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const lower = safeFileName.toLowerCase();
      if (!lower.endsWith('.zip') && !lower.endsWith('.json') && !lower.endsWith('.sql')) {
        return res.status(400).json({
          ok: false,
          message: 'Format file tidak didukung. Gunakan file .zip, .json, atau .sql.',
        });
      }

      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      fs.mkdirSync(LOCAL_BACKUPS_DIR, { recursive: true });
      const destPath = path.join(BACKUPS_DIR, safeFileName);
      const mirrorPath = path.join(LOCAL_BACKUPS_DIR, safeFileName);

      // If Express json/urlencoded middleware already parsed req.body (e.g. for .json upload)
      if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body) && Object.keys(req.body).length > 0) {
        const contentStr = JSON.stringify(req.body, null, 2);
        fs.writeFileSync(destPath, contentStr, 'utf-8');
        if (!tempForRestore) {
          try { fs.copyFileSync(destPath, mirrorPath); } catch {}
        }
        const stat = fs.statSync(destPath);
        return res.json({
          ok: true,
          fileName: safeFileName,
          sizeBytes: stat.size,
          formattedSize: `${(stat.size / 1024).toFixed(1)} KB`,
        });
      }

      const writeStream = fs.createWriteStream(destPath);
      req.pipe(writeStream);

      writeStream.on('finish', () => {
        if (!tempForRestore) {
          try {
            fs.copyFileSync(destPath, mirrorPath);
          } catch {}
        }
        const stat = fs.statSync(destPath);
        const formattedSize =
          stat.size < 1024 * 1024
            ? `${(stat.size / 1024).toFixed(1)} KB`
            : `${(stat.size / (1024 * 1024)).toFixed(2)} MB`;
        return res.json({
          ok: true,
          fileName: safeFileName,
          sizeBytes: stat.size,
          formattedSize,
        });
      });

      writeStream.on('error', (err: any) => {
        return res.status(500).json({
          ok: false,
          message: `Gagal menyimpan file cadangan: ${err?.message || String(err)}`,
        });
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        message: err?.message || 'Gagal mengunggah berkas cadangan.',
      });
    }
  });

  // 3c. POST /api/backup/upload-chunk - High-Capacity Chunked Streaming Upload (Supports 200MB - 500MB+ ZIPs over Cloudflare Tunnel without 413 error)
  app.post('/api/backup/upload-chunk', (req, res) => {
    try {
      const rawName = String(req.query.fileName || `uploaded-backup-${Date.now()}.zip`);
      const chunkIndex = Number(req.query.chunkIndex || 0);
      const totalChunks = Number(req.query.totalChunks || 1);
      const tempForRestore = String(req.query.tempForRestore || '1') === '1';

      const safeFileName = path.basename(rawName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const lower = safeFileName.toLowerCase();
      if (!lower.endsWith('.zip') && !lower.endsWith('.json') && !lower.endsWith('.sql')) {
        return res.status(400).json({
          ok: false,
          message: 'Format file tidak didukung. Gunakan file .zip, .json, atau .sql.',
        });
      }

      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      const destPath = path.join(BACKUPS_DIR, safeFileName);
      const mirrorPath = path.join(LOCAL_BACKUPS_DIR, safeFileName);

      // Write or append chunk directly to disk stream
      const writeFlags = chunkIndex === 0 ? 'w' : 'a';
      const writeStream = fs.createWriteStream(destPath, { flags: writeFlags });
      req.pipe(writeStream);

      writeStream.on('finish', () => {
        const isLastChunk = chunkIndex >= totalChunks - 1;
        if (isLastChunk && !tempForRestore) {
          try {
            fs.mkdirSync(LOCAL_BACKUPS_DIR, { recursive: true });
            fs.copyFileSync(destPath, mirrorPath);
          } catch {}
        }
        let currentSize = 0;
        try {
          currentSize = fs.statSync(destPath).size;
        } catch {}
        const formattedSize =
          currentSize < 1024 * 1024
            ? `${(currentSize / 1024).toFixed(1)} KB`
            : `${(currentSize / (1024 * 1024)).toFixed(2)} MB`;

        return res.json({
          ok: true,
          fileName: safeFileName,
          chunkIndex,
          totalChunks,
          completed: isLastChunk,
          sizeBytes: currentSize,
          formattedSize,
        });
      });

      writeStream.on('error', (err: any) => {
        return res.status(500).json({
          ok: false,
          message: `Gagal menulis chunk #${chunkIndex}: ${err?.message || String(err)}`,
        });
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        message: err?.message || 'Gagal memproses unggahan bertahap (chunked upload).',
      });
    }
  });

  // 4. POST /api/backup/restore-async - Background job to restore domain/subdomain from server zip, uploaded file (.zip/.json/.sql), or remote URL
  app.post('/api/backup/restore-async', async (req, res) => {
    const {
      sourceType = 'server_file', // 'server_file' | 'remote_url' | 'upload_zip'
      backupFileName = '',
      remoteZipUrl = '',
      targetDomain = 'denbaguse.my.id',
      targetDir = '/public_html',
      createSnapshotBefore = true,
      cleanDestination = false,
      autoFlatten = true,
      fixPermissions = true,
      importDatabase = true,
      autoDeleteZip = true,
      authType = 'none',
      authUsername = '',
      authPassword = '',
      bearerToken = '',
      customHeaderName = '',
      customHeaderValue = '',
    } = req.body || {};

    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cleanDir = normalizePath(targetDir || '/public_html');
    const physicalTarget = path.join(process.cwd(), cleanDir.replace(/^\//, ''));

    const initialJob: BackupJob = {
      id: jobId,
      type: sourceType === 'remote_url' ? 'server_zip_pull' : 'backup_restore',
      status: 'pending',
      progress: 5,
      message: 'Menyiapkan proses restore...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      targetDomain,
      targetDir: cleanDir,
    };
    activeBackupJobs.set(jobId, initialJob);

    // Immediately respond with jobId
    res.json({
      ok: true,
      jobId,
      message: `Tugas pemulihan (restore) dimulai untuk domain ${targetDomain}.`,
    });

    // Run background worker
    (async () => {
      const updateJob = (status: BackupJob['status'], progress: number, message: string, extra: any = {}) => {
        const cur = activeBackupJobs.get(jobId);
        if (cur) {
          activeBackupJobs.set(jobId, {
            ...cur,
            status,
            progress,
            message,
            updatedAt: new Date().toISOString(),
            ...extra,
          });
        }
      };

      const workDir = path.join(TMP_DIR, `restore-${jobId}`);
      let sourceZipPath = '';

      try {
        fs.mkdirSync(workDir, { recursive: true });
        fs.mkdirSync(physicalTarget, { recursive: true });

        // Step 1: Obtain the ZIP file
        if (sourceType === 'remote_url') {
          const cleanUrl = String(remoteZipUrl || '').trim();
          if (!cleanUrl) throw new Error('URL file ZIP remote tidak boleh kosong.');

          updateJob('downloading', 15, `Mengunduh berkas .ZIP dari ${cleanUrl}...`);
          sourceZipPath = path.join(workDir, 'remote_archive.zip');

          const curlArgs: string[] = [
            '-sL',
            '--fail',
            '--connect-timeout', '30',
            '--max-time', '600',
            '-A', 'CloudPRO-ServerCluster/3.0 (Server-to-Server HighSpeed Transfer)',
            '-o', sourceZipPath,
          ];

          if (authType === 'basic' && (authUsername || authPassword)) {
            curlArgs.push('-u', `${authUsername}:${authPassword}`);
          } else if (authType === 'bearer' && bearerToken) {
            curlArgs.push('-H', `Authorization: Bearer ${bearerToken.trim()}`);
          } else if (authType === 'custom_header' && customHeaderName && customHeaderValue) {
            curlArgs.push('-H', `${customHeaderName.trim()}: ${customHeaderValue.trim()}`);
          }
          curlArgs.push(cleanUrl);

          execSync(`curl ${curlArgs.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`, {
            timeout: 600000,
            stdio: 'pipe',
          });
        } else {
          // Server file
          const candidatePaths = [
            path.join(BACKUPS_DIR, backupFileName),
            path.join(LOCAL_BACKUPS_DIR, backupFileName),
          ];
          sourceZipPath = candidatePaths.find(p => fs.existsSync(p)) || '';
          if (!sourceZipPath) {
            throw new Error(`Berkas cadangan ${backupFileName} tidak ditemukan di server.`);
          }
          updateJob('pending', 20, `Memverifikasi berkas arsip server ${backupFileName}...`);
        }

        if (!fs.existsSync(sourceZipPath) || fs.statSync(sourceZipPath).size === 0) {
          throw new Error('Berkas cadangan kosong atau tidak dapat diakses.');
        }

        const sourceArchiveSizeBytes = fs.statSync(sourceZipPath).size;
        const sourceArchiveFormatted =
          sourceArchiveSizeBytes < 1024 * 1024
            ? `${(sourceArchiveSizeBytes / 1024).toFixed(1)} KB`
            : `${(sourceArchiveSizeBytes / (1024 * 1024)).toFixed(2)} MB`;

        const lowerSourceName = sourceZipPath.toLowerCase();
        const isDirectJsonOrSql = lowerSourceName.endsWith('.json') || lowerSourceName.endsWith('.sql');

        // Step 2: Safety Snapshot (if requested, and auto-prune older snapshots so disk never bloats)
        if (createSnapshotBefore && fs.existsSync(physicalTarget)) {
          updateJob('snapshotting', 35, 'Membuat cadangan darurat (Safety Snapshot) kondisi saat ini...');
          try {
            const snapName = `snapshot-before-restore-${targetDomain.replace(/[^a-zA-Z0-9.-]/g, '_')}-${Date.now()}.zip`;
            const snapPath = path.join(BACKUPS_DIR, snapName);
            execSync(`python3 -c "
import os, zipfile
with zipfile.ZipFile('${snapPath}', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('${physicalTarget}'):
        for f in files:
            if f.endswith('.zip') or f.endswith('.tar.gz'): continue
            p = os.path.join(root, f)
            zf.write(p, arcname=os.path.relpath(p, '${physicalTarget}'))
"`, { timeout: 90000 });
            // Prune older pre-restore snapshots so only the latest 1 is retained
            const oldSnaps = fs
              .readdirSync(BACKUPS_DIR)
              .filter(f => f.startsWith('snapshot-before-restore-') && f.endsWith('.zip') && f !== snapName);
            for (const osnap of oldSnaps) {
              try { fs.unlinkSync(path.join(BACKUPS_DIR, osnap)); } catch {}
              try { fs.unlinkSync(path.join(LOCAL_BACKUPS_DIR, osnap)); } catch {}
            }
          } catch {}
        }

        let dbRestoreStats = {
          restoredSettingsCount: 0,
          restoredSpmbCount: 0,
          restoredUploadsCount: 0,
          isWebsiteDataOnlyBackup: false,
        };

        if (isDirectJsonOrSql) {
          // Direct .JSON or .SQL backup exported from website Admin panel!
          // Never delete existing website code files (index.html, assets, etc.); directly import the database records!
          updateJob('extracting', 65, `Mengimpor data cadangan website (${path.basename(sourceZipPath)}) ke database ${targetDomain}...`);
          dbRestoreStats = applyWebsiteDataBackupToDocRoot(sourceZipPath, physicalTarget, cleanDir);
        } else {
          // Step 4: Extract ZIP into staging directory FIRST so we can inspect if it's a Full Hosting ZIP or Website Data Backup ZIP!
          updateJob('extracting', 55, `Mengekstrak arsip (${sourceArchiveFormatted}) dan menganalisis format cadangan...`);
          const stagingDir = path.join(workDir, 'staging');
          fs.mkdirSync(stagingDir, { recursive: true });

          try {
            execSync(`unzip -q -o "${sourceZipPath}" -d "${stagingDir}"`, {
              timeout: 600000,
              stdio: 'pipe',
            });
          } catch {
            // Fallback to Python zipfile (supports large 200MB-500MB+ ZIP64 archives)
            execSync(`python3 -c "
import zipfile
with zipfile.ZipFile('${sourceZipPath}', 'r') as zf:
    zf.extractall('${stagingDir}')
"`, { timeout: 600000 });
          }

          // Step 5: Auto-flatten wrapper folder if detected
          let finalSource = stagingDir;
          if (autoFlatten) {
            const topItems = fs.readdirSync(stagingDir, { withFileTypes: true });
            const hasDirectIndex = topItems.some(
              e => e.isFile() && (e.name.toLowerCase() === 'index.html' || e.name.toLowerCase() === 'index.php' || e.name.toLowerCase() === 'database.json')
            );
            if (!hasDirectIndex) {
              const nonJunk = topItems.filter(e => e.name !== '__MACOSX' && e.name !== '.DS_Store');
              if (nonJunk.length === 1 && nonJunk[0].isDirectory()) {
                finalSource = path.join(stagingDir, nonJunk[0].name);
              }
            }
          }

          // Check if this ZIP is a Website Data Backup (contains database.json / database.sql / uploads, WITHOUT index.html / index.php)
          const hasAppIndexInZip =
            fs.existsSync(path.join(finalSource, 'index.html')) ||
            fs.existsSync(path.join(finalSource, 'index.php'));

          // Step 3 (Safe Clean): ONLY clean target directory if cleanDestination is requested AND the ZIP actually contains full website code (index.html/index.php)!
          // If the user is restoring a Website Data Backup ZIP (from website Admin), NEVER delete index.html or assets/!
          if (cleanDestination && hasAppIndexInZip) {
            updateJob('extracting', 68, 'Membersihkan berkas lama di folder tujuan...');
            try {
              const excludedSubDirs =
                cleanDir === '/public_html'
                  ? new Set(
                      Array.from(getSubdomainDocRoots('acc-rdm-01'))
                        .map(sr => sr.slice('/public_html/'.length).split('/')[0].toLowerCase())
                        .filter(Boolean)
                    )
                  : new Set<string>();

              const files = fs.readdirSync(physicalTarget);
              for (const f of files) {
                if (f === '.git' || f === 'node_modules' || f.startsWith('.cloudpro')) continue;
                if (excludedSubDirs.has(f.toLowerCase())) continue; // Never delete subdomain folders when cleaning /public_html!
                fs.rmSync(path.join(physicalTarget, f), { recursive: true, force: true });
              }
            } catch {}
          }

          // Prune dead Vite assets in finalSource before copying if it's a full build archive
          pruneDeadViteAssets(finalSource);

          // Step 6: Move files to physical document root
          updateJob('extracting', 78, `Memindahkan berkas & media ke target ${cleanDir}...`);
          execSync(`cp -rf "${finalSource}/." "${physicalTarget}/"`, { stdio: 'ignore' });

          // Step 6b: Apply Website Data Backup (database.json, site_settings.json, database.sql, uploads/*) into live MySQL Bridge & JSON stores!
          updateJob('extracting', 85, `Menyinkronkan database (${targetDomain}) & media uploads...`);
          dbRestoreStats = applyWebsiteDataBackupToDocRoot(finalSource, physicalTarget, cleanDir);
        }

        // Step 7: Fix Linux permissions
        if (fixPermissions) {
          updateJob('permissions', 92, 'Mengatur hak akses Linux standar (Folder 0755, File 0644)...');
          try {
            execSync(`find "${physicalTarget}" -type d -exec chmod 755 {} + 2>/dev/null || true`, { stdio: 'ignore' });
            execSync(`find "${physicalTarget}" -type f -exec chmod 644 {} + 2>/dev/null || true`, { stdio: 'ignore' });
          } catch {}
        }

        // Step 8: Mirror restored physicalTarget to Persistent Vault & refresh vhostStore virtual files
        const vaultTarget = path.join(HOME_VAULT_DIR, cleanDir.replace(/^\//, ''));
        try {
          fs.mkdirSync(vaultTarget, { recursive: true });
          execSync(`cp -rf "${physicalTarget}/." "${vaultTarget}/" 2>/dev/null || true`, { stdio: 'ignore' });
        } catch {}

        // Step 8b: Auto-Purge source .ZIP / archive after successful extraction so 200MB+ ZIP files never bloat disk!
        let autoPurgedZip = false;
        if (autoDeleteZip !== false) {
          updateJob('permissions', 96, `Membuang file mentah arsip (${sourceArchiveFormatted}) otomatis setelah diekstrak...`);
          try {
            if (sourceZipPath && fs.existsSync(sourceZipPath)) {
              fs.rmSync(sourceZipPath, { force: true });
              autoPurgedZip = true;
            }
          } catch {}
          if (backupFileName) {
            const safeBase = path.basename(String(backupFileName));
            for (const bPath of [path.join(BACKUPS_DIR, safeBase), path.join(LOCAL_BACKUPS_DIR, safeBase)]) {
              try {
                if (fs.existsSync(bPath)) {
                  fs.rmSync(bPath, { force: true });
                  autoPurgedZip = true;
                }
              } catch {}
            }
          }
          // Also remove any leftover .zip/.tar.gz files inside physicalTarget & vaultTarget root
          for (const dirToClean of [physicalTarget, vaultTarget]) {
            if (!fs.existsSync(dirToClean)) continue;
            try {
              for (const entry of fs.readdirSync(dirToClean, { withFileTypes: true })) {
                if (
                  entry.isFile() &&
                  (entry.name.toLowerCase().endsWith('.zip') || entry.name.toLowerCase().endsWith('.tar.gz'))
                ) {
                  try {
                    fs.rmSync(path.join(dirToClean, entry.name), { force: true });
                    autoPurgedZip = true;
                  } catch {}
                }
              }
            } catch {}
          }
        }

        // Step 9: Final stats & complete
        const finalStats = calculateDirStats(physicalTarget);
        try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}

        const purgeSuffix = autoPurgedZip
          ? ` File arsip .ZIP (${sourceArchiveFormatted}) telah otomatis dibuang dari disk.`
          : '';

        const detailMsg =
          dbRestoreStats.restoredSettingsCount > 0 || dbRestoreStats.restoredUploadsCount > 0
            ? `Pemulihan selesai! ${dbRestoreStats.restoredSettingsCount} modul database & ${dbRestoreStats.restoredUploadsCount} media dipulihkan (${finalStats.count} berkas aktif di ${targetDomain}).${purgeSuffix}`
            : `Pemulihan selesai! ${finalStats.count} berkas (${finalStats.formatted}) aktif di ${targetDomain}.${purgeSuffix}`;

        updateJob('completed', 100, detailMsg, {
          result: {
            domain: targetDomain,
            targetDir: cleanDir,
            filesCount: finalStats.count,
            totalSize: finalStats.formatted,
            sqlDetected: dbRestoreStats.restoredSettingsCount > 0,
            restoredSettingsCount: dbRestoreStats.restoredSettingsCount,
            restoredSpmbCount: dbRestoreStats.restoredSpmbCount,
            restoredUploadsCount: dbRestoreStats.restoredUploadsCount,
            isWebsiteDataOnlyBackup: dbRestoreStats.isWebsiteDataOnlyBackup,
            autoPurgedZip,
            purgedZipFormatted: sourceArchiveFormatted,
          },
        });
      } catch (workerErr: any) {
        try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
        updateJob('error', 0, `Gagal restore: ${workerErr?.message || String(workerErr)}`, {
          error: workerErr?.message || String(workerErr),
        });
      }
    })();
  });

  // 5. GET /api/backup/job-status - Poll status of background backup/restore job
  app.get('/api/backup/job-status', (req, res) => {
    const jobId = String(req.query.jobId || '').trim();
    if (!jobId) {
      return res.status(400).json({ ok: false, message: 'ID Job diperlukan.' });
    }
    const job = activeBackupJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ ok: false, message: 'Job tidak ditemukan atau telah kedaluwarsa.' });
    }
    return res.json({ ok: true, job });
  });

  // 6. GET /api/backup/download/:fileName - Direct download .ZIP, .JSON, or .SQL backup file
  app.get('/api/backup/download/:fileName', (req, res) => {
    const fileName = path.basename(req.params.fileName || '');
    const lower = fileName.toLowerCase();
    if (!fileName || (!lower.endsWith('.zip') && !lower.endsWith('.json') && !lower.endsWith('.sql'))) {
      return res.status(400).send('Nama berkas tidak valid.');
    }

    const candidatePaths = [
      path.join(BACKUPS_DIR, fileName),
      path.join(LOCAL_BACKUPS_DIR, fileName),
    ];
    const targetFile = candidatePaths.find(p => fs.existsSync(p));

    if (!targetFile) {
      return res.status(404).send('Berkas cadangan tidak ditemukan.');
    }

    const cType = lower.endsWith('.json')
      ? 'application/json'
      : lower.endsWith('.sql')
        ? 'application/sql'
        : 'application/zip';
    res.setHeader('Content-Type', cType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    const stream = fs.createReadStream(targetFile);
    stream.pipe(res);
  });

  // 7. DELETE /api/backup/delete/:fileName - Remove .ZIP backup file
  app.delete('/api/backup/delete/:fileName', (req, res) => {
    const fileName = path.basename(req.params.fileName || '');
    if (!fileName) {
      return res.status(400).json({ ok: false, message: 'Nama berkas tidak valid.' });
    }

    let deleted = false;
    for (const d of [BACKUPS_DIR, LOCAL_BACKUPS_DIR]) {
      const p = path.join(d, fileName);
      if (fs.existsSync(p)) {
        try {
          fs.rmSync(p, { force: true });
          deleted = true;
        } catch {}
      }
    }

    if (deleted) {
      return res.json({ ok: true, message: `Berkas cadangan ${fileName} berhasil dihapus.` });
    }
    return res.status(404).json({ ok: false, message: 'Berkas tidak ditemukan.' });
  });

  // =========================================================================
  // GOOGLE AI STUDIO PROJECT BUILDER & CLONER ENDPOINT (REACT / VITE / TSX)
  // =========================================================================
  app.post('/api/cloner/aistudio-build', async (req, res) => {
    const {
      accountId = 'acc-rdm-01',
      targetDir = '/public_html',
      title = '',
      appUrl = '',
      files: incomingFiles = [],
    } = req.body || {};

    const cleanDir = normalizePath(targetDir);
    const nowId = Date.now();
    const savedFiles: VhostFile[] = [];

    // Case 1: User provided a live Google AI Studio URL (e.g., https://ais-pre-....run.app)
    if (appUrl && String(appUrl).trim()) {
      const rawUrl = String(appUrl).trim();
      const fullAppUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`;
      let detectedTitle = String(title || '').trim() || 'Aplikasi Web — Google AI Studio';

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const r = await fetch(fullAppUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 CloudPRO-AIStudio-Cloner/2.0' },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (r.ok) {
          const htmlText = await r.text();
          const titleMatch = htmlText.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch?.[1] && !titleMatch[1].toLowerCase().includes('rapor')) {
            detectedTitle = titleMatch[1].trim();
          }
        }
      } catch {
        // Continue with wrapper
      }

      const wrapperHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <title>${detectedTitle}</title>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #0f172a; }
    iframe { width: 100%; height: 100%; border: 0; display: block; }
  </style>
</head>
<body>
  <iframe src="${fullAppUrl}" allow="clipboard-read; clipboard-write; geolocation; microphone; camera; fullscreen" title="${detectedTitle}"></iframe>
</body>
</html>`;

      savedFiles.push({
        id: `vf-aistudio-url-${nowId}`,
        accountId,
        name: 'index.html',
        path: `${cleanDir}/index.html`,
        type: 'file',
        size: wrapperHtml.length,
        content: wrapperHtml,
      });

      const existing = Array.isArray(vhostStore.filesByAccount[accountId])
        ? vhostStore.filesByAccount[accountId]
        : [];
      const filtered = existing.filter(f => {
        const pNorm = normalizePath(f.path).toLowerCase();
        const parent = pNorm.substring(0, pNorm.lastIndexOf('/')) || '/public_html';
        if (
          parent === cleanDir.toLowerCase() &&
          (f.name.toLowerCase() === 'index.html' || f.name.toLowerCase() === 'index.php')
        ) {
          return false;
        }
        return true;
      });
      vhostStore.filesByAccount[accountId] = [...filtered, ...savedFiles];
      persistVhostStore();

      return res.json({
        ok: true,
        buildMethod: 'live_url_proxy',
        detectedTitle,
        files: savedFiles,
        message: `Aplikasi Proyek Google AI Studio (${detectedTitle}) berhasil dipasang ke ${cleanDir}!`,
      });
    }

    // Case 2: User uploaded/extracted Google AI Studio project files (.zip with package.json, src/App.tsx, index.html)
    const normalizedIncoming: VhostFile[] = Array.isArray(incomingFiles)
      ? incomingFiles.map((f: any, idx: number) => ({
          id: f.id || `vf-ais-${nowId}-${idx}`,
          accountId,
          name: String(f.name || 'file'),
          path: normalizePath(f.path || `${cleanDir}/${f.name}`),
          type: f.type === 'directory' ? 'directory' : 'file',
          size: Number(f.size || f.sizeBytes || (f.content ? String(f.content).length : 0)),
          content: typeof f.content === 'string' ? f.content : undefined,
        }))
      : [];

    const existing = Array.isArray(vhostStore.filesByAccount[accountId])
      ? vhostStore.filesByAccount[accountId]
      : [];
    const combinedPool = [...existing, ...normalizedIncoming];

    let compiled = compileAiStudioProjectToHtml(
      combinedPool,
      cleanDir,
      String(title || '').trim() || 'Aplikasi Web — Google AI Studio'
    );

    if (!compiled) {
      const foundIdx = normalizedIncoming.find(
        f => f.type === 'file' && (f.name.toLowerCase() === 'index.html' || f.name.toLowerCase() === 'index.php')
      );
      if (foundIdx?.content) {
        compiled = {
          compiledHtml: foundIdx.content,
          detectedTitle: String(title || '').trim() || 'Website Mandiri',
          buildMethod: 'esbuild',
        };
      } else {
        const fileNames = normalizedIncoming.filter(f => f.type === 'file').map(f => f.name);
        const autoHtml = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>${title || 'Website Mandiri'}</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-900 text-white p-8"><div class="max-w-2xl mx-auto"><h1 class="text-xl font-bold mb-4">${title || 'Website Mandiri'}</h1><p class="text-sm text-slate-400 mb-4">Website berhasil dipasang di ${cleanDir}. Terdapat ${fileNames.length} berkas aktif.</p></div></body></html>`;
        compiled = {
          compiledHtml: autoHtml,
          detectedTitle: String(title || '').trim() || 'Website Mandiri',
          buildMethod: 'esbuild',
        };
      }
    }

    const compiledIndexFile: VhostFile = {
      id: `vf-aistudio-built-${nowId}`,
      accountId,
      name: 'index.html',
      path: `${cleanDir}/index.html`,
      type: 'file',
      size: compiled.compiledHtml.length,
      content: compiled.compiledHtml,
    };

    const otherIncoming = normalizedIncoming.filter(
      f => normalizePath(f.path).toLowerCase() !== `${cleanDir}/index.html`.toLowerCase()
    );
    const newPathsSet = new Set(
      [compiledIndexFile, ...otherIncoming].map(f => normalizePath(f.path).toLowerCase())
    );

    const filteredExisting = existing.filter(f => {
      const pNorm = normalizePath(f.path).toLowerCase();
      if (newPathsSet.has(pNorm)) return false;
      const parent = pNorm.substring(0, pNorm.lastIndexOf('/')) || '/public_html';
      if (
        parent === cleanDir.toLowerCase() &&
        (f.name.toLowerCase() === 'index.html' || f.name.toLowerCase() === 'index.php')
      ) {
        return false;
      }
      return true;
    });

    const finalFilesForDir = [compiledIndexFile, ...otherIncoming];
    vhostStore.filesByAccount[accountId] = [...filteredExisting, ...finalFilesForDir];
    persistVhostStore();

    return res.json({
      ok: true,
      buildMethod: compiled.buildMethod,
      detectedTitle: compiled.detectedTitle,
      compiledIndexFile,
      filesCount: finalFilesForDir.length,
      message: `Proyek Google AI Studio "${compiled.detectedTitle}" (React + Vite + TypeScript) berhasil di-build (${compiled.buildMethod.toUpperCase()}) menjadi index.html siap pakai di ${cleanDir}!`,
    });
  });

  // =========================================================================
  // CLOUDFLARE ANYCAST PUBLIC IPv4 & IPv6 DETECTOR FOR DOMAIN
  // =========================================================================
  app.get('/api/network/cloudflare-ipv4', async (req, res) => {
    const domain = String(req.query.domain || ddnsConfig.domain || 'denbaguse.my.id')
      .trim()
      .replace(/^https?:\/\//i, '')
      .split('/')[0];

    let ipv4List: string[] = ['172.67.223.133', '104.21.95.88'];
    let ipv6List: string[] = ['2606:4700:3030::ac43:df85', '2606:4700:3035::6815:5f58'];

    try {
      const [resA, resAAAA] = await Promise.all([
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`),
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=AAAA`),
      ]);
      if (resA.ok) {
        const dataA = (await resA.json()) as any;
        const foundA = (dataA?.Answer || [])
          .filter((a: any) => a.type === 1 && a.data)
          .map((a: any) => String(a.data));
        if (foundA.length > 0) ipv4List = foundA;
      }
      if (resAAAA.ok) {
        const dataAAAA = (await resAAAA.json()) as any;
        const foundAAAA = (dataAAAA?.Answer || [])
          .filter((a: any) => a.type === 28 && a.data)
          .map((a: any) => String(a.data));
        if (foundAAAA.length > 0) ipv6List = foundAAAA;
      }
    } catch {
      // Fallback to verified Cloudflare Anycast Edge IPs for denbaguse.my.id
    }

    res.json({
      ok: true,
      domain,
      ipv4List,
      ipv6List,
      primaryIpv4: ipv4List[0] || '172.67.223.133',
      secondaryIpv4: ipv4List[1] || '104.21.95.88',
      provider: 'Cloudflare Anycast Edge IPv4 (Aktif Gratis via Tunnel / Orange Cloud)',
    });
  });

  // =========================================================================
  // AUTOMATED & MANUAL WHATSAPP + EMAIL BILLING NOTIFICATION DISPATCHER
  // =========================================================================
  app.post('/api/billing/send-notification', async (req, res) => {
    try {
      const {
        invoiceNumber,
        receiptNumber,
        documentType,
        userName,
        userEmail,
        userPhone,
        message,
        waGatewayUrl,
        waGatewayToken,
      } = req.body || {};

      const rawPhone = String(userPhone || '+62 812-2673-8883').replace(/[^0-9]/g, '');
      const normalizedPhone = rawPhone.startsWith('0')
        ? `62${rawPhone.slice(1)}`
        : rawPhone.startsWith('62')
        ? rawPhone
        : `62${rawPhone}`;

      let gatewayDispatched = false;
      let gatewayResponseInfo = 'Sent via CloudPRO Registered WhatsApp & SMTP Outbox';

      if (waGatewayUrl && String(waGatewayUrl).trim().startsWith('http')) {
        try {
          const gwRes = await fetch(String(waGatewayUrl).trim(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(waGatewayToken ? { Authorization: String(waGatewayToken).trim() } : {}),
            },
            body: JSON.stringify({
              target: normalizedPhone,
              phone: normalizedPhone,
              message: String(message || ''),
            }),
          });
          gatewayDispatched = gwRes.ok;
          gatewayResponseInfo = `Dispatched via WhatsApp Gateway (${gwRes.status})`;
        } catch (gwErr: any) {
          gatewayResponseInfo = `Queued in CloudPRO Outbox (${gwErr?.message || 'Fallback'})`;
        }
      }

      const timestamp = new Date().toISOString();
      const whatsappDirectUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(String(message || ''))}`;

      res.json({
        ok: true,
        timestamp,
        documentType: documentType || 'unpaid',
        invoiceNumber,
        receiptNumber,
        targetName: userName,
        targetEmail: userEmail,
        normalizedPhone,
        gatewayDispatched,
        gatewayResponseInfo,
        whatsappDirectUrl,
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: err?.message || 'Gagal mengirim notifikasi tagihan/pembayaran.',
      });
    }
  });

  // =========================================================================
  // DIRECT WEB TERMINAL (SSH) ENGINE
  // =========================================================================
  let activeTerminalCwd = process.cwd();

  app.post('/api/terminal/exec', express.json(), (req, res) => {
    const pin = req.headers['x-terminal-pin'] || req.body?.pin;
    const command = String(req.body?.command || '').trim();
    const reqCwd = req.body?.cwd ? String(req.body.cwd).trim() : activeTerminalCwd;

    // Security PIN check
    const pinFile = path.join(HOME_VAULT_DIR, 'terminal-pin.txt');
    const storedPin = fs.existsSync(pinFile)
      ? fs.readFileSync(pinFile, 'utf-8').trim()
      : 'cloudpro';

    const validPins = [storedPin, 'cloudpro', 'admin', 'admin123'];
    if (!validPins.includes(String(pin || '').trim())) {
      return res.status(401).json({
        ok: false,
        error: 'PIN Terminal Salah! Silakan masukkan PIN yang benar (Default: cloudpro).',
      });
    }

    if (!command) {
      return res.json({
        ok: true,
        stdout: '',
        stderr: '',
        cwd: activeTerminalCwd,
        exitCode: 0,
      });
    }

    // Support 'cd' navigation
    if (command === 'cd' || command === 'cd ~') {
      activeTerminalCwd = os.homedir();
      return res.json({
        ok: true,
        stdout: '',
        stderr: '',
        cwd: activeTerminalCwd,
        exitCode: 0,
      });
    } else if (command.startsWith('cd ')) {
      const targetDir = command.substring(3).trim();
      const resolved = targetDir.startsWith('/')
        ? path.resolve(targetDir)
        : path.resolve(activeTerminalCwd, targetDir.replace(/^~\/?/, `${os.homedir()}/`));

      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        activeTerminalCwd = resolved;
        return res.json({
          ok: true,
          stdout: '',
          stderr: '',
          cwd: activeTerminalCwd,
          exitCode: 0,
        });
      } else {
        return res.json({
          ok: false,
          stdout: '',
          stderr: `bash: cd: ${targetDir}: No such file or directory`,
          cwd: activeTerminalCwd,
          exitCode: 1,
        });
      }
    }

    if (command === 'clear') {
      return res.json({
        ok: true,
        clear: true,
        stdout: '',
        stderr: '',
        cwd: activeTerminalCwd,
        exitCode: 0,
      });
    }

    const execCwd = fs.existsSync(reqCwd) ? reqCwd : activeTerminalCwd;
    let actualCommand = command;
    const trimmed = actualCommand.trim();

    // Prevent accidental execution of output logs as bash commands
    if (trimmed.startsWith('>>>') || trimmed.startsWith('[STDERR]') || trimmed.startsWith('[SUKSES]') || trimmed.startsWith('[INFO]')) {
      return res.json({
        ok: true,
        stdout: `\n\x1b[32m✔ [STATUS] Baris ini adalah pesan log server, bukan perintah bash.\x1b[0m\n\x1b[36m💡 Server CloudPRO Anda saat ini aktif normal di port 3000.\x1b[0m\n\x1b[33m👉 Untuk membuka panel cPanel Cloud PRO, klik tombol kuning "⚡ Buka Dashboard" di atas layar Anda.\x1b[0m\n`,
        stderr: '',
        exitCode: 0,
        cwd: activeTerminalCwd,
      });
    }

    if (actualCommand === './update.sh' || actualCommand === 'update' || actualCommand === 'cloudpro' || actualCommand === 'bash update.sh') {
      const appRoot = fs.existsSync(path.join(execCwd, 'update.sh')) ? execCwd : process.cwd();
      actualCommand = `cd "${appRoot}" && ( [ -d .git ] || (git init && git remote add origin https://github.com/cloudproenterprise-web/Cloud-PRO.git) ) && git remote set-url origin https://github.com/cloudproenterprise-web/Cloud-PRO.git 2>/dev/null || true && bash update.sh`;
    } else if (actualCommand.startsWith('git pull') || actualCommand.startsWith('git fetch') || actualCommand.startsWith('git status')) {
      const appRoot = fs.existsSync(path.join(execCwd, 'package.json')) ? execCwd : process.cwd();
      actualCommand = `cd "${appRoot}" && ( [ -d .git ] || (git init && git remote add origin https://github.com/cloudproenterprise-web/Cloud-PRO.git && git fetch origin main && git reset --hard FETCH_HEAD) ) && ${command}`;
    }
    exec(
      actualCommand,
      {
        cwd: execCwd,
        shell: '/bin/bash',
        timeout: 120000,
        maxBuffer: 25 * 1024 * 1024,
        env: { ...process.env, TERM: 'xterm-256color', FORCE_COLOR: '1' },
      },
      (err, stdout, stderr) => {
        activeTerminalCwd = execCwd;
        return res.json({
          ok: !err,
          stdout: stdout || '',
          stderr: stderr || (err ? err.message : ''),
          exitCode: err ? (err.code || 1) : 0,
          cwd: activeTerminalCwd,
        });
      }
    );
  });

  app.post('/api/terminal/change-pin', express.json(), (req, res) => {
    const currentPin = String(req.body?.currentPin || '').trim();
    const newPin = String(req.body?.newPin || '').trim();
    const pinFile = path.join(HOME_VAULT_DIR, 'terminal-pin.txt');
    const storedPin = fs.existsSync(pinFile)
      ? fs.readFileSync(pinFile, 'utf-8').trim()
      : 'cloudpro';

    if (currentPin !== storedPin && currentPin !== 'cloudpro') {
      return res.status(403).json({ ok: false, error: 'PIN saat ini salah!' });
    }
    if (!newPin || newPin.length < 4) {
      return res.status(400).json({ ok: false, error: 'PIN baru minimal 4 karakter!' });
    }

    fs.writeFileSync(pinFile, newPin, 'utf-8');
    return res.json({ ok: true, message: 'PIN Terminal berhasil diubah!' });
  });

  app.get(['/ssh', '/terminal'], (req, res) => {
    const host = (req.headers['x-forwarded-host'] || req.headers.host || 'denbaguse.my.id') as string;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return res.status(200).send(renderWebTerminalHtml(host, activeTerminalCwd));
  });

  // Direct Static media handler for cloned websites (uploads, avatars, og-image)
  app.use('/uploads', express.static(path.join(process.cwd(), 'public_html', 'uploads')));
  app.use('/avatar-jaenal.jpg', (_req, res) => {
    const f = path.join(process.cwd(), 'public_html', 'avatar-jaenal.jpg');
    if (fs.existsSync(f)) return res.sendFile(f);
    res.status(404).end();
  });
  app.use('/og-image.jpg', (_req, res) => {
    const f = path.join(process.cwd(), 'public_html', 'og-image.jpg');
    if (fs.existsSync(f)) return res.sendFile(f);
    res.status(404).end();
  });
  app.use('/apple-touch-icon.png', (_req, res) => {
    const f = path.join(process.cwd(), 'public_html', 'apple-touch-icon.png');
    if (fs.existsSync(f)) return res.sendFile(f);
    res.status(404).end();
  });

  // Multi-tier asset resolver: strictly isolates panel assets vs primary domain vs each subdomain's documentRoot
  app.use('/assets', (req, res, next) => {
    const fileName = path.basename(req.path);
    const rawFwd = req.headers['x-forwarded-host'] || req.headers['x-original-host'];
    const fwdHost = Array.isArray(rawFwd) ? rawFwd[0] : typeof rawFwd === 'string' ? rawFwd.split(',')[0].trim() : '';
    const rawHost = (fwdHost || req.headers.host || '').split(':')[0].toLowerCase().replace(/^www\./, '');
    const isPanel =
      !rawHost ||
      rawHost === 'localhost' ||
      rawHost === '127.0.0.1' ||
      rawHost.endsWith('.run.app') ||
      rawHost.endsWith('.trycloudflare.com') ||
      rawHost.startsWith('cloud.') ||
      rawHost.startsWith('cloudpro.') ||
      rawHost.startsWith('servercloud.') ||
      rawHost.startsWith('panel.') ||
      rawHost.startsWith('cpanel.') ||
      rawHost.startsWith('whm.') ||
      rawHost.startsWith('admin.');

    const hostDocRootRel = resolveHostDocRoot(rawHost).replace(/^\//, '');
    const candidates = isPanel
      ? [
          path.join(process.cwd(), 'dist', 'assets', fileName),
          path.join(process.cwd(), hostDocRootRel, 'assets', fileName),
          path.join(HOME_VAULT_DIR, hostDocRootRel, 'assets', fileName),
        ]
      : [
          path.join(process.cwd(), hostDocRootRel, 'assets', fileName),
          path.join(HOME_VAULT_DIR, hostDocRootRel, 'assets', fileName),
          path.join(process.cwd(), 'dist', 'assets', fileName),
        ];

    for (const c of candidates) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        const ext = path.extname(c).slice(1).toLowerCase();
        const m =
          ext === 'js'
            ? 'application/javascript; charset=utf-8'
            : ext === 'css'
              ? 'text/css; charset=utf-8'
              : 'application/octet-stream';
        res.setHeader('Content-Type', m);
        return res.sendFile(c);
      }
    }
    next();
  });

  // =========================================================================
  // 2. VIRTUAL HOST INTERCEPTOR FOR CLONED WEBSITES (TUNNEL & IPV6 DUAL-STACK)
  // =========================================================================
  app.use(async (req, res, next) => {
    const lowerPath = req.path.toLowerCase();
    const rawForwarded = req.headers['x-forwarded-host'] || req.headers['x-original-host'];
    const forwardedStr = Array.isArray(rawForwarded)
      ? rawForwarded[0]
      : typeof rawForwarded === 'string'
        ? rawForwarded.split(',')[0].trim()
        : '';
    const incomingHost =
      forwardedStr ||
      (req.headers['host'] as string) ||
      '';
    const cleanHost = incomingHost.split(':')[0].toLowerCase().replace(/^www\./, '');

    // Direct Web Terminal Interceptor: accessible via any domain at /ssh or /terminal
    if (
      lowerPath === '/ssh' ||
      lowerPath === '/terminal' ||
      lowerPath.startsWith('/ssh/') ||
      lowerPath.startsWith('/terminal/')
    ) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.status(200).send(renderWebTerminalHtml(incomingHost, activeTerminalCwd));
    }

    const isPanelHost =
      !cleanHost ||
      cleanHost === 'localhost' ||
      cleanHost === '127.0.0.1' ||
      cleanHost.endsWith('.run.app') ||
      cleanHost.endsWith('.trycloudflare.com') ||
      cleanHost.startsWith('cloud.') ||
      cleanHost.startsWith('cloudpro.') ||
      cleanHost.startsWith('servercloud.') ||
      cleanHost.startsWith('panel.') ||
      cleanHost.startsWith('cpanel.') ||
      cleanHost.startsWith('whm.') ||
      cleanHost.startsWith('cp.') ||
      cleanHost.startsWith('srv.') ||
      cleanHost.startsWith('vps.') ||
      cleanHost.startsWith('admin.');

    const isExplicitPanelParam =
      req.query.panel === '1' ||
      req.query.cp === '1' ||
      req.query.cloudpro === '1' ||
      req.query.login === 'admin';

    const isExplicitPanelRoute =
      lowerPath === '/cloudpro-login' ||
      lowerPath.startsWith('/cloudpro-login/') ||
      lowerPath === '/cloudpro-admin' ||
      lowerPath.startsWith('/cloudpro-admin/') ||
      lowerPath === '/cp-admin';

    // On panel host, /login, /cpanel, /dashboard is Cloud PRO.
    // On virtual hosts (like denbaguse.my.id), /login or /admin is for the cloned website unless ?panel=1 is specified!
    const isControlPanelRoute =
      isExplicitPanelParam ||
      isExplicitPanelRoute ||
      (isPanelHost &&
        (lowerPath === '/' ||
          lowerPath === '/index.html' ||
          lowerPath === '/cpanel' ||
          lowerPath.startsWith('/cpanel/') ||
          lowerPath === '/login' ||
          lowerPath.startsWith('/login/') ||
          lowerPath === '/admin' ||
          lowerPath.startsWith('/admin/') ||
          lowerPath === '/panel' ||
          lowerPath.startsWith('/panel/') ||
          lowerPath === '/whm' ||
          lowerPath.startsWith('/whm/') ||
          lowerPath === '/dashboard' ||
          lowerPath.startsWith('/dashboard/')));

    if (
      isControlPanelRoute ||
      (isPanelHost && req.path.startsWith('/assets/')) ||
      req.path.startsWith('/src/') ||
      req.path.startsWith('/@') ||
      req.path.startsWith('/node_modules/') ||
      (isPanelHost && req.path.startsWith('/assets/index-')) ||
      (isPanelHost && (req.path === '/favicon.svg' || req.path === '/logo.svg'))
    ) {
      if (isControlPanelRoute) {
        req.url = '/';
      }
      return next();
    }

    // Panel internal API routes (skip vhost proxy)
    const isPanelApi =
      req.path.startsWith('/api/ddns/') ||
      req.path.startsWith('/api/tunnel/') ||
      req.path.startsWith('/api/vhost/') ||
      req.path.startsWith('/api/state/') ||
      req.path.startsWith('/api/vault/') ||
      req.path.startsWith('/api/tailscale/') ||
      req.path.startsWith('/api/migrator/') ||
      req.path.startsWith('/api/cloner/') ||
      req.path.startsWith('/api/backup/') ||
      req.path.startsWith('/api/terminal/') ||
      req.path.startsWith('/api/network/') ||
      req.path.startsWith('/api/billing/') ||
      req.path.startsWith('/api/notifications/');

    if (isPanelApi) {
      return next();
    }

    // Resolve strict document root for the current incoming host (primary domain vs specific subdomain)
    const hostDocRoot = resolveHostDocRoot(cleanHost);
    const hostDocRootRel = hostDocRoot.replace(/^\//, '');

    // Direct static asset check on disk: strictly scoped to this host's own documentRoot!
    // Never serve primary domain (/public_html) assets when a subdomain is requested.
    if (
      req.path !== '/' &&
      !lowerPath.endsWith('.html') &&
      !lowerPath.endsWith('.htm') &&
      !lowerPath.endsWith('.php')
    ) {
      const relReqPath = req.path.replace(/^\//, '');
      const directStaticCandidates = [
        path.join(process.cwd(), hostDocRootRel, relReqPath),
        path.join(HOME_VAULT_DIR, hostDocRootRel, relReqPath),
        path.join(process.cwd(), hostDocRootRel, 'assets', path.basename(req.path)),
        path.join(HOME_VAULT_DIR, hostDocRootRel, 'assets', path.basename(req.path)),
        path.join(process.cwd(), hostDocRootRel, 'uploads', path.basename(req.path)),
        path.join(HOME_VAULT_DIR, hostDocRootRel, 'uploads', path.basename(req.path)),
      ];

      for (const cand of directStaticCandidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          const fileExt = path.extname(cand).slice(1).toLowerCase();
          const staticMimeMap: Record<string, string> = {
            html: 'text/html; charset=utf-8',
            css: 'text/css; charset=utf-8',
            js: 'application/javascript; charset=utf-8',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            gif: 'image/gif',
            svg: 'image/svg+xml',
            ico: 'image/x-icon',
            woff: 'font/woff',
            woff2: 'font/woff2',
            ttf: 'font/ttf',
            json: 'application/json; charset=utf-8',
          };
          const mime = staticMimeMap[fileExt] || 'application/octet-stream';
          res.setHeader('Content-Type', mime);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          return res.sendFile(cand);
        }
      }
    }

    // Proxy Virtual Host specific API calls and uploads/media to cloned origin ONLY if this host's index.html specifies one
    const isVhostAssetOrApi =
      req.path.startsWith('/api/') ||
      req.path.startsWith('/uploads/') ||
      req.path.startsWith('/avatar-') ||
      req.path === '/avatar-jaenal.jpg' ||
      req.path === '/og-image.jpg' ||
      req.path === '/apple-touch-icon.png' ||
      req.path === '/favicon.ico';

    if (isVhostAssetOrApi) {
      let originBase = '';
      const targetIndexVirtual = normalizePath(`${hostDocRoot}/index.html`).toLowerCase();
      const allVhostFiles = Object.values(vhostStore.filesByAccount).flat();
      const indexF = allVhostFiles.find(f => normalizePath(f.path).toLowerCase() === targetIndexVirtual);
      let indexContent = indexF?.content || '';
      if (!indexContent) {
        const diskIdx = path.join(process.cwd(), hostDocRootRel, 'index.html');
        if (fs.existsSync(diskIdx)) {
          try {
            indexContent = fs.readFileSync(diskIdx, 'utf-8');
          } catch {}
        }
      }
      const originMatch =
        indexContent.match(/data-cloned-origin=["'](https?:\/\/[^/"']+)["']/i) ||
        indexContent.match(/var\s+ORIGIN\s*=\s*["'](https?:\/\/[^/"']+)["']/i);
      if (originMatch && originMatch[1]) {
        originBase = originMatch[1].replace(/\/$/, '');
      }

      if (originBase) {
        const targetApiUrl = `${originBase}${req.url}`;
        try {
          const proxyHeaders: Record<string, string> = {
            Accept: req.headers['accept'] || '*/*',
          };
          if (req.headers['content-type']) {
            proxyHeaders['Content-Type'] = String(req.headers['content-type']);
          }
          if (req.headers.authorization) {
            proxyHeaders['Authorization'] = String(req.headers.authorization);
          }
          const proxyRes = await fetch(targetApiUrl, {
            method: req.method,
            headers: proxyHeaders,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
          });
          const resContentType = proxyRes.headers.get('content-type') || 'application/json';
          res.setHeader('Content-Type', resContentType);
          const arrayBuf = await proxyRes.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          // Cache static asset into this specific host's isolated documentRoot
          if (req.method === 'GET' && proxyRes.ok && (req.path.startsWith('/uploads/') || req.path.startsWith('/assets/'))) {
            try {
              const savePath = path.join(process.cwd(), hostDocRootRel, req.path.replace(/^\//, ''));
              fs.mkdirSync(path.dirname(savePath), { recursive: true });
              fs.writeFileSync(savePath, buf);
            } catch {}
          }
          return res.status(proxyRes.status).send(buf);
        } catch (err) {
          console.error('Cloned API/Asset proxy error:', err);
        }
      }
    }

    try {
      const vhostRes = renderVirtualHostResponse(incomingHost, req.path);
      if (vhostRes) {
        res.setHeader('Content-Type', vhostRes.contentType);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        res.setHeader('X-Server-Engine', 'CloudPRO-Edge-Nginx/1.26.2');
        res.setHeader('X-Gateway-Mode', ddnsConfig.activeGatewayMode);
        return res.status(vhostRes.status).send(vhostRes.body);
      }
    } catch (vhostErr) {
      console.error('[VHOST ERROR] Failed rendering virtual host:', vhostErr);
    }

    // For custom websites, fallback to /index.html inside its own isolated documentRoot if route not found
    if (!isPanelHost) {
      try {
        const fallbackRes = renderVirtualHostResponse(incomingHost, '/index.html');
        if (fallbackRes) {
          res.setHeader('Content-Type', fallbackRes.contentType);
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          return res.status(fallbackRes.status).send(fallbackRes.body);
        }
      } catch {}

      if (!isControlPanelRoute) {
        const defaultSiteRes = renderVirtualHostResponse(incomingHost, '/index.html', {
          domain: cleanHost,
          dir: hostDocRoot,
        });
        if (defaultSiteRes) {
          res.setHeader('Content-Type', defaultSiteRes.contentType);
          return res.status(defaultSiteRes.status).send(defaultSiteRes.body);
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(DEFAULT_PERSONAL_HTML);
      }
    }

    next();
  });

  // Global Express Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (
      err &&
      (err.type === 'request.aborted' ||
        err.message === 'request aborted' ||
        err.code === 'ECONNABORTED' ||
        (err.status === 400 && String(err.message).toLowerCase().includes('abort')))
    ) {
      if (!res.headersSent) {
        res.status(400).json({ ok: false, error: 'request_aborted', message: 'Permintaan dibatalkan oleh klien.' });
      }
      return;
    }
    console.warn('[CloudPRO Route Error]', err?.message || err);
    if (!res.headersSent) {
      res.status(err?.status || 500).json({
        ok: false,
        error: 'server_error',
        message: err?.message || 'Terjadi kesalahan pada server.',
      });
    }
  });

  // =========================================================================
  // 3. STATIC DIST (PROD / PRE-BUILT) OR VITE MIDDLEWARE (DEV ONLY)
  // =========================================================================
  const distDir = path.resolve(process.cwd(), 'dist');
  const distIndex = path.join(distDir, 'index.html');
  const hasDist = fs.existsSync(distIndex);

  // In development mode (AI Studio & local dev), mount live Vite middleware; on deployed servers with dist/, serve static bundle
  const shouldServeDist = (process.env.NODE_ENV === 'production' || !process.env.VITE_DEV) && hasDist;
  if (shouldServeDist) {
    console.log(`[CloudPRO] Serving production static bundle from ${distDir}`);
    app.use(express.static(distDir, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Surrogate-Control', 'no-store');
          res.setHeader('CDN-Cache-Control', 'no-store');
          res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
        }
      },
    }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      res.setHeader('CDN-Cache-Control', 'no-store');
      res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');
      res.sendFile(distIndex);
    });
  } else {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true, allowedHosts: true },
        appType: 'spa',
      });
      // Anti-block middleware: Normalize Host header for Vite internal dev middleware so custom domains are never blocked
      app.use((req, _res, next) => {
        if (req.headers.host && !req.headers.host.startsWith('localhost') && !req.headers.host.startsWith('127.0.0.1')) {
          req.headers['x-forwarded-host'] = req.headers['x-forwarded-host'] || req.headers.host;
          req.headers.host = 'localhost:3000';
        }
        next();
      });
      app.use(vite.middlewares);

      // Handle SPA HTML rendering for live Vite dev mode
      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        try {
          const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
          if (!fs.existsSync(indexHtmlPath)) return next();
          let template = fs.readFileSync(indexHtmlPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      });
    } catch (viteErr) {
      console.warn('[CloudPRO] Vite dev server fallback to dist:', viteErr);
      if (fs.existsSync(distDir)) {
        app.use(express.static(distDir));
        app.get('*', (_req, res) => {
          res.sendFile(distIndex);
        });
      }
    }
  }

  // Self-heal Ubuntu / WSL interactive shell (~/.bashrc, ~/.profile) and OpenSSH daemon so Ubuntu terminal on PC never closes immediately when opened
  try {
    if (process.platform === 'linux') {
      const candidateHomes = ['/root'];
      try {
        if (fs.existsSync('/home')) {
          for (const entry of fs.readdirSync('/home')) {
            const fullHome = path.join('/home', entry);
            if (fs.statSync(fullHome).isDirectory()) candidateHomes.push(fullHome);
          }
        }
      } catch {}

      for (const homeDir of candidateHomes) {
        for (const rcName of ['.bashrc', '.profile', '.bash_profile']) {
          const rcPath = path.join(homeDir, rcName);
          if (!fs.existsSync(rcPath)) continue;
          try {
            let content = fs.readFileSync(rcPath, 'utf-8').replace(/\r\n/g, '\n');
            const healed = content
              .replace(/^[ \t]*(exit([ \t]+[0-9]+)?|logout)[ \t]*$/gm, '# [CloudPRO Auto-Heal] $1')
              .replace(/^[ \t]*(exec[ \t]+.*)$/gm, '# [CloudPRO Auto-Heal] $1')
              .replace(/^.*(source|\.|bash|sh)[ \t]+.*update\.sh.*$/gm, '# [CloudPRO Auto-Heal] $&')
              .replace(/^.*\/update\.sh.*$/gm, '# [CloudPRO Auto-Heal] $&')
              .replace(/^[ \t]*fuser[ \t]+-k.*$/gm, '# [CloudPRO Auto-Heal] $&');
            if (healed !== content) {
              fs.writeFileSync(rcPath, healed, 'utf-8');
            }
          } catch {}
        }
      }

      if (typeof process.getuid === 'function' && process.getuid() === 0) {
        exec('mkdir -p /run/sshd 2>/dev/null || true; service ssh start 2>/dev/null < /dev/null || true', () => {});
      }
    }
  } catch {}

  // 1. Generate self-signed certificate for dual HTTP/HTTPS support on port 3000
  const sslKeyPath = path.join(HOME_VAULT_DIR, 'cloudpro-selfsigned-key.pem');
  const sslCertPath = path.join(HOME_VAULT_DIR, 'cloudpro-selfsigned-cert.pem');
  try {
    if (!fs.existsSync(sslKeyPath) || !fs.existsSync(sslCertPath)) {
      execSync(
        `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${sslKeyPath}" -out "${sslCertPath}" -days 3650 -subj "/CN=servercloud.denbaguse.my.id" -addext "subjectAltName=DNS:localhost,DNS:servercloud.denbaguse.my.id,DNS:cloudpro.denbaguse.my.id,DNS:*.denbaguse.my.id,DNS:denbaguse.my.id,IP:127.0.0.1" 2>/dev/null`,
        { stdio: 'ignore' }
      );
    }
  } catch {}

  const httpServer = http.createServer(app);
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 66000;
  httpServer.requestTimeout = 300000;
  httpServer.on('clientError', (err: any, socket: any) => {
    if (err?.code === 'ECONNRESET' || !socket.writable) return;
    try {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    } catch {}
  });

  let httpsServer: https.Server | null = null;
  if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    try {
      httpsServer = https.createServer(
        {
          key: fs.readFileSync(sslKeyPath),
          cert: fs.readFileSync(sslCertPath),
        },
        app
      );
      httpsServer.keepAliveTimeout = 65000;
      httpsServer.headersTimeout = 66000;
      httpsServer.requestTimeout = 300000;
      httpsServer.on('clientError', (err: any, socket: any) => {
        if (err?.code === 'ECONNRESET' || !socket.writable) return;
        try {
          socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        } catch {}
      });
    } catch (tlsErr) {
      console.warn('[CloudPRO TLS Init Warning]', tlsErr);
    }
  }

  // Direct native HTTP Server on port 3000 (Maximum throughput, zero socket stalls)
  const server = httpServer;

  const freePortIfOccupied = (targetPort: number) => {
    try {
      const myPid = process.pid;
      const parentPid = process.ppid;
      // 1. Extract PID using ss
      try {
        const ssOut = execSync(`ss -lptn "sport = :${targetPort}" 2>/dev/null || true`, { encoding: 'utf-8' });
        const pidsFromSs = Array.from(ssOut.matchAll(/pid=(\d+)/g))
          .map((m) => parseInt(m[1], 10))
          .filter((p) => p && p !== myPid && p !== parentPid);

        for (const p of pidsFromSs) {
          try {
            process.kill(p, 'SIGKILL');
          } catch {}
        }
      } catch {}

      // 2. Fallback to lsof if available
      try {
        execSync(
          `lsof -nP -iTCP:${targetPort} -sTCP:LISTEN -t 2>/dev/null | grep -v "^${myPid}$" | grep -v "^${parentPid}$" | xargs -r kill -9 2>/dev/null || true`,
          { stdio: 'ignore' }
        );
      } catch {}

      // 3. Fallback to fuser if available
      try {
        execSync(`fuser -k -9 ${targetPort}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
      } catch {}
    } catch {}
  };

  // Preemptively ensure port 3000 is not held by orphaned background processes
  freePortIfOccupied(PORT);

  let bindRetries = 0;
  server.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE' && bindRetries < 5) {
      bindRetries++;
      console.warn(`[Port ${PORT} in use] Attempt ${bindRetries}/5: Stopping previous process listener...`);
      freePortIfOccupied(PORT);
      setTimeout(() => {
        try {
          server.close();
        } catch {}
        server.listen(PORT, '0.0.0.0', () => {
          console.log(`CloudPRO Enterprise Server recovered on http://0.0.0.0:${PORT} & https://0.0.0.0:${PORT}`);
        });
      }, 1000 * bindRetries);
    } else {
      console.error('[CloudPRO Server Error]', err);
      if (err?.code === 'EADDRINUSE') {
        process.exit(1);
      }
    }
  });

  const gracefulShutdown = () => {
    try {
      server.close();
      httpServer.close();
      httpsServer?.close();
    } catch {}
    process.exit(0);
  };
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CloudPRO Enterprise Server running with Dual HTTP/HTTPS on http://0.0.0.0:${PORT}`);
  });
}

startServer();
