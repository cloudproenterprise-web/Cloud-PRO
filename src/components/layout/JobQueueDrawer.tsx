import React from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, Clock, Terminal } from 'lucide-react';
import { useServer } from '../../context/ServerContext';

interface JobQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JobQueueDrawer: React.FC<JobQueueDrawerProps> = ({ isOpen, onClose }) => {
  const { jobs } = useServer();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-5 w-5 text-sky-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Background Worker Queue
              </h2>
              <p className="text-[11px] text-slate-400">
                Task asynchronous cluster hosting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Jobs List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {jobs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Antrean worker sedang kosong. Tidak ada task aktif.
            </div>
          ) : (
            jobs.map(job => (
              <div
                key={job.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                      {job.jobType}
                    </span>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                      {job.title}
                    </h3>
                  </div>
                  <div>
                    {job.status === 'completed' && (
                      <span className="flex items-center gap-1 font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Selesai</span>
                      </span>
                    )}
                    {job.status === 'processing' && (
                      <span className="flex items-center gap-1 font-mono text-[11px] font-medium text-sky-600 dark:text-sky-400">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>{job.progress}%</span>
                      </span>
                    )}
                    {job.status === 'pending' && (
                      <span className="flex items-center gap-1 font-mono text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Menunggu</span>
                      </span>
                    )}
                    {job.status === 'failed' && (
                      <span className="flex items-center gap-1 font-mono text-[11px] font-medium text-rose-600 dark:text-rose-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>Gagal</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-full transition-all duration-300 ${
                      job.status === 'completed'
                        ? 'bg-emerald-500'
                        : job.status === 'failed'
                        ? 'bg-rose-500'
                        : 'bg-sky-500'
                    }`}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>

                {/* Execution Logs */}
                <div className="mt-3 rounded-lg bg-slate-950 p-2.5 font-mono text-[10px] text-slate-300">
                  <div className="flex items-center gap-1.5 pb-1 text-slate-500 border-b border-slate-800 mb-1.5">
                    <Terminal className="h-3 w-3" />
                    <span>Realtime Worker Log</span>
                  </div>
                  <div className="space-y-0.5 max-h-28 overflow-y-auto scrollbar-thin">
                    {job.logs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
