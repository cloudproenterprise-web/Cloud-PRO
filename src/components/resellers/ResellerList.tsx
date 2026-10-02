import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  CreditCard,
  ExternalLink,
  Ban,
  Search,
  Globe,
  Layers,
  Trash2,
  Edit3,
  X,
  Check,
} from 'lucide-react';
import { User, ResellerProfile, HostingAccount } from '../../types';
import { CloudProApi } from '../../services/api';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

export const ResellerList: React.FC = () => {
  const { currentUser, switchUser } = useAuth();
  const { accounts, showToast, refreshAll, confirmAction } = useServer();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit Reseller Modal State
  const [editingReseller, setEditingReseller] = useState<User | null>(null);

  // Form States (shared for Create and Edit)
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('+62 812-2673-8883');
  const [brandName, setBrandName] = useState('');
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [nameserver1, setNameserver1] = useState('');
  const [nameserver2, setNameserver2] = useState('');
  const [assignedIp, setAssignedIp] = useState('172.67.223.133');
  const [maxAccounts, setMaxAccounts] = useState(50);
  const [diskGb, setDiskGb] = useState(100);
  const [initialBalance, setInitialBalance] = useState(250);

  const resellers = db.getUsers().filter(u => u.role === 'reseller');

  const filteredResellers = resellers.filter(r => {
    const q = search.toLowerCase();
    const prof = db.getResellerProfile(r.id);
    return (
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.username && r.username.toLowerCase().includes(q)) ||
      (prof?.brandName && prof.brandName.toLowerCase().includes(q)) ||
      (prof?.companyName && prof.companyName.toLowerCase().includes(q)) ||
      (prof?.primaryDomain && prof.primaryDomain.toLowerCase().includes(q))
    );
  });

  const resetForm = () => {
    setName('');
    setUsername('');
    setEmail('');
    setCompany('');
    setPhone('+62 812-2673-8883');
    setBrandName('');
    setPrimaryDomain('');
    setNameserver1('');
    setNameserver2('');
    setAssignedIp('172.67.223.133');
    setMaxAccounts(50);
    setDiskGb(100);
    setInitialBalance(250);
  };

  const handleOpenAddModal = () => {
    setEditingReseller(null);
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (reseller: User) => {
    const prof = db.getResellerProfile(reseller.id);
    const cleanDom = (
      prof?.primaryDomain ||
      prof?.panelDomain?.replace(/^panel\./i, '') ||
      'mitrahosting.my.id'
    ).toLowerCase();

    setEditingReseller(reseller);
    setName(reseller.name);
    setUsername(reseller.username || reseller.email.split('@')[0].toLowerCase());
    setEmail(reseller.email);
    setPhone(reseller.phone || '+62 812-2673-8883');
    setBrandName(prof?.brandName || reseller.name);
    setCompany(prof?.companyName || reseller.companyName || reseller.name);
    setPrimaryDomain(cleanDom);
    setNameserver1(prof?.nameserver1 || prof?.customNs1 || `ns1.${cleanDom}`);
    setNameserver2(prof?.nameserver2 || prof?.customNs2 || `ns2.${cleanDom}`);
    setAssignedIp(prof?.assignedIp || '172.67.223.133');
    setMaxAccounts(prof?.maxAccounts || 50);
    setDiskGb(Math.round((prof?.allocatedDiskMb || 102400) / 1024));
    setInitialBalance(Number(reseller.creditBalance) || 0);
    setShowAddModal(true);
  };

  const handleDomainChange = (val: string) => {
    const cleaned = val.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^panel\./, '');
    setPrimaryDomain(cleaned);
    if (cleaned) {
      setNameserver1(`ns1.${cleaned}`);
      setNameserver2(`ns2.${cleaned}`);
    } else {
      setNameserver1('');
      setNameserver2('');
    }
  };

  // Sync the Reseller's primary HostingAccount & Cloud PRO invoice whenever created or edited
  const syncResellerOwnAssets = (user: User, profile: ResellerProfile) => {
    const cleanDom = (profile.primaryDomain || 'mitrahosting.my.id').toLowerCase().replace(/^panel\./, '');
    const cleanUser =
      (user.username || cleanDom.split('.')[0] || 'reseller')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 12) || 'reseller';
    const existingOwnAcc = db
      .getHostingAccounts()
      .find(
        a =>
          a.id === `acc-own-${user.id}` ||
          (a.resellerId === user.id && a.customerId === user.id)
      );

    const ownAcc: HostingAccount = {
      id: existingOwnAcc?.id || `acc-own-${user.id}`,
      primaryDomain: cleanDom,
      domain: cleanDom,
      username: cleanUser,
      customerId: user.id,
      customerName: `${user.name} (${profile.brandName})`,
      customerEmail: user.email,
      customerWhatsapp: user.phone || '+62 812-2673-8883',
      resellerId: user.id,
      serverId: existingOwnAcc?.serverId || 'srv-sg-01',
      serverName: existingOwnAcc?.serverName || 'SG-Edge-01 (Singapore)',
      planId: existingOwnAcc?.planId || 'plan-pro',
      planName: existingOwnAcc?.planName || 'Cloud Pro SSD (WHM Reseller)',
      diskUsedMb: existingOwnAcc?.diskUsedMb ?? 420,
      diskLimitMb: profile.allocatedDiskMb || 25600,
      bandwidthUsedMb: existingOwnAcc?.bandwidthUsedMb ?? 2100,
      bandwidthLimitMb: profile.allocatedBandwidthMb || 512000,
      phpVersion: existingOwnAcc?.phpVersion || '8.2',
      phpExtensions: existingOwnAcc?.phpExtensions || [
        'ioncube',
        'mysqli',
        'pdo',
        'curl',
        'gd',
        'mbstring',
        'zip',
        'opcache',
      ],
      status: user.status === 'suspended' ? 'suspended' : 'active',
      sslStatus: 'active',
      sslProvider: "Let's Encrypt",
      sslExpiresAt: '2027-01-01T00:00:00Z',
      forceHttps: true,
      documentRoot: `/home/${cleanUser}/public_html`,
      ipAddress: profile.assignedIp || '172.67.223.133',
      databaseCount: existingOwnAcc?.databaseCount ?? 1,
      emailCount: existingOwnAcc?.emailCount ?? 2,
      ftpCount: existingOwnAcc?.ftpCount ?? 1,
      nameservers: [
        profile.nameserver1 || `ns1.${cleanDom}`,
        profile.nameserver2 || `ns2.${cleanDom}`,
      ],
      createdAt: existingOwnAcc?.createdAt || new Date().toISOString(),
    };
    db.saveHostingAccount(ownAcc);

    // Also keep Reseller's Cloud PRO invoice recipient name/email in sync
    const resellerInv = db
      .getInvoices()
      .find(i => i.id === `inv_cloudpro_reseller_${user.id}`);
    if (resellerInv) {
      db.saveInvoice({
        ...resellerInv,
        userName: `${user.name} (${profile.brandName})`,
        userEmail: user.email,
        userPhone: user.phone || resellerInv.userPhone,
      });
    }
  };

  const handleSaveReseller = async () => {
    if (!name.trim() || !email.trim() || !primaryDomain.trim()) {
      showToast('warning', 'Data Belum Lengkap', 'Nama Akun, Email, dan Domain Utama Reseller wajib diisi.');
      return;
    }

    const cleanDom = primaryDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^panel\./, '');
    const finalBrand = brandName.trim() || name.trim();
    const finalCompany = company.trim() || finalBrand;
    const finalUsername =
      (username.trim() || email.split('@')[0] || cleanDom.split('.')[0])
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '');
    const ns1 = nameserver1.trim() || `ns1.${cleanDom}`;
    const ns2 = nameserver2.trim() || `ns2.${cleanDom}`;

    try {
      // If editing an existing reseller OR if creating when only the untouched default placeholder exists
      const defaultPlaceholder =
        !editingReseller &&
        resellers.length === 1 &&
        resellers[0].id === 'usr-reseller-01' &&
        resellers[0].email === 'reseller@mitrahosting.my.id' &&
        resellers[0].name === 'Mitra Reseller Cloud'
          ? resellers[0]
          : null;

      const targetExistingUser = editingReseller || defaultPlaceholder;
      const targetUserId = targetExistingUser ? targetExistingUser.id : 'usr-reseller-' + Date.now().toString(36);
      const existingProf = db.getResellerProfile(targetUserId);

      const savedUser: User = {
        id: targetUserId,
        username: finalUsername,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || '+62 812-2673-8883',
        companyName: finalCompany,
        role: 'reseller',
        creditBalance: Number(initialBalance) || 0,
        status: targetExistingUser?.status || 'active',
        twoFactorEnabled: targetExistingUser?.twoFactorEnabled || false,
        createdAt: targetExistingUser?.createdAt || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      const savedProfile: ResellerProfile = {
        id: existingProf?.id || 'prof-' + targetUserId,
        userId: targetUserId,
        brandName: finalBrand,
        companyName: finalCompany,
        themeColor: existingProf?.themeColor || '#0ea5e9',
        primaryDomain: cleanDom,
        panelDomain: `panel.${cleanDom}`,
        nameserver1: ns1,
        nameserver2: ns2,
        customNs1: ns1,
        customNs2: ns2,
        assignedIp: assignedIp || '172.67.223.133',
        allocatedDiskMb: (Number(diskGb) || 100) * 1024,
        allocatedBandwidthMb: (Number(diskGb) || 100) * 1024 * 10,
        maxAccounts: Number(maxAccounts) || 50,
        supportEmail: email.trim(),
        hideUpstreamBranding: existingProf?.hideUpstreamBranding ?? true,
        customLogoUrl: existingProf?.customLogoUrl,
        customInvoiceHeader:
          existingProf?.customInvoiceHeader || `Layanan Web Hosting & Cloud Server — ${finalBrand}`,
        nameservers: [ns1, ns2],
      };

      db.saveUser(savedUser);
      db.saveResellerProfile(savedProfile);
      syncResellerOwnAssets(savedUser, savedProfile);
      localStorage.setItem('cloudpro_active_reseller_id', targetUserId);

      if (!editingReseller) {
        await CloudProApi.runSystemJob(
          'create_vhost',
          `Provisioning Reseller VHost ${cleanDom} & NS1/NS2 Bindings`,
          cleanDom
        );
      }

      setShowAddModal(false);
      setEditingReseller(null);
      resetForm();
      refreshAll();

      showToast(
        'success',
        editingReseller ? 'Data Mitra Reseller Diperbarui' : 'Mitra Reseller Berhasil Didaftarkan',
        `Akun Reseller "${savedUser.name}" (${savedProfile.brandName} • ${cleanDom}) telah disinkronkan di seluruh sistem.`
      );
    } catch (err: any) {
      showToast('error', 'Gagal Menyimpan Reseller', err.message);
    }
  };

  const handleToggleSuspend = (reseller: User) => {
    const nextStatus = reseller.status === 'active' ? 'suspended' : 'active';
    db.saveUser({ ...reseller, status: nextStatus });
    refreshAll();
    showToast(
      'info',
      'Status Reseller Diperbarui',
      `Status reseller ${reseller.name} diubah menjadi ${nextStatus}.`
    );
  };

  const handleDeleteReseller = (reseller: User) => {
    if (!currentUser) return;
    const prof = db.getResellerProfile(reseller.id);
    const brandTitle = prof?.brandName || reseller.name;
    const myAccounts = accounts.filter(a => a.resellerId === reseller.id && a.id !== 'acc-rdm-01');

    confirmAction({
      title: 'Hapus Permanen Mitra Reseller',
      message: `PERINGATAN KRUSIAL: Anda akan menghapus permanen Mitra Reseller "${brandTitle}" (${reseller.email}) beserta profil White-Label, Private Nameserver, paket kustom, dan ${myAccounts.length} akun hosting klien di bawahnya.\n\nTindakan ini tidak dapat dibatalkan. Lanjutkan penghapusan?`,
      confirmText: 'Hapus Reseller Permanen',
      isDanger: true,
      onConfirm: async () => {
        try {
          await CloudProApi.deleteReseller(reseller.id, currentUser);
          refreshAll();
          showToast(
            'info',
            'Mitra Reseller Dihapus',
            `Reseller ${brandTitle} beserta seluruh sub-akun kliennya telah dihapus permanen.`
          );
        } catch (err: any) {
          showToast('error', 'Gagal Menghapus Reseller', err.message);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-500" />
            Manajemen Mitra Reseller
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Kelola identitas akun reseller, domain panel white-label, private nameserver, dan alokasi kuota server.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Tambah Reseller Baru</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Mitra Aktif</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {resellers.filter(r => r.status === 'active').length}
          </div>
          <span className="text-[11px] text-emerald-500 font-medium">Mitra Beroperasi</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Akun Hosting Reseller</span>
            <Layers className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {accounts.filter(a => a.resellerId).length}
          </div>
          <span className="text-[11px] text-slate-500">Virtual Host Aktif</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Deposit Reseller</span>
            <CreditCard className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            ${resellers.reduce((acc, r) => acc + (Number(r.creditBalance) || 0), 0).toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500">Saldo Tersimpan</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama akun, brand, email, atau domain reseller..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Table Reseller */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[740px]">
            <thead className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-950 font-semibold text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-5 py-3">Nama Akun &amp; Brand Reseller</th>
                <th className="px-5 py-3">Domain Utama &amp; Nameserver</th>
                <th className="px-5 py-3">Akun vHost</th>
                <th className="px-5 py-3">Kapasitas Disk</th>
                <th className="px-5 py-3">Saldo</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi &amp; Kontrol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredResellers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    Belum ada mitra reseller. Klik "Tambah Reseller Baru" di atas.
                  </td>
                </tr>
              ) : (
                filteredResellers.map(reseller => {
                  const prof = db.getResellerProfile(reseller.id);
                  const myAccounts = accounts.filter(
                    a => a.resellerId === reseller.id && a.id !== 'acc-rdm-01'
                  );
                  const usedDisk = myAccounts.reduce((acc, a) => acc + (a.diskUsedMb || 0), 0);
                  const dom =
                    prof?.primaryDomain ||
                    prof?.panelDomain?.replace(/^panel\./i, '') ||
                    'mitrahosting.my.id';

                  return (
                    <tr key={reseller.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {reseller.name}
                          </span>
                          {prof?.brandName && prof.brandName !== reseller.name && (
                            <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300">
                              {prof.brandName}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          user: <strong className="text-slate-700 dark:text-slate-300">{reseller.username || 'reseller'}</strong> &bull; {reseller.email}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
                          <Globe className="h-3.5 w-3.5" />
                          <span>{dom}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {prof?.nameserver1 || `ns1.${dom}`} &bull; {prof?.nameserver2 || `ns2.${dom}`}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">{myAccounts.length}</span> / {prof?.maxAccounts || 50} Akun
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        <span>{(usedDisk / 1024).toFixed(1)} GB</span> / {((prof?.allocatedDiskMb || 102400) / 1024).toFixed(0)} GB
                      </td>
                      <td className="px-5 py-3.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        ${(Number(reseller.creditBalance) || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            reseller.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {reseller.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(reseller)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            title="Edit Identitas, Domain & Kuota Reseller"
                          >
                            <Edit3 className="h-3 w-3 text-indigo-500" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => switchUser(reseller.id)}
                            className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 inline-flex items-center gap-1 cursor-pointer"
                            title="Masuk ke Portal Reseller ini"
                          >
                            <span>Portal Reseller</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleToggleSuspend(reseller)}
                            className={`rounded-lg p-1.5 cursor-pointer ${
                              reseller.status === 'active'
                                ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/60'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={reseller.status === 'active' ? 'Suspend Reseller' : 'Aktifkan Reseller'}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteReseller(reseller)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
                            title="Hapus Permanen Reseller & Sub-Akun"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Reseller Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  {editingReseller ? 'Edit Akun & Kuota Mitra Reseller' : 'Daftarkan Mitra Reseller Baru'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Perubahan otomatis disinkronkan ke Portal Reseller, Akun Hosting, dan Billing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingReseller(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* DATA IDENTITAS AKUN RESELLER */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Akun Reseller / Pemilik *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Brand Layanan Reseller *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Nusantara Cloud Hosting"
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username Login
                  </label>
                  <input
                    type="text"
                    placeholder="nusantarahost"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Kontak / Login *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@nusantarahost.id"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    No. WhatsApp / Telepon
                  </label>
                  <input
                    type="text"
                    placeholder="+62 812-xxxx-xxxx"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* BRAND DOMAIN & NAMESERVER SECTION */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300 mb-2">
                  <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Domain Utama &amp; Private Nameserver Reseller</span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Domain Utama Reseller (vHost Induk) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="contoh: nusantarahost.id"
                        value={primaryDomain}
                        onChange={e => handleDomainChange(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Dedicated IP Binding
                      </label>
                      <select
                        value={assignedIp}
                        onChange={e => setAssignedIp(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="172.67.223.133">172.67.223.133 (Cloudflare Anycast Primary)</option>
                        <option value="104.21.95.88">104.21.95.88 (Cloudflare Anycast Secondary)</option>
                        <option value="100.121.16.66">100.121.16.66 (Tailscale Mesh Node)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Primary Nameserver (NS1)
                      </label>
                      <input
                        type="text"
                        placeholder="ns1.domainreseller.com"
                        value={nameserver1}
                        onChange={e => setNameserver1(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Secondary Nameserver (NS2)
                      </label>
                      <input
                        type="text"
                        placeholder="ns2.domainreseller.com"
                        value={nameserver2}
                        onChange={e => setNameserver2(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* JATAH KUOTA */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Maks Akun Klien (vHost)
                  </label>
                  <input
                    type="number"
                    value={maxAccounts}
                    onChange={e => setMaxAccounts(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alokasi Disk (GB)
                  </label>
                  <input
                    type="number"
                    value={diskGb}
                    onChange={e => setDiskGb(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Deposit Saldo ($)
                  </label>
                  <input
                    type="number"
                    value={initialBalance}
                    onChange={e => setInitialBalance(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingReseller(null);
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveReseller}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm transition-colors cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{editingReseller ? 'Simpan Perubahan Reseller' : 'Simpan & Daftarkan Reseller'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
