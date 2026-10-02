import React, { useState } from 'react';
import {
  HardDrive,
  Globe,
  Database,
  Mail,
  PlusCircle,
  CreditCard,
  Palette,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Trash2,
  Ban,
  FolderOpen,
  Lock,
  Cpu,
  Clock,
  Archive,
  Cloud,
  Sparkles,
  Wrench,
  Edit3,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';
import { CloudProApi } from '../../services/api';
import { db } from '../../services/storage';
import { HostingAccount } from '../../types';

interface ResellerDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenCreateAccount: () => void;
}

export const ResellerDashboard: React.FC<ResellerDashboardProps> = ({
  onNavigate,
  onOpenCreateAccount,
}) => {
  const { currentUser, currentResellerProfile, updateCurrentUser, saveWhiteLabel } = useAuth();
  const { accounts, activeAccount, setActiveAccount, showToast, refreshAll, confirmAction } =
    useServer();

  if (!currentUser) return null;

  const [topupAmount, setTopupAmount] = useState<number>(50);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit Reseller Profile & Account Modal State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editResellerName, setEditResellerName] = useState(currentUser.name);
  const [editResellerBrand, setEditResellerBrand] = useState(
    currentResellerProfile?.brandName || currentUser.name
  );
  const [editResellerEmail, setEditResellerEmail] = useState(currentUser.email);
  const [editResellerDomain, setEditResellerDomain] = useState(
    currentResellerProfile?.primaryDomain ||
      currentResellerProfile?.panelDomain?.replace(/^panel\./i, '') ||
      'mitrahosting.my.id'
  );
  const [editResellerPhone, setEditResellerPhone] = useState(
    currentUser.phone || '+62 812-2673-8883'
  );

  const handleOpenEditResellerProfile = () => {
    setEditResellerName(currentUser.name);
    setEditResellerBrand(currentResellerProfile?.brandName || currentUser.name);
    setEditResellerEmail(currentUser.email);
    setEditResellerDomain(
      currentResellerProfile?.primaryDomain ||
        currentResellerProfile?.panelDomain?.replace(/^panel\./i, '') ||
        'mitrahosting.my.id'
    );
    setEditResellerPhone(currentUser.phone || '+62 812-2673-8883');
    setShowEditProfileModal(true);
  };

  const handleSaveResellerProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDom = editResellerDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^panel\./, '');
    const finalName = editResellerName.trim() || currentUser.name;
    const finalBrand = editResellerBrand.trim() || finalName;
    const finalEmail = editResellerEmail.trim() || currentUser.email;

    updateCurrentUser({
      name: finalName,
      email: finalEmail,
      phone: editResellerPhone.trim() || '+62 812-2673-8883',
      companyName: finalBrand,
    });

    saveWhiteLabel({
      brandName: finalBrand,
      companyName: finalBrand,
      primaryDomain: cleanDom,
      panelDomain: `panel.${cleanDom}`,
      supportEmail: finalEmail,
      nameserver1: `ns1.${cleanDom}`,
      nameserver2: `ns2.${cleanDom}`,
    });

    const ownAcc = accounts.find(
      a =>
        a.id === `acc-own-${currentUser.id}` ||
        (a.resellerId === currentUser.id && a.customerId === currentUser.id)
    );
    if (ownAcc) {
      db.saveHostingAccount({
        ...ownAcc,
        primaryDomain: cleanDom,
        domain: cleanDom,
        customerName: `${finalName} (${finalBrand})`,
        customerEmail: finalEmail,
      });
    }

    setShowEditProfileModal(false);
    refreshAll();
    showToast(
      'success',
      'Profil & Akun Reseller Diperbarui',
      `Identitas "${finalName}" (${finalBrand} • ${cleanDom}) telah disinkronkan dengan Cloud PRO.`
    );
  };

  // Filter accounts belonging to this reseller (excluding root server account)
  const resellerAccounts = accounts.filter(
    a =>
      a.resellerId === currentUser.id &&
      a.id !== 'acc-rdm-01' &&
      a.primaryDomain.toLowerCase() !== 'denbaguse.my.id'
  );

  const selectedClientAccount =
    activeAccount && resellerAccounts.some(a => a.id === activeAccount.id)
      ? activeAccount
      : resellerAccounts[0] || null;

  const handleOpenTool = (tabId: string) => {
    if (selectedClientAccount) {
      setActiveAccount(selectedClientAccount);
    }
    onNavigate(tabId);
  };

  // Quotas from profile
  const maxAccounts = currentResellerProfile?.maxAccounts || 50;
  const allocatedDiskMb = currentResellerProfile?.allocatedDiskMb || 100000;
  const allocatedBwMb = currentResellerProfile?.allocatedBandwidthMb || 1000000;

  const usedDiskMb = resellerAccounts.reduce((acc, a) => acc + a.diskUsedMb, 0);
  const usedBwMb = resellerAccounts.reduce((acc, a) => acc + a.bandwidthUsedMb, 0);

  const handleTopup = async () => {
    setIsProcessing(true);
    try {
      await CloudProApi.topupCredit(currentUser.id, topupAmount, currentUser);
      showToast(
        'success',
        'Top-up Berhasil',
        `Saldo kredit $${topupAmount.toFixed(2)} berhasil ditambahkan.`
      );
      setShowTopupModal(false);
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Top-up', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSuspendClient = async (acc: HostingAccount) => {
    try {
      if (acc.status === 'active') {
        await CloudProApi.suspendAccount(acc.id, 'Ditangguhkan oleh Reseller', currentUser);
        showToast('warning', 'Akun Klien Ditangguhkan', `${acc.primaryDomain} berhasil di-suspend.`);
      } else {
        await CloudProApi.unsuspendAccount(acc.id, currentUser);
        showToast('success', 'Akun Klien Diaktifkan', `${acc.primaryDomain} kembali aktif.`);
      }
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Mengubah Status', err.message);
    }
  };

  const handleDeleteClientAccount = (acc: HostingAccount) => {
    confirmAction({
      title: 'Hapus Permanen Klien & Akun Hosting',
      message: `PERINGATAN: Anda akan menghapus permanen klien "${acc.customerName || acc.username}" beserta domain "${acc.primaryDomain}", file website, database, dan email.\n\nTindakan ini tidak dapat dibatalkan. Lanjutkan penghapusan?`,
      confirmText: 'Hapus Klien Permanen',
      isDanger: true,
      onConfirm: async () => {
        try {
          await CloudProApi.terminateAccount(acc.id, currentUser);
          refreshAll();
          showToast(
            'info',
            'Klien & Hosting Dihapus',
            `Akun klien ${acc.primaryDomain} telah dihapus permanen.`
          );
        } catch (err: any) {
          showToast('error', 'Gagal Menghapus Klien', err.message);
        }
      },
    });
  };

  const resellerTools = [
    {
      id: 'accounts',
      title: 'Akun Hosting (vHosts)',
      desc: 'Kelola domain utama layanan dan direktori akun virtual host pelanggan.',
      icon: Globe,
      badge: 'cPanel',
      directNav: true,
    },
    {
      id: 'file-manager',
      title: 'File Manager Web',
      desc: 'Kelola direktori public_html klien, upload & ekstrak ZIP, edit file kode.',
      icon: FolderOpen,
    },
    {
      id: 'media-storage',
      title: 'Cloudflare R2 & Media',
      desc: 'Object storage R2 otomatis terkoneksi ke domain website klien & kompresi WebP.',
      icon: Cloud,
      badge: 'Auto-Domain',
    },
    {
      id: 'databases',
      title: 'MySQL & phpMyAdmin',
      desc: 'Buat database MySQL/MariaDB, kelola user, dan buka konsol phpMyAdmin.',
      icon: Database,
    },
    {
      id: 'domains',
      title: 'Domain & Subdomain',
      desc: 'Kelola domain utama klien, tambah subdomain aplikasi, dan document root.',
      icon: Globe,
    },
    {
      id: 'website-cloner',
      title: 'Kloning & Deploy Web',
      desc: 'Tarik dan deploy website dari URL publik, GitHub repo, atau ZIP AI Studio.',
      icon: Sparkles,
    },
    {
      id: 'ssl',
      title: "AutoSSL Let's Encrypt",
      desc: 'Terbitkan sertifikat SSL/TLS gratis 1-klik dan pengalihan Force HTTPS.',
      icon: Lock,
    },
    {
      id: 'php-selector',
      title: 'PHP Selector & Ext',
      desc: 'Atur versi PHP (7.4 - 8.3) dan aktifkan ekstensi ionCube Loader, cURL, GD.',
      icon: Cpu,
    },
    {
      id: 'dns-zones',
      title: 'DNS Zone Editor',
      desc: 'Kelola record DNS A, AAAA, CNAME, MX, dan TXT (SPF/DKIM) domain klien.',
      icon: Globe,
    },
    {
      id: 'emails',
      title: 'Email & Webmail',
      desc: 'Buat kotak surat email domain klien, forwarder, dan akses webmail.',
      icon: Mail,
    },
    {
      id: 'backups',
      title: 'Backup & 1-Click Restore',
      desc: 'Cadangkan penuh file website & database klien serta pemulihan instan.',
      icon: Archive,
    },
    {
      id: 'cron-jobs',
      title: 'Cron Jobs Otomasi',
      desc: 'Jadwalkan eksekusi skrip PHP/CLI berkala secara otomatis untuk klien.',
      icon: Clock,
    },
    {
      id: 'billing',
      title: 'Billing & Invoice Klien',
      desc: 'Terbitkan tagihan otomatis/manual, atur Kop & Rekening, serta cetak Kwitansi Lunas.',
      icon: CreditCard,
      badge: 'INVOICE & KOP',
      directNav: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Reseller Header & Balance with 360° Perimeter Gradient Ring */}
      <div className="exec-card-ring relative overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {currentResellerProfile?.customLogoUrl ? (
              <img
                src={currentResellerProfile.customLogoUrl}
                alt={currentResellerProfile.brandName}
                className="h-12 w-12 shrink-0 rounded-xl object-contain border border-slate-200 bg-white p-1 shadow-2xs"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sky-400 border border-slate-800 shadow-xs">
                <HardDrive className="h-5 w-5" />
              </div>
            )}
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                <h2 className="text-lg font-bold text-slate-900 truncate">{currentUser.name}</h2>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-sky-700">
                  WHM RESELLER
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="exec-tile-ring rounded-xl px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Identitas Brand
                  </div>
                  <div className="mt-0.5 font-mono text-xs font-bold text-slate-900 truncate">
                    {currentResellerProfile?.brandName || currentUser.name}
                  </div>
                </div>

                <div className="exec-tile-ring rounded-xl px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Domain Utama Layanan
                  </div>
                  <div className="mt-0.5 font-mono text-xs font-bold text-sky-700 truncate">
                    {currentResellerProfile?.primaryDomain ||
                      currentResellerProfile?.panelDomain?.replace(/^panel\./i, '') ||
                      'mitrahosting.my.id'}
                  </div>
                </div>

                <div className="exec-tile-ring rounded-xl px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Email Administrator
                  </div>
                  <div className="mt-0.5 font-mono text-xs font-bold text-slate-700 truncate">
                    {currentUser.email}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="exec-tile-ring rounded-xl px-4 py-2 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Saldo Deposit Reseller
              </div>
              <div className="font-mono text-lg font-extrabold text-slate-900">
                ${(Number(currentUser.creditBalance) || 0).toFixed(2)}
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenEditResellerProfile}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-sky-300 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <Edit3 className="h-4 w-4 text-sky-600" />
              <span>Edit Akun Reseller</span>
            </button>
            <button
              onClick={() => onNavigate('billing')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-sky-300 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <CreditCard className="h-4 w-4 text-sky-600" />
              <span>Billing &amp; Invoice</span>
            </button>
            <button
              onClick={() => setShowTopupModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-sky-500 transition-colors cursor-pointer"
            >
              <CreditCard className="h-4 w-4" />
              <span>Top-up Saldo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resource Quota Allocation Gauges - 2 Columns with 360° Perimeter Gradient Ring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Metric 1: Accounts */}
        <div className="exec-card-ring group relative overflow-hidden rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold text-slate-800">Alokasi Akun Hosting</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/90">
              <Globe className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold tabular-nums text-slate-900">
              {resellerAccounts.length}
            </span>
            <span className="text-xs text-slate-400">/ {maxAccounts} Max</span>
          </div>
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400"
                style={{ width: `${Math.min(100, (resellerAccounts.length / maxAccounts) * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] font-mono text-slate-500">
              <span>{Math.round((resellerAccounts.length / maxAccounts) * 100)}% terpakai</span>
              <span>Sisa: {maxAccounts - resellerAccounts.length} akun</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Disk */}
        <div className="exec-card-ring group relative overflow-hidden rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold text-slate-800">Penyimpanan Disk NVMe</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/90">
              <HardDrive className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold tabular-nums text-slate-900">
              {(usedDiskMb / 1024).toFixed(1)} GB
            </span>
            <span className="text-xs text-slate-400">
              / {(allocatedDiskMb / 1024).toFixed(0)} GB
            </span>
          </div>
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400"
                style={{ width: `${Math.min(100, (usedDiskMb / allocatedDiskMb) * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] font-mono text-slate-500">
              <span>{((usedDiskMb / allocatedDiskMb) * 100).toFixed(1)}% terpakai</span>
              <span>Tersedia: {((allocatedDiskMb - usedDiskMb) / 1024).toFixed(1)} GB</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Bandwidth */}
        <div className="exec-card-ring group relative overflow-hidden rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold text-slate-800">Bandwidth Bulanan</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/90">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold tabular-nums text-slate-900">
              {(usedBwMb / 1024).toFixed(1)} GB
            </span>
            <span className="text-xs text-slate-400">
              / {(allocatedBwMb / (1024 * 1024)).toFixed(1)} TB
            </span>
          </div>
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400"
                style={{ width: `${Math.min(100, (usedBwMb / allocatedBwMb) * 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] font-mono text-slate-500">
              <span>{((usedBwMb / allocatedBwMb) * 100).toFixed(1)}% terpakai</span>
              <span>Reset 1st tiap bulan</span>
            </div>
          </div>
        </div>

        {/* Metric 4: White-Label Status */}
        <div className="exec-card-ring group relative overflow-hidden rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold text-slate-800">White-Label Branding</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/90">
              <Palette className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-base font-bold text-slate-900 truncate">
              {currentResellerProfile?.brandName}
            </div>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 mt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Upstream Provider Hidden</span>
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <button
              onClick={() => onNavigate('whitelabel')}
              className="text-xs font-bold text-sky-600 hover:text-sky-500 cursor-pointer"
            >
              Upload Logo &amp; Branding &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Hosting Tools & Control Center with 360° Perimeter Ring */}
      <div className="exec-card-ring rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/80">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Hosting Tools &amp; Control Center
              </h3>
              <p className="text-xs text-slate-500">
                Pusat kendali cPanel, Cloudflare R2, Database, SSL, dan Domain untuk akun klien Reseller Anda.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {resellerAccounts.length > 0 && selectedClientAccount && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Target Klien:</span>
                <select
                  value={selectedClientAccount.id}
                  onChange={e => {
                    const found = resellerAccounts.find(a => a.id === e.target.value);
                    if (found) setActiveAccount(found);
                  }}
                  className="bg-transparent font-mono text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {resellerAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.primaryDomain} ({acc.username})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigate('accounts')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-700 cursor-pointer transition-colors"
            >
              <Globe className="h-3.5 w-3.5 text-sky-600" />
              <span>Manajemen Akun Hosting</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {resellerTools.map(tool => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => (tool.directNav ? onNavigate(tool.id) : handleOpenTool(tool.id))}
                className="exec-tile-ring group flex flex-col items-start rounded-xl p-4 text-left cursor-pointer"
              >
                <div className="flex w-full items-center justify-between">
                  <div className="rounded-xl bg-white p-2 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  {tool.badge && (
                    <span className="rounded-md bg-sky-50 border border-sky-200/80 px-2 py-0.5 font-mono text-[9px] font-bold text-sky-700">
                      {tool.badge}
                    </span>
                  )}
                </div>
                <h4 className="mt-2.5 text-xs font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                  {tool.title}
                </h4>
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{tool.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Customer Accounts Under This Reseller */}
      <div className="exec-card-ring rounded-2xl overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Akun Hosting Pelanggan Saya
            </h3>
            <p className="text-xs text-slate-500">
              Kelola akses cPanel, suspend akun, atau pantau penggunaan disk/bandwidth
            </p>
          </div>

          <button
            onClick={onOpenCreateAccount}
            className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-500 shadow-xs cursor-pointer transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Buat Akun Hosting Pelanggan</span>
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Domain &amp; Akun</th>
                <th className="px-5 py-3">Pelanggan</th>
                <th className="px-5 py-3">Paket Hosting</th>
                <th className="px-5 py-3">Disk Usage</th>
                <th className="px-5 py-3">Bandwidth</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resellerAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Belum ada akun hosting yang terdaftar di bawah reseller ini. Klik tombol di atas untuk membuat akun pertama Anda.
                  </td>
                </tr>
              ) : (
                resellerAccounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{acc.primaryDomain}</div>
                      <div className="font-mono text-[11px] text-slate-400">
                        user: {acc.username} &bull; PHP {acc.phpVersion}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-slate-800 font-medium">{acc.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{acc.customerEmail}</div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">{acc.planName}</td>
                    <td className="px-5 py-3.5 font-mono">
                      <div>
                        {acc.diskUsedMb} MB / {acc.diskLimitMb} MB
                      </div>
                      <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-sky-600 rounded-full"
                          style={{
                            width: `${Math.min(100, (acc.diskUsedMb / acc.diskLimitMb) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      {(acc.bandwidthUsedMb / 1024).toFixed(1)} GB
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase border ${
                          acc.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setActiveAccount(acc);
                            onNavigate('domains');
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Globe className="h-3 w-3 text-sky-600" />
                          <span>Domain</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveAccount(acc);
                            onNavigate('file-manager');
                          }}
                          className="rounded-lg bg-sky-600 px-2.5 py-1 font-semibold text-white hover:bg-sky-500 inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Buka cPanel</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleToggleSuspendClient(acc)}
                          className={`rounded-lg p-1.5 cursor-pointer ${
                            acc.status === 'active'
                              ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={
                            acc.status === 'active' ? 'Suspend Akun Klien' : 'Aktifkan Akun Klien'
                          }
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClientAccount(acc)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Hapus Permanen Klien & Hosting"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top-up Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Top-up Saldo Kredit Reseller</h3>
            <p className="mt-1 text-xs text-slate-500">
              Saldo digunakan untuk perpanjangan lisensi kuota akun dan domain otomatis.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Pilih Nominal Deposit (USD):
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 100, 250].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(amt)}
                    className={`rounded-lg border py-2 font-mono text-xs font-semibold transition-colors cursor-pointer ${
                      topupAmount === amt
                        ? 'border-sky-600 bg-sky-50 text-sky-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Nominal Kustom ($):
                </label>
                <input
                  type="number"
                  min="10"
                  value={topupAmount}
                  onChange={e => setTopupAmount(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900"
                />
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <div className="flex justify-between font-semibold">
                  <span>Metode Pembayaran:</span>
                  <span>Instant Payment Gateway (Midtrans / Stripe)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTopupModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleTopup}
                className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer"
              >
                {isProcessing ? 'Memproses...' : `Konfirmasi Deposit $${topupAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reseller Profile & Account Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-sky-600" />
                  <span>Edit Identitas &amp; Domain Akun Reseller</span>
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Disinkronkan langsung dengan data Mitra Reseller di Cloud PRO Server.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResellerProfile} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Akun Reseller *
                  </label>
                  <input
                    type="text"
                    required
                    value={editResellerName}
                    onChange={e => setEditResellerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Brand Layanan *
                  </label>
                  <input
                    type="text"
                    required
                    value={editResellerBrand}
                    onChange={e => setEditResellerBrand(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Domain Utama Reseller *
                </label>
                <input
                  type="text"
                  required
                  value={editResellerDomain}
                  onChange={e => setEditResellerDomain(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Kontak / Login *
                  </label>
                  <input
                    type="email"
                    required
                    value={editResellerEmail}
                    onChange={e => setEditResellerEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. WhatsApp / Telepon
                  </label>
                  <input
                    type="text"
                    value={editResellerPhone}
                    onChange={e => setEditResellerPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
