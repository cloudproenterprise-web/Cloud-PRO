import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Check,
  Save,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sliders,
  Zap,
  Globe,
  Layers,
  FolderOpen,
  PlusCircle,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { HostingAccount, PhpVersion, DomainEntity, PhpDirectives } from '../../types';
import { CloudProApi } from '../../services/api';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

interface PhpConfigManagerProps {
  account: HostingAccount;
  preselectedDomain?: string;
  onNavigateTab?: (tab: string, domain?: string) => void;
}

const AVAILABLE_VERSIONS: {
  version: PhpVersion;
  label: string;
  badge?: string;
  badgeColor?: string;
}[] = [
  {
    version: '7.2',
    label: 'Rapor Digital Madrasah (RDM v1)',
    badge: 'RDM Ready',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  {
    version: '7.3',
    label: 'Legacy PHP',
    badge: 'Legacy',
    badgeColor: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400',
  },
  {
    version: '7.4',
    label: 'Popular CMS / RDM v2 / CBT',
    badge: 'RDM v2 / CBT',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300',
  },
  {
    version: '8.0',
    label: 'PHP 8.0 Runtime',
    badge: 'Stable',
    badgeColor: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400',
  },
  {
    version: '8.1',
    label: 'Modern Frameworks',
    badge: 'Active',
    badgeColor: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400',
  },
  {
    version: '8.2',
    label: 'Stabil LTS',
    badge: 'LTS',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300',
  },
  {
    version: '8.3',
    label: 'Terbaru & Tercepat',
    badge: 'Recommended',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300',
  },
];

const AVAILABLE_EXTENSIONS = [
  {
    id: 'ioncube',
    name: 'ionCube Loader',
    desc: 'Wajib untuk Rapor Digital Madrasah (RDM), WHMCS & source code terenkripsi ionCube',
    isRdmCrucial: true,
  },
  {
    id: 'mysqli',
    name: 'mysqli',
    desc: 'MySQL Database Improved extension (Wajib untuk database RDM & WordPress)',
    isRdmCrucial: true,
  },
  {
    id: 'pdo',
    name: 'pdo_mysql',
    desc: 'PHP Data Objects driver MySQL (Koneksi ORM & query RDM)',
    isRdmCrucial: true,
  },
  {
    id: 'curl',
    name: 'curl',
    desc: 'HTTP client untuk sinkronisasi web service EMIS Kemenag & API luar',
    isRdmCrucial: true,
  },
  {
    id: 'gd',
    name: 'gd',
    desc: 'Manipulasi gambar, pasfoto siswa, ijazah & logo madrasah',
    isRdmCrucial: true,
  },
  {
    id: 'mbstring',
    name: 'mbstring',
    desc: 'Multibyte string untuk penulisan aksara Arab, Pegon & karakter lokal',
    isRdmCrucial: true,
  },
  {
    id: 'zip',
    name: 'zip',
    desc: 'Ekspor berkas rapor format Excel/ZIP & restore backup database',
    isRdmCrucial: true,
  },
  {
    id: 'xml',
    name: 'xml / dom / simplexml',
    desc: 'Parser dokumen XML & Office Spreadsheet generator untuk rapor',
    isRdmCrucial: true,
  },
  {
    id: 'fileinfo',
    name: 'fileinfo',
    desc: 'Deteksi tipe berkas (MIME) upload dokumen persyaratan & foto siswa',
    isRdmCrucial: true,
  },
  {
    id: 'intl',
    name: 'intl',
    desc: 'Format penanggalan Hijriah/Masehi & pelokalan laporan pendidikan',
    isRdmCrucial: true,
  },
  {
    id: 'bcmath',
    name: 'bcmath',
    desc: 'Kalkulasi presisi tinggi untuk pembobotan nilai rata-rata & KKM siswa',
    isRdmCrucial: true,
  },
  {
    id: 'soap',
    name: 'soap',
    desc: 'Protokol SOAP untuk integrasi sinkronisasi data madrasah Kemenag',
    isRdmCrucial: true,
  },
  {
    id: 'opcache',
    name: 'opcache',
    desc: 'Zend Bytecode accelerator akselerasi performa loading aplikasi RDM',
    isRdmCrucial: false,
  },
  {
    id: 'sourceguardian',
    name: 'sourceguardian',
    desc: 'Loader decoder untuk aplikasi terproteksi SourceGuardian (ixed)',
    isRdmCrucial: false,
  },
  {
    id: 'imagick',
    name: 'imagick',
    desc: 'ImageMagick rendering module untuk PDF & sertifikat rapor resolusi tinggi',
    isRdmCrucial: false,
  },
  {
    id: 'exif',
    name: 'exif',
    desc: 'Membaca metadata foto kamera dan rotasi otomatis foto siswa',
    isRdmCrucial: false,
  },
  {
    id: 'sodium',
    name: 'sodium',
    desc: 'Modern cryptographic library untuk autentikasi token secure',
    isRdmCrucial: false,
  },
  {
    id: 'redis',
    name: 'redis',
    desc: 'In-memory Redis cache client untuk penyimpanan session instan',
    isRdmCrucial: false,
  },
];

const RDM_RECOMMENDED_EXTS = [
  'ioncube',
  'mysqli',
  'pdo',
  'curl',
  'gd',
  'mbstring',
  'zip',
  'xml',
  'fileinfo',
  'intl',
  'bcmath',
  'soap',
  'opcache',
];

const DEFAULT_EXTS = [
  'ioncube',
  'mysqli',
  'pdo',
  'curl',
  'opcache',
  'gd',
  'mbstring',
  'zip',
  'xml',
  'fileinfo',
  'intl',
  'bcmath',
];

export const PhpConfigManager: React.FC<PhpConfigManagerProps> = ({
  account,
  preselectedDomain,
  onNavigateTab,
}) => {
  const { currentUser } = useAuth();
  const { showToast, refreshAll } = useServer();

  if (!currentUser || !account) return null;

  const buildDomainList = (): DomainEntity[] => {
    const raw = db.getDomains(account.id);
    const primaryNorm = account.primaryDomain.toLowerCase();
    const hasPrimary = raw.some(d => d.domain.toLowerCase() === primaryNorm);
    const list: DomainEntity[] = hasPrimary
      ? [...raw]
      : [
          {
            id: `dom-primary-${account.id}`,
            accountId: account.id,
            domain: account.primaryDomain,
            type: 'primary',
            documentRoot: account.documentRoot || `/home/${account.username}/public_html`,
            phpVersion: account.phpVersion || '8.2',
            phpExtensions: account.phpExtensions || DEFAULT_EXTS,
            phpDirectives: account.phpDirectives,
            sslStatus: 'active',
            createdAt: account.createdAt || new Date().toISOString(),
          },
          ...raw,
        ];

    // Sort: primary first, then subdomains alphabetically
    return list.sort((a, b) => {
      if (a.type === 'primary' && b.type !== 'primary') return -1;
      if (a.type !== 'primary' && b.type === 'primary') return 1;
      return a.domain.localeCompare(b.domain);
    });
  };

  const [domains, setDomains] = useState<DomainEntity[]>(buildDomainList);
  const [selectedTargetDomain, setSelectedTargetDomain] = useState<string>(() => {
    const list = buildDomainList();
    if (preselectedDomain && list.some(d => d.domain.toLowerCase() === preselectedDomain.toLowerCase())) {
      return preselectedDomain;
    }
    return account.primaryDomain;
  });

  // Quick Create Subdomain Modal State
  const [showNewSubModal, setShowNewSubModal] = useState(false);
  const [newSubPrefix, setNewSubPrefix] = useState('');
  const [newSubPhpVersion, setNewSubPhpVersion] = useState<PhpVersion>('7.2');
  const [isCreatingSub, setIsCreatingSub] = useState(false);

  const getDomainDefaultVersion = (dom?: DomainEntity): PhpVersion => {
    if (!dom) return account.phpVersion || '8.2';
    if (dom.phpVersion) return dom.phpVersion;
    if (dom.type === 'primary') return account.phpVersion || '8.2';
    const prefix = (dom.subdomainPrefix || dom.domain.split('.')[0] || '').toLowerCase();
    if (prefix === 'rdm') return '7.2';
    if (prefix === 'cbt') return '7.4';
    return account.phpVersion || '8.2';
  };

  const getDomainDefaultExts = (dom?: DomainEntity): string[] => {
    if (dom?.phpExtensions && dom.phpExtensions.length > 0) {
      return dom.phpExtensions;
    }
    return account.phpExtensions && account.phpExtensions.length > 0
      ? account.phpExtensions
      : DEFAULT_EXTS;
  };

  const getDomainDefaultDirectives = (dom?: DomainEntity): PhpDirectives => {
    if (dom?.phpDirectives) return dom.phpDirectives;
    if (account.phpDirectives) return account.phpDirectives;
    return {
      maxInputVars: 5000,
      maxExecutionTime: 300,
      memoryLimit: '512M',
      uploadMaxFilesize: '128M',
      postMaxSize: '128M',
    };
  };

  const activeDomainEntity =
    domains.find(d => d.domain.toLowerCase() === selectedTargetDomain.toLowerCase()) || domains[0];

  const [selectedVersion, setSelectedVersion] = useState<PhpVersion>(() =>
    getDomainDefaultVersion(activeDomainEntity)
  );
  const [selectedExts, setSelectedExts] = useState<string[]>(() =>
    getDomainDefaultExts(activeDomainEntity)
  );

  // PHP Directives State
  const initialDirectives = getDomainDefaultDirectives(activeDomainEntity);
  const [maxExecutionTime, setMaxExecutionTime] = useState<number>(initialDirectives.maxExecutionTime);
  const [maxInputVars, setMaxInputVars] = useState<number>(initialDirectives.maxInputVars);
  const [memoryLimit, setMemoryLimit] = useState<string>(initialDirectives.memoryLimit);
  const [uploadMaxFilesize, setUploadMaxFilesize] = useState<string>(initialDirectives.uploadMaxFilesize);
  const [postMaxSize, setPostMaxSize] = useState<string>(initialDirectives.postMaxSize);

  const [isSaving, setIsSaving] = useState(false);

  // Sync server-discovered subdomains on mount / account change
  useEffect(() => {
    let isMounted = true;
    const syncServerDomains = async () => {
      try {
        const res = await fetch('/api/backup/domains');
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && Array.isArray(data.domains)) {
            const pDom = account.primaryDomain.toLowerCase();
            let addedOrUpdated = false;
            const currentLocal = db.getDomains(account.id);

            for (const sDom of data.domains) {
              if (!sDom || !sDom.domain) continue;
              const domLower = String(sDom.domain).toLowerCase();
              const belongsToAcc =
                sDom.accountId === account.id ||
                domLower === pDom ||
                domLower.endsWith(`.${pDom}`);
              if (!belongsToAcc) continue;

              const exists = currentLocal.find(d => d.domain.toLowerCase() === domLower);
              if (!exists && domLower !== pDom) {
                const prefix = domLower.endsWith(`.${pDom}`)
                  ? domLower.slice(0, -(pDom.length + 1))
                  : domLower.split('.')[0];
                const relDoc = String(sDom.documentRoot || `/public_html/${prefix}`).replace(
                  /^\/home\/[^/]+/,
                  ''
                );
                db.saveDomain({
                  id: sDom.id || `dom-sub-${prefix}`,
                  accountId: account.id,
                  domain: sDom.domain,
                  type: 'subdomain',
                  parentDomain: account.primaryDomain,
                  subdomainPrefix: prefix,
                  documentRoot: `/home/${account.username}${relDoc.startsWith('/') ? relDoc : '/' + relDoc}`,
                  phpVersion:
                    (sDom.phpVersion as PhpVersion) ||
                    (prefix === 'rdm' ? '7.2' : prefix === 'cbt' ? '7.4' : '8.2'),
                  sslStatus: 'active',
                  createdAt: new Date().toISOString(),
                });
                addedOrUpdated = true;
              }
            }

            if (isMounted && addedOrUpdated) {
              setDomains(buildDomainList());
            }
          }
        }
      } catch {
        // Ignore offline error
      }
    };

    const refreshed = buildDomainList();
    setDomains(refreshed);
    const nextTarget =
      preselectedDomain && refreshed.some(d => d.domain.toLowerCase() === preselectedDomain.toLowerCase())
        ? preselectedDomain
        : account.primaryDomain;
    handleSelectTargetDomain(nextTarget, refreshed);
    syncServerDomains();

    return () => {
      isMounted = false;
    };
  }, [account.id, account.primaryDomain, preselectedDomain]);

  const handleSelectTargetDomain = (domainName: string, domainListOverride?: DomainEntity[]) => {
    const list = domainListOverride || domains;
    const found =
      list.find(d => d.domain.toLowerCase() === domainName.toLowerCase()) || list[0];
    setSelectedTargetDomain(found ? found.domain : domainName);

    const ver = getDomainDefaultVersion(found);
    const exts = getDomainDefaultExts(found);
    const dirs = getDomainDefaultDirectives(found);

    setSelectedVersion(ver);
    setSelectedExts(exts);
    setMaxInputVars(dirs.maxInputVars);
    setMaxExecutionTime(dirs.maxExecutionTime);
    setMemoryLimit(dirs.memoryLimit);
    setUploadMaxFilesize(dirs.uploadMaxFilesize);
    setPostMaxSize(dirs.postMaxSize);
  };

  const toggleExt = (id: string) => {
    setSelectedExts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 1-Click RDM Preset Handler
  const applyRdmPreset = (ver: PhpVersion = '7.2') => {
    setSelectedVersion(ver);
    const combined = Array.from(new Set([...selectedExts, ...RDM_RECOMMENDED_EXTS]));
    setSelectedExts(combined);
    setMaxExecutionTime(300);
    setMaxInputVars(5000);
    setMemoryLimit('512M');
    setUploadMaxFilesize('128M');
    setPostMaxSize('128M');
    showToast(
      'success',
      `Profil RDM Diterapkan (${selectedTargetDomain})`,
      `Target ${selectedTargetDomain} diset ke PHP ${ver}, ionCube Loader aktif, 12 ekstensi wajib RDM, dan max_input_vars: 5000. Klik Simpan Konfigurasi PHP untuk menyimpan.`
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const directives: PhpDirectives = {
        maxInputVars,
        maxExecutionTime,
        memoryLimit,
        uploadMaxFilesize,
        postMaxSize,
      };

      await CloudProApi.updatePhpConfig(
        account.id,
        selectedVersion,
        selectedExts,
        currentUser,
        {
          targetDomain: selectedTargetDomain,
          documentRoot: activeDomainEntity?.documentRoot,
          phpDirectives: directives,
        }
      );

      const updatedList = buildDomainList();
      setDomains(updatedList);
      showToast(
        'success',
        'Konfigurasi PHP Berhasil Disimpan',
        `Runtime ${selectedTargetDomain} berhasil dialihkan ke PHP ${selectedVersion} dengan ${selectedExts.length} ekstensi aktif.`
      );
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Memperbarui PHP', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateQuickSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrefix = newSubPrefix.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (!cleanPrefix) {
      showToast('error', 'Prefix Kosong', 'Masukkan nama prefix subdomain (misal: rdm, cbt, ppdb).');
      return;
    }

    setIsCreatingSub(true);
    try {
      const created = await CloudProApi.createSubdomain(
        {
          accountId: account.id,
          subdomainPrefix: cleanPrefix,
          parentDomain: account.primaryDomain,
          documentRoot: `/home/${account.username}/public_html/${cleanPrefix}`,
          phpVersion: newSubPhpVersion,
        },
        currentUser
      );

      const updatedList = buildDomainList();
      setDomains(updatedList);
      handleSelectTargetDomain(created.domain, updatedList);
      setShowNewSubModal(false);
      setNewSubPrefix('');
      refreshAll();
      showToast(
        'success',
        'Subdomain Dibuat & Dipilih',
        `Subdomain ${created.domain} (PHP ${newSubPhpVersion}) aktif dan siap dikonfigurasi.`
      );
    } catch (err: any) {
      showToast('error', 'Gagal Membuat Subdomain', err.message);
    } finally {
      setIsCreatingSub(false);
    }
  };

  const isRdmReady =
    selectedExts.includes('ioncube') &&
    selectedExts.includes('mysqli') &&
    selectedExts.includes('pdo') &&
    selectedExts.includes('curl') &&
    selectedExts.includes('gd') &&
    selectedExts.includes('mbstring') &&
    selectedExts.includes('zip') &&
    (selectedVersion === '7.2' || selectedVersion === '7.4');

  const subdomainsCount = domains.filter(d => d.type === 'subdomain').length;
  const isTargetSubdomain = activeDomainEntity?.type === 'subdomain';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Manajemen Runtime PHP Multi-Domain &amp; Subdomain
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Atur versi PHP, ionCube Loader, dan direktif <code>php.ini</code> secara spesifik untuk <strong>Domain Utama</strong> maupun masing-masing <strong>Subdomain</strong> pada akun <strong className="text-slate-700 dark:text-slate-200 font-mono">{account.primaryDomain}</strong>.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50 shadow-xs cursor-pointer transition-colors shrink-0"
        >
          <Save className="h-3.5 w-3.5" />
          <span>
            {isSaving
              ? 'Menyimpan...'
              : `Simpan PHP (${selectedTargetDomain})`}
          </span>
        </button>
      </div>

      {/* 0. Target Domain & Subdomain Selector Card */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50/70 via-indigo-50/30 to-white p-5 shadow-xs dark:border-violet-900/60 dark:from-violet-950/30 dark:via-slate-900 dark:to-slate-900 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white shadow-2xs">
                <Globe className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                <span>Pilih Target Domain / Subdomain</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  · 1 Domain Utama &amp; {subdomainsCount} Subdomain Aktif
                </span>
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Setiap subdomain dapat memiliki versi PHP berbeda (contoh: domain utama <code className="font-mono font-semibold">{account.primaryDomain}</code> memakai <strong>PHP 8.2</strong>, sedangkan subdomain <code className="font-mono font-semibold">rdm.{account.primaryDomain}</code> memakai <strong>PHP 7.2 + ionCube</strong>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowNewSubModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>+ Tambah Subdomain</span>
            </button>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('domains', selectedTargetDomain)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs cursor-pointer transition-colors"
              >
                <Layers className="h-3.5 w-3.5 text-sky-600" />
                <span>Kelola Semua Subdomain</span>
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Selector + Active Context Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pt-2 border-t border-violet-200/60 dark:border-violet-900/40">
          <div className="lg:col-span-6">
            <label
              htmlFor="php-target-domain-select"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
            >
              Dropdown Pilihan Domain Utama &amp; Subdomain:
            </label>
            <div className="relative">
              <select
                id="php-target-domain-select"
                value={selectedTargetDomain}
                onChange={e => handleSelectTargetDomain(e.target.value)}
                className="w-full appearance-none rounded-xl border border-violet-300 bg-white pl-3.5 pr-10 py-2.5 font-mono text-xs font-bold text-slate-900 shadow-2xs focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 focus:outline-hidden cursor-pointer dark:border-violet-700 dark:bg-slate-800 dark:text-white"
              >
                <optgroup label="Domain Utama (Primary Domain)">
                  {domains
                    .filter(d => d.type === 'primary')
                    .map(dom => (
                      <option key={dom.id} value={dom.domain}>
                        🌐 {dom.domain} — [Domain Utama • PHP {getDomainDefaultVersion(dom)}] ({dom.documentRoot})
                      </option>
                    ))}
                </optgroup>
                {domains.some(d => d.type === 'subdomain') && (
                  <optgroup label="Daftar Subdomain Aktif">
                    {domains
                      .filter(d => d.type === 'subdomain')
                      .map(dom => (
                        <option key={dom.id} value={dom.domain}>
                          ↳ {dom.domain} — [Subdomain • PHP {getDomainDefaultVersion(dom)}] ({dom.documentRoot})
                        </option>
                      ))}
                  </optgroup>
                )}
                {domains.some(d => d.type !== 'primary' && d.type !== 'subdomain') && (
                  <optgroup label="Addon / Alias Domain">
                    {domains
                      .filter(d => d.type !== 'primary' && d.type !== 'subdomain')
                      .map(dom => (
                        <option key={dom.id} value={dom.domain}>
                          ⊕ {dom.domain} — [Addon Domain • PHP {getDomainDefaultVersion(dom)}] ({dom.documentRoot})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-violet-600">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Target Terpilih
              </div>
              <div className="mt-0.5 font-mono text-xs font-bold text-violet-700 dark:text-violet-300 truncate">
                {selectedTargetDomain}
              </div>
              <div className="text-[10px] text-slate-500">
                {isTargetSubdomain ? 'Subdomain Terisolasi' : 'Domain Utama'}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Document Root
              </div>
              <div
                className="mt-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate"
                title={activeDomainEntity?.documentRoot || `/home/${account.username}/public_html`}
              >
                {(activeDomainEntity?.documentRoot || `/home/${account.username}/public_html`).replace(
                  `/home/${account.username}`,
                  ''
                ) || '/public_html'}
              </div>
              <div className="text-[10px] text-emerald-600">Nginx FPM Socket Ready</div>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Runtime Aktif
              </div>
              <div className="mt-0.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                PHP {selectedVersion}
              </div>
              <div className="text-[10px] text-slate-500">
                {selectedExts.includes('ioncube') ? 'ionCube Aktif' : `${selectedExts.length} Ekstensi`}
              </div>
            </div>
          </div>
        </div>

        {/* Quick-Select Interactive Subdomain Selector Buttons */}
        <div className="pt-1">
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
            Klik Cepat Domain / Subdomain untuk Mengatur PHP:
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {domains.map(dom => {
              const isCurrent = dom.domain.toLowerCase() === selectedTargetDomain.toLowerCase();
              const domVer = isCurrent ? selectedVersion : getDomainDefaultVersion(dom);
              return (
                <button
                  key={dom.id}
                  type="button"
                  onClick={() => handleSelectTargetDomain(dom.domain)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-violet-600 bg-violet-600 text-white font-bold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Globe className={`h-3.5 w-3.5 shrink-0 ${isCurrent ? 'text-white' : dom.type === 'primary' ? 'text-sky-500' : 'text-indigo-500'}`} />
                  <span className="font-mono">{dom.domain}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    PHP {domVer}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rapor Digital Madrasah (RDM) Dedicated Quick Preset Card */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white p-5 shadow-xs dark:border-emerald-900/60 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                <GraduationCap className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                <span>Profil Kompatibilitas Rapor Digital Madrasah (RDM)</span>
                <span className="font-mono text-xs text-emerald-700 dark:text-emerald-300">
                  [{selectedTargetDomain}]
                </span>
                {isRdmReady ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> RDM Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:border-emerald-800 dark:bg-amber-900/60 dark:text-amber-300">
                    <AlertCircle className="h-3 w-3" /> Mode Standar
                  </span>
                )}
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Aplikasi Rapor Digital Madrasah (RDM) membutuhkan <strong>ionCube Loader</strong> untuk menjalankan script terenkripsi, PHP 7.2 (atau 7.4), serta batas <code>max_input_vars: 5000</code> pada subdomain/domain target <strong>{selectedTargetDomain}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => applyRdmPreset('7.2')}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-xs cursor-pointer transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Set RDM (PHP 7.2) ke {selectedTargetDomain}</span>
            </button>
            <button
              type="button"
              onClick={() => applyRdmPreset('7.4')}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-300 shadow-xs cursor-pointer transition-colors"
            >
              <Zap className="h-3.5 w-3.5 text-emerald-600" />
              <span>Profil RDM / CBT (PHP 7.4)</span>
            </button>
          </div>
        </div>

        {/* Feature Checkmarks for RDM */}
        <div className="mt-4 pt-4 border-t border-emerald-200/60 dark:border-emerald-900/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>ionCube Loader Active</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Isolasi PHP Per-Subdomain</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Max Input Vars: 5000</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>MySQLi &amp; Zip Exporter Ready</span>
          </div>
        </div>
      </div>

      {/* 1. PHP Version Selector Cards */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Pilih Versi Runtime PHP — <span className="text-violet-600 font-mono">{selectedTargetDomain}</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih versi runtime yang kompatibel dengan aplikasi web pada <code>{(activeDomainEntity?.documentRoot || '/public_html').replace(`/home/${account.username}`, '')}</code>.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 self-start sm:self-auto">
            Target {selectedTargetDomain}: PHP {selectedVersion}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {AVAILABLE_VERSIONS.map(item => {
            const isSelected = selectedVersion === item.version;
            return (
              <button
                key={item.version}
                type="button"
                onClick={() => setSelectedVersion(item.version)}
                className={`relative flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50/80 text-violet-900 dark:border-violet-500 dark:bg-violet-950/50 dark:text-violet-200 ring-2 ring-violet-500/20 shadow-xs'
                    : 'border-slate-200/90 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60'
                }`}
              >
                {item.badge && (
                  <span
                    className={`absolute -top-2 px-1.5 py-0.2 rounded-md font-mono text-[9px] font-bold border shadow-2xs ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
                <span className="font-mono text-base font-bold mt-1">PHP {item.version}</span>
                <span className="mt-1 text-[10.5px] text-slate-400 line-clamp-1 leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1.5 Multi-Domain & Subdomain PHP Runtime Matrix Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Tabel Status PHP Domain Utama &amp; Subdomain ({domains.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Klik baris atau tombol di kanan untuk beralih target konfigurasi PHP
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Domain / Subdomain</th>
                <th className="px-5 py-3">Tipe</th>
                <th className="px-5 py-3">Document Root</th>
                <th className="px-5 py-3">Versi PHP</th>
                <th className="px-5 py-3">Modul Ekstensi</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {domains.map(dom => {
                const isCurrent = dom.domain.toLowerCase() === selectedTargetDomain.toLowerCase();
                const ver = isCurrent ? selectedVersion : getDomainDefaultVersion(dom);
                const exts = isCurrent ? selectedExts : getDomainDefaultExts(dom);
                const hasIoncube = exts.includes('ioncube');
                const shortDocRoot =
                  (dom.documentRoot || `/home/${account.username}/public_html`).replace(
                    `/home/${account.username}`,
                    ''
                  ) || '/public_html';

                return (
                  <tr
                    key={dom.id}
                    onClick={() => handleSelectTargetDomain(dom.domain)}
                    className={`transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-violet-50/70 dark:bg-violet-950/30'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Globe
                          className={`h-4 w-4 shrink-0 ${
                            isCurrent
                              ? 'text-violet-600'
                              : dom.type === 'primary'
                              ? 'text-sky-500'
                              : 'text-indigo-500'
                          }`}
                        />
                        <div>
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {dom.domain}
                          </div>
                          {dom.parentDomain && dom.type === 'subdomain' && (
                            <div className="text-[10px] text-slate-400">
                              Induk: {dom.parentDomain}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {dom.type === 'primary'
                          ? 'Primary Domain'
                          : dom.type === 'subdomain'
                          ? 'Subdomain'
                          : 'Addon Domain'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <code className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {shortDocRoot}
                      </code>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono font-bold text-violet-700 dark:text-violet-300">
                        PHP {ver}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">
                        {exts.length} Ekstensi {hasIoncube ? '· ionCube Aktif' : ''}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleSelectTargetDomain(dom.domain);
                        }}
                        className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-violet-600 text-white'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {isCurrent ? 'Sedang Dikonfigurasi' : 'Pilih & Atur PHP'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. PHP Extensions Grid with ionCube Highlight */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Modul &amp; Ekstensi PHP ({selectedExts.length} Aktif pada <span className="text-violet-600 font-mono">{selectedTargetDomain}</span>)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Klik kotak modul untuk mengaktifkan atau menonaktifkan ekstensi pada <strong>{selectedTargetDomain}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const combined = Array.from(new Set([...selectedExts, ...RDM_RECOMMENDED_EXTS]));
                setSelectedExts(combined);
              }}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer"
            >
              + Centang Semua Ekstensi RDM
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {AVAILABLE_EXTENSIONS.map(ext => {
            const isChecked = selectedExts.includes(ext.id);
            return (
              <div
                key={ext.id}
                onClick={() => toggleExt(ext.id)}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all select-none ${
                  isChecked
                    ? ext.isRdmCrucial
                      ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800/80 dark:bg-emerald-950/20 shadow-2xs'
                      : 'border-violet-300 bg-violet-50/40 dark:border-violet-900/60 dark:bg-violet-950/20 shadow-2xs'
                    : 'border-slate-200/90 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40'
                }`}
              >
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    isChecked
                      ? ext.isRdmCrucial
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-violet-600 bg-violet-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                      {ext.name}
                    </span>
                    {ext.id === 'ioncube' ? (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs shrink-0">
                        LOADER INTI
                      </span>
                    ) : ext.isRdmCrucial ? (
                      <span className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                        RDM
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {ext.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. PHP Directives Tuning (Critical for RDM Batch Input) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-violet-500" />
              <span>Konfigurasi Parameter Direktif php.ini ({selectedTargetDomain})</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Nilai batas sistem untuk mencegah batas waktu (timeout) dan pemotongan input form saat guru mengunggah nilai rapor satu angkatan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMaxExecutionTime(300);
              setMaxInputVars(5000);
              setMemoryLimit('512M');
              setUploadMaxFilesize('128M');
              setPostMaxSize('128M');
              showToast('info', 'Nilai Optimal Diterapkan', `Parameter php.ini untuk ${selectedTargetDomain} telah disesuaikan untuk skala madrasah.`);
            }}
            className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 cursor-pointer"
          >
            Optimalkan Input RDM (5000 Vars)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200/90 p-3.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              max_input_vars (Batas Input Nilai):
            </label>
            <input
              type="number"
              value={maxInputVars}
              onChange={e => setMaxInputVars(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <p className="mt-1 text-[10.5px] text-slate-400">
              Rekomendasi RDM: <strong>3000 - 5000</strong> (mencegah nilai siswa terpotong).
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/90 p-3.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              max_execution_time (Detik):
            </label>
            <input
              type="number"
              value={maxExecutionTime}
              onChange={e => setMaxExecutionTime(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <p className="mt-1 text-[10.5px] text-slate-400">
              Rekomendasi RDM: <strong>300s</strong> (untuk proses kalkulasi rapor PDF).
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/90 p-3.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              memory_limit (Alokasi RAM PHP):
            </label>
            <select
              value={memoryLimit}
              onChange={e => setMemoryLimit(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="256M">256M</option>
              <option value="512M">512M (Rekomendasi RDM)</option>
              <option value="1024M">1024M (1 GB)</option>
            </select>
            <p className="mt-1 text-[10.5px] text-slate-400">
              Mencegah kehabisan memori saat cetak raport massal.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/90 p-3.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              upload_max_filesize:
            </label>
            <select
              value={uploadMaxFilesize}
              onChange={e => setUploadMaxFilesize(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="64M">64M</option>
              <option value="128M">128M (Rekomendasi RDM)</option>
              <option value="256M">256M</option>
            </select>
            <p className="mt-1 text-[10.5px] text-slate-400">
              Untuk unggah berkas arsip ZIP pasfoto siswa madrasah.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/90 p-3.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              post_max_size:
            </label>
            <select
              value={postMaxSize}
              onChange={e => setPostMaxSize(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="64M">64M</option>
              <option value="128M">128M (Rekomendasi RDM)</option>
              <option value="256M">256M</option>
            </select>
            <p className="mt-1 text-[10.5px] text-slate-400">
              Kapasitas payload pengiriman data form rapor.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 p-3.5 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/20 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                allow_url_fopen: On
              </div>
              <p className="mt-1 text-[10.5px] text-emerald-700 dark:text-emerald-400">
                Diperlukan untuk sinkronisasi otomatis pembaruan versi RDM dari server pusat Kemenag.
              </p>
            </div>
            <div className="mt-2 text-[10px] font-mono text-emerald-800 dark:text-emerald-300 font-semibold">
              Status: Aktif &amp; Terkonfigurasi ({selectedTargetDomain})
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Quick Add Subdomain from PHP Selector */}
      {showNewSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-sky-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Tambah Subdomain &amp; Pilih Versi PHP
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewSubModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuickSubdomain} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Prefix Subdomain Baru: *
                </label>
                <div className="mt-1 flex rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
                  <input
                    type="text"
                    value={newSubPrefix}
                    onChange={e => setNewSubPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="rdm / cbt / ppdb / siakad"
                    className="w-1/2 px-3 py-2 font-mono text-xs focus:outline-none dark:bg-slate-800 dark:text-white"
                    required
                    autoFocus
                  />
                  <div className="w-1/2 flex items-center bg-slate-50 px-3 text-slate-500 border-l border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-400 font-mono text-xs">
                    .{account.primaryDomain}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(['rdm', 'cbt', 'elearning', 'ppdb', 'siakad'] as const).map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setNewSubPrefix(preset);
                        setNewSubPhpVersion(preset === 'rdm' ? '7.2' : preset === 'cbt' ? '7.4' : '8.2');
                      }}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 cursor-pointer"
                    >
                      +{preset}.{account.primaryDomain}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Versi PHP untuk Subdomain Ini:
                </label>
                <select
                  value={newSubPhpVersion}
                  onChange={e => setNewSubPhpVersion(e.target.value as PhpVersion)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="7.2">PHP 7.2 (Rekomendasi Rapor Digital Madrasah / RDM)</option>
                  <option value="7.3">PHP 7.3 (Legacy)</option>
                  <option value="7.4">PHP 7.4 (Rekomendasi CBT / RDM v2)</option>
                  <option value="8.0">PHP 8.0</option>
                  <option value="8.1">PHP 8.1</option>
                  <option value="8.2">PHP 8.2 (LTS)</option>
                  <option value="8.3">PHP 8.3 (Terbaru)</option>
                </select>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                Document Root otomatis: <code className="font-mono font-bold">/public_html/{newSubPrefix || 'subdomain'}</code>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewSubModal(false)}
                  className="rounded-lg border px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSub}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-500 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>{isCreatingSub ? 'Membuat...' : 'Buat & Pilih Subdomain'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
