import React, { useState } from 'react';
import {
  Layers,
  PlusCircle,
  Trash2,
  HardDrive,
  Cpu,
  Globe,
  Database,
  Mail,
  Edit3,
  Banknote,
} from 'lucide-react';
import { HostingPlan } from '../../types';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

const KURS_IDR = 16000;

export const getPlanMonthlyIdr = (plan: HostingPlan): number => {
  if (typeof plan.priceMonthlyIdr === 'number' && plan.priceMonthlyIdr > 0) {
    return Math.round(plan.priceMonthlyIdr);
  }
  if (plan.currency === 'IDR' && plan.priceMonthly >= 1000) {
    return Math.round(plan.priceMonthly);
  }
  return Math.round((plan.priceMonthly || 0) * KURS_IDR);
};

export const getPlanMonthlyUsd = (plan: HostingPlan): number => {
  if (plan.currency === 'IDR' && plan.priceMonthly >= 1000) {
    return +(plan.priceMonthly / KURS_IDR).toFixed(2);
  }
  return +(plan.priceMonthly || 0).toFixed(2);
};

export const formatRupiah = (amount: number): string => {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
};

export const HostingPlanList: React.FC = () => {
  const { currentUser } = useAuth();
  const { plans, showToast, refreshAll, confirmAction } = useServer();

  if (!currentUser) return null;

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<HostingPlan | null>(null);

  // Plan form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [diskGb, setDiskGb] = useState(10);
  const [bwGb, setBwGb] = useState(200);
  const [cpuCores, setCpuCores] = useState(2);
  const [ramGb, setRamGb] = useState(2);
  const [domains, setDomains] = useState(3);
  const [dbs, setDbs] = useState(5);
  const [emails, setEmails] = useState(10);
  const [priceMonthlyUsd, setPriceMonthlyUsd] = useState(5.0);
  const [priceMonthlyIdr, setPriceMonthlyIdr] = useState(80000);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setDescription('');
    setDiskGb(10);
    setBwGb(200);
    setCpuCores(2);
    setRamGb(2);
    setDomains(3);
    setDbs(5);
    setEmails(10);
    setPriceMonthlyUsd(5.0);
    setPriceMonthlyIdr(80000);
    setShowAddModal(true);
  };

  const openEditModal = (plan: HostingPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDescription(plan.description || '');
    setDiskGb(Math.round(((plan.diskMb ?? plan.diskLimitMb) || 10240) / 1024));
    setBwGb(Math.round(((plan.bandwidthMb ?? plan.bandwidthLimitMb) || 204800) / 1024));
    setCpuCores(Math.max(1, Math.round((plan.cpuLimitPct ?? 200) / 100)));
    setRamGb(Math.max(1, Math.round((plan.ramLimitMb ?? 2048) / 1024)));
    setDomains(plan.maxDomains ?? 3);
    setDbs(plan.maxDatabases ?? 5);
    setEmails(plan.maxEmails ?? plan.maxEmailAccounts ?? 10);
    setPriceMonthlyUsd(getPlanMonthlyUsd(plan));
    setPriceMonthlyIdr(getPlanMonthlyIdr(plan));
    setShowAddModal(true);
  };

  const handleUsdChange = (val: number) => {
    const safeUsd = Math.max(0, val);
    setPriceMonthlyUsd(safeUsd);
    setPriceMonthlyIdr(Math.round(safeUsd * KURS_IDR));
  };

  const handleIdrChange = (val: number) => {
    const safeIdr = Math.max(0, Math.round(val));
    setPriceMonthlyIdr(safeIdr);
    setPriceMonthlyUsd(+(safeIdr / KURS_IDR).toFixed(2));
  };

  const handleSavePlan = () => {
    if (!name.trim()) {
      showToast('error', 'Validasi Gagal', 'Nama paket wajib diisi.');
      return;
    }

    const finalIdr = Math.max(0, Math.round(priceMonthlyIdr));
    const finalUsd = priceMonthlyUsd > 0 ? +priceMonthlyUsd.toFixed(2) : +(finalIdr / KURS_IDR).toFixed(2);

    const savedPlan: HostingPlan = {
      id: editingPlan ? editingPlan.id : `plan-${Date.now()}`,
      resellerId: editingPlan
        ? editingPlan.resellerId
        : currentUser.role === 'reseller'
          ? currentUser.id
          : undefined,
      name: name.trim(),
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description: description.trim() || 'Paket hosting cloud berperforma tinggi',
      diskMb: diskGb * 1024,
      diskLimitMb: diskGb * 1024,
      bandwidthMb: bwGb * 1024,
      bandwidthLimitMb: bwGb * 1024,
      cpuLimitPct: cpuCores * 100,
      ramLimitMb: ramGb * 1024,
      maxDomains: domains,
      maxSubdomains: domains * 5,
      maxDatabases: dbs,
      maxEmails: emails,
      maxFtp: 5,
      hasSsl: true,
      hasBackup: true,
      hasCron: true,
      priceMonthly: finalUsd,
      priceMonthlyIdr: finalIdr,
      priceYearly: +(finalUsd * 10).toFixed(2), // 2 months discount on annual
      priceYearlyIdr: finalIdr * 10,
      currency: 'IDR',
      isActive: true,
    };

    db.saveHostingPlan(savedPlan);
    db.logAction(
      currentUser,
      editingPlan ? 'PLAN_UPDATED' : 'PLAN_CREATED',
      'HOSTING',
      `${editingPlan ? 'Memperbarui' : 'Membuat'} paket hosting "${savedPlan.name}" (${formatRupiah(finalIdr)} / $${finalUsd} per bulan)`
    );
    showToast(
      'success',
      editingPlan ? 'Paket Hosting Diperbarui' : 'Paket Hosting Dibuat',
      `Paket ${savedPlan.name} (${formatRupiah(finalIdr)}/bln) berhasil disimpan.`
    );
    setShowAddModal(false);
    setEditingPlan(null);
    refreshAll();
  };

  const handleDeletePlan = (plan: HostingPlan) => {
    confirmAction({
      title: 'Hapus Paket Hosting',
      message: `Hapus paket hosting "${plan.name}"? Paket ini tidak akan dapat dipilih lagi untuk pesanan baru.`,
      confirmText: 'Hapus Paket',
      isDanger: true,
      onConfirm: () => {
        db.deleteHostingPlan(plan.id);
        db.logAction(currentUser, 'PLAN_DELETED', 'HOSTING', `Menghapus paket hosting ${plan.name}`);
        showToast('info', 'Paket Dihapus', `Paket ${plan.name} telah dihapus.`);
        refreshAll();
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Paket Hosting &amp; Batas Resource (Quota Tiers)
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Konfigurasi batas ruang disk NVMe, bandwidth, alokasi CPU core, RAM, serta tarif bulanan dalam Rupiah (IDR) &amp; USD ($).
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-500 shadow-xs cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Buat Paket Hosting Baru</span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map(plan => {
          const monthlyIdr = getPlanMonthlyIdr(plan);
          const monthlyUsd = getPlanMonthlyUsd(plan);
          const yearlyIdr = plan.priceYearlyIdr || monthlyIdr * 10;

          return (
            <div
              key={plan.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {plan.name}
                      </h4>
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                          plan.resellerId
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                        }`}
                      >
                        {plan.resellerId ? 'Paket Reseller' : 'Global Server'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {plan.description}
                    </p>
                  </div>
                  {(currentUser.role === 'admin' || plan.resellerId === currentUser.id) && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(plan)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/60 cursor-pointer"
                        title="Edit Paket & Harga"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 cursor-pointer"
                        title="Hapus Paket"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Pricing Box (Rupiah + USD) */}
                <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Harga Bulanan (Rupiah)
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-1">
                        <span className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white">
                          {formatRupiah(monthlyIdr)}
                        </span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          / bln
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block rounded-md bg-white px-2 py-0.5 font-mono text-xs font-bold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                        ${monthlyUsd.toFixed(2)} / bln
                      </span>
                      <div className="mt-1 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(yearlyIdr)} / thn
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resource Specs List */}
                <div className="mt-5 space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-mono">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 font-sans text-slate-500">
                      <HardDrive className="h-3.5 w-3.5 text-amber-500" />
                      <span>NVMe Storage</span>
                    </span>
                    <span className="font-bold">
                      {(((plan.diskMb ?? plan.diskLimitMb) || 5120) / 1024).toFixed(0)} GB
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 font-sans text-slate-500">
                      <Globe className="h-3.5 w-3.5 text-sky-500" />
                      <span>Bandwidth Bulanan</span>
                    </span>
                    <span className="font-bold">
                      {(((plan.bandwidthMb ?? plan.bandwidthLimitMb) || 102400) / 1024).toFixed(0)} GB
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 font-sans text-slate-500">
                      <Cpu className="h-3.5 w-3.5 text-violet-500" />
                      <span>Dedicated CPU / RAM</span>
                    </span>
                    <span className="font-bold">
                      {(plan.cpuLimitPct ?? 100) / 100} Core / {Math.round((plan.ramLimitMb ?? 1024) / 1024)} GB
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 font-sans text-slate-500">
                      <Database className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Maksimum Database</span>
                    </span>
                    <span className="font-bold">{plan.maxDatabases} DB</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1.5 font-sans text-slate-500">
                      <Mail className="h-3.5 w-3.5 text-teal-500" />
                      <span>Akun Email &amp; Domain</span>
                    </span>
                    <span className="font-bold">
                      {plan.maxEmails ?? plan.maxEmailAccounts ?? 10} Mail / {plan.maxDomains ?? 3} Domain
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Let&apos;s Encrypt &bull; Backup &bull; Cron</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  Included
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Plan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingPlan ? `Edit Paket Hosting: ${editingPlan.name}` : 'Buat Paket Hosting Baru'}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tentukan kuota spesifikasi server serta harga bulanan dalam mata uang Rupiah (IDR) dan USD ($).
            </p>

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Nama Paket:
                </label>
                <input
                  type="text"
                  placeholder="misal: Cloud Ultra Pro"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>

              {/* Dual Currency Monthly Price Section (IDR & USD) */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300">
                    <Banknote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Harga Bulanan (Rupiah IDR &amp; USD)</span>
                  </span>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                    {formatRupiah(priceMonthlyIdr)} / bln
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      Harga Bulanan (Rp / IDR):
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Rp
                      </span>
                      <input
                        type="number"
                        step="5000"
                        min="0"
                        value={priceMonthlyIdr}
                        onChange={e => handleIdrChange(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 font-mono font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Tahunan (Diskon 2 Bln): <strong>{formatRupiah(priceMonthlyIdr * 10)}/thn</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      Harga Bulanan ($ / USD):
                    </label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={priceMonthlyUsd}
                        onChange={e => handleUsdChange(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 py-2 font-mono font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Otomatis sinkron (Est. 1 USD = Rp 16.000)
                    </p>
                  </div>
                </div>

                {/* Quick Rupiah Presets */}
                <div className="pt-1">
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Pilihan Cepat Nominal Rupiah:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[50000, 75000, 100000, 150000, 250000, 500000].map(presetIdr => (
                      <button
                        key={presetIdr}
                        type="button"
                        onClick={() => handleIdrChange(presetIdr)}
                        className={`rounded-md px-2 py-1 font-mono text-[10px] font-bold border transition-colors cursor-pointer ${
                          priceMonthlyIdr === presetIdr
                            ? 'border-amber-600 bg-amber-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {formatRupiah(presetIdr)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Deskripsi Paket:
                </label>
                <input
                  type="text"
                  placeholder="Keterangan target pengguna paket..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Storage NVMe (GB):
                  </label>
                  <input
                    type="number"
                    value={diskGb}
                    onChange={e => setDiskGb(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Bandwidth (GB):
                  </label>
                  <input
                    type="number"
                    value={bwGb}
                    onChange={e => setBwGb(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Maks Domain:
                  </label>
                  <input
                    type="number"
                    value={domains}
                    onChange={e => setDomains(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingPlan(null);
                }}
                className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 shadow-xs cursor-pointer"
              >
                Simpan Paket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
