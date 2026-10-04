import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Server,
  Users,
  HardDrive,
  Layers,
  Shield,
  CreditCard,
  Code2,
  FolderOpen,
  Database,
  Mail,
  Globe,
  Lock,
  Cpu,
  Clock,
  Archive,
  Palette,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Cloud,
  Network,
  Sparkles,
  Terminal,
  Search,
  X,
  ChevronsUpDown,
  Trash2,
  RotateCcw,
  Activity,
  Zap,
  GitBranch,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';
import { CloudProLogo } from '../common/CloudProLogo';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

interface NavMenuItem {
  id: string;
  label: string;
  aliases?: string[];
  icon: React.ComponentType<{ className?: string }>;
  externalHref?: string;
  badge?: {
    text: string;
  };
}

interface NavMenuGroup {
  key: string;
  title: string;
  items: NavMenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
}) => {
  const { currentUser, currentResellerProfile, switchRole, logout } = useAuth();
  const { servers } = useServer();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [commitHash, setCommitHash] = useState<string>('2770df5');

  useEffect(() => {
    fetch('/api/system/git-commit-info')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.ok && data.local?.shortHash) {
          setCommitHash(data.local.shortHash);
        }
      })
      .catch(() => {});
  }, []);

  // Group expand/collapse states (Consolidated into 6 clean suites)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    // Admin Suites
    admin_infra: true,
    admin_network_cloud: true,
    admin_hosting_domains: true,
    admin_apps_storage: true,
    admin_storage_backup: true,
    admin_client_finance: true,
    // Reseller Suites
    reseller_portal: true,
    reseller_hosting_domains: true,
    reseller_apps: true,
    reseller_storage_backup: true,
    reseller_finance: true,
    // Customer Suites
    customer_overview: true,
    customer_domains: true,
    customer_apps: true,
    customer_storage_billing: true,
  });

  const adminGroups: NavMenuGroup[] = useMemo(
    () => [
      {
        key: 'admin_infra',
        title: 'Ringkasan & Cluster Node',
        items: [
          {
            id: 'dashboard',
            aliases: ['admin-dashboard'],
            label: 'Cluster Overview',
            icon: LayoutDashboard,
          },
          {
            id: 'servers',
            label: 'Server Nodes & Daemon',
            icon: Server,
          },
          {
            id: 'ssh-direct',
            label: 'Web Terminal (SSH)',
            icon: Terminal,
            externalHref: '/ssh',
            badge: {
              text: 'SSH',
            },
          },
          {
            id: 'architecture',
            label: 'Arsitektur Sistem',
            icon: Layers,
          },
        ],
      },
      {
        key: 'admin_network_cloud',
        title: 'Jaringan & Cloud VPS',
        items: [
          {
            id: 'vps',
            label: 'Kelola VPS Cloud (KVM)',
            icon: Cpu,
          },
          {
            id: 'gateway-tunnel',
            label: 'CF Tunnel & IPv6 DDNS',
            icon: Network,
          },
          {
            id: 'tailscale-mesh',
            label: 'Tailscale Mesh & SSH',
            icon: Network,
          },
          {
            id: 'ip-manager',
            label: 'Dedicated IP & Pool',
            icon: Globe,
          },
          {
            id: 'dns-zones',
            aliases: ['cpanel-dns'],
            label: 'DNS Zone Editor',
            icon: Globe,
          },
          {
            id: 'nameservers',
            aliases: ['dns-manager', 'private-ns'],
            label: 'Private Nameserver',
            icon: Server,
          },
        ],
      },
      {
        key: 'admin_hosting_domains',
        title: 'Hosting & Domain Suite',
        items: [
          {
            id: 'accounts',
            aliases: ['hosting-accounts', 'hosting'],
            label: 'Akun Hosting (vHosts)',
            icon: Globe,
          },
          {
            id: 'domains',
            aliases: ['cpanel-domains', 'subdomains'],
            label: 'Domain & Subdomain',
            icon: Globe,
          },
          {
            id: 'ssl',
            aliases: ['cpanel-ssl'],
            label: "SSL & Let's Encrypt",
            icon: Lock,
          },
        ],
      },
      {
        key: 'admin_apps_storage',
        title: 'Berkas, Database & Engine',
        items: [
          {
            id: 'file-manager',
            aliases: ['cpanel-files', 'files'],
            label: 'File Manager',
            icon: FolderOpen,
          },
          {
            id: 'website-cloner',
            aliases: ['cloner'],
            label: 'Kloning Website (1-Click)',
            icon: Sparkles,
          },
          {
            id: 'databases',
            aliases: ['cpanel-database'],
            label: 'Basis Data MySQL (phpMyAdmin)',
            icon: Database,
          },
          {
            id: 'php-selector',
            aliases: ['cpanel-php', 'php'],
            label: 'PHP Selector & Versi',
            icon: Cpu,
          },
          {
            id: 'media-storage',
            aliases: ['cpanel-media', 'media'],
            label: 'Cloudflare R2 & Media',
            icon: Cloud,
          },
          {
            id: 'cron-jobs',
            aliases: ['cpanel-cron', 'cron'],
            label: 'Cron Jobs Otomasi',
            icon: Clock,
          },
          {
            id: 'emails',
            aliases: ['cpanel-email'],
            label: 'Email & Webmail',
            icon: Mail,
          },
        ],
      },
      {
        key: 'admin_storage_backup',
        title: 'Penyimpanan & Cadangan',
        items: [
          {
            id: 'disk-usage',
            aliases: ['cpanel-disk'],
            label: 'Disk Usage & Analisa',
            icon: HardDrive,
          },
          {
            id: 'disk-cleaner',
            aliases: ['cleaner', 'cpanel-cleaner', 'cpanel-disk-cleaner'],
            label: 'Disk Cleaner (Pembersih)',
            icon: Trash2,
          },
          {
            id: 'backups',
            aliases: ['backup', 'cpanel-backup', 'cpanel-backups'],
            label: 'Backup Website (.ZIP)',
            icon: Archive,
            badge: {
              text: '.ZIP',
            },
          },
          {
            id: 'restore',
            aliases: ['cpanel-restore', 'restore-manager'],
            label: 'Restore & Pulihkan Data',
            icon: RotateCcw,
          },
        ],
      },
      {
        key: 'admin_client_finance',
        title: 'Klien, Keuangan & Keamanan',
        items: [
          {
            id: 'resellers',
            label: 'Mitra Reseller',
            icon: Users,
          },
          {
            id: 'customers',
            label: 'Semua Pelanggan',
            icon: Users,
          },
          {
            id: 'plans',
            aliases: ['packages'],
            label: 'Paket Hosting Global',
            icon: Layers,
          },
          {
            id: 'billing',
            aliases: ['invoices'],
            label: 'Billing & Invoices',
            icon: CreditCard,
          },
          {
            id: 'security',
            label: 'Firewall & Security',
            icon: Shield,
          },
          {
            id: 'whitelabel',
            aliases: ['branding'],
            label: 'White-Label Settings',
            icon: Palette,
          },
          {
            id: 'api-explorer',
            aliases: ['api-docs', 'api'],
            label: 'REST API & Webhooks',
            icon: Code2,
          },
        ],
      },
    ],
    []
  );

  const resellerGroups: NavMenuGroup[] = useMemo(
    () => [
      {
        key: 'reseller_portal',
        title: 'Portal Reseller',
        items: [
          {
            id: 'reseller-dashboard',
            label: 'Dashboard Kuota',
            icon: LayoutDashboard,
          },
          {
            id: 'customers',
            label: 'Pelanggan Saya',
            icon: Users,
          },
          {
            id: 'plans',
            aliases: ['packages'],
            label: 'Paket Hosting Sendiri',
            icon: Layers,
          },
          {
            id: 'vps',
            label: 'Cloud VPS Instances',
            icon: Cpu,
          },
        ],
      },
      {
        key: 'reseller_hosting_domains',
        title: 'Hosting & Domain',
        items: [
          {
            id: 'accounts',
            aliases: ['hosting-accounts'],
            label: 'Akun Hosting (vHosts)',
            icon: Globe,
          },
          {
            id: 'domains',
            aliases: ['cpanel-domains', 'subdomains'],
            label: 'Domain & Subdomain',
            icon: Globe,
          },
          {
            id: 'ssl',
            aliases: ['cpanel-ssl'],
            label: "SSL Let's Encrypt",
            icon: Lock,
          },
          {
            id: 'dns-zones',
            aliases: ['cpanel-dns'],
            label: 'DNS Zone Editor',
            icon: Globe,
          },
          {
            id: 'nameservers',
            aliases: ['dns-manager'],
            label: 'Private Nameserver (NS)',
            icon: Server,
          },
        ],
      },
      {
        key: 'reseller_apps',
        title: 'Berkas, Database & Aplikasi',
        items: [
          {
            id: 'file-manager',
            aliases: ['cpanel-files'],
            label: 'File Manager',
            icon: FolderOpen,
          },
          {
            id: 'website-cloner',
            aliases: ['cloner'],
            label: 'Kloning Website (1-Click)',
            icon: Sparkles,
          },
          {
            id: 'databases',
            aliases: ['cpanel-database'],
            label: 'MySQL & phpMyAdmin',
            icon: Database,
          },
          {
            id: 'php-selector',
            aliases: ['cpanel-php'],
            label: 'PHP Selector & Versi',
            icon: Cpu,
          },
          {
            id: 'media-storage',
            aliases: ['cpanel-media'],
            label: 'Cloudflare R2 & Media',
            icon: Cloud,
            badge: {
              text: 'R2',
            },
          },
          {
            id: 'cron-jobs',
            aliases: ['cpanel-cron'],
            label: 'Cron Jobs Otomasi',
            icon: Clock,
          },
          {
            id: 'emails',
            aliases: ['cpanel-email'],
            label: 'Email & Webmail',
            icon: Mail,
          },
        ],
      },
      {
        key: 'reseller_storage_backup',
        title: 'Penyimpanan & Cadangan',
        items: [
          {
            id: 'disk-usage',
            aliases: ['cpanel-disk'],
            label: 'Disk Usage & Analisa',
            icon: HardDrive,
          },
          {
            id: 'disk-cleaner',
            aliases: ['cleaner', 'cpanel-cleaner'],
            label: 'Disk Cleaner (Pembersih)',
            icon: Trash2,
          },
          {
            id: 'backups',
            aliases: ['backup', 'cpanel-backup', 'cpanel-backups'],
            label: 'Backup Website (.ZIP)',
            icon: Archive,
          },
          {
            id: 'restore',
            aliases: ['cpanel-restore'],
            label: 'Restore & Pulihkan Data',
            icon: RotateCcw,
          },
        ],
      },
      {
        key: 'reseller_finance',
        title: 'Branding & Keuangan',
        items: [
          {
            id: 'whitelabel',
            aliases: ['branding'],
            label: 'White-Label Branding',
            icon: Palette,
          },
          {
            id: 'billing',
            aliases: ['invoices'],
            label: 'Billing & Invoice',
            icon: CreditCard,
          },
          {
            id: 'security',
            label: 'Aktivitas & Keamanan',
            icon: Shield,
          },
        ],
      },
    ],
    []
  );

  const customerGroups: NavMenuGroup[] = useMemo(
    () => [
      {
        key: 'customer_overview',
        title: 'Ringkasan & Cloud',
        items: [
          {
            id: 'cpanel-dashboard',
            aliases: ['customer-dashboard'],
            label: 'Ringkasan Akun',
            icon: LayoutDashboard,
          },
          {
            id: 'vps',
            label: 'Dedicated VPS Cloud',
            icon: Cpu,
          },
        ],
      },
      {
        key: 'customer_domains',
        title: 'Domain, SSL & DNS',
        items: [
          {
            id: 'domains',
            aliases: ['cpanel-domains', 'subdomains'],
            label: 'Domain & Subdomain',
            icon: Globe,
          },
          {
            id: 'ssl',
            aliases: ['cpanel-ssl'],
            label: "SSL Let's Encrypt",
            icon: Lock,
          },
          {
            id: 'dns-zones',
            aliases: ['cpanel-dns'],
            label: 'DNS Zone Editor',
            icon: Globe,
          },
        ],
      },
      {
        key: 'customer_apps',
        title: 'Berkas, Basis Data & Engine',
        items: [
          {
            id: 'file-manager',
            aliases: ['cpanel-files'],
            label: 'File Manager',
            icon: FolderOpen,
          },
          {
            id: 'website-cloner',
            aliases: ['cloner'],
            label: 'Kloning & Deploy Web',
            icon: Sparkles,
          },
          {
            id: 'databases',
            aliases: ['cpanel-database'],
            label: 'Basis Data MySQL',
            icon: Database,
          },
          {
            id: 'media-storage',
            aliases: ['cpanel-media'],
            label: 'Media & Cloudflare R2',
            icon: Cloud,
          },
          {
            id: 'php-selector',
            aliases: ['cpanel-php'],
            label: 'PHP Selector & Ext',
            icon: Cpu,
          },
          {
            id: 'cron-jobs',
            aliases: ['cpanel-cron'],
            label: 'Cron Jobs Otomasi',
            icon: Clock,
          },
          {
            id: 'emails',
            aliases: ['cpanel-email'],
            label: 'Email & Webmail',
            icon: Mail,
          },
        ],
      },
      {
        key: 'customer_storage_billing',
        title: 'Penyimpanan & Tagihan',
        items: [
          {
            id: 'disk-usage',
            aliases: ['cpanel-disk'],
            label: 'Disk Usage & Analisa',
            icon: HardDrive,
          },
          {
            id: 'disk-cleaner',
            aliases: ['cleaner', 'cpanel-cleaner'],
            label: 'Disk Cleaner (Pembersih)',
            icon: Trash2,
          },
          {
            id: 'backups',
            aliases: ['backup', 'cpanel-backup', 'cpanel-backups'],
            label: 'Backup Website (.ZIP)',
            icon: Archive,
          },
          {
            id: 'restore',
            aliases: ['cpanel-restore'],
            label: 'Restore & Pulihkan Data',
            icon: RotateCcw,
          },
          {
            id: 'billing',
            aliases: ['invoices'],
            label: 'Tagihan & Invoicing',
            icon: CreditCard,
          },
          {
            id: 'security',
            label: 'Audit Keamanan Akun',
            icon: Shield,
          },
        ],
      },
    ],
    []
  );

  const activeRoleGroups = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return adminGroups;
    if (currentUser.role === 'reseller') return resellerGroups;
    return customerGroups;
  }, [currentUser?.role, adminGroups, resellerGroups, customerGroups]);

  const isTabActive = (tabId: string, aliases: string[] = []) => {
    return currentTab === tabId || aliases.includes(currentTab);
  };

  // Automatically expand group containing active tab
  useEffect(() => {
    for (const grp of activeRoleGroups) {
      if (grp.items.some(item => isTabActive(item.id, item.aliases))) {
        setOpenSections(prev => (prev[grp.key] ? prev : { ...prev, [grp.key]: true }));
        break;
      }
    }
  }, [currentTab, currentUser?.role]);

  // Global keyboard shortcut: Ctrl+K or '/' focuses search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Lock body scroll ONLY on mobile drawer (<1024px)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isOpen && window.innerWidth < 1024) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || '';
      };
    }
  }, [isOpen]);

  // Close mobile sidebar with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCloseMobile]);

  if (!currentUser) return null;

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const areAllCurrentGroupsOpen = activeRoleGroups.every(g => openSections[g.key]);
  const toggleAllGroups = () => {
    const nextState = !areAllCurrentGroupsOpen;
    const updated: Record<string, boolean> = { ...openSections };
    activeRoleGroups.forEach(g => {
      updated[g.key] = nextState;
    });
    setOpenSections(updated);
  };

  // White-label dynamic branding
  const brandName = currentResellerProfile?.brandName || 'Cloud PRO';
  const themeColor = currentResellerProfile?.themeColor || '#0284c7';
  const panelDomain = currentResellerProfile?.panelDomain || 'panel.cloudpro.net';

  const handleNav = (tabId: string) => {
    onSelectTab(tabId);
    onCloseMobile();
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredGroups = activeRoleGroups
    .map(group => {
      if (!normalizedQuery) return group;
      const matchingItems = group.items.filter(
        item =>
          item.label.toLowerCase().includes(normalizedQuery) ||
          group.title.toLowerCase().includes(normalizedQuery)
      );
      return { ...group, items: matchingItems };
    })
    .filter(group => group.items.length > 0);

  const primaryServer = servers && servers.length > 0 ? servers[0] : null;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-xs lg:hidden cursor-pointer"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[100] flex h-dvh max-h-dvh w-72 flex-col border-r border-slate-800/90 bg-slate-950 text-slate-300 shadow-2xl transition-transform duration-300 ease-in-out lg:w-64 lg:translate-x-0 ${
          isOpen
            ? 'translate-x-0 pointer-events-auto'
            : '-translate-x-full pointer-events-none lg:translate-x-0 lg:pointer-events-auto'
        }`}
      >
        {/* Top Brand Lockup with Glowing Accent */}
        <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/95 px-4 backdrop-blur-md">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
          
          {/* Official Cloud PRO Master Brand (Permanently locked across all roles, desktop & mobile) */}
          <CloudProLogo
            variant="compact"
            size="md"
            cloudTextColor="text-white"
            showSubtitle={true}
            subtitleText="ENTERPRISE CLOUD PANEL"
          />

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            onTouchEnd={e => {
              e.preventDefault();
              onCloseMobile();
            }}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer touch-manipulation active:scale-95 transition-all"
            aria-label="Tutup Menu"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Live Node Telemetry Pulse & User Role Badge */}
        <div className="border-b border-slate-800/80 bg-slate-900/40 px-3.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <div className="min-w-0 leading-tight">
                <div className="text-[11px] font-bold text-slate-200 truncate">
                  {currentUser.name || 'Administrator'}
                </div>
                <div className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                  <span>● {currentUser.role === 'admin' ? `Node: ${primaryServer?.hostname || 'denbaguse.my.id'}` : 'Cluster: Cloud PRO Edge'}</span>
                </div>
              </div>
            </div>
            <span className="shrink-0 rounded-md border border-sky-500/35 bg-sky-500/15 px-2 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider text-sky-300">
              {currentUser.role === 'admin'
                ? 'ROOT ADMIN'
                : currentUser.role === 'reseller'
                ? 'WHM RESELLER'
                : 'CPANEL USER'}
            </span>
          </div>
        </div>

        {/* Search Bar with Keyboard Shortcut Indicator & Collapse Toggle */}
        <div className="border-b border-slate-800/80 bg-slate-950 px-3.5 py-2">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari modul..."
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 pl-8 pr-12 py-1.5 text-[11px] text-slate-200 placeholder-slate-500 focus:border-sky-500/60 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-500 hover:text-slate-300 cursor-pointer"
                    title="Bersihkan pencarian"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block rounded border border-slate-700 bg-slate-800 px-1 font-mono text-[8px] text-slate-400 select-none">
                    Ctrl+K
                  </kbd>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleAllGroups}
              title={areAllCurrentGroupsOpen ? 'Ringkas semua grup menu' : 'Buka semua grup menu'}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-slate-400 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Architectural Tree-Line Navigation Menu (Executive High-Contrast Sapphire & Obsidian) */}
        <nav
          className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 text-xs font-medium scrollbar-thin scrollbar-thumb-slate-800 touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {filteredGroups.length === 0 ? (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-center text-[11px] text-slate-400">
              Modul <strong>&ldquo;{searchQuery}&rdquo;</strong> tidak ditemukan.
            </div>
          ) : (
            filteredGroups.map(group => {
              const isOpenGroup = normalizedQuery ? true : !!openSections[group.key];
              const hasActiveChild = group.items.some(item =>
                isTabActive(item.id, item.aliases)
              );

              return (
                <div key={group.key} className="space-y-1">
                  {/* Group Header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(group.key)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[10px] font-extrabold uppercase tracking-[0.08em] transition-colors cursor-pointer select-none touch-manipulation group ${
                      hasActiveChild
                        ? 'text-slate-200 bg-slate-900/80 border border-slate-800/60'
                        : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 transition-colors ${
                          hasActiveChild
                            ? 'bg-sky-400 ring-2 ring-sky-400/25'
                            : 'bg-slate-600 group-hover:bg-slate-400'
                        }`}
                      />
                      <span className="truncate">{group.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[9px] text-slate-500 group-hover:text-slate-400">
                        {group.items.length}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 group-hover:text-slate-300 ${
                          isOpenGroup ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Group Items with Architectural Tree-Line */}
                  {isOpenGroup && (
                    <div className="ml-3 border-l border-slate-800/90 pl-2 space-y-0.5">
                      {group.items.map(item => {
                        const Icon = item.icon;
                        const active = isTabActive(item.id, item.aliases);

                        const itemContent = (
                          <>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all ${
                                  active
                                    ? 'border-sky-500/50 bg-sky-500/20 text-sky-300 shadow-xs ring-1 ring-sky-500/20'
                                    : 'border-slate-800/90 bg-slate-900/60 text-slate-400 group-hover:border-slate-700 group-hover:bg-slate-800/90 group-hover:text-sky-400'
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="truncate font-medium">{item.label}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.badge && (
                                <span
                                  className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold border ${
                                    active
                                      ? 'border-sky-500/40 bg-sky-500/20 text-sky-200'
                                      : 'border-slate-700/80 bg-slate-800/80 text-slate-400 group-hover:text-slate-300'
                                  }`}
                                >
                                  {item.badge.text}
                                </span>
                              )}
                              {active && (
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-xs shadow-sky-400/80" />
                              )}
                            </div>
                          </>
                        );

                        if (item.externalHref) {
                          return (
                            <a
                              key={item.id}
                              href={item.externalHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-slate-300 hover:bg-slate-900/80 hover:text-white transition-all cursor-pointer touch-manipulation"
                              title="Buka Direct Web Terminal Linux Shell"
                            >
                              {itemContent}
                            </a>
                          );
                        }

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNav(item.id)}
                            className={`group flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-all cursor-pointer touch-manipulation active:scale-[0.98] ${
                              active
                                ? 'bg-gradient-to-r from-sky-500/25 via-sky-500/10 to-transparent text-white font-semibold ring-1 ring-sky-500/40 shadow-xs'
                                : 'text-slate-300 hover:bg-slate-900/80 hover:text-white active:bg-slate-900'
                            }`}
                          >
                            {itemContent}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Live Server Telemetry Gauge (CPU / RAM / Disk) */}
        <div className="border-t border-slate-800/80 bg-slate-900/60 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Activity className="h-3 w-3 text-sky-400" /> Beban Server Node
            </span>
            <span className="font-mono text-[9px] text-emerald-400">12ms · Normal</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            <div className="rounded-md border border-slate-800/90 bg-slate-950/80 p-1 text-center">
              <div className="text-[8px] uppercase tracking-wider text-slate-500">CPU</div>
              <div className="font-mono text-[10px] font-bold text-sky-400">14%</div>
            </div>
            <div className="rounded-md border border-slate-800/90 bg-slate-950/80 p-1 text-center">
              <div className="text-[8px] uppercase tracking-wider text-slate-500">RAM</div>
              <div className="font-mono text-[10px] font-bold text-emerald-400">2.8G</div>
            </div>
            <div className="rounded-md border border-slate-800/90 bg-slate-950/80 p-1 text-center">
              <div className="text-[8px] uppercase tracking-wider text-slate-500">DISK</div>
              <div className="font-mono text-[10px] font-bold text-amber-400">18G</div>
            </div>
          </div>
        </div>

        {/* Compact Executive Portal Switcher & Logout Dock */}
        <div className="border-t border-slate-800/90 bg-slate-950 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Mode Portal
            </span>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-400 hover:border-rose-500/40 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
              title="Keluar / Logout Akun"
            >
              <LogOut className="h-3 w-3" />
              <span>Logout</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-800/90 bg-slate-900/90 p-1">
            <button
              type="button"
              onClick={() => {
                switchRole('admin');
                handleNav('dashboard');
              }}
              className={`rounded-lg py-1.5 text-center font-mono text-[10px] transition-all cursor-pointer touch-manipulation active:scale-95 ${
                currentUser.role === 'admin'
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              ROOT
            </button>
            <button
              type="button"
              onClick={() => {
                switchRole('reseller');
                handleNav('reseller-dashboard');
              }}
              className={`rounded-lg py-1.5 text-center font-mono text-[10px] transition-all cursor-pointer touch-manipulation active:scale-95 ${
                currentUser.role === 'reseller'
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              WHM
            </button>
            <button
              type="button"
              onClick={() => {
                switchRole('customer');
                handleNav('customer-dashboard');
              }}
              className={`rounded-lg py-1.5 text-center font-mono text-[10px] transition-all cursor-pointer touch-manipulation active:scale-95 ${
                currentUser.role === 'customer'
                  ? 'bg-sky-600 text-white font-bold shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              CPANEL
            </button>
          </div>

          {/* Android & Mobile Accessible Git Commit Version Badge (Permanently placed in sidebar navigation) */}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-git-commit-modal'));
            }}
            title="Klik untuk melihat Status Commit & Verifikasi Integritas Server"
            className="flex w-full items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-2 py-1.5 text-[10px] font-mono text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 text-slate-300">
              <GitBranch className="h-3 w-3 text-emerald-400" />
              <span>Git:</span>
              <strong className="text-emerald-400">{commitHash}</strong>
            </span>
            <span className="flex items-center gap-1 text-[9px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>vps-sync</span>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
