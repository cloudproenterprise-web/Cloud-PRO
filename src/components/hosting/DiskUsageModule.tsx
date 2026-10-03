import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  RefreshCw,
  FolderOpen,
  Globe,
  Loader2,
  Archive,
  Search,
  Database,
  FileCode2,
  Image as ImageIcon,
  Users,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { HostingAccount } from '../../types';
import { useServer } from '../../context/ServerContext';

interface DiskBreakdown {
  appCode: { count: number; bytes: number; formatted: string };
  mediaUploads: { count: number; bytes: number; formatted: string };
  databaseConfig: { count: number; bytes: number; formatted: string };
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
  breakdown: DiskBreakdown;
}

interface AccountDiskAuditItem {
  id: string;
  primaryDomain: string;
  username: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  diskLimitMb: number;
  usedMb: number;
  usagePercent: number;
  activeBytes: number;
  activeFormatted: string;
  activeFilesCount: number;
  junkBytes: number;
  junkFormatted: string;
  junkFilesCount: number;
  breakdown: {
    appCodeFormatted: string;
    mediaUploadsFormatted: string;
    databaseConfigFormatted: string;
  };
  primaryCount: number;
  subdomainsCount: number;
  domains: DomainDiskAuditItem[];
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
  accounts: AccountDiskAuditItem[];
  domains: DomainDiskAuditItem[];
}

export interface DiskUsageModuleProps {
  account?: HostingAccount;
  onOpenFileManager?: (targetPath: string) => void;
  onNavigateTab?: (tab: string, domain?: string) => void;
}

export const DiskUsageModule: React.FC<DiskUsageModuleProps> = ({
  onOpenFileManager,
  onNavigateTab,
}) => {
  const { showToast } = useServer();

  const [report, setReport] = useState<DiskAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeViewTab, setActiveViewTab] = useState<'accounts' | 'domains'>('accounts');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');

  const fetchDiskAudit = async (showNotice = false) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/system/disk-audit');
      const data = await res.json();
      if (data?.ok) {
        setReport(data);
        if (showNotice) {
          showToast(
            'success',
            'Audit Disk Selesai',
            `Total pemakaian riil: ${data.summary.totalActiveFormatted} (${data.summary.totalActiveFiles} berkas aktif).`
          );
        }
      } else {
        showToast('error', 'Gagal Memindai Disk', data?.message || 'Terjadi kesalahan saat memindai disk.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal Memindai Disk', err?.message || 'Koneksi ke server terputus.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiskAudit(false);
  }, []);

  const filteredAccounts = (report?.accounts || []).filter(acc => {
    if (selectedAccountFilter !== 'all' && acc.id !== selectedAccountFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      acc.primaryDomain.toLowerCase().includes(q) ||
      acc.customerName.toLowerCase().includes(q) ||
      acc.username.toLowerCase().includes(q) ||
      acc.domains.some(d => d.domain.toLowerCase().includes(q) || d.documentRoot.toLowerCase().includes(q))
    );
  });

  const filteredDomains = (report?.domains || []).filter(d => {
    if (selectedAccountFilter !== 'all' && d.accountId !== selectedAccountFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.domain.toLowerCase().includes(q) ||
      d.documentRoot.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q) ||
      d.username.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Top Executive Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400">
                <HardDrive className="h-3.5 w-3.5" /> Modul Mandiri Disk Usage
              </span>
              <span aria-hidden="true">·</span>
              <span>Audit Penyimpanan NVMe</span>
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
              Analisa Penggunaan Disk (Storage &amp; Kuota)
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Pantau rincian pemakaian disk riil pada setiap akun hosting, document root website utama, dan folder subdomain secara terisolasi tanpa tercampur.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchDiskAudit(true)}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
              ) : (
                <RefreshCw className="h-4 w-4 text-sky-600" />
              )}
              <span>Pindai Ulang Disk</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab?.('disk-cleaner')}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-xs cursor-pointer transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              <span>Buka Modul Disk Cleaner</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Key Metrics */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="space-y-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Pemakaian Disk Riil</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {report?.summary.totalActiveFormatted || '0 B'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {report?.summary.totalActiveFiles || 0} berkas aktif terverifikasi
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">Total Akun &amp; Hostname</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {report?.summary.accountsCount || 0} Akun · {report?.summary.domainsCount || 0} Web
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Isolasi penuh domain utama &amp; subdomain
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">Cadangan Arsip .ZIP Server</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {report?.summary.totalBackupFormatted || '0 B'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {report?.summary.totalBackupFiles || 0} arsip backup permanen
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">Peluang Optimasi Sampah</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {report?.summary.totalJunkFormatted || '0 B'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={() => onNavigateTab?.('disk-cleaner')}
                className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline dark:text-emerald-400 cursor-pointer"
              >
                Bersihkan di Modul Cleaner <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Switcher & Search Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveViewTab('accounts')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeViewTab === 'accounts'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Per Akun Klien ({report?.accounts.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('domains')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeViewTab === 'domains'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Semua Domain &amp; Subdomain ({report?.domains.length || 0})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedAccountFilter}
            onChange={e => setSelectedAccountFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">Semua Akun Klien</option>
            {(report?.accounts || []).map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.customerName} ({acc.primaryDomain})
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari domain, akun, atau folder..."
              className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-8.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: PER AKUN KLIEN */}
      {activeViewTab === 'accounts' && (
        <div className="space-y-5">
          {filteredAccounts.map(acc => (
            <div
              key={acc.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {acc.customerName}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      @{acc.username}
                    </span>
                    <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                      Paket {acc.planName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Domain Utama: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{acc.primaryDomain}</span> · {acc.customerEmail}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {acc.activeFormatted}
                      <span className="text-xs font-normal text-slate-400"> / {acc.diskLimitMb} MB</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {acc.usagePercent}% Terpakai ({acc.activeFilesCount} berkas)
                    </div>
                  </div>
                  <div className="w-28 sm:w-36">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full transition-all ${
                          acc.usagePercent > 90
                            ? 'bg-rose-500'
                            : acc.usagePercent > 70
                            ? 'bg-amber-500'
                            : 'bg-sky-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(4, acc.usagePercent))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Rincian Komponen Disk */}
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 rounded-lg bg-slate-50/70 p-3 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 text-sky-600" />
                  <div className="text-xs">
                    <span className="text-slate-500">App Code: </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {acc.breakdown?.appCodeFormatted || '0 B'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                  <div className="text-xs">
                    <span className="text-slate-500">Media/Uploads: </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {acc.breakdown?.mediaUploadsFormatted || '0 B'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-purple-600" />
                  <div className="text-xs">
                    <span className="text-slate-500">Database/Config: </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {acc.breakdown?.databaseConfigFormatted || '0 B'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Daftar Subdomain & Folder di dalam Akun ini */}
              <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {acc.domains.map(dom => (
                  <div key={dom.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <Globe className={`h-4 w-4 ${dom.type === 'primary' ? 'text-sky-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="font-mono font-semibold text-slate-900 dark:text-white">
                          {dom.domain}
                          {dom.type === 'primary' && (
                            <span className="ml-1.5 rounded-xs bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                              Utama
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {dom.documentRoot}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {dom.activeFormattedSize}
                        </span>
                        <span className="text-slate-400 ml-1">({dom.activeFilesCount} file)</span>
                      </div>

                      {onOpenFileManager && (
                        <button
                          type="button"
                          onClick={() => onOpenFileManager(dom.documentRoot)}
                          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <FolderOpen className="h-3.5 w-3.5 text-sky-600" />
                          <span>Buka Folder</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredAccounts.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-slate-700">
              Tidak ada akun hosting yang sesuai dengan kriteria pencarian.
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SEMUA DOMAIN & SUBDOMAIN */}
      {activeViewTab === 'domains' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Domain / Hostname</th>
                  <th className="px-4 py-3 font-semibold">Document Root (Path)</th>
                  <th className="px-4 py-3 font-semibold">Akun Pemilik</th>
                  <th className="px-4 py-3 font-semibold">PHP</th>
                  <th className="px-4 py-3 font-semibold text-right">Ukuran Riil</th>
                  <th className="px-4 py-3 font-semibold text-right">Jumlah Berkas</th>
                  <th className="px-4 py-3 font-semibold text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {filteredDomains.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <Globe className={`h-3.5 w-3.5 ${d.type === 'primary' ? 'text-sky-600' : 'text-slate-400'}`} />
                        <span>{d.domain}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {d.documentRoot}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-sans">
                      {d.customerName} (@{d.username})
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        {d.phpVersion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                      {d.activeFormattedSize}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {d.activeFilesCount}
                    </td>
                    <td className="px-4 py-3 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        {onOpenFileManager && (
                          <button
                            type="button"
                            onClick={() => onOpenFileManager(d.documentRoot)}
                            title="Buka Document Root di File Manager"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <FolderOpen className="h-3 w-3 text-sky-600" />
                            <span>Files</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
