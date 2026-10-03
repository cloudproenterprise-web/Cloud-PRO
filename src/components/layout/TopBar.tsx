import React, { useState } from 'react';
import {
  Menu,
  Bell,
  RefreshCw,
  Activity,
  UserCheck,
  ChevronDown,
  RotateCcw,
  Server,
  Cpu,
  Layers,
  ChevronRight,
  Shield,
  CreditCard,
  Globe,
  FolderOpen,
  Database,
  Mail,
  Lock,
  LogOut,
  ArrowLeft,
  Home,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';
import { CloudProLogo } from '../common/CloudProLogo';

interface TopBarProps {
  onToggleSidebar: () => void;
  onOpenJobs: () => void;
  onOpenNotifications: () => void;
  currentTab: string;
  onBack?: () => void;
  canGoBack?: boolean;
  onNavigate?: (tab: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebar,
  onOpenJobs,
  onOpenNotifications,
  currentTab,
  onBack,
  canGoBack,
  onNavigate,
}) => {
  const { currentUser, switchUser, switchRole, allUsers, currentResellerProfile, logout } = useAuth();
  const { servers, activeJobsCount, notifications, resetDatabase } = useServer();

  if (!currentUser) return null;

  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const unreadNotifsCount = notifications.filter(n => !n.isRead).length;

  const breadcrumbInfo = () => {
    switch (currentTab) {
      case 'dashboard':
      case 'admin-dashboard':
        return { title: 'Dashboard Utama & Telemetry', category: 'Dashboard' };
      case 'servers':
        return { title: 'Server Nodes & Service Daemons', category: 'Cluster' };
      case 'private-ns':
        return { title: 'Private Nameservers & Glue Record', category: 'Cluster' };
      case 'ip-manager':
        return { title: 'IP Address Pool Management', category: 'Cluster' };
      case 'architecture':
        return { title: 'Cluster Architecture & System Blueprint', category: 'Architecture' };
      case 'vps':
        return { title: 'Pengelolaan VPS Cloud KVM', category: 'Cloud VPS' };
      case 'resellers':
        return { title: 'Mitra Reseller & Kuota', category: 'Tenancy' };
      case 'customers':
        return { title: 'Direktori Pelanggan', category: 'Tenancy' };
      case 'hosting':
      case 'hosting-accounts':
      case 'accounts':
        return { title: 'Manajemen Akun Hosting', category: 'Hosting' };
      case 'create-account':
        return { title: 'Provisioning Akun Hosting Baru', category: 'Hosting' };
      case 'packages':
      case 'plans':
        return { title: 'Paket & Kuota Hosting', category: 'Hosting' };
      case 'invoices':
      case 'billing':
        return { title: 'Invoicing & Tagihan', category: 'Finance' };
      case 'branding':
      case 'whitelabel':
        return { title: 'White-Label Branding & Logo', category: 'Customization' };
      case 'security':
        return { title: 'Firewall, 2FA & Audit Log', category: 'Security' };
      case 'api':
      case 'api-explorer':
        return { title: 'REST API & Webhooks', category: 'Developer' };
      case 'reseller-dashboard':
        return { title: `${currentResellerProfile?.brandName || 'Reseller'} Portal`, category: 'Reseller' };
      case 'cpanel-dashboard':
        return { title: 'cPanel Hosting Dashboard', category: 'cPanel' };
      case 'files':
      case 'file-manager':
      case 'cpanel-files':
        return { title: 'File Manager Web', category: 'cPanel' };
      case 'media':
      case 'media-storage':
      case 'cpanel-media':
        return { title: 'Cloudflare R2 & Media Optimizer', category: 'cPanel' };
      case 'databases':
      case 'cpanel-database':
        return { title: 'MySQL / MariaDB Databases', category: 'cPanel' };
      case 'domains':
        return { title: 'Domain & Subdomain Manager', category: 'cPanel' };
      case 'emails':
      case 'cpanel-email':
        return { title: 'Email Accounts & Webmail', category: 'cPanel' };
      case 'dns':
      case 'cpanel-dns':
        return { title: 'DNS Zone Editor (BIND9)', category: 'cPanel' };
      case 'ssl':
      case 'cpanel-ssl':
        return { title: 'AutoSSL & TLS Certificate', category: 'cPanel' };
      case 'php':
      case 'cpanel-php':
        return { title: 'PHP Version & Extensions', category: 'cPanel' };
      case 'cron':
      case 'cpanel-cron':
        return { title: 'Cron Jobs Scheduler', category: 'cPanel' };
      case 'backups':
      case 'backup':
      case 'cpanel-backup':
        return { title: 'Backup Website & Database (.ZIP)', category: 'Backup & Recovery' };
      case 'restore':
      case 'cpanel-restore':
        return { title: 'Restore Website & Database (.ZIP)', category: 'Backup & Recovery' };
      case 'disk-usage':
      case 'cpanel-disk':
        return { title: 'Analisa Penggunaan Disk', category: 'Penyimpanan' };
      case 'disk-cleaner':
      case 'cpanel-cleaner':
      case 'cleaner':
        return { title: 'Pembersih File Sampah (Disk Cleaner)', category: 'Penyimpanan' };
      default:
        return { title: 'Management Console', category: 'Cloud PRO' };
    }
  };

  const isRootTab = [
    'dashboard',
    'admin-dashboard',
    'reseller-dashboard',
    'customer-dashboard',
    'cpanel-dashboard',
  ].includes(currentTab);
  const currentInfo = breadcrumbInfo();
  const primaryServer = servers.find(s => s.isPrimary) || servers[0];
  const onlineServersCount = servers.filter(s => s.status === 'online').length;

  return (
    <div className="sticky top-0 left-0 right-0 z-30 flex w-full max-w-full shrink-0 flex-col border-b border-slate-200/90 bg-white/95 backdrop-blur-xl transition-colors shadow-2xs">
      {/* Executive Monochromatic Top Hairline */}
      <div className="h-0.5 w-full bg-gradient-to-r from-slate-900 via-sky-600 to-slate-900" />
      {/* Primary Bar */}
      <header className="flex h-14 sm:h-16 w-full max-w-full min-w-0 items-center justify-between gap-1.5 px-2.5 sm:px-6">
        {/* Left Zone: Hamburger + Official Cloud PRO Logo + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
          <button
            onClick={onToggleSidebar}
            className="flex h-8.5 w-8.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 lg:hidden transition-colors cursor-pointer"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </button>

          {/* Cloud PRO Logo - ALWAYS VISIBLE ON ALL SCREENS */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate?.('dashboard')}
              className="focus:outline-none cursor-pointer text-left min-w-0"
              title="Kembali ke Dashboard Utama"
            >
              <CloudProLogo
                variant="compact"
                size="md"
                showSubtitle={true}
                subtitleText="ENTERPRISE CLOUD PANEL"
                className="min-w-0"
              />
            </button>

            {/* Desktop Breadcrumb Separator & Title with Sub-Label */}
            <div className="hidden md:flex flex-col justify-center border-l border-slate-200 pl-3.5 dark:border-slate-700 leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  {currentInfo.title}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => onNavigate?.('dashboard')}
                  className="uppercase tracking-wider text-sky-600 hover:text-sky-500 dark:text-sky-400 font-bold cursor-pointer"
                >
                  {currentInfo.category}
                </button>
                <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  Node: {primaryServer?.hostname || 'denbaguse.my.id'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Zone: Cluster Health Telemetry (Desktop Only) */}
        <div className="hidden xl:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 font-mono text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 shadow-2xs">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {onlineServersCount}/{servers.length} Nodes OK
            </span>
            <span className="text-slate-300 dark:text-slate-600">&bull;</span>
            <span>Load {primaryServer ? primaryServer.loadAverage[0].toFixed(2) : '0.24'}</span>
            <span className="text-slate-300 dark:text-slate-600">&bull;</span>
            <span>CPU {primaryServer ? primaryServer.cpuUsagePct : 14}%</span>
          </div>
        </div>

        {/* Right Zone: Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Reset Default Data Button (Desktop only) */}
          <button
            onClick={resetDatabase}
            title="Kembalikan pengaturan default server"
            className="hidden lg:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors shadow-2xs"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span>Reset Default</span>
          </button>

          {/* Background Job Queue Drawer Trigger (Only shown on mobile if a task is actively running, freeing header space) */}
          <button
            onClick={onOpenJobs}
            title="Antrean Proses Background Server (Backup, Deploy, & Provisioning)"
            className={`relative items-center justify-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
              activeJobsCount > 0
                ? 'flex border-sky-400 bg-sky-50 text-sky-700 shadow-sky-500/10'
                : 'hidden sm:flex border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className={`h-3.5 w-3.5 text-sky-500 ${activeJobsCount > 0 ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Tasks</span>
            {activeJobsCount > 0 && (
              <span className="rounded-full bg-sky-600 px-1.5 py-0.2 font-mono text-[10px] text-white">
                {activeJobsCount}
              </span>
            )}
          </button>

          {/* Iconic WhatsApp Helpdesk Center Trigger */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-whatsapp-center'))}
            title="Pusat Bantuan WhatsApp Cloud PRO (0812-2673-8883)"
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60 px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <svg className="h-3.5 w-3.5 fill-current text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.04 7.5C8.83 7.5 8.49 7.58 8.2 7.89C7.91 8.2 7.08 8.97 7.08 10.54C7.08 12.11 8.23 13.63 8.39 13.84C8.55 14.05 10.63 17.26 13.82 18.64C14.58 18.97 15.18 19.17 15.64 19.31C16.4 19.56 17.1 19.52 17.65 19.44C18.26 19.35 19.52 18.68 19.78 17.94C20.04 17.2 20.04 16.57 19.96 16.44C19.88 16.31 19.68 16.23 19.36 16.07C19.05 15.92 17.5 15.15 17.21 15.05C16.92 14.94 16.71 14.89 16.5 15.2C16.29 15.52 15.7 16.23 15.52 16.44C15.34 16.65 15.16 16.67 14.85 16.52C14.54 16.36 13.54 16.03 12.35 14.97C11.42 14.15 10.8 13.13 10.62 12.82C10.44 12.51 10.6 12.34 10.76 12.19C10.9 12.05 11.07 11.83 11.23 11.65C11.39 11.46 11.44 11.33 11.55 11.13C11.65 10.92 11.6 10.73 11.52 10.58C11.44 10.42 10.82 8.9 10.56 8.29C10.31 7.69 10.06 7.77 9.87 7.76C9.7 7.75 9.5 7.5 9.04 7.5Z" />
            </svg>
            <span className="hidden sm:inline font-bold">Pusat WA</span>
            <span className="sm:hidden font-bold">WA</span>
          </button>

          {/* Notifications Trigger */}
          <button
            onClick={onOpenNotifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            aria-label="Notifikasi"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 font-mono text-[10px] font-bold text-white shadow-2xs">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* User Account / Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-1 sm:px-2.5 sm:py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-sky-300 transition-all shadow-2xs cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-black text-sky-400 shadow-2xs">
                {(currentUser.name || 'Admin').charAt(0)}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="truncate max-w-[100px] font-bold text-slate-900 leading-tight">
                  {(currentUser.name || 'Admin').split(' ')[0]}
                </span>
                <span className="font-mono text-[9px] text-slate-400 uppercase tracking-wider leading-tight">
                  {currentUser.role}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <div className="border-b border-slate-100 px-3 py-2 text-xs">
                  <p className="font-bold text-slate-900">
                    Manajemen Akun &amp; Portal
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pilih akun atau beralih portal akses Admin, Reseller, &amp; Customer
                  </p>
                </div>

                <div className="mt-2 space-y-1">
                  {allUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => {
                        switchUser(user.id);
                        setShowUserDropdown(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                        currentUser.id === user.id
                          ? 'bg-sky-50 text-sky-900 font-semibold ring-1 ring-sky-500/25'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {user.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {user.email}
                        </div>
                      </div>
                      <span
                        className={`font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                          currentUser.id === user.id
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {user.role}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800 space-y-1">
                  {currentUser.role !== 'admin' && (
                    <button
                      onClick={() => {
                        switchRole('admin');
                        setShowUserDropdown(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-100 dark:bg-slate-800 dark:text-sky-400 dark:hover:bg-slate-700 transition-colors"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Kembali ke Root Administrator</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Keluar / Logout Akun</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Breadcrumb Sub-Bar (Visible strictly on mobile screens < md) */}
      <div className="flex md:hidden h-8 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/90 px-2.5 text-[11px]">
        <div className="flex items-center gap-1 text-slate-500 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onNavigate?.('dashboard')}
            className="flex items-center gap-1 font-semibold text-slate-400 uppercase tracking-wider text-[9.5px] shrink-0"
          >
            <Home className="h-3 w-3 text-sky-600" />
            <span>{currentInfo.category}</span>
          </button>
          <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
          <span className="font-bold text-slate-900 truncate">
            {currentInfo.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!isRootTab && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="rounded-md bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300"
            >
              Dashboard
            </button>
          )}
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Online
          </span>
        </div>
      </div>
    </div>
  );
};
