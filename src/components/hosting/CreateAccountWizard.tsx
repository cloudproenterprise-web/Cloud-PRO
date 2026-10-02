import React, { useState } from 'react';
import {
  Globe,
  Server,
  Layers,
  User as UserIcon,
  Cpu,
  CheckCircle2,
  X,
  PlusCircle,
  AlertTriangle,
  Building,
} from 'lucide-react';
import { CloudProApi } from '../../services/api';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';
import { PhpVersion } from '../../types';

interface CreateAccountWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateAccountWizard: React.FC<CreateAccountWizardProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { servers, plans, showToast, refreshAll } = useServer();

  const [domain, setDomain] = useState('');
  const [username, setUsername] = useState('');
  const [documentRoot, setDocumentRoot] = useState('');
  const [isCustomDocRoot, setIsCustomDocRoot] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || 'plan-starter');
  const [selectedServerId, setSelectedServerId] = useState(servers[0]?.id || 'srv-sg-01');
  const [phpVersion, setPhpVersion] = useState<PhpVersion>('8.2');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Jika admin, izinkan memilih reseller pemilik akun atau langsung akun Root Bos
  const resellers = db.getUsers().filter(u => u.role === 'reseller');
  const [assignedResellerId, setAssignedResellerId] = useState<string>(
    currentUser?.role === 'reseller' ? currentUser.id : ''
  );

  if (!isOpen || !currentUser) return null;

  const handleDomainChange = (val: string) => {
    setDomain(val);
    if (!username || username === domain.split('.')[0].replace(/[^a-z0-9]/g, '')) {
      const suggested = val.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
      setUsername(suggested);
      if (!isCustomDocRoot) {
        setDocumentRoot(`/home/${suggested}/public_html`);
      }
    }
  };

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9]/g, '');
    setUsername(clean);
    if (!isCustomDocRoot) {
      setDocumentRoot(`/home/${clean}/public_html`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim() || !username.trim()) {
      showToast('error', 'Validasi Gagal', 'Domain dan username wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetResellerId =
        currentUser.role === 'reseller' ? currentUser.id : assignedResellerId || undefined;

      // Find or create customer
      const existingCustomer = db.getUsers().find(u => u.email === customerEmail.trim());
      let customerId = existingCustomer ? existingCustomer.id : `usr-cust-${Date.now()}`;

      if (!existingCustomer) {
        db.saveUser({
          id: customerId,
          username: username.toLowerCase().trim(),
          name: customerName.trim() || username,
          email: customerEmail.trim() || `admin@${domain.trim()}`,
          role: 'customer',
          resellerId: targetResellerId,
          status: 'active',
          creditBalance: 0,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
        });
      }

      const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const finalDocRoot = isCustomDocRoot && documentRoot.trim()
        ? documentRoot.trim()
        : `/home/${cleanUser}/public_html`;

      await CloudProApi.provisionHostingAccount(
        {
          customerId,
          customerName: customerName.trim() || username,
          customerEmail: customerEmail.trim() || `admin@${domain.trim()}`,
          resellerId: targetResellerId,
          serverId: selectedServerId,
          planId: selectedPlanId,
          username: cleanUser,
          primaryDomain: domain.trim(),
          phpVersion,
          documentRoot: finalDocRoot,
        },
        currentUser
      );

      showToast(
        'success',
        'Akun Berhasil Diprovisi!',
        `Domain ${domain} sedang diprovisi di background worker.`
      );
      onClose();
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Provisi', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="my-auto w-full max-w-xl max-h-[92vh] flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-5 py-3.5 sm:px-6 sm:py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Globe className="h-5 w-5 text-sky-500 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Provisi Akun Hosting Otomatis (Wizard)
              </h3>
              <p className="text-[11px] text-slate-400">
                Sistem akan membuat direktori web, DNS Zone, database default & SSL Let&apos;s Encrypt.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body with internal scrolling */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* Owner Assignment (Admin Only) */}
          {currentUser.role === 'admin' && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
              <label className="block font-bold text-indigo-950 dark:text-indigo-300 mb-1 flex items-center gap-1.5">
                <Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Kepemilikan Akun Hosting:</span>
              </label>
              <select
                value={assignedResellerId}
                onChange={e => setAssignedResellerId(e.target.value)}
                className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-hidden dark:border-indigo-800 dark:bg-slate-800 dark:text-white"
              >
                <option value="">🏢 Akun Milik Server Utama Bos (Root Direct Client)</option>
                {resellers.map(r => {
                  const prof = db.getResellerProfile(r.id);
                  return (
                    <option key={r.id} value={r.id}>
                      🤝 Titipkan ke Reseller: {prof?.brandName || r.name} ({prof?.primaryDomain || r.email})
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400 mt-1">
                Bos bisa memilih apakah akun ini langsung di bawah Bos atau masuk ke jatah kuota mitra reseller tertentu.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Nama Domain Utama: *
              </label>
              <input
                type="text"
                placeholder="contoh: tokobaru.com"
                value={domain}
                onChange={e => handleDomainChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Username Sistem Linux: *
              </label>
              <input
                type="text"
                placeholder="tokobaru"
                value={username}
                onChange={e => handleUsernameChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Web Document Root Setting (Otomatis ke /public_html) */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>Web Document Root:</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  Otomatis
                </span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const nextCustom = !isCustomDocRoot;
                  setIsCustomDocRoot(nextCustom);
                  if (!nextCustom) {
                    setDocumentRoot(`/home/${username || 'user'}/public_html`);
                  }
                }}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer"
              >
                {isCustomDocRoot ? '← Reset ke Otomatis (/public_html)' : '⚙️ Ubah Root Kustom (mis. /public)'}
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={isCustomDocRoot ? documentRoot : `/home/${username || 'username'}/public_html`}
                onChange={e => setDocumentRoot(e.target.value)}
                disabled={!isCustomDocRoot}
                placeholder="/home/username/public_html"
                className={`w-full rounded-lg border px-3 py-2 font-mono text-xs transition-colors ${
                  isCustomDocRoot
                    ? 'border-sky-500 bg-white text-slate-900 ring-2 ring-sky-500/20 dark:bg-slate-900 dark:text-white'
                    : 'border-slate-200 bg-white/70 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Direktori web root otomatis diarahkan ke <code>/public_html/</code> dengan perizinan Linux <code>0755</code>, file <code>index.php</code> bawaan, dan SSL aktif.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Nama Pemilik Akun:
              </label>
              <input
                type="text"
                placeholder="Rahmat Hidayat"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Email Notifikasi Akun:
              </label>
              <input
                type="email"
                placeholder="rahmat@gmail.com"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Pilih Paket:
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
                      {p.name} ({((p.diskMb ?? p.diskLimitMb) || 10240) / 1024} GB — Rp {idr.toLocaleString('id-ID')}/bln)
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Server Node:
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
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                PHP Runtime:
              </label>
              <select
                value={phpVersion}
                onChange={e => setPhpVersion(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="8.3">PHP 8.3 (Latest)</option>
                <option value="8.2">PHP 8.2 (LTS)</option>
                <option value="8.1">PHP 8.1</option>
                <option value="8.0">PHP 8.0</option>
                <option value="7.4">PHP 7.4 (Popular / RDM v2)</option>
                <option value="7.3">PHP 7.3</option>
                <option value="7.2">PHP 7.2 (Rapor Digital Madrasah - RDM)</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Otomatisasi Provisioning Aktif:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-sky-700 dark:text-sky-300">
              Sistem akan otomatis menghasilkan: Virtual Host Nginx &bull; DNS Zone Authoritative (A, CNAME, MX) &bull; AutoSSL Let&apos;s Encrypt certificate &bull; Starter index.php template &bull; Default MySQL database & user.
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{isSubmitting ? 'Memproses Provisi...' : 'Mulai Provisi Hosting'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
