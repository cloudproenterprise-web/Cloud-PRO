import React, { useState, useRef, useEffect } from 'react';
import {
  Archive,
  Download,
  RotateCcw,
  PlusCircle,
  Trash2,
  CheckCircle2,
  HardDrive,
  FileCheck,
  ShieldCheck,
  Lock,
  Upload,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  Globe,
  DownloadCloud,
  AlertTriangle,
  Layers,
  ExternalLink,
  Zap,
  Server,
  ChevronDown,
  Eye,
  FileText,
  ArrowRight,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { AccountBackup, HostingAccount, DomainEntity } from '../../types';
import { CloudProApi } from '../../services/api';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

export interface BackupManagerProps {
  account: HostingAccount;
  preselectedDomain?: string;
  initialTab?: 'backup_domain' | 'restore_domain' | 'backup_archives' | 'persistent_vault';
  mode?: 'backup' | 'restore' | 'all';
  onNavigateTab?: (tab: string, domain?: string) => void;
}

interface ServerDomainItem {
  id: string;
  domain: string;
  type: 'primary' | 'subdomain' | 'addon';
  documentRoot: string;
  accountId: string;
  username: string;
  phpVersion: string;
  filesCount: number;
  totalSizeBytes: number;
  formattedSize: string;
}

interface ServerBackupItem {
  id: string;
  fileName: string;
  domain: string;
  documentRoot: string;
  type: 'full' | 'database' | 'files';
  sizeBytes: number;
  formattedSize: string;
  createdAt: string;
  downloadUrl: string;
  notes?: string;
}

interface BackupJobState {
  id: string;
  type: string;
  status: 'pending' | 'downloading' | 'snapshotting' | 'extracting' | 'permissions' | 'completed' | 'error';
  progress: number;
  message: string;
  updatedAt: string;
  targetDomain?: string;
  targetDir?: string;
  result?: any;
  error?: string;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  account,
  preselectedDomain,
  initialTab,
  mode = 'all',
  onNavigateTab,
}) => {
  const { currentUser } = useAuth();
  const { showToast, refreshAll, confirmAction } = useServer();

  if (!currentUser) return null;

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<'backup_domain' | 'restore_domain' | 'backup_archives' | 'persistent_vault'>(
    initialTab || (mode === 'restore' ? 'restore_domain' : 'backup_domain')
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (mode === 'restore' && activeTab === 'backup_domain') {
      setActiveTab('restore_domain');
    } else if (mode === 'backup' && activeTab === 'restore_domain') {
      setActiveTab('backup_domain');
    }
  }, [initialTab, mode]);

  // Domains & Subdomains for this account
  const [serverDomains, setServerDomains] = useState<ServerDomainItem[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>(preselectedDomain || account?.primaryDomain || 'denbaguse.my.id');
  const [selectedDocRoot, setSelectedDocRoot] = useState<string>('/public_html');

  // Backups lists (server + local db)
  const [serverBackups, setServerBackups] = useState<ServerBackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);

  // --- Create Backup State ---
  const [backupType, setBackupType] = useState<'full' | 'database' | 'files'>('full');
  const [includeConfigManifest, setIncludeConfigManifest] = useState<boolean>(true);
  const [backupNotes, setBackupNotes] = useState<string>('');
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [createdBackupResult, setCreatedBackupResult] = useState<ServerBackupItem | null>(null);

  // --- Restore State ---
  const [restoreSourceType, setRestoreSourceType] = useState<'server_archive' | 'remote_url' | 'upload_zip'>('server_archive');
  const [selectedArchiveFile, setSelectedArchiveFile] = useState<string>('');
  const [uploadedRestoreFile, setUploadedRestoreFile] = useState<File | null>(null);
  const [isUploadingRestoreFile, setIsUploadingRestoreFile] = useState<boolean>(false);
  const [remoteZipUrl, setRemoteZipUrl] = useState<string>('');
  const [remoteAuthType, setRemoteAuthType] = useState<'none' | 'basic' | 'bearer' | 'custom_header'>('none');
  const [remoteAuthUser, setRemoteAuthUser] = useState<string>('');
  const [remoteAuthPass, setRemoteAuthPass] = useState<string>('');
  const [remoteBearerToken, setRemoteBearerToken] = useState<string>('');
  const [remoteHeaderName, setRemoteHeaderName] = useState<string>('');
  const [remoteHeaderValue, setRemoteHeaderValue] = useState<string>('');

  // Restore options
  const [restoreSafetySnapshot, setRestoreSafetySnapshot] = useState<boolean>(true);
  const [restoreCleanDestination, setRestoreCleanDestination] = useState<boolean>(false);
  const [restoreAutoFlatten, setRestoreAutoFlatten] = useState<boolean>(true);
  const [restoreFixPermissions, setRestoreFixPermissions] = useState<boolean>(true);
  const [restoreImportDatabase, setRestoreImportDatabase] = useState<boolean>(true);
  const [restoreAutoDeleteZip, setRestoreAutoDeleteZip] = useState<boolean>(true);

  // Probe Remote URL State
  const [isProbingRemote, setIsProbingRemote] = useState<boolean>(false);
  const [remoteProbeInfo, setRemoteProbeInfo] = useState<{
    ok: boolean;
    httpStatus: number;
    formattedSize?: string;
    fileName?: string;
    serverHeader?: string;
    message?: string;
  } | null>(null);

  // Active Job Progress
  const [activeJob, setActiveJob] = useState<BackupJobState | null>(null);
  const [isPollingJob, setIsPollingJob] = useState<boolean>(false);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Persistent Vault State
  const [keepDataOnUpdate, setKeepDataOnUpdate] = useState<boolean>(() =>
    typeof db.isDataRetentionEnabled === 'function' ? db.isDataRetentionEnabled() : true
  );
  const [isSyncingVault, setIsSyncingVault] = useState(false);
  const [isRestoringVault, setIsRestoringVault] = useState(false);
  const [isCleaningDisk, setIsCleaningDisk] = useState(false);
  const [vaultPath, setVaultPath] = useState<string>('~/.cloudpro-persistent-vault');
  const [lastVaultSync, setLastVaultSync] = useState<string>(() => new Date().toLocaleTimeString('id-ID'));
  const [copiedCmd, setCopiedCmd] = useState(false);
  const vaultFileInputRef = useRef<HTMLInputElement>(null);
  const localZipInputRef = useRef<HTMLInputElement>(null);

  // Load server domains and backups safely with AbortController timeout
  const loadDomains = async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('/api/backup/domains', { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data.ok && Array.isArray(data.domains)) {
            setServerDomains(data.domains);
            const initial = data.domains.find(
              (d: ServerDomainItem) => d.domain.toLowerCase() === (preselectedDomain || account?.primaryDomain || '').toLowerCase()
            ) || data.domains[0];
            if (initial) {
              setSelectedDomain(initial.domain);
              setSelectedDocRoot(initial.documentRoot);
            }
            return;
          }
        } catch {}
      }
    } catch {}

    // Fallback to local db domains
    const accId = account?.id || 'acc-rdm-01';
    const accDomain = account?.primaryDomain || 'denbaguse.my.id';
    const accUser = account?.username || 'cloudpro';
    const localDoms = db.getDomains(accId);
    const mapped: ServerDomainItem[] = [
      {
        id: 'dom-primary',
        domain: accDomain,
        type: 'primary',
        documentRoot: '/public_html',
        accountId: accId,
        username: accUser,
        phpVersion: '8.2',
        filesCount: db.getVirtualFiles(accId).length,
        totalSizeBytes: 10485760,
        formattedSize: '10.5 MB',
      },
      ...localDoms.map(d => ({
        id: d.id,
        domain: d.domain,
        type: d.type as any,
        documentRoot: d.documentRoot ? d.documentRoot.replace(`/home/${accUser}`, '') : '/public_html',
        accountId: accId,
        username: accUser,
        phpVersion: d.phpVersion || '8.2',
        filesCount: 0,
        totalSizeBytes: 0,
        formattedSize: '0 B',
      })),
    ];
    setServerDomains(mapped);
  };

  const loadBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/api/backup/list', { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data.ok && Array.isArray(data.backups)) {
            setServerBackups(data.backups);
            if (data.backups.length > 0 && !selectedArchiveFile) {
              setSelectedArchiveFile(data.backups[0].fileName);
            }
          }
        } catch {}
      }
    } catch {} finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    loadDomains();
    loadBackups();
  }, [account?.id]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    fetch('/api/vault/state', { signal: controller.signal })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        clearTimeout(timer);
        if (data?.vaultPath) setVaultPath(data.vaultPath);
        if (data?.lastSavedAt) {
          setLastVaultSync(new Date(data.lastSavedAt).toLocaleString('id-ID'));
        }
      })
      .catch(() => {});
    return () => clearTimeout(timer);
  }, []);

  // Update selected doc root when domain selection changes
  const handleDomainChange = (domName: string) => {
    setSelectedDomain(domName);
    const found = serverDomains.find(d => d.domain.toLowerCase() === domName.toLowerCase());
    if (found) {
      setSelectedDocRoot(found.documentRoot);
    }
  };

  // --- Handlers: Probe Remote Zip ---
  const handleProbeRemoteZip = async () => {
    if (!remoteZipUrl.trim()) {
      showToast('error', 'URL Remote Kosong', 'Masukkan URL file .zip dari server sumber yang ingin diuji.');
      return;
    }
    setIsProbingRemote(true);
    setRemoteProbeInfo(null);
    try {
      const res = await fetch('/api/cloner/server-zip-probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zipUrl: remoteZipUrl.trim(),
          authType: remoteAuthType,
          authUsername: remoteAuthUser.trim(),
          authPassword: remoteAuthPass.trim(),
          bearerToken: remoteBearerToken.trim(),
          customHeaderName: remoteHeaderName.trim(),
          customHeaderValue: remoteHeaderValue.trim(),
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server remote mengembalikan respon bukan JSON (${res.status} ${res.statusText}).`);
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Gagal menjangkau URL file ZIP remote.');
      }

      setRemoteProbeInfo({
        ok: true,
        httpStatus: data.httpStatus,
        formattedSize: data.formattedSize,
        fileName: data.fileName,
        serverHeader: data.serverHeader,
      });

      showToast(
        'success',
        'Koneksi Berhasil!',
        `File ${data.fileName} (${data.formattedSize}) terdeteksi siap di-restore ke server.`
      );
    } catch (err: any) {
      setRemoteProbeInfo({
        ok: false,
        httpStatus: 0,
        message: err?.message || 'Server remote tidak merespons.',
      });
      showToast('error', 'Uji Koneksi Gagal', err?.message || 'Server remote tidak dapat diakses.');
    } finally {
      setIsProbingRemote(false);
    }
  };

  // --- Handlers: Create Domain Backup .ZIP ---
  const handleCreateDomainBackup = async () => {
    setIsCreatingBackup(true);
    setCreatedBackupResult(null);
    try {
      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          domain: selectedDomain,
          documentRoot: selectedDocRoot,
          backupType,
          includeConfig: includeConfigManifest,
          notes: backupNotes.trim() || `Cadangan .ZIP ${selectedDomain} (${backupType})`,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server mengembalikan respon tidak terduga (${res.status} ${res.statusText}).`);
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Gagal membuat file cadangan .ZIP.');
      }

      setCreatedBackupResult(data.backup);
      showToast(
        'success',
        'Backup .ZIP Berhasil Dibuat!',
        `Arsip ${data.backup.fileName} (${data.backup.formattedSize}) siap diunduh dan tersimpan di server.`
      );

      // Save to local DB list as well
      const newBackupRecord: AccountBackup = {
        id: data.backup.id,
        accountId: account.id,
        accountDomain: account.primaryDomain,
        targetDomain: selectedDomain,
        documentRoot: selectedDocRoot,
        fileName: data.backup.fileName,
        type: backupType,
        sizeMb: Math.round((data.backup.sizeBytes / (1024 * 1024)) * 10) / 10,
        formattedSize: data.backup.formattedSize,
        status: 'ready',
        createdAt: data.backup.createdAt,
        downloadUrl: data.backup.downloadUrl,
        notes: backupNotes,
      };
      db.saveBackup(newBackupRecord);
      loadBackups();
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Membuat Backup .ZIP', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // --- Polling Routine for Async Restore Job ---
  const startJobPolling = (jobId: string) => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    setIsPollingJob(true);

    pollingTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/backup/job-status?jobId=${encodeURIComponent(jobId)}`);
        if (!res.ok) return;
        const text = await res.text();
        const data = JSON.parse(text);
        if (data.ok && data.job) {
          setActiveJob(data.job);
          if (data.job.status === 'completed') {
            if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
            setIsPollingJob(false);
            const rStats = data.job.result || {};
            const dbSummary =
              rStats.restoredSettingsCount > 0 || rStats.restoredUploadsCount > 0
                ? ` (${rStats.restoredSettingsCount || 0} modul database & ${rStats.restoredUploadsCount || 0} media dipulihkan)`
                : '';
            const purgeSummary = rStats.autoPurgedZip
              ? ` File .ZIP (${rStats.purgedZipFormatted || ''}) otomatis dibuang dari disk.`
              : '';
            showToast(
              'success',
              'Pemulihan (Restore) Berhasil!',
              `Domain ${data.job.targetDomain} berhasil dipulihkan${dbSummary} dengan ${rStats.filesCount || ''} file aktif.${purgeSummary}`
            );
            loadDomains();
            loadBackups();
            refreshAll();
          } else if (data.job.status === 'error') {
            if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
            setIsPollingJob(false);
            showToast('error', 'Restore Gagal', data.job.error || 'Terjadi kesalahan saat memulihkan data.');
          }
        }
      } catch {}
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, []);

  // --- Handlers: Start Restore ---
  const handleStartRestore = () => {
    if (restoreSourceType === 'remote_url' && !remoteZipUrl.trim()) {
      showToast('error', 'URL Remote Kosong', 'Masukkan URL file .zip yang ingin ditarik.');
      return;
    }
    if (restoreSourceType === 'server_archive' && !selectedArchiveFile) {
      showToast('error', 'Pilih File Arsip', 'Pilih file backup dari daftar arsip server.');
      return;
    }
    if (restoreSourceType === 'upload_zip' && !uploadedRestoreFile) {
      showToast('error', 'Pilih File Cadangan', 'Pilih file backup (.zip, .json, atau .sql) dari perangkat Anda terlebih dahulu.');
      return;
    }

    const sourceDesc =
      restoreSourceType === 'remote_url'
        ? `URL Remote: ${remoteZipUrl.trim()}`
        : restoreSourceType === 'upload_zip' && uploadedRestoreFile
        ? `Unggahan Perangkat: ${uploadedRestoreFile.name}`
        : `Arsip Server: ${selectedArchiveFile}`;

    confirmAction({
      title: `Konfirmasi Restore ke ${selectedDomain}`,
      message: `PERINGATAN: Menjalankan restore akan memperbarui data & isi direktori "${selectedDocRoot}" pada domain "${selectedDomain}" dari ${sourceDesc}. Mendukung penuh hasil backup langsung dari website (.ZIP, .JSON, .SQL) maupun Full Hosting (.ZIP). Lanjutkan?`,
      confirmText: 'Mulai Restore Sekarang',
      isDanger: true,
      onConfirm: async () => {
        try {
          let targetArchiveFileName = selectedArchiveFile;

          if (restoreSourceType === 'upload_zip' && uploadedRestoreFile) {
            setIsUploadingRestoreFile(true);
            const totalBytes = uploadedRestoreFile.size;
            const totalMbStr = (totalBytes / (1024 * 1024)).toFixed(1);
            // 5 MB per chunk to bypass Cloudflare 100MB request limit and handle 200MB-500MB+ smoothly
            const CHUNK_SIZE = 5 * 1024 * 1024;
            const totalChunks = Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE));
            let finalUploadedFileName = uploadedRestoreFile.name;

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
              const start = chunkIndex * CHUNK_SIZE;
              const end = Math.min(start + CHUNK_SIZE, totalBytes);
              const chunkBlob = uploadedRestoreFile.slice(start, end);
              const uploadedMbStr = (end / (1024 * 1024)).toFixed(1);
              const pct = Math.min(48, Math.max(8, Math.round(((chunkIndex + 1) / totalChunks) * 45)));

              setActiveJob({
                id: 'uploading-local',
                type: 'backup_restore',
                status: 'downloading',
                progress: pct,
                message:
                  totalChunks > 1
                    ? `Mengunggah berkas ${uploadedRestoreFile.name} (Bagian ${chunkIndex + 1}/${totalChunks} — ${uploadedMbStr} MB / ${totalMbStr} MB)...`
                    : `Mengunggah berkas ${uploadedRestoreFile.name} (${totalMbStr} MB) ke server Cloud PRO...`,
                updatedAt: new Date().toISOString(),
                targetDomain: selectedDomain,
                targetDir: selectedDocRoot,
              });

              const chunkUrl = `/api/backup/upload-chunk?fileName=${encodeURIComponent(
                uploadedRestoreFile.name
              )}&chunkIndex=${chunkIndex}&totalChunks=${totalChunks}&tempForRestore=${
                restoreAutoDeleteZip ? '1' : '0'
              }`;

              const uploadRes = await fetch(chunkUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: chunkBlob,
              });
              const uploadText = await uploadRes.text();
              let uploadData: any = {};
              try {
                uploadData = JSON.parse(uploadText);
              } catch {
                throw new Error(`Gagal mengunggah bagian #${chunkIndex + 1} (${uploadRes.status}).`);
              }
              if (!uploadRes.ok || !uploadData.ok || !uploadData.fileName) {
                throw new Error(uploadData.message || 'Gagal mengunggah berkas cadangan ke server.');
              }
              finalUploadedFileName = uploadData.fileName;
            }

            targetArchiveFileName = finalUploadedFileName;
            setIsUploadingRestoreFile(false);
          }

          const res = await fetch('/api/backup/restore-async', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sourceType: restoreSourceType === 'remote_url' ? 'remote_url' : 'server_file',
              backupFileName: targetArchiveFileName,
              remoteZipUrl: remoteZipUrl.trim(),
              targetDomain: selectedDomain,
              targetDir: selectedDocRoot,
              createSnapshotBefore: restoreSafetySnapshot,
              cleanDestination: restoreCleanDestination,
              autoFlatten: restoreAutoFlatten,
              fixPermissions: restoreFixPermissions,
              importDatabase: restoreImportDatabase,
              autoDeleteZip: restoreAutoDeleteZip,
              authType: remoteAuthType,
              authUsername: remoteAuthUser.trim(),
              authPassword: remoteAuthPass.trim(),
              bearerToken: remoteBearerToken.trim(),
              customHeaderName: remoteHeaderName.trim(),
              customHeaderValue: remoteHeaderValue.trim(),
            }),
          });

          const text = await res.text();
          let data: any = {};
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(`Server merespons bukan JSON (${res.status} ${res.statusText}).`);
          }

          if (!res.ok || !data.ok) {
            throw new Error(data.message || 'Gagal memulai background job pemulihan.');
          }

          setActiveJob({
            id: data.jobId,
            type: restoreSourceType === 'remote_url' ? 'server_zip_pull' : 'backup_restore',
            status: 'pending',
            progress: 20,
            message: 'Memulai background worker restorasi di server Linux...',
            updatedAt: new Date().toISOString(),
            targetDomain: selectedDomain,
            targetDir: selectedDocRoot,
          });

          startJobPolling(data.jobId);
          showToast('info', 'Tugas Restore Berjalan', 'Proses pemulihan sedang dieksekusi di background server.');
        } catch (err: any) {
          setIsUploadingRestoreFile(false);
          setActiveJob(null);
          showToast('error', 'Gagal Menjalankan Restore', err?.message || 'Terjadi kesalahan sistem.');
        }
      },
    });
  };

  // --- Handlers: Delete Server Backup ---
  const handleDeleteServerBackup = (fileName: string) => {
    confirmAction({
      title: 'Hapus Berkas Cadangan',
      message: `Hapus permanen file backup "${fileName}" dari penyimpanan server? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Berkas',
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/backup/delete/${encodeURIComponent(fileName)}`, {
            method: 'DELETE',
          });
          const text = await res.text();
          let data: any = {};
          try { data = JSON.parse(text); } catch {}
          if (res.ok && data?.ok) {
            showToast('info', 'Berkas Dihapus', `Arsip ${fileName} telah dihapus.`);
            loadBackups();
            refreshAll();
          } else {
            showToast('error', 'Gagal Menghapus', data?.message || 'Gagal menghapus berkas.');
          }
        } catch (err: any) {
          showToast('error', 'Kesalahan', err?.message || 'Gagal menghapus berkas.');
        }
      },
    });
  };

  // --- Vault Handlers ---
  const handleToggleKeepData = async (nextVal: boolean) => {
    setKeepDataOnUpdate(nextVal);
    db.setDataRetentionEnabled(nextVal);
    db.syncToPersistentVault(true);
    try {
      await fetch('/api/vault/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked: nextVal }),
      });
    } catch {}
    showToast(
      nextVal ? 'success' : 'info',
      nextVal ? 'Proteksi Data Aktif' : 'Proteksi Data Nonaktif',
      nextVal
        ? 'Seluruh file website, domain, dan konfigurasi dikunci permanen di Persistent Vault agar tidak hilang saat update.'
        : 'Mode kunci dinonaktifkan.'
    );
  };

  const handleLockDataNow = async () => {
    setIsSyncingVault(true);
    try {
      db.setDataRetentionEnabled(true);
      setKeepDataOnUpdate(true);
      db.syncToPersistentVault(true);
      await new Promise(r => setTimeout(r, 400));
      setLastVaultSync(new Date().toLocaleString('id-ID'));
      showToast(
        'success',
        'Data Berhasil Dikunci!',
        `Semua data website, ${serverDomains.length} domain, dan brankas telah diamankan.`
      );
    } finally {
      setIsSyncingVault(false);
    }
  };

  const handleRestoreFromServerVault = async () => {
    setIsRestoringVault(true);
    try {
      const ok = await db.hydrateFromServerVault();
      if (ok) {
        loadDomains();
        loadBackups();
        refreshAll();
        setLastVaultSync(new Date().toLocaleString('id-ID'));
        showToast('success', 'Data Dipulihkan dari Vault', 'Data berhasil dikembalikan dari brankas server.');
      } else {
        showToast('info', 'Data Terkini', 'Data panel Anda sudah sinkron dengan vault server.');
      }
    } finally {
      setIsRestoringVault(false);
    }
  };

  const safeUpdateCommand = `mkdir -p ~/.cloudpro-persistent-vault && cp -f .cloudpro-data/*.json ~/.cloudpro-persistent-vault/ 2>/dev/null || true && git pull && npm run build`;
  const copyUpdateCmd = () => {
    navigator.clipboard?.writeText(safeUpdateCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleCleanDiskJunk = async () => {
    setIsCleaningDisk(true);
    try {
      const res = await fetch('/api/system/clean-disk', { method: 'POST' });
      const data = await res.json();
      if (data?.ok) {
        await loadDomains();
        await loadBackups();
        refreshAll();
        showToast(
          'success',
          'Sampah Disk Berhasil Dibersihkan!',
          data.message || `Disk sudah 100% bersih dan optimal! Total aktif: ${data.totalActiveFormatted}.`
        );
      } else {
        showToast('error', 'Gagal Membersihkan Disk', data?.message || 'Terjadi kesalahan.');
      }
    } catch (err: any) {
      showToast('error', 'Gagal Membersihkan Disk', err?.message || 'Terjadi kesalahan koneksi.');
    } finally {
      setIsCleaningDisk(false);
    }
  };

  const currentDomainObj = serverDomains.find(d => d.domain.toLowerCase() === selectedDomain.toLowerCase());

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* =================================================================== */}
      {/* DOMAIN & SUBDOMAIN SCOPING BAR                                      */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 max-w-full overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 shrink-0">
              <Globe className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Target Domain / Subdomain Aktif:
                </span>
                <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                  {currentDomainObj?.type === 'primary' ? 'DOMAIN UTAMA' : 'SUBDOMAIN'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 min-w-0">
                <select
                  value={selectedDomain}
                  onChange={e => handleDomainChange(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-orange-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer max-w-xs truncate"
                >
                  {serverDomains.map(d => (
                    <option key={d.id} value={d.domain}>
                      {d.domain} ({d.documentRoot}) — {d.formattedSize || '0 B'}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                  Folder: <code className="text-orange-600 dark:text-orange-400 font-bold">{selectedDocRoot}</code>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="text-slate-400 mr-1.5">Berkas di Disk:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {currentDomainObj?.filesCount || 0} File ({currentDomainObj?.formattedSize || '0 B'})
              </strong>
            </div>
            <button
              type="button"
              onClick={handleCleanDiskJunk}
              disabled={isCleaningDisk}
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 cursor-pointer transition-colors"
              title="Bersihkan file sampah sisa instalasi lama, chunk duplikat, dan snapshot sementara tanpa mengganggu website aktif"
            >
              {isCleaningDisk ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              )}
              <span>Bersihkan Sampah Disk</span>
            </button>
            <button
              type="button"
              onClick={() => { loadDomains(); loadBackups(); }}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              title="Perbarui Data Domain & Ukuran"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ACTIVE RUNNING JOB PROGRESS BAR                                     */}
      {/* =================================================================== */}
      {activeJob && activeJob.status !== 'completed' && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 to-orange-950/40 p-5 text-white shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  {activeJob.status === 'downloading'
                    ? 'Mengunduh Berkas ZIP Antar Server...'
                    : activeJob.status === 'snapshotting'
                    ? 'Membuat Safety Snapshot Sebelum Menimpa...'
                    : activeJob.status === 'extracting'
                    ? 'Mengekstrak Berkas & Meratakan Direktori...'
                    : activeJob.status === 'permissions'
                    ? 'Mengatur Hak Akses Linux (0755/0644)...'
                    : 'Memproses Pemulihan Data...'}
                </h4>
                <p className="text-xs text-amber-200/80">
                  Target: <strong>{activeJob.targetDomain}</strong> &rarr; <code>{activeJob.targetDir}</code>
                </p>
              </div>
            </div>
            <span className="font-mono text-sm font-extrabold text-amber-300">
              {activeJob.progress}%
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300 ease-out"
              style={{ width: `${Math.max(activeJob.progress, 5)}%` }}
            />
          </div>

          <p className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
            <Server className="h-3 w-3 text-amber-400" />
            <span>{activeJob.message}</span>
          </p>
        </div>
      )}

      {/* =================================================================== */}
      {/* TOP NAVIGATION TABS (ADAPTIVE PER MODULE MODE)                     */}
      {/* =================================================================== */}
      <div className={`grid gap-3 ${mode === 'backup' || mode === 'restore' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {(mode === 'all' || mode === 'backup') && (
          <button
            type="button"
            onClick={() => setActiveTab('backup_domain')}
            className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
              activeTab === 'backup_domain'
                ? 'border-orange-600 bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md ring-2 ring-orange-400/50'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            <Archive className={`h-5 w-5 shrink-0 ${activeTab === 'backup_domain' ? 'text-white' : 'text-orange-500'}`} />
            <div>
              <div className="text-xs font-bold flex items-center gap-1">
                <span>Cadangkan Domain</span>
                <span className={`rounded px-1 py-0.2 text-[8px] font-extrabold ${activeTab === 'backup_domain' ? 'bg-orange-800/80 text-orange-200' : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'}`}>
                  .ZIP
                </span>
              </div>
              <div className={`text-[10px] ${activeTab === 'backup_domain' ? 'text-orange-100' : 'text-slate-400'}`}>
                Buat Arsip .ZIP Cepat
              </div>
            </div>
          </button>
        )}

        {(mode === 'all' || mode === 'restore') && (
          <button
            type="button"
            onClick={() => setActiveTab('restore_domain')}
            className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
              activeTab === 'restore_domain'
                ? 'border-sky-600 bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md ring-2 ring-sky-400/50'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            <RotateCcw className={`h-5 w-5 shrink-0 ${activeTab === 'restore_domain' ? 'text-white' : 'text-sky-500'}`} />
            <div>
              <div className="text-xs font-bold flex items-center gap-1">
                <span>Pulihkan (Restore)</span>
                <span className={`rounded px-1 py-0.2 text-[8px] font-extrabold ${activeTab === 'restore_domain' ? 'bg-sky-800/80 text-sky-200' : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'}`}>
                  3 CARA
                </span>
              </div>
              <div className={`text-[10px] ${activeTab === 'restore_domain' ? 'text-sky-100' : 'text-slate-400'}`}>
                Server, URL Remote &amp; Upload
              </div>
            </div>
          </button>
        )}

        {(mode === 'all' || mode === 'backup') && (
          <button
            type="button"
            onClick={() => setActiveTab('backup_archives')}
            className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
              activeTab === 'backup_archives'
                ? 'border-indigo-600 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md ring-2 ring-indigo-400/50'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            <HardDrive className={`h-5 w-5 shrink-0 ${activeTab === 'backup_archives' ? 'text-white' : 'text-indigo-500'}`} />
            <div>
              <div className="text-xs font-bold flex items-center gap-1">
                <span>Arsip Berkas Server</span>
                <span className="text-[10px] font-bold text-slate-400">({serverBackups.length})</span>
              </div>
              <div className={`text-[10px] ${activeTab === 'backup_archives' ? 'text-indigo-100' : 'text-slate-400'}`}>
                Unduh &amp; Kelola .ZIP
              </div>
            </div>
          </button>
        )}

        {(mode === 'all' || mode === 'restore') && (
          <button
            type="button"
            onClick={() => setActiveTab('persistent_vault')}
            className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
              activeTab === 'persistent_vault'
                ? 'border-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-2 ring-emerald-400/50'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            <ShieldCheck className={`h-5 w-5 shrink-0 ${activeTab === 'persistent_vault' ? 'text-white' : 'text-emerald-500'}`} />
            <div>
              <div className="text-xs font-bold flex items-center gap-1">
                <span>Persistent Vault</span>
                <span className={`rounded px-1 py-0.2 text-[8px] font-extrabold ${activeTab === 'persistent_vault' ? 'bg-emerald-800/80 text-emerald-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                  AMAN
                </span>
              </div>
              <div className={`text-[10px] ${activeTab === 'persistent_vault' ? 'text-emerald-100' : 'text-slate-400'}`}>
                Kunci Data Saat Update
              </div>
            </div>
          </button>
        )}

        {/* Cross Module Jump Buttons */}
        {mode === 'backup' && (
          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('restore', selectedDomain) : setActiveTab('restore_domain')}
            className="flex items-center justify-between rounded-xl border border-sky-300 bg-sky-50/70 p-3.5 text-left hover:bg-sky-100/80 dark:border-sky-800 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <RotateCcw className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
              <div>
                <div className="text-xs font-bold text-sky-900 dark:text-sky-200">
                  Modul Restore
                </div>
                <div className="text-[10px] text-sky-700 dark:text-sky-300">
                  Pulihkan website dari arsip / ZIP
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          </button>
        )}

        {mode === 'restore' && (
          <button
            type="button"
            onClick={() => onNavigateTab ? onNavigateTab('backups', selectedDomain) : setActiveTab('backup_domain')}
            className="flex items-center justify-between rounded-xl border border-orange-300 bg-orange-50/70 p-3.5 text-left hover:bg-orange-100/80 dark:border-orange-800 dark:bg-orange-950/40 dark:hover:bg-orange-900/50 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Archive className="h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400" />
              <div>
                <div className="text-xs font-bold text-orange-900 dark:text-orange-200">
                  Modul Backup
                </div>
                <div className="text-[10px] text-orange-700 dark:text-orange-300">
                  Buat snapshot cadangan baru
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </button>
        )}
      </div>

      {/* =================================================================== */}
      {/* TAB 1: CADANGKAN DOMAIN / SUBDOMAIN (.ZIP)                          */}
      {/* =================================================================== */}
      {activeTab === 'backup_domain' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Archive className="h-5 w-5 text-orange-500 shrink-0" />
                    <span>Cadangkan Berkas .ZIP: <span className="text-orange-600 dark:text-orange-400">{selectedDomain}</span></span>
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Mengemas berkas website menjadi arsip kompresi .ZIP berkecepatan tinggi menggunakan Linux Native Engine.
                  </p>
                </div>
                <span className="self-start sm:self-auto rounded-lg bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 px-2.5 py-1 text-[10px] font-extrabold tracking-wide uppercase shrink-0">
                  Linux Native Engine
                </span>
              </div>

              {/* Elemen Grid Minimalis & Elegan: Folder Sumber & Lokasi Penyimpanan Vault */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                <div className="md:col-span-4 rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40 p-3 flex items-start gap-2.5 min-w-0">
                  <FolderOpen className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Folder Sumber
                    </span>
                    <span className="block font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5" title={selectedDocRoot}>
                      {selectedDocRoot}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-8 rounded-xl border border-orange-200/80 bg-orange-50/40 dark:border-orange-900/40 dark:bg-orange-950/20 p-3 flex items-start gap-2.5 min-w-0">
                  <HardDrive className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-orange-800/90 dark:text-orange-300/90">
                        Lokasi Penyimpanan (.ZIP Vault)
                      </span>
                      <span className="rounded bg-orange-200/70 dark:bg-orange-900/70 text-orange-900 dark:text-orange-200 px-1.5 py-0.2 text-[9px] font-mono font-bold shrink-0">
                        PERSISTENT DISK
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 bg-white/80 dark:bg-slate-900/60 rounded-lg px-2.5 py-1 border border-orange-200/60 dark:border-orange-800/50">
                      <code className="text-xs font-mono font-semibold text-orange-950 dark:text-orange-200 truncate" title={`${vaultPath}/backups/`}>
                        {vaultPath}/backups/
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(`${vaultPath}/backups/`);
                          showToast('info', 'Path Tersalin', `${vaultPath}/backups/`);
                        }}
                        className="text-slate-400 hover:text-orange-600 dark:hover:text-orange-300 p-0.5 cursor-pointer shrink-0"
                        title="Salin path penyimpanan"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scope Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Pilih Cakupan Cadangan (.ZIP):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'full',
                    title: 'Full Website (.zip)',
                    badge: 'DIREKOMENDASIKAN',
                    desc: 'Seluruh berkas web + otomatis ekspor database MySQL terkait ke dalam database.sql',
                  },
                  {
                    id: 'files',
                    title: 'File Dokumen Web Saja (.zip)',
                    badge: 'SUPER CEPAT',
                    desc: `Hanya mengarsipkan seluruh file & subfolder di dalam ${selectedDocRoot}`,
                  },
                  {
                    id: 'database',
                    title: 'Database MySQL Saja (.sql.zip)',
                    badge: 'SQL DUMP',
                    desc: 'Cadangan dump database MySQL yang terhubung ke domain ini',
                  },
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => setBackupType(opt.id as any)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      backupType === opt.id
                        ? 'border-orange-500 bg-orange-50/60 dark:border-orange-500 dark:bg-orange-950/40 ring-2 ring-orange-500/20'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {opt.title}
                      </span>
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-extrabold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeConfigManifest}
                  onChange={e => setIncludeConfigManifest(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 dark:border-slate-700"
                />
                <span>
                  Sertakan Metadata Domain (<code>domain-manifest.json</code>: versi PHP {currentDomainObj?.phpVersion || '8.2'}, path direktori, nama domain) agar saat direstore setelan vHost langsung pulih 100%.
                </span>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Cadangan (Opsional):
                </label>
                <input
                  type="text"
                  value={backupNotes}
                  onChange={e => setBackupNotes(e.target.value)}
                  placeholder="Contoh: Backup sebelum update tema dan plugin WordPress"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Direktori sumber: <code>{selectedDocRoot}</code> ({currentDomainObj?.filesCount || 0} berkas)
              </div>

              <button
                type="button"
                disabled={isCreatingBackup}
                onClick={handleCreateDomainBackup}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:from-orange-500 hover:to-amber-500 cursor-pointer disabled:opacity-50"
              >
                {isCreatingBackup ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mengompresi Berkas .ZIP di Linux Server...</span>
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    <span>Mulai Buat Cadangan .ZIP Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Success Banner upon creation */}
          {createdBackupResult && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-5 dark:border-emerald-500/30 dark:bg-emerald-950/30 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      Cadangan .ZIP Berhasil Dibuat!
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Berkas <strong>{createdBackupResult.fileName}</strong> ({createdBackupResult.formattedSize}) tersimpan aman di server.
                    </p>
                  </div>
                </div>

                <a
                  href={createdBackupResult.downloadUrl}
                  download={createdBackupResult.fileName}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Unduh File .ZIP Langsung</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: PULIHKAN (RESTORE .ZIP) KE DOMAIN/SUBDOMAIN                 */}
      {/* =================================================================== */}
      {activeTab === 'restore_domain' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-sky-500" />
                <span>Pulihkan (Restore) ke: <span className="text-sky-600 dark:text-sky-400">{selectedDomain}</span></span>
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Pilih sumber file .ZIP cadangan (dari server lokal, tarik URL remote antar server, atau unggah langsung dari PC/HP).
              </p>
            </div>

            {/* Restore Source Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRestoreSourceType('server_archive')}
                className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  restoreSourceType === 'server_archive'
                    ? 'border-sky-500 bg-sky-50/60 dark:border-sky-500 dark:bg-sky-950/40 ring-2 ring-sky-500/20'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <HardDrive className={`h-4 w-4 ${restoreSourceType === 'server_archive' ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Dari Arsip Server</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Pilih dari {serverBackups.length} file .ZIP yang sudah tersimpan di server
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRestoreSourceType('remote_url')}
                className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  restoreSourceType === 'remote_url'
                    ? 'border-amber-500 bg-amber-50/60 dark:border-amber-500 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DownloadCloud className={`h-4 w-4 ${restoreSourceType === 'remote_url' ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Tarik URL Remote</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Sedot langsung dari server lain via Linux Socket (super cepat &amp; hemat kuota)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRestoreSourceType('upload_zip')}
                className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                  restoreSourceType === 'upload_zip'
                    ? 'border-indigo-500 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Upload className={`h-4 w-4 ${restoreSourceType === 'upload_zip' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Unggah File (.ZIP / .JSON / .SQL)</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                   Mendukung hasil backup langsung dari website (.zip, .json, .sql) maupun Full Hosting (.zip)
                </p>
              </button>
            </div>

            {/* Source Input 1: Server Archive Dropdown */}
            {restoreSourceType === 'server_archive' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih File Cadangan di Server:
                </label>
                {serverBackups.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3 text-center">
                    Belum ada berkas backup .ZIP yang tersimpan di server. Anda dapat membuat backup baru di tab &quot;Cadangkan Domain&quot; atau menarik file dari URL remote.
                  </div>
                ) : (
                  <select
                    value={selectedArchiveFile}
                    onChange={e => setSelectedArchiveFile(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {serverBackups.map(b => (
                      <option key={b.fileName} value={b.fileName}>
                        {b.fileName} — {b.formattedSize || '0 B'} ({b.createdAt ? new Date(b.createdAt).toLocaleString('id-ID') : '-'}) [{(b.type || 'full').toUpperCase()}]
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Source Input 2: Remote URL */}
            {restoreSourceType === 'remote_url' && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-50/30 p-4 dark:border-amber-500/20 dark:bg-amber-950/20 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={remoteZipUrl}
                      onChange={e => setRemoteZipUrl(e.target.value)}
                      placeholder="https://siakad-madrasah.jaenalmaskun.biz.id/siakadmadrasah.zip"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:border-amber-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isProbingRemote}
                    onClick={handleProbeRemoteZip}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-500/15 px-4 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-500/25 dark:text-amber-300 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isProbingRemote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    <span>Uji Koneksi &amp; Ukuran</span>
                  </button>
                </div>

                {/* Probe Feedback */}
                {remoteProbeInfo && (
                  <div
                    className={`rounded-xl p-3 text-xs flex items-center justify-between border ${
                      remoteProbeInfo.ok
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {remoteProbeInfo.ok ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>
                          File <strong>{remoteProbeInfo.fileName}</strong> terverifikasi dengan ukuran{' '}
                          <strong>{remoteProbeInfo.formattedSize}</strong> ({remoteProbeInfo.serverHeader}). Siap diunduh di server.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                        <span>{remoteProbeInfo.message || 'Gagal menghubungi server remote.'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Source Input 3: Upload Local ZIP / JSON / SQL */}
            {restoreSourceType === 'upload_zip' && (
              <div className="rounded-xl border-2 border-dashed border-indigo-400/60 bg-indigo-50/30 p-6 text-center dark:border-indigo-500/40 dark:bg-indigo-950/20 space-y-3">
                <Upload className="mx-auto h-8 w-8 text-indigo-500" />
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Pilih file cadangan (.ZIP hingga 200MB–500MB+, .JSON, atau .SQL) dari komputer / HP Anda
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Dilengkapi <strong>Chunked Streaming Upload (5MB/bagian)</strong> &amp; <strong>Auto-Purge .ZIP</strong> — file .ZIP besar otomatis dibuang dari disk setelah diekstrak!
                  </p>
                </div>
                <input
                  ref={localZipInputRef}
                  type="file"
                  accept=".zip,.json,.sql,application/zip,application/json,text/plain"
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    setUploadedRestoreFile(f);
                    if (f) {
                      const sizeStr =
                        f.size < 1024 * 1024
                          ? `${(f.size / 1024).toFixed(1)} KB`
                          : `${(f.size / (1024 * 1024)).toFixed(2)} MB`;
                      showToast('info', 'File Cadangan Siap', `${f.name} (${sizeStr}) siap dipulihkan ke ${selectedDomain}.`);
                    }
                  }}
                  className="mt-2 block mx-auto text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white file:hover:bg-indigo-500 file:cursor-pointer"
                />

                {uploadedRestoreFile && (
                  <div className="mx-auto max-w-lg rounded-xl border border-indigo-500/30 bg-white/90 dark:bg-slate-900/90 p-3 text-left flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {uploadedRestoreFile.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Ukuran:{' '}
                          {uploadedRestoreFile.size < 1024 * 1024
                            ? `${(uploadedRestoreFile.size / 1024).toFixed(1)} KB`
                            : `${(uploadedRestoreFile.size / (1024 * 1024)).toFixed(2)} MB`}{' '}
                          &bull;{' '}
                          {uploadedRestoreFile.name.toLowerCase().endsWith('.json')
                            ? 'Format: Database JSON Website'
                            : uploadedRestoreFile.name.toLowerCase().endsWith('.sql')
                            ? 'Format: SQL Dump Database'
                            : 'Format: Arsip Lengkap .ZIP (Database + Media / Hosting)'}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-extrabold shrink-0">
                      SIAP RESTORE
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Restore Protections & Intelligence Options */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30 space-y-2.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Opsi Proteksi &amp; Ekstraksi Pintar:
              </span>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreSafetySnapshot}
                  onChange={e => setRestoreSafetySnapshot(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-700"
                />
                <span className="font-semibold text-slate-900 dark:text-white">
                  Buat Cadangan Darurat (Safety Snapshot) Otomatis
                </span>
                <span className="text-slate-500 text-[11px]">— Menyimpan kondisi file saat ini sebelum ditimpa agar bisa di-rollback kapan saja.</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreAutoFlatten}
                  onChange={e => setRestoreAutoFlatten(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-700"
                />
                <span className="font-semibold text-slate-900 dark:text-white">
                  Auto-Flatten Folder Wrapper
                </span>
                <span className="text-slate-500 text-[11px]">— Jika di dalam ZIP dibungkus satu folder (seperti <code>public_html/</code> atau <code>nama-folder/</code>), otomatis lepaskan isinya langsung ke target domain.</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreCleanDestination}
                  onChange={e => setRestoreCleanDestination(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-700"
                />
                <span>Hapus berkas lama di folder tujuan sebelum mengekstrak (Clean Destination).</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreFixPermissions}
                  onChange={e => setRestoreFixPermissions(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-700"
                />
                <span>Setel permission Linux standar otomatis (Folder 0755 &amp; File 0644).</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreImportDatabase}
                  onChange={e => setRestoreImportDatabase(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-700"
                />
                <span>Deteksi dan otomatis impor berkas database SQL (jika terdapat <code>database.sql</code> atau berkas .sql di dalam arsip).</span>
              </label>

              <label className="flex items-start sm:items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreAutoDeleteZip}
                  onChange={e => setRestoreAutoDeleteZip(e.target.checked)}
                  className="h-4 w-4 mt-0.5 sm:mt-0 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 dark:border-emerald-700"
                />
                <div>
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    Otomatis Buang/Hapus File .ZIP Setelah Data Selesai Diekstrak (Auto-Purge .ZIP Hemat Disk)
                  </span>
                  <span className="block sm:inline sm:ml-1 text-emerald-700 dark:text-emerald-300/90 text-[11px]">
                    — Sangat disarankan untuk file .ZIP besar (200MB+) agar file mentah .ZIP tidak menumpuk di disk server setelah diekstrak.
                  </span>
                </div>
              </label>
            </div>

            {/* Start Restore Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Target Restorasi: <strong>{selectedDomain}</strong> &rarr; <code>{selectedDocRoot}</code>
              </div>

              <button
                type="button"
                disabled={isPollingJob}
                onClick={handleStartRestore}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:from-sky-500 hover:to-blue-500 cursor-pointer disabled:opacity-50"
              >
                {isPollingJob ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sedang Merestore di Server...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Mulai Restore ke {selectedDomain}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: ARSIP BERKAS CADANGAN SERVER (.ZIP)                          */}
      {/* =================================================================== */}
      {activeTab === 'backup_archives' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Daftar Berkas Cadangan (.ZIP) di Server ({serverBackups.length})</span>
              </h4>
              <p className="mt-0.5 text-xs text-slate-400 font-mono truncate max-w-full" title={`${vaultPath}/backups/`}>
                Lokasi: <code className="text-indigo-600 dark:text-indigo-400 font-semibold">{vaultPath}/backups/</code>
              </p>
            </div>

            <button
              type="button"
              onClick={loadBackups}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
              <span>Muat Ulang Berkas</span>
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 font-sans">
                <tr>
                  <th className="px-5 py-3">Nama Berkas .ZIP</th>
                  <th className="px-5 py-3">Domain Asal</th>
                  <th className="px-5 py-3">Tipe</th>
                  <th className="px-5 py-3">Ukuran Disk</th>
                  <th className="px-5 py-3">Tanggal Dibuat</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {serverBackups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-sans">
                      Belum ada berkas backup .ZIP di server. Buat cadangan baru melalui tab &quot;Cadangkan Domain&quot;.
                    </td>
                  </tr>
                ) : (
                  serverBackups.map(bk => (
                    <tr key={bk.fileName} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Archive className="h-4 w-4 text-orange-500 shrink-0" />
                          <span className="font-semibold text-slate-900 dark:text-white break-all">
                            {bk.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-sans">
                        <span className="font-bold text-slate-900 dark:text-white">{bk.domain}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-bold uppercase text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {bk.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {bk.formattedSize}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-[11px] font-sans">
                        {bk.createdAt ? new Date(bk.createdAt).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-sans">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={bk.downloadUrl}
                            download={bk.fileName}
                            className="flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                            title="Download Berkas .ZIP"
                          >
                            <Download className="h-3 w-3 text-orange-500" />
                            <span>Download</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedArchiveFile(bk.fileName);
                              setActiveTab('restore_domain');
                              setRestoreSourceType('server_archive');
                              showToast('info', 'Arsip Dipilih', `${bk.fileName} dipilih untuk restorasi.`);
                            }}
                            className="flex items-center gap-1 rounded bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300 cursor-pointer"
                            title="Restore Berkas Ini"
                          >
                            <RotateCcw className="h-3 w-3 text-sky-500" />
                            <span>Restore</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteServerBackup(bk.fileName)}
                            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 cursor-pointer"
                            title="Hapus Berkas Backup"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: PERSISTENT VAULT (BRANKAS PERMANEN)                          */}
      {/* =================================================================== */}
      {activeTab === 'persistent_vault' && (
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/50 p-6 text-white shadow-lg space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shrink-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Proteksi Pertahankan Data Saat Update Cloud PRO (Persistent Vault)
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      keepDataOnUpdate
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Lock className="h-3 w-3" />
                    <span>{keepDataOnUpdate ? 'AKTIF & TERKUNCI PERMANEN' : 'NONAKTIF'}</span>
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-3xl">
                  Fitur ini menyimpan seluruh file website hasil kloning/ekstrak ZIP (<code>/public_html</code>), daftar domain/subdomain, database, serta konfigurasi Cloudflare Tunnel ke <strong>brankas permanen di luar folder update</strong> (<code>{vaultPath}</code>). Saat Cloud PRO di-update atau server di-restart, data Anda <strong>tidak akan pernah hilang atau ter-reset</strong>.
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-slate-950/80 px-3.5 py-2.5 text-xs font-bold text-emerald-300 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={keepDataOnUpdate}
                onChange={e => handleToggleKeepData(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 text-emerald-500"
              />
              <span>Pertahankan Data Otomatis Saat Update</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleLockDataNow}
              disabled={isSyncingVault}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs cursor-pointer"
            >
              <Lock className={`h-3.5 w-3.5 ${isSyncingVault ? 'animate-pulse' : ''}`} />
              <span>{isSyncingVault ? 'Mengunci ke Disk...' : 'Simpan & Kunci Data ke Disk Server Sekarang'}</span>
            </button>

            <button
              type="button"
              onClick={handleRestoreFromServerVault}
              disabled={isRestoringVault}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3.5 py-2.5 text-xs font-bold text-sky-300 hover:bg-sky-500/25 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRestoringVault ? 'animate-spin' : ''}`} />
              <span>Pulihkan dari Vault Server</span>
            </button>
          </div>

          {/* Safe Update Command */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-[11px] font-mono flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
            <div className="text-slate-300 break-all">
              <span className="text-emerald-400 font-sans font-bold mr-2">Perintah Update Cloud PRO Aman:</span>
              <code>{safeUpdateCommand}</code>
            </div>
            <button
              type="button"
              onClick={copyUpdateCmd}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 font-sans text-[10px] font-bold text-slate-200 hover:bg-slate-700 shrink-0 cursor-pointer"
            >
              {copiedCmd ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedCmd ? 'Tersalin!' : 'Salin Perintah'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
