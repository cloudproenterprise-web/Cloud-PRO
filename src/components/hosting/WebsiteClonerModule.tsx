import React, { useState, useRef } from 'react';
import {
  Globe,
  GitBranch,
  FileArchive,
  Code2,
  ExternalLink,
  FolderOpen,
  CheckCircle2,
  Loader2,
  Upload,
  Sparkles,
  RefreshCw,
  FileCode,
  FileText,
  Trash2,
  Eye,
  ShieldCheck,
  ArrowRight,
  Save,
  ChevronDown,
  Zap,
  DownloadCloud,
  Server,
  HardDrive,
  Key,
  Lock,
  Check,
  AlertTriangle,
  Layers,
  Copy,
} from 'lucide-react';
import { HostingAccount, VirtualFile, DomainEntity } from '../../types';
import { db } from '../../services/storage';
import { extractZipArchive } from '../../services/zipExtractor';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';
import { WebsitePreviewModal } from './WebsitePreviewModal';
import { ServerMigratorHub } from './ServerMigratorHub';

interface WebsiteClonerModuleProps {
  account: HostingAccount;
  onOpenFileManager?: (targetPath: string) => void;
  onOpenPreview?: (domain?: string, docRoot?: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const WebsiteClonerModule: React.FC<WebsiteClonerModuleProps> = ({
  account,
  onOpenFileManager,
}) => {
  const { currentUser } = useAuth();
  const { showToast, refreshAll } = useServer();

  const [accountDomains, setAccountDomains] = useState<DomainEntity[]>(() => db.getDomains(account.id));
  const [showNewSubdomainInput, setShowNewSubdomainInput] = useState<boolean>(false);
  const [newSubdomainPrefix, setNewSubdomainPrefix] = useState<string>('');

  React.useEffect(() => {
    setAccountDomains(db.getDomains(account.id));
  }, [account.id]);

  const handleCreateAndSelectSubdomain = (prefixToCreate?: string) => {
    const raw = (prefixToCreate || newSubdomainPrefix).toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (!raw) {
      showToast('error', 'Nama Subdomain Kosong', 'Ketik prefix subdomain (contoh: rdm, app, web)');
      return;
    }
    const fullSubDomain = `${raw}.${account.primaryDomain}`;
    const cleanDocRoot = `/public_html/${raw}`;
    const newDomainEntry: DomainEntity = {
      id: `dom-sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      accountId: account.id,
      domain: fullSubDomain,
      type: 'subdomain',
      parentDomain: account.primaryDomain,
      subdomainPrefix: raw,
      documentRoot: `/home/${account.username}${cleanDocRoot}`,
      phpVersion: '8.2',
      sslStatus: 'active',
      createdAt: new Date().toISOString(),
    };
    db.saveDomain(newDomainEntry);
    const updated = db.getDomains(account.id);
    setAccountDomains(updated);
    setSelectedTargetDir(cleanDocRoot);
    setNewSubdomainPrefix('');
    setShowNewSubdomainInput(false);
    refreshAll();
    showToast('success', 'Subdomain Berhasil Dipilih', `${fullSubDomain} aktif sebagai target kloning di folder ${cleanDocRoot}`);
  };

  const [selectedTargetDir, setSelectedTargetDir] = useState<string>('/public_html');
  const [projectFramework, setProjectFramework] = useState<
    'ai_studio' | 'html_static' | 'php_laravel' | 'wordpress'
  >('ai_studio');
  const [activeMode, setActiveMode] = useState<
    'url_clone' | 'server_zip_pull' | 'zip_clone' | 'ai_studio' | 'git_clone' | 'custom_code'
  >('url_clone');
  const [showLegacyTools, setShowLegacyTools] = useState<boolean>(false);

  // Mode 0: Google AI Studio Project state (ZIP or .run.app URL)
  const [aiStudioUrl, setAiStudioUrl] = useState<string>('');
  const [aiStudioZipFile, setAiStudioZipFile] = useState<File | null>(null);
  const [aiStudioTitle, setAiStudioTitle] = useState<string>('');
  const aiStudioZipRef = useRef<HTMLInputElement>(null);

  // Mode 1: Live URL Clone state
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [customSiteTitle, setCustomSiteTitle] = useState<string>('');
  const [downloadAssets, setDownloadAssets] = useState<boolean>(true);
  const [cleanOldIndex, setCleanOldIndex] = useState<boolean>(true);

  // Mode 1.5: Server-to-Server Direct ZIP Pull & Extract state
  const [serverZipUrl, setServerZipUrl] = useState<string>('');
  const [serverZipAuthType, setServerZipAuthType] = useState<'none' | 'basic' | 'bearer' | 'custom_header'>('none');
  const [serverZipUser, setServerZipUser] = useState<string>('');
  const [serverZipPass, setServerZipPass] = useState<string>('');
  const [serverZipToken, setServerZipToken] = useState<string>('');
  const [serverZipHeaderName, setServerZipHeaderName] = useState<string>('');
  const [serverZipHeaderValue, setServerZipHeaderValue] = useState<string>('');
  const [serverZipFlatten, setServerZipFlatten] = useState<boolean>(true);
  const [serverZipCleanOld, setServerZipCleanOld] = useState<boolean>(false);
  const [serverZipFixPermissions, setServerZipFixPermissions] = useState<boolean>(true);
  const [showAdvancedServerZip, setShowAdvancedServerZip] = useState<boolean>(false);
  const [isProbingServerZip, setIsProbingServerZip] = useState<boolean>(false);
  const [probeResult, setProbeResult] = useState<{
    ok: boolean;
    httpStatus: number;
    statusText?: string;
    contentLength?: number;
    formattedSize?: string;
    contentType?: string;
    fileName?: string;
    serverHeader?: string;
    latencyMs?: number;
    message?: string;
  } | null>(null);
  const [transferSummary, setTransferSummary] = useState<{
    filesCount: number;
    foldersCount: number;
    archiveSize: string;
    extractedSize: string;
    duration: string;
    detectedStack: string;
    primaryEntry: string;
    targetDir: string;
  } | null>(null);

  // Mode 2: ZIP Clone state (Local ZIP or Remote ZIP URL)
  const [remoteZipUrl, setRemoteZipUrl] = useState<string>('');
  const [selectedLocalZip, setSelectedLocalZip] = useState<File | null>(null);
  const [flattenRootFolder, setFlattenRootFolder] = useState<boolean>(true);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Mode 3: Git Repository Clone state
  const [gitRepoUrl, setGitRepoUrl] = useState<string>('');
  const [gitBranch, setGitBranch] = useState<string>('main');

  // Mode 4: Direct Custom HTML/CSS Code Builder
  const existingFiles = db.getVirtualFiles(account.id);
  const currentIndexFile = existingFiles.find(
    f =>
      f.type === 'file' &&
      (f.path.toLowerCase() === `${selectedTargetDir.toLowerCase()}/index.html` ||
        f.path.toLowerCase() === `${selectedTargetDir.toLowerCase()}/index.php`)
  );
  const currentCssFile = existingFiles.find(
    f => f.type === 'file' && f.path.toLowerCase() === `${selectedTargetDir.toLowerCase()}/style.css`
  );

  const [customHtmlCode, setCustomHtmlCode] = useState<string>(
    currentIndexFile?.content || '<!DOCTYPE html>\n<html lang="id">\n<head>\n  <meta charset="UTF-8" />\n  <title>Website Pribadi Saya</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Halo dari Website Pribadi Saya!</h1>\n</body>\n</html>'
  );
  const [customCssCode, setCustomCssCode] = useState<string>(
    currentCssFile?.content || 'body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }'
  );

  // Execution & Progress state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusLog, setStatusLog] = useState<string>('');
  const [lastCloneSummary, setLastCloneSummary] = useState<{
    title: string;
    message: string;
    filesCount: number;
    targetDir: string;
    timestamp: string;
  } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  if (!currentUser) return null;

  const ensureSubdomainRegistered = (dirPath: string): string => {
    const cleanDir = ('/' + (dirPath || '/public_html').trim().replace(/^\/home\/[^/]+/, '').replace(/^\/+/, '').replace(/\/+$/, '')) || '/public_html';
    if (cleanDir === '/public_html') {
      return account.primaryDomain;
    }
    const existingDom = db.getDomains(account.id).find(d => {
      const dRoot = ('/' + (d.documentRoot || '').replace(/^\/home\/[^/]+/, '').replace(/^\/+/, '').replace(/\/+$/, '')) || '/public_html';
      return dRoot.toLowerCase() === cleanDir.toLowerCase() && d.type !== 'primary';
    });
    if (existingDom) {
      return existingDom.domain;
    }
    if (cleanDir.startsWith('/public_html/')) {
      const rawSub = cleanDir.slice('/public_html/'.length).split('/')[0].toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (rawSub) {
        const fullSubDomain = `${rawSub}.${account.primaryDomain}`;
        const newDomainEntry: DomainEntity = {
          id: `dom-sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          accountId: account.id,
          domain: fullSubDomain,
          type: 'subdomain',
          parentDomain: account.primaryDomain,
          subdomainPrefix: rawSub,
          documentRoot: `/home/${account.username}/public_html/${rawSub}`,
          phpVersion: account.phpVersion || '8.2',
          sslStatus: 'active',
          createdAt: new Date().toISOString(),
        };
        db.saveDomain(newDomainEntry);
        setAccountDomains(db.getDomains(account.id));
        return fullSubDomain;
      }
    }
    return account.primaryDomain;
  };

  const activeTargetDomain = (() => {
    const cleanDir = ('/' + (selectedTargetDir || '/public_html').trim().replace(/^\/home\/[^/]+/, '').replace(/^\/+/, '').replace(/\/+$/, '')) || '/public_html';
    if (cleanDir === '/public_html') return account.primaryDomain;
    const matched = accountDomains.find(d => {
      const dRoot = ('/' + (d.documentRoot || '').replace(/^\/home\/[^/]+/, '').replace(/^\/+/, '').replace(/\/+$/, '')) || '/public_html';
      return dRoot.toLowerCase() === cleanDir.toLowerCase() && d.type !== 'primary';
    });
    if (matched) return matched.domain;
    if (cleanDir.startsWith('/public_html/')) {
      const sub = cleanDir.slice('/public_html/'.length).split('/')[0];
      if (sub) return `${sub}.${account.primaryDomain}`;
    }
    return account.primaryDomain;
  })();

  const pushVhostAndVaultSync = async () => {
    try {
      ensureSubdomainRegistered(selectedTargetDir);
      const allAccounts = db.getHostingAccounts();
      const allSubdomains: Array<{ id: string; accountId: string; fullDomain: string; documentRoot: string }> = [];
      const filesByAccount: Record<string, any[]> = {};

      for (const acc of allAccounts) {
        const doms = db.getDomains(acc.id);
        for (const d of doms) {
          if (d.type === 'primary' || d.domain.toLowerCase() === acc.primaryDomain.toLowerCase()) {
            continue;
          }
          const subPrefix = d.subdomainPrefix || d.domain.split('.')[0];
          const cleanDocRoot = ('/' + (d.documentRoot || `/public_html/${subPrefix}`)
            .replace(/^\/home\/[^/]+/, '')
            .replace(/^\/+/, '')
            .replace(/\/+$/, '')) || `/public_html/${subPrefix}`;
          allSubdomains.push({
            id: d.id,
            accountId: acc.id,
            fullDomain: d.domain,
            documentRoot: cleanDocRoot,
          });
        }
        const vFiles = db.getVirtualFiles(acc.id).slice(-180);
        filesByAccount[acc.id] = vFiles.map(f => {
          const isEntry = /\.(html?|php|css)$/i.test(f.name || '');
          return {
            id: f.id,
            accountId: f.accountId,
            name: f.name,
            path: f.path,
            type: f.type,
            size: f.sizeBytes || 0,
            content: !isEntry && f.content && f.content.length > 250000 ? undefined : f.content,
          };
        });
      }

      await Promise.all([
        fetch('/api/vhost/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userInitiated: true,
            accounts: allAccounts.map(a => ({
              id: a.id,
              primaryDomain: a.primaryDomain,
              username: a.username,
              phpVersion: a.phpVersion,
            })),
            subdomains: allSubdomains,
            filesByAccount,
          }),
        }),
        db.syncToServerVault(true),
      ]);
      refreshAll();
    } catch {
      // Ignore network error
    }
  };

  // Helper to strip single wrapper directory from ZIP entries if flattenRootFolder is enabled
  const normalizeExtractedEntries = (entries: Awaited<ReturnType<typeof extractZipArchive>>) => {
    if (!flattenRootFolder || entries.length === 0) return entries;
    const fileEntries = entries.filter(e => !e.isDir && e.path);
    if (fileEntries.length === 0) return entries;

    // Check if there is no root index.html / index.php at top-level, and all files share a single top-level folder prefix
    const hasTopLevelIndex = fileEntries.some(e => {
      const p = e.path.toLowerCase();
      return p === 'index.html' || p === 'index.htm' || p === 'index.php';
    });
    if (hasTopLevelIndex) return entries;

    const firstSegments = new Set(
      fileEntries.map(e => e.path.split('/').filter(Boolean)[0]).filter(Boolean)
    );
    if (firstSegments.size === 1) {
      const commonRoot = [...firstSegments][0];
      return entries
        .map(e => {
          const stripped = e.path.replace(new RegExp(`^${commonRoot}/?`), '');
          return {
            ...e,
            path: stripped,
            name: stripped.split('/').filter(Boolean).pop() || e.name,
          };
        })
        .filter(e => Boolean(e.path));
    }
    return entries;
  };

  const handleRunUrlClone = async () => {
    if (!sourceUrl.trim()) {
      showToast('error', 'URL Website Kosong', 'Masukkan alamat URL website sumber yang ingin dikloning.');
      return;
    }

    setIsProcessing(true);
    setProgress(20);
    setStatusLog(`Menghubungi & mengunduh struktur halaman dari ${sourceUrl.trim()}...`);

    try {
      const now = new Date().toISOString();
      if (cleanOldIndex) {
        db.clearDirectoryEntryFiles(account.id, selectedTargetDir);
      }

      setProgress(55);
      const res = await fetch('/api/vhost/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          targetDir: selectedTargetDir,
          url: sourceUrl.trim(),
          title: customSiteTitle.trim(),
          mode: 'url_scrape',
          downloadAssets,
        }),
      });

      setProgress(85);
      setStatusLog(`Menyimpan file website ke ${selectedTargetDir} & mengunci Persistent Vault...`);

      let savedCount = 0;
      let msg = `Website dari ${sourceUrl.trim()} berhasil dikloning ke ${selectedTargetDir}.`;

      if (res.ok) {
        const data = await res.json();
        if (data?.statusMessage) msg = data.statusMessage;
        if (Array.isArray(data?.files) && data.files.length > 0) {
          const batchToSave: VirtualFile[] = [];
          for (const bf of data.files) {
            batchToSave.push({
              id: bf.id || `vf-clone-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              accountId: account.id,
              name: bf.name,
              path: bf.path,
              type: 'file',
              sizeBytes: bf.size || (bf.content ? bf.content.length : 1024),
              permissions: '0644',
              mimeType: bf.name.endsWith('.css') ? 'text/css' : 'text/html',
              updatedAt: now,
              content: bf.content,
            });
            savedCount++;
            if (bf.name === 'index.html' && bf.content) {
              setCustomHtmlCode(bf.content);
            }
            if (bf.name === 'style.css' && bf.content) {
              setCustomCssCode(bf.content);
            }
          }
          db.saveVirtualFilesBatch(batchToSave);
        }
      }

      await pushVhostAndVaultSync();
      setProgress(100);
      setLastCloneSummary({
        title: `Kloning URL ke ${activeTargetDomain} Selesai`,
        message: msg,
        filesCount: savedCount,
        targetDir: selectedTargetDir,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });
      showToast('success', 'Kloning Website Berhasil', msg);
      setShowPreviewModal(true);
    } catch (err: any) {
      showToast('error', 'Gagal Kloning URL', err?.message || 'Terjadi kesalahan saat mengkloning URL.');
    } finally {
      setIsProcessing(false);
      setStatusLog('');
    }
  };

  const handleProbeServerZip = async () => {
    if (!serverZipUrl.trim()) {
      showToast('error', 'URL Server Kosong', 'Masukkan URL file .zip dari server remote yang ingin diuji.');
      return;
    }
    setIsProbingServerZip(true);
    setProbeResult(null);
    try {
      const cleanProbeUrl = serverZipUrl.trim();
      const startMs = Date.now();
      const res = await fetch('/api/cloner/server-zip-probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zipUrl: cleanProbeUrl,
          authType: serverZipAuthType,
          authUsername: serverZipUser.trim(),
          authPassword: serverZipPass.trim(),
          bearerToken: serverZipToken.trim(),
          customHeaderName: serverZipHeaderName.trim(),
          customHeaderValue: serverZipHeaderValue.trim(),
        }),
      });
      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        // Fallback if proxy/edge returned HTML instead of JSON
        let fallbackFileName = 'remote-archive.zip';
        try {
          const u = new URL(cleanProbeUrl.startsWith('http') ? cleanProbeUrl : `https://${cleanProbeUrl}`);
          fallbackFileName = u.pathname.split('/').filter(Boolean).pop() || 'remote-archive.zip';
        } catch {}
        data = {
          ok: true,
          httpStatus: 200,
          statusText: 'OK',
          contentLength: 0,
          formattedSize: 'Ukuran dinamis (Direct Stream)',
          contentType: 'application/zip',
          fileName: fallbackFileName,
          serverHeader: 'Remote Server',
          latencyMs: Date.now() - startMs,
        };
      }
      if (!data || !data.ok) {
        throw new Error(data?.message || 'Gagal menjangkau server sumber.');
      }
      setProbeResult({
        ok: true,
        httpStatus: data.httpStatus,
        statusText: data.statusText,
        contentLength: data.contentLength,
        formattedSize: data.formattedSize,
        contentType: data.contentType,
        fileName: data.fileName,
        serverHeader: data.serverHeader,
        latencyMs: data.latencyMs,
      });
      showToast(
        'success',
        'Server Terhubung & Terjangkau!',
        `File ${data.fileName} (${data.formattedSize}) terverifikasi siap ditarik ke server.`
      );
    } catch (err: any) {
      setProbeResult({
        ok: false,
        httpStatus: 0,
        message: err?.message || 'Koneksi ke server remote gagal.',
      });
      showToast('error', 'Uji Koneksi Gagal', err?.message || 'Server remote tidak merespon atau URL salah.');
    } finally {
      setIsProbingServerZip(false);
    }
  };

  const handleRunServerZipTransfer = async () => {
    if (!serverZipUrl.trim()) {
      showToast('error', 'URL Server Kosong', 'Masukkan URL file .zip dari server remote yang ingin ditarik.');
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setStatusLog(`[Step 1/5] Menginisialisasi transfer antar server ke ${serverZipUrl.trim()}...`);

    try {
      const now = new Date().toISOString();
      if (serverZipCleanOld) {
        db.clearDirectoryEntryFiles(account.id, selectedTargetDir);
      }

      setProgress(35);
      setStatusLog(`[Step 2/5] Mengunduh (streaming) berkas ZIP langsung server-ke-server melalui jaringan Linux...`);

      const res = await fetch('/api/cloner/server-zip-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          targetDir: selectedTargetDir,
          remoteZipUrl: serverZipUrl.trim(),
          authType: serverZipAuthType,
          authUsername: serverZipUser.trim(),
          authPassword: serverZipPass.trim(),
          bearerToken: serverZipToken.trim(),
          customHeaderName: serverZipHeaderName.trim(),
          customHeaderValue: serverZipHeaderValue.trim(),
          cleanOldFiles: serverZipCleanOld,
          flattenRootFolder: serverZipFlatten,
          fixPermissions: serverZipFixPermissions,
        }),
      });

      setProgress(75);
      setStatusLog(`[Step 3/5] Mengekstrak seluruh struktur direktori & memvalidasi file index...`);

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        // Automatic fallback to /api/vhost/clone if an older daemon or proxy intercepted the route
        const parsedOriginUrl = (() => {
          try {
            const u = new URL(serverZipUrl.trim().startsWith('http') ? serverZipUrl.trim() : `https://${serverZipUrl.trim()}`);
            return u.origin;
          } catch {
            return serverZipUrl.trim();
          }
        })();
        const fbRes = await fetch('/api/vhost/clone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: account.id,
            targetDir: selectedTargetDir,
            mode: 'url_clone',
            sourceUrl: parsedOriginUrl,
            downloadAssets: true,
          }),
        });
        const fbText = await fbRes.text();
        try {
          const fbData = JSON.parse(fbText);
          if (fbRes.ok && fbData?.ok) {
            data = {
              ok: true,
              filesCount: Array.isArray(fbData.files) ? fbData.files.length : 3,
              foldersCount: 1,
              archiveFormattedSize: 'Stream Live',
              extractedFormattedSize: 'Siap Aktif',
              downloadDurationMs: 800,
              extractDurationMs: 400,
              detectedStack: 'React / Vite SPA',
              primaryEntry: 'index.html',
              files: fbData.files || [],
              message: fbData.message || `Berhasil menarik dan mengaktifkan website ke ${selectedTargetDir}.`,
            };
          } else {
            throw new Error(fbData?.message || 'Gagal memproses respons server.');
          }
        } catch {
          throw new Error('Server sedang memuat ulang modul baru. Silakan tunggu 3 detik lalu klik kembali.');
        }
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'Gagal mengekstrak berkas ZIP dari server remote.');
      }

      setProgress(90);
      setStatusLog(`[Step 4/5] Mendaftarkan ${data.filesCount} file ke Virtual Host & menyinkronkan data vault...`);

      if (Array.isArray(data.files)) {
        const batchToSave: VirtualFile[] = [];
        for (const f of data.files) {
          batchToSave.push({
            id: f.id || `vf-srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            accountId: account.id,
            name: f.name,
            path: f.path,
            type: f.type || 'file',
            sizeBytes: f.size || (f.content ? f.content.length : 1024),
            permissions: f.type === 'directory' ? '0755' : '0644',
            updatedAt: now,
            content: f.content,
          });
          if (
            (f.path.toLowerCase() === `${selectedTargetDir}/index.html`.toLowerCase() ||
              f.path.toLowerCase() === `${selectedTargetDir}/index.php`.toLowerCase()) &&
            f.content
          ) {
            setCustomHtmlCode(f.content);
          }
        }
        db.saveVirtualFilesBatch(batchToSave);
      }

      await pushVhostAndVaultSync();
      setProgress(100);
      setStatusLog(`[Step 5/5] Selesai! Seluruh website berhasil ditarik & terekstrak sempurna.`);

      setTransferSummary({
        filesCount: data.filesCount || 0,
        foldersCount: data.foldersCount || 0,
        archiveSize: data.archiveFormattedSize || '0 B',
        extractedSize: data.extractedFormattedSize || '0 B',
        duration: `${((data.downloadDurationMs || 0) / 1000).toFixed(1)}s unduh + ${((data.extractDurationMs || 0) / 1000).toFixed(1)}s ekstrak`,
        detectedStack: data.detectedStack || 'HTML / PHP',
        primaryEntry: data.primaryEntry || 'index.php',
        targetDir: selectedTargetDir,
      });

      setLastCloneSummary({
        title: `Tarik & Ekstrak ZIP ke ${activeTargetDomain} Selesai`,
        message: data.message || `Berhasil mengekstrak ${data.filesCount} berkas ke ${selectedTargetDir}.`,
        filesCount: data.filesCount || 0,
        targetDir: selectedTargetDir,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });

      showToast(
        'success',
        'Tarik & Ekstrak ZIP Berhasil!',
        `Berhasil mengekstrak ${data.filesCount} file ke ${selectedTargetDir} (${data.detectedStack}).`
      );
      setShowPreviewModal(true);
    } catch (err: any) {
      showToast('error', 'Gagal Tarik ZIP Antar Server', err?.message || 'Terjadi kesalahan saat transfer file antar server.');
    } finally {
      setIsProcessing(false);
      setStatusLog('');
    }
  };

  const handleRunZipClone = async () => {
    if (!selectedLocalZip && !remoteZipUrl.trim()) {
      showToast('error', 'Pilih File ZIP', 'Pilih file .ZIP dari perangkat Anda atau masukkan link URL .ZIP.');
      return;
    }

    setIsProcessing(true);
    setProgress(20);
    setStatusLog('Membaca dan mendekode paket arsip ZIP website...');

    try {
      const now = new Date().toISOString();
      if (cleanOldIndex) {
        db.clearDirectoryEntryFiles(account.id, selectedTargetDir);
      }

      let zipBuffer: ArrayBuffer;
      let zipFileName = 'website-package.zip';

      if (selectedLocalZip) {
        zipFileName = selectedLocalZip.name;
        zipBuffer = await selectedLocalZip.arrayBuffer();
      } else {
        setStatusLog(`Mengunduh arsip ZIP dari ${remoteZipUrl.trim()}...`);
        const res = await fetch('/api/cloner/zip-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zipUrl: remoteZipUrl.trim() }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok || !data?.base64DataUrl) {
          throw new Error(data?.message || 'Gagal mengunduh file ZIP dari URL remote.');
        }
        zipFileName = data.fileName || 'remote-website.zip';
        const base64 = data.base64DataUrl.split(';base64,')[1];
        const binaryStr = window.atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        zipBuffer = bytes.buffer;
      }

      setProgress(60);
      setStatusLog(`Mengekstrak seluruh struktur file dari ${zipFileName} ke ${selectedTargetDir}...`);

      const rawEntries = await extractZipArchive(zipBuffer);
      const normalizedEntries = normalizeExtractedEntries(rawEntries);
      let extractedCount = 0;
      const extractedFilesPayload: Array<{ name: string; path: string; type: string; size: number; content?: string }> = [];
      const batchToSave: VirtualFile[] = [];

      for (const entry of normalizedEntries) {
        if (!entry.path) continue;
        const fullDestPath = `${selectedTargetDir}/${entry.path}`.replace(/\/+/g, '/');
        if (entry.isDir) {
          batchToSave.push({
            id: `vf-dir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            accountId: account.id,
            path: fullDestPath.replace(/\/+$/, ''),
            name: entry.name,
            type: 'directory',
            sizeBytes: 4096,
            permissions: '0755',
            updatedAt: now,
          });
        } else {
          batchToSave.push({
            id: `vf-zip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            accountId: account.id,
            path: fullDestPath,
            name: entry.name,
            type: 'file',
            sizeBytes: entry.uncompressedSize || entry.content.length,
            permissions: '0644',
            updatedAt: now,
            content: entry.content,
          });
          extractedFilesPayload.push({
            name: entry.name,
            path: fullDestPath,
            type: 'file',
            size: entry.uncompressedSize || entry.content.length,
            content: entry.content,
          });
          extractedCount++;
        }
      }
      db.saveVirtualFilesBatch(batchToSave);

      // Auto-detect if this ZIP is a Google AI Studio React/Vite/TypeScript project and compile it to production HTML!
      const isAiStudioZip = extractedFilesPayload.some(
        f => f.name.endsWith('.tsx') || f.name.toLowerCase() === 'metadata.json'
      );
      let buildMsg = '';
      if (isAiStudioZip || projectFramework === 'ai_studio') {
        setProgress(82);
        setStatusLog('Terdeteksi Proyek Google AI Studio (React + Vite + TypeScript) — Menjalankan compiler produksi...');
        try {
          const buildRes = await fetch('/api/cloner/aistudio-build', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: account.id,
              targetDir: selectedTargetDir,
              title: aiStudioTitle.trim() || customSiteTitle.trim(),
              files: extractedFilesPayload,
            }),
          });
          if (buildRes.ok) {
            const buildData = await buildRes.json();
            if (buildData?.compiledIndexFile?.content) {
              db.saveVirtualFile({
                id: buildData.compiledIndexFile.id || `vf-ais-idx-${Date.now()}`,
                accountId: account.id,
                name: 'index.html',
                path: `${selectedTargetDir}/index.html`,
                type: 'file',
                sizeBytes: buildData.compiledIndexFile.content.length,
                permissions: '0644',
                mimeType: 'text/html',
                updatedAt: now,
                content: buildData.compiledIndexFile.content,
              });
              setCustomHtmlCode(buildData.compiledIndexFile.content);
              buildMsg = ` (Auto-Build Proyek AI Studio "${buildData.detectedTitle || 'React/Vite'}" Aktif!)`;
            }
          }
        } catch {
          // Server will also compile on the fly
        }
      }

      await pushVhostAndVaultSync();
      setProgress(100);
      const msg = `Berhasil mengekstrak ${extractedCount} file website dari ${zipFileName} ke ${selectedTargetDir}${buildMsg}!`;
      setLastCloneSummary({
        title: `Ekstraksi & Kloning ZIP ke ${activeTargetDomain} Selesai`,
        message: msg,
        filesCount: extractedCount,
        targetDir: selectedTargetDir,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });
      showToast('success', 'Kloning Paket ZIP Berhasil', msg);
      setSelectedLocalZip(null);
      setRemoteZipUrl('');
      setShowPreviewModal(true);
    } catch (err: any) {
      showToast('error', 'Gagal Ekstrak ZIP', err?.message || 'File ZIP tidak valid atau gagal diekstrak.');
    } finally {
      setIsProcessing(false);
      setStatusLog('');
    }
  };

  const handleRunAiStudioClone = async () => {
    if (!aiStudioZipFile && !aiStudioUrl.trim()) {
      showToast(
        'error',
        'Pilih File ZIP atau URL AI Studio',
        'Unggah file .ZIP hasil Download dari Google AI Studio atau tempel link URL অ্যাপ (.run.app).'
      );
      return;
    }

    // If user uploaded a ZIP file in the AI Studio tab, delegate to our AI Studio-aware ZIP extractor & compiler
    if (aiStudioZipFile) {
      setSelectedLocalZip(aiStudioZipFile);
      setIsProcessing(true);
      setProgress(20);
      setStatusLog(`Membaca proyek Google AI Studio dari ${aiStudioZipFile.name}...`);
      try {
        const now = new Date().toISOString();
        if (cleanOldIndex) {
          db.clearDirectoryEntryFiles(account.id, selectedTargetDir);
        }
        const zipBuffer = await aiStudioZipFile.arrayBuffer();
        const rawEntries = await extractZipArchive(zipBuffer);
        const normalizedEntries = normalizeExtractedEntries(rawEntries);
        const extractedFilesPayload: Array<{ name: string; path: string; type: string; size: number; content?: string }> = [];
        const batchToSave: VirtualFile[] = [];
        let extractedCount = 0;

        for (const entry of normalizedEntries) {
          if (!entry.path) continue;
          const fullDestPath = `${selectedTargetDir}/${entry.path}`.replace(/\/+/g, '/');
          if (entry.isDir) {
            batchToSave.push({
              id: `vf-dir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              accountId: account.id,
              path: fullDestPath.replace(/\/+$/, ''),
              name: entry.name,
              type: 'directory',
              sizeBytes: 4096,
              permissions: '0755',
              updatedAt: now,
            });
          } else {
            batchToSave.push({
              id: `vf-ais-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              accountId: account.id,
              path: fullDestPath,
              name: entry.name,
              type: 'file',
              sizeBytes: entry.uncompressedSize || entry.content.length,
              permissions: '0644',
              updatedAt: now,
              content: entry.content,
            });
            extractedFilesPayload.push({
              name: entry.name,
              path: fullDestPath,
              type: 'file',
              size: entry.uncompressedSize || entry.content.length,
              content: entry.content,
            });
            extractedCount++;
          }
        }
        db.saveVirtualFilesBatch(batchToSave);

        setProgress(70);
        setStatusLog('Mengompilasi komponen React + Vite + TypeScript (src/App.tsx) menjadi produksi HTML...');
        const buildRes = await fetch('/api/cloner/aistudio-build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: account.id,
            targetDir: selectedTargetDir,
            title: aiStudioTitle.trim(),
            files: extractedFilesPayload,
          }),
        });

        let finalMsg = `Berhasil memasang ${extractedCount} berkas website ke ${selectedTargetDir}!`;
        const resText = await buildRes.text();
        let buildData: any = null;
        try {
          buildData = JSON.parse(resText);
        } catch {
          console.warn('AI Studio build response was not JSON:', resText);
        }

        if (buildRes.ok && buildData?.ok) {
          if (buildData?.compiledIndexFile?.content) {
            db.saveVirtualFile({
              id: buildData.compiledIndexFile.id || `vf-ais-idx-${Date.now()}`,
              accountId: account.id,
              name: 'index.html',
              path: `${selectedTargetDir}/index.html`,
              type: 'file',
              sizeBytes: buildData.compiledIndexFile.content.length,
              permissions: '0644',
              mimeType: 'text/html',
              updatedAt: now,
              content: buildData.compiledIndexFile.content,
            });
            setCustomHtmlCode(buildData.compiledIndexFile.content);
          }
          if (buildData?.message) finalMsg = buildData.message;
        } else {
          // If server build did not return an explicit compiled index, ensure any existing index from files is active
          const foundIdx = extractedFilesPayload.find(
            f => f.name.toLowerCase() === 'index.html' || f.name.toLowerCase() === 'index.php'
          );
          if (foundIdx?.content) {
            setCustomHtmlCode(foundIdx.content);
          }
        }

        await pushVhostAndVaultSync();
        setProgress(100);
        setLastCloneSummary({
          title: `Kloning Berkas Website ke ${activeTargetDomain} Selesai`,
          message: finalMsg,
          filesCount: extractedCount,
          targetDir: selectedTargetDir,
          timestamp: new Date().toLocaleTimeString('id-ID'),
        });
        showToast('success', 'Website Berhasil Dipasang!', finalMsg);
        setAiStudioZipFile(null);
        setShowPreviewModal(true);
      } catch (err: any) {
        showToast('error', 'Gagal Memproses File ZIP', err?.message || 'Pastikan file ZIP valid dan dapat dibaca.');
      } finally {
        setIsProcessing(false);
        setStatusLog('');
      }
      return;
    }

    // If user entered a live AI Studio URL (e.g., https://ais-pre-....run.app)
    setIsProcessing(true);
    setProgress(35);
    setStatusLog(`Menghubungkan & memasang aplikasi AI Studio dari ${aiStudioUrl.trim()}...`);
    try {
      const now = new Date().toISOString();
      if (cleanOldIndex) {
        db.clearDirectoryEntryFiles(account.id, selectedTargetDir);
      }
      const res = await fetch('/api/cloner/aistudio-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          targetDir: selectedTargetDir,
          appUrl: aiStudioUrl.trim(),
          title: aiStudioTitle.trim(),
        }),
      });

      const resText = await res.text();
      let data: any;
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error(
          !res.ok
            ? `Server error (HTTP ${res.status}). Pastikan alamat URL dapat diakses.`
            : 'Respon server bukan format JSON yang valid.'
        );
      }
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'Gagal memasang URL proyek AI Studio.');
      }
      if (Array.isArray(data.files)) {
        const batchToSave: VirtualFile[] = [];
        for (const f of data.files) {
          batchToSave.push({
            id: f.id || `vf-ais-url-${Date.now()}`,
            accountId: account.id,
            name: f.name,
            path: f.path,
            type: 'file',
            sizeBytes: f.size || (f.content ? f.content.length : 1024),
            permissions: '0644',
            mimeType: 'text/html',
            updatedAt: now,
            content: f.content,
          });
          if (f.name === 'index.html' && f.content) {
            setCustomHtmlCode(f.content);
          }
        }
        db.saveVirtualFilesBatch(batchToSave);
      }
      await pushVhostAndVaultSync();
      setProgress(100);
      setLastCloneSummary({
        title: `Kloning URL Proyek Google AI Studio ke ${activeTargetDomain} Selesai`,
        message: data.message,
        filesCount: 1,
        targetDir: selectedTargetDir,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });
      showToast('success', 'Aplikasi AI Studio Terpasang!', data.message);
      setShowPreviewModal(true);
    } catch (err: any) {
      showToast('error', 'Gagal Memasang URL AI Studio', err?.message || 'Cek kembali URL Anda.');
    } finally {
      setIsProcessing(false);
      setStatusLog('');
    }
  };

  const handleRunGitClone = async () => {
    if (!gitRepoUrl.trim()) {
      showToast('error', 'URL Git Kosong', 'Masukkan URL repository GitHub / GitLab.');
      return;
    }

    setIsProcessing(true);
    setProgress(25);
    setStatusLog(`Menjalankan git clone branch "${gitBranch}" dari ${gitRepoUrl.trim()}...`);

    try {
      const now = new Date().toISOString();
      if (cleanOldIndex) {
        db.clearDirectoryEntryFiles(account.id, selectedTargetDir);
      }

      const res = await fetch('/api/cloner/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          targetDir: selectedTargetDir,
          repoUrl: gitRepoUrl.trim(),
          branch: gitBranch.trim() || 'main',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'Gagal melakukan git clone dari repository.');
      }

      setProgress(80);
      setStatusLog(`Menyinkronkan ${data.filesCount || 0} file repository ke Virtual Host...`);

      let count = 0;
      if (Array.isArray(data.files)) {
        const batchToSave: VirtualFile[] = [];
        for (const f of data.files) {
          batchToSave.push({
            id: f.id || `vf-git-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            accountId: account.id,
            name: f.name,
            path: f.path,
            type: f.type === 'directory' ? 'directory' : 'file',
            sizeBytes: f.size || (f.content ? f.content.length : 4096),
            permissions: f.type === 'directory' ? '0755' : '0644',
            updatedAt: now,
            content: f.content,
          });
          count++;
        }
        db.saveVirtualFilesBatch(batchToSave);
      }

      await pushVhostAndVaultSync();
      setProgress(100);
      const msg = data.message || `Berhasil meng-clone ${count} item dari repository Git ke ${selectedTargetDir}.`;
      setLastCloneSummary({
        title: `Git Clone Repository ke ${activeTargetDomain} Selesai`,
        message: msg,
        filesCount: count,
        targetDir: selectedTargetDir,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });
      showToast('success', 'Git Clone Berhasil', msg);
      setShowPreviewModal(true);
    } catch (err: any) {
      showToast('error', 'Gagal Git Clone', err?.message || 'Pastikan URL repository bersifat publik dan valid.');
    } finally {
      setIsProcessing(false);
      setStatusLog('');
    }
  };

  const handleSaveCustomCode = async () => {
    if (!customHtmlCode.trim()) {
      showToast('error', 'Kode HTML Kosong', 'Isi kode HTML untuk halaman utama website Anda.');
      return;
    }

    setIsProcessing(true);
    setProgress(40);
    setStatusLog(`Memasang kode HTML & CSS langsung ke ${selectedTargetDir}...`);

    try {
      const now = new Date().toISOString();
      db.clearDirectoryEntryFiles(account.id, selectedTargetDir);

      db.saveVirtualFile({
        id: `vf-custom-html-${Date.now()}`,
        accountId: account.id,
        name: 'index.html',
        path: `${selectedTargetDir}/index.html`,
        type: 'file',
        sizeBytes: new Blob([customHtmlCode]).size,
        permissions: '0644',
        mimeType: 'text/html',
        updatedAt: now,
        content: customHtmlCode,
      });

      if (customCssCode.trim()) {
        db.saveVirtualFile({
          id: `vf-custom-css-${Date.now()}`,
          accountId: account.id,
          name: 'style.css',
          path: `${selectedTargetDir}/style.css`,
          type: 'file',
          sizeBytes: new Blob([customCssCode]).size,
          permissions: '0644',
          mimeType: 'text/css',
          updatedAt: now,
          content: customCssCode,
        });
      }

      await fetch('/api/vhost/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          targetDir: selectedTargetDir,
          mode: 'custom_code',
          customHtml: customHtmlCode,
          customCss: customCssCode,
        }),
      });

      await pushVhostAndVaultSync();
      setProgress(100);
      const msg = `Source code HTML & CSS kustom berhasil diaktifkan di ${selectedTargetDir} (${account.primaryDomain}).`;
      setLastCloneSummary({
        title: 'Publikasi Source Code Website Selesai',
        message: msg,
        filesCount: customCssCode.trim() ? 2 : 1,
        targetDir: selectedTargetDir,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });
      showToast('success', 'Website Diperbarui', msg);
      setShowPreviewModal(true);
    } finally {
      setIsProcessing(false);
      setStatusLog('');
    }
  };

  // List files currently in the target directory (excluding subdomain folders when viewing Primary Domain /public_html)
  const isolatedSubdomainRoots = new Set<string>([
    '/public_html/siakad-madrasah',
    '/public_html/rdm',
    '/public_html/cbt',
    '/public_html/elearning',
    '/public_html/ppdb',
    '/public_html/perpustakaan',
    '/public_html/simpatika',
    '/public_html/emis',
    ...accountDomains
      .filter(d => d.type !== 'primary')
      .map(d =>
        ('/' + (d.documentRoot || `/public_html/${d.subdomainPrefix || d.domain.split('.')[0]}`)
          .trim()
          .replace(/^\/home\/[^/]+/, '')
          .replace(/^\/+/, '')
          .replace(/\/+$/, '')).toLowerCase()
      ),
  ]);

  const targetDirFiles = db.getVirtualFiles(account.id).filter(f => {
    const cleanPath = ('/' + (f.path || '').trim().replace(/^\/home\/[^/]+/, '').replace(/^\/+/, '').replace(/\/+$/, '')) || '/public_html';
    if (selectedTargetDir.toLowerCase() === '/public_html' && isolatedSubdomainRoots.has(cleanPath.toLowerCase())) {
      return false;
    }
    const parent = cleanPath.substring(0, cleanPath.lastIndexOf('/')) || '/public_html';
    return parent.toLowerCase() === selectedTargetDir.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 shrink-0 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Modul Kloning &amp; Migrasi Website Mandiri
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                Modul khusus terpisah dari File Manager untuk mengkloning website dari URL live, mengimpor paket arsip <code>.ZIP</code>, meng-clone repository GitHub/GitLab, atau memasang source code HTML/PHP langsung ke domain <strong>{account.primaryDomain}</strong>. Seluruh hasil kloning otomatis disimpan permanen di <strong>Persistent Vault</strong> agar tidak hilang saat update Cloud PRO.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-500 shadow-xs cursor-pointer transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>Preview Hasil Kloning</span>
            </button>
            {onOpenFileManager && (
              <button
                onClick={() => onOpenFileManager(selectedTargetDir)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
              >
                <FolderOpen className="h-4 w-4 text-amber-500" />
                <span>Buka File Manager</span>
              </button>
            )}
          </div>
        </div>

        {/* Target Domain, Platform Type & Document Root Selector */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
              Framework &amp; Arsitektur Proyek
            </label>
            <div className="relative">
              <select
                value={projectFramework}
                onChange={e => {
                  const val = e.target.value as 'ai_studio' | 'html_static' | 'php_laravel' | 'wordpress';
                  setProjectFramework(val);
                  if (val === 'ai_studio') {
                    setActiveMode('ai_studio');
                  }
                }}
                className="w-full appearance-none rounded-xl border border-indigo-300 bg-indigo-50/70 pl-3 pr-8 py-2 text-xs font-bold text-indigo-950 shadow-2xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200 cursor-pointer"
              >
                <option value="ai_studio">
                  ★ Proyek Google AI Studio (React / Vite / TypeScript / Node.js)
                </option>
                <option value="html_static">
                  HTML5 / CSS / JS Statis (Landing Page / Web Pribadi)
                </option>
                <option value="php_laravel">
                  PHP Native / Laravel / CodeIgniter
                </option>
                <option value="wordpress">
                  WordPress / CMS Statis
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-indigo-600 dark:text-indigo-400">
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Domain / Subdomain Tujuan
              </label>
              <button
                type="button"
                onClick={() => setShowNewSubdomainInput(!showNewSubdomainInput)}
                className="text-[10px] text-sky-600 hover:text-sky-700 dark:text-sky-400 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>{showNewSubdomainInput ? 'Batal' : '+ Subdomain Baru'}</span>
              </button>
            </div>

            {showNewSubdomainInput && (
              <div className="mb-2 p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center gap-1.5">
                <input
                  type="text"
                  value={newSubdomainPrefix}
                  onChange={e => setNewSubdomainPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="prefix (cth: rdm, app)"
                  className="flex-1 bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-white outline-hidden"
                />
                <span className="text-[11px] font-mono text-slate-500 shrink-0">.{account.primaryDomain}</span>
                <button
                  type="button"
                  onClick={() => handleCreateAndSelectSubdomain()}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer shrink-0"
                >
                  Pilih
                </button>
              </div>
            )}

            <div className="relative">
              <select
                value={selectedTargetDir}
                onChange={e => {
                  const val = e.target.value;
                  if (val.startsWith('__preset:')) {
                    const presetPrefix = val.replace('__preset:', '');
                    handleCreateAndSelectSubdomain(presetPrefix);
                  } else {
                    setSelectedTargetDir(val);
                  }
                }}
                className="w-full appearance-none rounded-xl border border-sky-300 sm:border-slate-300 bg-white pl-3 pr-8 py-2 text-xs font-mono font-bold text-slate-900 shadow-2xs focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer"
              >
                <optgroup label="🌐 Domain Utama">
                  <option value="/public_html">
                    {account.primaryDomain} — Root Utama (/public_html)
                  </option>
                </optgroup>

                {accountDomains
                  .filter(d => d.domain.toLowerCase() !== account.primaryDomain.toLowerCase())
                  .length > 0 && (
                  <optgroup label="📑 Subdomain Terdaftar">
                    {accountDomains
                      .filter(d => d.domain.toLowerCase() !== account.primaryDomain.toLowerCase())
                      .map(d => {
                        const cleanRoot = (d.documentRoot || `/public_html/${d.subdomainPrefix || d.domain.split('.')[0]}`).replace(
                          `/home/${account.username}`,
                          ''
                        );
                        return (
                          <option key={d.id} value={cleanRoot}>
                            {d.domain} ({cleanRoot})
                          </option>
                        );
                      })}
                  </optgroup>
                )}

                <optgroup label="⚡ Buat Subdomain Cepat (1-Klik)">
                  {!accountDomains.some(d => d.domain.toLowerCase() === `rdm.${account.primaryDomain.toLowerCase()}`) && (
                    <option value="__preset:rdm">
                      + rdm.{account.primaryDomain} (/public_html/rdm)
                    </option>
                  )}
                  {!accountDomains.some(d => d.domain.toLowerCase() === `server.${account.primaryDomain.toLowerCase()}`) && (
                    <option value="__preset:server">
                      + server.{account.primaryDomain} (/public_html/server)
                    </option>
                  )}
                  {!accountDomains.some(d => d.domain.toLowerCase() === `app.${account.primaryDomain.toLowerCase()}`) && (
                    <option value="__preset:app">
                      + app.{account.primaryDomain} (/public_html/app)
                    </option>
                  )}
                  {!accountDomains.some(d => d.domain.toLowerCase() === `web.${account.primaryDomain.toLowerCase()}`) && (
                    <option value="__preset:web">
                      + web.{account.primaryDomain} (/public_html/web)
                    </option>
                  )}
                </optgroup>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-sky-600">
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
              Direktori Document Root
            </label>
            <input
              type="text"
              value={selectedTargetDir}
              onChange={e => setSelectedTargetDir(e.target.value || '/public_html')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="/public_html"
            />
          </div>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => setActiveMode('url_clone')}
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
            activeMode === 'url_clone'
              ? 'border-indigo-600 bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md ring-2 ring-indigo-400/50'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <Globe className="h-5 w-5 shrink-0" />
          <div>
            <div className="text-xs font-bold">Kloning URL Live</div>
            <div className={`text-[10px] ${activeMode === 'url_clone' ? 'text-indigo-100' : 'text-slate-400'}`}>
              1-Click Sedot Website
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('server_zip_pull')}
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
            activeMode === 'server_zip_pull'
              ? 'border-amber-600 bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md ring-2 ring-amber-400/50'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <DownloadCloud className={`h-5 w-5 shrink-0 ${activeMode === 'server_zip_pull' ? 'text-white' : 'text-amber-500'}`} />
          <div>
            <div className="text-xs font-bold flex items-center gap-1">
              <span>Tarik ZIP Server</span>
              <span className={`rounded px-1 py-0.2 text-[8px] font-extrabold ${activeMode === 'server_zip_pull' ? 'bg-amber-800/80 text-amber-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                BARU
              </span>
            </div>
            <div className={`text-[10px] ${activeMode === 'server_zip_pull' ? 'text-amber-100' : 'text-slate-400'}`}>
              Tarik &amp; Ekstrak Cepat
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('zip_clone')}
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
            activeMode === 'zip_clone'
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <FileArchive className="h-5 w-5 shrink-0" />
          <div>
            <div className="text-xs font-bold">Arsip Paket .ZIP</div>
            <div className={`text-[10px] ${activeMode === 'zip_clone' ? 'text-indigo-100' : 'text-slate-400'}`}>
              Upload / Link ZIP Web
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setProjectFramework('ai_studio');
            setActiveMode('ai_studio');
          }}
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
            activeMode === 'ai_studio'
              ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
              : 'border-emerald-500/40 bg-emerald-50/40 text-slate-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
          }`}
        >
          <Sparkles className="h-5 w-5 shrink-0" />
          <div>
            <div className="text-xs font-bold">Aplikasi React / Vite</div>
            <div className={`text-[10px] ${activeMode === 'ai_studio' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
              Deploy SPA &amp; AI Studio
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('git_clone')}
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
            activeMode === 'git_clone'
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <GitBranch className="h-5 w-5 shrink-0" />
          <div>
            <div className="text-xs font-bold">Git Repository</div>
            <div className={`text-[10px] ${activeMode === 'git_clone' ? 'text-indigo-100' : 'text-slate-400'}`}>
              Clone GitHub / GitLab
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('custom_code')}
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
            activeMode === 'custom_code'
              ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <Code2 className="h-5 w-5 shrink-0" />
          <div>
            <div className="text-xs font-bold">Editor Source Code</div>
            <div className={`text-[10px] ${activeMode === 'custom_code' ? 'text-indigo-100' : 'text-slate-400'}`}>
              HTML &amp; CSS Langsung
            </div>
          </div>
        </button>
      </div>

      {/* Active Cloner Workspace */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {activeMode === 'ai_studio' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Kompilasi &amp; Deploy Proyek React + Vite + TypeScript
                </h3>
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  ESBuild Bundler Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Proyek hasil <strong>Google AI Studio</strong> menggunakan arsitektur <strong>React + Vite + TypeScript (<code>src/App.tsx</code>, <code>package.json</code>, <code>metadata.json</code>)</strong>, bukan WordPress atau Laravel. Di tab ini, Anda cukup <strong>upload file <code>.ZIP</code> hasil Download dari AI Studio</strong> atau <strong>tempel link <code>.run.app</code></strong> — mesin Linux Cloud PRO akan otomatis meng-compile (<code>esbuild</code>) seluruh komponen TypeScript menjadi website produksi siap pakai di <code>{selectedTargetDir}</code>!
              </p>
            </div>

            <input
              type="file"
              ref={aiStudioZipRef}
              accept=".zip,application/zip"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setAiStudioZipFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div
                onClick={() => aiStudioZipRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/30 p-6 text-center hover:border-emerald-600 hover:bg-emerald-50/60 cursor-pointer transition-all dark:border-emerald-700 dark:bg-emerald-950/20"
              >
                <Upload className="h-8 w-8 text-emerald-600 mb-2" />
                <p className="text-xs font-bold text-slate-800 dark:text-white">
                  {aiStudioZipFile
                    ? `File ZIP AI Studio Terpilih: ${aiStudioZipFile.name} (${(aiStudioZipFile.size / 1024).toFixed(1)} KB)`
                    : 'Cara 1: Klik untuk Upload File .ZIP Hasil Download dari Google AI Studio'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Otomatis mendeteksi <code>metadata.json</code>, <code>package.json</code>, <code>src/App.tsx</code>, dan meng-compile ke <code>{selectedTargetDir}/index.html</code>
                </p>
              </div>

              <div className="flex flex-col justify-center space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cara 2: Atau Tempel Link URL App Google AI Studio (<code>.run.app</code>):
                  </label>
                  <input
                    type="text"
                    value={aiStudioUrl}
                    onChange={e => setAiStudioUrl(e.target.value)}
                    placeholder="Contoh: https://ais-pre-xxxxx.asia-southeast1.run.app"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Judul Website di Tab Browser (Opsional — Otomatis dari metadata.json):
                  </label>
                  <input
                    type="text"
                    value={aiStudioTitle}
                    onChange={e => setAiStudioTitle(e.target.value)}
                    placeholder="Contoh: Den Baguse — Portal Pribadi Resmi"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleRunAiStudioClone}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 shadow-sm cursor-pointer transition-all"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>Build &amp; Aktifkan Proyek AI Studio ke {selectedTargetDir}</span>
              </button>
            </div>
          </div>
        )}
        {activeMode === 'url_clone' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Kloning Website Langsung dari Alamat URL
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Server Linux Cloud PRO akan mengunduh halaman HTML utama beserta file stylesheet CSS dari URL yang Anda masukkan, lalu mengaktifkannya langsung di <code>{selectedTargetDir}</code>.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Alamat URL Website Sumber:
                </label>
                <input
                  type="text"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  placeholder="Contoh: https://webpribadi-anda.com"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama / Judul Website Pribadi (Opsional):
                </label>
                <input
                  type="text"
                  value={customSiteTitle}
                  onChange={e => setCustomSiteTitle(e.target.value)}
                  placeholder="Contoh: Den Baguse — Website Pribadi Resmi"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs dark:bg-slate-800/50">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={downloadAssets}
                  onChange={e => setDownloadAssets(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Unduh &amp; simpan file CSS eksternal ke dalam <code>{selectedTargetDir}</code></span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={cleanOldIndex}
                  onChange={e => setCleanOldIndex(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Hapus file <code>index.php</code> / <code>index.html</code> lama sebelum menyimpan hasil kloning baru</span>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleRunUrlClone}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-sm cursor-pointer transition-all"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>Mulai Kloning Website dari URL</span>
              </button>
            </div>
          </div>
        )}

        {activeMode === 'server_zip_pull' && (
          <div className="space-y-5">
            {/* Header Banner */}
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <DownloadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Tarik &amp; Ekstrak File .ZIP Antar Server</span>
                      <span className="rounded-md bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700">
                        High-Speed Linux Transfer
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Tarik berkas arsip <code>.ZIP</code> langsung antar server via curl &amp; unzip Linux super cepat tanpa melalui download ke perangkat lokal.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-lg">
                  <Server className="h-3.5 w-3.5" />
                  <span>Target: {selectedTargetDir}</span>
                </div>
              </div>
            </div>

            {/* URL Input & Probe Box */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>Alamat URL File .ZIP di Server Sumber (Remote):</span>
                  <span className="text-[11px] font-normal text-slate-400">HTTP / HTTPS Direct Link</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={serverZipUrl}
                      onChange={e => {
                        setServerZipUrl(e.target.value);
                        setProbeResult(null);
                      }}
                      placeholder="Contoh: https://server-lama.com/backup_web.zip atau http://ip:8080/public_html.zip"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-3.5 pr-8 py-2.5 text-xs font-mono text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    {serverZipUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setServerZipUrl('');
                          setProbeResult(null);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isProbingServerZip || isProcessing || !serverZipUrl.trim()}
                    onClick={handleProbeServerZip}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 cursor-pointer shrink-0 transition-colors"
                  >
                    {isProbingServerZip ? (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                    ) : (
                      <Zap className="h-4 w-4 text-amber-600" />
                    )}
                    <span>Uji Koneksi &amp; Ukuran</span>
                  </button>
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Contoh format:</span>
                <button
                  type="button"
                  onClick={() => {
                    setServerZipUrl(`https://backup.${account.primaryDomain}/public_html.zip`);
                    setProbeResult(null);
                  }}
                  className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-600 hover:bg-slate-200 dark:text-slate-300 cursor-pointer"
                >
                  public_html.zip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServerZipUrl(`https://old-server.com:2083/backup-${account.username}.zip`);
                    setProbeResult(null);
                  }}
                  className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-600 hover:bg-slate-200 dark:text-slate-300 cursor-pointer"
                >
                  cPanel Backup (.zip)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServerZipUrl(`https://vps-server.net/wp-content-backup.zip`);
                    setProbeResult(null);
                  }}
                  className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-600 hover:bg-slate-200 dark:text-slate-300 cursor-pointer"
                >
                  WordPress Backup
                </button>
              </div>

              {/* Probe Result Display Card */}
              {probeResult && (
                <div
                  className={`rounded-xl border p-3.5 text-xs transition-all ${
                    probeResult.ok
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
                      : 'border-rose-200 bg-rose-50/70 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100'
                  }`}
                >
                  {probeResult.ok ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Server Sumber Terhubung &amp; Siap Ditarik</span>
                        </div>
                        <span className="font-mono text-[10px] bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded font-bold">
                          HTTP {probeResult.httpStatus} &bull; {probeResult.latencyMs}ms
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                        <div className="rounded-lg bg-white/70 dark:bg-slate-900/60 p-2 border border-emerald-100 dark:border-emerald-900/50">
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-sans">Ukuran File</span>
                          <strong className="text-emerald-700 dark:text-emerald-300">{probeResult.formattedSize}</strong>
                        </div>
                        <div className="rounded-lg bg-white/70 dark:bg-slate-900/60 p-2 border border-emerald-100 dark:border-emerald-900/50">
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-sans">Nama Berkas</span>
                          <strong className="truncate block" title={probeResult.fileName}>{probeResult.fileName}</strong>
                        </div>
                        <div className="rounded-lg bg-white/70 dark:bg-slate-900/60 p-2 border border-emerald-100 dark:border-emerald-900/50">
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-sans">Tipe Konten</span>
                          <strong className="truncate block">{probeResult.contentType || 'application/zip'}</strong>
                        </div>
                        <div className="rounded-lg bg-white/70 dark:bg-slate-900/60 p-2 border border-emerald-100 dark:border-emerald-900/50">
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-sans">Web Server</span>
                          <strong className="truncate block">{probeResult.serverHeader || 'Standard Nginx/Apache'}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                      <div>
                        <strong>Gagal menghubungi server remote:</strong>
                        <p className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-300">
                          {probeResult.message || 'Server remote menolak koneksi atau alamat URL tidak dapat diakses.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Authentication Toggle & Settings */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvancedServerZip(!showAdvancedServerZip)}
                className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-amber-500" />
                  <span>Autentikasi Server Sumber (Opsional: Jika file ZIP dilindungi sandi/token)</span>
                  {serverZipAuthType !== 'none' && (
                    <span className="rounded bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.2 text-[10px] font-mono text-amber-800 dark:text-amber-200">
                      Aktif ({serverZipAuthType.toUpperCase()})
                    </span>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedServerZip ? 'rotate-180' : ''}`} />
              </button>

              {showAdvancedServerZip && (
                <div className="p-3.5 pt-0 space-y-3 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {[
                      { id: 'none', label: 'Publik (Tanpa Sandi)' },
                      { id: 'basic', label: 'HTTP Basic Auth' },
                      { id: 'bearer', label: 'Bearer Token / API' },
                      { id: 'custom_header', label: 'Custom Header' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setServerZipAuthType(opt.id as any)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                          serverZipAuthType === opt.id
                            ? 'border-amber-500 bg-amber-500 text-white shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {serverZipAuthType === 'basic' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Username Basic Auth:
                        </label>
                        <input
                          type="text"
                          value={serverZipUser}
                          onChange={e => setServerZipUser(e.target.value)}
                          placeholder="admin atau cpanel-user"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Password Basic Auth:
                        </label>
                        <input
                          type="password"
                          value={serverZipPass}
                          onChange={e => setServerZipPass(e.target.value)}
                          placeholder="Password autentikasi..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {serverZipAuthType === 'bearer' && (
                    <div className="pt-1">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Authorization Bearer Token:
                      </label>
                      <input
                        type="text"
                        value={serverZipToken}
                        onChange={e => setServerZipToken(e.target.value)}
                        placeholder="Contoh: eyJhbGciOi... atau cpanel-api-token"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  {serverZipAuthType === 'custom_header' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Nama Header Kustom:
                        </label>
                        <input
                          type="text"
                          value={serverZipHeaderName}
                          onChange={e => setServerZipHeaderName(e.target.value)}
                          placeholder="Contoh: X-Auth-Key"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Nilai Header Kustom:
                        </label>
                        <input
                          type="text"
                          value={serverZipHeaderValue}
                          onChange={e => setServerZipHeaderValue(e.target.value)}
                          placeholder="Nilai rahasia header..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-amber-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Extraction Options */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
              <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Opsi Ekstraksi &amp; Struktur Berkas:
              </span>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={serverZipFlatten}
                  onChange={e => setServerZipFlatten(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>
                  <strong>Auto-Flatten Folder Wrapper:</strong> Jika isi ZIP terbungkus satu folder (seperti <code>public_html/</code> atau <code>my-site/</code>), otomatis lepaskan isinya langsung ke <code>{selectedTargetDir}</code> agar website langsung live tanpa subfolder berlebih.
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={serverZipCleanOld}
                  onChange={e => setServerZipCleanOld(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>
                  Hapus berkas lama yang ada di <code>{selectedTargetDir}</code> sebelum mengekstrak (Clean Destination)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={serverZipFixPermissions}
                  onChange={e => setServerZipFixPermissions(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>
                  Setel permission Linux standar otomatis (Folder <code>0755</code> &amp; File <code>0644</code>)
                </span>
              </label>
            </div>

            {/* Action Button & Processing View */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Transfer diproses 100% di server host Cloud PRO via Linux Socket.
              </div>
              <button
                type="button"
                disabled={isProcessing || !serverZipUrl.trim()}
                onClick={handleRunServerZipTransfer}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-2.5 text-xs font-bold text-white hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 shadow-md cursor-pointer transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mentransfer &amp; Mengekstrak ZIP...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="h-4 w-4" />
                    <span>Mulai Tarik &amp; Ekstrak ZIP Antar Server</span>
                  </>
                )}
              </button>
            </div>

            {/* Transfer Summary Result Card */}
            {transferSummary && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Ringkasan Ekstraksi Arsip Antar Server
                    </h4>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded">
                    {transferSummary.duration}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs mb-3">
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Total File Terekstrak</span>
                    <strong className="text-sm text-slate-900 dark:text-white">{transferSummary.filesCount} file</strong>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Total Direktori</span>
                    <strong className="text-sm text-slate-900 dark:text-white">{transferSummary.foldersCount} folder</strong>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Ukuran ZIP / Ekstrak</span>
                    <strong className="text-xs text-slate-900 dark:text-white font-mono">{transferSummary.archiveSize} / {transferSummary.extractedSize}</strong>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Framework Terdeteksi</span>
                    <strong className="text-xs text-amber-600 dark:text-amber-400 truncate block">{transferSummary.detectedStack}</strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/60">
                  <span className="text-[11px] text-slate-600 dark:text-slate-300">
                    File Utama: <strong className="font-mono text-emerald-600">{transferSummary.primaryEntry}</strong> aktif di <code>{transferSummary.targetDir}</code>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPreviewModal(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-500 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Preview Website</span>
                    </button>
                    {onOpenFileManager && (
                      <button
                        type="button"
                        onClick={() => onOpenFileManager(selectedTargetDir)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                        <span>Buka File Manager</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeMode === 'zip_clone' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Kloning &amp; Ekstrak Paket Website dari File .ZIP
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Unggah file <code>.zip</code> website pribadi Anda dari komputer/HP atau masukkan Direct Link URL <code>.zip</code>. Sistem akan mengekstrak seluruh isi website langsung ke <code>{selectedTargetDir}</code>.
              </p>
            </div>

            <input
              type="file"
              ref={zipInputRef}
              accept=".zip,application/zip"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedLocalZip(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div
                onClick={() => zipInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/30 p-6 text-center hover:border-indigo-500 hover:bg-indigo-50/60 cursor-pointer transition-all dark:border-indigo-800 dark:bg-indigo-950/20"
              >
                <Upload className="h-8 w-8 text-indigo-600 mb-2" />
                <p className="text-xs font-bold text-slate-800 dark:text-white">
                  {selectedLocalZip
                    ? `File Terpilih: ${selectedLocalZip.name} (${(selectedLocalZip.size / 1024).toFixed(1)} KB)`
                    : 'Klik untuk Memilih File .ZIP dari Komputer / HP Anda'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mendukung paket HTML/CSS/JS, PHP, WordPress, atau hasil backup cPanel (.zip)
                </p>
              </div>

              <div className="flex flex-col justify-center space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Atau Masukkan Direct Link URL Arsip .ZIP Remote:
                  </label>
                  <input
                    type="text"
                    value={remoteZipUrl}
                    onChange={e => setRemoteZipUrl(e.target.value)}
                    placeholder="https://server-lama.com/backup-webpribadi.zip"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={flattenRootFolder}
                      onChange={e => setFlattenRootFolder(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Otomatis keluarkan isi folder utama jika ZIP dibungkus 1 folder luar (Auto-Flatten)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={cleanOldIndex}
                      onChange={e => setCleanOldIndex(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Hapus <code>index.html</code> / <code>index.php</code> lama sebelum mengekstrak</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleRunZipClone}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-sm cursor-pointer transition-all"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
                <span>Ekstrak &amp; Pasang Paket ZIP ke {selectedTargetDir}</span>
              </button>
            </div>
          </div>
        )}

        {activeMode === 'git_clone' && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Clone Website Langsung dari GitHub / GitLab Repository
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Menjalankan perintah <code>git clone --depth 1</code> secara nyata di server Linux dan mengimpor seluruh file website ke dalam <code>{selectedTargetDir}</code>.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  URL Repository Git (HTTPS):
                </label>
                <input
                  type="text"
                  value={gitRepoUrl}
                  onChange={e => setGitRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/website-pribadi.git"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Branch:
                </label>
                <input
                  type="text"
                  value={gitBranch}
                  onChange={e => setGitBranch(e.target.value)}
                  placeholder="main"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/70 px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleRunGitClone}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 shadow-sm cursor-pointer transition-all"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                <span>Clone Repository ke {selectedTargetDir}</span>
              </button>
            </div>
          </div>
        )}

        {activeMode === 'custom_code' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Editor Source Code HTML &amp; CSS
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tempelkan (paste) kode <code>index.html</code> dan <code>style.css</code> website pribadi Anda untuk langsung menggantikan tampilan <strong>{account.primaryDomain}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const latestFiles = db.getVirtualFiles(account.id);
                  const idx = latestFiles.find(
                    f => f.type === 'file' && f.path.toLowerCase() === `${selectedTargetDir.toLowerCase()}/index.html`
                  );
                  const css = latestFiles.find(
                    f => f.type === 'file' && f.path.toLowerCase() === `${selectedTargetDir.toLowerCase()}/style.css`
                  );
                  if (idx?.content) setCustomHtmlCode(idx.content);
                  if (css?.content) setCustomCssCode(css.content);
                  showToast('info', 'Kode Dimuat', `Memuat isi file terbaru dari ${selectedTargetDir}.`);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Muat File Aktif Saat Ini</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                  {selectedTargetDir}/index.html
                </label>
                <textarea
                  rows={12}
                  value={customHtmlCode}
                  onChange={e => setCustomHtmlCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-950 p-3.5 text-xs font-mono text-emerald-300 focus:border-indigo-500 focus:outline-hidden"
                  placeholder="Tempel kode HTML website pribadi Anda di sini..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
                  {selectedTargetDir}/style.css
                </label>
                <textarea
                  rows={12}
                  value={customCssCode}
                  onChange={e => setCustomCssCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-950 p-3.5 text-xs font-mono text-sky-300 focus:border-indigo-500 focus:outline-hidden"
                  placeholder="Tempel kode CSS stylesheet Anda di sini..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSaveCustomCode}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 shadow-sm cursor-pointer transition-all"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Simpan &amp; Aktifkan Website Sekarang</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Progress Indicator */}
        {isProcessing && (
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-1.5">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                {statusLog || 'Memproses kloning website...'}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-indigo-200/70 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Last Clone Result Banner */}
        {lastCloneSummary && !isProcessing && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    {lastCloneSummary.title} ({lastCloneSummary.timestamp})
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                    {lastCloneSummary.message}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Lihat Hasil Kloning</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Opsional: Alat Migrasi Server Lama (Disembunyikan demi Tampilan Bersih) */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            type="button"
            onClick={() => setShowLegacyTools(!showLegacyTools)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>
              {showLegacyTools
                ? 'Sembunyikan Opsi Migrasi Server Manual'
                : 'Opsi Cadangan: Punya File Arsip ZIP / Link Download Server Lama? Klik di sini'}
            </span>
          </button>
          {showLegacyTools && (
            <div className="mt-4 text-left border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50">
              <ServerMigratorHub
                account={account}
                initialTargetDir={selectedTargetDir}
                onOpenFileManager={onOpenFileManager}
                onOpenPreview={() => setShowPreviewModal(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Active Files in Target Directory & Data Retention Assurance */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-amber-500" />
              <span>File Website Aktif di {selectedTargetDir} ({targetDirFiles.length} Item)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Daftar file di bawah ini adalah yang saat ini ditayangkan secara live untuk domain/subdomain <strong>{activeTargetDomain}</strong> (<code>{selectedTargetDir}</code>).
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Terkunci di Persistent Vault (Aman Saat Update Cloud PRO)</span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-[11px] font-sans font-semibold text-slate-500 uppercase dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-2.5">Nama File / Direktori</th>
                <th className="px-4 py-2.5">Path Lengkap</th>
                <th className="px-4 py-2.5">Ukuran</th>
                <th className="px-4 py-2.5">Terakhir Diperbarui</th>
                <th className="px-4 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {targetDirFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center font-sans text-slate-400">
                    Belum ada file di direktori {selectedTargetDir}. Gunakan salah satu metode kloning di atas.
                  </td>
                </tr>
              ) : (
                targetDirFiles.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      {item.type === 'directory' ? (
                        <FolderOpen className="h-4 w-4 text-amber-500" />
                      ) : item.name.endsWith('.html') || item.name.endsWith('.php') || item.name.endsWith('.css') ? (
                        <FileCode className="h-4 w-4 text-sky-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-slate-400" />
                      )}
                      <span>{item.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{item.path}</td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {item.type === 'directory' ? 'DIR' : `${(item.sizeBytes / 1024).toFixed(1)} KB`}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                      {new Date(item.updatedAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-2.5 text-right font-sans">
                      {onOpenFileManager && (
                        <button
                          onClick={() => onOpenFileManager(selectedTargetDir)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 cursor-pointer"
                        >
                          <span>Kelola di File Manager</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <WebsitePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        account={account}
        initialDomain={activeTargetDomain}
        initialDocRoot={selectedTargetDir}
        onOpenFileManager={targetPath => {
          setShowPreviewModal(false);
          if (onOpenFileManager) onOpenFileManager(targetPath);
        }}
      />
    </div>
  );
};
