import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  Search,
  ExternalLink,
  Shield,
  CreditCard,
  Globe,
  CheckCircle2,
  Trash2,
  Ban,
} from 'lucide-react';
import { User, HostingPlan } from '../../types';
import { db } from '../../services/storage';
import { CloudProApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

export const CustomerList: React.FC = () => {
  const { currentUser, switchUser } = useAuth();
  const { users, servers, plans, accounts, showToast, refreshAll, confirmAction } = useServer();

  if (!currentUser) return null;

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [domain, setDomain] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || 'plan-starter');
  const [selectedServerId, setSelectedServerId] = useState(servers[0]?.id || 'srv-sg-01');

  // If reseller, show only their customers (reactive to cross-device Server Vault sync)
  const sourceUsers = users.length > 0 ? users : db.getUsers();
  const customers = sourceUsers.filter(u => {
    if (u.role !== 'customer') return false;
    if (currentUser.role === 'reseller') {
      return u.resellerId === currentUser.id;
    }
    return true;
  });

  const filteredCustomers = customers.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.companyName && c.companyName.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateCustomer = async () => {
    if (!name.trim() || !email.trim() || !domain.trim()) return;

    try {
      const customerId = `usr-cust-${Date.now()}`;
      const newCustomer: User = {
        id: customerId,
        name: name.trim(),
        email: email.trim(),
        role: 'customer',
        resellerId: currentUser.role === 'reseller' ? currentUser.id : undefined,
        status: 'active',
        creditBalance: 0,
        companyName: company.trim() || undefined,
        phone: phone.trim() || undefined,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
      };
      db.saveUser(newCustomer);

      // Auto-provision initial hosting account
      const username = domain.split('.')[0].replace(/[^a-z0-9]/g, '').slice(0, 12);
      await CloudProApi.provisionHostingAccount(
        {
          customerId,
          customerName: newCustomer.name,
          customerEmail: newCustomer.email,
          resellerId: newCustomer.resellerId,
          serverId: selectedServerId,
          planId: selectedPlanId,
          username,
          primaryDomain: domain.trim(),
          phpVersion: '8.2',
        },
        currentUser
      );

      showToast('success', 'Pelanggan & Akun Dibuat', `Pelanggan ${newCustomer.name} dan domain ${domain} berhasil didaftarkan.`);
      setShowAddModal(false);
      setName('');
      setEmail('');
      setDomain('');
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Menambah Pelanggan', err.message);
    }
  };

  const handleToggleSuspendCustomer = async (cust: User) => {
    try {
      const updated = await CloudProApi.toggleCustomerStatus(cust.id, currentUser);
      refreshAll();
      showToast(
        updated.status === 'suspended' ? 'warning' : 'success',
        updated.status === 'suspended' ? 'Klien Ditangguhkan' : 'Klien Diaktifkan',
        `Status klien ${cust.name} diubah menjadi ${updated.status}.`
      );
    } catch (err: any) {
      showToast('error', 'Gagal Mengubah Status Klien', err.message);
    }
  };

  const handleDeleteCustomer = (cust: User) => {
    const custAccounts = accounts.filter(
      a =>
        a.id !== 'acc-rdm-01' &&
        (a.customerId === cust.id ||
          (cust.email && a.customerEmail?.toLowerCase() === cust.email.toLowerCase()))
    );
    const domainList = custAccounts.map(a => a.primaryDomain).join(', ') || 'Tidak ada domain aktif';

    confirmAction({
      title: 'Hapus Permanen Pelanggan / Klien',
      message: `PERINGATAN KRUSIAL: Anda akan menghapus permanen klien "${cust.name}" (${cust.email}) beserta ${custAccounts.length} akun hosting (${domainList}), seluruh virtual file, database MySQL, DNS, dan email.\n\nTindakan ini tidak dapat dibatalkan. Lanjutkan penghapusan?`,
      confirmText: 'Hapus Klien Permanen',
      isDanger: true,
      onConfirm: async () => {
        try {
          await CloudProApi.deleteCustomer(cust.id, currentUser);
          refreshAll();
          showToast(
            'info',
            'Klien Berhasil Dihapus',
            `Data pelanggan ${cust.name} beserta seluruh layanan hostingnya telah dihapus permanen.`
          );
        } catch (err: any) {
          showToast('error', 'Gagal Menghapus Klien', err.message);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Direktori & Manajemen Pelanggan
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Daftar pengguna akhir yang memiliki layanan hosting aktif. Anda dapat langsung login sebagai pelanggan.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Tambah Pelanggan Baru</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari pelanggan berdasarkan nama, email, perusahaan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-xs text-slate-900 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden w-full max-w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[620px]">
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 font-sans">
            <tr>
              <th className="px-5 py-3">Nama Pelanggan</th>
              <th className="px-5 py-3">Mitra Reseller Induk</th>
              <th className="px-5 py-3">Saldo Wallet</th>
              <th className="px-5 py-3">Terdaftar Sejak</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-sans">
                  Belum ada pelanggan ditemukan.
                </td>
              </tr>
            ) : (
              filteredCustomers.map(cust => {
                const parentReseller = cust.resellerId ? db.getUserById(cust.resellerId) : null;
                const resellerProfile = cust.resellerId ? db.getResellerProfile(cust.resellerId) : null;
                const custAccounts = accounts.filter(
                  a =>
                    a.id !== 'acc-rdm-01' &&
                    (a.customerId === cust.id ||
                      (cust.email && a.customerEmail?.toLowerCase() === cust.email.toLowerCase()))
                );

                return (
                  <tr key={cust.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {cust.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {cust.email} {cust.companyName && `· ${cust.companyName}`}
                        </div>
                        {custAccounts.length > 0 && (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {custAccounts.map(acc => (
                              <span
                                key={acc.id}
                                className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-sky-700 border border-sky-200/70 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
                              >
                                <Globe className="h-2.5 w-2.5" />
                                {acc.primaryDomain}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {parentReseller ? (
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          {resellerProfile?.brandName || parentReseller.name}
                        </div>
                      ) : (
                        <span className="font-mono text-slate-400">Direct Root</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      ${cust.creditBalance.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                      {new Date(cust.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                          cust.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {cust.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => switchUser(cust.id)}
                          className="rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300 inline-flex items-center gap-1 cursor-pointer"
                          title="Masuk sebagai Pelanggan Ini"
                        >
                          <span>Masuk Akun</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleToggleSuspendCustomer(cust)}
                          className={`rounded-lg p-1.5 cursor-pointer ${
                            cust.status === 'active'
                              ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/60'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={cust.status === 'active' ? 'Suspend Klien' : 'Aktifkan Klien'}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400"
                          title="Hapus Permanen Klien & Hosting"
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

      {/* Add Customer & Auto-Provision Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Daftarkan Pelanggan & Provisi Hosting
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Sistem akan otomatis membuat akun pelanggan dan memprovisi domain hosting pertamanya.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Nama Lengkap Pelanggan:
                  </label>
                  <input
                    type="text"
                    placeholder="Ahmad Fauzi"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Email Aktif:
                  </label>
                  <input
                    type="email"
                    placeholder="ahmad@kreasikita.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Domain Utama Hosting:
                </label>
                <input
                  type="text"
                  placeholder="contoh: kreasikita.com"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Pilih Paket Hosting:
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={e => setSelectedPlanId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {plans.map(p => {
                      const idr = p.priceMonthlyIdr || Math.round((p.priceMonthly || 0) * 16000);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} (Rp {idr.toLocaleString('id-ID')} / ${p.priceMonthly} per bln)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Target Server Node:
                  </label>
                  <select
                    value={selectedServerId}
                    onChange={e => setSelectedServerId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {servers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateCustomer}
                className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs"
              >
                Simpan & Provisi Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
