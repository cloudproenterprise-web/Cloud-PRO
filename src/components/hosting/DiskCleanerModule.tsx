import React, { useState, useEffect, useMemo } from 'react';
import {
  Trash2,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  HardDrive,
  Globe,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  FileCode2,
} from 'lucide-react';
import { HostingAccount } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

interface JunkCategoryItem {
  id: string;
  title: string;
  description: string;
  count: number;
  sizeBytes: number;
  formattedSize: string;
  safeToClean: boolean;
  samples: string[];
}

interface DomainDiskAuditItem {
  id: string;
  domain: string;
  type: 'primary' | 'subdomain';
  documentRoot: string;
  accountId: string;
  username: string;
  customerName: string;
  phpVersion: string;
  activeFilesCount: number;
  activeSizeBytes: number;
  activeFormattedSize: string;
  junkCount: number;
  junkBytes: number;
  junkFormattedSize: string;
  junkSampleFiles: string[];
}

interface DiskAuditReport {
  ok: boolean;
  auditedAt: string;
  summary: {
    totalActiveBytes: number;
    totalActiveFormatted: string;
    totalActiveFiles: number;
    totalJunkBytes: number;
    totalJunkFormatted: string;
    totalJunkFiles: number;
    totalBackupBytes: number;
    totalBackupFormatted: string;
    totalBackupFiles: number;
    accountsCount: number;
    domainsCount: number;
  };
  domains: DomainDiskAuditItem[];
  junkCategories: JunkCategoryItem[];
}

export interface DiskCleanerModuleProps {
  account?: HostingAccount;
  onOpenFileManager?: (targetPath: string) => void;
  onNavigateTab?: (tab: string, domain?: string) => void;
}

export const DiskCleanerModule: React.FC<DiskCleanerModuleProps> = ({
  account,
  onNavigateTab,
}) => {
  const { currentUser } = useAuth();
  const { showToast, refreshAll, accounts } = useServer();

  const isCustomer = currentUser?.role === 'customer';
  const isReseller = currentUser?.role === 'reseller';
  const isAdmin = currentUser?.role === 'admin';

  const [report, setReport] = useState<DiskAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCleaningAll, setIsCleaningAll] = useState<boolean>(false);
  const [cleaningDocRoot, setCleaningDocRoot] = useState<string | null>(null);
  const [lastCleanBanner, setLastCleanBanner] = useState<string | null>(null);

  const fetchDiskAudit = async (showNotice = false) => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        role: currentUser?.role || 'admin',
        userId: currentUser?.id || '',
        accountId: account?.id || '',
        username: currentUser?.username || '',
      });
      const res = await fetch(`/api/system/disk-audit?${q.toString()}`, {
        headers: {
          'x-cloudpro-role': currentUser?.role || 'admin',
          'x-cloudpro-account-id': account?.id || '',
          'x-cloudpro-user-id': currentUser?.id || '',
          'x-cloudpro-username': currentUser?.username || '',
        },
      });
      const data = await res.json();
      if (data?.ok) {
        setReport(data);
        if (showNotice) {
          showToast(
            'success',
            'Audit Disk Selesai',
            `Pemindaian sampah disk berhasil diperbarui.`
          );
        }
      } else {
        showToast('error', 'Gagal Memindai Sampah', data?.message || 'Terjadi kesalahan saat memindai disk.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal Memindai Sampah', err?.message || 'Koneksi ke server terputus.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiskAudit(false);
  }, [currentUser?.role, account?.id]);

  // STRICT MULTI-TENANCY FILTERING: Exclude Admin domains (denbaguse.my.id)
  const scopedDomains = useMemo((): DomainDiskAuditItem[] => {
    const rawList = report?.domains || [];

    if (isCustomer) {
      return rawList.filter(
        d => d.domain?.toLowerCase() !== 'denbaguse.my.id' &&
             !d.domain?.toLowerCase().endsWith('.denbaguse.my.id') &&
             ((account?.id && d.accountId === account.id) ||
              (currentUser?.username && d.username?.toLowerCase() === currentUser.username.toLowerCase()))
      );
    }

    if (isReseller) {
      const resellerAccountIds = new Set(
        accounts
          .filter(acc =>
            acc.resellerId === currentUser?.id &&
            acc.id !== 'acc-rdm-01' &&
            acc.primaryDomain?.toLowerCase() !== 'denbaguse.my.id' &&
            acc.customerId !== 'usr-admin-01'
          )
          .map(acc => acc.id)
      );

      return rawList.filter(
        d => d.domain?.toLowerCase() !== 'denbaguse.my.id' &&
             !d.domain?.toLowerCase().endsWith('.denbaguse.my.id') &&
             (resellerAccountIds.has(d.accountId) || (account?.id && d.accountId === account.id))
      );
    }

    return rawList;
  }, [report?.domains, isCustomer, isReseller, account, currentUser, accounts]);

  const domainsWithJunk = useMemo(() => {
    return scopedDomains.filter(d => (d.junkCount || 0) > 0);
  }, [scopedDomains]);

  const totalScopedJunkFiles = useMemo(() => {
    return scopedDomains.reduce((s, d) => s + (d.junkCount || 0), 0);
  }, [scopedDomains]);

  const totalScopedJunkBytes = useMemo(() => {
    return scopedDomains.reduce((s, d) => s + (d.junkBytes || 0), 0);
  }, [scopedDomains]);

  const totalScopedActiveBytes = useMemo(() => {
    return scopedDomains.reduce((s, d) => s + (d.activeSizeBytes || 0), 0);
  }, [scopedDomains]);

  const totalScopedActiveFiles = useMemo(() => {
    return scopedDomains.reduce((s, d) => s + (d.activeFilesCount || 0), 0);
  }, [scopedDomains]);

  const scopedJunkCategories = useMemo(() => {
    if (!isAdmin) {
      // Non-admins never see cluster-level bundle files or admin ghost paths
      return [];
    }
    return report?.junkCategories || [];
  }, [isAdmin, report?.junkCategories]);

  const hasAnyJunk = totalScopedJunkFiles > 0;

  const handleCleanAllJunk = async () => {
    setIsCleaningAll(true);
    setLastCleanBanner(null);
    try {
      // Disallow non-admins from cleaning /public_html
      const targetDoc = isCustomer
        ? (account?.documentRoot || scopedDomains[0]?.documentRoot || `/home/${currentUser?.username || 'pelanggan'}/public_html`)
        : isReseller
        ? (account?.documentRoot || scopedDomains[0]?.documentRoot || undefined)
        : undefined;

      if (!isAdmin && (!targetDoc || targetDoc === '/public_html')) {
        showToast('error', 'Akses Ditolak', 'Pembersihan root server dilindungi untuk Root Administrator.');
        setIsCleaningAll(false);
        return;
      }

      const q = new URLSearchParams({
        role: currentUser?.role || 'admin',
        userId: currentUser?.id || '',
        accountId: account?.id || '',
        username: currentUser?.username || '',
      });
      const res = await fetch(`/api/system/clean-disk?${q.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cloudpro-role': currentUser?.role || 'admin',
          'x-cloudpro-account-id': account?.id || '',
          'x-cloudpro-user-id': currentUser?.id || '',
          'x-cloudpro-username': currentUser?.username || '',
        },
        body: JSON.stringify(targetDoc ? { targetDocRoot: targetDoc } : {}),
      });
      const data = await res.json();
      if (data?.ok) {
        if (data.audit) {
          setReport(data.audit);
        } else {
          await fetchDiskAudit(false);
        }
        refreshAll();
        setLastCleanBanner(data.message);
        showToast(
          'success',
          'Pembersihan Sampah Selesai!',
          data.message || 'Berkas sampah berhasil dibersihkan dengan aman.'
        );
      } else {
        showToast('error', 'Gagal Membersihkan Disk', data?.message || 'Terjadi kesalahan.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal Membersihkan Disk', err?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsCleaningAll(false);
    }
  };

  const handleCleanSingleDomain = async (docRoot: string, domainName: string) => {
    // Security check: disallow non-admins from cleaning /public_html
    if (!isAdmin && docRoot === '/public_html') {
      showToast('error', 'Akses Ditolak', 'Folder root server admin dilindungi.');
      return;
    }

    setCleaningDocRoot(docRoot);
    try {
      const q = new URLSearchParams({
        role: currentUser?.role || 'admin',
        userId: currentUser?.id || '',
        accountId: account?.id || '',
        username: currentUser?.username || '',
      });
      const res = await fetch(`/api/system/clean-disk?${q.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cloudpro-role': currentUser?.role || 'admin',
          'x-cloudpro-account-id': account?.id || '',
          'x-cloudpro-user-id': currentUser?.id || '',
          'x-cloudpro-username': currentUser?.username || '',
        },
        body: JSON.stringify({ targetDocRoot: docRoot }),
      });
      const data = await res.json();
      if (data?.ok) {
        if (data.audit) {
          setReport(data.audit);
        } else {
          await fetchDiskAudit(false);
        }
        refreshAll();
        showToast(
          'success',
          `Pembersihan ${domainName} Selesai!`,
          data.message || 'Sampah folder website berhasil dibersihkan.'
        );
      } else {
        showToast('error', 'Gagal Membersihkan', data?.message || 'Terjadi kesalahan.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal Membersihkan', err?.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setCleaningDocRoot(null);
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Top Executive Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Trash2 className="h-3.5 w-3.5" /> Modul Mandiri Disk Cleaner
              </span>
              <span aria-hidden="true">·</span>
              <span>Pembersih Berkas Sampah (Zero Error)</span>
              {report?.auditedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Diperbarui {new Date(report.auditedAt).toLocaleTimeString('id-ID')}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Pembersih Disk &amp; File Sampah (Disk Cleaner)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {isCustomer
                ? 'Secara cerdas mendeteksi dan membersihkan cache sisa build dan berkas sementara pada website Anda tanpa menyentuh database atau uploads.'
                : isReseller
                ? 'Pembersihan aman dan terisolasi untuk direktori website klien mitra reseller Anda.'
                : 'Secara cerdas mendeteksi dan menghapus file chunk JS/CSS usang, cache ekstraksi ZIP sementara, dan crash log lama tanpa merusak website, database, atau direktori uploads.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchDiskAudit(true)}
              disabled={isLoading || isCleaningAll}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
              ) : (
                <RefreshCw className="h-4 w-4 text-sky-600" />
              )}
              <span>Pindai Sampah</span>
            </button>

            <button
              type="button"
              onClick={handleCleanAllJunk}
              disabled={isCleaningAll || isLoading}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-xs cursor-pointer transition-colors disabled:opacity-60"
            >
              {isCleaningAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span>
                {hasAnyJunk
                  ? `Bersihkan Semua Sampah (${totalScopedJunkFiles} Item)`
                  : 'Bersihkan & Optimasi Disk (Aman)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab?.('disk-usage')}
              className="flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 cursor-pointer transition-colors"
            >
              <HardDrive className="h-4 w-4" />
              <span>Buka Modul Disk Usage</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Clean Result Notification Strip */}
        {lastCleanBanner && (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Optimasi Penyimpanan Berhasil Dieksekusi Tanpa Error</p>
              <p className="mt-0.5 text-emerald-800 dark:text-emerald-300">{lastCleanBanner}</p>
            </div>
          </div>
        )}

        {/* 3 Telemetry Metrics */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="space-y-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Sampah Terdeteksi</div>
            <div
              className={`font-mono text-2xl font-bold tabular-nums ${
                hasAnyJunk ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {hasAnyJunk ? `${(totalScopedJunkBytes / 1024).toFixed(1)} KB` : '0 B (100% Bersih)'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {hasAnyJunk
                ? `${totalScopedJunkFiles} file sisa instalasi siap dilepas`
                : 'Penyimpanan terisolasi dalam kondisi prima'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">Keamanan Pembersihan</div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-lg">
              <ShieldCheck className="h-5 w-5" />
              <span>100% Zero-Error Safe</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Database (.sql/.json) &amp; folder uploads dilindungi penuh
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">Pemakaian Berkas Aktif</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {isAdmin ? (report?.summary?.totalActiveFormatted || '0 B') : totalScopedActiveBytes >= 1024 * 1024 ? `${(totalScopedActiveBytes / (1024 * 1024)).toFixed(1)} MB` : `${(totalScopedActiveBytes / 1024).toFixed(1)} KB`}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {isAdmin ? (report?.summary?.totalActiveFiles || 0) : totalScopedActiveFiles} berkas aktif yang dipertahankan
            </div>
          </div>
        </div>
      </div>

      {/* Safety Guarantee Explanation */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1 max-w-3xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Mesin Deteksi Sampah Pintar CloudPRO (Zero-Error Dependency Graph)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Sebelum menghapus file di folder <code className="font-mono">assets/</code>, sistem CloudPRO membaca <code className="font-mono">index.html</code> aktif pada masing-masing domain, lalu memetakan seluruh rantai import file JS, CSS, dan font yang sedang aktif. Hanya file chunk yatim sisa build lama yang tidak terhubung ke aplikasi aktif yang akan dibersihkan.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCleanAllJunk}
            disabled={isCleaningAll}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer shrink-0"
          >
            {isCleaningAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>Jalankan Pembersihan Menyeluruh</span>
          </button>
        </div>

        {/* 4 Junk Categories Breakdown (Admin only) */}
        {scopedJunkCategories.length > 0 && (
          <div className="mt-6 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {scopedJunkCategories.map((cat, idx) => (
              <div key={cat.id} className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-400">
                      0{idx + 1}.
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {cat.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {cat.description}
                  </p>
                  {cat.samples.length > 0 && (
                    <div className="pt-1 font-mono text-[11px] text-amber-700 dark:text-amber-300">
                      Contoh terdeteksi: {cat.samples.join(' · ')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right font-mono tabular-nums">
                    <div
                      className={`text-sm font-bold ${
                        cat.count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {cat.count > 0 ? `${cat.count} Item (${cat.formattedSize})` : '0 Item (Bersih)'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      100% Aman Dibersihkan
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Domain-specific cleanup section */}
      {domainsWithJunk.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-sky-600" />
              Pembersihan Terarah Per Domain / vHost
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bersihkan file sampah khusus pada direktori website tertentu tanpa mempengaruhi website lainnya:
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
            {domainsWithJunk.map(d => (
              <div key={d.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-sky-600" />
                    <span>{d.domain}</span>
                    <span className="font-sans text-[10px] text-slate-400">({d.customerName})</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{d.documentRoot}</div>
                  {d.junkSampleFiles && d.junkSampleFiles.length > 0 && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 pt-0.5">
                      Sample: {d.junkSampleFiles.slice(0, 2).join(', ')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="font-bold text-amber-600 dark:text-amber-400">{d.junkFormattedSize}</span>
                    <span className="text-slate-400 ml-1">({d.junkCount} item)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCleanSingleDomain(d.documentRoot, d.domain)}
                    disabled={cleaningDocRoot === d.documentRoot}
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 font-sans text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    {cleaningDocRoot === d.documentRoot ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    <span>Bersihkan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
