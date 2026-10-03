import React, { useState, useEffect } from 'react';
import {
  Globe,
  PlusCircle,
  Search,
  ExternalLink,
  Ban,
  Trash2,
  Lock,
  ShieldCheck,
  Users,
  UserCheck,
  Edit3,
  X,
  Check,
} from 'lucide-react';
import { HostingAccount, PhpVersion } from '../../types';
import { CloudProApi } from '../../services/api';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

interface HostingAccountListProps {
  onOpenCpanel: (account: HostingAccount) => void;
  onOpenCreateWizard: () => void;
}

export const HostingAccountList: React.FC<HostingAccountListProps> = ({
  onOpenCpanel,
  onOpenCreateWizard,
}) => {
  const { currentUser, currentResellerProfile } = useAuth();
  const { accounts, showToast, refreshAll, confirmAction } = useServer();

  if (!currentUser) return null;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Edit Hosting Account Modal State
  const [editingAccount, setEditingAccount] = useState<HostingAccount | null>(null);
  const [editDomain, setEditDomain] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerEmail, setEditCustomerEmail] = useState('');
  const [editPhpVersion, setEditPhpVersion] = useState<PhpVersion>('8.2');
  const [editPlanName, setEditPlanName] = useState('');

  const resellerBrandDomain = (
    currentResellerProfile?.primaryDomain ||
    currentResellerProfile?.panelDomain?.replace(/^panel\./i, '') ||
    'mitrahosting.my.id'
  ).toLowerCase();

  // Determine whether an account is the primary internal server/reseller domain vs a client account
  const isOwnAccount = (acc: HostingAccount): boolean => {
    if (currentUser.role === 'admin') {
      return (
        acc.id === 'acc-rdm-01' ||
        acc.primaryDomain.toLowerCase() === 'denbaguse.my.id'
      );
    }
    if (currentUser.role === 'reseller') {
      return (
        acc.primaryDomain.toLowerCase() === resellerBrandDomain ||
        acc.id === `acc-own-${currentUser.id}` ||
        (acc.resellerId === currentUser.id && acc.customerId === currentUser.id)
      );
    }
    return acc.customerId === currentUser.id;
  };

  const hasSyncedOwnAccountRef = React.useRef(false);

  // Auto-seed and keep Reseller's own primary domain account in sync with Reseller Profile & User (runs once)
  useEffect(() => {
    if (currentUser.role === 'reseller' && !hasSyncedOwnAccountRef.current) {
      hasSyncedOwnAccountRef.current = true;
      const existingOwn = accounts.find(
        a =>
          a.id === `acc-own-${currentUser.id}` ||
          (a.resellerId === currentUser.id &&
            (a.customerId === currentUser.id ||
              a.primaryDomain.toLowerCase() === resellerBrandDomain))
      );
      const expectedCustomerName = currentResellerProfile?.brandName
        ? `${currentUser.name} (${currentResellerProfile.brandName})`
        : currentUser.name;
      const expectedUsername =
        (currentUser.username || resellerBrandDomain.split('.')[0] || 'reseller')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 12) || 'reseller';

      if (!existingOwn) {
        const ownResellerAcc: HostingAccount = {
          id: `acc-own-${currentUser.id}`,
          primaryDomain: resellerBrandDomain,
          domain: resellerBrandDomain,
          username: expectedUsername,
          customerId: currentUser.id,
          customerName: expectedCustomerName,
          customerEmail: currentUser.email,
          resellerId: currentUser.id,
          serverId: 'srv-sg-01',
          serverName: 'SG-Edge-01 (Singapore)',
          planId: 'plan-pro',
          planName: 'Cloud Pro SSD (WHM Reseller)',
          diskUsedMb: 420,
          diskLimitMb: currentResellerProfile?.allocatedDiskMb || 25600,
          bandwidthUsedMb: 2100,
          bandwidthLimitMb: currentResellerProfile?.allocatedBandwidthMb || 512000,
          phpVersion: '8.2',
          phpExtensions: ['ioncube', 'mysqli', 'pdo', 'curl', 'gd', 'mbstring', 'zip', 'opcache'],
          status: 'active',
          sslStatus: 'active',
          sslProvider: "Let's Encrypt",
          sslExpiresAt: '2027-01-01T00:00:00Z',
          forceHttps: true,
          documentRoot: `/home/${expectedUsername}/public_html`,
          ipAddress: currentResellerProfile?.assignedIp || '172.67.223.133',
          databaseCount: 1,
          emailCount: 2,
          ftpCount: 1,
          nameservers: [
            currentResellerProfile?.nameserver1 ||
              currentResellerProfile?.customNs1 ||
              `ns1.${resellerBrandDomain}`,
            currentResellerProfile?.nameserver2 ||
              currentResellerProfile?.customNs2 ||
              `ns2.${resellerBrandDomain}`,
          ],
          createdAt: new Date().toISOString(),
        };
        db.saveHostingAccount(ownResellerAcc);
      } else if (
        existingOwn.primaryDomain.toLowerCase() !== resellerBrandDomain ||
        existingOwn.customerName !== expectedCustomerName ||
        existingOwn.customerEmail !== currentUser.email
      ) {
        db.saveHostingAccount({
          ...existingOwn,
          primaryDomain: resellerBrandDomain,
          domain: resellerBrandDomain,
          customerName: expectedCustomerName,
          customerEmail: currentUser.email,
        });
      }
    }
  }, [
    currentUser.id,
    currentUser.role,
    currentUser.name,
    currentUser.email,
    currentResellerProfile?.brandName,
    resellerBrandDomain,
  ]);

  const handleOpenEditAccount = (acc: HostingAccount) => {
    setEditingAccount(acc);
    setEditDomain(acc.primaryDomain);
    setEditUsername(acc.username);
    setEditCustomerName(acc.customerName || currentUser.name);
    setEditCustomerEmail(acc.customerEmail || currentUser.email);
    setEditPhpVersion(acc.phpVersion || '8.2');
    setEditPlanName(acc.planName || 'Cloud Pro SSD');
  };

  const handleSaveEditAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const cleanDom = editDomain.trim().toLowerCase().replace(/^https?:\/\//, '');
    const cleanUser =
      editUsername.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) ||
      editingAccount.username;

    const updatedAcc: HostingAccount = {
      ...editingAccount,
      primaryDomain: cleanDom,
      domain: cleanDom,
      username: cleanUser,
      customerName: editCustomerName.trim() || editingAccount.customerName,
      customerEmail: editCustomerEmail.trim() || editingAccount.customerEmail,
      phpVersion: editPhpVersion,
      planName: editPlanName.trim() || editingAccount.planName,
      documentRoot: `/home/${cleanUser}/public_html`,
    };
    db.saveHostingAccount(updatedAcc);

    // If this account is a Reseller's own account, also sync the Reseller User & Profile
    if (
      editingAccount.id.startsWith('acc-own-') ||
      (editingAccount.resellerId && editingAccount.customerId === editingAccount.resellerId)
    ) {
      const rId = editingAccount.resellerId || editingAccount.customerId;
      if (rId) {
        const rUser = db.getUserById(rId);
        const rProf = db.getResellerProfile(rId);
        const cleanPersonName = editCustomerName.trim().replace(/\s*\(.*\)\s*$/, '');
        if (rUser) {
          db.saveUser({
            ...rUser,
            name: cleanPersonName || rUser.name,
            username: cleanUser,
            email: editCustomerEmail.trim() || rUser.email,
          });
        }
        if (rProf) {
          db.saveResellerProfile({
            ...rProf,
            primaryDomain: cleanDom,
            panelDomain: `panel.${cleanDom}`,
            supportEmail: editCustomerEmail.trim() || rProf.supportEmail,
          });
        }
      }
    }

    setEditingAccount(null);
    refreshAll();
    showToast(
      'success',
      'Data Akun Hosting Diperbarui',
      `Perubahan pada akun ${cleanDom} (${editCustomerName}) telah disimpan.`
    );
  };

  // Scope accounts by role
  const roleScopedAccounts = accounts.filter(acc => {
    if (currentUser.role === 'reseller') {
      return (
        acc.resellerId === currentUser.id &&
        acc.id !== 'acc-rdm-01' &&
        acc.primaryDomain.toLowerCase() !== 'denbaguse.my.id'
      );
    }
    return true;
  });

  // Apply search & status filter
  const filteredAccounts = roleScopedAccounts.filter(acc => {
    if (statusFilter !== 'all' && acc.status !== statusFilter) {
      return false;
    }
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      acc.primaryDomain.toLowerCase().includes(q) ||
      acc.username.toLowerCase().includes(q) ||
      (acc.customerName ? acc.customerName.toLowerCase().includes(q) : false) ||
      (acc.customerEmail ? acc.customerEmail.toLowerCase().includes(q) : false)
    );
  });

  // Split strictly into 2 vertical sections:
  // 1. KOLOM ATAS: Domain Milik Sendiri
  const ownAccounts = filteredAccounts.filter(acc => isOwnAccount(acc));
  // 2. KOLOM BAWAH: Domain Milik Klien (Tidak Campur)
  const clientAccounts = filteredAccounts.filter(acc => !isOwnAccount(acc));

  const handleToggleSuspend = async (acc: HostingAccount) => {
    if (acc.status === 'active') {
      confirmAction({
        title: 'Tangguhkan (Suspend) Akun Hosting',
        message: `Masukkan alasan penangguhan untuk akun ${acc.primaryDomain} (User: ${acc.username}):`,
        inputPlaceholder: 'Alasan penangguhan (mis. Penyalahgunaan resource / penunggakan tagihan)',
        inputValue: 'Penyalahgunaan resource atau penunggakan tagihan',
        confirmText: 'Tangguhkan Akun',
        isDanger: true,
        onConfirm: async reason => {
          try {
            await CloudProApi.suspendAccount(
              acc.id,
              reason?.trim() || 'Penyalahgunaan resource',
              currentUser
            );
            showToast('warning', 'Akun Ditangguhkan', `${acc.primaryDomain} telah di-suspend.`);
            refreshAll();
          } catch (err: any) {
            showToast('error', 'Gagal Mengubah Status', err.message);
          }
        },
      });
    } else {
      try {
        await CloudProApi.unsuspendAccount(acc.id, currentUser);
        showToast('success', 'Akun Diaktifkan', `${acc.primaryDomain} kembali aktif.`);
        refreshAll();
      } catch (err: any) {
        showToast('error', 'Gagal Mengubah Status', err.message);
      }
    }
  };

  const handleTerminate = (acc: HostingAccount) => {
    confirmAction({
      title: 'Terminasi Akun Hosting Permanen',
      message: `PERINGATAN KRUSIAL: Anda akan menghapus permanen akun hosting ${acc.username} (${acc.primaryDomain}) beserta seluruh virtual file, database MySQL, DNS, dan email. Tindakan ini tidak dapat dibatalkan. Lanjutkan terminasi?`,
      confirmText: 'Hapus Permanen',
      isDanger: true,
      onConfirm: async () => {
        try {
          await CloudProApi.terminateAccount(acc.id, currentUser);
          showToast('info', 'Akun Diterminasi', `${acc.primaryDomain} telah dihapus.`);
          refreshAll();
        } catch (err: any) {
          showToast('error', 'Gagal Menghapus Akun', err.message);
        }
      },
    });
  };

  const renderAccountTable = (
    list: HostingAccount[],
    emptyMessage: string,
    isClientSection: boolean
  ) => (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left text-xs min-w-[720px]">
        <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 font-sans">
          <tr>
            <th className="px-5 py-3">
              {isClientSection ? 'Domain & Username' : 'Domain Utama & Username'}
            </th>
            <th className="px-5 py-3">{isClientSection ? 'Pelanggan / Klien' : 'Pengelola'}</th>
            <th className="px-5 py-3">Server Node</th>
            <th className="px-5 py-3">Paket Hosting</th>
            <th className="px-5 py-3">Disk Usage</th>
            <th className="px-5 py-3">PHP & SSL</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Aksi cPanel & Kontrol</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {list.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-5 py-7 text-center text-slate-400 font-sans">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            list.map(acc => (
              <tr key={acc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                <td className="px-5 py-3.5">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{acc.primaryDomain}</span>
                      {acc.forceHttps && (
                        <span title="Force HTTPS Aktif">
                          <Lock className="h-3 w-3 text-emerald-500" />
                        </span>
                      )}
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                          isClientSection
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800'
                        }`}
                      >
                        {isClientSection ? 'KLIEN' : 'UTAMA'}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                      <span>
                        user:{' '}
                        <strong className="text-slate-700 dark:text-slate-200 font-bold">
                          {acc.username}
                        </strong>
                      </span>
                      <span>&bull;</span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 font-mono text-slate-500 dark:text-slate-400">
                        {acc.documentRoot || `/home/${acc.username}/public_html`}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {acc.customerName || (isClientSection ? 'Pelanggan Hosting' : currentUser.name)}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    {acc.customerEmail || currentUser.email}
                  </div>
                </td>
                <td className="px-5 py-3.5 font-mono">
                  <div className="text-slate-800 dark:text-slate-200 font-medium">
                    {acc.serverName}
                  </div>
                  <div className="text-[11px] text-slate-400">{acc.ipAddress}</div>
                </td>
                <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                  {acc.planName}
                </td>
                <td className="px-5 py-3.5 font-mono">
                  <div>
                    {acc.diskUsedMb} MB / {acc.diskLimitMb} MB
                  </div>
                  <div className="mt-1 h-1 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (acc.diskUsedMb / acc.diskLimitMb) * 100)}%`,
                      }}
                    />
                  </div>
                </td>
                <td className="px-5 py-3.5 font-mono text-[11px]">
                  <div className="text-slate-700 dark:text-slate-300 font-semibold">
                    PHP {acc.phpVersion}
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400">
                    {acc.sslStatus === 'active' ? "Let's Encrypt" : 'No SSL'}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                      acc.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {acc.status}
                  </span>
                  {acc.suspendReason && (
                    <div className="text-[10px] text-rose-500 line-clamp-1 mt-0.5">
                      {acc.suspendReason}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right font-sans">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenEditAccount(acc)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-sky-600 shadow-2xs cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      title="Edit Identitas & Domain Akun Hosting"
                    >
                      <Edit3 className="h-3 w-3 text-sky-500" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => onOpenCpanel(acc)}
                      className="flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer"
                      title="Buka cPanel Akun Ini"
                    >
                      <span>cPanel</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleToggleSuspend(acc)}
                      className={`rounded-lg p-1.5 cursor-pointer ${
                        acc.status === 'active'
                          ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={acc.status === 'active' ? 'Suspend Akun' : 'Aktifkan Akun'}
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleTerminate(acc)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 cursor-pointer"
                      title="Terminasi Akun Permanen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Manajemen Akun Hosting (Virtual Hosts)
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Kelola akun virtual host, alokasi kapasitas server, dan akses cPanel dalam satu direktori terpusat.
          </p>
        </div>

        <button
          onClick={onOpenCreateWizard}
          className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Provisi Akun Hosting Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan domain, username cPanel, atau nama pemilik..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs text-slate-900 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Semua ({roleScopedAccounts.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Active ({roleScopedAccounts.filter(a => a.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === 'suspended'
                ? 'bg-rose-50 font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Suspended ({roleScopedAccounts.filter(a => a.status === 'suspended').length})
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* PRIMARY INFRASTRUCTURE / RESELLER DOMAIN                          */}
      {/* ================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden w-full max-w-full">
        <div className="border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-2xs shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {currentUser.role === 'admin'
                  ? 'Domain Utama Infrastruktur Server'
                  : 'Domain Utama Layanan Reseller'}
              </h4>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {currentUser.role === 'admin'
                  ? 'Akun virtual host utama pengelola infrastruktur server (denbaguse.my.id).'
                  : `Akun virtual host utama identitas layanan mitra (${resellerBrandDomain}).`}
              </p>
            </div>
          </div>

          {/* Elegant Structured Metadata Grid */}
          <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Kategori Layanan
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-xs font-bold text-sky-700 dark:text-sky-400">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <span className="truncate">Akun Internal ({ownAccounts.length})</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Otoritas Pengelola
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{currentUser.name}</span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Proteksi &amp; Isolasi
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <Lock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">AutoSSL &amp; System Host</span>
              </div>
            </div>
          </div>
        </div>

        {renderAccountTable(
          ownAccounts,
          'Tidak ada domain utama yang cocok dengan pencarian.',
          false
        )}
      </div>

      {/* ================================================================= */}
      {/* CLIENT HOSTING ACCOUNTS DIRECTORY                                 */}
      {/* ================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden w-full max-w-full">
        <div className="border-b border-slate-100 bg-slate-50/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Direktori Akun Hosting Klien
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Daftar akun virtual host dan layanan cPanel milik pelanggan aktif.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenCreateWizard}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-2xs cursor-pointer shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Provisi Akun Klien</span>
            </button>
          </div>

          {/* Elegant Structured Metadata Grid */}
          <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Entitas Klien
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <Users className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{clientAccounts.length} Akun Klien</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Status Operasional
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                <Globe className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <span className="truncate">
                  {clientAccounts.filter(a => a.status === 'active').length} Domain Online
                </span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Arsitektur Direktori
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">Chroot /home/&#123;user&#125;</span>
              </div>
            </div>
          </div>
        </div>

        {renderAccountTable(
          clientAccounts,
          'Belum ada akun hosting klien yang terdaftar pada filter ini.',
          true
        )}
      </div>

      {/* Edit Hosting Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-sky-500" />
                  <span>Edit Identitas &amp; Domain Akun Hosting</span>
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Perbarui nama pemilik/pelanggan, domain utama, username cPanel, dan versi PHP.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAccount} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Domain Utama *
                  </label>
                  <input
                    type="text"
                    required
                    value={editDomain}
                    onChange={e => setEditDomain(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username cPanel *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Pemilik / Pelanggan *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCustomerName}
                    onChange={e => setEditCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Kontak *
                  </label>
                  <input
                    type="email"
                    required
                    value={editCustomerEmail}
                    onChange={e => setEditCustomerEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Paket Hosting
                  </label>
                  <input
                    type="text"
                    value={editPlanName}
                    onChange={e => setEditPlanName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Versi PHP Aktif
                  </label>
                  <select
                    value={editPhpVersion}
                    onChange={e => setEditPhpVersion(e.target.value as PhpVersion)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="7.4">PHP 7.4</option>
                    <option value="8.0">PHP 8.0</option>
                    <option value="8.1">PHP 8.1</option>
                    <option value="8.2">PHP 8.2</option>
                    <option value="8.3">PHP 8.3</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
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
