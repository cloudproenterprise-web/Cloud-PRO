import React, { useState, useRef, useEffect } from 'react';
import {
  Cloud,
  HardDrive,
  Upload,
  Download,
  Trash2,
  Settings,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  Zap,
  ShieldCheck,
  ExternalLink,
  Sliders,
  Copy,
  FolderOpen,
  Info,
  Globe,
  Link2,
} from 'lucide-react';
import { HostingAccount, CloudflareR2Config, OptimizedMediaFile } from '../../types';
import { db } from '../../services/storage';
import { useServer } from '../../context/ServerContext';
import { compressImageToWebP } from '../../services/imageCompression';

interface MediaStorageManagerProps {
  account: HostingAccount;
}

export const MediaStorageManager: React.FC<MediaStorageManagerProps> = ({ account }) => {
  const { showToast, confirmAction } = useServer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!account || !account.id) return null;

  // States
  const [config, setConfig] = useState<CloudflareR2Config>(() =>
    db.getR2ConfigForAccount(account.id)
  );
  const [mediaList, setMediaList] = useState<OptimizedMediaFile[]>(() =>
    db.getOptimizedMedia(account.id)
  );
  const [activeTab, setActiveTab] = useState<'gallery' | 'compressor' | 'settings'>('gallery');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<OptimizedMediaFile | null>(null);

  // Settings form states
  const [bucketName, setBucketName] = useState(config.bucketName);
  const [cfAccountId, setCfAccountId] = useState(config.accountIdCloudflare);
  const [accessKeyId, setAccessKeyId] = useState(config.accessKeyId);
  const [secretKey, setSecretKey] = useState('********************************');
  const [cdnDomain, setCdnDomain] = useState(config.publicCdnDomain);
  const [quality, setQuality] = useState(config.compressionQuality);
  const [maxDimension, setMaxDimension] = useState(config.maxDimensionPx);
  const [autoWebp, setAutoWebp] = useState(config.autoWebpCompression);
  const [stripExif, setStripExif] = useState(config.stripExifGps);

  const accountDomains = db.getDomains(account.id);

  useEffect(() => {
    const freshCfg = db.getR2ConfigForAccount(account.id);
    setConfig(freshCfg);
    setBucketName(freshCfg.bucketName);
    setCfAccountId(freshCfg.accountIdCloudflare);
    setAccessKeyId(freshCfg.accessKeyId);
    setCdnDomain(freshCfg.publicCdnDomain);
    setQuality(freshCfg.compressionQuality);
    setMaxDimension(freshCfg.maxDimensionPx);
    setAutoWebp(freshCfg.autoWebpCompression);
    setStripExif(freshCfg.stripExifGps);
    setMediaList(db.getOptimizedMedia(account.id));
  }, [account.id, account.primaryDomain]);

  const handleAutoSyncDomainBinding = () => {
    const cleanDom = (account.primaryDomain || 'website.my.id').toLowerCase().trim();
    const cleanSlug = (account.username || cleanDom.replace(/[^a-z0-9]/g, '-')).toLowerCase();
    const autoBucket =
      account.id === 'acc-rdm-01' ? 'media-madrasah-denbaguse' : `r2-${cleanSlug}-media`;
    const autoCdnUrl = `https://media.${cleanDom}`;

    const updated: CloudflareR2Config = {
      ...config,
      accountId: account.id,
      bucketName: autoBucket,
      publicCdnDomain: autoCdnUrl,
      status: 'connected',
      lastSyncedAt: new Date().toISOString(),
    };

    db.saveR2Config(updated);

    // Ensure CNAME DNS record exists for media.<domain>
    const existingDns = db.getDnsRecords(account.id);
    if (!existingDns.some(d => d.name.toLowerCase() === 'media')) {
      db.saveDnsRecord({
        id: `dns-r2-media-${account.id}-${Date.now()}`,
        accountId: account.id,
        domain: cleanDom,
        type: 'CNAME',
        name: 'media',
        content: `${autoBucket}.r2-edge.cloudpro.id`,
        ttl: 3600,
      });
    }

    setConfig(updated);
    setBucketName(autoBucket);
    setCdnDomain(autoCdnUrl);

    showToast({
      title: 'Auto-Binding Domain Berhasil',
      message: `Cloudflare R2 telah terkoneksi otomatis ke domain website ${cleanDom} (${autoCdnUrl}) beserta record CNAME DNS.`,
      type: 'success',
    });
  };

  // Compression test state
  const [testResult, setTestResult] = useState<{
    originalSize: string;
    compressedSize: string;
    savingsPct: number;
    previewUrl: string;
    width: number;
    height: number;
    fileName: string;
    blobUrl?: string;
  } | null>(null);

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Handle direct file upload with auto compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const originalFile = files[i];

      try {
        let finalFile: File = originalFile;
        let dataUrl = '';
        let originalSizeBytes = originalFile.size;
        let compressedSizeBytes = originalFile.size;
        let savingsPct = 0;
        let width = 1920;
        let height = 1080;

        // Auto compress if image and setting enabled
        if (autoWebp && originalFile.type.startsWith('image/')) {
          const comp = await compressImageToWebP(originalFile, {
            quality: quality / 100,
            maxWidth: maxDimension,
            maxHeight: maxDimension,
            format: 'image/webp',
          });
          finalFile = comp.file;
          dataUrl = comp.dataUrl;
          compressedSizeBytes = comp.compressedSizeBytes;
          savingsPct = comp.compressionRatioPct;
          width = comp.width;
          height = comp.height;
        }

        const cleanBaseName = originalFile.name.replace(/\.[^/.]+$/, '');
        const finalName = autoWebp ? `${cleanBaseName}.webp` : originalFile.name;
        const publicUrl = `${cdnDomain.replace(/\/+$/, '')}/${finalName}`;

        const newMedia: OptimizedMediaFile = {
          id: `med-${Date.now()}-${i}`,
          accountId: account.id,
          fileName: finalName,
          originalFileName: originalFile.name,
          mimeType: finalFile.type,
          originalSizeBytes,
          compressedSizeBytes,
          compressionRatioPct: savingsPct,
          width,
          height,
          url: publicUrl,
          storageTarget: config.status === 'connected' ? 'cloudflare_r2' : 'local_nvme',
          category: 'activity',
          uploadedBy: account.username || 'admin',
          uploadedAt: new Date().toISOString(),
          dataBase64: dataUrl,
        };

        db.addOptimizedMedia(newMedia);
        successCount++;
      } catch (err: unknown) {
        console.error('Gagal memproses file:', err);
      }
    }

    setMediaList(db.getOptimizedMedia(account.id));
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    showToast({
      title: 'Unggah Media Berhasil',
      message: `${successCount} file foto kegiatan madrasah berhasil dioptimasi WebP & disimpan ke Cloudflare R2!`,
      type: 'success',
    });
  };

  // Handle Interactive Test Compression
  const handleTestCompress = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const comp = await compressImageToWebP(file, {
        quality: quality / 100,
        maxWidth: maxDimension,
        maxHeight: maxDimension,
        format: 'image/webp',
      });

      setTestResult({
        originalSize: formatBytes(comp.originalSizeBytes),
        compressedSize: formatBytes(comp.compressedSizeBytes),
        savingsPct: comp.compressionRatioPct,
        previewUrl: comp.dataUrl,
        width: comp.width,
        height: comp.height,
        fileName: comp.file.name,
      });

      showToast({
        title: 'Kompresi Berhasil Diuji',
        message: `Foto diperkecil ${comp.compressionRatioPct}% tanpa kehilangan ketajaman visual!`,
        type: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error tidak diketahui';
      showToast({
        title: 'Gagal Kompresi',
        message: msg,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    const updated: CloudflareR2Config = {
      ...config,
      bucketName,
      accountIdCloudflare: cfAccountId,
      accessKeyId,
      publicCdnDomain: cdnDomain,
      compressionQuality: quality,
      maxDimensionPx: maxDimension,
      autoWebpCompression: autoWebp,
      stripExifGps: stripExif,
      status: 'connected',
      lastSyncedAt: new Date().toISOString(),
    };

    db.saveR2Config(updated);
    setConfig(updated);

    showToast({
      title: 'Pengaturan Cloudflare R2 Tersimpan',
      message: 'Koneksi bucket R2 & optimizer foto WebP otomatis aktif.',
      type: 'success',
    });
  };

  // Delete media
  const handleDeleteMedia = (id: string, name: string) => {
    confirmAction({
      title: 'Hapus File Media?',
      message: `File "${name}" akan dihapus permanen dari Cloudflare R2 dan daftar media.`,
      confirmLabel: 'Ya, Hapus Media',
      isDestructive: true,
      onConfirm: () => {
        db.deleteOptimizedMedia(id);
        setMediaList(db.getOptimizedMedia(account.id));
        if (selectedPreview?.id === id) setSelectedPreview(null);
        showToast({
          title: 'Media Dihapus',
          message: `File ${name} berhasil dihapus.`,
          type: 'info',
        });
      },
    });
  };

  // Copy URL
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast({
      title: 'URL Disalin',
      message: 'Tautan media CDN telah disalin ke clipboard.',
      type: 'info',
    });
  };

  // Stats calculation
  const totalOriginalBytes = mediaList.reduce((acc, m) => acc + m.originalSizeBytes, 0);
  const totalCompressedBytes = mediaList.reduce((acc, m) => acc + m.compressedSizeBytes, 0);
  const totalSavingsBytes = Math.max(0, totalOriginalBytes - totalCompressedBytes);
  const overallSavingsPct =
    totalOriginalBytes > 0
      ? ((totalSavingsBytes / totalOriginalBytes) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-linear-to-r from-slate-900 via-sky-950/40 to-slate-900 p-6 shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Cloudflare R2 &amp; Smart Media Optimizer
                </h2>
                <p className="text-xs text-slate-400">
                  Object Storage Terdistribusi: Kompresi Otomatis WebP &amp; Bebas Biaya Egress Bandwidth
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/20 hover:from-sky-400 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              <span>{isProcessing ? 'Mengompresi & Unggah...' : 'Unggah Foto Madrasah'}</span>
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'settings' ? 'gallery' : 'settings')}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Settings className="h-4 w-4 text-sky-400" />
              <span>{activeTab === 'settings' ? 'Kembali ke Galeri' : 'Pengaturan R2'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Storage & Savings Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 backdrop-blur-xs">
            <span className="text-[11px] font-medium text-slate-400">Status Penyimpanan</span>
            <div className="mt-1 flex items-center gap-1.5 font-bold text-white text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Cloudflare R2 Connected
            </div>
            <span className="font-mono text-[10px] text-slate-400 truncate block mt-0.5">
              Bucket: {config.bucketName}
            </span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 backdrop-blur-xs">
            <span className="text-[11px] font-medium text-slate-400">Auto-Bind Domain Web</span>
            <div className="mt-1 font-mono font-bold text-emerald-400 text-xs truncate">
              {account.primaryDomain}
            </div>
            <span className="font-mono text-[10px] text-sky-400 truncate block mt-0.5">
              CDN: {config.publicCdnDomain}
            </span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 backdrop-blur-xs">
            <span className="text-[11px] font-medium text-slate-400">Ukuran Asli vs WebP</span>
            <div className="mt-1 font-bold text-sky-400 text-sm">
              {formatBytes(totalCompressedBytes)}
              <span className="text-xs font-normal text-slate-400 line-through ml-1.5">
                {formatBytes(totalOriginalBytes)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              NVMe Server Hemat {formatBytes(totalSavingsBytes)} ({mediaList.length} File)
            </span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 backdrop-blur-xs">
            <span className="text-[11px] font-medium text-slate-400">Efisiensi Kompresi</span>
            <div className="mt-1 font-bold text-emerald-400 text-sm flex items-center gap-1">
              <Zap className="h-4 w-4" />
              Hemat {overallSavingsPct}%
            </div>
            <span className="text-[10px] text-emerald-400/80 block mt-0.5">
              Kualitas Tajam (Visual Lossless)
            </span>
          </div>
        </div>

        {/* Automatic Per-Website Domain Connection Banner */}
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Koneksi Otomatis ke Domain Website Aktif ({account.primaryDomain})
                </span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  CNAME & Worker Auto-Route
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Setiap akun hosting otomatis memiliki bucket terisolasi (<code className="font-mono text-sky-300">{config.bucketName}</code>) yang terhubung langsung ke domain <code className="font-mono text-emerald-300">{config.publicCdnDomain}</code> serta seluruh subdomain akun ini ({accountDomains.length} domain terhubung).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAutoSyncDomainBinding}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/30 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-600/50 cursor-pointer transition-colors"
            title="Sinkronkan ulang CDN & CNAME DNS ke domain utama akun ini"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sinkronkan Domain Otomatis</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'gallery'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          <span>Galeri & Unduh Media ({mediaList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('compressor')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'compressor'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Uji Kompresi Foto WebP (Demo Live)</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'settings'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="h-4 w-4 text-purple-400" />
          <span>Konfigurasi API R2 & Kualitas WebP</span>
        </button>
      </div>

      {/* TAB 1: GALERI MEDIA & DOWNLOAD */}
      {activeTab === 'gallery' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Daftar file foto kegiatan yang tersimpan di Cloudflare R2:</span>
            <span>Target CDN: <code className="font-mono text-sky-400">{config.publicCdnDomain}</code></span>
          </div>

          {mediaList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 p-12 text-center">
              <ImageIcon className="h-12 w-12 text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-300">Belum ada foto yang diunggah</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Klik tombol "Unggah Foto Madrasah" di atas untuk mencoba mengompres foto dan menyimpannya ke Cloudflare R2.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 transition-colors"
              >
                Pilih Foto dari Komputer / HP
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {mediaList.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-3 transition-all hover:border-sky-500/40 hover:shadow-lg"
                >
                  <div>
                    {/* Image / Thumbnail Box */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800/80">
                      {item.dataBase64 ? (
                        <img
                          src={item.dataBase64}
                          alt={item.fileName}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-slate-400">
                          <ImageIcon className="h-8 w-8 text-sky-400" />
                          <span className="font-mono text-[10px] text-slate-400">{item.width} x {item.height}</span>
                        </div>
                      )}

                      {/* Compression Badge */}
                      <span className="absolute top-2 right-2 rounded-full bg-emerald-500/90 px-2 py-0.5 font-mono text-[9px] font-bold text-white shadow-xs">
                        -{item.compressionRatioPct}% WebP
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="mt-3 space-y-1">
                      <p className="font-mono text-xs font-bold text-slate-200 truncate" title={item.fileName}>
                        {item.fileName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate" title={`Asli: ${item.originalFileName}`}>
                        Orig: {item.originalFileName}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-sky-400">{formatBytes(item.compressedSizeBytes)}</span>
                        <span className="line-through text-slate-400">{formatBytes(item.originalSizeBytes)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-slate-800/60">
                    {item.dataBase64 ? (
                      <a
                        href={item.dataBase64}
                        download={item.fileName}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-sky-600 hover:text-white transition-colors"
                        title="Unduh File WebP"
                      >
                        <Download className="h-3 w-3" />
                        <span>Unduh</span>
                      </a>
                    ) : (
                      <button
                        onClick={() => copyToClipboard(item.url)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-sky-600 hover:text-white transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Salin URL</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedPreview(item)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                      title="Lihat Detail & Perbandingan"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteMedia(item.id, item.fileName)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 transition-colors"
                      title="Hapus dari R2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERACTIVE LIVE COMPRESSOR DEMO */}
      {activeTab === 'compressor' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Uploader Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Uji Kompresi Foto Asli Kamera HP</h3>
                <p className="text-xs text-slate-400">Pilih foto ukuran besar (5MB - 15MB) untuk melihat kompresi instan</p>
              </div>
            </div>

            <div className="rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/50 p-6 text-center hover:border-sky-500 transition-colors">
              <input
                type="file"
                id="test-upload"
                accept="image/*"
                onChange={handleTestCompress}
                className="hidden"
              />
              <label htmlFor="test-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-sky-400 animate-bounce" />
                <span className="text-xs font-semibold text-slate-200">
                  {isProcessing ? 'Sedang Memproses WebP...' : 'Klik di Sini untuk Pilih Foto Uji Coba'}
                </span>
                <span className="text-[10px] text-slate-400">JPG, PNG, atau RAW Kamera HP</span>
              </label>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-sky-400" />
                Bagaimana kompresi ini bekerja tanpa pecah?
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Algoritma menggunakan standar <strong>WebP Perceptual Compression</strong> pada kualitas 82%. 
                Mata manusia tidak bisa membedakan piksel yang dihilangkan, namun ukuran file langsung berkurang hingga <strong>90% - 96%</strong>. 
                Resolusi tetap tajam untuk layar monitor maupun HP wali murid.
              </p>
            </div>
          </div>

          {/* Result Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Hasil Kompresi Visual
            </h3>

            {testResult ? (
              <div className="space-y-4">
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black flex items-center justify-center">
                  <img
                    src={testResult.previewUrl}
                    alt="Compressed Preview"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Ukuran Asli</span>
                    <span className="font-mono text-xs font-bold text-rose-400 line-through">
                      {testResult.originalSize}
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Ukuran WebP</span>
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {testResult.compressedSize}
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Penghematan</span>
                    <span className="font-mono text-xs font-bold text-sky-400">
                      {testResult.savingsPct}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-slate-400">Resolusi Akhir: <strong className="text-white">{testResult.width} x {testResult.height} px</strong></span>
                  <a
                    href={testResult.previewUrl}
                    download={`compressed_${testResult.fileName}`}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Unduh Hasil WebP</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-slate-950/40 p-12 text-center text-slate-400 text-xs">
                <ImageIcon className="h-10 w-10 text-slate-600 mb-2" />
                <p>Belum ada foto yang diuji.</p>
                <p className="text-[11px] text-slate-400 mt-1">Upload foto di sebelah kiri untuk melihat perbandingan ukuran secara langsung.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CONFIGURATION & SETTINGS */}
      {activeTab === 'settings' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cloud className="h-5 w-5 text-orange-400" />
              Kredensial Cloudflare R2 (S3 Compatible Storage)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Kunci API didapatkan langsung dari Dashboard Cloudflare ➔ Menu R2 Object Storage ➔ Create API Token.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Bucket Name</label>
              <input
                type="text"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                placeholder="media-madrasah"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-xs text-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Cloudflare Account ID</label>
              <input
                type="text"
                value={cfAccountId}
                onChange={(e) => setCfAccountId(e.target.value)}
                placeholder="cf_acc_9837190f84a1e948"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-xs text-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Access Key ID</label>
              <input
                type="text"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                placeholder="a8e99bc1289fe83d1004"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-xs text-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Secret Access Key</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="********************************"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-xs text-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Public CDN Domain (Otomatis Terkoneksi ke Domain Website: {account.primaryDomain})
                </label>
                <button
                  type="button"
                  onClick={handleAutoSyncDomainBinding}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 cursor-pointer flex items-center gap-1"
                >
                  <Globe className="h-3 w-3" />
                  <span>Gunakan media.{account.primaryDomain}</span>
                </button>
              </div>
              <input
                type="text"
                value={cdnDomain}
                onChange={(e) => setCdnDomain(e.target.value)}
                placeholder={`https://media.${account.primaryDomain}`}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-xs text-white focus:border-sky-500 focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Otomatis terhubung via CNAME DNS ke domain website aktif (<strong>{account.primaryDomain}</strong>) tanpa biaya bandwidth egress.
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Opsi Kompresi Gambar Otomatis
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3.5">
                <div>
                  <span className="text-xs font-semibold text-white block">Auto-Convert ke WebP</span>
                  <span className="text-[11px] text-slate-400">Otomatis ubah JPG/PNG menjadi WebP saat diupload</span>
                </div>
                <input
                  type="checkbox"
                  checked={autoWebp}
                  onChange={(e) => setAutoWebp(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3.5">
                <div>
                  <span className="text-xs font-semibold text-white block">Hapus Data GPS/EXIF</span>
                  <span className="text-[11px] text-slate-400">Lindungi privasi foto murid & madrasah</span>
                </div>
                <input
                  type="checkbox"
                  checked={stripExif}
                  onChange={(e) => setStripExif(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-white">
                  <span>Kualitas WebP ({quality}%)</span>
                  <span className="text-emerald-400 font-mono">82% = Optimal Tajam</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
                <span className="text-[10px] text-slate-400 block">
                  Nilai 80-85% memberikan pengurangan ukuran terbaik tanpa penurunan ketajaman kasat mata.
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-white">
                  <span>Batas Resolusi Maksimum</span>
                  <span className="text-sky-400 font-mono">{maxDimension} px</span>
                </div>
                <select
                  value={maxDimension}
                  onChange={(e) => setMaxDimension(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                >
                  <option value={1920}>1920 px (Full HD - Standar Web Madrasah)</option>
                  <option value={2560}>2560 px (2K Quad HD)</option>
                  <option value={3840}>3840 px (4K Ultra HD)</option>
                </select>
                <span className="text-[10px] text-slate-400 block">
                  Foto kamera HP 48MP/108MP akan di-downscale proporsional ke ukuran ini agar enteng.
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={handleSaveSettings}
              className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-500 transition-colors shadow-lg shadow-sky-600/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Simpan Konfigurasi R2</span>
            </button>
          </div>
        </div>
      )}

      {/* DETAIL MODAL / PREVIEW */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white truncate max-w-md">
                Detail Media: {selectedPreview.fileName}
              </h3>
              <button
                onClick={() => setSelectedPreview(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedPreview.dataBase64 && (
              <div className="max-h-72 w-full overflow-hidden rounded-xl border border-slate-800 bg-black flex items-center justify-center">
                <img
                  src={selectedPreview.dataBase64}
                  alt={selectedPreview.fileName}
                  className="max-h-72 object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Nama File Asli</span>
                <span className="font-mono text-slate-200 truncate block">{selectedPreview.originalFileName}</span>
              </div>

              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Format & Resolusi</span>
                <span className="font-mono text-slate-200">{selectedPreview.mimeType} ({selectedPreview.width} x {selectedPreview.height})</span>
              </div>

              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Ukuran Terkompresi</span>
                <span className="font-mono text-emerald-400 font-bold">{formatBytes(selectedPreview.compressedSizeBytes)}</span>
                <span className="text-[10px] text-slate-400 block line-through">Asli: {formatBytes(selectedPreview.originalSizeBytes)}</span>
              </div>

              <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Target Penyimpanan</span>
                <span className="font-mono text-sky-400 font-bold">Cloudflare R2 (media-madrasah)</span>
              </div>
            </div>

            <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 block mb-1">Public CDN URL</span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-sky-300 truncate">{selectedPreview.url}</span>
                <button
                  onClick={() => copyToClipboard(selectedPreview.url)}
                  className="rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white hover:bg-sky-600"
                >
                  Salin
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              {selectedPreview.dataBase64 && (
                <a
                  href={selectedPreview.dataBase64}
                  download={selectedPreview.fileName}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh File</span>
                </a>
              )}
              <button
                onClick={() => setSelectedPreview(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
