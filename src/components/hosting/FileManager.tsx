import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  FileText,
  FileCode,
  FolderPlus,
  FilePlus,
  Trash2,
  Edit,
  Save,
  X,
  ArrowLeft,
  Download,
  Upload,
  Archive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileArchive,
  RefreshCw,
  Search,
  Globe,
  GitBranch,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Server,
  Zap,
  Sparkles,
  Layers,
  ArrowDownCircle,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';
import { VirtualFile, HostingAccount } from '../../types';
import { db } from '../../services/storage';
import { extractZipArchive, createZipArchive } from '../../services/zipExtractor';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';
import { WebsitePreviewModal } from './WebsitePreviewModal';

interface FileManagerProps {
  account: HostingAccount;
  initialPath?: string;
  onBack?: () => void;
}

interface UploadQueueItem {
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  extractedCount?: number;
}

export const FileManager: React.FC<FileManagerProps> = ({ account, initialPath, onBack }) => {
  const { currentUser } = useAuth();
  const { showToast, confirmAction } = useServer();

  if (!currentUser || !account) return null;

  // Resolve path cleanly (strips /home/<user> if present)
  const resolveCleanPath = (p?: string) => {
    if (!p) return '/public_html';
    let cleaned = p.trim().replace(/^\/home\/[^/]+/, '');
    if (!cleaned.startsWith('/')) cleaned = `/${cleaned}`;
    if (cleaned.length > 1) cleaned = cleaned.replace(/\/+$/, '');
    return cleaned || '/public_html';
  };

  const [currentPath, setCurrentPath] = useState<string>(resolveCleanPath(initialPath));
  const [folderHistory, setFolderHistory] = useState<string[]>([]);
  const [editingFile, setEditingFile] = useState<VirtualFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showNewDirModal, setShowNewDirModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState<VirtualFile | null>(null);
  const [newPermValue, setNewPermValue] = useState('0644');
  const [newItemName, setNewItemName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload & ZIP Extractor state
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [autoExtractZip, setAutoExtractZip] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtractingFileId, setIsExtractingFileId] = useState<string | null>(null);

  // Dedicated ZIP Extractor Modal state
  const [showZipExtractModal, setShowZipExtractModal] = useState(false);
  const [selectedZipFileId, setSelectedZipFileId] = useState<string>('');
  const [directZipFile, setDirectZipFile] = useState<File | null>(null);
  const [extractTargetDir, setExtractTargetDir] = useState<string>('/public_html');
  const [flattenZipRoot, setFlattenZipRoot] = useState<boolean>(true);
  const [clearOldIndexOnExtract, setClearOldIndexOnExtract] = useState<boolean>(true);
  const [autoDeleteZipAfterExtract, setAutoDeleteZipAfterExtract] = useState<boolean>(true);
  const [isRunningZipModalExtract, setIsRunningZipModalExtract] = useState<boolean>(false);
  const zipExtractInputRef = useRef<HTMLInputElement>(null);

  // Website Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDirectoryTree, setShowDirectoryTree] = useState(false);

  // Checklist / Multi-select state
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [showBatchPermModal, setShowBatchPermModal] = useState(false);
  const [batchPermValue, setBatchPermValue] = useState('0644');
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPath) {
      setCurrentPath(resolveCleanPath(initialPath));
    }
  }, [initialPath]);

  useEffect(() => {
    setSelectedFileIds(new Set());
  }, [currentPath]);

  const [filesVersion, setFilesVersion] = useState(0);
  const deletedPathsBlacklistRef = useRef<Set<string>>(new Set());
  const [isDiskScanning, setIsDiskScanning] = useState(false);
  const [isCleaningDisk, setIsCleaningDisk] = useState(false);
  const [isQuickPulling, setIsQuickPulling] = useState(false);
  const diskScanAttemptedRef = useRef<Record<string, boolean>>({});

  const allFiles = db.getVirtualFiles(account.id);
  const accountDomains = db.getDomains(account.id);

  // Build isolated domain/subdomain workspace targets
  const allDomainTargets = React.useMemo(() => {
    const subdomains = accountDomains.filter(d => d.type === 'subdomain');
    const addonDomains = accountDomains.filter(d => d.type === 'addon');

    const targets: Array<{
      id: string;
      name: string;
      type: 'primary' | 'subdomain' | 'addon';
      docRoot: string;
      label: string;
    }> = [
      {
        id: 'primary',
        name: account.primaryDomain,
        type: 'primary',
        docRoot: '/public_html',
        label: `${account.primaryDomain} (Domain Utama)`,
      },
      ...subdomains.map(sub => {
        const cleanRoot = resolveCleanPath(
          sub.documentRoot || `/public_html/${sub.subdomainPrefix || sub.domain.split('.')[0]}`
        );
        return {
          id: sub.id,
          name: sub.domain,
          type: 'subdomain' as const,
          docRoot: cleanRoot,
          label: `${sub.domain} (Subdomain)`,
        };
      }),
      ...addonDomains.map(addon => {
        const cleanRoot = resolveCleanPath(addon.documentRoot || `/${addon.domain}`);
        return {
          id: addon.id,
          name: addon.domain,
          type: 'addon' as const,
          docRoot: cleanRoot,
          label: `${addon.domain} (Addon Domain)`,
        };
      }),
    ];

    const knownSubPrefixes = ['siakad-madrasah', 'rdm', 'cbt', 'elearning', 'ppdb', 'perpustakaan', 'simpatika', 'emis'];
    for (const prefix of knownSubPrefixes) {
      const candidateRoot = `/public_html/${prefix}`;
      const alreadyListed = targets.some(
        t => t.docRoot.toLowerCase() === candidateRoot || t.name.toLowerCase().startsWith(`${prefix}.`)
      );
      const existsInFiles = allFiles.some(f => {
        const p = resolveCleanPath(f.path).toLowerCase();
        return p === candidateRoot || p.startsWith(`${candidateRoot}/`);
      });
      if (!alreadyListed && (prefix === 'siakad-madrasah' || existsInFiles)) {
        targets.push({
          id: `sub-preset-${prefix}`,
          name: `${prefix}.${account.primaryDomain}`,
          type: 'subdomain',
          docRoot: candidateRoot,
          label: `${prefix}.${account.primaryDomain} (Subdomain)`,
        });
      }
    }

    return targets;
  }, [accountDomains, account.primaryDomain, allFiles]);

  // Set of all subdomain/addon document roots that must NOT appear inside Domain Utama (/public_html)
  const isolatedSubdomainRoots = React.useMemo(() => {
    const roots = new Set<string>([
      '/public_html/siakad-madrasah',
      '/public_html/rdm',
      '/public_html/cbt',
      '/public_html/elearning',
      '/public_html/ppdb',
      '/public_html/perpustakaan',
      '/public_html/simpatika',
      '/public_html/emis',
    ]);
    for (const t of allDomainTargets) {
      if (t.type !== 'primary' && t.docRoot.toLowerCase() !== '/public_html') {
        roots.add(t.docRoot.toLowerCase());
      }
    }
    return roots;
  }, [allDomainTargets]);

  const sortedTargets = React.useMemo(
    () => [...allDomainTargets].sort((a, b) => b.docRoot.length - a.docRoot.length),
    [allDomainTargets]
  );

  const activeTarget = React.useMemo(
    () =>
      sortedTargets.find(t => currentPath === t.docRoot || currentPath.startsWith(t.docRoot + '/')) ||
      allDomainTargets[0],
    [sortedTargets, currentPath, allDomainTargets]
  );

  // Filter items in current directory (with deduplication by clean path and strict subdomain workspace isolation)
  const seenItemPaths = new Set<string>();
  const currentItems = allFiles.filter(f => {
    const fPath = resolveCleanPath(f.path);
    if (fPath === currentPath) return false;
    const parentDir = fPath.substring(0, fPath.lastIndexOf('/'));
    if (parentDir !== currentPath) return false;
    const key = fPath.toLowerCase();
    // Hide subdomain root folders when viewing the Primary Domain (/public_html)
    if (currentPath.toLowerCase() === '/public_html' && isolatedSubdomainRoots.has(key)) {
      return false;
    }
    if (seenItemPaths.has(key)) return false;
    if (deletedPathsBlacklistRef.current.has(key)) return false;
    seenItemPaths.add(key);
    return true;
  });

  const syncFromDisk = async (dirToScan: string, showToastNotice = false) => {
    setIsDiskScanning(true);
    try {
      const res = await fetch(`/api/files/disk-scan?dir=${encodeURIComponent(dirToScan)}&accountId=${encodeURIComponent(account.id)}`);
      const data = await res.json();
      if (data?.ok && Array.isArray(data?.files) && data.files.length > 0) {
        const now = new Date().toISOString();
        const batchToSave: VirtualFile[] = [];
        data.files.forEach((f: any) => {
          const normKey = resolveCleanPath(f.path).toLowerCase();
          // Never re-import a file that the user intentionally deleted!
          if (deletedPathsBlacklistRef.current.has(normKey)) {
            return;
          }
          // When scanning Primary Domain (/public_html), skip subdomain root folders
          if (resolveCleanPath(dirToScan).toLowerCase() === '/public_html') {
            if (isolatedSubdomainRoots.has(normKey)) return;
            for (const subRoot of isolatedSubdomainRoots) {
              if (normKey.startsWith(subRoot + '/')) return;
            }
          }
          batchToSave.push({
            id: f.id || `vf-disk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            accountId: account.id,
            name: f.name,
            path: f.path,
            type: f.type || 'file',
            sizeBytes: f.size || 1024,
            permissions: f.type === 'directory' ? '0755' : '0644',
            mimeType: f.name.endsWith('.php') ? 'text/html' : f.name.endsWith('.css') ? 'text/css' : 'text/html',
            updatedAt: now,
            content: f.content,
          });
        });
        db.replaceDirectoryFilesFromDiskScan(account.id, dirToScan, batchToSave);
        setFilesVersion(v => v + 1);
        if (showToastNotice) {
          showToast('success', 'File Tersinkron dari Disk', `Berhasil memuat ${batchToSave.length} berkas aktif dari server disk.`);
        }
      } else if (showToastNotice) {
        showToast('info', 'Pemeriksaan Disk Selesai', 'Direktori ini belum memiliki berkas fisik di server.');
      }
    } catch {
      // ignore
    } finally {
      setIsDiskScanning(false);
    }
  };

  const handleCleanDiskJunk = async () => {
    setIsCleaningDisk(true);
    try {
      const res = await fetch('/api/system/clean-disk', { method: 'POST' });
      const data = await res.json();
      if (data?.ok) {
        await syncFromDisk(currentPath, false);
        showToast(
          'success',
          'Sampah Disk Berhasil Dibersihkan!',
          data.message || `Disk bersih dan optimal! Total aktif: ${data.totalActiveFormatted} (${data.totalActiveFiles} file).`
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

  useEffect(() => {
    // Safely scan physical disk once per directory to sync active files
    const scanKey = `${account.id}:${currentPath}`;
    if (!diskScanAttemptedRef.current[scanKey]) {
      diskScanAttemptedRef.current[scanKey] = true;
      syncFromDisk(currentPath, false);
    }
  }, [currentPath, account.id]);

  const handleQuickPullSiakad = async () => {
    setIsQuickPulling(true);
    showToast('info', 'Sedang Mentransfer Siakad Antar-Server', 'Mengunduh dan mengekstrak siakadmadrasah.zip langsung ke ' + currentPath + ' (Server-to-Server)...');
    try {
      const res = await fetch('/api/migrator/remote-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          targetDir: currentPath,
          sourceType: 'archive_file',
          archiveUrl: 'https://siakad-madrasah.jaenalmaskun.biz.id/siakadmadrasah.zip',
          cleanTargetDir: true,
          flattenRoot: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Gagal transfer.');

      if (Array.isArray(data.files)) {
        const now = new Date().toISOString();
        data.files.forEach((f: any) => {
          db.saveVirtualFile({
            id: f.id || `vf-siakad-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            accountId: account.id,
            name: f.name,
            path: f.path,
            type: f.type || 'file',
            sizeBytes: f.size || 1024,
            permissions: f.type === 'directory' ? '0755' : '0644',
            mimeType: f.name.endsWith('.php') ? 'text/html' : f.name.endsWith('.css') ? 'text/css' : 'text/html',
            updatedAt: now,
            content: f.content,
          });
        });
      }
      showToast('success', 'Transfer Siakad Sukses!', `${data.message || 'Berkas Siakad berhasil dipasang!'} (${data.files?.length || 0} berkas)`);
      await syncFromDisk(currentPath, true);
    } catch (err: any) {
      showToast('error', 'Gagal Transfer Siakad', err?.message || 'Terjadi kesalahan saat transfer file ZIP.');
    } finally {
      setIsQuickPulling(false);
    }
  };

  const filteredItems = currentItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigateToFolder = (nextPath: string) => {
    const cleanNext = resolveCleanPath(nextPath);
    if (cleanNext === currentPath) return;
    setFolderHistory(prev => [...prev, currentPath]);
    setCurrentPath(cleanNext);
    setSearchQuery('');
  };

  const handleOpenFile = (file: VirtualFile) => {
    const fPath = resolveCleanPath(file.path);
    if (file.type === 'directory') {
      navigateToFolder(fPath);
    } else {
      setEditingFile(file);
      setFileContent(file.content || '');
    }
  };

  const toggleSelectAll = () => {
    if (selectedFileIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(filteredItems.map(f => f.id)));
    }
  };

  const toggleSelectFile = (id: string, e?: React.MouseEvent | React.ChangeEvent) => {
    e?.stopPropagation();
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchDelete = () => {
    if (selectedFileIds.size === 0) return;
    const count = selectedFileIds.size;
    confirmAction({
      title: 'Hapus Massal File / Folder',
      message: `Apakah Anda yakin ingin menghapus ${count} file/folder terpilih secara permanen dari server? Berkas fisik di disk Linux juga akan dihapus.`,
      confirmText: `Hapus Permanen ${count} Item`,
      isDanger: true,
      onConfirm: async () => {
        const itemsToDelete = allFiles.filter(f => selectedFileIds.has(f.id));
        itemsToDelete.forEach(item => {
          const cleanP = resolveCleanPath(item.path).toLowerCase();
          deletedPathsBlacklistRef.current.add(cleanP);
          if (item.type === 'directory') {
            allFiles.forEach(sub => {
              const subP = resolveCleanPath(sub.path).toLowerCase();
              if (subP.startsWith(cleanP + '/')) {
                deletedPathsBlacklistRef.current.add(subP);
              }
            });
          }
        });
        db.deleteVirtualFilesBatch(Array.from(selectedFileIds));
        setSelectedFileIds(new Set());
        setFilesVersion(v => v + 1);

        try {
          await fetch('/api/files/batch-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: account.id,
              items: itemsToDelete.map(i => ({
                id: i.id,
                path: i.path,
                type: i.type,
              })),
            }),
          });
        } catch {}

        pushVhostSyncNow();
        showToast('success', 'Hapus Massal Selesai', `Berhasil menghapus permanen ${count} item dari server.`);
      },
    });
  };

  const handleBatchDownloadZip = async () => {
    if (selectedFileIds.size === 0) return;
    try {
      setIsBatchDownloading(true);
      const selectedFiles = allFiles.filter(f => selectedFileIds.has(f.id));
      const zipEntries: { name: string; content: string }[] = [];

      for (const item of selectedFiles) {
        if (item.type === 'file') {
          zipEntries.push({ name: item.name, content: item.content || '' });
        } else if (item.type === 'directory') {
          const dirCleanPath = resolveCleanPath(item.path);
          const children = allFiles.filter(f => {
            const fClean = resolveCleanPath(f.path);
            return fClean.startsWith(`${dirCleanPath}/`);
          });
          for (const child of children) {
            if (child.type === 'file') {
              const childClean = resolveCleanPath(child.path);
              const insidePath = childClean.slice(dirCleanPath.length + 1);
              zipEntries.push({ name: `${item.name}/${insidePath}`, content: child.content || '' });
            }
          }
        }
      }

      const blob = createZipArchive(zipEntries);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${account.username}-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Berhasil mendownload ${selectedFileIds.size} item sebagai arsip ZIP!`, 'success');
    } catch {
      showToast('Gagal memproses download arsip ZIP.', 'error');
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const handleBatchPermissionsSave = () => {
    if (selectedFileIds.size === 0) return;
    const selectedFiles = allFiles.filter(f => selectedFileIds.has(f.id));
    selectedFiles.forEach(f => {
      db.saveVirtualFile({
        ...f,
        permissions: batchPermValue,
        updatedAt: new Date().toISOString(),
      });
    });
    setShowBatchPermModal(false);
    setSelectedFileIds(new Set());
    pushVhostSyncNow();
    showToast(`Permissions berhasil diubah menjadi ${batchPermValue} untuk ${selectedFiles.length} item!`, 'success');
  };

  const pushVhostSyncNow = () => {
    try {
      const allAccounts = db.getHostingAccounts();
      const allSubdomains: Array<{ id: string; accountId: string; fullDomain: string; documentRoot: string }> = [];
      const filesByAccount: Record<string, unknown[]> = {};
      allAccounts.forEach(acc => {
        filesByAccount[acc.id] = db.getVirtualFiles(acc.id).slice(-180).map(f => {
          const isEntry = /\.(html?|php|css)$/i.test(f.name || '');
          return {
            ...f,
            content: !isEntry && f.content && f.content.length > 250000 ? undefined : f.content,
          };
        });
        const accDomains = db.getDomains(acc.id);
        accDomains.forEach(d => {
          if (d.type === 'primary' || d.domain.toLowerCase() === acc.primaryDomain.toLowerCase()) {
            return;
          }
          const subPrefix = d.subdomainPrefix || d.domain.split('.')[0];
          const cleanDocRoot = ('/' + (d.documentRoot || `/public_html/${subPrefix}`)
            .replace(/^\/home\/[^/]+/, '')
            .replace(/^\/+/, '')
            .replace(/\/+$/, '')) || `/public_html/${subPrefix}`;
          allSubdomains.push({
            id: d.id,
            accountId: acc.id,
            fullDomain: d.domain,
            documentRoot: cleanDocRoot,
          });
        });
      });
      const payload = JSON.stringify({
        accounts: allAccounts,
        subdomains: allSubdomains,
        filesByAccount,
        userInitiated: true,
      });
      fetch('/api/vhost/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).catch(() => {});
    } catch {
      // Ignore sync error
    }
  };

  const handleSaveFile = () => {
    if (!editingFile) return;
    const updated: VirtualFile = {
      ...editingFile,
      content: fileContent,
      sizeBytes: new Blob([fileContent]).size,
      updatedAt: new Date().toISOString(),
    };
    db.saveVirtualFile(updated);
    setFilesVersion(v => v + 1);
    pushVhostSyncNow();
    db.logAction(
      currentUser,
      'FILE_EDITED',
      'HOSTING',
      `Menyimpan perubahan file ${updated.path} pada akun ${account.primaryDomain}`
    );
    showToast('success', 'File Tersimpan', `Perubahan pada ${updated.name} berhasil disimpan & langsung tayang online.`);
    setEditingFile(null);
  };

  const handleCreateFile = () => {
    if (!newItemName.trim()) return;
    const cleanName = newItemName.trim();
    const filePath = `${currentPath}/${cleanName}`;

    const newFile: VirtualFile = {
      id: `vf-${Date.now()}`,
      accountId: account.id,
      path: filePath,
      name: cleanName,
      type: 'file',
      sizeBytes: 0,
      permissions: '0644',
      updatedAt: new Date().toISOString(),
      content: '/* File created via Cloud PRO File Manager */\n',
    };

    db.saveVirtualFile(newFile);
    setFilesVersion(v => v + 1);
    pushVhostSyncNow();
    db.logAction(currentUser, 'FILE_CREATED', 'HOSTING', `Membuat file ${filePath}`);
    showToast('success', 'File Dibuat', `File ${cleanName} siap diedit.`);
    setNewItemName('');
    setShowNewFileModal(false);
  };

  const handleCreateDir = () => {
    if (!newItemName.trim()) return;
    const cleanName = newItemName.trim();
    const dirPath = `${currentPath}/${cleanName}`;

    const newDir: VirtualFile = {
      id: `vf-${Date.now()}`,
      accountId: account.id,
      path: dirPath,
      name: cleanName,
      type: 'directory',
      sizeBytes: 4096,
      permissions: '0755',
      updatedAt: new Date().toISOString(),
    };

    db.saveVirtualFile(newDir);
    setFilesVersion(v => v + 1);
    pushVhostSyncNow();
    db.logAction(currentUser, 'DIRECTORY_CREATED', 'HOSTING', `Membuat direktori ${dirPath}`);
    showToast('success', 'Folder Dibuat', `Folder ${cleanName} berhasil dibuat.`);
    setNewItemName('');
    setShowNewDirModal(false);
  };

  const handleDeleteItem = (item: VirtualFile) => {
    confirmAction({
      title: 'Hapus File / Direktori',
      message: `Yakin ingin menghapus ${item.name}? Tindakan ini akan menghapus berkas secara permanen dari server Linux dan tidak dapat dibatalkan.`,
      confirmText: 'Hapus Permanen',
      isDanger: true,
      onConfirm: async () => {
        const cleanP = resolveCleanPath(item.path).toLowerCase();
        deletedPathsBlacklistRef.current.add(cleanP);
        if (item.type === 'directory') {
          allFiles.forEach(f => {
            const fp = resolveCleanPath(f.path).toLowerCase();
            if (fp.startsWith(cleanP + '/')) {
              deletedPathsBlacklistRef.current.add(fp);
            }
          });
        }
        db.deleteVirtualFile(item.id);
        setFilesVersion(v => v + 1);

        try {
          await fetch('/api/files/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId: account.id,
              path: item.path,
              id: item.id,
              isDir: item.type === 'directory',
            }),
          });
        } catch {}

        pushVhostSyncNow();
        db.logAction(currentUser, 'FILE_DELETED', 'HOSTING', `Menghapus permanen item ${item.path}`);
        showToast('info', 'Item Dihapus Permanen', `${item.name} berhasil dihapus dari server.`);
      },
    });
  };

  const handleDownloadFile = (item: VirtualFile) => {
    const element = document.createElement('a');
    let blob: Blob;
    if (item.content && item.content.startsWith('data:')) {
      // Data URL to blob
      const parts = item.content.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      blob = new Blob([uInt8Array], { type: contentType });
    } else {
      blob = new Blob([item.content || ''], { type: 'text/plain;charset=utf-8' });
    }
    element.href = URL.createObjectURL(blob);
    element.download = item.name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSavePerm = () => {
    if (!showPermModal) return;
    const updated = { ...showPermModal, permissions: newPermValue };
    db.saveVirtualFile(updated);
    showToast('success', 'Hak Akses Diperbarui', `Permission ${updated.name} diubah ke ${newPermValue}`);
    setShowPermModal(null);
  };

  const navigateUp = () => {
    const workspaceRoot = activeTarget?.docRoot || '/public_html';
    if (folderHistory.length > 0) {
      const prev = folderHistory[folderHistory.length - 1];
      setFolderHistory(h => h.slice(0, -1));
      setCurrentPath(prev);
      setSearchQuery('');
      return;
    }
    if (currentPath !== workspaceRoot && currentPath !== '/public_html' && currentPath !== '') {
      const lastSlash = currentPath.lastIndexOf('/');
      const up = currentPath.substring(0, lastSlash);
      const nextDir = !up || up === '/' || up === '/domains' ? workspaceRoot : up;
      setCurrentPath(nextDir);
      setSearchQuery('');
      return;
    }
    if (onBack) {
      onBack();
    }
  };

  const navigateParentFolder = () => {
    const workspaceRoot = activeTarget?.docRoot || '/public_html';
    if (currentPath === workspaceRoot || currentPath === '/public_html' || currentPath === '') return;
    const lastSlash = currentPath.lastIndexOf('/');
    const up = currentPath.substring(0, lastSlash);
    const nextDir = !up || up === '/' || up === '/domains' ? workspaceRoot : up;
    navigateToFolder(nextDir);
  };

  // ==========================================
  // SMART ZIP EXTRACTOR & FLATTENER ENGINE
  // ==========================================
  const normalizeZipEntries = (
    entries: Awaited<ReturnType<typeof extractZipArchive>>,
    shouldFlatten: boolean
  ) => {
    if (!shouldFlatten || entries.length === 0) return entries;
    const fileEntries = entries.filter(e => !e.isDir && e.path);
    if (fileEntries.length === 0) return entries;

    const hasTopLevelIndex = fileEntries.some(e => {
      const p = e.path.toLowerCase();
      return p === 'index.html' || p === 'index.htm' || p === 'index.php';
    });
    if (hasTopLevelIndex) return entries;

    const firstSegments = new Set(
      fileEntries.map(e => e.path.split('/').filter(Boolean)[0]).filter(Boolean)
    );
    if (firstSegments.size === 1) {
      const commonRoot = [...firstSegments][0];
      return entries
        .map(e => {
          const stripped = e.path.replace(new RegExp(`^${commonRoot}/?`), '');
          return {
            ...e,
            path: stripped,
            name: stripped.split('/').filter(Boolean).pop() || e.name,
          };
        })
        .filter(e => Boolean(e.path));
    }
    return entries;
  };

  // ==========================================
  // ZIP & FILE UPLOAD ENGINE
  // ==========================================
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: UploadQueueItem[] = Array.from(files).map(f => ({
      file: f,
      name: f.name,
      size: f.size,
      status: 'pending',
    }));
    setUploadQueue(prev => [...prev, ...newItems]);
    setShowUploadModal(true);
  };

  // Helper: Upload .ZIP in 5MB chunks & extract natively on Linux server + Auto-Purge .ZIP after extraction
  const uploadAndExtractZipOnServer = async (
    zipFileObj: File,
    targetDest: string,
    shouldFlatten: boolean,
    shouldClearIndex: boolean,
    shouldDeleteZip: boolean
  ): Promise<{ filesCount: number; message: string; zipPurged: boolean }> => {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk (safe for 200MB-500MB+ over Cloudflare Tunnel)
    const totalBytes = zipFileObj.size;
    const totalChunks = Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE));
    let serverFileName = zipFileObj.name;

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const start = chunkIdx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalBytes);
      const chunkBlob = zipFileObj.slice(start, end);

      const res = await fetch(
        `/api/backup/upload-chunk?fileName=${encodeURIComponent(
          zipFileObj.name
        )}&chunkIndex=${chunkIdx}&totalChunks=${totalChunks}&tempForRestore=1`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: chunkBlob,
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || `Gagal mengunggah bagian #${chunkIdx + 1}`);
      }
      if (data.fileName) serverFileName = data.fileName;
    }

    const extRes = await fetch('/api/files/extract-zip-server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.id,
        backupFileName: serverFileName,
        targetDir: targetDest,
        autoFlatten: shouldFlatten,
        clearOldIndex: shouldClearIndex,
        autoDeleteZip: shouldDeleteZip,
      }),
    });
    const extData = await extRes.json();
    if (!extRes.ok || !extData?.ok) {
      throw new Error(extData?.message || 'Gagal mengekstrak arsip .ZIP di server.');
    }

    // If autoDeleteZip is true, also ensure no virtual entry for the .zip remains in localStorage
    if (shouldDeleteZip) {
      const zipVirtualPath = `${targetDest}/${zipFileObj.name}`.replace(/\/+/g, '/');
      const existingZipEntry = db
        .getVirtualFiles(account.id)
        .find(f => resolveCleanPath(f.path).toLowerCase() === resolveCleanPath(zipVirtualPath).toLowerCase());
      if (existingZipEntry) {
        db.deleteVirtualFile(existingZipEntry.id);
      }
    }

    await syncFromDisk(targetDest, true);
    return {
      filesCount: extData.filesCount || 0,
      message: extData.message || 'Ekstraksi selesai!',
      zipPurged: Boolean(extData.zipPurged),
    };
  };

  const handleProcessUploadQueue = async () => {
    if (uploadQueue.length === 0) return;
    setIsUploading(true);

    let uploadedCount = 0;
    let totalExtractedFiles = 0;
    let anyZipPurged = false;

    for (let i = 0; i < uploadQueue.length; i++) {
      const item = uploadQueue[i];
      if (item.status === 'done') continue;

      setUploadQueue(prev =>
        prev.map((q, idx) => (idx === i ? { ...q, status: 'processing' } : q))
      );

      try {
        const isZip = item.name.toLowerCase().endsWith('.zip');
        const filePath = `${currentPath}/${item.name}`.replace(/\/+/g, '/');

        if (isZip && autoExtractZip) {
          // Use High-Capacity Chunked Upload + Linux Native Server Extractor + Auto-Purge .ZIP!
          const srvResult = await uploadAndExtractZipOnServer(
            item.file,
            currentPath,
            true,
            false,
            autoDeleteZipAfterExtract
          );
          totalExtractedFiles += srvResult.filesCount;
          if (srvResult.zipPurged) anyZipPurged = true;
          setUploadQueue(prev =>
            prev.map((q, idx) =>
              idx === i
                ? { ...q, status: 'done', extractedCount: srvResult.filesCount }
                : q
            )
          );
          continue;
        }

        const ext = item.name.split('.').pop()?.toLowerCase() || '';
        const isTextFile = [
          'php', 'html', 'htm', 'js', 'css', 'json', 'sql', 'txt', 'htaccess',
          'env', 'md', 'xml', 'svg', 'yaml', 'yml', 'ini', 'sh', 'conf'
        ].includes(ext);

        let rawContent = '';
        if (isTextFile) {
          rawContent = await item.file.text();
        } else {
          rawContent = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(item.file);
          });
        }

        const existingArchive = allFiles.find(f => resolveCleanPath(f.path) === filePath);
        if (!existingArchive || overwriteExisting) {
          db.saveVirtualFile({
            id: existingArchive ? existingArchive.id : `vf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            accountId: account.id,
            path: filePath,
            name: item.name,
            type: 'file',
            sizeBytes: item.size,
            permissions: '0644',
            updatedAt: new Date().toISOString(),
            content: rawContent,
          });
          uploadedCount++;
        }

        setUploadQueue(prev =>
          prev.map((q, idx) => (idx === i ? { ...q, status: 'done' } : q))
        );
      } catch (err: any) {
        setUploadQueue(prev =>
          prev.map((q, idx) =>
            idx === i
              ? { ...q, status: 'error', errorMessage: err?.message || 'Gagal memproses file' }
              : q
          )
        );
      }
    }

    setIsUploading(false);
    pushVhostSyncNow();
    db.syncToServerVault(true).catch(() => {});
    db.logAction(
      currentUser,
      'FILES_UPLOADED',
      'HOSTING',
      `Upload file ke ${currentPath} akun ${account.primaryDomain}`
    );

    const purgeNote = anyZipPurged ? ' (File mentah .ZIP otomatis dibuang dari disk setelah diekstrak)' : '';
    const summaryMsg =
      totalExtractedFiles > 0
        ? `Berhasil mengupload arsip ZIP dan mengekstrak ${totalExtractedFiles} file/folder website ke ${currentPath}!${purgeNote}`
        : `Berhasil mengupload ${uploadedCount} file website ke ${currentPath}!`;

    showToast('success', 'Upload Selesai', summaryMsg);
  };

  // Direct 1-Click ZIP extraction from the file list or modal
  const handleExtractExistingZip = async (
    zipFile: VirtualFile,
    targetDestination = currentPath,
    shouldFlatten = true,
    shouldClearIndex = false
  ) => {
    setIsExtractingFileId(zipFile.id);
    try {
      // First try server-side native extraction (works for 200MB+ physical ZIP files on disk & auto-purges the .zip!)
      const srvRes = await fetch('/api/files/extract-zip-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          zipPath: zipFile.path,
          targetDir: targetDestination,
          autoFlatten: shouldFlatten,
          clearOldIndex: shouldClearIndex,
          autoDeleteZip: autoDeleteZipAfterExtract,
        }),
      });
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        if (srvData?.ok) {
          if (autoDeleteZipAfterExtract) {
            db.deleteVirtualFile(zipFile.id);
          }
          await syncFromDisk(targetDestination, true);
          showToast(
            'success',
            'Ekstraksi ZIP Berhasil!',
            srvData.message || `Berhasil mengekstrak ${zipFile.name} ke ${targetDestination}!`
          );
          setIsExtractingFileId(null);
          return;
        }
      }

      if (shouldClearIndex) {
        db.clearDirectoryEntryFiles(account.id, targetDestination);
      }

      if (!zipFile.content) {
        // If legacy placeholder zip without binary content, open the ZIP extractor modal so user can select the local zip file
        setSelectedZipFileId(zipFile.id);
        setExtractTargetDir(targetDestination);
        setShowZipExtractModal(true);
        showToast(
          'info',
          'Pilih File ZIP Sumber',
          `Silakan pilih file ${zipFile.name} dari komputer/HP Anda untuk diekstrak ke ${targetDestination}.`
        );
        setIsExtractingFileId(null);
        return;
      }

      let zipBuffer: ArrayBuffer;
      if (zipFile.content.startsWith('data:')) {
        const base64 = zipFile.content.split(';base64,')[1];
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        zipBuffer = bytes.buffer;
      } else {
        const encoder = new TextEncoder();
        zipBuffer = encoder.encode(zipFile.content).buffer;
      }

      const rawEntries = await extractZipArchive(zipBuffer);
      const unzippedEntries = normalizeZipEntries(rawEntries, shouldFlatten);
      let count = 0;

      for (const entry of unzippedEntries) {
        const cleanRelPath = entry.path;
        if (!cleanRelPath) continue;

        const fullDestPath = `${targetDestination}/${cleanRelPath}`.replace(/\/+/g, '/');
        const entryName = entry.name;

        if (entry.isDir) {
          db.saveVirtualFile({
            id: `vf-dir-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            accountId: account.id,
            path: fullDestPath.endsWith('/') ? fullDestPath.slice(0, -1) : fullDestPath,
            name: entryName,
            type: 'directory',
            sizeBytes: 4096,
            permissions: '0755',
            updatedAt: new Date().toISOString(),
          });
        } else {
          db.saveVirtualFile({
            id: `vf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            accountId: account.id,
            path: fullDestPath,
            name: entryName,
            type: 'file',
            sizeBytes: entry.uncompressedSize || entry.content.length,
            permissions: '0644',
            updatedAt: new Date().toISOString(),
            content: entry.content,
          });
          count++;
        }
      }

      if (autoDeleteZipAfterExtract) {
        db.deleteVirtualFile(zipFile.id);
      }

      pushVhostSyncNow();
      db.syncToServerVault(true).catch(() => {});
      showToast(
        'success',
        'Ekstraksi ZIP Berhasil!',
        `Berhasil mengekstrak ${count} file dari ${zipFile.name} ke direktori ${targetDestination}!${
          autoDeleteZipAfterExtract ? ' (File .ZIP otomatis dibuang)' : ''
        }`
      );
    } catch (err: any) {
      showToast('error', 'Ekstraksi Gagal', err?.message || 'Gagal mengekstrak archive zip.');
    } finally {
      setIsExtractingFileId(null);
    }
  };

  const handleExecuteZipModalExtract = async () => {
    setIsRunningZipModalExtract(true);
    try {
      const targetDest = (extractTargetDir || currentPath).trim() || '/public_html';
      if (directZipFile) {
        const srvRes = await uploadAndExtractZipOnServer(
          directZipFile,
          targetDest,
          flattenZipRoot,
          clearOldIndexOnExtract,
          autoDeleteZipAfterExtract
        );
        showToast('success', 'Ekstrak ZIP Selesai', srvRes.message);
        setDirectZipFile(null);
        setShowZipExtractModal(false);
        return;
      }

      const targetZip = allFiles.find(f => f.id === selectedZipFileId);
      if (!targetZip) {
        showToast('warning', 'Pilih File ZIP', 'Pilih file .ZIP dari daftar atau unggah file .ZIP dari perangkat Anda.');
        return;
      }

      await handleExtractExistingZip(targetZip, targetDest, flattenZipRoot, clearOldIndexOnExtract);
      setShowZipExtractModal(false);
    } finally {
      setIsRunningZipModalExtract(false);
    }
  };

  return (
    <div
      className="space-y-4 max-w-full overflow-x-hidden w-full min-w-0"
      onDragOver={e => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={e => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFilesSelected(e.dataTransfer.files);
        }
      }}
    >
      {/* File Manager Action Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900 max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <button
            type="button"
            onClick={navigateUp}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer shadow-2xs transition-colors shrink-0"
            title={
              folderHistory.length > 0 || currentPath !== activeTarget.docRoot
                ? 'Kembali ke folder sebelumnya'
                : 'Kembali ke halaman sebelumnya'
            }
          >
            <ArrowLeft className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span>
              {folderHistory.length > 0 || currentPath !== activeTarget.docRoot
                ? 'Kembali'
                : 'Kembali ke Panel'}
            </span>
          </button>

          {currentPath !== activeTarget.docRoot && (
            <button
              type="button"
              onClick={navigateParentFolder}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer transition-colors shrink-0"
              title="Naik 1 level folder"
            >
              <span>↑ Folder Atas</span>
            </button>
          )}

          <div className="flex flex-wrap items-center gap-1 font-mono text-xs text-slate-700 dark:text-slate-300 min-w-0 max-w-full break-all">
            <button
              type="button"
              onClick={() => navigateToFolder(activeTarget.docRoot)}
              className="text-slate-400 hover:text-sky-600 cursor-pointer transition-colors"
              title={`Ke Root ${activeTarget.name}`}
            >
              /home/{account.username}
            </button>
            {currentPath
              .split('/')
              .filter(Boolean)
              .map((seg, idx, arr) => {
                const targetSegPath = '/' + arr.slice(0, idx + 1).join('/');
                // If viewing a subdomain, clicking /public_html should go to the subdomain root instead of primary domain
                const clickPath =
                  activeTarget.type !== 'primary' && targetSegPath === '/public_html'
                    ? activeTarget.docRoot
                    : targetSegPath;
                return (
                  <React.Fragment key={targetSegPath}>
                    <span className="text-slate-400">/</span>
                    <button
                      type="button"
                      onClick={() => navigateToFolder(clickPath)}
                      className={`cursor-pointer hover:underline ${
                        idx === arr.length - 1
                          ? 'font-bold text-sky-600 dark:text-sky-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {seg}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>
        </div>

        {/* Action Buttons: Upload Website, New File, New Folder, Sync Disk, Preview */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={e => handleFilesSelected(e.target.files)}
            multiple
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs cursor-pointer transition-all hover:shadow-emerald-500/20"
          >
            <Upload className="h-4 w-4" />
            <span>Upload File Website</span>
          </button>

          <button
            onClick={() => setShowNewFileModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer transition-colors"
          >
            <FilePlus className="h-3.5 w-3.5 text-sky-500" />
            <span>File Baru</span>
          </button>

          <button
            onClick={() => setShowNewDirModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5 text-amber-500" />
            <span>Folder Baru</span>
          </button>

          <button
            onClick={() => syncFromDisk(currentPath, true)}
            disabled={isDiskScanning}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer transition-colors"
            title="Pindai dan sinkronkan file yang tersimpan di disk server ke File Manager"
          >
            {isDiskScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" /> : <RefreshCw className="h-3.5 w-3.5 text-sky-500" />}
            <span>Sinkron Disk</span>
          </button>

          <button
            onClick={handleCleanDiskJunk}
            disabled={isCleaningDisk}
            className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 shadow-2xs cursor-pointer transition-colors"
            title="Bersihkan file sampah sisa instalasi lama, chunk duplikat, dan cache tanpa mengganggu website aktif"
          >
            {isCleaningDisk ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" /> : <Trash2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
            <span>Bersihkan Sampah Disk</span>
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-500 shadow-2xs cursor-pointer transition-all"
            title="Live Preview Website"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Preview Website</span>
          </button>
        </div>
      </div>

      {/* Domain & Subdomain Storage Workspace Selector (Minimalis & Elegan Tanpa Slide) */}
      {(() => {
        const handleSwitchTarget = (targetDocRoot: string) => {
          setFolderHistory([]);
          setCurrentPath(resolveCleanPath(targetDocRoot));
          setSearchQuery('');
        };

        return (
          <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-sky-500/5 via-indigo-500/5 to-slate-50 dark:border-slate-800 dark:from-sky-950/20 dark:via-indigo-950/20 dark:to-slate-900/40 p-3.5 shadow-2xs max-w-full min-w-0 overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0 max-w-full overflow-hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shrink-0">
                  <Globe className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 shrink-0">
                      Workspace File Manager:
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 text-xs font-bold text-sky-700 dark:text-sky-300 truncate max-w-xs">
                      🌐 {activeTarget.name}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 truncate max-w-xs">
                      📂 {activeTarget.docRoot}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Ruang file domain utama &amp; subdomain terpisah penuh (folder subdomain tidak tercampur di domain utama).
                  </p>
                </div>
              </div>

              {/* Fast Domain Switcher Dropdown */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 max-w-full">
                <select
                  value={activeTarget.id}
                  onChange={e => {
                    const chosen = allDomainTargets.find(t => t.id === e.target.value);
                    if (chosen) handleSwitchTarget(chosen.docRoot);
                  }}
                  className="w-full sm:w-64 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-800 dark:text-slate-200 shadow-2xs focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer truncate"
                >
                  {allDomainTargets.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.type === 'primary' ? '🌐 ' : '📁 '} {t.label} ({t.docRoot})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowDirectoryTree(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 cursor-pointer ${
                    showDirectoryTree
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                  }`}
                  title="Tampilkan struktur lengkap /home, public_html, httpdocs, dan seluruh folder domain/subdomain"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Peta Folder /home &amp; httpdocs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title="Lihat live preview website domain ini"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Expandable Full Server Directory Map (/home, public_html, httpdocs, subdomains, system dirs) */}
            {showDirectoryTree && (
              <div className="mt-3.5 pt-3.5 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Struktur Direktori Root Server (`/home/{account.username}`)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Menampilkan pemetaan lengkap <code>/home</code>, <code>public_html</code>, <code>httpdocs</code>, serta seluruh folder mandiri per Domain Utama &amp; Subdomain.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      🏠 /home/{account.username}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      🌐 public_html ⇄ httpdocs
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      📑 {allDomainTargets.length} Workspace Domain/Subdomain
                    </span>
                  </div>
                </div>

                {/* Grid of All Domain & Subdomain Folders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {allDomainTargets.map(target => {
                    const targetClean = target.docRoot.toLowerCase();
                    const domainFiles = allFiles.filter(f => {
                      const fp = resolveCleanPath(f.path).toLowerCase();
                      if (fp === targetClean) return false;
                      if (targetClean === '/public_html') {
                        if (isolatedSubdomainRoots.has(fp)) return false;
                        for (const sr of isolatedSubdomainRoots) {
                          if (fp.startsWith(sr + '/')) return false;
                        }
                        return fp.startsWith('/public_html/');
                      }
                      return fp.startsWith(targetClean + '/');
                    });
                    const hasIndex = domainFiles.some(
                      f =>
                        f.type === 'file' &&
                        (f.name.toLowerCase() === 'index.html' ||
                          f.name.toLowerCase() === 'index.php' ||
                          f.name.toLowerCase() === 'index.htm')
                    );
                    const isSelected = activeTarget.id === target.id;
                    const pleskAlias =
                      target.type === 'primary'
                        ? `/home/${account.username}/httpdocs`
                        : `/home/${account.username}/subdomains/${target.name.split('.')[0]}/httpdocs`;

                    return (
                      <div
                        key={target.id}
                        className={`rounded-xl border p-3 transition-all ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50/70 dark:border-sky-500/80 dark:bg-sky-950/30 shadow-2xs'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {target.type === 'primary' ? '🌐 ' : '📁 '}
                                {target.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  target.type === 'primary'
                                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300'
                                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                                }`}
                              >
                                {target.type === 'primary' ? 'Domain Utama' : 'Subdomain'}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                  hasIndex
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                                }`}
                              >
                                {hasIndex ? '● Live Ready' : '○ Belum Ada Index'}
                              </span>
                            </div>
                            <div className="mt-1 space-y-0.5 font-mono text-[10.5px] text-slate-500 dark:text-slate-400">
                              <div>
                                cPanel Root: <strong className="text-slate-700 dark:text-slate-200">/home/{account.username}{target.docRoot}</strong>
                              </div>
                              <div>
                                Plesk Alias: <span className="text-slate-600 dark:text-slate-300">{pleskAlias}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="inline-block rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                              {domainFiles.length} Item
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleSwitchTarget(target.docRoot)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-sky-600 text-white'
                                : 'bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {isSelected ? '✓ Sedang Dibuka' : '📂 Buka Folder Ini'}
                          </button>

                          {domainFiles.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                confirmAction({
                                  title: `Kosongkan Folder ${target.name}`,
                                  message: `Yakin ingin menghapus seluruh ${domainFiles.length} berkas di dalam ${target.name} (${target.docRoot}) agar siap dikloning ulang dari nol? Domain/subdomain lain TIDAK akan terpengaruh.`,
                                  confirmText: `Ya, Kosongkan ${domainFiles.length} Item`,
                                  isDanger: true,
                                  onConfirm: async () => {
                                    domainFiles.forEach(item => {
                                      deletedPathsBlacklistRef.current.add(resolveCleanPath(item.path).toLowerCase());
                                    });
                                    db.deleteVirtualFilesBatch(domainFiles.map(f => f.id));
                                    setFilesVersion(v => v + 1);
                                    try {
                                      await fetch('/api/files/batch-delete', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          accountId: account.id,
                                          items: domainFiles.map(i => ({
                                            id: i.id,
                                            path: i.path,
                                            type: i.type,
                                          })),
                                        }),
                                      });
                                    } catch {}
                                    pushVhostSyncNow();
                                    showToast(
                                      'success',
                                      'Folder Berhasil Dikosongkan',
                                      `Seluruh berkas di ${target.name} (${target.docRoot}) telah bersih dan siap dikloning ulang.`
                                    );
                                  },
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 cursor-pointer transition-colors"
                            >
                              🗑️ Kosongkan Folder ({domainFiles.length})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Drag & Drop Visual Indicator Banner */}
      {isDragging && (
        <div className="rounded-2xl border-2 border-dashed border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/40 p-6 text-center animate-pulse">
          <Upload className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
          <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
            Lepaskan file atau ZIP website di sini
          </h4>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
            File akan diupload langsung ke {currentPath}
          </p>
        </div>
      )}

      {/* Directory Content Table & Search Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Table Top Filter & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 p-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <FolderOpen className="h-4 w-4 text-sky-500" />
            <span>Total Item: <strong>{currentItems.length}</strong></span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari file dalam direktori..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Batch Action Toolbar */}
        {selectedFileIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-sky-50 px-4 py-2.5 border-b border-sky-100 text-xs text-sky-900 dark:bg-sky-950/60 dark:border-sky-900/60 dark:text-sky-200">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white">
                {selectedFileIds.size}
              </span>
              <span className="font-semibold">Item Terpilih</span>
              <button
                onClick={() => setSelectedFileIds(new Set())}
                className="text-[11px] text-sky-600 hover:text-sky-800 underline dark:text-sky-400 cursor-pointer ml-1"
              >
                Batal Pilih
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchDownloadZip}
                disabled={isBatchDownloading}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Download semua file terpilih sebagai arsip ZIP"
              >
                {isBatchDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-sky-600" />
                )}
                <span>Download ZIP ({selectedFileIds.size})</span>
              </button>
              <button
                onClick={() => setShowBatchPermModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Ubah hak akses CHMOD file/folder terpilih"
              >
                <Edit className="h-3.5 w-3.5 text-amber-600" />
                <span>Ubah Permissions</span>
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700 cursor-pointer"
                title="Hapus permanen semua item terpilih"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hapus ({selectedFileIds.size})</span>
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[550px]">
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={filteredItems.length > 0 && selectedFileIds.size === filteredItems.length}
                  ref={el => {
                    if (el) {
                      el.indeterminate = selectedFileIds.size > 0 && selectedFileIds.size < filteredItems.length;
                    }
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer dark:border-slate-600 dark:bg-slate-700"
                  title={selectedFileIds.size === filteredItems.length ? 'Batalkan pilihan semua' : 'Pilih semua file'}
                />
              </th>
              <th className="px-5 py-3">Nama File / Folder</th>
              <th className="px-5 py-3">Ukuran</th>
              <th className="px-5 py-3">Permissions</th>
              <th className="px-5 py-3">Terakhir Dimodifikasi</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-sans text-xs">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                    <FolderOpen className="h-6 w-6" />
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    {searchQuery ? 'Tidak ada file yang cocok dengan pencarian.' : 'Direktori ini masih kosong.'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                    Klik tombol <strong>Upload File Website</strong> atau tarik file/ZIP ke area ini untuk memasang website Anda.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => syncFromDisk(currentPath, true)}
                      disabled={isDiskScanning}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
                    >
                      {isDiskScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 text-sky-500" />}
                      <span>{isDiskScanning ? 'Memindai Disk Server...' : '🔄 Sinkronkan File dari Disk Server'}</span>
                    </button>

                    {currentPath.includes('siakad') && (
                      <button
                        type="button"
                        onClick={handleQuickPullSiakad}
                        disabled={isQuickPulling}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs cursor-pointer transition-all hover:shadow-emerald-500/25"
                      >
                        {isQuickPulling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                        <span>{isQuickPulling ? 'Sedang Mentransfer (Server-to-Server)...' : '⚡ Tarik & Ekstrak Siakad (212 MB) Otomatis'}</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map(item => {
                const isZip = item.name.toLowerCase().endsWith('.zip');
                const isSelected = selectedFileIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-50/80 dark:bg-sky-950/40 border-l-2 border-sky-500'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                    onClick={() => handleOpenFile(item)}
                  >
                    <td className="w-10 px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => toggleSelectFile(item.id, e)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer dark:border-slate-600 dark:bg-slate-700"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        {item.type === 'directory' ? (
                          <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                        ) : isZip ? (
                          <FileArchive className="h-4 w-4 text-purple-500 shrink-0" />
                        ) : item.name.endsWith('.php') || item.name.endsWith('.js') ? (
                          <FileCode className="h-4 w-4 text-sky-500 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {item.type === 'directory' ? 'DIR' : `${(item.sizeBytes / 1024).toFixed(1)} KB`}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setShowPermModal(item);
                          setNewPermValue(item.permissions);
                        }}
                        className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 shadow-2xs"
                      >
                        {item.permissions}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-[11px]">
                      {new Date(item.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1-Click ZIP Extractor */}
                        {isZip && (
                          <button
                            onClick={() => handleExtractExistingZip(item)}
                            disabled={isExtractingFileId === item.id}
                            className="flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 shadow-2xs cursor-pointer"
                            title="Ekstrak ZIP ke folder saat ini"
                          >
                            {isExtractingFileId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Archive className="h-3 w-3" />
                            )}
                            <span>Ekstrak</span>
                          </button>
                        )}

                        {/* Edit Code button for text files */}
                        {item.type === 'file' && (
                          <button
                            onClick={() => handleOpenFile(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600 dark:hover:bg-slate-800 shadow-2xs"
                            title="Edit Kode"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Download button */}
                        {item.type === 'file' && (
                          <button
                            onClick={() => handleDownloadFile(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 shadow-2xs"
                            title="Unduh File"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 shadow-2xs"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Upload Website & Files Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Upload File Website & ZIP
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Target Direktori: {currentPath}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isUploading) {
                    setShowUploadModal(false);
                    setUploadQueue([]);
                  }
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Target Domain & Directory Selector */}
            <div className="mt-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-sky-500" />
                <span>Domain / Subdomain Tujuan Unggah:</span>
              </label>
              <select
                value={currentPath}
                onChange={e => setCurrentPath(e.target.value)}
                disabled={isUploading}
                className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="/public_html">🌐 Domain Utama: {account.primaryDomain} (/public_html)</option>
                {db.getDomains(account.id).filter(d => d.type === 'subdomain').map(s => {
                  const cleanDoc = resolveCleanPath(s.documentRoot || `/public_html/${s.subdomainPrefix || s.domain.split('.')[0]}`);
                  return (
                    <option key={s.id} value={cleanDoc}>
                      📁 Subdomain: {s.domain} ({cleanDoc})
                    </option>
                  );
                })}
                {db.getDomains(account.id).filter(d => d.type === 'addon').map(a => {
                  const cleanDoc = resolveCleanPath(a.documentRoot || `/${a.domain}`);
                  return (
                    <option key={a.id} value={cleanDoc}>
                      🌐 Addon: {a.domain} ({cleanDoc})
                    </option>
                  );
                })}
                {currentPath !== '/public_html' && !db.getDomains(account.id).some(d => resolveCleanPath(d.documentRoot) === currentPath) && (
                  <option value={currentPath}>📂 Folder Aktif Saat Ini: {currentPath}</option>
                )}
              </select>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Berkas web yang diunggah akan otomatis disimpan langsung di direktori domain terpilih di atas.
              </p>
            </div>

            {/* Drag & Drop File Selector Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center hover:border-emerald-500 hover:bg-emerald-50/20 dark:border-slate-700 dark:bg-slate-800/40 cursor-pointer transition-all"
            >
              <Upload className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Klik untuk memilih file atau tarik file ke sini
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Mendukung file .zip (WordPress, RDM, HTML Template), script .php, .html, database .sql, aset gambar, dll.
              </p>
            </div>

            {/* Options Checkboxes */}
            <div className="mt-4 space-y-2 bg-slate-50 p-3 rounded-xl dark:bg-slate-800/50 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={autoExtractZip}
                  onChange={e => setAutoExtractZip(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Ekstrak otomatis arsip file <strong>.ZIP</strong> (hingga 200MB–500MB+) ke direktori ini</span>
              </label>
              {autoExtractZip && (
                <label className="flex items-center gap-2 cursor-pointer text-emerald-700 dark:text-emerald-300 font-semibold pl-5">
                  <input
                    type="checkbox"
                    checked={autoDeleteZipAfterExtract}
                    onChange={e => setAutoDeleteZipAfterExtract(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Otomatis buang/hapus file mentah .ZIP setelah data selesai diekstrak (Hemat Disk)</span>
                </label>
              )}
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={e => setOverwriteExisting(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Timpa (overwrite) file yang sudah ada jika namanya sama</span>
              </label>
            </div>

            {/* Queue List */}
            {uploadQueue.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto space-y-1.5 pr-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Daftar File ({uploadQueue.length}):
                </p>
                {uploadQueue.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex items-center gap-2 truncate max-w-xs">
                      {item.name.endsWith('.zip') ? (
                        <FileArchive className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate text-slate-800 dark:text-slate-200">{item.name}</span>
                      <span className="text-[10px] text-slate-400">
                        ({(item.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {item.status === 'pending' && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full dark:bg-slate-700">
                          Siap
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span className="flex items-center gap-1 text-[10px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full dark:bg-sky-950 dark:text-sky-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Memproses...
                        </span>
                      )}
                      {item.status === 'done' && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-950 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="h-3 w-3" />
                          {item.extractedCount ? `Terekstrak (${item.extractedCount} file)` : 'Selesai'}
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="flex items-center gap-1 text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full dark:bg-rose-950 dark:text-rose-400">
                          <AlertCircle className="h-3 w-3" />
                          Gagal
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadQueue([]);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {uploadQueue.some(q => q.status === 'done') ? 'Tutup' : 'Batal'}
              </button>

              <button
                type="button"
                disabled={isUploading || uploadQueue.length === 0}
                onClick={handleProcessUploadQueue}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Mengupload...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Mulai Upload ({uploadQueue.filter(q => q.status !== 'done').length} File)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Editor Modal */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setEditingFile(null)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer shrink-0 transition-colors"
                  title="Kembali ke File Manager"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-sky-400" />
                  <span>Kembali</span>
                </button>
                <FileCode className="h-4 w-4 text-sky-400 shrink-0" />
                <span className="font-mono text-xs font-bold text-white truncate">
                  {editingFile.path}
                </span>
                <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">
                  ({editingFile.permissions})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveFile}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
                <button
                  onClick={() => setEditingFile(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 p-4">
              <textarea
                value={fileContent}
                onChange={e => setFileContent(e.target.value)}
                spellCheck={false}
                className="h-full w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200 outline-hidden focus:border-sky-500 scrollbar-thin"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 px-6 py-2.5 font-mono text-[11px] text-slate-400">
              <span>Lines: {fileContent.split('\n').length} &bull; Chars: {fileContent.length}</span>
              <span>Encoding: UTF-8 &bull; LF</span>
            </div>
          </div>
        </div>
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Buat File Baru
            </h3>
            <p className="mt-1 text-xs text-slate-400 font-mono">
              Lokasi: {currentPath}/
            </p>
            <input
              type="text"
              placeholder="contoh: index.php, config.php, robots.txt, .htaccess"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="rounded-xl border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleCreateFile}
                className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
              >
                Buat File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Directory Modal */}
      {showNewDirModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Buat Folder Direktori Baru
            </h3>
            <p className="mt-1 text-xs text-slate-400 font-mono">
              Lokasi: {currentPath}/
            </p>
            <input
              type="text"
              placeholder="contoh: assets, wp-content, uploads, includes"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowNewDirModal(false)}
                className="rounded-xl border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleCreateDir}
                className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
              >
                Buat Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Ubah Permission (chmod)
            </h3>
            <p className="mt-1 text-xs text-slate-400 font-mono">
              {showPermModal.name}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {['0644', '0755', '0600', '0777'].map(perm => (
                <button
                  key={perm}
                  type="button"
                  onClick={() => setNewPermValue(perm)}
                  className={`rounded-xl border py-2 font-mono text-xs font-semibold ${
                    newPermValue === perm
                      ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-950 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {perm}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowPermModal(null)}
                className="rounded-xl border px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleSavePerm}
                className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: Dedicated ZIP Archive Extractor (Ekstrak File .ZIP di File Manager) */}
      {/* ========================================================================= */}
      {showZipExtractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                  <FileArchive className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Ekstrak Arsip File .ZIP Website
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Unpack otomatis ke direktori Virtual Host
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isRunningZipModalExtract && setShowZipExtractModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <input
                type="file"
                ref={zipExtractInputRef}
                accept=".zip,application/zip"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setDirectZipFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              {/* Option A: Select existing ZIP file in File Manager */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Pilih File .ZIP yang Ada di File Manager:
                </label>
                <select
                  value={selectedZipFileId}
                  onChange={e => {
                    setSelectedZipFileId(e.target.value);
                    setDirectZipFile(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">-- Pilih Arsip .ZIP di Akun Ini --</option>
                  {allFiles
                    .filter(f => f.name.toLowerCase().endsWith('.zip'))
                    .map(zf => (
                      <option key={zf.id} value={zf.id}>
                        {zf.name} ({zf.path} — {(zf.sizeBytes / 1024).toFixed(1)} KB)
                      </option>
                    ))}
                </select>
              </div>

              {/* Option B: Or upload & extract a local .ZIP directly */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Atau Pilih File .ZIP Langsung dari Perangkat Anda (Komputer / HP):
                </label>
                <div
                  onClick={() => zipExtractInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/40 p-4 text-center hover:border-purple-500 hover:bg-purple-50/80 cursor-pointer transition-all dark:border-purple-800 dark:bg-purple-950/20"
                >
                  <Archive className="mx-auto h-6 w-6 text-purple-600 mb-1" />
                  <p className="font-bold text-slate-800 dark:text-white">
                    {directZipFile
                      ? `Terpilih: ${directZipFile.name} (${(directZipFile.size / 1024).toFixed(1)} KB)`
                      : 'Klik untuk memilih file .ZIP dari perangkat Anda'}
                  </p>
                </div>
              </div>

              {/* Target Directory */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Direktori Tujuan Ekstraksi (Target Domain):</span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">Pilih domain di bawah</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setExtractTargetDir('/public_html')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      extractTargetDir === '/public_html'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    🌐 Domain Utama (/public_html)
                  </button>
                  {db.getDomains(account.id).filter(d => d.type === 'subdomain').map(s => {
                    const cleanDoc = resolveCleanPath(s.documentRoot || `/public_html/${s.subdomainPrefix || s.domain.split('.')[0]}`);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setExtractTargetDir(cleanDoc)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          extractTargetDir === cleanDoc
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        📁 {s.domain}
                      </button>
                    );
                  })}
                  {currentPath !== '/public_html' && (
                    <button
                      type="button"
                      onClick={() => setExtractTargetDir(currentPath)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        extractTargetDir === currentPath
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      📂 Folder Aktif ({currentPath})
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={extractTargetDir}
                  onChange={e => setExtractTargetDir(e.target.value)}
                  placeholder="/public_html"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Extraction Options */}
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={flattenZipRoot}
                    onChange={e => setFlattenZipRoot(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Otomatis keluarkan isi folder utama jika ZIP dibungkus 1 folder luar (Auto-Flatten)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={clearOldIndexOnExtract}
                    onChange={e => setClearOldIndexOnExtract(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Hapus <code>index.html</code> / <code>index.php</code> lama di folder tujuan sebelum ekstrak</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-700 dark:text-emerald-300 pt-1">
                  <input
                    type="checkbox"
                    checked={autoDeleteZipAfterExtract}
                    onChange={e => setAutoDeleteZipAfterExtract(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Otomatis buang/hapus file mentah .ZIP setelah seluruh data selesai diekstrak (Hemat Disk)</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowZipExtractModal(false)}
                disabled={isRunningZipModalExtract}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteZipModalExtract}
                disabled={isRunningZipModalExtract}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isRunningZipModalExtract ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                <span>{isRunningZipModalExtract ? 'Mengekstrak...' : 'Ekstrak ZIP Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Permissions Modal */}
      {showBatchPermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Ubah Permissions Massal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Ubah hak akses CHMOD untuk <strong>{selectedFileIds.size}</strong> item yang dipilih secara bersamaan.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nilai Permissions (Oktal)
                </label>
                <input
                  type="text"
                  value={batchPermValue}
                  onChange={e => setBatchPermValue(e.target.value)}
                  placeholder="0644 atau 0755"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBatchPermValue('0644')}
                  className="flex-1 rounded-lg bg-slate-100 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  0644 (File Web)
                </button>
                <button
                  type="button"
                  onClick={() => setBatchPermValue('0755')}
                  className="flex-1 rounded-lg bg-slate-100 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  0755 (Folder / Skrip)
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBatchPermModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBatchPermissionsSave}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 cursor-pointer"
              >
                Terapkan ke {selectedFileIds.size} Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Built-in Virtual Host Live Preview Modal */}
      <WebsitePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        account={account}
        initialDomain={activeTarget.name}
        initialDocRoot={activeTarget.docRoot}
      />
    </div>
  );
};
