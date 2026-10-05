import React from 'react';
import {
  LayoutDashboard,
  Server,
  Globe,
  Users,
  Terminal,
  Layers,
  ShieldCheck,
  Code2,
  Lock,
  Cpu,
  Activity,
  FolderOpen,
  Database,
  Mail,
  CreditCard,
  Palette,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { CloudProLogo } from '../common/CloudProLogo';
import { useAuth } from '../../context/AuthContext';

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'admin';

  const adminLinks = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      desc: 'Ringkasan & Metrik',
    },
    {
      id: 'servers',
      label: 'Server Nodes',
      icon: Server,
      desc: 'Cluster Daemons',
    },
    {
      id: 'hosting-accounts',
      label: 'Hosting Accounts',
      icon: Globe,
      desc: 'Virtual Hosts & vHost',
    },
    {
      id: 'resellers',
      label: 'Mitra Reseller',
      icon: Users,
      desc: 'Multi-Tenant RBAC',
    },
    {
      id: 'tailscale-mesh',
      label: 'Tailscale SSH',
      icon: Terminal,
      desc: 'Remote SSH Mesh',
      hasBadge: true,
    },
    {
      id: 'billing',
      label: 'Billing & Invoice',
      icon: CreditCard,
      desc: 'Unpaid & Bukti Bayar',
    },
    {
      id: 'security',
      label: 'Keamanan & SSL',
      icon: ShieldCheck,
      desc: 'Firewall & ZeroSSL',
    },
    {
      id: 'api-docs',
      label: 'REST API Docs',
      icon: Code2,
      desc: 'Developer Endpoints',
    },
  ];

  const resellerLinks = [
    {
      id: 'reseller-dashboard',
      label: 'Dashboard Reseller',
      icon: LayoutDashboard,
      desc: 'Kuota & Statistik',
    },
    {
      id: 'hosting-accounts',
      label: 'Akun Hosting Klien',
      icon: Globe,
      desc: 'vHost Klien Reseller',
    },
    {
      id: 'customers',
      label: 'Pelanggan Saya',
      icon: Users,
      desc: 'Direktori Klien',
    },
    {
      id: 'domains',
      label: 'Domain & Subdomain',
      icon: Globe,
      desc: 'Kelola Domain Klien',
    },
    {
      id: 'plans',
      label: 'Paket Hosting',
      icon: Layers,
      desc: 'Atur Harga & Kuota',
    },
    {
      id: 'billing',
      label: 'Billing & Kwitansi',
      icon: CreditCard,
      desc: 'Unpaid & Bukti Bayar',
      hasBadge: true,
    },
    {
      id: 'whitelabel',
      label: 'White-Label Brand',
      icon: Palette,
      desc: 'Kustomisasi Panel',
    },
    {
      id: 'nameservers',
      label: 'Private Nameserver',
      icon: Server,
      desc: 'NS1 & NS2 Brand',
    },
  ];

  const customerLinks = [
    {
      id: 'customer-dashboard',
      label: 'Ringkasan cPanel',
      icon: LayoutDashboard,
      desc: 'Status Hosting',
    },
    {
      id: 'file-manager',
      label: 'File Manager',
      icon: FolderOpen,
      desc: 'Kelola public_html',
    },
    {
      id: 'databases',
      label: 'MySQL & phpMyAdmin',
      icon: Database,
      desc: 'Database & SQL',
    },
    {
      id: 'domains',
      label: 'Domain & Subdomain',
      icon: Globe,
      desc: 'Subdomain & Addon',
    },
    {
      id: 'website-cloner',
      label: 'Kloning Website',
      icon: Sparkles,
      desc: 'Deploy Web / ZIP',
      hasBadge: true,
    },
    {
      id: 'emails',
      label: 'Email & Webmail',
      icon: Mail,
      desc: 'Kotak Surat Domain',
    },
    {
      id: 'ssl',
      label: "SSL Let's Encrypt",
      icon: Lock,
      desc: 'Sertifikat HTTPS',
    },
    {
      id: 'billing',
      label: 'Tagihan & Kwitansi',
      icon: CreditCard,
      desc: 'Unpaid & Bukti Bayar',
    },
  ];

  const quickLinks =
    role === 'admin' ? adminLinks : role === 'reseller' ? resellerLinks : customerLinks;

  return (
    <footer
      id="cloudpro-main-footer"
      className="exec-card-ring relative overflow-hidden mt-12 mb-16 lg:mb-4 rounded-2xl text-slate-600 transition-all"
    >
      <div className="p-5 sm:p-7">
        {/* Top Header: Brand Identity & Telemetri Realtime */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <CloudProLogo
                size="md"
                variant="full"
                showSubtitle={true}
                cloudTextColor="text-slate-900"
                brandSuffix="Enterprise"
              />
              <span className="rounded-md bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 border border-slate-200/90">
                v2.6.4
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              Enterprise Linux Bare-Metal &amp; Cloud Hypervisor Panel dengan isolasi multi-tenant,
              WireGuard mesh network, BIND9 cluster terdistribusi, dan otomasi web server performa
              tinggi.
            </p>
          </div>

          {/* Live Cluster Badge Card */}
          <div className="exec-tile-ring rounded-xl p-3.5 shrink-0">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-slate-800">Cluster Status:</span>
                <span className="font-mono text-emerald-700 font-bold">100% Operational</span>
              </div>
              <span className="font-mono text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                99.99% Uptime
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 font-mono">
              <span>
                Primary Node:{' '}
                <strong className="text-slate-800 font-semibold">desktop-djq024c</strong>
              </span>
              <span>&bull;</span>
              <span className="text-sky-700 font-semibold">WireGuard Mesh Active</span>
            </div>
          </div>
        </div>

        {/* Middle Section: Cohesive Executive Navigation Grid */}
        <div className="py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Pusat Navigasi &amp; Kontrol Panel
            </span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 rounded-lg">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-medium text-[11px]">
                ZeroSSL &bull; Let&apos;s Encrypt Auto-Renewal
              </span>
            </div>
          </div>

          {/* Minimalist Grid: 2-Column on Mobile, 4-Column on Desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
            {quickLinks.map(link => {
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  onClick={() => onNavigate && onNavigate(link.id)}
                  className="exec-tile-ring group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200/90 text-sky-600 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-colors shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-sky-700 truncate transition-colors">
                        {link.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate leading-tight">
                        {link.desc}
                      </div>
                    </div>
                  </div>
                  {link.hasBadge && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Modern Architecture Chips & Copyright */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()}{' '}
            <strong className="text-slate-800 font-semibold">Karsa Cloud PRO</strong>. Seluruh
            hak cipta dilindungi.
          </div>

          {/* Iconic Engine Badges */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10.5px]">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700">
              <Cpu className="h-3 w-3 text-sky-600" />
              <span>Linux KVM</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700">
              <Activity className="h-3 w-3 text-sky-600" />
              <span>Nginx Engine</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700">
              <Lock className="h-3 w-3 text-sky-600" />
              <span>WireGuard Mesh</span>
            </span>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-git-commit-modal'));
              }}
              title="Status Commit & Versi Git Server"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <GitBranch className="h-3 w-3 text-emerald-600" />
              <span>Git Synced</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
