import {
  User,
  ResellerProfile,
  ServerNode,
  HostingPlan,
  HostingAccount,
  VirtualFile,
  DnsRecord,
  DatabaseEntity,
  EmailMailbox,
  CronJobItem,
  AccountBackup,
  Invoice,
  AuditLog,
  FirewallRule,
  ApiKeyItem,
  AppNotification,
  VpsInstance,
  VpsSnapshot,
  VpsFirewallRule,
  IpAddressRecord,
  PrivateNameserverConfig,
  CloudflareR2Config,
  OptimizedMediaFile,
  DomainEntity,
  DatabaseTableEntity,
  CloudProLetterheadConfig,
} from '../types';

const STORAGE_KEY = 'cloudpro_hosting_v4';
const LETTERHEAD_STORAGE_KEY = 'cloudpro_letterhead_config_v1';

export const DEFAULT_LETTERHEAD_CONFIG: CloudProLetterheadConfig = {
  headerTitle: 'CLOUD PRO ENTERPRISE',
  headerSubtitle: 'Layanan Enterprise Cloud Hosting, Domain, Virtual Server (VPS) & Infrastruktur Digital',
  serverDomain: 'denbaguse.my.id',
  officeAddress: 'Server Utama: denbaguse.my.id • NOC Data Center Singapore & Jakarta • Indonesia',
  officialEmail: 'admin@denbaguse.my.id',
  officialWhatsApp: '+62 812-2673-8883',
  ownerName: 'Jaenal Maskun',
  ownerTitle: 'Pemilik & Root Administrator Cloud PRO Enterprise',
  signatureCity: 'Indonesia',
  bank1Name: 'Bank BCA',
  bank1Number: '8420-9918-22',
  bank1Holder: 'Jaenal Maskun (Cloud PRO Enterprise)',
  bank2Name: 'Bank Mandiri / BRI',
  bank2Number: '139-00-8829104-5',
  bank2Holder: 'Jaenal Maskun',
  qrisInfo: 'QRIS Cloud PRO Enterprise (All Bank, Dana, OVO, GoPay, ShopeePay)',
  footerNote: 'Dokumen ini diterbitkan secara resmi oleh Sistem Billing & Otomasi Cloud PRO Enterprise (denbaguse.my.id) dan sah disertai Barcode Tanda Tangan Elektronik.',
  enableBarcodeSignature: true,
  autoSendWhatsApp: true,
  autoSendEmail: true,
  autoOpenWhatsAppOnManual: false,
  waGatewayUrl: '',
  waGatewayToken: '',
};

export interface DatabaseState {
  users: User[];
  resellerProfiles: ResellerProfile[];
  serverNodes: ServerNode[];
  hostingPlans: HostingPlan[];
  hostingAccounts: HostingAccount[];
  virtualFiles: VirtualFile[];
  dnsRecords: DnsRecord[];
  databases: DatabaseEntity[];
  databaseTables: Record<string, DatabaseTableEntity[]>;
  emailMailboxes: EmailMailbox[];
  cronJobs: CronJobItem[];
  backups: AccountBackup[];
  invoices: Invoice[];
  auditLogs: AuditLog[];
  firewallRules: FirewallRule[];
  apiKeys: ApiKeyItem[];
  notifications: AppNotification[];
  vpsInstances: VpsInstance[];
  vpsSnapshots: VpsSnapshot[];
  vpsFirewallRules: VpsFirewallRule[];
  ipAddresses: IpAddressRecord[];
  nameserverConfigs: PrivateNameserverConfig[];
  r2Configs: CloudflareR2Config[];
  optimizedMedia: OptimizedMediaFile[];
  domains: DomainEntity[];
  deletedIds?: string[];
  letterheadConfig?: CloudProLetterheadConfig;
  stateUpdatedAt?: number;
}

const INITIAL_STATE: DatabaseState = {
  users: [
    {
      id: 'usr-admin-01',
      name: 'Root Administrator',
      username: 'admin',
      email: 'admin@denbaguse.my.id',
      role: 'admin',
      status: 'active',
      creditBalance: 50000.0,
      companyName: 'Cloud PRO Enterprise (denbaguse.my.id)',
      phone: '+62 812-2673-8883',
      twoFactorEnabled: true,
      twoFactorSecret: 'CP78A99BKZ22',
      createdAt: '2026-01-10T08:00:00Z',
      lastLogin: '2026-09-30T08:00:00Z',
    },
    {
      id: 'usr-reseller-01',
      name: 'Mitra Reseller Cloud',
      username: 'reseller',
      email: 'reseller@mitrahosting.my.id',
      role: 'reseller',
      status: 'active',
      creditBalance: 1500.0,
      companyName: 'Mitra Cloud Hosting Partner',
      phone: '+62 812-2673-8883',
      twoFactorEnabled: false,
      createdAt: '2026-03-15T09:00:00Z',
      lastLogin: '2026-09-30T08:10:00Z',
    },
    {
      id: 'usr-cust-02',
      name: 'Pelanggan Hosting cPanel',
      username: 'pelanggan',
      email: 'admin@websitepelanggan.my.id',
      role: 'customer',
      status: 'active',
      creditBalance: 250.0,
      companyName: 'Portal Website Pelanggan',
      phone: '+62 812-2673-8883',
      twoFactorEnabled: false,
      createdAt: '2026-06-20T10:00:00Z',
      lastLogin: '2026-09-30T08:15:00Z',
    },
  ],

  resellerProfiles: [
    {
      id: 'prof-reseller-01',
      userId: 'usr-reseller-01',
      brandName: 'Mitra Cloud Hosting',
      companyName: 'PT Mitra Cloud Nusantara',
      themeColor: '#0ea5e9',
      panelDomain: 'panel.mitrahosting.my.id',
      primaryDomain: 'mitrahosting.my.id',
      supportEmail: 'support@mitrahosting.my.id',
      nameserver1: 'ns1.mitrahosting.my.id',
      nameserver2: 'ns2.mitrahosting.my.id',
      nameservers: ['ns1.mitrahosting.my.id', 'ns2.mitrahosting.my.id'],
      assignedIp: '172.67.223.133',
      allocatedDiskMb: 102400,
      allocatedBandwidthMb: 1024000,
      maxAccounts: 50,
      allocatedDatabases: 100,
      allocatedEmails: 250,
      allocatedDomains: 50,
      hideUpstreamBranding: true,
      customInvoiceHeader: 'Layanan Web Hosting & Cloud Server Mitra Resmi',
    },
  ],

  serverNodes: [
    {
      id: 'srv-sg-01',
      name: 'SG-Equinix-Node01',
      hostname: 'sg-node-01.cloudpro.net',
      ipAddress: '103.147.154.21',
      location: 'Singapore (Equinix SG1)',
      countryCode: 'SG',
      osType: 'AlmaLinux 9.4 (64-bit)',
      status: 'online',
      totalCpuCores: 16,
      cpuUsagePct: 24.5,
      totalRamMb: 65536, // 64 GB
      ramUsageMb: 21450,
      totalDiskGb: 2000, // 2 TB NVMe
      diskUsageGb: 580,
      bandwidthUsageGb: 1420,
      loadAverage: [0.45, 0.52, 0.48],
      uptimeDays: 148,
      isPrimary: true,
      assignedAccountsCount: 0,
      services: [
        { name: 'nginx', displayName: 'Nginx High-Perf Web Server', status: 'running', port: 80, version: '1.26.1', memoryMb: 420, uptime: '148d 6h' },
        { name: 'mariadb', displayName: 'MariaDB Relational Server', status: 'running', port: 3306, version: '10.11.8-GA', memoryMb: 1840, uptime: '148d 6h' },
        { name: 'php_fpm', displayName: 'PHP-FPM Process Manager', status: 'running', port: 9000, version: '8.2.19 & 8.3.8', memoryMb: 1120, uptime: '14d 2h' },
        { name: 'named', displayName: 'BIND9 Authoritative DNS', status: 'running', port: 53, version: '9.18.26', memoryMb: 280, uptime: '148d 6h' },
        { name: 'postfix', displayName: 'Postfix Mail Transfer Daemon', status: 'running', port: 25, version: '3.8.6', memoryMb: 190, uptime: '148d 6h' },
        { name: 'pure_ftpd', displayName: 'Pure-FTPd Secure Daemon', status: 'running', port: 21, version: '1.0.51', memoryMb: 85, uptime: '148d 6h' },
      ],
    },
    {
      id: 'srv-id-01',
      name: 'JKT-Cyber1-Node02',
      hostname: 'id-node-01.cloudpro.net',
      ipAddress: '103.253.212.88',
      location: 'Jakarta (Cyber 1 DC)',
      countryCode: 'ID',
      osType: 'Ubuntu 24.04 LTS',
      status: 'online',
      totalCpuCores: 8,
      cpuUsagePct: 18.2,
      totalRamMb: 32768, // 32 GB
      ramUsageMb: 8900,
      totalDiskGb: 1000,
      diskUsageGb: 310,
      bandwidthUsageGb: 890,
      loadAverage: [0.22, 0.31, 0.28],
      uptimeDays: 89,
      isPrimary: false,
      assignedAccountsCount: 0,
      services: [
        { name: 'nginx', displayName: 'Nginx High-Perf Web Server', status: 'running', port: 80, version: '1.26.1', memoryMb: 310, uptime: '89d 12h' },
        { name: 'mariadb', displayName: 'MariaDB Relational Server', status: 'running', port: 3306, version: '10.11.8-GA', memoryMb: 1250, uptime: '89d 12h' },
        { name: 'php_fpm', displayName: 'PHP-FPM Process Manager', status: 'running', port: 9000, version: '8.2.19 & 8.3.8', memoryMb: 760, uptime: '89d 12h' },
        { name: 'named', displayName: 'BIND9 Authoritative DNS', status: 'running', port: 53, version: '9.18.26', memoryMb: 210, uptime: '89d 12h' },
        { name: 'postfix', displayName: 'Postfix Mail Transfer Daemon', status: 'running', port: 25, version: '3.8.6', memoryMb: 140, uptime: '89d 12h' },
        { name: 'pure_ftpd', displayName: 'Pure-FTPd Secure Daemon', status: 'running', port: 21, version: '1.0.51', memoryMb: 70, uptime: '89d 12h' },
      ],
    },
    {
      id: 'srv-us-01',
      name: 'VA-Ashburn-Node03',
      hostname: 'us-node-01.cloudpro.net',
      ipAddress: '198.51.100.45',
      location: 'US East (Ashburn VA)',
      countryCode: 'US',
      osType: 'Debian 12 Bookworm',
      status: 'online',
      totalCpuCores: 8,
      cpuUsagePct: 12.0,
      totalRamMb: 32768,
      ramUsageMb: 6100,
      totalDiskGb: 1000,
      diskUsageGb: 190,
      bandwidthUsageGb: 430,
      loadAverage: [0.15, 0.18, 0.20],
      uptimeDays: 204,
      isPrimary: false,
      assignedAccountsCount: 0,
      services: [
        { name: 'nginx', displayName: 'Nginx High-Perf Web Server', status: 'running', port: 80, version: '1.26.1', memoryMb: 290, uptime: '204d 4h' },
        { name: 'mariadb', displayName: 'MariaDB Relational Server', status: 'running', port: 3306, version: '10.11.8-GA', memoryMb: 1100, uptime: '204d 4h' },
        { name: 'php_fpm', displayName: 'PHP-FPM Process Manager', status: 'running', port: 9000, version: '8.2.19 & 8.3.8', memoryMb: 640, uptime: '204d 4h' },
        { name: 'named', displayName: 'BIND9 Authoritative DNS', status: 'running', port: 53, version: '9.18.26', memoryMb: 195, uptime: '204d 4h' },
        { name: 'postfix', displayName: 'Postfix Mail Transfer Daemon', status: 'running', port: 25, version: '3.8.6', memoryMb: 130, uptime: '204d 4h' },
        { name: 'pure_ftpd', displayName: 'Pure-FTPd Secure Daemon', status: 'running', port: 21, version: '1.0.51', memoryMb: 65, uptime: '204d 4h' },
      ],
    },
  ],

  hostingPlans: [
    {
      id: 'plan-starter',
      name: 'Cloud Starter',
      slug: 'cloud-starter',
      description: 'Ideal untuk website personal, portfolio, blog dan UMKM tahap awal.',
      diskMb: 5120, // 5 GB
      bandwidthMb: 102400, // 100 GB
      cpuLimitPct: 100, // 1 Core
      ramLimitMb: 1024, // 1 GB
      maxDomains: 1,
      maxSubdomains: 5,
      maxDatabases: 2,
      maxEmails: 5,
      maxFtp: 2,
      hasSsl: true,
      hasBackup: true,
      hasCron: true,
      priceMonthly: 4.5,
      priceYearly: 45.0,
      currency: 'USD',
      isActive: true,
    },
    {
      id: 'plan-pro',
      name: 'Cloud Business Pro',
      slug: 'cloud-pro',
      description: 'Performa tinggi untuk toko online, portal media berita, dan web bisnis.',
      diskMb: 25600, // 25 GB
      bandwidthMb: 512000, // 500 GB
      cpuLimitPct: 200, // 2 Cores
      ramLimitMb: 4096, // 4 GB
      maxDomains: 5,
      maxSubdomains: 20,
      maxDatabases: 10,
      maxEmails: 25,
      maxFtp: 10,
      hasSsl: true,
      hasBackup: true,
      hasCron: true,
      priceMonthly: 14.0,
      priceYearly: 140.0,
      currency: 'USD',
      isActive: true,
    },
    {
      id: 'plan-enterprise',
      name: 'Cloud Enterprise Ultra',
      slug: 'cloud-enterprise',
      description: 'Resource dedicated tanpa batas untuk agensi digital dan traffic jutaan per bulan.',
      diskMb: 102400, // 100 GB NVMe
      bandwidthMb: 2048000, // 2 TB
      cpuLimitPct: 400, // 4 Cores
      ramLimitMb: 8192, // 8 GB
      maxDomains: 999,
      maxSubdomains: 999,
      maxDatabases: 999,
      maxEmails: 100,
      maxFtp: 50,
      hasSsl: true,
      hasBackup: true,
      hasCron: true,
      priceMonthly: 39.0,
      priceYearly: 390.0,
      currency: 'USD',
      isActive: true,
    },
  ],

  hostingAccounts: [
    {
      id: 'acc-rdm-01',
      primaryDomain: 'denbaguse.my.id',
      domain: 'denbaguse.my.id',
      username: 'cloudpro',
      customerId: 'usr-admin-01',
      customerName: 'Jaenal Maskun (Website Pribadi)',
      customerEmail: 'admin@denbaguse.my.id',
      serverId: 'srv-sg-01',
      serverName: 'SG-Edge-01 (Singapore)',
      planId: 'plan-pro',
      planName: 'Cloud Pro SSD',
      diskUsedMb: 23,
      diskLimitMb: 25600,
      bandwidthUsedMb: 8450,
      bandwidthLimitMb: 512000,
      phpVersion: '8.2',
      phpExtensions: [
        'ioncube',
        'mysqli',
        'pdo',
        'curl',
        'gd',
        'mbstring',
        'zip',
        'xml',
        'fileinfo',
        'intl',
        'bcmath',
        'soap',
        'opcache',
      ],
      status: 'active',
      sslStatus: 'active',
      sslProvider: "Let's Encrypt / ZeroSSL",
      sslExpiresAt: '2027-01-01T00:00:00Z',
      forceHttps: true,
      documentRoot: '/home/cloudpro/public_html',
      ipAddress: '103.147.154.21',
      databaseCount: 1,
      emailCount: 2,
      ftpCount: 1,
      nameservers: ['ns1.denbaguse.my.id', 'ns2.denbaguse.my.id'],
      createdAt: '2026-09-25T10:00:00Z',
    },
    {
      id: 'acc-school-02',
      primaryDomain: 'websitepelanggan.my.id',
      domain: 'websitepelanggan.my.id',
      username: 'pelanggan',
      customerId: 'usr-cust-02',
      customerName: 'Pelanggan Hosting cPanel',
      customerEmail: 'admin@websitepelanggan.my.id',
      serverId: 'srv-id-01',
      serverName: 'ID-Cyber-01 (Jakarta)',
      planId: 'plan-starter',
      planName: 'Cloud Starter NVMe',
      diskUsedMb: 1,
      diskLimitMb: 10240,
      bandwidthUsedMb: 2150,
      bandwidthLimitMb: 102400,
      phpVersion: '8.2',
      phpExtensions: ['mysqli', 'pdo', 'curl', 'opcache', 'gd', 'mbstring', 'zip'],
      status: 'active',
      sslStatus: 'active',
      sslProvider: "Let's Encrypt",
      sslExpiresAt: '2026-12-15T00:00:00Z',
      forceHttps: true,
      documentRoot: '/home/pelanggan/public_html',
      ipAddress: '172.67.223.133',
      databaseCount: 1,
      emailCount: 1,
      ftpCount: 1,
      nameservers: ['ns1.denbaguse.my.id', 'ns2.denbaguse.my.id'],
      createdAt: '2026-09-26T14:30:00Z',
    },
  ],

  virtualFiles: [
    {
      id: 'vf-01',
      accountId: 'acc-rdm-01',
      name: 'public_html',
      path: '/public_html',
      type: 'directory',
      sizeBytes: 4096,
      permissions: '0755',
      updatedAt: '2026-09-28T09:12:00Z',
    },
    {
      id: 'vf-personal-html',
      accountId: 'acc-rdm-01',
      name: 'index.html',
      path: '/public_html/index.html',
      type: 'file',
      sizeBytes: 4850,
      permissions: '0644',
      mimeType: 'text/html',
      updatedAt: '2026-09-30T05:00:00Z',
      content: `<!DOCTYPE html>
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
        <div class="card-glow"></div>
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
</html>`,
    },
    {
      id: 'vf-personal-css',
      accountId: 'acc-rdm-01',
      name: 'style.css',
      path: '/public_html/style.css',
      type: 'file',
      sizeBytes: 2450,
      permissions: '0644',
      mimeType: 'text/css',
      updatedAt: '2026-09-30T05:00:00Z',
      content: `* { box-sizing: border-box; margin: 0; padding: 0; }
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
.stats-list { list-style: none; space-y: 10px; }
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
@media (max-width: 768px) { .hero-grid { grid-template-columns: 1fr; } .hero h1 { font-size: 30px; } .nav-links { display: none; } }`,
    },
    {
      id: 'vf-03',
      accountId: 'acc-rdm-01',
      name: '.htaccess',
      path: '/public_html/.htaccess',
      type: 'file',
      sizeBytes: 420,
      permissions: '0644',
      mimeType: 'text/plain',
      updatedAt: '2026-09-28T09:16:00Z',
      content: 'RewriteEngine On\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule ^(.*)$ index.html [L]',
    },
  ],

  dnsRecords: [
    {
      id: 'dns-01',
      accountId: 'acc-rdm-01',
      name: 'rdm.denbaguse.my.id',
      type: 'A',
      content: '103.147.154.21',
      ttl: 3600,
    },
    {
      id: 'dns-02',
      accountId: 'acc-rdm-01',
      name: 'www.rdm.denbaguse.my.id',
      type: 'CNAME',
      content: 'rdm.denbaguse.my.id',
      ttl: 3600,
    },
    {
      id: 'dns-03',
      accountId: 'acc-rdm-01',
      name: 'rdm.denbaguse.my.id',
      type: 'MX',
      content: 'mail.denbaguse.my.id',
      ttl: 3600,
      priority: 10,
    },
  ],

  databases: [
    {
      id: 'db-01',
      accountId: 'acc-rdm-01',
      dbName: 'madrasah_rdm',
      dbUser: 'madrasah_dbuser',
      sizeMb: 64.5,
      charset: 'utf8mb4_unicode_ci',
      type: 'mysql',
      createdAt: '2026-09-25T10:05:00Z',
    },
  ],

  databaseTables: {
    'madrasah_rdm': [
      { name: 'rdm_siswa', dbName: 'madrasah_rdm', rows: 420, sizeKb: 680, engine: 'InnoDB', collation: 'utf8mb4_unicode_ci' },
      { name: 'rdm_nilai', dbName: 'madrasah_rdm', rows: 1250, sizeKb: 1420, engine: 'InnoDB', collation: 'utf8mb4_unicode_ci' },
      { name: 'rdm_guru', dbName: 'madrasah_rdm', rows: 38, sizeKb: 120, engine: 'InnoDB', collation: 'utf8mb4_unicode_ci' },
      { name: 'rdm_kelas', dbName: 'madrasah_rdm', rows: 18, sizeKb: 64, engine: 'InnoDB', collation: 'utf8mb4_unicode_ci' },
      { name: 'users', dbName: 'madrasah_rdm', rows: 458, sizeKb: 512, engine: 'InnoDB', collation: 'utf8mb4_unicode_ci' },
      { name: 'options', dbName: 'madrasah_rdm', rows: 164, sizeKb: 256, engine: 'InnoDB', collation: 'utf8mb4_unicode_ci' },
      { name: 'sessions', dbName: 'madrasah_rdm', rows: 12, sizeKb: 96, engine: 'Memory', collation: 'utf8mb4_unicode_ci' },
    ],
  },

  emailMailboxes: [
    {
      id: 'em-01',
      accountId: 'acc-rdm-01',
      emailAddress: 'admin@denbaguse.my.id',
      quotaMb: 2048,
      usedMb: 142,
      createdAt: '2026-09-25T10:10:00Z',
    },
    {
      id: 'em-02',
      accountId: 'acc-rdm-01',
      emailAddress: 'rapor@denbaguse.my.id',
      quotaMb: 2048,
      usedMb: 68,
      createdAt: '2026-09-25T10:12:00Z',
    },
  ],

  cronJobs: [
    {
      id: 'cron-01',
      accountId: 'acc-rdm-01',
      command: 'php /home/madrasah/public_html/artisan schedule:run >> /dev/null 2>&1',
      schedule: '0 2 * * *',
      description: 'Daily Automated RDM Database Sync & Backup',
      isActive: true,
    },
  ],

  backups: [
    {
      id: 'bk-auto-01',
      accountId: 'acc-rdm-01',
      accountDomain: 'denbaguse.my.id',
      fileName: 'backup-full-denbaguse.my.id-20260930.tar.gz',
      type: 'full',
      sizeMb: 248.4,
      status: 'completed',
      createdAt: '2026-09-30T02:00:00Z',
    },
    {
      id: 'bk-auto-02',
      accountId: 'acc-school-02',
      accountDomain: 'websitepelanggan.my.id',
      fileName: 'backup-full-websitepelanggan.my.id-20260930.tar.gz',
      type: 'full',
      sizeMb: 84.2,
      status: 'completed',
      createdAt: '2026-09-30T02:30:00Z',
    },
  ],
  invoices: [
    {
      id: 'inv-default-unpaid-01',
      invoiceNumber: 'INV-AUTO-202609-1002',
      userId: 'usr-cust-02',
      accountId: 'acc-school-02',
      userName: 'Pelanggan Hosting cPanel',
      userEmail: 'admin@websitepelanggan.my.id',
      userPhone: '+62 812-2673-8883',
      billingSource: 'automated',
      items: [
        {
          description: 'Perpanjangan Paket Cloud Starter NVMe (websitepelanggan.my.id) — 1 Tahun',
          qty: 1,
          unitPrice: 350000,
          amount: 350000,
        },
        {
          description: 'Perpanjangan Domain .MY.ID (websitepelanggan.my.id) — 1 Tahun',
          qty: 1,
          unitPrice: 50000,
          amount: 50000,
        },
      ],
      amount: 400000,
      currency: 'IDR',
      status: 'unpaid',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      whatsappSentAt: new Date().toISOString(),
      emailSentAt: new Date().toISOString(),
      paymentNotes: 'Bukti Tagihan Unpaid Otomatis (H-7 Jatuh Tempo). Harap lunasi sebelum tanggal jatuh tempo agar layanan tetap aktif.',
    },
    {
      id: 'inv-default-unpaid-root-02',
      invoiceNumber: 'INV-AUTO-202609-1003',
      userId: 'usr-admin-01',
      userName: 'Jaenal Maskun (Website Pribadi - denbaguse.my.id)',
      userEmail: 'admin@denbaguse.my.id',
      userPhone: '+62 812-2673-8883',
      billingSource: 'automated',
      items: [
        {
          description: 'Tagihan Bulanan Otomatis Cloud PRO Enterprise SSD (denbaguse.my.id) — Periode Oktober 2026',
          qty: 1,
          unitPrice: 150000,
          amount: 150000,
        },
      ],
      amount: 150000,
      currency: 'IDR',
      status: 'unpaid',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      whatsappSentAt: new Date().toISOString(),
      emailSentAt: new Date().toISOString(),
      paymentNotes: 'Diterbitkan otomatis oleh Mesin Auto-Billing Cloud PRO Enterprise (Status: UNPAID / Menunggu Pembayaran).',
    },
    {
      id: 'inv-default-paid-01',
      invoiceNumber: 'INV-2026-1001',
      receiptNumber: 'KW-202609-1001',
      userId: 'usr-admin-01',
      userName: 'Jaenal Maskun (Website Pribadi)',
      userEmail: 'admin@denbaguse.my.id',
      userPhone: '+62 812-2673-8883',
      billingSource: 'manual',
      items: [
        {
          description: 'Lisensi Cloud PRO Enterprise SSD & Infrastruktur Domain Utama (denbaguse.my.id)',
          qty: 1,
          unitPrice: 450000,
          amount: 450000,
        },
      ],
      amount: 450000,
      currency: 'IDR',
      status: 'paid',
      dueDate: '2026-10-25T00:00:00Z',
      createdAt: '2026-09-25T10:00:00Z',
      paidAt: '2026-09-25T10:15:00Z',
      paymentMethod: 'Transfer Bank BCA Manual (Terverifikasi)',
      paymentReference: 'REF-BCA-99281741',
      payerName: 'Jaenal Maskun',
      verifiedBy: 'Jaenal Maskun',
      whatsappSentAt: '2026-09-25T10:16:00Z',
      emailSentAt: '2026-09-25T10:16:00Z',
      signatureHash: 'SIG-CPRO-KW2026091001-VERIFIED',
      paymentNotes: 'Pembayaran lunas diterima penuh. Bukti pembayaran resmi (Kwitansi Lunas) telah diterbitkan.',
    },
  ],

  auditLogs: [
    {
      id: 'aud-01',
      userId: 'usr-admin-01',
      userName: 'Root Administrator',
      role: 'admin',
      action: 'SYSTEM_INITIALIZATION',
      category: 'SERVER',
      ipAddress: '127.0.0.1',
      details: 'Cloud PRO Enterprise system initialized for domain denbaguse.my.id',
      timestamp: '2026-09-28T18:30:15Z',
    },
  ],

  firewallRules: [
    {
      id: 'fw-01',
      ipOrSubnet: '182.253.110.0/24',
      type: 'whitelist',
      reason: 'Admin Management NOC Subnet',
      hits: 14820,
      createdAt: '2026-01-10T00:00:00Z',
      isActive: true,
    },
    {
      id: 'fw-02',
      ipOrSubnet: '45.154.255.90',
      type: 'blacklist',
      reason: 'Repeated SSH port 22 brute-force botnet attack',
      hits: 394,
      createdAt: '2026-09-28T04:12:44Z',
      isActive: true,
    },
    {
      id: 'fw-03',
      ipOrSubnet: '194.26.29.0/24',
      type: 'blacklist',
      reason: 'Known spam relay proxy range',
      hits: 1205,
      createdAt: '2026-08-15T00:00:00Z',
      isActive: true,
    },
  ],

  apiKeys: [
    {
      id: 'key-01',
      name: 'Primary Enterprise REST API Key',
      keyPrefix: 'cpro_live_99a8',
      tokenMasked: 'cpro_live_99a8*******************d90b',
      userId: 'usr-admin-01',
      scopes: ['accounts:read', 'accounts:write', 'dns:read', 'dns:write', 'billing:read', 'vps:manage'],
      createdAt: '2026-04-01T00:00:00Z',
      lastUsedAt: '2026-09-28T17:15:00Z',
    },
  ],

  notifications: [
    {
      id: 'notif-01',
      title: 'Selamat Datang di Cloud PRO Enterprise',
      message: 'Panel hosting aktif dan siap dikonfigurasi untuk domain denbaguse.my.id.',
      type: 'success',
      timestamp: '2026-09-28T18:35:00Z',
      isRead: false,
    },
  ],
  vpsInstances: [
    {
      id: 'vps-cgk-prod-01',
      name: 'jkt-app-production-01',
      hostname: 'prod-app01.siakad.cloudpro.net',
      customerId: 'usr-admin-01',
      customerName: 'Root Administrator',
      region: 'ID-CGK1',
      regionName: 'Jakarta (ID-CGK1 Data Center)',
      countryCode: 'id',
      osDistro: 'Ubuntu 24.04 LTS (Noble Numbat)',
      osIcon: 'ubuntu',
      status: 'running',
      vCpu: 4,
      ramMb: 8192,
      diskGb: 160,
      bandwidthLimitGb: 5000,
      bandwidthUsedGb: 842,
      ipV4: '103.147.154.22',
      ipV6: '2001:df0:340:1::22',
      gateway: '103.147.154.1',
      reverseDns: 'app01.siakad.cloudpro.net',
      liveCpuPct: 24.5,
      liveRamMb: 4210,
      uptime: '48 days, 14 hours',
      monthlyPrice: 32.0,
      currency: 'USD',
      autoBackupEnabled: true,
      createdAt: '2026-08-11T09:20:00Z',
      rootPassword: 'cPro#SecureRoot991!',
      sshKeyName: 'id_ed25519_production',
    },
    {
      id: 'vps-sin-db-02',
      name: 'sg-db-cluster-node',
      hostname: 'db01.singapore.cloudpro.net',
      customerId: 'usr-admin-01',
      customerName: 'Root Administrator',
      region: 'SG-SIN1',
      regionName: 'Singapore (SG-SIN1 Jurong Node)',
      countryCode: 'sg',
      osDistro: 'Debian 12 Bookworm',
      osIcon: 'debian',
      status: 'running',
      vCpu: 8,
      ramMb: 16384,
      diskGb: 320,
      bandwidthLimitGb: 10000,
      bandwidthUsedGb: 2140,
      ipV4: '139.180.201.88',
      ipV6: '2400:8902::f03c:91ff:fe18:db01',
      gateway: '139.180.201.1',
      reverseDns: 'db01.cloudpro.net',
      liveCpuPct: 38.2,
      liveRamMb: 11250,
      uptime: '112 days, 3 hours',
      monthlyPrice: 64.0,
      currency: 'USD',
      autoBackupEnabled: true,
      createdAt: '2026-06-08T11:00:00Z',
      rootPassword: 'dbRoot#Cluster99!',
      sshKeyName: 'db_admin_key',
    },
    {
      id: 'vps-tokyo-dev-03',
      name: 'tyo-dev-docker-runner',
      hostname: 'runner-tyo.cloudpro.net',
      customerId: 'usr-admin-01',
      customerName: 'Root Administrator',
      region: 'JP-HND1',
      regionName: 'Tokyo (JP-HND1 Equinix TY8)',
      countryCode: 'jp',
      osDistro: 'Rocky Linux 9.4 (Blue Onyx)',
      osIcon: 'rocky',
      status: 'running',
      vCpu: 2,
      ramMb: 4096,
      diskGb: 80,
      bandwidthLimitGb: 3000,
      bandwidthUsedGb: 310,
      ipV4: '172.105.228.45',
      ipV6: '2400:8901::f03c:92ff:fe33:aa12',
      gateway: '172.105.228.1',
      reverseDns: 'runner.tokyo.cloudpro.net',
      liveCpuPct: 11.8,
      liveRamMb: 1840,
      uptime: '19 days, 8 hours',
      monthlyPrice: 18.0,
      currency: 'USD',
      autoBackupEnabled: false,
      createdAt: '2026-09-09T08:30:00Z',
      rootPassword: 'rockyDev#Runner2026!',
    },
    {
      id: 'vps-staging-04',
      name: 'staging-sandbox-node',
      hostname: 'staging.internal.cloudpro.net',
      customerId: 'usr-admin-01',
      customerName: 'Root Administrator',
      region: 'ID-CGK1',
      regionName: 'Jakarta (ID-CGK1 Data Center)',
      countryCode: 'id',
      osDistro: 'Alpine Linux 3.19',
      osIcon: 'alpine',
      status: 'stopped',
      vCpu: 1,
      ramMb: 2048,
      diskGb: 40,
      bandwidthLimitGb: 1000,
      bandwidthUsedGb: 88,
      ipV4: '103.147.155.109',
      ipV6: '2001:df0:340:2::109',
      gateway: '103.147.155.1',
      reverseDns: 'staging.cloudpro.net',
      liveCpuPct: 0,
      liveRamMb: 0,
      uptime: '0 hours (stopped)',
      monthlyPrice: 10.0,
      currency: 'USD',
      autoBackupEnabled: false,
      createdAt: '2026-09-18T16:00:00Z',
    },
  ],
  vpsSnapshots: [
    {
      id: 'snap-01',
      vpsId: 'vps-cgk-prod-01',
      name: 'pre-deployment-v2.4-migration',
      sizeGb: 14.2,
      createdAt: '2026-09-24T03:15:00Z',
    },
    {
      id: 'snap-02',
      vpsId: 'vps-sin-db-02',
      name: 'weekly-golden-image-db',
      sizeGb: 28.6,
      createdAt: '2026-09-27T00:00:00Z',
    },
  ],
  ipAddresses: [
    {
      id: 'ip-cf-anycast-01',
      ip: '172.67.223.133',
      subnet: '255.255.255.0 (/24)',
      gateway: '172.67.223.1',
      serverId: 'srv-sg-01',
      serverName: 'CloudPRO-Server (Cloudflare Edge + Tunnel Hybrid)',
      type: 'shared',
      status: 'assigned',
      assignedToType: 'server',
      assignedToId: 'srv-sg-01',
      assignedToName: 'Primary Anycast IPv4 + Tunnel CloudPRO-Server',
      assignedDomain: 'denbaguse.my.id',
      ptrRecord: 'servercloud.denbaguse.my.id',
      isPrimaryServerIp: true,
      notes: 'IPv4 Anycast Publik Cloudflare (Aktif Bersamaan dengan Tunnel CloudPRO-Server)',
      createdAt: '2026-09-30T00:00:00Z',
    },
    {
      id: 'ip-cf-anycast-02',
      ip: '104.21.95.88',
      subnet: '255.255.255.0 (/24)',
      gateway: '104.21.95.1',
      serverId: 'srv-sg-01',
      serverName: 'CloudPRO-Server (Cloudflare Edge Secondary)',
      type: 'shared',
      status: 'assigned',
      assignedToType: 'nameserver',
      assignedToId: 'ns2',
      assignedToName: 'Secondary Anycast IPv4 + NS2 Failover',
      assignedDomain: 'ns2.denbaguse.my.id',
      ptrRecord: 'ns2.denbaguse.my.id',
      isPrimaryServerIp: false,
      notes: 'Secondary IPv4 Anycast Publik Cloudflare (Redundansi Otomatis)',
      createdAt: '2026-09-30T00:00:00Z',
    },
  ],
  vpsFirewallRules: [
    {
      id: 'vfw-01',
      vpsId: 'vps-cgk-prod-01',
      protocol: 'TCP',
      portRange: '22',
      source: '0.0.0.0/0',
      action: 'ACCEPT',
      description: 'OpenSSH Remote Management',
    },
    {
      id: 'vfw-02',
      vpsId: 'vps-cgk-prod-01',
      protocol: 'TCP',
      portRange: '80',
      source: '0.0.0.0/0',
      action: 'ACCEPT',
      description: 'HTTP Inbound Web Traffic',
    },
    {
      id: 'vfw-03',
      vpsId: 'vps-cgk-prod-01',
      protocol: 'TCP',
      portRange: '443',
      source: '0.0.0.0/0',
      action: 'ACCEPT',
      description: 'HTTPS Secure SSL/TLS Traffic',
    },
    {
      id: 'vfw-04',
      vpsId: 'vps-sin-db-02',
      protocol: 'TCP',
      portRange: '3306',
      source: '103.147.154.22/32',
      action: 'ACCEPT',
      description: 'Allow MySQL connection from JKT App Production only',
    },
  ],
  nameserverConfigs: [
    {
      id: 'ns-cfg-default',
      domain: 'denbaguse.my.id',
      ns1Host: 'ns1.denbaguse.my.id',
      ns1Ip: '172.67.223.133',
      ns2Host: 'ns2.denbaguse.my.id',
      ns2Ip: '104.21.95.88',
      dnssecEnabled: true,
      dnssecKeyTag: 23719,
      dnssecAlgorithm: 13, // ECDSAP256SHA256
      dnssecDigestType: 2, // SHA-256
      dnssecDigest: '48F82C99D34F181BAEF37C2F0E2A5D076E1B6833D224859A3BC85A094EE12A1B',
      soaEmail: 'hostmaster.denbaguse.my.id',
      defaultTtl: 3600,
      bindServiceStatus: 'active',
      isDefaultGlobal: true,
      updatedAt: '2026-09-29T10:00:00Z',
    },
  ],
  r2Configs: [
    {
      id: 'r2-cfg-default',
      accountId: 'global',
      bucketName: 'media-madrasah-cloudpro',
      accountIdCloudflare: 'cf_acc_9837190f84a1e948',
      accessKeyId: 'a8e99bc1289fe83d1004',
      secretAccessKeyMasked: 'd893f0192a838bc8e9102830f81********************',
      publicCdnDomain: 'https://media.denbaguse.my.id',
      autoWebpCompression: true,
      compressionQuality: 82,
      maxDimensionPx: 1920,
      stripExifGps: true,
      status: 'connected',
      lastSyncedAt: '2026-09-29T10:15:00Z',
    },
  ],
  optimizedMedia: [
    {
      id: 'med-01',
      accountId: 'acc-madrasah-01',
      fileName: 'upacara_hari_guru_nasional_2026.webp',
      originalFileName: 'IMG_20260925_073014_RAW_CAMERA.jpg',
      mimeType: 'image/webp',
      originalSizeBytes: 8493020, // ~8.49 MB
      compressedSizeBytes: 342110, // ~342 KB (96% savings!)
      compressionRatioPct: 95.9,
      width: 1920,
      height: 1280,
      url: 'https://media.denbaguse.my.id/upacara_hari_guru_nasional_2026.webp',
      storageTarget: 'cloudflare_r2',
      category: 'activity',
      uploadedBy: 'admin_madrasah',
      uploadedAt: '2026-09-28T09:30:00Z',
    },
    {
      id: 'med-02',
      accountId: 'acc-madrasah-01',
      fileName: 'wisuda_tahfidz_al_quran_angkatan_viii.webp',
      originalFileName: 'DSC_0982_HIGHRES_FULL.png',
      mimeType: 'image/webp',
      originalSizeBytes: 12840192, // ~12.8 MB
      compressedSizeBytes: 489200, // ~489 KB (96.2% savings!)
      compressionRatioPct: 96.2,
      width: 1920,
      height: 1080,
      url: 'https://media.denbaguse.my.id/wisuda_tahfidz_al_quran_angkatan_viii.webp',
      storageTarget: 'cloudflare_r2',
      category: 'activity',
      uploadedBy: 'humas_madrasah',
      uploadedAt: '2026-09-28T14:15:00Z',
    },
    {
      id: 'med-03',
      accountId: 'acc-madrasah-01',
      fileName: 'fasilitas_laboratorium_komputer_cbt.webp',
      originalFileName: 'PXL_20260920_112000.jpg',
      mimeType: 'image/webp',
      originalSizeBytes: 6291456, // ~6.2 MB
      compressedSizeBytes: 275000, // ~275 KB (95.6% savings!)
      compressionRatioPct: 95.6,
      width: 1920,
      height: 1280,
      url: 'https://media.denbaguse.my.id/fasilitas_laboratorium_komputer_cbt.webp',
      storageTarget: 'cloudflare_r2',
      category: 'facility',
      uploadedBy: 'proktor_cbt',
      uploadedAt: '2026-09-27T11:45:00Z',
    },
  ],
  domains: [
    {
      id: 'dom-primary-01',
      accountId: 'acc-rdm-01',
      domain: 'denbaguse.my.id',
      type: 'primary',
      documentRoot: '/home/cloudpro/public_html',
      phpVersion: '8.2',
      sslStatus: 'active',
      createdAt: '2026-09-28T08:00:00Z',
    },
    {
      id: 'dom-1790860281257-amam',
      accountId: 'acc-rdm-01',
      domain: 'siakad-madrasah.denbaguse.my.id',
      type: 'subdomain',
      parentDomain: 'denbaguse.my.id',
      subdomainPrefix: 'siakad-madrasah',
      documentRoot: '/home/cloudpro/public_html/siakad-madrasah',
      phpVersion: '8.2',
      sslStatus: 'active',
      createdAt: '2026-09-29T10:00:00Z',
    },
    {
      id: 'dom-1790860258687-un1o',
      accountId: 'acc-rdm-01',
      domain: 'rdm.denbaguse.my.id',
      type: 'subdomain',
      parentDomain: 'denbaguse.my.id',
      subdomainPrefix: 'rdm',
      documentRoot: '/home/cloudpro/public_html/rdm',
      phpVersion: '7.2',
      sslStatus: 'active',
      createdAt: '2026-09-29T10:05:00Z',
    },
    {
      id: 'dom-1790860261766-ao51',
      accountId: 'acc-rdm-01',
      domain: 'cbt.denbaguse.my.id',
      type: 'subdomain',
      parentDomain: 'denbaguse.my.id',
      subdomainPrefix: 'cbt',
      documentRoot: '/home/cloudpro/public_html/cbt',
      phpVersion: '7.4',
      sslStatus: 'active',
      createdAt: '2026-09-29T10:10:00Z',
    },
    {
      id: 'dom-1790860263159-b5gq',
      accountId: 'acc-rdm-01',
      domain: 'elearning.denbaguse.my.id',
      type: 'subdomain',
      parentDomain: 'denbaguse.my.id',
      subdomainPrefix: 'elearning',
      documentRoot: '/home/cloudpro/public_html/elearning',
      phpVersion: '8.2',
      sslStatus: 'active',
      createdAt: '2026-09-29T10:15:00Z',
    },
    {
      id: 'dom-primary-02',
      accountId: 'acc-school-02',
      domain: 'websitepelanggan.my.id',
      type: 'primary',
      documentRoot: '/home/pelanggan/public_html',
      phpVersion: '8.2',
      sslStatus: 'active',
      createdAt: '2026-09-28T09:00:00Z',
    },
  ],
};

class StorageService {
  private state: DatabaseState;
  private vaultSyncTimer: any = null;
  private hasHydratedFromServer = false;
  private isHydrating = false;
  private lastVaultSavedAt: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch {
        // ignore listener error
      }
    });
  }

  private markDeleted(ids: string | string[]): void {
    if (!Array.isArray(this.state.deletedIds)) {
      this.state.deletedIds = [];
    }
    const list = Array.isArray(ids) ? ids : [ids];
    const set = new Set<string>(this.state.deletedIds);
    for (const id of list) {
      if (id && typeof id === 'string') {
        set.add(id);
      }
    }
    this.state.deletedIds = Array.from(set).slice(-600);
  }

  private loadState(): DatabaseState {
    try {
      // 1. Purge legacy bloated keys from previous versions to immediately reclaim browser quota
      const legacyKeys = [
        'cloudpro_persistent_vault_backup',
        'cloudpro_hosting_v5',
        'cloudpro_hosting_v3',
        'cloudpro_hosting_v2',
        'cloudpro_hosting_v1',
      ];
      for (const k of legacyKeys) {
        try {
          localStorage.removeItem(k);
        } catch {
          // Ignore
        }
      }

      let serialized: string | null = null;
      try {
        serialized = localStorage.getItem(STORAGE_KEY);
      } catch {
        // Ignore read error
      }

      // If the existing stored payload is from an older unoptimized release (> 200KB),
      // we remove the bloated item from localStorage immediately so quota is freed
      if (serialized && serialized.length > 250_000) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Ignore
        }
      }
      if (serialized) {
        const parsed = JSON.parse(serialized);
        const hasAccounts = Array.isArray(parsed.hostingAccounts) && parsed.hostingAccounts.length > 0;
        let loadedAccounts: HostingAccount[] = hasAccounts ? parsed.hostingAccounts : INITIAL_STATE.hostingAccounts;
        // Upgrade legacy default RDM domain to denbaguse.my.id personal web and username madrasah -> cloudpro
        loadedAccounts = loadedAccounts.map(acc => {
          if (acc.id === 'acc-rdm-01') {
            return {
              ...acc,
              primaryDomain: acc.primaryDomain === 'rdm.denbaguse.my.id' ? 'denbaguse.my.id' : acc.primaryDomain,
              domain: acc.domain === 'rdm.denbaguse.my.id' ? 'denbaguse.my.id' : acc.domain,
              username: acc.username === 'madrasah' || !acc.username ? 'cloudpro' : acc.username,
              documentRoot: (acc.documentRoot || '/home/cloudpro/public_html').replace('/home/madrasah', '/home/cloudpro'),
              customerName: 'Jaenal Maskun (Website Pribadi)',
              diskUsedMb: acc.diskUsedMb === 1240 ? 23 : acc.diskUsedMb,
              resellerId: undefined,
            };
          }
          if (acc.id === 'acc-school-02' || acc.customerId === 'usr-cust-02') {
            const cleanDom =
              acc.primaryDomain === 'klien-reseller.my.id' ||
              acc.primaryDomain === 'portal.denbaguse.my.id' ||
              acc.primaryDomain.includes('reseller')
                ? 'websitepelanggan.my.id'
                : acc.primaryDomain;
            return {
              ...acc,
              primaryDomain: cleanDom,
              domain: cleanDom,
              username: acc.username === 'klienweb' ? 'pelanggan' : acc.username,
              diskUsedMb: acc.diskUsedMb === 480 ? 1 : acc.diskUsedMb,
              customerName:
                !acc.customerName || acc.customerName.toLowerCase().includes('reseller')
                  ? 'Pelanggan Hosting cPanel'
                  : acc.customerName,
              customerEmail:
                !acc.customerEmail || acc.customerEmail.toLowerCase().includes('reseller')
                  ? 'admin@websitepelanggan.my.id'
                  : acc.customerEmail,
              documentRoot:
                acc.documentRoot === '/home/klienweb/public_html'
                  ? '/home/pelanggan/public_html'
                  : acc.documentRoot,
              resellerId: undefined,
            };
          }
          return acc;
        });

        let loadedFiles: VirtualFile[] =
          hasAccounts && Array.isArray(parsed.virtualFiles) && parsed.virtualFiles.length > 0
            ? parsed.virtualFiles
            : INITIAL_STATE.virtualFiles;

        // Clean out legacy Rapor Digital Madrasah placeholder files from localStorage so they never override the user's personal website
        const hadLegacyRdmPlaceholder = loadedFiles.some(
          f =>
            f.id === 'vf-02' ||
            (typeof f.content === 'string' && f.content.includes('Rapor Digital Madrasah - Server Siap!'))
        );
        if (hadLegacyRdmPlaceholder) {
          loadedFiles = loadedFiles.filter(
            f =>
              f.id !== 'vf-02' &&
              !(typeof f.content === 'string' && f.content.includes('Rapor Digital Madrasah - Server Siap!'))
          );
          const hasRootEntry = loadedFiles.some(
            f =>
              f.accountId === 'acc-rdm-01' &&
              (f.path.toLowerCase() === '/public_html/index.html' || f.path.toLowerCase() === '/public_html/index.php')
          );
          if (!hasRootEntry) {
            const defaultPersonalFiles = INITIAL_STATE.virtualFiles.filter(
              df => df.id === 'vf-personal-html' || df.id === 'vf-personal-css'
            );
            loadedFiles = [...loadedFiles, ...defaultPersonalFiles];
          }
        }

        let loadedUsers: User[] = Array.isArray(parsed.users) ? [...parsed.users] : [...INITIAL_STATE.users];
        // Clean legacy Reseller references from default Customer account usr-cust-02
        loadedUsers = loadedUsers.map(u => {
          if (u.id === 'usr-cust-02' || (u.role === 'customer' && u.email === 'admin@klien-reseller.my.id')) {
            return {
              ...u,
              name: u.name.toLowerCase().includes('reseller') ? 'Pelanggan Hosting cPanel' : u.name,
              username: u.username === 'klienweb' ? 'pelanggan' : (u.username || 'pelanggan'),
              email: u.email.toLowerCase().includes('reseller') ? 'admin@websitepelanggan.my.id' : u.email,
              companyName: u.companyName?.toLowerCase().includes('reseller') ? 'Portal Website Pelanggan' : (u.companyName || 'Portal Website Pelanggan'),
              resellerId: undefined,
              phone: u.phone || '+62 812-2673-8883',
            };
          }
          return u;
        });
        INITIAL_STATE.users.forEach(defU => {
          // Always ensure Root Administrator exists so the owner is never locked out
          if (defU.role === 'admin' && !loadedUsers.some(u => u.id === defU.id || u.role === 'admin')) {
            loadedUsers.push(defU);
          }
        });

        let loadedDomains: DomainEntity[] =
          hasAccounts && Array.isArray(parsed.domains) && parsed.domains.length > 0
            ? parsed.domains
            : INITIAL_STATE.domains;
        loadedDomains = loadedDomains.map(d => {
          const updatedDocRoot = (d.documentRoot || '').replace('/home/madrasah', '/home/cloudpro');
          if (d.accountId === 'acc-rdm-01' && d.type === 'primary' && d.domain.toLowerCase() === 'rdm.denbaguse.my.id') {
            return {
              ...d,
              domain: 'denbaguse.my.id',
              documentRoot: '/home/cloudpro/public_html',
            };
          }
          if (d.accountId === 'acc-school-02' && (d.domain.includes('reseller') || d.domain === 'portal.denbaguse.my.id')) {
            return {
              ...d,
              domain: 'websitepelanggan.my.id',
              documentRoot: '/home/pelanggan/public_html',
            };
          }
          if (updatedDocRoot !== d.documentRoot) {
            return {
              ...d,
              documentRoot: updatedDocRoot,
            };
          }
          return d;
        });

        let loadedInvoices: Invoice[] =
          Array.isArray(parsed.invoices) && parsed.invoices.length > 0
            ? parsed.invoices
            : INITIAL_STATE.invoices;
        loadedInvoices = loadedInvoices.map(inv => {
          const safeItems =
            Array.isArray(inv.items) && inv.items.length > 0
              ? inv.items.map(it => ({
                  description: String(it?.description || 'Layanan Cloud Hosting & Domain'),
                  qty: Number(it?.qty) || 1,
                  unitPrice: Number(it?.unitPrice ?? it?.amount ?? inv.amount ?? 350000),
                  amount: Number(it?.amount ?? inv.amount ?? 350000),
                }))
              : [
                  {
                    description: String((inv as any).description || 'Tagihan Otomatis Perpanjangan Cloud Hosting & Domain'),
                    qty: 1,
                    unitPrice: Number(inv.amount) || 350000,
                    amount: Number(inv.amount) || 350000,
                  },
                ];

          if (inv.id === 'inv-default-unpaid-01' || inv.userId === 'usr-cust-02') {
            return {
              ...inv,
              accountId: inv.accountId || 'acc-school-02',
              userName: (inv.userName || '').toLowerCase().includes('reseller') ? 'Pelanggan Hosting cPanel' : (inv.userName || 'Pelanggan Hosting cPanel'),
              userEmail: inv.userEmail?.toLowerCase().includes('reseller') ? 'admin@websitepelanggan.my.id' : (inv.userEmail || 'admin@websitepelanggan.my.id'),
              userPhone: inv.userPhone || '+62 812-2673-8883',
              resellerId: undefined,
              billingSource: inv.billingSource || 'automated',
              amount: Number(inv.amount) || 400000,
              currency: inv.currency || 'IDR',
              status: inv.status || 'unpaid',
              dueDate: inv.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
              createdAt: inv.createdAt || new Date().toISOString(),
              items: safeItems.map(it => ({
                ...it,
                description: it.description.replace(/klien-reseller\.my\.id/g, 'websitepelanggan.my.id'),
              })),
            };
          }
          return {
            ...inv,
            userName: inv.userName || 'Pelanggan Cloud PRO',
            userPhone: inv.userPhone || '+62 812-2673-8883',
            amount: Number(inv.amount) || 350000,
            currency: inv.currency || 'IDR',
            status: inv.status || 'unpaid',
            dueDate: inv.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
            createdAt: inv.createdAt || new Date().toISOString(),
            items: safeItems,
          };
        });

        // Ensure default customer automatic invoice exists in loadedInvoices
        if (!loadedInvoices.some(i => i.userId === 'usr-cust-02' || i.accountId === 'acc-school-02')) {
          loadedInvoices.unshift(JSON.parse(JSON.stringify(INITIAL_STATE.invoices[0])));
        }

        const loadedBackups: AccountBackup[] =
          Array.isArray(parsed.backups) && parsed.backups.length > 0
            ? parsed.backups.map((b: any) => ({
                ...b,
                sizeMb: Number(b?.sizeMb) || 50.0,
                createdAt: b?.createdAt || new Date().toISOString(),
              }))
            : INITIAL_STATE.backups;

        let loadedLetterhead: CloudProLetterheadConfig | undefined = parsed.letterheadConfig || undefined;
        try {
          const rawLh = localStorage.getItem(LETTERHEAD_STORAGE_KEY);
          if (rawLh && rawLh.trim()) {
            loadedLetterhead = { ...DEFAULT_LETTERHEAD_CONFIG, ...JSON.parse(rawLh) };
          }
        } catch {}

        return {
          ...INITIAL_STATE,
          ...parsed,
          users: loadedUsers.map(u => ({
            ...u,
            creditBalance: typeof u.creditBalance === 'number' && !Number.isNaN(u.creditBalance) ? u.creditBalance : 0,
          })),
          resellerProfiles: Array.isArray(parsed.resellerProfiles) ? parsed.resellerProfiles : INITIAL_STATE.resellerProfiles,
          backups: loadedBackups,
          invoices: loadedInvoices,
          ipAddresses: (Array.isArray(parsed.ipAddresses) && parsed.ipAddresses.length > 0) ? parsed.ipAddresses : INITIAL_STATE.ipAddresses,
          hostingAccounts: loadedAccounts,
          virtualFiles: loadedFiles,
          databases: (hasAccounts && Array.isArray(parsed.databases) && parsed.databases.length > 0) ? parsed.databases : INITIAL_STATE.databases,
          emailMailboxes: (hasAccounts && Array.isArray(parsed.emailMailboxes) && parsed.emailMailboxes.length > 0) ? parsed.emailMailboxes : INITIAL_STATE.emailMailboxes,
          dnsRecords: (hasAccounts && Array.isArray(parsed.dnsRecords) && parsed.dnsRecords.length > 0) ? parsed.dnsRecords : INITIAL_STATE.dnsRecords,
          cronJobs: (hasAccounts && Array.isArray(parsed.cronJobs) && parsed.cronJobs.length > 0) ? parsed.cronJobs : INITIAL_STATE.cronJobs,
          vpsInstances: (parsed.vpsInstances && parsed.vpsInstances.length > 0) ? parsed.vpsInstances : INITIAL_STATE.vpsInstances,
          vpsSnapshots: (parsed.vpsSnapshots && parsed.vpsSnapshots.length > 0) ? parsed.vpsSnapshots : INITIAL_STATE.vpsSnapshots,
          vpsFirewallRules: (parsed.vpsFirewallRules && parsed.vpsFirewallRules.length > 0) ? parsed.vpsFirewallRules : INITIAL_STATE.vpsFirewallRules,
          nameserverConfigs: (parsed.nameserverConfigs && parsed.nameserverConfigs.length > 0) ? parsed.nameserverConfigs : INITIAL_STATE.nameserverConfigs,
          r2Configs: (parsed.r2Configs && parsed.r2Configs.length > 0) ? parsed.r2Configs : INITIAL_STATE.r2Configs,
          optimizedMedia: (parsed.optimizedMedia && parsed.optimizedMedia.length > 0) ? parsed.optimizedMedia : INITIAL_STATE.optimizedMedia,
          domains: loadedDomains,
          databaseTables: parsed.databaseTables || INITIAL_STATE.databaseTables,
          deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
          letterheadConfig: loadedLetterhead,
          stateUpdatedAt: parsed.stateUpdatedAt || Date.now(),
        };
      }
    } catch (err) {
      console.warn('Failed to load state from localStorage, falling back to default:', err);
    }
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  private getStorageOptimizedState(): DatabaseState {
    const MAX_LOCAL_FILE_CONTENT_CHARS = 1200;
    // Cap virtualFiles stored in localStorage to 60 items so localStorage stays under 30KB
    const rawFiles = (this.state.virtualFiles || []).slice(-60);
    const optimizedVirtualFiles = rawFiles.map(f => {
      if (typeof f.content === 'string' && f.content.length > MAX_LOCAL_FILE_CONTENT_CHARS) {
        return {
          ...f,
          content: undefined,
          isVaultOffloaded: true,
        };
      }
      return f;
    });

    return {
      ...this.state,
      virtualFiles: optimizedVirtualFiles,
    };
  }

  private saveState(syncToServer = true): void {
    try {
      this.state.stateUpdatedAt = Date.now();

      // 1. Prepare ultra-lightweight state for localStorage (< 35KB total)
      const optimizedState = this.getStorageOptimizedState();
      let jsonStr = JSON.stringify(optimizedState);

      // 2. Attempt to save to localStorage with graceful fallback chain
      try {
        localStorage.setItem(STORAGE_KEY, jsonStr);
      } catch {
        // Quota recovery: strip all virtual file contents for localStorage
        try {
          const minimalFiles = (this.state.virtualFiles || []).slice(-30).map(f => ({
            ...f,
            content: undefined,
            isVaultOffloaded: true,
          }));
          const minimalState = { ...this.state, virtualFiles: minimalFiles };
          jsonStr = JSON.stringify(minimalState);
          localStorage.setItem(STORAGE_KEY, jsonStr);
        } catch {
          // If still constrained by other storage on domain, save core entities only
          try {
            const emergencyState = {
              ...INITIAL_STATE,
              users: this.state.users,
              hostingAccounts: this.state.hostingAccounts,
              domains: this.state.domains,
              invoices: this.state.invoices,
              deletedIds: this.state.deletedIds,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(emergencyState));
          } catch {
            // Memory and server vault maintain complete state
          }
        }
      }

      try {
        localStorage.setItem('cloudpro_last_saved_at', new Date().toISOString());
      } catch {
        // Ignore timestamp save error
      }

      this.notifyListeners();

      // 4. Automatically sync FULL state to the server's Persistent Vault ONLY after initial server hydration completes
      // Debounced by 1200ms to eliminate background CPU spikes and network churn
      if (syncToServer && this.hasHydratedFromServer && !this.isHydrating) {
        if (this.vaultSyncTimer) clearTimeout(this.vaultSyncTimer);
        this.vaultSyncTimer = setTimeout(() => {
          this.syncToServerVault(true).catch(() => {});
        }, 1200);
      }
    } catch {
      // Graceful fallback: memory and server vault maintain data
    }
  }

  public async syncToServerVault(userInitiated = true): Promise<boolean> {
    try {
      // Keep vault payload compact: cap virtualFiles to 300 entries and strip oversized non-index file content
      const cappedFiles = (this.state.virtualFiles || []).slice(-300).map(f => {
        const lowerName = (f.name || '').toLowerCase();
        const isEntry = lowerName === 'index.html' || lowerName === 'index.php' || lowerName === 'style.css';
        if (!isEntry && typeof f.content === 'string' && f.content.length > 100_000) {
          return { ...f, content: undefined };
        }
        return f;
      });
      const res = await fetch('/api/state/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: {
            ...this.state,
            virtualFiles: cappedFiles,
          },
          userInitiated,
          lockRetention: true,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.lastSavedAt) {
          this.lastVaultSavedAt = data.lastSavedAt;
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async hydrateFromServerVault(): Promise<boolean> {
    if (this.isHydrating) return false;
    this.isHydrating = true;
    try {
      const res = await fetch('/api/state/vault');
      if (!res.ok) {
        this.hasHydratedFromServer = true;
        return false;
      }
      const data = await res.json();
      let updated = false;
      let localHadExtra = false;

      // Fast exit if server vault hasn't changed since last hydration
      if (
        this.hasHydratedFromServer &&
        this.lastVaultSavedAt &&
        data?.lastSavedAt &&
        this.lastVaultSavedAt === data.lastSavedAt
      ) {
        return false;
      }

      if (data?.fullState && typeof data.fullState === 'object') {
        const vault = data.fullState as Partial<DatabaseState>;
        const vaultDeleted = Array.isArray(vault.deletedIds) ? vault.deletedIds : [];
        const localDeleted = Array.isArray(this.state.deletedIds) ? this.state.deletedIds : [];
        const deletedSet = new Set<string>([...vaultDeleted, ...localDeleted]);

        if (deletedSet.size !== localDeleted.length) {
          this.state.deletedIds = Array.from(deletedSet).slice(-600);
          updated = true;
        }

        // Generic bidirectional union-merge by ID (server is authoritative for existing IDs, local extra IDs are preserved & pushed to server)
        const syncCollection = <T extends { id: string }>(
          vaultArr: T[] | undefined,
          localArr: T[] | undefined,
          trackExtraForPush = true
        ): T[] => {
          const vList = Array.isArray(vaultArr) ? vaultArr : [];
          const lList = Array.isArray(localArr) ? localArr : [];
          const map = new Map<string, T>();
          const vaultIdSet = new Set<string>();

          // 1. Add all non-deleted items from Server Vault
          for (const vItem of vList) {
            if (vItem && vItem.id && !deletedSet.has(vItem.id)) {
              map.set(vItem.id, vItem);
              vaultIdSet.add(vItem.id);
            }
          }

          // 2. Merge any local items that were created or more recently modified on this device (e.g. PC)
          for (const lItem of lList) {
            if (lItem && lItem.id && !deletedSet.has(lItem.id)) {
              const vExisting = map.get(lItem.id);
              if (!vExisting) {
                map.set(lItem.id, lItem);
                if (trackExtraForPush) {
                  localHadExtra = true;
                }
              } else {
                const lTs = Number((lItem as any)._updatedAt || 0);
                const vTs = Number((vExisting as any)._updatedAt || 0);
                if (lTs > vTs && JSON.stringify(lItem) !== JSON.stringify(vExisting)) {
                  map.set(lItem.id, lItem);
                  if (trackExtraForPush) {
                    localHadExtra = true;
                  }
                }
              }
            }
          }

          const result = Array.from(map.values());
          if (JSON.stringify(result) !== JSON.stringify(lList)) {
            updated = true;
          }
          return result;
        };

        this.state.users = syncCollection(vault.users, this.state.users, false);
        this.state.resellerProfiles = syncCollection(vault.resellerProfiles, this.state.resellerProfiles, false);
        this.state.serverNodes = syncCollection(vault.serverNodes, this.state.serverNodes, false);
        this.state.hostingPlans = syncCollection(vault.hostingPlans, this.state.hostingPlans, false);
        this.state.hostingAccounts = syncCollection(vault.hostingAccounts, this.state.hostingAccounts, false);
        this.state.domains = syncCollection(vault.domains, this.state.domains, false);
        this.state.databases = syncCollection(vault.databases, this.state.databases, false);
        this.state.emailMailboxes = syncCollection(vault.emailMailboxes, this.state.emailMailboxes, false);
        this.state.dnsRecords = syncCollection(vault.dnsRecords, this.state.dnsRecords, false);
        this.state.cronJobs = syncCollection(vault.cronJobs, this.state.cronJobs, false);
        this.state.backups = syncCollection(vault.backups, this.state.backups, false);
        this.state.invoices = syncCollection(vault.invoices, this.state.invoices, false);
        this.state.auditLogs = syncCollection(vault.auditLogs, this.state.auditLogs, false).slice(0, 200);
        this.state.firewallRules = syncCollection(vault.firewallRules, this.state.firewallRules, false);
        this.state.apiKeys = syncCollection(vault.apiKeys, this.state.apiKeys, false);
        this.state.notifications = syncCollection(vault.notifications, this.state.notifications, false).slice(0, 100);
        this.state.vpsInstances = syncCollection(vault.vpsInstances, this.state.vpsInstances, false);
        this.state.vpsSnapshots = syncCollection(vault.vpsSnapshots, this.state.vpsSnapshots, false);
        this.state.vpsFirewallRules = syncCollection(vault.vpsFirewallRules, this.state.vpsFirewallRules, false);
        this.state.ipAddresses = syncCollection(vault.ipAddresses, this.state.ipAddresses, false);
        this.state.nameserverConfigs = syncCollection(vault.nameserverConfigs, this.state.nameserverConfigs, false);
        this.state.r2Configs = syncCollection(vault.r2Configs, this.state.r2Configs, false);
        this.state.optimizedMedia = syncCollection(vault.optimizedMedia, this.state.optimizedMedia, false);

        if (vault.databaseTables && typeof vault.databaseTables === 'object') {
          const mergedTables = {
            ...(this.state.databaseTables || {}),
            ...vault.databaseTables,
          };
          if (JSON.stringify(mergedTables) !== JSON.stringify(this.state.databaseTables)) {
            this.state.databaseTables = mergedTables;
            updated = true;
          }
        }

        if (vault.letterheadConfig && typeof vault.letterheadConfig === 'object') {
          if (JSON.stringify(vault.letterheadConfig) !== JSON.stringify(this.state.letterheadConfig)) {
            this.state.letterheadConfig = vault.letterheadConfig;
            try {
              localStorage.setItem(LETTERHEAD_STORAGE_KEY, JSON.stringify(vault.letterheadConfig));
            } catch {}
            updated = true;
          }
        }
      } else {
        // Server vault is empty; push our current state to initialize the server vault
        localHadExtra = true;
      }

      // High-performance single-pass in-memory merge for virtualFiles
      const deletedSet = new Set<string>(this.state.deletedIds || []);
      const fileMap = new Map<string, VirtualFile>();
      for (const lf of this.state.virtualFiles || []) {
        if (lf && !deletedSet.has(lf.id)) {
          const key = `${lf.accountId}:${this.normalizeVirtualPath(lf.path || '').toLowerCase()}`;
          fileMap.set(key, lf);
        }
      }

      const vaultFiles: VirtualFile[] = Array.isArray(data?.fullState?.virtualFiles) ? data.fullState.virtualFiles : [];
      for (const vf of vaultFiles) {
        if (!vf || deletedSet.has(vf.id)) continue;
        const key = `${vf.accountId}:${this.normalizeVirtualPath(vf.path || '').toLowerCase()}`;
        const prev = fileMap.get(key);
        const resolvedContent =
          typeof vf.content === 'string' && vf.content.length > 0
            ? vf.content
            : prev?.content;
        fileMap.set(key, {
          ...(prev || {}),
          ...vf,
          content: resolvedContent,
          isVaultOffloaded: resolvedContent ? undefined : (vf as any).isVaultOffloaded,
        });
      }

      // Merge filesByAccount from vhostStore IN-MEMORY without calling saveState() in a loop
      if (data?.vhostStore?.filesByAccount && typeof data.vhostStore.filesByAccount === 'object') {
        for (const [accId, sFiles] of Object.entries(data.vhostStore.filesByAccount)) {
          if (Array.isArray(sFiles)) {
            for (const sf of sFiles as any[]) {
              if (sf && sf.type === 'file' && typeof sf.content === 'string') {
                const normPath = this.normalizeVirtualPath(sf.path || '').toLowerCase();
                const key = `${accId}:${normPath}`;
                const prev = fileMap.get(key);

                if (
                  sf.content.includes('Website Berhasil Disinkronkan!') &&
                  prev &&
                  String(prev.id || '').startsWith('vf-clone-') &&
                  (prev.content || '').length > 1000
                ) {
                  continue;
                }

                if (!prev || prev.content !== sf.content) {
                  fileMap.set(key, {
                    ...(prev || {}),
                    id: prev?.id || sf.id || `vf-vault-${Date.now()}`,
                    accountId: accId,
                    name: sf.name,
                    path: sf.path,
                    type: 'file',
                    sizeBytes: sf.size || sf.content.length,
                    permissions: '0644',
                    updatedAt: new Date().toISOString(),
                    content: sf.content,
                  });
                }
              }
            }
          }
        }
      }

      const nextFiles = Array.from(fileMap.values());
      if (nextFiles.length !== (this.state.virtualFiles || []).length) {
        this.state.virtualFiles = nextFiles;
        updated = true;
      }

      // Also merge any accounts from vhostStore.accounts on the server
      if (Array.isArray(data?.vhostStore?.accounts)) {
        for (const sAcc of data.vhostStore.accounts) {
          if (!sAcc || !sAcc.id || deletedSet.has(sAcc.id)) continue;
          const exists = this.state.hostingAccounts.some(a => a.id === sAcc.id);
          if (!exists && sAcc.primaryDomain) {
            this.state.hostingAccounts.push({
              id: sAcc.id,
              primaryDomain: sAcc.primaryDomain,
              domain: sAcc.primaryDomain,
              username: sAcc.username || sAcc.primaryDomain.split('.')[0],
              customerId: sAcc.customerId || 'usr-cust-02',
              customerName: sAcc.customerName || sAcc.username || sAcc.primaryDomain,
              customerEmail: sAcc.customerEmail || `admin@${sAcc.primaryDomain}`,
              serverId: sAcc.serverId || 'srv-sg-01',
              serverName: sAcc.serverName || 'SG-Equinix-Node01',
              planId: sAcc.planId || 'plan-starter',
              planName: sAcc.planName || 'Cloud Starter',
              diskUsedMb: sAcc.diskUsedMb ?? 25,
              diskLimitMb: sAcc.diskLimitMb ?? 10240,
              bandwidthUsedMb: sAcc.bandwidthUsedMb ?? 120,
              bandwidthLimitMb: sAcc.bandwidthLimitMb ?? 102400,
              phpVersion: (sAcc.phpVersion as any) || '8.2',
              phpExtensions: sAcc.phpExtensions || ['mysqli', 'pdo', 'curl', 'opcache', 'gd', 'mbstring', 'zip'],
              status: sAcc.status || 'active',
              sslStatus: sAcc.sslStatus || 'active',
              documentRoot: sAcc.documentRoot || `/home/${sAcc.username || 'user'}/public_html`,
              ipAddress: sAcc.ipAddress || '172.67.223.133',
              createdAt: sAcc.createdAt || new Date().toISOString(),
            });
            updated = true;
          }
        }
      }

      // Ensure invoices are populated if vault had empty invoices array
      if (!Array.isArray(this.state.invoices) || this.state.invoices.length === 0) {
        this.state.invoices = JSON.parse(JSON.stringify(INITIAL_STATE.invoices));
        updated = true;
      }

      // Always enforce multi-tenant isolation and upgrade legacy username madrasah -> cloudpro
      if (Array.isArray(this.state.hostingAccounts)) {
        this.state.hostingAccounts = this.state.hostingAccounts.map(acc => {
          if (acc.id === 'acc-rdm-01') {
            if (acc.resellerId || acc.username === 'madrasah' || (acc.documentRoot || '').includes('/home/madrasah')) {
              updated = true;
              return {
                ...acc,
                resellerId: undefined,
                customerId: 'usr-admin-01',
                username: acc.username === 'madrasah' || !acc.username ? 'cloudpro' : acc.username,
                documentRoot: (acc.documentRoot || '/home/cloudpro/public_html').replace('/home/madrasah', '/home/cloudpro'),
              };
            }
          }
          if (acc.id === 'acc-school-02' || acc.customerId === 'usr-cust-02') {
            if (acc.resellerId || acc.primaryDomain.includes('reseller') || acc.customerName?.toLowerCase().includes('reseller')) {
              updated = true;
              const cleanDom =
                acc.primaryDomain === 'klien-reseller.my.id' ||
                acc.primaryDomain === 'portal.denbaguse.my.id' ||
                acc.primaryDomain.includes('reseller')
                  ? 'websitepelanggan.my.id'
                  : acc.primaryDomain;
              return {
                ...acc,
                resellerId: undefined,
                primaryDomain: cleanDom,
                domain: cleanDom,
                username: acc.username === 'klienweb' ? 'pelanggan' : acc.username,
                customerName: 'Pelanggan Hosting cPanel',
                customerEmail: 'admin@websitepelanggan.my.id',
                documentRoot: '/home/pelanggan/public_html',
              };
            }
          }
          return acc;
        });
      }

      // Normalize legacy primary domain records in domains list after vault hydration
      if (Array.isArray(this.state.domains)) {
        this.state.domains = this.state.domains.map(d => {
          const nextDocRoot = (d.documentRoot || '').replace('/home/madrasah', '/home/cloudpro');
          if (d.accountId === 'acc-rdm-01' && d.type === 'primary' && d.domain.toLowerCase() === 'rdm.denbaguse.my.id') {
            updated = true;
            return {
              ...d,
              domain: 'denbaguse.my.id',
              documentRoot: '/home/cloudpro/public_html',
            };
          }
          if (nextDocRoot !== d.documentRoot) {
            updated = true;
            return {
              ...d,
              documentRoot: nextDocRoot,
            };
          }
          return d;
        });
      }

      // Merge any subdomains from server vhostStore.subdomains so PHP Selector & Domain Manager always see all subdomains
      if (Array.isArray(data?.vhostStore?.subdomains)) {
        if (!Array.isArray(this.state.domains)) this.state.domains = [];
        for (const sub of data.vhostStore.subdomains) {
          if (!sub || !sub.fullDomain) continue;
          const fullDom = String(sub.fullDomain).toLowerCase().trim();
          const ownerAcc =
            this.state.hostingAccounts.find(a => a.id === sub.accountId) ||
            this.state.hostingAccounts.find(a => fullDom === a.primaryDomain.toLowerCase() || fullDom.endsWith(`.${a.primaryDomain.toLowerCase()}`));
          if (!ownerAcc) continue;
          const isPrimary = fullDom === ownerAcc.primaryDomain.toLowerCase();
          const existingIdx = this.state.domains.findIndex(d => d.domain.toLowerCase() === fullDom);
          if (existingIdx < 0 && !isPrimary) {
            const pDom = ownerAcc.primaryDomain.toLowerCase();
            const prefix = fullDom.endsWith(`.${pDom}`) ? fullDom.slice(0, -(pDom.length + 1)) : fullDom.split('.')[0];
            const cleanRelDoc = String(sub.documentRoot || `/public_html/${prefix}`).replace(/^\/home\/[^/]+/, '');
            this.state.domains.push({
              id: sub.id || `dom-sub-${prefix}`,
              accountId: ownerAcc.id,
              domain: sub.fullDomain,
              type: 'subdomain',
              parentDomain: ownerAcc.primaryDomain,
              subdomainPrefix: prefix,
              documentRoot: `/home/${ownerAcc.username}${cleanRelDoc.startsWith('/') ? cleanRelDoc : '/' + cleanRelDoc}`,
              phpVersion: (sub.phpVersion as any) || (prefix === 'rdm' ? '7.2' : prefix === 'cbt' ? '7.4' : ownerAcc.phpVersion || '8.2'),
              phpExtensions: Array.isArray(sub.phpExtensions) ? sub.phpExtensions : undefined,
              phpDirectives: sub.phpDirectives || undefined,
              sslStatus: 'active',
              createdAt: new Date().toISOString(),
            });
            updated = true;
          } else if (existingIdx >= 0 && sub.phpVersion) {
            const cur = this.state.domains[existingIdx];
            if (cur.phpVersion !== sub.phpVersion || (sub.phpExtensions && !cur.phpExtensions)) {
              this.state.domains[existingIdx] = {
                ...cur,
                phpVersion: sub.phpVersion as any,
                phpExtensions: sub.phpExtensions || cur.phpExtensions,
                phpDirectives: sub.phpDirectives || cur.phpDirectives,
              };
              updated = true;
            }
          }
        }
      }

      this.hasHydratedFromServer = true;
      this.lastVaultSavedAt = data?.lastSavedAt || new Date().toISOString();

      if (updated || localHadExtra) {
        this.saveState(false);
      }

      // If this device (e.g. PC) had custom customers/accounts/domains/invoices in localStorage not yet in the Server Vault, push them now!
      if (localHadExtra) {
        this.syncToServerVault(true).catch(() => {});
      }

      return updated || localHadExtra;
    } catch {
      this.hasHydratedFromServer = true;
      return false;
    } finally {
      this.isHydrating = false;
    }
  }

  public isDataRetentionEnabled(): boolean {
    try {
      const val = localStorage.getItem('cloudpro_data_retention_enabled');
      if (val === 'false') return false;
    } catch {
      // ignore
    }
    return true;
  }

  public setDataRetentionEnabled(enabled: boolean): void {
    try {
      localStorage.setItem('cloudpro_data_retention_enabled', enabled ? 'true' : 'false');
    } catch {
      // ignore
    }
  }

  public async syncToPersistentVault(userInitiated = true): Promise<boolean> {
    this.saveState();
    return this.syncToServerVault(userInitiated);
  }

  public exportFullStateJson(): string {
    return this.exportDatabaseJson();
  }

  public importFullStateJson(jsonStr: string): { ok: boolean; message: string } {
    const ok = this.importDatabaseJson(jsonStr);
    if (ok) {
      return {
        ok: true,
        message: 'Seluruh data website, domain, database, dan pengaturan berhasil dipulihkan dari file Persistent Vault.',
      };
    }
    return {
      ok: false,
      message: 'Format file JSON Persistent Vault tidak valid atau rusak.',
    };
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public resetToDefault(): DatabaseState {
    this.state = JSON.parse(JSON.stringify(INITIAL_STATE));
    this.saveState();
    return this.state;
  }

  public exportDatabaseJson(): string {
    return JSON.stringify(this.state, null, 2);
  }

  public importDatabaseJson(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.users && parsed.serverNodes && parsed.hostingAccounts) {
        this.state = parsed;
        this.saveState();
        this.syncToServerVault(true).catch(() => {});
        return true;
      }
    } catch (err) {
      console.error('Import failed:', err);
    }
    return false;
  }

  // --- Users & Resellers ---
  public getUsers(): User[] {
    return this.state.users;
  }

  public getUserById(id: string): User | undefined {
    return this.state.users.find(u => u.id === id);
  }

  public saveUser(user: User): void {
    const stamped = { ...user, _updatedAt: Date.now() } as User;
    const idx = this.state.users.findIndex(u => u.id === stamped.id);
    if (idx >= 0) {
      this.state.users[idx] = stamped;
    } else {
      this.state.users.unshift(stamped);
    }
    this.saveState();
  }

  public deleteUser(userId: string, cascadeAccounts = true): void {
    if (userId === 'usr-admin-01') return;
    const targetUser = this.getUserById(userId);
    const idsToMark: string[] = [userId];

    this.state.resellerProfiles
      .filter(r => r.userId === userId)
      .forEach(r => idsToMark.push(r.id));
    this.state.hostingPlans
      .filter(p => p.resellerId === userId)
      .forEach(p => idsToMark.push(p.id));

    this.state.users = this.state.users.filter(u => u.id !== userId);
    this.state.resellerProfiles = this.state.resellerProfiles.filter(r => r.userId !== userId);
    this.state.hostingPlans = this.state.hostingPlans.filter(p => p.resellerId !== userId);
    if (Array.isArray(this.state.nameserverConfigs)) {
      this.state.nameserverConfigs
        .filter(ns => ns.resellerId === userId)
        .forEach(ns => idsToMark.push(ns.id));
      this.state.nameserverConfigs = this.state.nameserverConfigs.filter(ns => ns.resellerId !== userId);
    }

    if (cascadeAccounts) {
      if (targetUser?.role === 'reseller') {
        const resellerAccs = this.state.hostingAccounts.filter(
          a => a.resellerId === userId && a.id !== 'acc-rdm-01'
        );
        resellerAccs.forEach(acc => this.deleteHostingAccount(acc.id));
        this.state.users
          .filter(u => u.role === 'customer' && u.resellerId === userId)
          .forEach(u => idsToMark.push(u.id));
        this.state.users = this.state.users.filter(
          u => !(u.role === 'customer' && u.resellerId === userId)
        );
        this.state.invoices
          .filter(inv => inv.userId === userId || inv.resellerId === userId)
          .forEach(inv => idsToMark.push(inv.id));
        this.state.invoices = this.state.invoices.filter(
          inv => inv.userId !== userId && inv.resellerId !== userId
        );
      } else {
        const customerAccs = this.state.hostingAccounts.filter(
          a =>
            a.id !== 'acc-rdm-01' &&
            (a.customerId === userId ||
              (targetUser?.email && a.customerEmail?.toLowerCase() === targetUser.email.toLowerCase()))
        );
        customerAccs.forEach(acc => this.deleteHostingAccount(acc.id));
        this.state.invoices
          .filter(inv => inv.userId === userId)
          .forEach(inv => idsToMark.push(inv.id));
        this.state.invoices = this.state.invoices.filter(inv => inv.userId !== userId);
      }
    }

    this.markDeleted(idsToMark);
    this.saveState();
  }

  public getResellerProfiles(): ResellerProfile[] {
    return this.state.resellerProfiles;
  }

  public getResellerProfile(userId: string): ResellerProfile | undefined {
    return this.state.resellerProfiles.find(p => p.userId === userId);
  }

  public saveResellerProfile(profile: ResellerProfile): void {
    const stamped = { ...profile, _updatedAt: Date.now() } as ResellerProfile;
    const idx = this.state.resellerProfiles.findIndex(p => p.id === stamped.id || p.userId === stamped.userId);
    if (idx >= 0) {
      this.state.resellerProfiles[idx] = stamped;
    } else {
      this.state.resellerProfiles.push(stamped);
    }
    this.saveState();
  }

  // --- Server Nodes ---
  public getServerNodes(): ServerNode[] {
    return this.state.serverNodes;
  }

  public getServerNode(id: string): ServerNode | undefined {
    return this.state.serverNodes.find(s => s.id === id);
  }

  public saveServerNode(node: ServerNode): void {
    const idx = this.state.serverNodes.findIndex(s => s.id === node.id);
    if (idx >= 0) {
      this.state.serverNodes[idx] = node;
    } else {
      this.state.serverNodes.push(node);
    }
    this.saveState();
  }

  public deleteServerNode(id: string): void {
    this.state.serverNodes = this.state.serverNodes.filter(s => s.id !== id);
    this.saveState();
  }

  // --- Hosting Plans ---
  public getHostingPlans(): HostingPlan[] {
    return this.state.hostingPlans;
  }

  public saveHostingPlan(plan: HostingPlan): void {
    const stamped = { ...plan, _updatedAt: Date.now() } as HostingPlan;
    const idx = this.state.hostingPlans.findIndex(p => p.id === stamped.id);
    if (idx >= 0) {
      this.state.hostingPlans[idx] = stamped;
    } else {
      this.state.hostingPlans.push(stamped);
    }
    this.saveState();
  }

  public deleteHostingPlan(planId: string): void {
    this.state.hostingPlans = this.state.hostingPlans.filter(p => p.id !== planId);
    this.saveState();
  }

  // --- Hosting Accounts ---
  public getHostingAccounts(): HostingAccount[] {
    return this.state.hostingAccounts;
  }

  public getHostingAccount(id: string): HostingAccount | undefined {
    return this.state.hostingAccounts.find(a => a.id === id);
  }

  public saveHostingAccount(acc: HostingAccount): void {
    acc = { ...acc, _updatedAt: Date.now() } as HostingAccount;
    const idx = this.state.hostingAccounts.findIndex(a => a.id === acc.id);
    if (idx >= 0) {
      this.state.hostingAccounts[idx] = acc;
    } else {
      this.state.hostingAccounts.unshift(acc);
      // Increment assigned count on server node
      const server = this.state.serverNodes.find(s => s.id === acc.serverId);
      if (server) {
        server.assignedAccountsCount = (server.assignedAccountsCount || 0) + 1;
      }
    }

    // Automatically bind Cloudflare R2 config & CNAME record to the account's primaryDomain
    if (!this.state.r2Configs) this.state.r2Configs = [];
    const cleanDomain = (acc.primaryDomain || 'website.my.id').toLowerCase().trim();
    const cleanSlug = (acc.username || cleanDomain.replace(/[^a-z0-9]/g, '-')).toLowerCase();
    const existingR2 = this.state.r2Configs.find(r => r.accountId === acc.id);
    if (!existingR2) {
      this.state.r2Configs.push({
        id: `r2-cfg-${acc.id}`,
        accountId: acc.id,
        bucketName: `r2-${cleanSlug}-media`,
        accountIdCloudflare: 'cf_acc_auto_edge_id01',
        accessKeyId: `r2_key_${cleanSlug}_auto`,
        secretAccessKeyMasked: '********************************',
        publicCdnDomain: `https://media.${cleanDomain}`,
        autoWebpCompression: true,
        compressionQuality: 82,
        maxDimensionPx: 1920,
        stripExifGps: true,
        status: 'connected',
        lastSyncedAt: new Date().toISOString(),
      });
    } else if (
      acc.id !== 'acc-rdm-01' &&
      existingR2.publicCdnDomain.includes('denbaguse.my.id')
    ) {
      existingR2.publicCdnDomain = `https://media.${cleanDomain}`;
      existingR2.bucketName = `r2-${cleanSlug}-media`;
    }

    // Ensure automatic CNAME DNS record for media.<domain> -> r2-edge.cloudpro.id
    if (!this.state.dnsRecords) this.state.dnsRecords = [];
    const hasMediaCname = this.state.dnsRecords.some(
      d => d.accountId === acc.id && d.name.toLowerCase() === 'media'
    );
    if (!hasMediaCname) {
      this.state.dnsRecords.push({
        id: `dns-r2-media-${acc.id}`,
        accountId: acc.id,
        domain: cleanDomain,
        type: 'CNAME',
        name: 'media',
        content: `r2-${cleanSlug}.r2-edge.cloudpro.id`,
        ttl: 3600,
      });
    }

    // Keep primary domain and child subdomains synchronized in this.state.domains
    if (!this.state.domains) this.state.domains = [];
    const primaryIdx = this.state.domains.findIndex(
      d => d.accountId === acc.id && d.type === 'primary'
    );
    if (primaryIdx >= 0) {
      this.state.domains[primaryIdx] = {
        ...this.state.domains[primaryIdx],
        domain: cleanDomain,
        documentRoot: acc.documentRoot || `/home/${acc.username}/public_html`,
        phpVersion: acc.phpVersion || '8.2',
        sslStatus: acc.sslStatus === 'active' ? 'active' : 'pending',
      };
    } else {
      this.state.domains.push({
        id: `dom-primary-${acc.id}`,
        accountId: acc.id,
        domain: cleanDomain,
        type: 'primary',
        documentRoot: acc.documentRoot || `/home/${acc.username}/public_html`,
        phpVersion: acc.phpVersion || '8.2',
        sslStatus: acc.sslStatus === 'active' ? 'active' : 'pending',
        createdAt: acc.createdAt || new Date().toISOString(),
      });
    }

    this.saveState();
  }

  public deleteHostingAccount(accId: string): void {
    const acc = this.getHostingAccount(accId);
    if (acc) {
      const server = this.state.serverNodes.find(s => s.id === acc.serverId);
      if (server && (server.assignedAccountsCount || 0) > 0) {
        server.assignedAccountsCount = (server.assignedAccountsCount || 0) - 1;
      }
    }
    const idsToMark: string[] = [accId];
    (this.state.domains || []).filter(d => d.accountId === accId).forEach(d => idsToMark.push(d.id));
    (this.state.virtualFiles || []).filter(f => f.accountId === accId).forEach(f => idsToMark.push(f.id));
    (this.state.dnsRecords || []).filter(d => d.accountId === accId).forEach(d => idsToMark.push(d.id));
    (this.state.databases || []).filter(d => d.accountId === accId).forEach(d => idsToMark.push(d.id));
    (this.state.emailMailboxes || []).filter(m => m.accountId === accId).forEach(m => idsToMark.push(m.id));
    (this.state.cronJobs || []).filter(c => c.accountId === accId).forEach(c => idsToMark.push(c.id));
    (this.state.backups || []).filter(b => b.accountId === accId).forEach(b => idsToMark.push(b.id));

    this.state.hostingAccounts = this.state.hostingAccounts.filter(a => a.id !== accId);
    this.state.domains = (this.state.domains || []).filter(d => d.accountId !== accId);
    this.state.virtualFiles = this.state.virtualFiles.filter(f => f.accountId !== accId);
    this.state.dnsRecords = this.state.dnsRecords.filter(d => d.accountId !== accId);
    this.state.databases = this.state.databases.filter(d => d.accountId !== accId);
    this.state.emailMailboxes = this.state.emailMailboxes.filter(m => m.accountId !== accId);
    this.state.cronJobs = this.state.cronJobs.filter(c => c.accountId !== accId);
    this.state.backups = this.state.backups.filter(b => b.accountId !== accId);
    this.markDeleted(idsToMark);
    this.saveState();
  }

  // --- Virtual Files ---
  public getVirtualFiles(accountId: string): VirtualFile[] {
    let changed = false;
    const files = this.state.virtualFiles.filter(f => f.accountId === accountId);
    for (const f of files) {
      if (
        f.type === 'file' &&
        f.name.toLowerCase() === 'index.html' &&
        typeof f.content === 'string' &&
        f.content.includes('<base ') &&
        !f.content.includes('cloudpro-spa-clone-shim')
      ) {
        const baseMatch = f.content.match(/<base\s+href=["'](https?:\/\/[^/"']+)[^"']*["']/i);
        if (baseMatch && baseMatch[1]) {
          const originBase = baseMatch[1].replace(/\/$/, '');
          let healed = f.content.replace(/<base\s+href=["'][^"']*["']\s*\/?>/gi, '');
          const spaShim = `<script id="cloudpro-spa-clone-shim">
(function(){
  var ORIGIN = ${JSON.stringify(originBase)};
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
        if (typeof input === 'string' && (input.indexOf('/api/') === 0 || input.indexOf('/uploads/') === 0)) {
          input = ORIGIN + input;
        }
        return origFetch.call(this, input, init);
      };
    }
  } catch (e) {}
})();
</script>`;
          healed = /<head[^>]*>/i.test(healed)
            ? healed.replace(/<head[^>]*>/i, m => `${m}\n${spaShim}`)
            : `${spaShim}\n${healed}`;
          f.content = healed;
          f.sizeBytes = healed.length;
          changed = true;
        }
      }
    }
    if (changed) {
      this.saveState();
    }
    return files;
  }

  private normalizeVirtualPath(rawPath: string): string {
    let p = (rawPath || '/public_html').trim().replace(/\\/g, '/').replace(/\/+/g, '/');
    p = p.replace(/^\/home\/[^/]+/, '');
    if (!p.startsWith('/')) p = '/' + p;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p || '/public_html';
  }

  public clearDirectoryEntryFiles(accountId: string, dirPath: string): void {
    const cleanDir = this.normalizeVirtualPath(dirPath);
    const entryNames = new Set(['index.html', 'index.htm', 'index.php', 'default.html', 'style.css', 'script.js']);
    this.state.virtualFiles = this.state.virtualFiles.filter(f => {
      if (f.accountId !== accountId || f.type !== 'file') return true;
      const normalized = this.normalizeVirtualPath(f.path || '');
      const parent = normalized.substring(0, normalized.lastIndexOf('/')) || '/public_html';
      // Strictly match only the exact target directory (never affect subdomains when clearing /public_html or vice versa)
      if (parent.toLowerCase() === cleanDir.toLowerCase() && entryNames.has(f.name.toLowerCase())) {
        return false;
      }
      return true;
    });
    this.saveState();
  }

  public saveVirtualFile(file: VirtualFile): void {
    const cleanFilePath = this.normalizeVirtualPath(file.path || '');
    const normalizedFile: VirtualFile = { ...file, path: cleanFilePath };
    const normPath = cleanFilePath.toLowerCase();

    // Remove any duplicate files at the exact same accountId + path (with different id)
    this.state.virtualFiles = this.state.virtualFiles.filter(
      f =>
        f.id === normalizedFile.id ||
        !(f.accountId === normalizedFile.accountId && this.normalizeVirtualPath(f.path || '').toLowerCase() === normPath)
    );

    // If saving index.html or index.php in /public_html, only remove the default initial placeholder (vf-personal-html)
    // Never delete index.html when index.php is saved alongside it (hybrid PHP+SPA apps use both index.php and index.html!)
    const lowerName = normalizedFile.name.toLowerCase();
    if (lowerName === 'index.html' || lowerName === 'index.htm' || lowerName === 'index.php') {
      const parentDir = normPath.substring(0, normPath.lastIndexOf('/')) || '/public_html';
      this.state.virtualFiles = this.state.virtualFiles.filter(f => {
        if (f.accountId !== normalizedFile.accountId || f.id === normalizedFile.id || f.type !== 'file') return true;
        const fNorm = this.normalizeVirtualPath(f.path || '').toLowerCase();
        if (fNorm === normPath.toLowerCase()) return false;
        if (parentDir.toLowerCase() === '/public_html' && f.id === 'vf-personal-html') return false;
        return true;
      });
    }

    const idx = this.state.virtualFiles.findIndex(f => f.id === normalizedFile.id);
    if (idx >= 0) {
      this.state.virtualFiles[idx] = normalizedFile;
    } else {
      this.state.virtualFiles.push(normalizedFile);
    }
    this.saveState();
  }

  public saveVirtualFilesBatch(files: VirtualFile[]): void {
    if (!Array.isArray(files) || files.length === 0) return;
    // Cap batch to 150 items so all root files and active assets are preserved
    const capped = files.slice(0, 150).map(f => ({
      ...f,
      path: this.normalizeVirtualPath(f.path || ''),
    }));

    const incomingPathMap = new Map<string, VirtualFile>();
    let replacesPrimaryRootIndex = false;

    for (const nf of capped) {
      const key = `${nf.accountId}:${nf.path.toLowerCase()}`;
      incomingPathMap.set(key, nf);
      const lowerPath = nf.path.toLowerCase();
      if (lowerPath === '/public_html/index.html' || lowerPath === '/public_html/index.php') {
        replacesPrimaryRootIndex = true;
      }
    }

    this.state.virtualFiles = this.state.virtualFiles.filter(ef => {
      const efNorm = this.normalizeVirtualPath(ef.path || '').toLowerCase();
      const key = `${ef.accountId}:${efNorm}`;
      if (incomingPathMap.has(key)) return false;
      if (replacesPrimaryRootIndex && ef.id === 'vf-personal-html') return false;
      return true;
    });

    this.state.virtualFiles.push(...Array.from(incomingPathMap.values()));
    this.saveState();
  }

  public replaceDirectoryFilesFromDiskScan(accountId: string, dirPath: string, files: VirtualFile[]): void {
    const cleanDir = this.normalizeVirtualPath(dirPath).toLowerCase();
    const capped = (files || []).slice(0, 350).map(f => ({
      ...f,
      path: this.normalizeVirtualPath(f.path || ''),
    }));
    const incomingPathMap = new Map<string, VirtualFile>();
    for (const nf of capped) {
      incomingPathMap.set(`${nf.accountId}:${nf.path.toLowerCase()}`, nf);
    }

    // Remove any existing virtual files whose direct parent is cleanDir (eliminates ghost files from previous installs!)
    this.state.virtualFiles = this.state.virtualFiles.filter(ef => {
      if (ef.accountId !== accountId) return true;
      const efNorm = this.normalizeVirtualPath(ef.path || '').toLowerCase();
      const parent = efNorm.substring(0, efNorm.lastIndexOf('/')) || '/public_html';
      if (parent === cleanDir) return false;
      if (incomingPathMap.has(`${ef.accountId}:${efNorm}`)) return false;
      return true;
    });

    this.state.virtualFiles.push(...Array.from(incomingPathMap.values()));
    this.saveState();
  }

  public deleteVirtualFile(fileId: string): void {
    const target = this.state.virtualFiles.find(f => f.id === fileId);
    if (!target) {
      this.state.virtualFiles = this.state.virtualFiles.filter(f => f.id !== fileId);
      this.saveState();
      return;
    }

    const cleanPath = target.path.replace(/\\/g, '/');
    const cleanPathLower = cleanPath.toLowerCase();
    const isDir = target.type === 'directory';

    // Remove file and, if directory, all nested children recursively
    this.state.virtualFiles = this.state.virtualFiles.filter(f => {
      const fNorm = f.path.replace(/\\/g, '/').toLowerCase();
      if (isDir) {
        return !(fNorm === cleanPathLower || fNorm.startsWith(cleanPathLower + '/'));
      }
      return f.id !== fileId && fNorm !== cleanPathLower;
    });

    this.saveState();

    // Call server deletion endpoint so physical disk & vhostStore are cleaned up permanently!
    if (typeof window !== 'undefined') {
      fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: target.accountId,
          path: cleanPath,
          id: target.id,
          isDir,
        }),
      }).catch(() => {});
    }
  }

  public deleteVirtualFilesBatch(fileIds: string[]): void {
    const idSet = new Set(fileIds);
    const targetItems = this.state.virtualFiles.filter(f => idSet.has(f.id));
    if (targetItems.length === 0) return;

    const dirPaths = targetItems
      .filter(f => f.type === 'directory')
      .map(f => f.path.replace(/\\/g, '/').toLowerCase());
    const filePaths = new Set(targetItems.map(f => f.path.replace(/\\/g, '/').toLowerCase()));

    this.state.virtualFiles = this.state.virtualFiles.filter(f => {
      if (idSet.has(f.id)) return false;
      const fNorm = f.path.replace(/\\/g, '/').toLowerCase();
      if (filePaths.has(fNorm)) return false;
      for (const dir of dirPaths) {
        if (fNorm.startsWith(dir + '/')) return false;
      }
      return true;
    });

    this.saveState();

    if (typeof window !== 'undefined') {
      fetch('/api/files/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: targetItems.map(t => ({
            id: t.id,
            path: t.path,
            isDir: t.type === 'directory',
          })),
        }),
      }).catch(() => {});
    }
  }

  // --- DNS Records ---
  public getDnsRecords(accountId: string): DnsRecord[] {
    return this.state.dnsRecords.filter(d => d.accountId === accountId);
  }

  public saveDnsRecord(record: DnsRecord): void {
    const idx = this.state.dnsRecords.findIndex(d => d.id === record.id);
    if (idx >= 0) {
      this.state.dnsRecords[idx] = record;
    } else {
      this.state.dnsRecords.push(record);
    }
    this.saveState();
  }

  public deleteDnsRecord(id: string): void {
    this.state.dnsRecords = this.state.dnsRecords.filter(d => d.id !== id);
    this.saveState();
  }

  // --- Domains & Subdomains ---
  public getDomains(accountId?: string): DomainEntity[] {
    if (!this.state.domains) this.state.domains = [];

    let stateChanged = false;
    const validAccountIds = new Set(this.state.hostingAccounts.map(a => a.id));

    // 1. Self-heal legacy primary domain entries and re-attach subdomains whose parentDomain matches an active account
    const normalizedDomains: DomainEntity[] = [];
    for (const d of this.state.domains) {
      if (!d || !d.domain) continue;
      let current = { ...d };

      // Fix legacy primary domain record that had 'rdm.denbaguse.my.id'
      if (current.type === 'primary' && current.domain.toLowerCase() === 'rdm.denbaguse.my.id') {
        const ownerAcc = this.state.hostingAccounts.find(a => a.id === current.accountId);
        const fixedPrimary =
          ownerAcc?.primaryDomain && ownerAcc.primaryDomain.toLowerCase() !== 'rdm.denbaguse.my.id'
            ? ownerAcc.primaryDomain
            : 'denbaguse.my.id';
        current = { ...current, domain: fixedPrimary };
        stateChanged = true;
      }

      // If this domain's accountId no longer exists, either adopt it to a matching account by parentDomain or drop it
      if (!validAccountIds.has(current.accountId)) {
        const matchingAcc = this.state.hostingAccounts.find(a => {
          const pDom = a.primaryDomain.toLowerCase();
          return (
            (current.type === 'subdomain' &&
              (current.parentDomain?.toLowerCase() === pDom ||
                current.domain.toLowerCase().endsWith(`.${pDom}`))) ||
            (current.type === 'primary' && current.domain.toLowerCase() === pDom)
          );
        });

        if (matchingAcc) {
          stateChanged = true;
          if (current.type === 'subdomain') {
            const pDom = matchingAcc.primaryDomain.toLowerCase();
            const prefix =
              current.subdomainPrefix ||
              current.domain.toLowerCase().slice(0, -(pDom.length + 1));
            current = {
              ...current,
              accountId: matchingAcc.id,
              parentDomain: matchingAcc.primaryDomain,
              subdomainPrefix: prefix,
              documentRoot: `/home/${matchingAcc.username}/public_html/${prefix}`,
            };
          } else {
            current = {
              ...current,
              accountId: matchingAcc.id,
            };
          }
        } else {
          // Drop orphaned domain record from deleted account so it never blocks creating new subdomains
          stateChanged = true;
          continue;
        }
      }

      // If a subdomain's parentDomain matches an existing account, ensure its accountId belongs to that account
      if (current.type === 'subdomain') {
        const parentOwner = this.state.hostingAccounts.find(a => {
          const pDom = a.primaryDomain.toLowerCase();
          return (
            current.parentDomain?.toLowerCase() === pDom ||
            current.domain.toLowerCase().endsWith(`.${pDom}`)
          );
        });
        if (parentOwner && current.accountId !== parentOwner.id) {
          stateChanged = true;
          const pDom = parentOwner.primaryDomain.toLowerCase();
          const prefix =
            current.subdomainPrefix ||
            current.domain.toLowerCase().slice(0, -(pDom.length + 1));
          current = {
            ...current,
            accountId: parentOwner.id,
            parentDomain: parentOwner.primaryDomain,
            subdomainPrefix: prefix,
            documentRoot: `/home/${parentOwner.username}/public_html/${prefix}`,
          };
        }
      }

      // Deduplicate by domain name + type
      const dupIdx = normalizedDomains.findIndex(
        nd => nd.domain.toLowerCase() === current.domain.toLowerCase()
      );
      if (dupIdx >= 0) {
        stateChanged = true;
        // Prefer subdomain/addon record or most recent record
        normalizedDomains[dupIdx] = current;
      } else {
        normalizedDomains.push(current);
      }
    }

    this.state.domains = normalizedDomains;

    if (accountId) {
      const acc = this.state.hostingAccounts.find(a => a.id === accountId);
      const existing = this.state.domains.filter(d => d.accountId === accountId);
      if (acc && !existing.some(d => d.type === 'primary')) {
        const autoPrimary: DomainEntity = {
          id: `dom-primary-${acc.id}`,
          accountId: acc.id,
          domain: acc.primaryDomain,
          type: 'primary',
          documentRoot: acc.documentRoot || `/home/${acc.username}/public_html`,
          phpVersion: acc.phpVersion || '8.2',
          sslStatus: acc.sslStatus === 'active' ? 'active' : 'pending',
          createdAt: acc.createdAt || new Date().toISOString(),
        };
        this.state.domains.push(autoPrimary);
        this.saveState();
        return [autoPrimary, ...existing];
      }
      if (stateChanged) this.saveState();
      return existing;
    }

    if (stateChanged) this.saveState();
    return this.state.domains;
  }

  public saveDomain(domain: DomainEntity): void {
    if (!this.state.domains) this.state.domains = [];
    const stamped = { ...domain, _updatedAt: Date.now() } as DomainEntity;
    const idx = this.state.domains.findIndex(
      d => d.id === stamped.id || d.domain.toLowerCase() === stamped.domain.toLowerCase()
    );
    if (idx >= 0) {
      this.state.domains[idx] = stamped;
    } else {
      this.state.domains.push(stamped);
    }
    this.saveState();
  }

  public deleteDomain(id: string): void {
    if (!this.state.domains) return;
    this.markDeleted(id);
    this.state.domains = this.state.domains.filter(d => d.id !== id);
    this.saveState();
  }

  // --- Databases ---
  public getDatabases(accountId: string): DatabaseEntity[] {
    return this.state.databases.filter(d => d.accountId === accountId);
  }

  public saveDatabase(db: DatabaseEntity): void {
    const idx = this.state.databases.findIndex(d => d.id === db.id);
    if (idx >= 0) {
      this.state.databases[idx] = db;
    } else {
      this.state.databases.push(db);
    }
    this.saveState();
  }

  public deleteDatabase(id: string): void {
    const dbObj = this.state.databases.find(d => d.id === id);
    if (dbObj && this.state.databaseTables && this.state.databaseTables[dbObj.dbName]) {
      delete this.state.databaseTables[dbObj.dbName];
    }
    this.state.databases = this.state.databases.filter(d => d.id !== id);
    this.saveState();
  }

  // --- Database Tables (phpMyAdmin Per-Database Storage) ---
  public getDatabaseTables(dbName: string): DatabaseTableEntity[] {
    if (!this.state.databaseTables) {
      this.state.databaseTables = {};
    }
    return this.state.databaseTables[dbName] || [];
  }

  public saveDatabaseTable(dbName: string, table: DatabaseTableEntity): void {
    if (!this.state.databaseTables) {
      this.state.databaseTables = {};
    }
    if (!this.state.databaseTables[dbName]) {
      this.state.databaseTables[dbName] = [];
    }
    const idx = this.state.databaseTables[dbName].findIndex(t => t.name.toLowerCase() === table.name.toLowerCase());
    if (idx >= 0) {
      this.state.databaseTables[dbName][idx] = table;
    } else {
      this.state.databaseTables[dbName].push(table);
    }

    // Recalculate database size
    const totalKb = this.state.databaseTables[dbName].reduce((acc, t) => acc + (t.sizeKb || 16), 0);
    const dbObj = this.state.databases.find(d => d.dbName === dbName);
    if (dbObj) {
      dbObj.sizeMb = Math.max(0.1, Number((totalKb / 1024).toFixed(2)));
    }

    this.saveState();
  }

  public deleteDatabaseTable(dbName: string, tableName: string): void {
    if (!this.state.databaseTables || !this.state.databaseTables[dbName]) return;
    this.state.databaseTables[dbName] = this.state.databaseTables[dbName].filter(
      t => t.name.toLowerCase() !== tableName.toLowerCase()
    );

    const totalKb = this.state.databaseTables[dbName].reduce((acc, t) => acc + (t.sizeKb || 16), 0);
    const dbObj = this.state.databases.find(d => d.dbName === dbName);
    if (dbObj) {
      dbObj.sizeMb = Math.max(0.1, Number((totalKb / 1024).toFixed(2)));
    }

    this.saveState();
  }

  public clearDatabaseTables(dbName: string): void {
    if (!this.state.databaseTables) {
      this.state.databaseTables = {};
    }
    this.state.databaseTables[dbName] = [];
    const dbObj = this.state.databases.find(d => d.dbName === dbName);
    if (dbObj) {
      dbObj.sizeMb = 0.1;
    }
    this.saveState();
  }

  // --- Email Mailboxes ---
  public getEmails(accountId: string): EmailMailbox[] {
    return this.state.emailMailboxes.filter(m => m.accountId === accountId);
  }

  public saveEmail(mailbox: EmailMailbox): void {
    const idx = this.state.emailMailboxes.findIndex(m => m.id === mailbox.id);
    if (idx >= 0) {
      this.state.emailMailboxes[idx] = mailbox;
    } else {
      this.state.emailMailboxes.push(mailbox);
    }
    this.saveState();
  }

  public deleteEmail(id: string): void {
    this.state.emailMailboxes = this.state.emailMailboxes.filter(m => m.id !== id);
    this.saveState();
  }

  // --- Cron Jobs ---
  public getCronJobs(accountId: string): CronJobItem[] {
    return this.state.cronJobs.filter(c => c.accountId === accountId);
  }

  public saveCronJob(job: CronJobItem): void {
    const idx = this.state.cronJobs.findIndex(c => c.id === job.id);
    if (idx >= 0) {
      this.state.cronJobs[idx] = job;
    } else {
      this.state.cronJobs.push(job);
    }
    this.saveState();
  }

  public deleteCronJob(id: string): void {
    this.state.cronJobs = this.state.cronJobs.filter(c => c.id !== id);
    this.saveState();
  }

  // --- Backups ---
  public getBackups(accountId?: string): AccountBackup[] {
    if (!Array.isArray(this.state.backups)) {
      this.state.backups = [...INITIAL_STATE.backups];
    }
    const list = this.state.backups.map(b => ({
      ...b,
      sizeMb: Number(b?.sizeMb) || 50.0,
      createdAt: b?.createdAt || new Date().toISOString(),
    }));
    if (accountId) {
      return list.filter(b => b.accountId === accountId);
    }
    return list;
  }

  public saveBackup(backup: AccountBackup): void {
    if (!Array.isArray(this.state.backups)) {
      this.state.backups = [];
    }
    const idx = this.state.backups.findIndex(b => b.id === backup.id);
    if (idx >= 0) {
      this.state.backups[idx] = backup;
    } else {
      this.state.backups.unshift(backup);
    }
    this.saveState();
  }

  public deleteBackup(id: string): void {
    if (!Array.isArray(this.state.backups)) return;
    this.state.backups = this.state.backups.filter(b => b.id !== id);
    this.saveState();
  }

  // --- Invoices ---
  public getInvoices(userId?: string): Invoice[] {
    if (!Array.isArray(this.state.invoices)) {
      this.state.invoices = [...INITIAL_STATE.invoices];
    }
    const normalized = this.state.invoices.map(inv => ({
      ...inv,
      amount: Number(inv?.amount) || 350000,
      currency: inv?.currency || 'IDR',
      status: inv?.status || 'unpaid',
      dueDate: inv?.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: inv?.createdAt || new Date().toISOString(),
      items:
        Array.isArray(inv?.items) && inv.items.length > 0
          ? inv.items
          : [
              {
                description: String((inv as any)?.description || 'Tagihan Otomatis Perpanjangan Cloud Hosting & Domain'),
                qty: 1,
                unitPrice: Number(inv?.amount) || 350000,
                amount: Number(inv?.amount) || 350000,
              },
            ],
    }));
    if (userId) {
      return normalized.filter(i => i.userId === userId || i.resellerId === userId);
    }
    return normalized;
  }

  public saveInvoice(invoice: Invoice): void {
    if (!Array.isArray(this.state.invoices)) {
      this.state.invoices = [];
    }
    const normalized: Invoice = {
      ...invoice,
      items:
        Array.isArray(invoice.items) && invoice.items.length > 0
          ? invoice.items
          : [
              {
                description: String(invoice.description || 'Tagihan Otomatis Layanan Cloud Hosting'),
                qty: 1,
                unitPrice: Number(invoice.amount) || 350000,
                amount: Number(invoice.amount) || 350000,
              },
            ],
    };
    const idx = this.state.invoices.findIndex(i => i.id === normalized.id);
    const stamped = { ...normalized, _updatedAt: Date.now() } as Invoice;
    if (idx >= 0) {
      this.state.invoices[idx] = stamped;
    } else {
      this.state.invoices.unshift(stamped);
    }
    this.saveState();
  }

  public createManualInvoice(invoice: Invoice, _actor?: any): Invoice {
    this.saveInvoice(invoice);
    return invoice;
  }

  public deleteInvoice(id: string): void {
    if (!Array.isArray(this.state.invoices)) return;
    this.markDeleted(id);
    this.state.invoices = this.state.invoices.filter(i => i.id !== id);
    this.saveState();
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return this.state.auditLogs;
  }

  public logAction(
    user: { id: string; name: string; role: any },
    action: string,
    category: AuditLog['category'],
    details: string,
    ipAddress = '182.253.110.42'
  ): void {
    const entry: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: user.id,
      userName: user.name,
      role: user.role,
      action,
      category,
      ipAddress,
      details,
      timestamp: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(entry);
    if (this.state.auditLogs.length > 200) {
      this.state.auditLogs.pop();
    }
    this.saveState();
  }

  public addAuditLog(action: string, category: string, details: string): void {
    const user = this.state.users[0] || { id: 'usr-admin-01', name: 'Root Administrator', role: 'admin' };
    this.logAction(user, action, category as any, details);
  }

  // --- Firewall Rules ---
  public getFirewallRules(): FirewallRule[] {
    return this.state.firewallRules;
  }

  public saveFirewallRule(rule: FirewallRule): void {
    const idx = this.state.firewallRules.findIndex(r => r.id === rule.id);
    if (idx >= 0) {
      this.state.firewallRules[idx] = rule;
    } else {
      this.state.firewallRules.push(rule);
    }
    this.saveState();
  }

  public deleteFirewallRule(id: string): void {
    this.state.firewallRules = this.state.firewallRules.filter(r => r.id !== id);
    this.saveState();
  }

  // --- API Keys ---
  public getApiKeys(userId?: string): ApiKeyItem[] {
    if (userId) {
      return this.state.apiKeys.filter(k => k.userId === userId);
    }
    return this.state.apiKeys;
  }

  public saveApiKey(key: ApiKeyItem): void {
    this.state.apiKeys.unshift(key);
    this.saveState();
  }

  public deleteApiKey(id: string): void {
    this.state.apiKeys = this.state.apiKeys.filter(k => k.id !== id);
    this.saveState();
  }

  // --- Notifications ---
  public getNotifications(): AppNotification[] {
    return this.state.notifications;
  }

  public addNotification(title: string, message: string, type: AppNotification['type'] = 'info'): void {
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    this.state.notifications.unshift(notif);
    this.saveState();
  }

  public markNotificationAsRead(id: string): void {
    const n = this.state.notifications.find(x => x.id === id);
    if (n) {
      n.isRead = true;
      this.saveState();
    }
  }

  public markAllNotificationsRead(): void {
    this.state.notifications.forEach(n => { n.isRead = true; });
    this.saveState();
  }

  // --- VPS Management Methods ---
  public getVpsInstances(customerId?: string, resellerId?: string): VpsInstance[] {
    return this.state.vpsInstances.filter(v => {
      if (customerId && v.customerId !== customerId) return false;
      if (resellerId && v.resellerId !== resellerId) return false;
      return true;
    });
  }

  public getVpsById(id: string): VpsInstance | undefined {
    return this.state.vpsInstances.find(v => v.id === id);
  }

  public saveVpsInstance(vps: VpsInstance): void {
    const idx = this.state.vpsInstances.findIndex(v => v.id === vps.id);
    if (idx >= 0) {
      this.state.vpsInstances[idx] = vps;
    } else {
      this.state.vpsInstances.unshift(vps);
    }
    this.saveState();
  }

  public updateVpsStatus(id: string, status: VpsInstance['status']): void {
    const v = this.state.vpsInstances.find(x => x.id === id);
    if (v) {
      v.status = status;
      if (status === 'running') {
        v.liveCpuPct = +(Math.random() * 25 + 10).toFixed(1);
        v.liveRamMb = Math.round(v.ramMb * (0.3 + Math.random() * 0.3));
        v.uptime = 'Just started';
      } else if (status === 'stopped') {
        v.liveCpuPct = 0;
        v.liveRamMb = 0;
        v.uptime = 'Offline';
      }
      this.saveState();
    }
  }

  public deleteVpsInstance(id: string): void {
    this.state.vpsInstances = this.state.vpsInstances.filter(v => v.id !== id);
    this.state.vpsSnapshots = this.state.vpsSnapshots.filter(s => s.vpsId !== id);
    this.state.vpsFirewallRules = this.state.vpsFirewallRules.filter(f => f.vpsId !== id);
    this.saveState();
  }

  public getVpsSnapshots(vpsId?: string): VpsSnapshot[] {
    if (vpsId) {
      return this.state.vpsSnapshots.filter(s => s.vpsId === vpsId);
    }
    return this.state.vpsSnapshots;
  }

  public saveVpsSnapshot(snapshot: VpsSnapshot): void {
    this.state.vpsSnapshots.unshift(snapshot);
    this.saveState();
  }

  public deleteVpsSnapshot(id: string): void {
    this.state.vpsSnapshots = this.state.vpsSnapshots.filter(s => s.id !== id);
    this.saveState();
  }

  public getVpsFirewallRules(vpsId?: string): VpsFirewallRule[] {
    if (vpsId) {
      return this.state.vpsFirewallRules.filter(r => r.vpsId === vpsId);
    }
    return this.state.vpsFirewallRules;
  }

  public saveVpsFirewallRule(rule: VpsFirewallRule): void {
    this.state.vpsFirewallRules.unshift(rule);
    this.saveState();
  }

  public deleteVpsFirewallRule(id: string): void {
    this.state.vpsFirewallRules = this.state.vpsFirewallRules.filter(r => r.id !== id);
    this.saveState();
  }

  // --- IP Address Management ---
  public getIpAddresses(): IpAddressRecord[] {
    if (!this.state.ipAddresses || this.state.ipAddresses.length === 0) {
      this.state.ipAddresses = [...INITIAL_STATE.ipAddresses];
      this.saveState();
    }
    return this.state.ipAddresses;
  }

  public clearAllSampleIps(): void {
    this.state.ipAddresses = [];
    this.saveState();
  }

  public addIpAddress(ip: Omit<IpAddressRecord, "id" | "createdAt">): IpAddressRecord {
    const newRecord: IpAddressRecord = {
      ...ip,
      id: "ip-" + Date.now(),
      createdAt: new Date().toISOString(),
    };
    if (!this.state.ipAddresses) {
      this.state.ipAddresses = [];
    }
    this.state.ipAddresses.push(newRecord);
    this.saveState();
    return newRecord;
  }

  public updateIpAddress(updated: IpAddressRecord): void {
    const idx = (this.state.ipAddresses || []).findIndex(i => i.id === updated.id);
    if (idx >= 0) {
      this.state.ipAddresses[idx] = updated;
      this.saveState();
    }
  }

  public deleteIpAddress(id: string): void {
    this.state.ipAddresses = (this.state.ipAddresses || []).filter(i => i.id !== id);
    this.saveState();
  }

  public applyGlobalPublicIp(newPublicIp: string): { updatedServers: number; updatedAccounts: number; updatedDns: number } {
    const cleanIp = newPublicIp.trim();
    let updatedServers = 0;
    let updatedAccounts = 0;
    let updatedDns = 0;

    if (this.state.serverNodes.length > 0) {
      this.state.serverNodes[0].ipAddress = cleanIp;
      updatedServers = 1;
    }

    (this.state.nameserverConfigs || []).forEach(ns => {
      if (ns.isDefaultGlobal) {
        ns.ns1Ip = cleanIp;
        ns.ns2Ip = cleanIp;
      }
    });

    (this.state.hostingAccounts || []).forEach(acc => {
      acc.ipAddress = cleanIp;
      updatedAccounts++;
    });

    (this.state.dnsRecords || []).forEach(dns => {
      if (dns.type === 'A') {
        dns.content = cleanIp;
        updatedDns++;
      } else if (dns.type === 'TXT' && dns.content.includes('ip4:')) {
        dns.content = dns.content.replace(/ip4:[0-9.]+/, `ip4:${cleanIp}`);
        updatedDns++;
      }
    });

    this.saveState();
    return { updatedServers, updatedAccounts, updatedDns };
  }

  public assignDedicatedIpToAccount(ipId: string, accountId: string): boolean {
    const ip = (this.state.ipAddresses || []).find(i => i.id === ipId);
    const account = this.state.hostingAccounts.find(a => a.id === accountId);
    if (!ip || !account) return false;

    ip.type = "dedicated";
    ip.status = "assigned";
    ip.assignedToType = "account";
    ip.assignedToId = account.id;
    ip.assignedToName = account.username + " (" + account.primaryDomain + ")";
    ip.assignedDomain = account.primaryDomain;
    ip.ptrRecord = "mail." + account.primaryDomain;

    account.ipAddress = ip.ip;

    this.state.dnsRecords.forEach(dns => {
      if (dns.accountId === account.id) {
        if (dns.type === "A") {
          dns.content = ip.ip;
        } else if (dns.type === "TXT" && dns.content.includes("ip4:")) {
          dns.content = dns.content.replace(/ip4:[0-9.]+/, "ip4:" + ip.ip);
        }
      }
    });

    this.saveState();
    return true;
  }

  public releaseIpAddress(ipId: string): void {
    const ip = (this.state.ipAddresses || []).find(i => i.id === ipId);
    if (!ip) return;

    if (ip.assignedToId && ip.assignedToType === "account") {
      const server = this.state.serverNodes.find(s => s.id === ip.serverId) || this.state.serverNodes[0];
      const account = this.state.hostingAccounts.find(a => a.id === ip.assignedToId);
      if (account && server) {
        account.ipAddress = server.ipAddress;
        this.state.dnsRecords.forEach(dns => {
          if (dns.accountId === account.id) {
            if (dns.type === "A") {
              dns.content = server.ipAddress;
            } else if (dns.type === "TXT" && dns.content.includes("ip4:")) {
              dns.content = dns.content.replace(/ip4:[0-9.]+/, "ip4:" + server.ipAddress);
            }
          }
        });
      }
    }

    ip.status = "available";
    ip.assignedToType = undefined;
    ip.assignedToId = undefined;
    ip.assignedToName = undefined;
    ip.assignedDomain = undefined;

    this.saveState();
  }

  // --- Private Nameservers & DNS Cluster ---
  public getNameserverConfigs(): PrivateNameserverConfig[] {
    if (!this.state.nameserverConfigs || this.state.nameserverConfigs.length === 0) {
      this.state.nameserverConfigs = [...(INITIAL_STATE.nameserverConfigs || [])];
      this.saveState();
    }
    return this.state.nameserverConfigs;
  }

  public getDefaultNameserverConfig(): PrivateNameserverConfig {
    const list = this.getNameserverConfigs();
    return list.find(n => n.isDefaultGlobal) || list[0] || INITIAL_STATE.nameserverConfigs[0];
  }

  public saveNameserverConfig(config: PrivateNameserverConfig): void {
    if (!this.state.nameserverConfigs) this.state.nameserverConfigs = [];
    const idx = this.state.nameserverConfigs.findIndex(n => n.id === config.id);
    if (config.isDefaultGlobal) {
      this.state.nameserverConfigs.forEach(n => { n.isDefaultGlobal = false; });
    }
    if (idx >= 0) {
      this.state.nameserverConfigs[idx] = config;
    } else {
      this.state.nameserverConfigs.unshift(config);
    }
    this.saveState();
  }

  public deleteNameserverConfig(id: string): void {
    if (!this.state.nameserverConfigs) return;
    this.state.nameserverConfigs = this.state.nameserverConfigs.filter(n => n.id !== id);
    if (this.state.nameserverConfigs.length > 0 && !this.state.nameserverConfigs.some(n => n.isDefaultGlobal)) {
      this.state.nameserverConfigs[0].isDefaultGlobal = true;
    }
    this.saveState();
  }

  public syncAllAccountsToNameserver(nsConfig: PrivateNameserverConfig): number {
    let count = 0;
    const accounts = this.state.hostingAccounts || [];
    accounts.forEach(acc => {
      // Find or update NS records for this account
      const existingNs = this.state.dnsRecords.filter(d => d.accountId === acc.id && d.type === 'NS');
      if (existingNs.length >= 2) {
        existingNs[0].content = nsConfig.ns1Host;
        existingNs[1].content = nsConfig.ns2Host;
        count++;
      } else {
        // Remove partial
        this.state.dnsRecords = this.state.dnsRecords.filter(d => !(d.accountId === acc.id && d.type === 'NS'));
        this.state.dnsRecords.push({
          id: `dns-ns1-${acc.id}-${Date.now()}`,
          accountId: acc.id,
          domain: acc.primaryDomain,
          type: 'NS',
          name: '@',
          content: nsConfig.ns1Host,
          ttl: nsConfig.defaultTtl || 86400,
        });
        this.state.dnsRecords.push({
          id: `dns-ns2-${acc.id}-${Date.now()}`,
          accountId: acc.id,
          domain: acc.primaryDomain,
          type: 'NS',
          name: '@',
          content: nsConfig.ns2Host,
          ttl: nsConfig.defaultTtl || 86400,
        });
        count++;
      }
    });
    this.saveState();
    return count;
  }

  // Cloudflare R2 & Media Optimizer Methods
  public getR2Configs(): CloudflareR2Config[] {
    return this.state.r2Configs || [];
  }

  public getR2ConfigForAccount(accountId: string): CloudflareR2Config {
    if (!this.state.r2Configs) this.state.r2Configs = [];
    const acc = this.state.hostingAccounts.find(a => a.id === accountId);
    const cleanDomain = (acc?.primaryDomain || 'website.my.id').toLowerCase().trim();
    const cleanSlug = (acc?.username || cleanDomain.replace(/[^a-z0-9]/g, '-')).toLowerCase();

    const specific = this.state.r2Configs.find(r => r.accountId === accountId);
    if (specific) {
      // If a non-root account accidentally had denbaguse.my.id as its CDN domain, auto-bind to its own domain
      if (accountId !== 'acc-rdm-01' && acc && specific.publicCdnDomain.includes('denbaguse.my.id')) {
        specific.publicCdnDomain = `https://media.${cleanDomain}`;
        specific.bucketName = `r2-${cleanSlug}-media`;
        this.saveState();
      }
      return specific;
    }

    if (acc) {
      const autoBoundConfig: CloudflareR2Config = {
        id: `r2-cfg-${acc.id}`,
        accountId: acc.id,
        bucketName: acc.id === 'acc-rdm-01' ? 'media-madrasah-denbaguse' : `r2-${cleanSlug}-media`,
        accountIdCloudflare: 'cf_acc_9837190f84a1e948',
        accessKeyId: `r2_key_${cleanSlug}_auto`,
        secretAccessKeyMasked: '********************************',
        publicCdnDomain: `https://media.${cleanDomain}`,
        autoWebpCompression: true,
        compressionQuality: 82,
        maxDimensionPx: 1920,
        stripExifGps: true,
        status: 'connected',
        lastSyncedAt: new Date().toISOString(),
      };
      this.state.r2Configs.push(autoBoundConfig);
      this.saveState();
      return autoBoundConfig;
    }

    return INITIAL_STATE.r2Configs[0];
  }

  public saveR2Config(config: CloudflareR2Config): void {
    if (!this.state.r2Configs) this.state.r2Configs = [];
    const idx = this.state.r2Configs.findIndex(
      r => r.id === config.id || r.accountId === config.accountId
    );
    if (idx >= 0) {
      this.state.r2Configs[idx] = config;
    } else {
      this.state.r2Configs.unshift(config);
    }
    this.saveState();
  }

  public getOptimizedMedia(accountId?: string): OptimizedMediaFile[] {
    const list = this.state.optimizedMedia || [];
    if (!accountId) return list;
    if (accountId === 'acc-rdm-01') {
      return list.filter(m => m.accountId === accountId || m.accountId === 'global');
    }
    return list.filter(m => m.accountId === accountId);
  }

  public addOptimizedMedia(item: OptimizedMediaFile): void {
    if (!this.state.optimizedMedia) this.state.optimizedMedia = [];
    this.state.optimizedMedia.unshift(item);
    this.saveState();
  }

  public deleteOptimizedMedia(id: string): void {
    if (!this.state.optimizedMedia) return;
    this.state.optimizedMedia = this.state.optimizedMedia.filter(m => m.id !== id);
    this.saveState();
  }

  // Cloud PRO Official Letterhead, Owner & Bank Account Config Methods
  public getLetterheadConfig(): CloudProLetterheadConfig {
    try {
      const raw = localStorage.getItem(LETTERHEAD_STORAGE_KEY);
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (parsed.headerTitle === 'CLOUD PRO ENTERPRISE SERVER' || parsed.headerTitle === 'PLATFORM CLOUD PRO') {
          parsed.headerTitle = 'CLOUD PRO ENTERPRISE';
        }
        if (
          parsed.ownerTitle === 'Pemilik & Root Administrator Server Cloud PRO' ||
          parsed.ownerTitle === 'Pemilik & Root Administrator Platform Cloud PRO'
        ) {
          parsed.ownerTitle = 'Pemilik & Root Administrator Cloud PRO Enterprise';
        }
        if (
          parsed.bank1Holder === 'Jaenal Maskun (Server Cloud PRO)' ||
          parsed.bank1Holder === 'Jaenal Maskun (Platform Cloud PRO)'
        ) {
          parsed.bank1Holder = 'Jaenal Maskun (Cloud PRO Enterprise)';
        }
        if (typeof parsed.footerNote === 'string') {
          parsed.footerNote = parsed.footerNote
            .replace(/Server Cloud PRO/g, 'Cloud PRO Enterprise')
            .replace(/Platform Cloud PRO/g, 'Cloud PRO Enterprise');
        }
        return { ...DEFAULT_LETTERHEAD_CONFIG, ...(this.state.letterheadConfig || {}), ...parsed };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_LETTERHEAD_CONFIG, ...(this.state.letterheadConfig || {}) };
  }

  public saveLetterheadConfig(cfg: CloudProLetterheadConfig): void {
    this.state.letterheadConfig = cfg;
    try {
      localStorage.setItem(LETTERHEAD_STORAGE_KEY, JSON.stringify(cfg));
    } catch {
      // ignore
    }
    this.saveState();
  }
}

export const db = new StorageService();
export const storage = db;
