import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Clock,
  User,
  ShieldCheck,
  ArrowDownCircle,
  X,
  Code2,
} from 'lucide-react';

export interface CommitInfo {
  ok: boolean;
  local: {
    shortHash: string;
    fullHash: string;
    message: string;
    author: string;
    date: string;
    relative: string;
    branch: string;
  };
  remote: {
    shortHash: string;
    fullHash: string;
    message: string;
    date: string;
  };
  isUpToDate: boolean;
  statusText: string;
  checkedAt: string;
}

interface GitCommitVerifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTerminal?: () => void;
}

export const GitCommitVerifierModal: React.FC<GitCommitVerifierModalProps> = ({
  isOpen,
  onClose,
  onOpenTerminal,
}) => {
  const [data, setData] = useState<CommitInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateLog, setUpdateLog] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCommitInfo = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/system/git-commit-info');
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setData(json);
        } else {
          setErrorMsg(json.message || 'Gagal membaca info git');
        }
      } else {
        setErrorMsg(`Server merespons HTTP ${res.status}`);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Gagal menghubungi server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCommitInfo();
      setUpdateLog(null);
    }
  }, [isOpen]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handlePullUpdate = async () => {
    setIsUpdating(true);
    setUpdateLog('Menghubungi GitHub & menarik kommit terbaru...');
    try {
      const res = await fetch('/api/system/git-pull-update', { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        setUpdateLog(json.output || json.latestCommit || 'Pembaruan kommit berhasil!');
        fetchCommitInfo();
      } else {
        setUpdateLog(`Gagal update: ${json.message}`);
      }
    } catch (e: any) {
      setUpdateLog(`Error: ${e?.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Verifikasi Kommit & Pembaruan GitHub
                {data?.isUpToDate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Kommit Terbaru
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Pemeriksaan integritas kode & versi rilis server CloudPRO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="my-5 space-y-4">
          {isLoading && !data ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin text-sky-400 mb-3" />
              <p className="text-xs font-medium">Memeriksa kommit terbaru dari GitHub...</p>
            </div>
          ) : errorMsg ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          ) : data ? (
            <>
              {/* Status Banner */}
              <div
                className={`rounded-xl border p-4 flex items-center justify-between ${
                  data.isUpToDate
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {data.isUpToDate ? (
                    <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
                  ) : (
                    <ArrowDownCircle className="h-6 w-6 text-amber-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-white">
                      {data.isUpToDate
                        ? '✅ Server Anda SUDAH Menggunakan Kommit Terbaru!'
                        : '🌟 DITEMUKAN KOMMIT BARU DI GITHUB!'}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {data.isUpToDate
                        ? 'Seluruh fitur, perbaikan bug, dan script SSH sinkron 100% dengan repositori GitHub resmi.'
                        : 'Terdapat kommit baru di GitHub yang belum diterapkan ke server ini.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Commit Details Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <span className="text-slate-400 flex items-center gap-1.5 font-sans font-medium">
                    <Code2 className="h-4 w-4 text-sky-400" /> Hash Kommit Aktif:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-sky-300 font-bold">
                      {data.local.shortHash}
                    </span>
                    <button
                      onClick={() => handleCopyHash(data.local.fullHash)}
                      title="Salin Full Hash SHA"
                      className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                    >
                      {copiedHash ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 font-sans font-medium text-[11px] mb-1">
                    Judul & Pesan Kommit:
                  </div>
                  <div className="text-slate-200 bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-xs leading-relaxed">
                    {data.local.message}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] font-sans">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>Author: <strong className="text-slate-300">{data.local.author}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>Waktu: <strong className="text-slate-300">{data.local.relative}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-sans">
                  <span className="text-slate-400">Remote origin/main:</span>
                  <span className="text-slate-300 font-mono font-semibold">
                    {data.remote.shortHash} ({data.isUpToDate ? 'Sesuai' : 'Berbeda'})
                  </span>
                </div>
              </div>

              {/* Update Log Output if any */}
              {updateLog && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {updateLog}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCommitInfo}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Cek GitHub</span>
            </button>
            <a
              href="https://github.com/siakadmadrasah-lang/CloudPRO-Server/commits/main"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <span>GitHub Commits</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                window.open('/terminal', '_blank');
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Terminal className="h-3.5 w-3.5 text-sky-400" />
              <span>Web SSH</span>
            </button>
            <button
              onClick={handlePullUpdate}
              disabled={isUpdating}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:from-sky-400 hover:to-blue-500 transition-all disabled:opacity-50 cursor-pointer"
            >
              <ArrowDownCircle className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'Memproses...' : 'Tarik Kommit'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
