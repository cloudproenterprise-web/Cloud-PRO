import React, { useState } from 'react';
import {
  FolderOpen,
  Database,
  Mail,
  Globe,
  Lock,
  Cpu,
  Clock,
  Archive,
  Cloud,
  HardDrive,
  Trash2,
  RotateCcw,
  ExternalLink,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';
import { WebsitePreviewModal } from '../hosting/WebsitePreviewModal';

interface CustomerDashboardProps {
  onNavigate: (tab: string) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { accounts } = useServer();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!currentUser) return null;

  // Find customer's primary hosting account (strictly isolated from Root Admin and Reseller accounts)
  const customerAccount =
    accounts.find(
      a =>
        (a.customerId === currentUser.id ||
          a.username === currentUser.username ||
          a.customerEmail === currentUser.email) &&
        a.id !== 'acc-rdm-01' &&
        a.primaryDomain?.toLowerCase() !== 'denbaguse.my.id' &&
        !a.resellerId &&
        !a.primaryDomain.includes('reseller') &&
        !a.primaryDomain.includes('mitrahosting')
    ) ||
    accounts.find(a => a.id === 'acc-school-02') ||
    accounts.find(a => a.id !== 'acc-rdm-01' && a.primaryDomain?.toLowerCase() !== 'denbaguse.my.id') ||
    {
      id: 'acc-school-02',
      primaryDomain: 'client.denbaguse.my.id',
      domain: 'client.denbaguse.my.id',
      username: currentUser.username || 'pelanggan',
      customerId: currentUser.id,
      customerName: currentUser.name || 'Pelanggan Hosting cPanel',
      customerEmail: currentUser.email || 'pelanggan@denbaguse.my.id',
      serverId: 'srv-id-01',
      serverName: 'ID-Cyber-01 (Jakarta)',
      planId: 'plan-starter',
      planName: 'Cloud Starter NVMe',
      diskUsedMb: 1,
      diskLimitMb: 10240,
      bandwidthUsedMb: 50,
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
      nameservers: ['ns1.cloudpro.id', 'ns2.cloudpro.id'],
      createdAt: new Date().toISOString(),
    };

  if (!customerAccount) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500">
          Belum ada akun hosting aktif untuk profil pelanggan ini.
        </p>
      </div>
    );
  }

  const diskPct = Math.min(
    100,
    Math.round((customerAccount.diskUsedMb / customerAccount.diskLimitMb) * 100)
  );
  const bwPct = Math.min(
    100,
    Math.round((customerAccount.bandwidthUsedMb / customerAccount.bandwidthLimitMb) * 100)
  );

  interface ToolCategory {
    title: string;
    description: string;
    items: {
      id: string;
      title: string;
      desc: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: string;
    }[];
  }

  const toolCategories: ToolCategory[] = [
    {
      title: 'Domain & Keamanan Web',
      description: 'Manajemen nama domain, subdomain aplikasi, dan enkripsi SSL HTTPS',
      items: [
        {
          id: 'domains',
          title: 'Domain & Subdomain',
          desc: 'Tambah subdomain aplikasi, addon domain, dan atur document root.',
          icon: Globe,
        },
        {
          id: 'cpanel-ssl',
          title: "AutoSSL Let's Encrypt",
          desc: 'Penerbitan SSL otomatis 1-klik dan switch paksa HTTPS redirect.',
          icon: Lock,
        },
      ],
    },
    {
      title: 'DNS & Zone Management',
      description: 'Modul mandiri pengatur record DNS (A, AAAA, CNAME, MX, TXT) terpisah dari jaringan',
      items: [
        {
          id: 'cpanel-dns',
          title: 'DNS Zone Editor',
          desc: 'Atur record A, AAAA, CNAME, MX, TXT (SPF/DKIM), dan nameserver.',
          icon: Globe,
          badge: 'Dedicated DNS',
        },
      ],
    },
    {
      title: 'Berkas & Konten Web',
      description: 'Pengelolaan file website, ekstraksi ZIP, kloning instan, dan penyimpanan media',
      items: [
        {
          id: 'cpanel-files',
          title: 'File Manager',
          desc: 'Kelola direktori public_html, edit kode file website, chmod permission.',
          icon: FolderOpen,
        },
        {
          id: 'website-cloner',
          title: 'Kloning & Deploy Web',
          desc: 'Tarik website dari URL, GitHub repository, atau arsip ZIP AI Studio.',
          icon: Sparkles,
        },
        {
          id: 'cpanel-media',
          title: 'Media & Cloudflare R2',
          desc: 'Penyimpanan foto kegiatan terpisah, kompresi otomatis tanpa pecah & egress 0 rupiah.',
          icon: Cloud,
          badge: 'WebP 82%',
        },
      ],
    },
    {
      title: 'Basis Data & MySQL',
      description: 'Pengelolaan database relational MySQL dan konsol phpMyAdmin',
      items: [
        {
          id: 'cpanel-database',
          title: 'MySQL / MariaDB',
          desc: 'Buat database baru, user database, konsol kueri SQL interaktif.',
          icon: Database,
        },
      ],
    },
    {
      title: 'Engine & Runtime Aplikasi',
      description: 'Konfigurasi versi runtime PHP dan penjadwalan eksekusi skrip otomatis',
      items: [
        {
          id: 'cpanel-php',
          title: 'PHP Selector & Ext',
          desc: 'Ganti versi PHP (7.4, 8.0, 8.1, 8.2, 8.3) & toggle modul ekstensi.',
          icon: Cpu,
        },
        {
          id: 'cpanel-cron',
          title: 'Cron Jobs Otomasi',
          desc: 'Jadwalkan eksekusi skrip otomatis berkala (menit, jam, harian).',
          icon: Clock,
        },
      ],
    },
    {
      title: 'Email & Komunikasi',
      description: 'Pembuatan akun email domain bisnis dan akses webmail client',
      items: [
        {
          id: 'cpanel-email',
          title: 'Email & Webmail',
          desc: 'Akun email domain sendiri, forwarder, batas kuota, akses webmail client.',
          icon: Mail,
        },
      ],
    },
    {
      title: 'Penyimpanan & Cadangan',
      description: 'Pemantauan kuota NVMe, pembersih sampah sistem, dan backup/restore arsip ZIP',
      items: [
        {
          id: 'disk-usage',
          title: 'Analisa Penggunaan Disk',
          desc: 'Rincian pemakaian disk per domain/subdomain, folder uploads, dan database.',
          icon: HardDrive,
        },
        {
          id: 'disk-cleaner',
          title: 'Pembersih File Sampah',
          desc: 'Deteksi & bersihkan file sampah sisa instalasi lama (chunk JS/CSS duplikat, crash dump).',
          icon: Trash2,
        },
        {
          id: 'backups',
          title: 'Cadangan Website (.ZIP)',
          desc: 'Buat snapshot cadangan website & database .ZIP lengkap atau terpisah.',
          icon: Archive,
          badge: '.ZIP',
        },
        {
          id: 'restore',
          title: 'Restore Website (.ZIP)',
          desc: 'Pulihkan website dari arsip server, unggahan file .ZIP, atau URL remote.',
          icon: RotateCcw,
        },
      ],
    },
    {
      title: 'Keuangan & Tagihan',
      description: 'Riwayat tagihan, cetak kwitansi lunas, dan informasi paket hosting aktif',
      items: [
        {
          id: 'billing',
          title: 'Tagihan & Bukti Bayar',
          desc: 'Cek tagihan Unpaid, cetak Bukti Pembayaran (Kwitansi Lunas), & perpanjangan.',
          icon: CreditCard,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Account Info Header with 360° Perimeter Gradient Ring */}
      <div className="exec-card-ring relative overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-lg font-bold text-slate-900">
                {customerAccount.primaryDomain}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase border ${
                  customerAccount.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {customerAccount.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Username:{' '}
              <span className="font-mono text-slate-800 font-semibold">
                {customerAccount.username}
              </span>{' '}
              &bull; Server:{' '}
              <span className="font-mono text-slate-800">
                {customerAccount.serverName} ({customerAccount.ipAddress})
              </span>{' '}
              &bull; Paket: {customerAccount.planName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-500 shadow-xs cursor-pointer transition-colors"
            >
              <span>Kunjungi / Preview Website</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Categorized cPanel Feature Sections */}
      <div className="space-y-6">
        {toolCategories.map((category) => (
          <div key={category.title} className="exec-card-ring rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  {category.title}
                  {category.title.includes('DNS') && (
                    <span className="rounded-md bg-sky-100 text-sky-800 text-[10px] font-mono font-bold px-2 py-0.5">
                      Modul Mandiri
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {category.description}
                </p>
              </div>
              <span className="hidden sm:inline-flex rounded-lg bg-slate-100 border border-slate-200/80 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                {category.items.length} Fitur
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {category.items.map(tool => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => onNavigate(tool.id)}
                    className="exec-tile-ring group flex flex-col items-start rounded-xl p-4 text-left cursor-pointer transition-all active:scale-98"
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="rounded-xl bg-white p-2.5 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      {tool.badge && (
                        <span className="rounded-md bg-sky-50 border border-sky-200/80 px-2 py-0.5 font-mono text-[9px] font-bold text-sky-700">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="mt-3 text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                      {tool.title}
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{tool.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Account Resource & Technical Specifications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Resource Usage Gauges */}
        <div className="exec-card-ring rounded-2xl p-5 sm:p-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-4">
            Penggunaan Resource Akun Hosting
          </h3>

          <div className="space-y-4 font-mono text-xs">
            {/* Disk */}
            <div>
              <div className="flex justify-between text-slate-700 mb-1.5">
                <span>Disk Space NVMe</span>
                <span className="font-semibold tabular-nums">
                  {customerAccount.diskUsedMb} MB / {customerAccount.diskLimitMb} MB ({diskPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    diskPct > 85 ? 'bg-rose-500' : 'bg-gradient-to-r from-sky-600 to-sky-400'
                  }`}
                  style={{ width: `${Math.max(4, diskPct)}%` }}
                />
              </div>
            </div>

            {/* Bandwidth */}
            <div>
              <div className="flex justify-between text-slate-700 mb-1.5">
                <span>Bandwidth Bulanan</span>
                <span className="font-semibold tabular-nums">
                  {(customerAccount.bandwidthUsedMb / 1024).toFixed(1)} GB /{' '}
                  {(customerAccount.bandwidthLimitMb / 1024).toFixed(1)} GB ({bwPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-slate-700 to-sky-500"
                  style={{ width: `${Math.max(4, bwPct)}%` }}
                />
              </div>
            </div>

            {/* CPU & Inodes Limit */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <span className="text-[11px] text-slate-400">Batas CPU Dedicated</span>
                <div className="font-semibold text-slate-800">100% (1 Full Core)</div>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Batas RAM Physical</span>
                <div className="font-semibold text-slate-800">1024 MB</div>
              </div>
            </div>
          </div>
        </div>

        {/* Server & Connection Information */}
        <div className="exec-card-ring rounded-2xl p-5 sm:p-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-4">
            Informasi Teknis &amp; Konektivitas
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Shared IP Address</span>
              <span className="font-mono font-semibold text-slate-900">
                {customerAccount.ipAddress}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Versi PHP Aktif</span>
              <span className="font-mono font-semibold text-slate-900">
                PHP {customerAccount.phpVersion}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Status SSL Certificate</span>
              <span className="font-mono font-semibold text-emerald-700">
                {customerAccount.sslProvider} (Aktif)
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Nameserver 1 &amp; 2</span>
              <span className="font-mono text-slate-700">
                {customerAccount.nameservers && customerAccount.nameservers.length >= 2
                  ? `${customerAccount.nameservers[0]} • ${customerAccount.nameservers[1]}`
                  : 'ns1.denbaguse.my.id • ns2.denbaguse.my.id'}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Direktori Dokumen Web</span>
              <span className="font-mono text-slate-700">
                /home/{customerAccount.username}/public_html
              </span>
            </div>
          </div>
        </div>
      </div>

      <WebsitePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        account={customerAccount}
        initialDomain={customerAccount.primaryDomain}
        onOpenFileManager={() => onNavigate('cpanel-files')}
      />
    </div>
  );
};
