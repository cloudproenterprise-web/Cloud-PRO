export type UserRole = 'admin' | 'reseller' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  resellerId?: string; // If customer belongs to a reseller
  creditBalance: number;
  companyName?: string;
  phone?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  status: 'active' | 'suspended';
  avatarUrl?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface ResellerProfile {
  id: string;
  userId: string;
  brandName: string;
  themeColor?: string;
  customThemeColor?: string;
  panelDomain?: string;
  primaryDomain?: string;
  supportEmail: string;
  nameserver1?: string;
  nameserver2?: string;
  customNs1?: string;
  customNs2?: string;
  nameservers?: string[];
  assignedIp?: string;
  companyName?: string;
  allocatedDiskMb: number;
  allocatedBandwidthMb: number;
  maxAccounts: number;
  allocatedDatabases?: number;
  allocatedEmails?: number;
  allocatedDomains?: number;
  customLogoUrl?: string;
  hideUpstreamBranding?: boolean;
  customInvoiceHeader?: string;
}

export interface ServerService {
  name: string;
  displayName: string;
  status: 'running' | 'stopped' | 'failed' | string;
  port: number;
  version: string;
  memoryMb: number;
  uptime: string;
}

export interface ServerNode {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string;
  tailscaleIp?: string;
  location: string;
  countryCode?: string;
  osType?: string;
  osVersion?: string;
  role?: 'web' | 'db' | 'dns' | 'mail' | 'all-in-one';
  status: 'online' | 'degraded' | 'offline';
  totalCpuCores: number;
  cpuUsagePct: number;
  cpuPercent?: number;
  totalRamMb: number;
  ramUsageMb: number;
  ramUsagePercent?: number;
  totalDiskGb: number;
  diskUsageGb: number;
  diskUsagePercent?: number;
  bandwidthUsageGb: number;
  loadAverage: [number, number, number];
  uptimeDays: number;
  uptimeSeconds?: number;
  isPrimary?: boolean;
  assignedAccountsCount: number;
  services: ServerService[];
}

export interface HostingPlan {
  id: string;
  resellerId?: string; // null if global admin plan
  name: string;
  slug?: string;
  description?: string;
  diskMb?: number;
  diskLimitMb?: number;
  bandwidthMb?: number;
  bandwidthLimitMb?: number;
  cpuLimitPct?: number;
  ramLimitMb?: number;
  maxDomains?: number;
  maxSubdomains?: number;
  maxDatabases: number;
  maxEmails?: number;
  maxEmailAccounts?: number;
  maxFtp?: number;
  maxFtpAccounts?: number;
  hasSsl?: boolean;
  hasBackup?: boolean;
  hasCron?: boolean;
  priceMonthly: number;
  priceMonthlyIdr?: number;
  priceYearly?: number;
  priceYearlyIdr?: number;
  currency?: string;
  isCustomAllowed?: boolean;
  isActive?: boolean;
}

export type PhpVersion = '7.2' | '7.3' | '7.4' | '8.0' | '8.1' | '8.2' | '8.3';

export interface PhpDirectives {
  maxInputVars: number;
  maxExecutionTime: number;
  memoryLimit: string;
  uploadMaxFilesize: string;
  postMaxSize: string;
}

export interface HostingAccount {
  id: string;
  domain?: string;
  primaryDomain: string;
  username: string;
  password?: string;
  ownerId?: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerWhatsapp?: string;
  resellerId?: string;
  serverId: string;
  serverName?: string;
  planId: string;
  planName?: string;
  packageName?: string;
  diskUsedMb: number;
  diskLimitMb: number;
  bandwidthUsedMb: number;
  bandwidthLimitMb: number;
  phpVersion: PhpVersion;
  phpExtensions?: string[];
  phpDirectives?: PhpDirectives;
  status: 'active' | 'suspended' | 'pending';
  suspendReason?: string;
  sslStatus: 'active' | 'expired' | 'none' | 'pending';
  sslProvider?: string;
  sslExpiresAt?: string;
  forceHttps?: boolean;
  documentRoot?: string;
  ipAddress: string;
  databaseCount?: number;
  emailCount?: number;
  ftpCount?: number;
  nameservers?: string[];
  createdAt: string;
  expiresAt?: string;
}

export interface VirtualFile {
  id: string;
  accountId: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  sizeBytes: number;
  permissions: string;
  updatedAt: string;
  content?: string;
  mimeType?: string;
  isVaultOffloaded?: boolean;
}

export interface DatabaseEntity {
  id: string;
  accountId: string;
  dbName: string;
  dbUser: string;
  sizeMb: number;
  charset: string;
  type?: 'mysql' | 'postgres';
  createdAt?: string;
}
export type DatabaseRecord = DatabaseEntity;

export interface DatabaseTableColumn {
  name: string;
  type: string;
  length?: string;
  collation?: string;
  isPrimary?: boolean;
  autoIncrement?: boolean;
  nullable?: boolean;
  defaultVal?: string;
}

export interface DatabaseTableEntity {
  name: string;
  dbName: string;
  rows: number;
  sizeKb: number;
  engine: string;
  collation: string;
  columns?: DatabaseTableColumn[];
  sampleRows?: Record<string, any>[];
}

export interface EmailMailbox {
  id: string;
  accountId: string;
  emailAddress: string;
  quotaMb: number;
  usedMb: number;
  forwardTo?: string;
  createdAt: string;
  hasSpamProtection?: boolean;
  autoresponder?: boolean;
}
export interface DomainEntity {
  id: string;
  accountId: string;
  domain: string;
  type: 'primary' | 'subdomain' | 'addon' | 'alias';
  parentDomain?: string;
  subdomainPrefix?: string;
  documentRoot: string;
  phpVersion?: PhpVersion;
  phpExtensions?: string[];
  phpDirectives?: PhpDirectives;
  sslStatus: 'active' | 'pending' | 'none';
  redirectUrl?: string;
  createdAt: string;
}
export type DomainRecord = DomainEntity;

export interface DnsRecord {
  id: string;
  accountId: string;
  domain?: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA';
  name: string;
  content: string;
  ttl: number;
  priority?: number;
}

export interface CronJobItem {
  id: string;
  accountId: string;
  schedule: string;
  command: string;
  description: string;
  isActive: boolean;
  lastRun?: string;
}
export type CronRecord = CronJobItem;

export interface AccountBackup {
  id: string;
  accountId: string;
  accountDomain?: string;
  targetDomain?: string;
  documentRoot?: string;
  fileName: string;
  type: 'full' | 'database' | 'files';
  sizeMb: number;
  formattedSize?: string;
  status?: string;
  createdAt: string;
  downloadUrl?: string;
  notes?: string;
  backupFormat?: 'zip' | 'sql.gz' | 'tar.gz';
}

export interface WebsiteSyncJob {
  id: string;
  accountId: string;
  sourceType: 'url_archive' | 'web_clone' | 'git' | 'ftp';
  source: string;
  targetPath: string;
  status: 'completed' | 'failed' | 'in_progress';
  filesCount: number;
  totalBytes: number;
  syncedAt: string;
  log?: string;
}

export interface InvoiceItem {
  description: string;
  amount: number;
  qty: number;
  unitPrice?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  receiptNumber?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  accountId?: string;
  resellerId?: string;
  description?: string;
  items: InvoiceItem[];
  amount: number;
  currency: string;
  status: 'paid' | 'unpaid' | 'cancelled' | 'overdue';
  billingPeriod?: string;
  paymentInstructions?: string;
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentNotes?: string;
  payerName?: string;
  verifiedBy?: string;
  proofImageUrl?: string;
  billingSource?: 'manual' | 'automated';
  whatsappSentAt?: string;
  emailSentAt?: string;
  signatureHash?: string;
}

export interface CloudProLetterheadConfig {
  headerTitle: string;
  headerSubtitle: string;
  serverDomain: string;
  officeAddress: string;
  officialEmail: string;
  officialWhatsApp: string;
  ownerName: string;
  ownerTitle: string;
  signatureCity: string;
  bank1Name: string;
  bank1Number: string;
  bank1Holder: string;
  bank2Name: string;
  bank2Number: string;
  bank2Holder: string;
  qrisInfo: string;
  footerNote: string;
  enableBarcodeSignature: boolean;
  autoSendWhatsApp: boolean;
  autoSendEmail: boolean;
  autoOpenWhatsAppOnManual: boolean;
  waGatewayUrl?: string;
  waGatewayToken?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  category: 'SERVER' | 'HOSTING' | 'SECURITY' | 'BILLING' | 'AUTH' | 'DNS' | 'DATABASE' | 'SYSTEM' | string;
  ipAddress: string;
  details: string;
  timestamp: string;
}

export interface FirewallRule {
  id: string;
  ipOrSubnet: string;
  type: 'whitelist' | 'blacklist';
  reason: string;
  hits: number;
  createdAt: string;
  isActive: boolean;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  tokenMasked: string;
  userId: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
}

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  isRead: boolean;
  link?: string;
}
export type SystemNotification = AppNotification;

export interface AsyncJob {
  id: string;
  title: string;
  jobType: 'CREATE_ACCOUNT' | 'ISSUE_SSL' | 'BACKUP_ACCOUNT' | 'RESTORE_BACKUP' | 'MIGRATE_SERVER' | 'DNS_RELOAD' | 'RESTART_SERVICE' | 'OPTIMIZE_DATABASE' | string;
  targetId?: string;
  targetName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  logs: string[];
  startedAt: string;
  completedAt?: string;
  error?: string;
}
export type BackgroundJob = AsyncJob;

export interface VpsInstance {
  id: string;
  name: string;
  hostname: string;
  customerId: string;
  customerName: string;
  resellerId?: string;
  region: string;
  regionName: string;
  countryCode: string;
  osDistro: string;
  osIcon: string;
  status: 'running' | 'stopped' | 'restarting' | 'error' | 'provisioning';
  vCpu: number;
  ramMb: number;
  diskGb: number;
  bandwidthLimitGb: number;
  bandwidthUsedGb: number;
  ipV4: string;
  ipV6?: string;
  gateway?: string;
  reverseDns?: string;
  liveCpuPct: number;
  liveRamMb: number;
  uptime?: string;
  monthlyPrice: number;
  currency: string;
  autoBackupEnabled: boolean;
  createdAt: string;
  rootPassword?: string;
  sshKeyName?: string;
}

export interface VpsSnapshot {
  id: string;
  vpsId: string;
  name: string;
  sizeGb: number;
  createdAt: string;
}

export interface VpsFirewallRule {
  id: string;
  vpsId: string;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'ALL';
  portRange: string;
  source: string;
  action: 'ACCEPT' | 'DROP';
  description: string;
}

export interface PrivateNameserverConfig {
  id: string;
  resellerId?: string;
  domain: string;
  ns1Host: string;
  ns1Ip: string;
  ns1Ipv6?: string;
  ns2Host: string;
  ns2Ip: string;
  ns2Ipv6?: string;
  dnssecEnabled: boolean;
  dnssecKeyTag?: number;
  dnssecAlgorithm?: number;
  dnssecDigestType?: number;
  dnssecDigest?: string;
  soaEmail: string;
  defaultTtl: number;
  bindServiceStatus?: 'active' | 'inactive';
  isDefaultGlobal?: boolean;
  updatedAt: string;
}

export interface CloudflareR2Config {
  id: string;
  accountId: string;
  bucketName: string;
  accountIdCloudflare: string;
  accessKeyId: string;
  secretAccessKeyMasked: string;
  publicCdnDomain: string;
  autoWebpCompression: boolean;
  compressionQuality: number;
  maxDimensionPx: number;
  stripExifGps: boolean;
  status: 'connected' | 'disconnected' | 'error';
  lastSyncedAt: string;
}

export interface OptimizedMediaFile {
  id: string;
  accountId: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatioPct: number;
  width: number;
  height: number;
  url: string;
  storageTarget: 'cloudflare_r2' | 'local_nvme';
  category: string;
  uploadedBy: string;
  uploadedAt: string;
  dataBase64?: string;
}

export * from './ip';
