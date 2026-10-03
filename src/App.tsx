import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { ServerList } from './components/servers/ServerList';
import { IpAddressManager } from './components/servers/IpAddressManager';
import { PrivateNameserverManager } from './components/servers/PrivateNameserverManager';
import { HostingAccountList } from './components/hosting/HostingAccountList';
import { FileManager } from './components/hosting/FileManager';
import { WebsiteClonerModule } from './components/hosting/WebsiteClonerModule';
import { DatabaseManager } from './components/hosting/DatabaseManager';
import { EmailManager } from './components/hosting/EmailManager';
import { SslManager } from './components/hosting/SslManager';
import { DnsZoneEditor } from './components/hosting/DnsZoneEditor';
import { PhpConfigManager } from './components/hosting/PhpConfigManager';
import { CronManager } from './components/hosting/CronManager';
import { BackupManager } from './components/hosting/BackupManager';
import { BackupModule } from './components/hosting/BackupModule';
import { RestoreModule } from './components/hosting/RestoreModule';
import { DiskUsageModule } from './components/hosting/DiskUsageModule';
import { DiskCleanerModule } from './components/hosting/DiskCleanerModule';
import { DiskUsageCleanerModule } from './components/hosting/DiskUsageCleanerModule';
import { MediaStorageManager } from './components/hosting/MediaStorageManager';
import { DomainSubdomainManager } from './components/hosting/DomainSubdomainManager';
import { CreateAccountWizard } from './components/hosting/CreateAccountWizard';
import { ResellerList } from './components/resellers/ResellerList';
import { CustomerList } from './components/customers/CustomerList';
import { HostingPlanList } from './components/plans/HostingPlanList';
import { VpsManager } from './components/vps/VpsManager';
import { SecurityCenter } from './components/security/SecurityCenter';
import { TailscaleMeshNode } from './components/security/TailscaleMeshNode';
import { GatewayTunnelManager } from './components/network/GatewayTunnelManager';
import { BillingOverview } from './components/billing/BillingOverview';
import { WhiteLabelSettings } from './components/whitelabel/WhiteLabelSettings';
import { ApiDocsExplorer } from './components/api-explorer/ApiDocsExplorer';
import { ArchitectureView } from './components/architecture/ArchitectureView';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { ResellerDashboard } from './components/dashboard/ResellerDashboard';
import { CustomerDashboard } from './components/dashboard/CustomerDashboard';
import { JobQueueDrawer } from './components/layout/JobQueueDrawer';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { LoginPage } from './components/layout/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ServerProvider, useServer } from './context/ServerContext';
import { ConfirmationModal } from './components/common/ConfirmationModal';
import { Footer } from './components/layout/Footer';
import { FloatingGlassDock } from './components/layout/FloatingGlassDock';
import { WhatsAppFloatingButton } from './components/common/WhatsAppFloatingButton';
import { WebsitePreviewModal } from './components/hosting/WebsitePreviewModal';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Globe, PlusCircle, Zap, ExternalLink, ArrowLeft, ChevronDown } from 'lucide-react';
import { db } from './services/storage';
import { HostingAccount } from './types';

interface ModuleErrorBoundaryProps {
  activeTab: string;
  onResetTab: () => void;
  children: React.ReactNode;
}

interface ModuleErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

class ModuleErrorBoundary extends React.Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: unknown): ModuleErrorBoundaryState {
    return {
      hasError: true,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidUpdate(prevProps: ModuleErrorBoundaryProps) {
    if (prevProps.activeTab !== this.props.activeTab && this.state.hasError) {
      this.setState({ hasError: false, errorMsg: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-amber-300 bg-white p-6 text-slate-800 shadow-xs my-4">
          <h3 className="text-base font-bold text-slate-900">Memulihkan Tampilan Modul...</h3>
          <p className="mt-1 text-xs text-slate-600">
            Terdeteksi sinkronisasi data lama pada modul ini ({this.state.errorMsg}). Klik tombol di bawah untuk memuat ulang modul secara otomatis.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMsg: '' })}
              className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500 cursor-pointer"
            >
              Muat Ulang Modul Sekarang
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMsg: '' });
                this.props.onResetTab();
              }}
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const {
    servers,
    toasts,
    removeToast,
    confirmModal,
    closeConfirm,
    accounts,
    activeAccount,
    setActiveAccount,
    refreshAll,
  } = useServer();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  const [isJobsOpen, setIsJobsOpen] = useState(false);
  const [isNotifsOpen, setIsNotifsOpen] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isWebsitePreviewOpen, setIsWebsitePreviewOpen] = useState(false);
  const [fileManagerPath, setFileManagerPath] = useState<string>('/public_html');
  const [backupPreselectedDomain, setBackupPreselectedDomain] = useState<string | undefined>(undefined);

  const getRootDashboardTab = () => {
    if (currentUser?.role === 'admin') return 'dashboard';
    if (currentUser?.role === 'reseller') return 'reseller-dashboard';
    return 'customer-dashboard';
  };

  const [activeTab, setActiveTabState] = useState<string>(() => getRootDashboardTab());
  const [navHistory, setNavHistory] = useState<string[]>([]);

  const isRootDashboard = [
    'dashboard',
    'admin-dashboard',
    'reseller-dashboard',
    'customer-dashboard',
    'cpanel-dashboard',
  ].includes(activeTab);

  const setActiveTab = (nextRawTab: string) => {
    const nextTab = nextRawTab === 'dashboard' ? getRootDashboardTab() : nextRawTab;
    if (nextTab === activeTab) return;
    setNavHistory(prev => [...prev.slice(-24), activeTab]);
    setActiveTabState(nextTab);
    try {
      window.history.pushState({ cloudProTab: nextTab }, '', window.location.pathname);
    } catch {
      // Ignore history errors in restricted sandbox
    }
  };

  const handleGoBack = () => {
    if (isWebsitePreviewOpen) {
      setIsWebsitePreviewOpen(false);
      return;
    }
    if (isCreateAccountOpen) {
      setIsCreateAccountOpen(false);
      return;
    }
    if (isJobsOpen) {
      setIsJobsOpen(false);
      return;
    }
    if (isNotifsOpen) {
      setIsNotifsOpen(false);
      return;
    }
    if (navHistory.length > 0) {
      const prevTab = navHistory[navHistory.length - 1];
      setNavHistory(prev => prev.slice(0, -1));
      setActiveTabState(prevTab);
      return;
    }
    setActiveTabState(getRootDashboardTab());
  };

  // Support Browser & Android Hardware Back Button via popstate
  useEffect(() => {
    const onPopState = () => {
      handleGoBack();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Sync activeTab on user login or role change
  useEffect(() => {
    if (currentUser) {
      const rootTab =
        currentUser.role === 'admin'
          ? 'dashboard'
          : currentUser.role === 'reseller'
          ? 'reseller-dashboard'
          : 'customer-dashboard';
      setActiveTabState(rootTab);
    }
  }, [currentUser?.id, currentUser?.role]);

  // Keep tab and activeAccount strictly in sync with user/role changes
  useEffect(() => {
    if (!currentUser) return;
    const userAccs = accounts.filter(acc => {
      if (currentUser.role === 'admin') return true;
      if (currentUser.role === 'reseller') {
        return (
          acc.resellerId === currentUser.id &&
          acc.id !== 'acc-rdm-01' &&
          acc.primaryDomain !== 'denbaguse.my.id'
        );
      }
      return (
        (acc.customerId === currentUser.id ||
          acc.username === currentUser.username ||
          acc.customerEmail === currentUser.email) &&
        acc.id !== 'acc-rdm-01'
      );
    });
    if (!activeAccount || !userAccs.some(a => a.id === activeAccount.id)) {
      setActiveAccount(userAccs[0] || null);
    }

    const adminOnlyTabs = ['servers', 'ip-manager', 'resellers', 'tailscale-mesh', 'architecture', 'gateway-tunnel'];
    if (currentUser.role === 'admin' && (activeTab === 'reseller-dashboard' || activeTab === 'customer-dashboard')) {
      setActiveTabState('dashboard');
    } else if (currentUser.role === 'reseller') {
      if (activeTab === 'dashboard' || activeTab === 'admin-dashboard' || activeTab === 'customer-dashboard' || adminOnlyTabs.includes(activeTab)) {
        setActiveTabState('reseller-dashboard');
      }
    } else if (currentUser.role === 'customer') {
      if (activeTab === 'dashboard' || activeTab === 'admin-dashboard' || activeTab === 'reseller-dashboard' || adminOnlyTabs.includes(activeTab) || activeTab === 'customers' || activeTab === 'plans' || activeTab === 'whitelabel') {
        setActiveTabState('customer-dashboard');
      }
    }
  }, [currentUser?.id, currentUser?.role, activeTab]);

  // Ensure viewport is scrolled to top after login, tab switch, or user/role switch so mobile keyboard offset never hides TopBar
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {
      window.scrollTo(0, 0);
    }
  }, [activeTab, currentUser?.id, currentUser?.role, isAuthenticated]);

  // Auto-hydrate from Server Persistent Vault (~/.cloudpro-persistent-vault) on startup, tab navigation, window focus, and every 10s so all devices (PC, Android, Tablet) always share identical Cloud PRO data
  const [isVaultReady, setIsVaultReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    const syncFromVault = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      db.hydrateFromServerVault()
        .then((restored) => {
          if (mounted && restored) {
            refreshAll();
          }
        })
        .finally(() => {
          if (mounted) {
            setIsVaultReady(true);
          }
        });
    };

    syncFromVault();

    const onVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        syncFromVault();
      }
    };

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    const pollTimer = setInterval(syncFromVault, 30000);

    return () => {
      mounted = false;
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      clearInterval(pollTimer);
    };
  }, [refreshAll]);

  // Periodically and safely sync Virtual Host accounts & subdomains to backend
  useEffect(() => {
    if (!isVaultReady) return;

    let isSyncing = false;

    const syncVhostToBackend = async () => {
      if (isSyncing) return;
      if (typeof document !== 'undefined' && document.hidden) return;

      isSyncing = true;
      try {
        const allAccounts = db.getHostingAccounts();
        const allSubdomains: Array<{ id: string; accountId: string; fullDomain: string; documentRoot: string }> = [];
        allAccounts.forEach(acc => {
          const accDomains = db.getDomains(acc.id);
          accDomains.forEach(d => {
            if (d.type === 'primary' || d.domain.toLowerCase() === acc.primaryDomain.toLowerCase()) {
              return;
            }
            const subPrefix = d.subdomainPrefix || d.domain.split('.')[0];
            const cleanDocRoot =
              (d.documentRoot || '').replace(/^\/home\/[^/]+/, '').replace(/\/+$/, '') ||
              `/public_html/${subPrefix}`;
            allSubdomains.push({
              id: d.id,
              accountId: acc.id,
              fullDomain: d.domain,
              documentRoot: cleanDocRoot,
            });
          });
        });
        const payload = JSON.stringify({
          accounts: allAccounts,
          subdomains: allSubdomains,
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        await fetch('/api/vhost/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch {
        // Silently ignore timeout/network error
      } finally {
        isSyncing = false;
      }
    };

    // Initial background sync with delay so initial render finishes instantly
    const initialSyncTimer = setTimeout(syncVhostToBackend, 4000);
    const timer = setInterval(syncVhostToBackend, 120000);

    return () => {
      clearTimeout(initialSyncTimer);
      clearInterval(timer);
    };
  }, [isVaultReady]);

  // If not logged in, show LoginPage
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <LoginPage />
        <WhatsAppFloatingButton defaultPhoneNumber="6281226738883" />
      </>
    );
  }

  // Filter accounts strictly by current user role so Reseller/Customer never access Root Admin server domain (denbaguse.my.id) or each other's domains
  const accessibleAccounts = accounts.filter(acc => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'reseller') {
      return (
        acc.resellerId === currentUser.id &&
        acc.id !== 'acc-rdm-01' &&
        acc.primaryDomain !== 'denbaguse.my.id'
      );
    }
    return (
      (acc.customerId === currentUser.id ||
        acc.username === currentUser.username ||
        acc.customerEmail === currentUser.email ||
        acc.id === 'acc-school-02') &&
      acc.id !== 'acc-rdm-01' &&
      acc.primaryDomain !== 'denbaguse.my.id'
    );
  });

  // Determine current active account for account-specific subpanels strictly within accessibleAccounts
  const selectedAccount =
    activeAccount && accessibleAccounts.some(a => a.id === activeAccount.id)
      ? activeAccount
      : accessibleAccounts[0] || null;

  const safeFallbackAccount: HostingAccount = {
    id: 'acc-rdm-01',
    primaryDomain: 'denbaguse.my.id',
    domain: 'denbaguse.my.id',
    username: 'cloudpro',
    customerId: 'usr-admin-01',
    customerName: 'Jaenal Maskun (Website Pribadi)',
    customerEmail: 'myboskue@gmail.com',
    resellerId: 'usr-admin-01',
    serverId: 'srv-sg-01',
    serverName: 'SG-Edge-01 (Singapore)',
    planId: 'plan-pro',
    planName: 'Cloud Pro SSD',
    diskUsedMb: 120,
    diskLimitMb: 25600,
    bandwidthUsedMb: 500,
    bandwidthLimitMb: 512000,
    phpVersion: '8.2',
    phpExtensions: ['ioncube', 'mysqli', 'pdo'],
    status: 'active',
    sslStatus: 'active',
    sslProvider: "Let's Encrypt",
    sslExpiresAt: '2027-01-01T00:00:00Z',
    forceHttps: true,
    documentRoot: '/public_html',
    ipAddress: '100.121.16.66',
    databaseCount: 1,
    emailCount: 1,
    ftpCount: 1,
    nameservers: ['ns1.denbaguse.my.id', 'ns2.denbaguse.my.id'],
    createdAt: new Date().toISOString(),
  };

  const safeSelectedAccount: HostingAccount =
    selectedAccount || accessibleAccounts[0] || accounts[0] || safeFallbackAccount;

  const handleCreateDefaultRdmAccount = () => {
    if (currentUser.role === 'customer') {
      const customerOwnAcc: HostingAccount = {
        id: 'acc-school-02',
        primaryDomain: 'websitepelanggan.my.id',
        domain: 'websitepelanggan.my.id',
        username: currentUser.username || 'pelanggan',
        customerId: currentUser.id,
        customerName: currentUser.name || 'Pelanggan Hosting cPanel',
        customerEmail: currentUser.email || 'admin@websitepelanggan.my.id',
        serverId: 'srv-id-01',
        serverName: 'ID-Cyber-01 (Jakarta)',
        planId: 'plan-starter',
        planName: 'Cloud Starter NVMe',
        diskUsedMb: 250,
        diskLimitMb: 10240,
        bandwidthUsedMb: 1200,
        bandwidthLimitMb: 102400,
        phpVersion: '8.2',
        phpExtensions: ['mysqli', 'pdo', 'curl', 'opcache', 'gd', 'mbstring', 'zip'],
        status: 'active',
        sslStatus: 'active',
        sslProvider: "Let's Encrypt",
        sslExpiresAt: '2027-01-01T00:00:00Z',
        forceHttps: true,
        documentRoot: `/home/${currentUser.username || 'pelanggan'}/public_html`,
        ipAddress: '172.67.223.133',
        databaseCount: 1,
        emailCount: 1,
        ftpCount: 1,
        nameservers: ['ns1.denbaguse.my.id', 'ns2.denbaguse.my.id'],
        createdAt: new Date().toISOString(),
      };
      db.saveHostingAccount(customerOwnAcc);
      refreshAll();
      setActiveAccount(customerOwnAcc);
      return;
    }

    if (currentUser.role === 'reseller') {
      const resellerSampleAcc: HostingAccount = {
        id: `acc-reseller-${Date.now()}`,
        primaryDomain: 'klien-reseller.my.id',
        domain: 'klien-reseller.my.id',
        username: 'klienweb',
        customerId: `usr-cust-${Date.now()}`,
        customerName: 'Portal Klien Mitra Reseller',
        customerEmail: 'admin@klien-reseller.my.id',
        resellerId: currentUser.id,
        serverId: 'srv-id-01',
        serverName: 'ID-Cyber-01 (Jakarta)',
        planId: 'plan-starter',
        planName: 'Cloud Starter NVMe',
        diskUsedMb: 250,
        diskLimitMb: 10240,
        bandwidthUsedMb: 1200,
        bandwidthLimitMb: 102400,
        phpVersion: '8.2',
        phpExtensions: ['mysqli', 'pdo', 'curl', 'opcache', 'gd', 'mbstring', 'zip'],
        status: 'active',
        sslStatus: 'active',
        sslProvider: "Let's Encrypt",
        sslExpiresAt: '2027-01-01T00:00:00Z',
        forceHttps: true,
        documentRoot: '/home/klienweb/public_html',
        ipAddress: '172.67.223.133',
        databaseCount: 1,
        emailCount: 1,
        ftpCount: 1,
        nameservers: ['ns1.denbaguse.my.id', 'ns2.denbaguse.my.id'],
        createdAt: new Date().toISOString(),
      };
      db.saveHostingAccount(resellerSampleAcc);
      refreshAll();
      setActiveAccount(resellerSampleAcc);
      return;
    }

    const sampleAcc: HostingAccount = {
      id: 'acc-rdm-01',
      primaryDomain: 'denbaguse.my.id',
      domain: 'denbaguse.my.id',
      username: 'madrasah',
      customerId: 'usr-admin-01',
      customerName: 'Jaenal Maskun (Website Pribadi)',
      customerEmail: 'admin@denbaguse.my.id',
      serverId: 'srv-sg-01',
      serverName: 'SG-Edge-01 (Singapore)',
      planId: 'plan-pro',
      planName: 'Cloud Pro SSD',
      diskUsedMb: 1240,
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
      documentRoot: '/home/madrasah/public_html',
      ipAddress: '172.67.223.133',
      databaseCount: 1,
      emailCount: 2,
      ftpCount: 1,
      nameservers: ['ns1.denbaguse.my.id', 'ns2.denbaguse.my.id'],
      createdAt: new Date().toISOString(),
    };
    db.saveHostingAccount(sampleAcc);
    refreshAll();
    setActiveAccount(sampleAcc);
  };

  const renderNoAccountPlaceholder = () => (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-700 shadow-xs max-w-xl mx-auto my-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 mb-4">
        <Globe className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">
        {currentUser.role === 'reseller'
          ? 'Belum Ada Akun Hosting Klien di Reseller Ini'
          : 'Belum Ada Akun Hosting Aktif'}
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
        {currentUser.role === 'reseller'
          ? 'Akun utama server Cloud PRO (denbaguse.my.id) terisolasi khusus untuk Root Administrator. Silakan buat akun hosting untuk klien Reseller Anda sendiri.'
          : 'Menu seperti PHP Selector, SSL Let\'s Encrypt, MySQL Database, dan File Manager memerlukan akun virtual host aktif untuk dikonfigurasi.'}
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <button
          onClick={() => setIsCreateAccountOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>+ Buat Akun Hosting Klien Baru</span>
        </button>
        <button
          onClick={handleCreateDefaultRdmAccount}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer transition-colors"
        >
          <Zap className="h-4 w-4 text-emerald-600" />
          <span>
            {currentUser.role === 'reseller'
              ? 'Aktifkan Akun Contoh Klien Reseller'
              : 'Aktifkan Akun Default Server'}
          </span>
        </button>
      </div>
    </div>
  );

  const renderSystemModuleWrapper = (
    category: string,
    title: string,
    subtitle: string,
    component: React.ReactNode
  ) => {
    const primaryNode = Array.isArray(servers) && servers.length > 0 ? (servers.find(s => s.isPrimary) || servers[0]) : null;
    return (
      <div className="space-y-4 max-w-full overflow-hidden w-full min-w-0">
        {/* Universal Executive Module Header Ribbon with 360° Perimeter Ring */}
        <div className="exec-card-ring relative overflow-hidden rounded-2xl w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleGoBack}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-sky-600 transition-colors cursor-pointer shrink-0 shadow-2xs active:scale-95"
                title="Kembali ke halaman sebelumnya"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-sky-600" />
                <span>Kembali</span>
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 border border-slate-200/90 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-600">
                    {category}
                  </span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    {title}
                  </h3>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 truncate">{subtitle}</p>
              </div>
            </div>

            <div className="exec-tile-ring hidden sm:flex items-center gap-2 shrink-0 rounded-xl px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[10px] font-bold text-slate-700">
                Node: {primaryNode?.hostname || 'denbaguse.my.id'}
              </span>
            </div>
          </div>
        </div>

        <div className="exec-module-surface min-w-0 w-full">
          <ModuleErrorBoundary activeTab={activeTab} onResetTab={() => setActiveTabState(getRootDashboardTab())}>
            {component}
          </ModuleErrorBoundary>
        </div>
      </div>
    );
  };

  const renderAccountSuiteWrapper = (
    title: string,
    renderComponent: (account: HostingAccount) => React.ReactNode
  ) => {
    const activeAcc =
      (selectedAccount && accessibleAccounts.some(a => a.id === selectedAccount.id) ? selectedAccount : null) ||
      (accessibleAccounts.length > 0 ? accessibleAccounts[0] : null) ||
      (currentUser.role === 'admin' && accounts.length > 0 ? accounts[0] : null);

    if (!activeAcc) return renderNoAccountPlaceholder();

    return (
      <div className="space-y-4 max-w-full overflow-hidden w-full min-w-0">
        {/* Executive Virtual Host Context Switcher & Grid Banner with 360° Perimeter Ring */}
        <div className="exec-card-ring relative overflow-hidden rounded-2xl w-full max-w-full min-w-0">
          <div className="p-4">
            <div className="flex flex-col gap-3">
              {/* Top Bar: Back Button, Title & Active Domain Context */}
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-sky-600 transition-colors cursor-pointer shrink-0 shadow-2xs active:scale-95"
                  title="Kembali ke halaman sebelumnya"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-sky-600" />
                  <span>Kembali</span>
                </button>
                <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/80 shrink-0">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                      {title}
                    </h3>
                    <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      ACTIVE VHOST
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    Konteks Virtual Host: <strong className="font-mono text-slate-800 font-semibold">{activeAcc.primaryDomain}</strong>
                  </p>
                </div>
              </div>

              {/* Second Row: Domain Dropdown (Full width on Android/Mobile) & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full">
                {currentUser.role !== 'customer' && accessibleAccounts.length > 0 && (
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:max-w-md min-w-0">
                    <label htmlFor="active-vhost-selector" className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-sky-600" />
                      <span className="sm:hidden">Akun:</span>
                      <span className="hidden sm:inline">Pilih Akun Hosting:</span>
                    </label>
                    <div className="relative flex-1 min-w-0">
                      <select
                        id="active-vhost-selector"
                        value={activeAcc.id}
                        onChange={(e) => {
                          const acc = accessibleAccounts.find(a => a.id === e.target.value);
                          if (acc) setActiveAccount(acc);
                        }}
                        className="w-full appearance-none rounded-xl border border-slate-300 bg-white pl-3 pr-8 py-2 font-mono text-xs font-bold text-slate-900 shadow-2xs focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-hidden cursor-pointer"
                      >
                        {accessibleAccounts.map(acc => {
                          const accSubs = db.getDomains(acc.id).filter(d => d.type === 'subdomain');
                          return (
                            <option key={acc.id} value={acc.id}>
                              {acc.primaryDomain} ({acc.username}){accSubs.length > 0 ? ` • ${accSubs.length} Subdomain` : ''}
                            </option>
                          );
                        })}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                        <ChevronDown className="h-3.5 w-3.5 text-sky-600" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons: 2-column full-width grid on mobile, inline flex on desktop */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => setIsWebsitePreviewOpen(true)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-700 shadow-2xs cursor-pointer transition-colors active:scale-95"
                    title="Lihat Hasil Kloning / Live Preview Website"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-sky-600" />
                    <span>Preview Web</span>
                  </button>
                  {currentUser.role !== 'customer' && (
                    <button
                      onClick={() => setIsCreateAccountOpen(true)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-500 shadow-2xs cursor-pointer transition-colors active:scale-95"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Provisi Akun</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 4-Column Elegant Virtual Host Context Grid with 360° Perimeter Rings */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 border-t border-slate-100 pt-3">
              <div className="exec-tile-ring rounded-xl px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Domain Utama
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-sky-700 truncate">
                  {activeAcc.primaryDomain}
                </div>
              </div>
              <div className="exec-tile-ring rounded-xl px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Username Sistem
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-slate-900 truncate">
                  {activeAcc.username}
                </div>
              </div>
              <div className="exec-tile-ring rounded-xl px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Engine Runtime
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-slate-900 truncate">
                  PHP {activeAcc.phpVersion}{' '}
                  {activeAcc.phpExtensions?.includes('ioncube') ? '· ionCube' : ''}
                </div>
              </div>
              <div className="exec-tile-ring rounded-xl px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Server &amp; IP
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-slate-900 truncate">
                  {activeAcc.ipAddress}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Child Tool Component wrapped in ModuleErrorBoundary */}
        <div key={activeAcc.id} className="exec-module-surface min-w-0 w-full">
          <ModuleErrorBoundary activeTab={activeTab} onResetTab={() => setActiveTab('dashboard')}>
            {renderComponent(activeAcc)}
          </ModuleErrorBoundary>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'admin-dashboard':
        return (
          <AdminDashboard
            onNavigate={setActiveTab}
            onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
            onOpenCreateReseller={() => setActiveTab('resellers')}
            onOpenAddServer={() => setActiveTab('servers')}
          />
        );
      case 'reseller-dashboard':
        return (
          <ResellerDashboard
            onNavigate={setActiveTab}
            onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
          />
        );
      case 'customer-dashboard':
      case 'cpanel-dashboard':
        return <CustomerDashboard onNavigate={setActiveTab} />;
      case 'servers':
        return renderSystemModuleWrapper(
          'CLUSTER INFRASTRUCTURE',
          'Server Nodes & Service Daemons',
          'Monitoring beban CPU/RAM, status sistem systemd, dan manajemen cluster',
          <ServerList />
        );
      case 'ip-manager':
        return renderSystemModuleWrapper(
          'NETWORK POOL',
          'Dedicated IP & Subnet Pool Manager',
          'Manajemen alokasi IPv4/IPv6 publik dan isolasi IP khusus vHost',
          <IpAddressManager />
        );
      case 'dns-manager':
      case 'nameservers':
        return renderSystemModuleWrapper(
          'CLUSTER DNS',
          'Private Nameservers & Glue Record',
          'Konfigurasi ns1/ns2 kustom, sinkronisasi BIND9 cluster, dan branding DNS',
          <PrivateNameserverManager />
        );
      case 'vps':
        return renderSystemModuleWrapper(
          'KVM CLOUD HYPERVISOR',
          'Manajemen Instance VPS Cloud (KVM)',
          'Provisioning dedicated virtual machine, VNC Console, Rebuild OS, dan kontrol daya',
          <VpsManager />
        );
      case 'accounts':
      case 'hosting-accounts':
        return renderSystemModuleWrapper(
          'VIRTUAL HOSTS SUITE',
          'Manajemen Akun Hosting (vHosts)',
          'Kelola akun web hosting aktif, isolasi direktori /public_html, dan akses cPanel 1-klik',
          <HostingAccountList
            onOpenCpanel={(acc) => {
              setActiveAccount(acc);
              setActiveTab('file-manager');
            }}
            onOpenCreateWizard={() => setIsCreateAccountOpen(true)}
          />
        );
      case 'file-manager':
      case 'cpanel-files':
        return renderAccountSuiteWrapper(
          'File Manager & Ekstraktor ZIP',
          (acc) => (
            <FileManager
              key={`${acc.id}-${fileManagerPath}`}
              account={acc}
              initialPath={fileManagerPath}
              onBack={handleGoBack}
            />
          )
        );
      case 'website-cloner':
      case 'cloner':
        return renderAccountSuiteWrapper(
          'Kloning Website Otomatis (1-Click URL Cloner)',
          (acc) => (
            <WebsiteClonerModule
              account={acc}
              onOpenFileManager={(targetPath) => {
                setFileManagerPath(targetPath);
                setActiveTab('file-manager');
              }}
              onOpenPreview={(domain, docRoot) => {
                if (docRoot) setFileManagerPath(docRoot);
                setIsWebsitePreviewOpen(true);
              }}
              onNavigateTab={setActiveTab}
            />
          )
        );
      case 'databases':
      case 'cpanel-database':
        return renderAccountSuiteWrapper('MySQL Databases', (acc) => <DatabaseManager account={acc} />);
      case 'emails':
      case 'cpanel-email':
        return renderAccountSuiteWrapper('Email & Webmail', (acc) => <EmailManager account={acc} />);
      case 'ssl':
      case 'cpanel-ssl':
        return renderAccountSuiteWrapper('SSL & Let\'s Encrypt', (acc) => <SslManager account={acc} />);
      case 'gateway-tunnel':
        if (currentUser.role !== 'admin') {
          return <CustomerDashboard onNavigate={setActiveTab} />;
        }
        return renderAccountSuiteWrapper(
          'Cloudflare Tunnel & IPv6 IndiHome Gateway',
          (acc) => (
            <GatewayTunnelManager
              account={acc}
              onNavigateTab={setActiveTab}
              onOpenPreview={(domain, docRoot) => {
                if (docRoot) setFileManagerPath(docRoot);
                setIsWebsitePreviewOpen(true);
              }}
            />
          )
        );
      case 'dns-zones':
      case 'cpanel-dns':
        return renderAccountSuiteWrapper(
          'DNS Zone Editor',
          (acc) => (
            <DnsZoneEditor
              account={acc}
              onOpenGatewayModule={() => setActiveTab('gateway-tunnel')}
            />
          )
        );
      case 'domains':
      case 'subdomains':
      case 'cpanel-domains':
        return renderAccountSuiteWrapper(
          'Domain & Subdomain Manager',
          (acc) => (
            <DomainSubdomainManager
              account={acc}
              onOpenFileManager={(targetPath) => {
                setFileManagerPath(targetPath);
                setActiveTab('file-manager');
              }}
              onNavigateTab={(tab, domain) => {
                if (domain) setBackupPreselectedDomain(domain);
                setActiveTab(tab);
              }}
            />
          )
        );
      case 'php-selector':
      case 'cpanel-php':
        return renderAccountSuiteWrapper(
          'PHP Selector & Versi',
          (acc) => (
            <PhpConfigManager
              account={acc}
              preselectedDomain={backupPreselectedDomain}
              onNavigateTab={(tab, domain) => {
                if (domain) setBackupPreselectedDomain(domain);
                setActiveTab(tab);
              }}
            />
          )
        );
      case 'cron-jobs':
      case 'cpanel-cron':
        return renderAccountSuiteWrapper('Cron Jobs Otomasi', (acc) => <CronManager account={acc} />);
      case 'backups':
      case 'backup':
      case 'cpanel-backup':
        return renderSystemModuleWrapper(
          'BACKUP SUITE',
          'Modul Backup Website & Database (.ZIP)',
          'Buat cadangan website terkompresi .ZIP, database MySQL terisolasi, dan unduh arsip server secara mandiri',
          <BackupModule
            account={safeSelectedAccount}
            preselectedDomain={backupPreselectedDomain}
            onNavigateTab={(tab, domain) => {
              if (domain) setBackupPreselectedDomain(domain);
              setActiveTab(tab);
            }}
          />
        );
      case 'restore':
      case 'cpanel-restore':
        return renderSystemModuleWrapper(
          'RECOVERY SUITE',
          'Modul Restore Website & Database (.ZIP)',
          'Pulihkan website dari arsip server, berkas .ZIP komputer lokal, atau tarik otomatis dari URL remote dengan proteksi safety snapshot',
          <RestoreModule
            account={safeSelectedAccount}
            preselectedDomain={backupPreselectedDomain}
            onNavigateTab={(tab, domain) => {
              if (domain) setBackupPreselectedDomain(domain);
              setActiveTab(tab);
            }}
          />
        );
      case 'disk-usage':
      case 'cpanel-disk':
        return renderSystemModuleWrapper(
          'STORAGE ANALYZER',
          'Modul Disk Usage & Analisa Kuota',
          'Pantau pemakaian penyimpanan riil NVMe per akun klien, document root website, folder subdomain, dan komponen file aktif',
          <DiskUsageModule
            account={safeSelectedAccount}
            onOpenFileManager={(targetPath) => {
              setFileManagerPath(targetPath);
              setActiveTab('file-manager');
            }}
            onNavigateTab={(tab, domain) => {
              if (domain) setBackupPreselectedDomain(domain);
              setActiveTab(tab);
            }}
          />
        );
      case 'disk-cleaner':
      case 'cpanel-cleaner':
      case 'cleaner':
        return renderSystemModuleWrapper(
          'STORAGE CLEANER',
          'Modul Disk Cleaner & Pembersih Sampah',
          'Pembersihan aman 100% (Zero Error) untuk chunk JS/CSS usang, berkas ZIP sementara, dan crash log tanpa menyentuh uploads & database',
          <DiskCleanerModule
            account={safeSelectedAccount}
            onOpenFileManager={(targetPath) => {
              setFileManagerPath(targetPath);
              setActiveTab('file-manager');
            }}
            onNavigateTab={(tab, domain) => {
              if (domain) setBackupPreselectedDomain(domain);
              setActiveTab(tab);
            }}
          />
        );
      case 'media-storage':
      case 'cpanel-media':
        return renderAccountSuiteWrapper('Cloudflare R2 & Media', (acc) => <MediaStorageManager account={acc} />);
      case 'plans':
      case 'packages':
        return renderSystemModuleWrapper(
          'SERVICE PACKAGES',
          'Paket & Kuota Hosting Global',
          'Konfigurasi spesifikasi kuota NVMe disk, bandwidth, database, dan akun email',
          <HostingPlanList />
        );
      case 'resellers':
        return renderSystemModuleWrapper(
          'MULTI-TENANT WHM',
          'Mitra Reseller & Alokasi Kuota',
          'Manajemen kemitraan reseller, delegasi resource, dan white-label branding',
          <ResellerList />
        );
      case 'customers':
        return renderSystemModuleWrapper(
          'CLIENT DIRECTORY',
          'Direktori Pelanggan & Kepemilikan Layanan',
          'Daftar akun pelanggan, informasi kontak, dan histori layanan aktif',
          <CustomerList />
        );
      case 'billing':
      case 'invoices':
        return renderSystemModuleWrapper(
          'FINANCE & BILLING',
          'Invoicing, Tagihan & Kwitansi Resmi',
          'Manajemen invoice otomatis, verifikasi pembayaran, dan cetak kwitansi Cloud PRO Enterprise',
          <BillingOverview />
        );
      case 'security':
        return renderSystemModuleWrapper(
          'SECURITY OPERATIONS',
          'Firewall, Brute-Force Protection & Audit Log',
          'Pengaturan aturan firewall jaringan, proteksi 2FA, dan pemantauan log keamanan',
          <SecurityCenter />
        );
      case 'tailscale-mesh':
        return renderSystemModuleWrapper(
          'WIREGUARD MESH VPN',
          'Tailscale Mesh VPN & Remote SSH Sync',
          'Akses terminal SSH jarak jauh tanpa port-forwarding dan sinkronisasi GitHub otomatis',
          <TailscaleMeshNode />
        );
      case 'whitelabel':
      case 'branding':
        return renderSystemModuleWrapper(
          'BRAND CUSTOMIZATION',
          'White-Label Branding & Kustomisasi Panel',
          'Pengaturan identitas nama brand, logo kustom, warna tema, dan domain panel reseller',
          <WhiteLabelSettings />
        );
      case 'api-docs':
      case 'api-explorer':
      case 'api':
        return renderSystemModuleWrapper(
          'DEVELOPER PLATFORM',
          'REST API Explorer & Webhook Automation',
          'Dokumentasi endpoint API, token autentikasi, dan integrasi sistem penagihan eksternal',
          <ApiDocsExplorer />
        );
      case 'architecture':
        return renderSystemModuleWrapper(
          'SYSTEM BLUEPRINT',
          'Cluster Architecture & High-Availability Topology',
          'Skema topologi jaringan multi-node, alur proxy Nginx, dan isolasi penyimpanan',
          <ArchitectureView />
        );
      default:
        return (
          <AdminDashboard
            onNavigate={setActiveTab}
            onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
            onOpenCreateReseller={() => setActiveTab('resellers')}
            onOpenAddServer={() => setActiveTab('servers')}
          />
        );
    }
  };

  return (
    <div className="min-h-dvh w-full max-w-full bg-slate-100 font-sans text-slate-900 antialiased selection:bg-sky-500 selection:text-white">
      <Sidebar
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />
      <div className="flex min-h-dvh flex-1 flex-col min-w-0 w-full max-w-full lg:pl-64">
        <TopBar
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          onOpenJobs={() => setIsJobsOpen(true)}
          onOpenNotifications={() => setIsNotifsOpen(true)}
          currentTab={activeTab}
          onBack={handleGoBack}
          canGoBack={!isRootDashboard || navHistory.length > 0}
          onNavigate={setActiveTab}
        />
        <main className="flex-1 min-w-0 w-full max-w-full overflow-x-clip bg-exec-canvas p-3 pb-24 sm:p-6 sm:pb-24 lg:py-8 lg:pl-8 lg:pr-18">
          <div className="mx-auto max-w-7xl w-full min-w-0">
            <ModuleErrorBoundary
              activeTab={activeTab}
              onResetTab={() => setActiveTabState(getRootDashboardTab())}
            >
              <div key={activeTab} className="animate-module-enter">
                {renderContent()}
              </div>
            </ModuleErrorBoundary>
            <Footer onNavigate={setActiveTab} />
          </div>
        </main>
      </div>

      {/* Unified Floating Glass Micro-Dock with Integrated WhatsApp Support */}
      <FloatingGlassDock
        activeTab={activeTab}
        onNavigate={setActiveTab}
        activeDomain={selectedAccount?.primaryDomain}
        defaultPhoneNumber="6281226738883"
      />

      {/* Global Modals & Drawers */}
      {selectedAccount && (
        <WebsitePreviewModal
          isOpen={isWebsitePreviewOpen}
          onClose={() => setIsWebsitePreviewOpen(false)}
          account={selectedAccount}
          initialDomain={selectedAccount.primaryDomain}
          initialDocRoot={fileManagerPath}
          onOpenFileManager={(targetPath) => {
            setFileManagerPath(targetPath);
            setActiveTab('file-manager');
          }}
        />
      )}

      <CreateAccountWizard
        isOpen={isCreateAccountOpen}
        onClose={() => setIsCreateAccountOpen(false)}
      />

      <JobQueueDrawer
        isOpen={isJobsOpen}
        onClose={() => setIsJobsOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotifsOpen}
        onClose={() => setIsNotifsOpen(false)}
      />

      {/* In-app Confirmation Modal */}
      <ConfirmationModal
        options={confirmModal}
        onClose={closeConfirm}
      />

      {/* Floating Toast Alerts Container */}
      <div className="fixed bottom-22 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border p-3.5 shadow-xl transition-all duration-200 animate-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-200'
                : toast.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-200'
                : toast.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-slate-900 dark:text-amber-200'
                : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-slate-900 dark:text-sky-200'
            }`}
          >
            <div className="mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-600" />}
              {toast.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
              {toast.type === 'info' && <Info className="h-4 w-4 text-sky-600" />}
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold">{toast.title}</div>
              {toast.message && <div className="mt-0.5 opacity-90">{toast.message}</div>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="rounded p-0.5 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App runtime error caught by GlobalErrorBoundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 text-white text-center">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Memulihkan Sesi Panel Server</h2>
            <p className="text-xs text-slate-400 mb-6">
              Terdeteksi sinkronisasi sesi browser ({this.state.error?.message || 'Memuat ulang'}). Klik tombol di bawah untuk langsung membuka Dashboard.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('cloudpro_current_user_id');
                  } catch {}
                  window.location.href = '/login?panel=1';
                }}
                className="w-full rounded-xl bg-sky-600 hover:bg-sky-500 py-3 text-xs font-bold text-white shadow-lg cursor-pointer transition-all"
              >
                Buka Ulang Panel Kontrol
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 py-3 text-xs font-semibold text-slate-300 cursor-pointer transition-all"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <ServerProvider>
          <AppContent />
        </ServerProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
