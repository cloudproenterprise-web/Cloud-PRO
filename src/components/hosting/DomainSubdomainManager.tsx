import React, { useState, useEffect } from 'react';
import {
  Globe,
  PlusCircle,
  FolderOpen,
  Lock,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Layers,
  Sparkles,
  Zap,
  HelpCircle,
  Copy,
  Server,
  ArrowRight,
  ShieldCheck,
  Archive,
} from 'lucide-react';
import { HostingAccount, DomainEntity, PhpVersion } from '../../types';
import { CloudProApi } from '../../services/api';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';
import { WebsitePreviewModal } from './WebsitePreviewModal';

interface DomainSubdomainManagerProps {
  account: HostingAccount;
  onOpenFileManager?: (path: string) => void;
  onNavigateTab?: (tab: string, domain?: string) => void;
}

export const DomainSubdomainManager: React.FC<DomainSubdomainManagerProps> = ({
  account,
  onOpenFileManager,
  onNavigateTab,
}) => {
  const { currentUser } = useAuth();
  const { showToast, refreshAll, confirmAction } = useServer();

  if (!currentUser) return null;

  const [domains, setDomains] = useState<DomainEntity[]>(() => db.getDomains(account.id));
  const [showSubdomainModal, setShowSubdomainModal] = useState(false);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<{ domain: string; docRoot: string } | null>(null);

  // Subdomain form states
  const [subPrefix, setSubPrefix] = useState('');
  const [parentDomain, setParentDomain] = useState(account.primaryDomain);
  const [subDocRoot, setSubDocRoot] = useState('');
  const [isCustomSubDocRoot, setIsCustomSubDocRoot] = useState(false);
  const [subPhpVersion, setSubPhpVersion] = useState<PhpVersion>('7.4');
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Addon domain form states
  const [addonDomain, setAddonDomain] = useState('');
  const [addonDocRoot, setAddonDocRoot] = useState('');
  const [isCustomAddonDocRoot, setIsCustomAddonDocRoot] = useState(false);
  const [addonPhpVersion, setAddonPhpVersion] = useState<PhpVersion>('8.2');
  const [isSubmittingAddon, setIsSubmittingAddon] = useState(false);

  useEffect(() => {
    setDomains([...db.getDomains(account.id)]);
    setParentDomain(account.primaryDomain);
  }, [account.id, account.primaryDomain]);

  // Refresh domain list
  const reloadDomains = () => {
    setDomains([...db.getDomains(account.id)]);
  };

  const isPresetActive = (prefix: string): boolean => {
    const targetFull = `${prefix.toLowerCase()}.${account.primaryDomain.toLowerCase()}`;
    return domains.some(
      d => d.type === 'subdomain' && d.domain.toLowerCase() === targetFull
    );
  };

  const handleSubPrefixChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubPrefix(clean);
    if (!isCustomSubDocRoot) {
      setSubDocRoot(`/home/${account.username}/public_html/${clean}`);
    }
  };

  const handleAddonDomainChange = (val: string) => {
    const clean = val.toLowerCase().trim();
    setAddonDomain(clean);
    if (!isCustomAddonDocRoot) {
      setAddonDocRoot(`/home/${account.username}/${clean}`);
    }
  };

  const handleCreateSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subPrefix.trim()) {
      showToast('error', 'Validasi Gagal', 'Prefix subdomain tidak boleh kosong.');
      return;
    }

    setIsSubmittingSub(true);
    try {
      const cleanPrefix = subPrefix.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
      const targetParent = parentDomain || account.primaryDomain;
      const finalDocRoot = isCustomSubDocRoot && subDocRoot.trim()
        ? subDocRoot.trim()
        : `/home/${account.username}/public_html/${cleanPrefix}`;

      await CloudProApi.createSubdomain(
        {
          accountId: account.id,
          subdomainPrefix: cleanPrefix,
          parentDomain: targetParent,
          documentRoot: finalDocRoot,
          phpVersion: subPhpVersion,
        },
        currentUser
      );

      setShowSubdomainModal(false);
      setSubPrefix('');
      setIsCustomSubDocRoot(false);
      reloadDomains();
      refreshAll();
      showToast(
        'success',
        'Subdomain Berhasil Dibuat',
        `${cleanPrefix}.${targetParent} aktif dengan Document Root otomatis di ${finalDocRoot}.`
      );
    } catch (err: any) {
      showToast('error', 'Gagal Membuat Subdomain', err.message);
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const handleQuickPresetSubdomain = async (prefix: string, phpVer: PhpVersion) => {
    setIsSubmittingSub(true);
    try {
      const cleanPrefix = prefix.toLowerCase().trim();
      const targetParent = account.primaryDomain;
      const finalDocRoot = `/home/${account.username}/public_html/${cleanPrefix}`;

      await CloudProApi.createSubdomain(
        {
          accountId: account.id,
          subdomainPrefix: cleanPrefix,
          parentDomain: targetParent,
          documentRoot: finalDocRoot,
          phpVersion: phpVer,
        },
        currentUser
      );

      reloadDomains();
      refreshAll();
      showToast(
        'success',
        'Subdomain Berhasil Diaktifkan',
        `${cleanPrefix}.${targetParent} (PHP ${phpVer}) telah aktif di ${finalDocRoot}.`
      );
    } catch (err: any) {
      showToast('error', 'Gagal Mengaktifkan Subdomain', err.message);
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const handleCreateAddonDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addonDomain.trim() || !addonDomain.includes('.')) {
      showToast('error', 'Validasi Gagal', 'Masukkan nama domain yang valid (misal: contoh.com).');
      return;
    }

    setIsSubmittingAddon(true);
    try {
      const cleanDomain = addonDomain.toLowerCase().trim();
      const finalDocRoot = isCustomAddonDocRoot && addonDocRoot.trim()
        ? addonDocRoot.trim()
        : `/home/${account.username}/${cleanDomain}`;

      await CloudProApi.createAddonDomain(
        {
          accountId: account.id,
          domain: cleanDomain,
          documentRoot: finalDocRoot,
          phpVersion: addonPhpVersion,
        },
        currentUser
      );

      showToast(
        'success',
        'Addon Domain Berhasil Ditambahkan!',
        `${cleanDomain} aktif dengan Document Root otomatis di ${finalDocRoot}.`
      );
      setShowAddonModal(false);
      setAddonDomain('');
      setIsCustomAddonDocRoot(false);
      reloadDomains();
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Menambah Addon Domain', err.message);
    } finally {
      setIsSubmittingAddon(false);
    }
  };

  const handleDeleteDomain = (dom: DomainEntity) => {
    confirmAction({
      title: 'Hapus Domain / Subdomain',
      message: `Apakah Anda yakin ingin menghapus domain/subdomain ${dom.domain}? Virtual host dan routing Nginx untuk domain ini akan dinonaktifkan.`,
      confirmText: 'Hapus Domain',
      isDanger: true,
      onConfirm: async () => {
        try {
          await CloudProApi.deleteDomain(dom.id, currentUser);
          showToast('info', 'Domain Dihapus', `${dom.domain} berhasil dihapus.`);
          reloadDomains();
          refreshAll();
        } catch (err: any) {
          showToast('error', 'Gagal Menghapus Domain', err.message);
        }
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    showToast('info', 'Tersalin', `Path direktori ${text} disalin ke clipboard.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Manajemen Domain, Subdomain &amp; Document Root
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Setiap kali Anda membuat subdomain atau addon domain, <strong>Document Root otomatis dibuatkan</strong> (misalnya <code>/public_html/[subdomain]</code>) lengkap dengan DNS A record dan Auto-SSL.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setSubPrefix('');
              setIsCustomSubDocRoot(false);
              setShowSubdomainModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>+ Buat Subdomain</span>
          </button>

          <button
            onClick={() => {
              setAddonDomain('');
              setIsCustomAddonDocRoot(false);
              setShowAddonModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs cursor-pointer transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>+ Addon Domain</span>
          </button>
        </div>
      </div>

      {/* RDM & School Quick Presets Card */}
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50/70 via-indigo-50/40 to-white p-4 sm:p-5 shadow-xs dark:border-sky-900/60 dark:from-sky-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Preset Cepat Subdomain Aplikasi Madrasah &amp; Sekolah
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Klik salah satu tombol di bawah untuk langsung menyiapkan subdomain dengan Document Root otomatis:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSubmittingSub}
              onClick={() => handleQuickPresetSubdomain('rdm', '7.2')}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {isPresetActive('rdm') ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              <span>
                {isPresetActive('rdm')
                  ? `Subdomain RDM Aktif (rdm.${account.primaryDomain})`
                  : 'Subdomain RDM (PHP 7.2)'}
              </span>
            </button>

            <button
              type="button"
              disabled={isSubmittingSub}
              onClick={() => handleQuickPresetSubdomain('cbt', '7.4')}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {isPresetActive('cbt') ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              <span>
                {isPresetActive('cbt')
                  ? `Subdomain CBT Aktif (cbt.${account.primaryDomain})`
                  : 'Subdomain CBT / Ujian (PHP 7.4)'}
              </span>
            </button>

            <button
              type="button"
              disabled={isSubmittingSub}
              onClick={() => handleQuickPresetSubdomain('elearning', '8.2')}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {isPresetActive('elearning') ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              <span>
                {isPresetActive('elearning')
                  ? `Subdomain E-Learning Aktif (elearning.${account.primaryDomain})`
                  : 'Subdomain E-Learning (PHP 8.2)'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Domain & Subdomain Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Daftar Domain &amp; Subdomain Aktif ({domains.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Virtual Host Hostname &amp; Pemetaan Path Direktori
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 font-sans border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Nama Domain / Subdomain</th>
                <th className="px-5 py-3">Tipe</th>
                <th className="px-5 py-3">Web Document Root (Folder Fisik)</th>
                <th className="px-5 py-3">PHP Runtime</th>
                <th className="px-5 py-3">Status SSL</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Belum ada domain atau subdomain yang terdaftar.
                  </td>
                </tr>
              ) : (
                domains.map(dom => (
                  <tr key={dom.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-sky-500 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewTarget({
                                  domain: dom.domain,
                                  docRoot: dom.documentRoot,
                                })
                              }
                              className="hover:text-sky-600 hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                              title="Buka Live Preview Website"
                            >
                              <span>{dom.domain}</span>
                              <ExternalLink className="h-3 w-3 text-sky-500" />
                            </button>
                          </div>
                          {dom.parentDomain && dom.type === 'subdomain' && (
                            <div className="text-[10.5px] text-slate-400">
                              Induk: {dom.parentDomain}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      {dom.type === 'primary' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
                          Primary Domain
                        </span>
                      ) : dom.type === 'subdomain' ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                          Subdomain
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 border border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800">
                          Addon Domain
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium">
                          {dom.documentRoot}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(dom.documentRoot)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                          title="Salin path Document Root"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Otomatis terhubung ke Nginx &amp; File Manager</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 font-mono">
                      <button
                        type="button"
                        onClick={() => onNavigateTab && onNavigateTab('php-selector', dom.domain)}
                        className="px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200 dark:bg-violet-950/60 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-semibold text-[11px] cursor-pointer transition-colors"
                        title={`Atur versi PHP & ekstensi untuk ${dom.domain}`}
                      >
                        PHP {dom.phpVersion || account.phpVersion || '8.2'} ⚙
                      </button>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                        <Lock className="h-3 w-3 text-emerald-500" /> Let&apos;s Encrypt Aktif
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewTarget({
                              domain: dom.domain,
                              docRoot: dom.documentRoot,
                            })
                          }
                          className="flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-500 cursor-pointer shadow-2xs"
                          title="Lihat Live Preview Website"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Preview</span>
                        </button>
                        {onOpenFileManager && (
                          <button
                            type="button"
                            onClick={() => {
                              const relativePath = dom.documentRoot.replace(`/home/${account.username}`, '') || '/public_html';
                              onOpenFileManager(relativePath);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                            title="Buka folder di File Manager"
                          >
                            <FolderOpen className="h-3 w-3 text-amber-500" />
                            <span>Buka Folder</span>
                          </button>
                        )}

                        {onNavigateTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('backups', dom.domain)}
                            className="flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300 cursor-pointer"
                            title="Cadangkan atau Pulihkan Domain Ini (.ZIP)"
                          >
                            <Archive className="h-3 w-3 text-orange-500" />
                            <span>Backup / Restore (.ZIP)</span>
                          </button>
                        )}

                        {dom.type !== 'primary' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDomain(dom)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 cursor-pointer"
                            title="Hapus domain/subdomain"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Buat Subdomain Baru */}
      {showSubdomainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-sky-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Registrasi Subdomain Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSubdomainModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubdomain} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Nama Subdomain: *
                </label>
                <div className="mt-1 flex rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
                  <input
                    type="text"
                    value={subPrefix}
                    onChange={e => handleSubPrefixChange(e.target.value)}
                    placeholder="rdm atau cbt atau elearning"
                    className="w-1/2 px-3 py-2 font-mono text-xs focus:outline-none dark:bg-slate-800 dark:text-white"
                    required
                    autoFocus
                  />
                  <div className="w-1/2 flex items-center bg-slate-50 px-3 text-slate-500 border-l border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-400 font-mono text-xs">
                    .{parentDomain}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Domain lengkap: <strong className="font-mono text-sky-600 dark:text-sky-400">{subPrefix ? `${subPrefix}.${parentDomain}` : `[subdomain].${parentDomain}`}</strong>
                </p>
              </div>

              {/* Automatic Document Root Section */}
              <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 dark:border-sky-900/60 dark:bg-sky-950/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>Document Root:</span>
                    <span className="rounded bg-sky-200/80 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-sky-900 dark:bg-sky-900 dark:text-sky-200">
                      Otomatis
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isCustomSubDocRoot;
                      setIsCustomSubDocRoot(next);
                      if (!next) {
                        setSubDocRoot(`/home/${account.username}/public_html/${subPrefix || 'subdomain'}`);
                      }
                    }}
                    className="text-[11px] font-semibold text-sky-700 hover:underline dark:text-sky-300 cursor-pointer"
                  >
                    {isCustomSubDocRoot ? '← Reset ke Otomatis' : '⚙️ Ubah Root Kustom'}
                  </button>
                </div>

                <input
                  type="text"
                  value={isCustomSubDocRoot ? subDocRoot : `/home/${account.username}/public_html/${subPrefix || 'subdomain'}`}
                  onChange={e => setSubDocRoot(e.target.value)}
                  disabled={!isCustomSubDocRoot}
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-xs transition-colors ${
                    isCustomSubDocRoot
                      ? 'border-sky-500 bg-white text-slate-900 ring-2 ring-sky-500/20 dark:bg-slate-900 dark:text-white'
                      : 'border-slate-200 bg-white/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                />

                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  Sistem otomatis membuat folder <code>/public_html/{subPrefix || '[subdomain]'}/</code> di akun Linux Anda beserta template <code>index.php</code> starter.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  PHP Runtime untuk Subdomain:
                </label>
                <select
                  value={subPhpVersion}
                  onChange={e => setSubPhpVersion(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="7.2">PHP 7.2 (Rekomendasi Rapor Digital Madrasah / RDM)</option>
                  <option value="7.4">PHP 7.4 (Rekomendasi CBT / Ujian Online)</option>
                  <option value="8.0">PHP 8.0</option>
                  <option value="8.1">PHP 8.1</option>
                  <option value="8.2">PHP 8.2 (LTS)</option>
                  <option value="8.3">PHP 8.3 (Terbaru)</option>
                </select>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Otomatisasi Sistem Terintegrasi:</span>
                </div>
                <p>
                  DNS A Record untuk <code>{subPrefix || 'subdomain'}.{parentDomain}</code> otomatis diarahkan ke IP <code>{account.ipAddress}</code> dan sertifikat SSL Let&apos;s Encrypt akan diaktifkan secara instan.
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubdomainModal(false)}
                  className="rounded-lg border px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSub}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>{isSubmittingSub ? 'Membuat...' : 'Buat Subdomain'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Addon Domain Baru */}
      {showAddonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-indigo-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Tambah Addon Domain Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddonModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAddonDomain} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Nama Domain Baru: *
                </label>
                <input
                  type="text"
                  value={addonDomain}
                  onChange={e => handleAddonDomainChange(e.target.value)}
                  placeholder="alumni-madrasah.sch.id"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                  autoFocus
                />
              </div>

              {/* Automatic Document Root Section */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>Document Root:</span>
                    <span className="rounded bg-indigo-200/80 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200">
                      Otomatis
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isCustomAddonDocRoot;
                      setIsCustomAddonDocRoot(next);
                      if (!next) {
                        setAddonDocRoot(`/home/${account.username}/${addonDomain || 'domain-baru.com'}`);
                      }
                    }}
                    className="text-[11px] font-semibold text-indigo-700 hover:underline dark:text-indigo-300 cursor-pointer"
                  >
                    {isCustomAddonDocRoot ? '← Reset ke Otomatis' : '⚙️ Ubah Root Kustom'}
                  </button>
                </div>

                <input
                  type="text"
                  value={isCustomAddonDocRoot ? addonDocRoot : `/home/${account.username}/${addonDomain || 'domain-baru.com'}`}
                  onChange={e => setAddonDocRoot(e.target.value)}
                  disabled={!isCustomAddonDocRoot}
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-xs transition-colors ${
                    isCustomAddonDocRoot
                      ? 'border-indigo-500 bg-white text-slate-900 ring-2 ring-indigo-500/20 dark:bg-slate-900 dark:text-white'
                      : 'border-slate-200 bg-white/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                />

                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  Sistem otomatis menyiapkan folder terisolasi untuk addon domain ini agar tidak bercampur dengan domain utama.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  PHP Runtime:
                </label>
                <select
                  value={addonPhpVersion}
                  onChange={e => setAddonPhpVersion(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="8.3">PHP 8.3 (Terbaru)</option>
                  <option value="8.2">PHP 8.2 (LTS)</option>
                  <option value="8.1">PHP 8.1</option>
                  <option value="8.0">PHP 8.0</option>
                  <option value="7.4">PHP 7.4</option>
                  <option value="7.2">PHP 7.2</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddonModal(false)}
                  className="rounded-lg border px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddon}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>{isSubmittingAddon ? 'Menambahkan...' : 'Tambah Addon Domain'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewTarget && (
        <WebsitePreviewModal
          isOpen={!!previewTarget}
          onClose={() => setPreviewTarget(null)}
          account={account}
          initialDomain={previewTarget.domain}
          initialDocRoot={previewTarget.docRoot}
          onOpenFileManager={onOpenFileManager}
        />
      )}
    </div>
  );
};
