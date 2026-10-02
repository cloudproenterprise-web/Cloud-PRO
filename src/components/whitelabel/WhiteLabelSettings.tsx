import React, { useState, useRef } from 'react';
import {
  Palette,
  ShieldCheck,
  Save,
  HardDrive,
  Eye,
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';
import { db } from '../../services/storage';

export const WhiteLabelSettings: React.FC = () => {
  const { currentUser, currentResellerProfile, saveWhiteLabel } = useAuth();
  const { showToast, refreshAll } = useServer();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const profile = currentResellerProfile || {
    id: `prof-${currentUser?.id || 'default'}`,
    userId: currentUser?.id || 'default',
    brandName: currentUser?.name || 'My Brand',
    themeColor: '#0ea5e9',
    panelDomain: 'cp.myresellerbrand.com',
    supportEmail: currentUser?.email || 'support@example.com',
    hideUpstreamBranding: true,
    customInvoiceHeader: 'Layanan Hosting Profesional & Handal',
    customLogoUrl: '',
    maxAccounts: 50,
    allocatedDiskMb: 100000,
    allocatedBandwidthMb: 1000000,
    allocatedDatabases: 100,
    allocatedEmails: 250,
    allocatedDomains: 50,
  };

  const [brandName, setBrandName] = useState(profile.brandName);
  const [themeColor, setThemeColor] = useState(profile.themeColor || '#0ea5e9');
  const [panelDomain, setPanelDomain] = useState(profile.panelDomain || 'cp.myresellerbrand.com');
  const [supportEmail, setSupportEmail] = useState(profile.supportEmail);
  const [hideUpstream, setHideUpstream] = useState(profile.hideUpstreamBranding);
  const [customInvoiceHeader, setCustomInvoiceHeader] = useState(
    profile.customInvoiceHeader || ''
  );
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(profile.customLogoUrl || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  if (!currentUser) return null;

  const COLOR_PRESETS = [
    { name: 'Sky Blue', hex: '#0ea5e9' },
    { name: 'Indigo Corporate', hex: '#6366f1' },
    { name: 'Emerald High-Perf', hex: '#10b981' },
    { name: 'Violet Enterprise', hex: '#8b5cf6' },
    { name: 'Crimson Power', hex: '#ef4444' },
    { name: 'Amber Solar', hex: '#f59e0b' },
  ];

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Format File Tidak Didukung', 'Silakan pilih file gambar (PNG, JPG, SVG, atau WebP).');
      return;
    }

    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = () => {
      const resultDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (file.type === 'image/svg+xml') {
        setCustomLogoUrl(resultDataUrl);
        setIsUploadingLogo(false);
        showToast('success', 'Logo Berhasil Dimuat', `File logo "${file.name}" siap disimpan.`);
        return;
      }

      // Resize/optimize raster logo so it fits cleanly in localStorage & Sidebar
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const optimizedDataUrl = canvas.toDataURL('image/png', 0.92);
          setCustomLogoUrl(optimizedDataUrl);
        } else {
          setCustomLogoUrl(resultDataUrl);
        }
        setIsUploadingLogo(false);
        showToast('success', 'Logo Berhasil Diunggah', `Logo "${file.name}" berhasil dimuat. Klik Simpan Perubahan Branding untuk menerapkan.`);
      };
      img.onerror = () => {
        setCustomLogoUrl(resultDataUrl);
        setIsUploadingLogo(false);
      };
      img.src = resultDataUrl;
    };
    reader.onerror = () => {
      setIsUploadingLogo(false);
      showToast('error', 'Gagal Membaca File', 'Tidak dapat membaca file gambar yang dipilih.');
    };
    reader.readAsDataURL(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleSave = () => {
    saveWhiteLabel({
      brandName: brandName.trim(),
      themeColor,
      panelDomain: panelDomain.trim(),
      supportEmail: supportEmail.trim(),
      hideUpstreamBranding: hideUpstream,
      customInvoiceHeader: customInvoiceHeader.trim(),
      customLogoUrl: customLogoUrl.trim() || undefined,
    });

    db.logAction(
      currentUser,
      'WHITELABEL_UPDATED',
      'AUTH',
      `Memperbarui konfigurasi white-label brand & logo: "${brandName}" (Domain: ${panelDomain})`
    );

    showToast('success', 'Branding & Logo Disimpan', 'Konfigurasi white-label dan logo brand reseller berhasil diperbarui.');
    refreshAll();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-pink-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              White-Label Reseller Customizer & Upload Logo
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Unggah logo resmi brand Anda, kustomisasi nama brand, warna tema antarmuka, domain panel, serta sembunyikan identitas provider utama dari pelanggan.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-xs cursor-pointer"
        >
          <Save className="h-3.5 w-3.5" />
          <span>Simpan Perubahan Branding</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form Settings */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-2 space-y-5 text-xs">
          {/* Upload Logo Brand Reseller Section */}
          <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <label className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                  <ImageIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Upload Logo Brand Reseller (PNG / JPG / SVG / WebP)</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Logo akan otomatis tampil di Sidebar navigasi, Header Dashboard Reseller, dan Kop Invoice Klien.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-2xs cursor-pointer transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isUploadingLogo ? 'Memproses...' : 'Unggah File Logo'}</span>
                </button>
                {customLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomLogoUrl('')}
                    className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer"
                    title="Hapus Logo Kustom"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
                {customLogoUrl ? (
                  <img
                    src={customLogoUrl}
                    alt="Logo Preview"
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg text-white font-bold"
                    style={{ backgroundColor: themeColor }}
                  >
                    <HardDrive className="h-6 w-6" />
                  </div>
                )}
              </div>

              <div className="flex-1 w-full space-y-1.5">
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Atau masukkan URL Gambar Logo Eksternal (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="https://domainanda.com/assets/logo.png atau unggah dari tombol di atas"
                  value={customLogoUrl.startsWith('data:') ? 'File Logo Lokal Terunggah (Data URI Aktif)' : customLogoUrl}
                  onChange={e => {
                    if (!e.target.value.startsWith('File Logo Lokal')) {
                      setCustomLogoUrl(e.target.value);
                    }
                  }}
                  readOnly={customLogoUrl.startsWith('data:')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
                {customLogoUrl && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Logo kustom aktif dan siap ditampilkan pada portal Reseller & Klien.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Nama Brand Reseller:
            </label>
            <input
              type="text"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Pilih Warna Tema Brand:
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setThemeColor(c.hex)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-all cursor-pointer ${
                    themeColor === c.hex
                      ? 'border-slate-900 bg-slate-100 font-bold dark:border-white dark:bg-slate-800'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700'
                  }`}
                >
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: c.hex }} />
                  <span className="text-[11px]">{c.name}</span>
                </button>
              ))}
              <input
                type="color"
                value={themeColor}
                onChange={e => setThemeColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-slate-200 dark:border-slate-700 p-0.5"
                title="Warna Kustom"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Domain Panel Reseller (CNAME / A):
              </label>
              <input
                type="text"
                placeholder="cp.domainanda.com"
                value={panelDomain}
                onChange={e => setPanelDomain(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Email Dukungan Pelanggan (Support):
              </label>
              <input
                type="email"
                placeholder="support@domainanda.com"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Keterangan Header Invoice Resmi:
            </label>
            <input
              type="text"
              placeholder="PT Nusantara Digital Host - Layanan Hosting Cepat & Terpercaya"
              value={customInvoiceHeader}
              onChange={e => setCustomInvoiceHeader(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Upstream privacy switch */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    Sembunyikan Identitas Provider Utama (Strict Anonymous Mode)
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Pelanggan Anda hanya akan melihat brand, logo, dan kontak Anda. Semua header HTTP, nameserver rute, dan invoice akan sepenuhnya menggunakan nama brand Anda.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setHideUpstream(!hideUpstream)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  hideUpstream ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    hideUpstream ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Eye className="h-4 w-4 text-indigo-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Pratinjau Tampilan & Logo
            </h4>
          </div>

          <div className="mt-4 space-y-4">
            {/* Mock Header */}
            <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {customLogoUrl ? (
                  <img
                    src={customLogoUrl}
                    alt={brandName}
                    className="h-9 w-9 shrink-0 rounded-lg object-contain bg-white p-0.5 border border-slate-700"
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white font-bold"
                    style={{ backgroundColor: themeColor }}
                  >
                    <HardDrive className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-white text-xs truncate">
                    {brandName || 'Brand Reseller'}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 truncate">
                    {panelDomain}
                  </div>
                </div>
              </div>
            </div>

            {/* Mock Invoice Snippet */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-[11px] text-slate-600 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2.5">
                {customLogoUrl && (
                  <img
                    src={customLogoUrl}
                    alt="Invoice Logo"
                    className="h-7 w-7 rounded object-contain bg-white p-0.5 border border-slate-200"
                  />
                )}
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {brandName} Invoice
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {customInvoiceHeader || 'Layanan Hosting Profesional'}
                  </div>
                </div>
              </div>
              <div className="mt-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                PAID &bull; $14.00
              </div>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed">
              Semua perubahan logo dan branding yang Anda simpan akan seketika tercermin pada sidebar, header portal reseller, dan invoice pelanggan.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
