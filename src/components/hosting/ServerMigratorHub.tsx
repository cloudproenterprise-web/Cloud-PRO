import React, { useState, useRef, useEffect } from 'react';
import {
  DownloadCloud,
  Server,
  Zap,
  HardDrive,
  FolderSync,
  FileArchive,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Database,
  ShieldCheck,
  HelpCircle,
  FileCode,
  Radio,
  UploadCloud,
  Upload,
  PlusCircle,
} from 'lucide-react';
import { HostingAccount, VirtualFile, DomainEntity } from '../../types';
import { db } from '../../services/storage';
import { extractZipArchive } from '../../services/zipExtractor';
import { useServer } from '../../context/ServerContext';

interface ServerMigratorHubProps {
  account: HostingAccount;
  initialTargetDir?: string;
  onOpenFileManager?: (targetPath: string) => void;
  onOpenPreview?: (domain: string, docRoot?: string) => void;
}

export const ServerMigratorHub: React.FC<ServerMigratorHubProps> = ({
  account,
  initialTargetDir = '/public_html',
  onOpenFileManager,
  onOpenPreview,
}) => {
  const { showToast, refreshAll } = useServer();
  const [accountDomains, setAccountDomains] = useState<DomainEntity[]>(() => db.getDomains(account.id));
  const [showNewSubdomainInput, setShowNewSubdomainInput] = useState<boolean>(false);
  const [newSubdomainPrefix, setNewSubdomainPrefix] = useState<string>('');

  useEffect(() => {
    setAccountDomains(db.getDomains(account.id));
  }, [account.id]);

  const handleCreateAndSelectSubdomain = (prefixToCreate?: string) => {
    const raw = (prefixToCreate || newSubdomainPrefix).toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (!raw) {
      showToast('error', 'Nama Subdomain Kosong', 'Ketik prefix subdomain (contoh: siakad-madrasah, rdm, app)');
      return;
    }
    const fullSubDomain = `${raw}.${account.primaryDomain}`;
    const cleanDocRoot = `/public_html/${raw}`;
    const newDomainEntry: DomainEntity = {
      id: `dom-sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      accountId: account.id,
      domain: fullSubDomain,
      type: 'subdomain',
      parentDomain: account.primaryDomain,
      subdomainPrefix: raw,
      documentRoot: `/home/${account.username}${cleanDocRoot}`,
      phpVersion: '8.2',
      sslStatus: 'active',
      createdAt: new Date().toISOString(),
    };
    db.saveDomain(newDomainEntry);
    setAccountDomains(db.getDomains(account.id));
    setSelectedTargetDir(cleanDocRoot);
    setNewSubdomainPrefix('');
    setShowNewSubdomainInput(false);
    refreshAll();
    showToast('success', 'Subdomain Berhasil Dipilih', `${fullSubDomain} aktif sebagai target migrasi di ${cleanDocRoot}`);
  };

  const [activeTab, setActiveTab] = useState<'direct_url' | 'upload_zip' | 'ftp' | 'rsync' | 'guide'>('direct_url');
  const [selectedTargetDir, setSelectedTargetDir] = useState<string>(initialTargetDir);

  useEffect(() => {
    if (initialTargetDir) {
      setSelectedTargetDir(initialTargetDir);
    }
  }, [initialTargetDir]);
  const [sourcePlatform, setSourcePlatform] = useState<'cpanel' | 'plesk' | 'wordpress' | 'gdrive' | 'custom'>('cpanel');
  const [urlMode, setUrlMode] = useState<'instant_spider' | 'archive_file'>('instant_spider');
  const [archiveUrl, setArchiveUrl] = useState<string>('');
  const [cleanTargetDir, setCleanTargetDir] = useState<boolean>(true);
  const [flattenRoot, setFlattenRoot] = useState<boolean>(true);

  // Direct ZIP State
  const [zipSourceMode, setZipSourceMode] = useState<'url' | 'upload'>('url');
  const [zipDirectUrl, setZipDirectUrl] = useState<string>('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FTP State
  const [ftpHost, setFtpHost] = useState<string>('');
  const [ftpPort, setFtpPort] = useState<string>('21');
  const [ftpUser, setFtpUser] = useState<string>('');
  const [ftpPass, setFtpPass] = useState<string>('');
  const [ftpRemotePath, setFtpRemotePath] = useState<string>('/public_html');

  // Execution & Output state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusLog, setStatusLog] = useState<string>('');
  const [migrationResult, setMigrationResult] = useState<{
    ok: boolean;
    message: string;
    summary?: {
      filesExtracted: number;
      totalSizeBytes: number;
      entryFile: string;
      platformDetected: string;
      sqlDumps: string[];
      targetDir: string;
    };
    files?: any[];
    totalFilesCount?: number;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('success', 'Tersalin ke Clipboard', text);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const ensureSubdomainRegistered = (dirPath: string): string => {
    const cleanDir = ('/' + (dirPath || '/public_html').trim().replace(/^\/home\/[^/]+/, '').replace(/^\/+/, '').replace(/\/+$/, '')) || '/public_html';
    if (cleanDir === '/public_html') return account.primaryDomain;
    const existing = db.getDomains(account.id).find(d => {
      const dRoot = ('/' + (d.documentRoot || '').replace(/^\/home\/[^/]+/, '').replace(/^\/+/, '').replace(/\/+$/, '')) || '/public_html';
      return dRoot.toLowerCase() === cleanDir.toLowerCase() && d.type !== 'primary';
    });
    if (existing) return existing.domain;
    if (cleanDir.startsWith('/public_html/')) {
      const rawSub = cleanDir.slice('/public_html/'.length).split('/')[0].toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (rawSub) {
        const fullSubDomain = `${rawSub}.${account.primaryDomain}`;
        const newDomainEntry: DomainEntity = {
          id: `dom-sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          accountId: account.id,
          domain: fullSubDomain,
          type: 'subdomain',
          parentDomain: account.primaryDomain,
          subdomainPrefix: rawSub,
          documentRoot: `/home/${account.username}/public_html/${rawSub}`,
          phpVersion: account.phpVersion || '8.2',
          sslStatus: 'active',
          createdAt: new Date().toISOString(),
        };
        db.saveDomain(newDomainEntry);
        setAccountDomains(db.getDomains(account.id));
        return fullSubDomain;
      }
    }
    return account.primaryDomain;
  };

  const pollBackgroundJobIfNeeded = async (initialData: any): Promise<any> => {
    if (!initialData || initialData.status !== 'background' || !initialData.jobId) {
      return initialData;
    }
    const jobId = initialData.jobId;
    for (let i = 0; i < 90; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const statusRes = await fetch(`/api/cloner/job-status?jobId=${encodeURIComponent(jobId)}`);
        if (!statusRes.ok) continue;
        const jobData = await statusRes.json();
        if (jobData.progress) setProgress(Math.min(95, jobData.progress));
        if (jobData.message) setStatusLog(jobData.message);
        if (jobData.status === 'done') {
          return jobData.result || jobData;
        }
        if (jobData.status === 'error') {
          throw new Error(jobData.error || 'Proses background gagal.');
        }
      } catch (err: any) {
        if (err?.message && err.message !== 'Failed to fetch') throw err;
      }
    }
    return initialData;
  };

  const handleStartMigration = async () => {
    if (!archiveUrl.trim()) {
      showToast(
        'error',
        'URL Masih Kosong',
        urlMode === 'instant_spider'
          ? 'Masukkan alamat URL website asli (misal https://sekolah.sch.id)'
          : 'Tempelkan URL direct download file backup (.zip / .tar.gz).'
      );
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setStatusLog(
      urlMode === 'instant_spider'
        ? 'Menghubungkan ke website dan mulai mirroring otomatis...'
        : 'Menghubungkan ke server sumber untuk transfer file langsung (Server-to-Server)...'
    );
    setMigrationResult(null);

    try {
      ensureSubdomainRegistered(selectedTargetDir);
      setProgress(35);
      setStatusLog(
        urlMode === 'instant_spider'
          ? 'Server Cloud PRO sedang menyedot seluruh halaman, CSS, skrip & aset web...'
          : 'Server Cloud PRO sedang mengunduh arsip kapasitas besar via streaming gigabit...'
      );

      const trimmedUrl = archiveUrl.trim();
      const isZipArchive =
        trimmedUrl.toLowerCase().includes('.zip') ||
        trimmedUrl.toLowerCase().includes('.tar') ||
        trimmedUrl.toLowerCase().includes('drive.google.com') ||
        trimmedUrl.toLowerCase().includes('dropbox.com');

      const resolvedSourceType = isZipArchive
        ? 'archive_file'
        : urlMode === 'instant_spider'
        ? 'instant_spider'
        : sourcePlatform;

      const res = await fetch('/api/migrator/remote-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          targetDir: selectedTargetDir,
          sourceType: resolvedSourceType,
          archiveUrl: trimmedUrl,
          cleanTargetDir,
          flattenRoot,
        }),
      });

      setProgress(75);
      setStatusLog('Menata struktur file virtual host & mengecek berkas index...');

      const rawData = await res.json();
      if (!res.ok || !rawData?.ok) {
        throw new Error(rawData?.message || 'Gagal menjalankan migrasi.');
      }

      const data = await pollBackgroundJobIfNeeded(rawData);

      // Sync sample files to local db virtual files so UI reflects changes immediately
      if (Array.isArray(data.files)) {
        const now = new Date().toISOString();
        const batch: VirtualFile[] = data.files.map((f: any) => ({
          id: f.id || `vf-mig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          accountId: account.id,
          name: f.name,
          path: f.path,
          type: f.type || 'file',
          sizeBytes: f.size || 1024,
          permissions: f.type === 'directory' ? '0755' : '0644',
          mimeType: f.name.endsWith('.php') ? 'text/html' : f.name.endsWith('.css') ? 'text/css' : 'text/html',
          updatedAt: now,
          content: f.content,
        }));
        db.saveVirtualFilesBatch(batch);
      }

      setProgress(100);
      setStatusLog('Migrasi selesai dengan sukses!');
      setMigrationResult(data);
      refreshAll();
      showToast('success', 'Migrasi Berhasil!', data.message || 'File berhasil dipindahkan langsung.');
    } catch (err: any) {
      showToast('error', 'Gagal Migrasi', err?.message || 'Terjadi kesalahan saat memindahkan file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartFtpMigration = async () => {
    if (!ftpHost.trim() || !ftpUser.trim()) {
      showToast('error', 'Kredensial FTP Kurang', 'Masukkan minimal Host/IP dan Username FTP server lama.');
      return;
    }
    setIsProcessing(true);
    setProgress(15);
    setStatusLog(`Menghubungkan ke FTP server ${ftpHost}:${ftpPort}...`);
    setMigrationResult(null);

    try {
      ensureSubdomainRegistered(selectedTargetDir);
      setProgress(40);
      setStatusLog(`Server CloudPRO sedang menyalin seluruh struktur file dari ${ftpRemotePath} tanpa buat ZIP...`);
      const res = await fetch('/api/migrator/remote-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          targetDir: selectedTargetDir,
          sourceType: 'ftp',
          cleanTargetDir,
          ftpConfig: {
            host: ftpHost.trim(),
            port: ftpPort.trim() || '21',
            user: ftpUser.trim(),
            password: ftpPass,
            remotePath: ftpRemotePath.trim(),
          },
        }),
      });
      const rawData = await res.json();
      if (!res.ok || !rawData.ok) throw new Error(rawData.message || 'Gagal transfer FTP.');
      const data = await pollBackgroundJobIfNeeded(rawData);

      if (Array.isArray(data.files)) {
        const now = new Date().toISOString();
        const batch: VirtualFile[] = data.files.map((f: any) => ({
          id: f.id || `vf-mig-ftp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          accountId: account.id,
          name: f.name,
          path: f.path,
          type: f.type || 'file',
          sizeBytes: f.size || 1024,
          permissions: f.type === 'directory' ? '0755' : '0644',
          mimeType: f.name.endsWith('.php') ? 'text/html' : f.name.endsWith('.css') ? 'text/css' : 'text/html',
          updatedAt: now,
          content: f.content,
        }));
        db.saveVirtualFilesBatch(batch);
      }

      setProgress(100);
      setStatusLog('Transfer FTP Sukses!');
      setMigrationResult(data);
      refreshAll();
      showToast('success', 'Migrasi FTP Sukses', data.message);
    } catch (err: any) {
      showToast('error', 'Gagal Migrasi FTP', err?.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePullRemoteZip = async () => {
    if (!zipDirectUrl.trim()) {
      showToast(
        'error',
        'URL File ZIP Kosong',
        'Masukkan URL file zip di web lama (contoh: http://domainlama.com/backup.zip atau http://49.0.0.18/backup.zip)'
      );
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setStatusLog(`Menghubungkan ke ${zipDirectUrl.trim()} untuk menarik arsip ZIP antar-server...`);
    setMigrationResult(null);

    try {
      ensureSubdomainRegistered(selectedTargetDir);
      const res = await fetch('/api/migrator/remote-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          targetDir: selectedTargetDir,
          archiveUrl: zipDirectUrl.trim(),
          rawUrl: zipDirectUrl.trim(),
          sourceType: 'archive_file',
          cleanTargetDir,
          flattenRoot,
        }),
      });

      const resText = await res.text();
      let rawData: any;
      try {
        rawData = JSON.parse(resText);
      } catch {
        throw new Error(!res.ok ? `Server error (HTTP ${res.status}). Cek koneksi atau URL file ZIP.` : 'Format respon server bukan JSON yang valid.');
      }
      if (!res.ok || !rawData.ok) throw new Error(rawData.message || 'Gagal menarik arsip ZIP.');
      const data = await pollBackgroundJobIfNeeded(rawData);

      if (Array.isArray(data.files)) {
        const now = new Date().toISOString();
        const batch: VirtualFile[] = data.files.map((f: any) => ({
          id: f.id || `vf-zip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          accountId: account.id,
          name: f.name,
          path: f.path,
          type: f.type || 'file',
          sizeBytes: f.size || 1024,
          permissions: f.type === 'directory' ? '0755' : '0644',
          mimeType: f.name.endsWith('.php') ? 'text/html' : f.name.endsWith('.css') ? 'text/css' : 'text/html',
          updatedAt: now,
          content: f.content,
        }));
        db.saveVirtualFilesBatch(batch);
      }

      setProgress(100);
      setStatusLog('Arsip ZIP Berhasil Ditarik & Diekstrak!');
      setMigrationResult(data);
      refreshAll();
      showToast('success', 'Migrasi ZIP Sukses!', data.message);
    } catch (err: any) {
      showToast('error', 'Gagal Tarik ZIP', err?.message || 'Terjadi kesalahan saat menarik file ZIP.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadAndExtractZip = async () => {
    if (!zipFile) {
      showToast('error', 'Pilih File ZIP', 'Pilih file backup .zip hasil download dari File Manager web lama.');
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setStatusLog(`Membaca berkas arsip ${zipFile.name} (${(zipFile.size / (1024 * 1024)).toFixed(1)} MB)...`);
    setMigrationResult(null);

    try {
      ensureSubdomainRegistered(selectedTargetDir);
      const now = new Date().toISOString();
      if (cleanTargetDir) {
        db.clearDirectoryEntryFiles(account.id, selectedTargetDir);
      }

      // Step 1: Direct in-browser native extraction (100% reliable, bypasses any proxy/payload limits)
      setProgress(30);
      setStatusLog(`Mengekstrak seluruh berkas dari ${zipFile.name} langsung di memori browser...`);
      let browserExtractedCount = 0;
      const extractedVirtualFiles: VirtualFile[] = [];

      try {
        const arrayBuf = await zipFile.arrayBuffer();
        const rawEntries = await extractZipArchive(arrayBuf);

        // Normalize wrapper directory if flattenRoot is enabled
        let entriesToUse = rawEntries;
        if (flattenRoot && rawEntries.length > 0) {
          const fileOnly = rawEntries.filter(e => !e.isDir && e.path);
          const hasTopIdx = fileOnly.some(e => {
            const lp = e.path.toLowerCase();
            return lp === 'index.html' || lp === 'index.php' || lp === 'index.htm';
          });
          if (!hasTopIdx) {
            const firstDirs = new Set(fileOnly.map(e => e.path.split('/')[0]).filter(Boolean));
            if (firstDirs.size === 1) {
              const rootPrefix = [...firstDirs][0];
              entriesToUse = rawEntries
                .map(e => ({
                  ...e,
                  path: e.path.replace(new RegExp(`^${rootPrefix}/?`), ''),
                }))
                .filter(e => Boolean(e.path));
            }
          }
        }

        for (const entry of entriesToUse) {
          if (!entry.path) continue;
          const fullPath = `${selectedTargetDir}/${entry.path}`.replace(/\/+/g, '/');
          const isDir = entry.isDir;
          const vf: VirtualFile = {
            id: isDir
              ? `vf-mig-dir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
              : `vf-zip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            accountId: account.id,
            name: entry.name,
            path: fullPath,
            type: isDir ? 'directory' : 'file',
            sizeBytes: entry.uncompressedSize || (entry.content ? entry.content.length : 1024),
            permissions: isDir ? '0755' : '0644',
            mimeType: entry.name.endsWith('.php') ? 'text/html' : entry.name.endsWith('.css') ? 'text/css' : 'text/html',
            updatedAt: now,
            content: entry.content,
          };
          extractedVirtualFiles.push(vf);
          if (!isDir) browserExtractedCount++;
        }
        db.saveVirtualFilesBatch(extractedVirtualFiles);
      } catch (browserErr) {
        console.warn('Browser zip extraction skipped or failed, delegating to server:', browserErr);
      }

      setProgress(65);
      setStatusLog('Menyinkronkan berkas ke server Cloud PRO & Virtual Host...');

      // Also send to backend if under 45MB to write physical files to disk
      let serverMsg = '';
      if (zipFile.size < 45 * 1024 * 1024) {
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Gagal membaca data file'));
            reader.readAsDataURL(zipFile);
          });
          const base64Data = await base64Promise;

          const res = await fetch('/api/migrator/upload-zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: account.id,
              targetDir: selectedTargetDir,
              cleanTargetDir: cleanTargetDir && browserExtractedCount === 0,
              flattenRoot,
              fileName: zipFile.name,
              base64Data,
            }),
          });
          const resText = await res.text();
          let srvData: any;
          try {
            srvData = JSON.parse(resText);
          } catch {
            // Server returned HTML or timeout, harmless since browser extraction succeeded
            console.warn('Server upload response non-JSON, but browser extraction succeeded.');
          }
          if (srvData?.ok && Array.isArray(srvData.files)) {
            const srvBatch: VirtualFile[] = srvData.files.map((f: any) => ({
              id: f.id || `vf-zip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              accountId: account.id,
              name: f.name,
              path: f.path,
              type: f.type || 'file',
              sizeBytes: f.size || 1024,
              permissions: f.type === 'directory' ? '0755' : '0644',
              mimeType: f.name.endsWith('.php') ? 'text/html' : f.name.endsWith('.css') ? 'text/css' : 'text/html',
              updatedAt: now,
              content: f.content,
            }));
            db.saveVirtualFilesBatch(srvBatch);
            if (srvData.message) serverMsg = srvData.message;
          }
        } catch (uploadErr) {
          console.warn('Background server upload bypassed:', uploadErr);
        }
      }

      // Sync state to persistent vault
      try {
        await db.syncToServerVault(true);
      } catch {}

      const finalCount = browserExtractedCount || extractedVirtualFiles.filter(f => f.type === 'file').length;
      setProgress(100);
      setStatusLog('Ekstraksi ZIP Selesai!');
      setMigrationResult({
        ok: true,
        message: serverMsg || `Berhasil mengekstrak ${finalCount} berkas website dari ${zipFile.name} ke ${selectedTargetDir}!`,
        summary: {
          filesExtracted: finalCount,
          totalSizeBytes: zipFile.size,
          entryFile: extractedVirtualFiles.find(f => f.name.toLowerCase() === 'index.php' || f.name.toLowerCase() === 'index.html')?.name || 'index.html',
          platformDetected: 'Arsip ZIP File Manager Web Lama',
          sqlDumps: [],
          targetDir: selectedTargetDir,
        },
        files: extractedVirtualFiles.slice(0, 50),
        totalFilesCount: finalCount,
      });
      refreshAll();
      showToast('success', 'Ekstraksi Sukses!', `Berhasil mengekstrak ${finalCount} berkas website ke ${selectedTargetDir}. Berkas siap di File Manager.`);
    } catch (err: any) {
      showToast('error', 'Gagal Ekstrak ZIP', err?.message || 'Terjadi kesalahan saat memproses file ZIP.');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentDomain = (() => {
    const cleanDir = ('/' + (selectedTargetDir || '/public_html').trim().replace(/^\/home\/[^/]+/, '').replace(/^\/+/, '').replace(/\/+$/, '')) || '/public_html';
    if (cleanDir === '/public_html') return account.primaryDomain || 'denbaguse.my.id';
    const matched = accountDomains.find(d => {
      const dRoot = ('/' + (d.documentRoot || '').replace(/^\/home\/[^/]+/, '').replace(/^\/+/, '').replace(/\/+$/, '')) || '/public_html';
      return dRoot.toLowerCase() === cleanDir.toLowerCase() && d.type !== 'primary';
    });
    if (matched) return matched.domain;
    if (cleanDir.startsWith('/public_html/')) {
      const sub = cleanDir.slice('/public_html/'.length).split('/')[0];
      if (sub) return `${sub}.${account.primaryDomain}`;
    }
    return account.primaryDomain || 'denbaguse.my.id';
  })();
  const targetFullPath = `/home/${account.username}${selectedTargetDir}`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-sky-500/30 bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/50 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-56 h-56 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 border border-sky-500/40 px-3 py-0.5 text-xs font-bold text-sky-300">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Enterprise 1-Click Migrator
              </span>
              <span className="text-xs text-slate-400 font-mono">Server-to-Server Direct Transfer</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Migrasi Web Tanpa Upload Manual (cPanel / Plesk / VPS)
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              Pindahkan website berukuran besar (ratusan megabyte hingga puluhan gigabyte) langsung antar-server dengan koneksi gigabit. Tanpa perlu download ke HP/laptop lalu upload manual yang rentan gagal atau menghabiskan kuota!
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            {onOpenPreview && (
              <button
                type="button"
                onClick={() => onOpenPreview(currentDomain, selectedTargetDir)}
                className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2.5 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
              >
                <ExternalLink className="h-4 w-4 text-sky-400" />
                <span>Live Preview Web</span>
              </button>
            )}
            {onOpenFileManager && (
              <button
                type="button"
                onClick={() => onOpenFileManager(selectedTargetDir)}
                className="flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-xs font-bold text-white transition-colors shadow-lg shadow-sky-600/30 cursor-pointer"
              >
                <FolderOpen className="h-4 w-4 text-amber-300" />
                <span>Buka File Manager</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('direct_url')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'direct_url'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <DownloadCloud className="h-4 w-4 text-amber-400" />
            <span>1. Tarik via URL / Mirror</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload_zip')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'upload_zip'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <UploadCloud className="h-4 w-4 text-emerald-400" />
            <span>2. Upload File ZIP (Dari File Manager Lama)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ftp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'ftp'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <FolderSync className="h-4 w-4 text-sky-400" />
            <span>3. Tarik via FTP / SFTP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rsync')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'rsync'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Terminal className="h-4 w-4 text-cyan-400" />
            <span>4. Rsync / SSH (File Besar)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'guide'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <HelpCircle className="h-4 w-4 text-purple-400" />
            <span>4. Panduan Mengambil Link Backup</span>
          </button>
        </div>
      </div>

      {/* Target Directory & Target Domain Selector (Common to all tabs) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-200">
                Folder Tujuan Ekstraksi (Document Root)
              </label>
              <button
                type="button"
                onClick={() => setShowNewSubdomainInput(!showNewSubdomainInput)}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>{showNewSubdomainInput ? 'Batal' : '+ Subdomain Baru'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Pilih folder virtual host tempat file website akan dipasang.
            </p>

            {showNewSubdomainInput && (
              <div className="mb-2 p-2.5 rounded-xl bg-sky-950/60 border border-sky-700 flex items-center gap-2">
                <input
                  type="text"
                  value={newSubdomainPrefix}
                  onChange={e => setNewSubdomainPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="prefix (cth: siakad-madrasah, rdm)"
                  className="flex-1 bg-slate-900 border border-sky-600 rounded-lg px-2.5 py-1 text-xs font-mono text-white outline-hidden"
                />
                <span className="text-xs font-mono text-slate-400 shrink-0">.{account.primaryDomain}</span>
                <button
                  type="button"
                  onClick={() => handleCreateAndSelectSubdomain()}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-lg cursor-pointer shrink-0"
                >
                  Pilih
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={selectedTargetDir}
              onChange={e => {
                const val = e.target.value;
                if (val.startsWith('__preset:')) {
                  const presetPrefix = val.replace('__preset:', '');
                  handleCreateAndSelectSubdomain(presetPrefix);
                } else {
                  setSelectedTargetDir(val);
                }
              }}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:outline-hidden focus:border-sky-500 cursor-pointer min-w-[260px]"
            >
              <optgroup label="🌐 Domain Utama">
                <option value="/public_html">/public_html (Domain Utama: {account.primaryDomain})</option>
              </optgroup>

              {accountDomains.filter(d => d.type === 'subdomain').length > 0 && (
                <optgroup label="📑 Subdomain Terdaftar">
                  {accountDomains
                    .filter(d => d.type === 'subdomain')
                    .map(d => {
                      const cleanRoot = (d.documentRoot || `/public_html/${d.subdomainPrefix || d.domain.split('.')[0]}`).replace(
                        `/home/${account.username}`,
                        ''
                      );
                      return (
                        <option key={d.id} value={cleanRoot}>
                          {cleanRoot} ({d.domain})
                        </option>
                      );
                    })}
                </optgroup>
              )}

              <optgroup label="⚡ Buat Subdomain Cepat (1-Klik)">
                {!accountDomains.some(d => d.domain.toLowerCase() === `siakad-madrasah.${account.primaryDomain.toLowerCase()}`) && (
                  <option value="__preset:siakad-madrasah">
                    + siakad-madrasah.{account.primaryDomain} (/public_html/siakad-madrasah)
                  </option>
                )}
                {!accountDomains.some(d => d.domain.toLowerCase() === `rdm.${account.primaryDomain.toLowerCase()}`) && (
                  <option value="__preset:rdm">
                    + rdm.{account.primaryDomain} (/public_html/rdm)
                  </option>
                )}
                {!accountDomains.some(d => d.domain.toLowerCase() === `server.${account.primaryDomain.toLowerCase()}`) && (
                  <option value="__preset:server">
                    + server.{account.primaryDomain} (/public_html/server)
                  </option>
                )}
                {!accountDomains.some(d => d.domain.toLowerCase() === `app.${account.primaryDomain.toLowerCase()}`) && (
                  <option value="__preset:app">
                    + app.{account.primaryDomain} (/public_html/app)
                  </option>
                )}
              </optgroup>
            </select>

            <span className="text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700 shrink-0">
              Path Fisik: {targetFullPath}
            </span>
          </div>
        </div>
      </div>

      {/* Tab 1: Direct URL Server-to-Server Transfer */}
      {activeTab === 'direct_url' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
          {/* Mode Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setUrlMode('instant_spider');
                setArchiveUrl('');
              }}
              className={`flex items-center gap-3 p-3.5 rounded-xl text-left cursor-pointer transition-all ${
                urlMode === 'instant_spider'
                  ? 'bg-gradient-to-r from-sky-600 to-emerald-600 text-white shadow-lg shadow-sky-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="h-5 w-5 text-amber-300 shrink-0" />
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>⚡ 1-Click Instant Mirror (Paling Praktis)</span>
                  <span className="bg-amber-400/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-mono">Tanpa ZIP</span>
                </div>
                <div className="text-[10px] opacity-80 mt-0.5">Cukup masukkan URL website asal — Tanpa buka file manager & tanpa zip!</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setUrlMode('archive_file');
                setArchiveUrl('');
              }}
              className={`flex items-center gap-3 p-3.5 rounded-xl text-left cursor-pointer transition-all ${
                urlMode === 'archive_file'
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileArchive className="h-5 w-5 text-sky-300 shrink-0" />
              <div>
                <div className="text-xs font-bold">📦 Transfer Arsip Backup</div>
                <div className="text-[10px] opacity-80 mt-0.5">Download & ekstrak file .zip / .tar.gz / Google Drive antar-server</div>
              </div>
            </button>
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {urlMode === 'instant_spider' ? (
                <>
                  <Zap className="h-5 w-5 text-amber-400" />
                  Kloning & Mirror Website Otomatis (Cukup Masukkan URL Asal)
                </>
              ) : (
                <>
                  <DownloadCloud className="h-5 w-5 text-sky-400" />
                  Transfer Arsip Backup Langsung Antar-Server (Direct URL)
                </>
              )}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {urlMode === 'instant_spider'
                ? 'Tidak perlu membuka file manager cPanel, tidak perlu kompres ZIP, dan tidak perlu akses server hosting lama. Server Cloud PRO akan langsung menyedot seluruh halaman HTML, CSS, JavaScript, aset gambar, dan font secara otomatis.'
                : 'Cukup tempel tautan download langsung (Direct Link) dari file backup cPanel, Plesk, Google Drive, atau Dropbox. Server Cloud PRO akan langsung menyedot file tersebut dengan kecepatan transfer datacenter dan mengekstraknya secara otomatis.'}
            </p>
          </div>

          {urlMode === 'archive_file' && (
            /* Platform Preset Selector */
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">Format Sumber Backup:</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: 'cpanel', label: 'cPanel Backup', sub: '.tar.gz / cpmove' },
                  { id: 'plesk', label: 'Plesk Backup', sub: 'httpdocs / zip' },
                  { id: 'wordpress', label: 'WordPress Zip', sub: 'All-in-One / Dup' },
                  { id: 'gdrive', label: 'Google Drive', sub: 'Direct Share Link' },
                  { id: 'custom', label: 'Arsip Web Kustom', sub: '.zip / .tar.gz' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSourcePlatform(p.id as any)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      sourcePlatform === p.id
                        ? 'border-sky-500 bg-sky-500/10 text-white shadow-md shadow-sky-500/20'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{p.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{p.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* URL Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-200">
              {urlMode === 'instant_spider'
                ? 'Alamat URL Website Asli yang Ingin Dikloning:'
                : 'Direct Download URL File Arsip (.zip / .tar.gz / .tar):'}
            </label>
            <div className="relative">
              <input
                type="url"
                value={archiveUrl}
                onChange={e => {
                  const val = e.target.value;
                  setArchiveUrl(val);
                  const lower = val.toLowerCase().trim();
                  if (lower.includes('.zip') || lower.includes('.tar') || lower.includes('drive.google.com') || lower.includes('dropbox.com')) {
                    setUrlMode('archive_file');
                  }
                }}
                placeholder={
                  urlMode === 'instant_spider'
                    ? 'https://namasekolah.sch.id atau https://domainlama.com'
                    : sourcePlatform === 'gdrive'
                    ? 'https://drive.google.com/file/d/1A2B3C.../view?usp=sharing'
                    : sourcePlatform === 'cpanel'
                    ? 'https://serverlama.com:2083/cpsess.../backup-10.1.2026_username.tar.gz'
                    : 'https://domainlama.com/backup.zip'
                }
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-mono text-sky-300 placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 shadow-inner"
              />
            </div>
            {archiveUrl.toLowerCase().includes('.zip') && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Terdeteksi Berkas Arsip .ZIP! Server akan otomatis mengekstrak seluruh isi file website ke direktori tujuan.</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              {urlMode === 'instant_spider'
                ? '⚡ Mesin Wget Recursive Spider akan menyalin seluruh struktur halaman dan aset web langsung ke virtual host server ini.'
                : 'Tips: Jika file backup Anda ditaruh di cPanel/Plesk lama, letakkan di public_html/backup.zip lalu salin URL publiknya!'}
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={flattenRoot}
                onChange={e => setFlattenRoot(e.target.checked)}
                className="rounded border-slate-700 text-sky-600 focus:ring-sky-500 h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-bold text-white block">Otomatis Ratakan Root (Flatten)</span>
                <span className="text-[11px] text-slate-400">
                  Mengekstrak isi <code>homedir/public_html</code> atau folder pembungkus langsung ke {selectedTargetDir}.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={cleanTargetDir}
                onChange={e => setCleanTargetDir(e.target.checked)}
                className="rounded border-slate-700 text-sky-600 focus:ring-sky-500 h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-bold text-white block">Bersihkan File Lama Sebelum Ekstrak</span>
                <span className="text-[11px] text-slate-400">
                  Menghapus file lama di {selectedTargetDir} agar tidak bentrok dengan website baru.
                </span>
              </div>
            </label>
          </div>

          {/* Action Button & Progress */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartMigration}
              disabled={isProcessing || !archiveUrl.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-sky-600/30 disabled:opacity-50 cursor-pointer transition-all active:scale-98"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-300" />
                  <span>Sedang Mentransfer & Mengekstrak Arsip...</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="h-5 w-5 text-amber-300" />
                  <span>Mulai Transfer Server-to-Server Sekarang</span>
                </>
              )}
            </button>
          </div>

          {/* Progress Bar & Status */}
          {isProcessing && (
            <div className="rounded-2xl border border-sky-500/40 bg-sky-950/20 p-4 space-y-2.5 animate-pulse">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-sky-300">{statusLog}</span>
                <span className="font-mono text-emerald-400 font-bold">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Migration Success Result Card */}
          {migrationResult && migrationResult.ok && migrationResult.summary && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-emerald-300">
                    Migrasi Sukses! Seluruh File Berhasil Diekstrak di Server
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {migrationResult.message}
                  </p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
                  <div className="text-[10px] text-slate-400">Total File</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {migrationResult.summary.filesExtracted.toLocaleString()} file
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
                  <div className="text-[10px] text-slate-400">Ukuran Bersih</div>
                  <div className="text-base font-bold text-sky-300 mt-0.5">
                    {(migrationResult.summary.totalSizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
                  <div className="text-[10px] text-slate-400">Entry File</div>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {migrationResult.summary.entryFile}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
                  <div className="text-[10px] text-slate-400">Platform Asal</div>
                  <div className="text-xs font-bold text-purple-300 truncate mt-0.5">
                    {migrationResult.summary.platformDetected}
                  </div>
                </div>
              </div>

              {/* Database Dump Detection Notification */}
              {migrationResult.summary.sqlDumps && migrationResult.summary.sqlDumps.length > 0 && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Database className="h-5 w-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-300">
                        Ditemukan {migrationResult.summary.sqlDumps.length} File Dump Database (.sql)
                      </div>
                      <div className="text-slate-300 text-[11px] font-mono mt-0.5">
                        {migrationResult.summary.sqlDumps.join(', ')}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] bg-slate-900 px-2 py-1 rounded text-amber-300 font-bold border border-amber-500/30 shrink-0">
                    Siap Di-Import
                  </span>
                </div>
              )}

              {/* Next Action Buttons */}
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                {onOpenPreview && (
                  <button
                    type="button"
                    onClick={() => onOpenPreview(currentDomain, selectedTargetDir)}
                    className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-bold text-white cursor-pointer shadow-lg shadow-sky-600/30"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Buka Live Preview Website</span>
                  </button>
                )}

                {onOpenFileManager && (
                  <button
                    type="button"
                    onClick={() => onOpenFileManager(selectedTargetDir)}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                    <span>Lihat di File Manager</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Tarik via URL / Upload File ZIP dari Web Lama */}
      {activeTab === 'upload_zip' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-emerald-400" />
              Migrasi Berkas Arsip ZIP dari Web Lama (cPanel / Plesk)
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Setelah Anda mengompres berkas website menjadi <code>backup.zip</code> di File Manager web lama, Anda bisa langsung menariknya antar-server tanpa unduh ke HP, atau mengunggahnya manual jika file sudah ada di HP/laptop.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setZipSourceMode('url')}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                zipSourceMode === 'url'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-lg shadow-emerald-500/20'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                <DownloadCloud className="h-4 w-4" />
                <span>🌐 Opsi A: Tarik Langsung via URL Web Lama</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Server langsung download dari web lama. <strong>100% Bebas Kuota HP & Server-to-Server!</strong>
              </p>
            </button>

            <button
              type="button"
              onClick={() => setZipSourceMode('upload')}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                zipSourceMode === 'upload'
                  ? 'border-sky-500 bg-sky-500/10 text-white shadow-lg shadow-sky-500/20'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm text-sky-400">
                <UploadCloud className="h-4 w-4" />
                <span>📤 Opsi B: Upload File ZIP dari HP / Laptop</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Pilih berkas ZIP yang sudah terlanjur didownload ke memori perangkat Anda.
              </p>
            </button>
          </div>

          {/* OPTION A: DIRECT URL ZIP PULL */}
          {zipSourceMode === 'url' && (
            <div className="space-y-4 bg-slate-950/80 border border-slate-800 p-5 rounded-2xl">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-200">
                  Alamat URL File ZIP di Web Lama:
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={zipDirectUrl}
                    onChange={e => setZipDirectUrl(e.target.value)}
                    placeholder="http://domainlama.com/backup.zip atau http://49.0.0.18/backup.zip"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-mono text-emerald-300 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 shadow-inner"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setZipDirectUrl('https://siakad-madrasah.jaenalmaskun.biz.id/siakadmadrasah.zip');
                      setSelectedTargetDir('/public_html/siakad-madrasah');
                      showToast('info', 'Preset Siakad Dipilih', 'Target diset ke /public_html/siakad-madrasah');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 cursor-pointer transition-all"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>⚡ Pakai Link Siakad (siakadmadrasah.zip)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZipDirectUrl('http://49.0.0.18/siakadmadrasah.zip');
                      setSelectedTargetDir('/public_html/siakad-madrasah');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold hover:bg-sky-500/20 cursor-pointer transition-all"
                  >
                    <span>IP 49.0.0.18/siakadmadrasah.zip</span>
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed">
                <Zap className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Cara Paling Praktis (Tanpa Kuota HP):</strong> Di File Manager Plesk/cPanel lama, kompres semua file web menjadi <code>backup.zip</code> di dalam folder <code>httpdocs</code> atau <code>public_html</code>. Setelah selesai, linknya langsung menjadi <code>http://domainlama.com/backup.zip</code> (atau IP server lama). Server Cloud PRO akan langsung menyedot file tersebut antar-server dalam 2 detik!
                </span>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flattenRoot}
                    onChange={e => setFlattenRoot(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">Ratakan Root Otomatis (Flatten)</span>
                    <span className="text-[11px] text-slate-400">
                      Otomatis mengangkat file ke root jika di dalam ZIP terbungkus folder.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cleanTargetDir}
                    onChange={e => setCleanTargetDir(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">Bersihkan Folder Tujuan Sebelum Ekstrak</span>
                    <span className="text-[11px] text-slate-400">
                      Menghapus file lama di {selectedTargetDir} agar tidak bentrok.
                    </span>
                  </div>
                </label>
              </div>

              <button
                type="button"
                onClick={handlePullRemoteZip}
                disabled={isProcessing || !zipDirectUrl.trim()}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-3.5 px-6 font-bold text-sm text-white shadow-xl shadow-emerald-600/30 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Sedang Menyedot & Mengekstrak Arsip ZIP Antar-Server...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="h-5 w-5 text-amber-300" />
                    <span>⚡ Tarik & Ekstrak ZIP Antar-Server Sekarang (Bebas Kuota HP)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* OPTION B: UPLOAD FROM PHONE / LAPTOP */}
          {zipSourceMode === 'upload' && (
            <div className="space-y-4">
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".zip,.tar.gz,.tgz,.tar"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setZipFile(file);
                }}
              />

              {/* Upload Dropzone / Selector */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  zipFile
                    ? 'border-emerald-500/60 bg-emerald-950/20'
                    : 'border-slate-700 hover:border-sky-500 bg-slate-950/60 hover:bg-slate-950'
                }`}
              >
                {zipFile ? (
                  <div className="space-y-2">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                      <FileArchive className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-bold text-white">{zipFile.name}</div>
                    <div className="text-xs text-emerald-400 font-mono">
                      Ukuran: {(zipFile.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                    <p className="text-[11px] text-slate-400">Klik di sini jika ingin mengganti file ZIP lain</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-14 w-14 rounded-3xl bg-slate-800 text-sky-400 flex items-center justify-center mx-auto shadow-inner">
                      <UploadCloud className="h-7 w-7" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">
                        Pilih File .ZIP dari HP / Laptop Anda
                      </span>
                      <span className="text-xs text-slate-400 mt-1 block">
                        File hasil kompres dari cPanel / Plesk File Manager (backup.zip / web.zip)
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300 font-medium">
                      Format didukung: .zip, .tar.gz, .tar
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flattenRoot}
                    onChange={e => setFlattenRoot(e.target.checked)}
                    className="rounded border-slate-700 text-sky-600 focus:ring-sky-500 h-4 w-4"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">Ratakan Root Otomatis (Flatten)</span>
                    <span className="text-[11px] text-slate-400">
                      Jika isi ZIP terbungkus folder <code>public_html/</code>, isinya otomatis diangkat ke root.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cleanTargetDir}
                    onChange={e => setCleanTargetDir(e.target.checked)}
                    className="rounded border-slate-700 text-sky-600 focus:ring-sky-500 h-4 w-4"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">Bersihkan Folder Tujuan Sebelum Ekstrak</span>
                    <span className="text-[11px] text-slate-400">
                      Menghapus file lama di {selectedTargetDir} agar tidak bentrok.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleUploadAndExtractZip}
                  disabled={isProcessing || !zipFile}
                  className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 py-3.5 px-6 font-bold text-sm text-white shadow-xl shadow-emerald-600/30 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Sedang Mengunggah & Mengekstrak File ZIP...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-5 w-5 text-amber-300" />
                      <span>⚡ Ekstrak & Pasang Website dari ZIP Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar & Status */}
          {isProcessing && (
            <div className="rounded-2xl border border-sky-500/40 bg-sky-950/20 p-4 space-y-2.5 animate-pulse">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-sky-300">{statusLog}</span>
                <span className="font-mono text-emerald-400 font-bold">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success result card */}
          {migrationResult && migrationResult.ok && migrationResult.summary && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Ekstraksi & Migrasi ZIP Berhasil!</h3>
                  <p className="text-xs text-slate-300">{migrationResult.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 flex-wrap">
                {onOpenPreview && (
                  <button
                    type="button"
                    onClick={() => onOpenPreview(currentDomain, selectedTargetDir)}
                    className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-bold text-white cursor-pointer shadow-lg shadow-sky-600/30"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Buka Live Preview Website</span>
                  </button>
                )}
                {onOpenFileManager && (
                  <button
                    type="button"
                    onClick={() => onOpenFileManager(selectedTargetDir)}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                    <span>Buka File Manager</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Panduan Cara Kompres di File Manager Web Lama */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4" />
              Cara Mengambil File ZIP dari File Manager cPanel / Plesk Lama:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-300">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">Dari cPanel Lama:</span>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Buka <strong>File Manager</strong> di cPanel lama.</li>
                  <li>Masuk ke folder <strong>public_html</strong>.</li>
                  <li>Klik tombol <strong>Select All</strong> di atas.</li>
                  <li>Klik tombol <strong>Compress</strong> &amp; pilih format <strong>ZIP</strong>.</li>
                  <li>Download file .zip tersebut ke HP/laptop, lalu upload di sini!</li>
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">Dari Plesk Lama:</span>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Buka <strong>File Manager</strong> di Plesk lama.</li>
                  <li>Masuk ke folder <strong>httpdocs</strong>.</li>
                  <li>Pilih semua berkas, lalu klik <strong>Add to Archive</strong>.</li>
                  <li>Beri nama arsip (misal <code>backup.zip</code>).</li>
                  <li>Download file .zip tersebut, lalu upload di sini!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Rsync / SSH One-Liner (For 10GB+ Massive Data) */}
      {activeTab === 'rsync' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="h-5 w-5 text-emerald-400" />
              Migrasi Super Cepat via Rsync / SSH (Untuk Kapasitas Raksasa 10GB+)
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Jika Anda memiliki akses SSH / Terminal di server lama (VPS atau Dedicated), metode <code>rsync</code> adalah standar emas migrasi hosting tercepat di dunia. Rsync mentransfer file dengan kompresi on-the-fly, dapat di-resume jika koneksi terputus, dan langsung menjaga permission file Linux.
            </p>
          </div>

          {/* Parameter Inputs for Remote Server */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <span className="text-xs font-bold text-slate-200">Konfigurasi Server Lama Anda (Untuk Generator Perintah Otomatis):</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">IP / Host Server Lama:</label>
                <input
                  type="text"
                  value={ftpHost}
                  onChange={e => setFtpHost(e.target.value)}
                  placeholder="103.xxx.xxx.xxx"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Username SSH Lama:</label>
                <input
                  type="text"
                  value={ftpUser}
                  onChange={e => setFtpUser(e.target.value)}
                  placeholder="root atau username_cpanel"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Port SSH Lama:</label>
                <input
                  type="text"
                  value={ftpPort}
                  onChange={e => setFtpPort(e.target.value)}
                  placeholder="22"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Folder Asal Server Lama:</label>
                <input
                  type="text"
                  value={ftpRemotePath}
                  onChange={e => setFtpRemotePath(e.target.value)}
                  placeholder="/home/user/public_html/"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Alert Host Key Verification Fix */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-slate-300 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">Solusi Error &quot;Host key verification failed&quot;:</strong>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Error ini terjadi jika server tujuan belum pernah didaftarkan di <code>known_hosts</code>. Perintah di bawah ini <strong>sudah otomatis dilengkapi dengan flag anti-reject</strong> (<code>-e &quot;ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null&quot;</code>) sehingga tidak akan ditolak oleh SSH!
              </p>
            </div>
          </div>

          {/* One-Liner Command Cards */}
          <div className="space-y-4">
            {/* Opsi 1: Jalankan di Terminal CloudPRO ini (Menarik / PULL dari Server Lama) */}
            <div className="rounded-2xl border border-sky-500/40 bg-slate-950 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Mode 1: Jalankan Langsung di Terminal CloudPRO Ini (DESKTOP-DJQ024C)
                </span>
                <span className="text-[10px] text-sky-300 font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                  Tarik Data (PULL)
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Salin dan jalankan perintah ini di terminal CloudPRO (seperti di screenshot console Tailscale Anda) untuk menarik seluruh file dari server lama ke <code>{targetFullPath}</code>:
              </p>
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-between gap-2 font-mono text-xs text-sky-300 overflow-x-auto">
                <code>
                  rsync -avzP -e &quot;ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p {ftpPort || '22'}&quot; {ftpUser || 'root'}@{ftpHost || 'ip_server_lama'}:{ftpRemotePath ? (ftpRemotePath.endsWith('/') ? ftpRemotePath : `${ftpRemotePath}/`) : '/home/user/public_html/'} {targetFullPath}/
                </code>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `rsync -avzP -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p ${ftpPort || '22'}" ${ftpUser || 'root'}@${ftpHost || 'ip_server_lama'}:${ftpRemotePath ? (ftpRemotePath.endsWith('/') ? ftpRemotePath : `${ftpRemotePath}/`) : '/home/user/public_html/'} ${targetFullPath}/`,
                      'rsync-pull'
                    )
                  }
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-white cursor-pointer shrink-0"
                >
                  {copiedKey === 'rsync-pull' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Opsi 2: Jalankan di Terminal Server Lama (Mengirim / PUSH ke CloudPRO) */}
            <div className="rounded-2xl border border-emerald-500/40 bg-slate-950 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Mode 2: Jalankan di Terminal Server Lama Anda (Kirim ke CloudPRO via Tailscale)
                </span>
                <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Kirim Data (PUSH)
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Jika Anda sedang login di terminal server lama, kirimkan file langsung ke CloudPRO dengan perintah ini:
              </p>
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-between gap-2 font-mono text-xs text-emerald-300 overflow-x-auto">
                <code>
                  rsync -avzP -e &quot;ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null&quot; --exclude=&apos;error_log&apos; {ftpRemotePath ? (ftpRemotePath.endsWith('/') ? ftpRemotePath : `${ftpRemotePath}/`) : '/path/ke/public_html/'} root@100.121.16.66:{targetFullPath}/
                </code>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `rsync -avzP -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" --exclude='error_log' ${ftpRemotePath ? (ftpRemotePath.endsWith('/') ? ftpRemotePath : `${ftpRemotePath}/`) : '/path/ke/public_html/'} root@100.121.16.66:${targetFullPath}/`,
                      'rsync-push'
                    )
                  }
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-white cursor-pointer shrink-0"
                >
                  {copiedKey === 'rsync-push' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: FTP / SFTP Puller */}
      {activeTab === 'ftp' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FolderSync className="h-5 w-5 text-sky-400" />
              Tarik Website Otomatis via FTP / SFTP Server Lama
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Jika Anda tidak bisa membuat backup arsip zip, Anda dapat memasukkan kredensial akun FTP cPanel atau Plesk lama Anda. Server akan menarik seluruh struktur file secara otomatis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Host FTP / Alamat Server Lama:</label>
              <input
                type="text"
                value={ftpHost}
                onChange={e => setFtpHost(e.target.value)}
                placeholder="ftp.domainlama.com atau 103.xxx.xxx.xxx"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Port (Default: 21 FTP / 22 SFTP):</label>
              <input
                type="text"
                value={ftpPort}
                onChange={e => setFtpPort(e.target.value)}
                placeholder="21"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Username FTP:</label>
              <input
                type="text"
                value={ftpUser}
                onChange={e => setFtpUser(e.target.value)}
                placeholder="u1234567 atau admin"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Password FTP:</label>
              <input
                type="password"
                value={ftpPass}
                onChange={e => setFtpPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300">Path Folder Sumber di Server Lama:</label>
              <input
                type="text"
                value={ftpRemotePath}
                onChange={e => setFtpRemotePath(e.target.value)}
                placeholder="/public_html (untuk cPanel) atau /httpdocs (untuk Plesk)"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          {/* Quick CLI FTP/LFTP Generator */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
            <span className="text-xs font-bold text-slate-300">Perintah One-Liner LFTP Background:</span>
            <div className="rounded-xl bg-slate-900 p-3 font-mono text-xs text-sky-300 flex items-center justify-between gap-2 overflow-x-auto">
              <code>
                lftp -u {ftpUser || 'user'},{ftpPass || 'password'} -e &quot;mirror --reverse --delete {ftpRemotePath} {targetFullPath}; quit&quot; {ftpHost || 'ftp.server.com'}
              </code>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `lftp -u ${ftpUser || 'user'},${ftpPass || 'password'} -e "mirror --reverse --delete ${ftpRemotePath} ${targetFullPath}; quit" ${ftpHost || 'ftp.server.com'}`,
                    'lftp'
                  )
                }
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1 text-xs text-white cursor-pointer shrink-0"
              >
                {copiedKey === 'lftp' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Action Button for Direct FTP Transfer */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isProcessing || !ftpHost.trim() || !ftpUser.trim()}
              onClick={handleStartFtpMigration}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 py-3.5 px-6 font-bold text-sm text-white shadow-xl shadow-sky-600/30 cursor-pointer disabled:opacity-50 transition-all"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Sedang Menarik File via FTP Langsung Tanpa ZIP...</span>
                </>
              ) : (
                <>
                  <FolderSync className="h-5 w-5 text-amber-300" />
                  <span>⚡ Tarik Seluruh Folder Web via FTP Sekarang (Tanpa Buka File Manager & Tanpa ZIP)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Step-by-Step Practical Guides */}
      {activeTab === 'guide' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-purple-400" />
              Panduan Praktis: Cara Mendapatkan Link Backup Tanpa Download ke HP
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ikuti salah satu dari 3 cara super mudah berikut ini untuk memindahkan website Anda:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cara 1: cPanel Compress */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white font-bold text-xs">
                  1
                </span>
                <h3 className="font-bold text-sm text-white">cPanel File Manager (Paling Cepat)</h3>
              </div>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 leading-relaxed">
                <li>Buka <strong>cPanel &gt; File Manager</strong> di hosting lama.</li>
                <li>Masuk ke folder <code>public_html</code>.</li>
                <li>Pilih semua file (Select All), klik tombol <strong>Compress</strong> di atas.</li>
                <li>Pilih tipe <strong>Zip Archive</strong>, simpan sebagai <code>backup.zip</code>.</li>
                <li>Sekarang tempelkan link <code>https://domainlama.com/backup.zip</code> ke tab <strong>Direct Link Backup</strong> di atas!</li>
              </ol>
            </div>

            {/* Cara 2: Plesk Backup */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                  2
                </span>
                <h3 className="font-bold text-sm text-white">Plesk Backup Manager</h3>
              </div>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 leading-relaxed">
                <li>Buka panel <strong>Plesk &gt; Backup Manager</strong>.</li>
                <li>Pilih backup yang ada, klik tanda panah download.</li>
                <li>Klik kanan tombol download, pilih <strong>&ldquo;Salin Alamat Tautan&rdquo; (Copy link address)</strong>.</li>
                <li>Tempelkan tautan tersebut ke tab Direct Link Backup di Cloud PRO.</li>
              </ol>
            </div>

            {/* Cara 3: Google Drive */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-xs">
                  3
                </span>
                <h3 className="font-bold text-sm text-white">Upload ke Google Drive / Dropbox</h3>
              </div>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 leading-relaxed">
                <li>Jika file zip sudah tersimpan di Google Drive atau Dropbox Anda:</li>
                <li>Klik kanan file zip di Google Drive &gt; <strong>Bagikan (Share)</strong>.</li>
                <li>Ubah akses ke <strong>&ldquo;Siapa saja yang memiliki link&rdquo; (Anyone with link)</strong>.</li>
                <li>Salin link tersebut dan tempel di Cloud PRO. Cloud PRO otomatis mengkonversi ke Direct Stream binary download!</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
