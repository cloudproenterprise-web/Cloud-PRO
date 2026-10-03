import React, { useState } from 'react';
import {
  Clock,
  PlusCircle,
  Trash2,
  Play,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { CronJobItem, HostingAccount } from '../../types';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

interface CronManagerProps {
  account: HostingAccount;
}

export const CronManager: React.FC<CronManagerProps> = ({ account }) => {
  const { currentUser } = useAuth();
  const { showToast, confirmAction } = useServer();

  if (!currentUser || !account) return null;

  const [cronJobs, setCronJobs] = useState<CronJobItem[]>(() => account?.id ? db.getCronJobs(account.id) : []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [schedulePreset, setSchedulePreset] = useState('0 * * * *');
  const [command, setCommand] = useState(`/usr/bin/php /home/${account.username}/public_html/cron.php`);
  const [description, setDescription] = useState('');

  const refreshList = () => {
    setCronJobs([...db.getCronJobs(account.id)]);
  };

  const handleAddCron = () => {
    if (!command.trim()) return;

    const newJob: CronJobItem = {
      id: `cron-${Date.now()}`,
      accountId: account.id,
      schedule: schedulePreset,
      command: command.trim(),
      description: description.trim() || 'Scheduled cron job execution',
      isActive: true,
      lastRun: new Date().toISOString(),
    };

    db.saveCronJob(newJob);
    db.logAction(
      currentUser,
      'CRON_JOB_ADDED',
      'HOSTING',
      `Menambahkan tugas cron "${newJob.schedule} ${newJob.command}" pada akun ${account.primaryDomain}`
    );
    showToast('success', 'Cron Job Dibuat', 'Jadwal cron berhasil ditambahkan.');
    setDescription('');
    setShowAddModal(false);
    refreshList();
  };

  const handleDeleteCron = (job: CronJobItem) => {
    confirmAction({
      title: 'Hapus Tugas Cron Job',
      message: `Hapus jadwal cron job "${job.command}"? Perintah ini tidak akan dieksekusi lagi secara otomatis.`,
      confirmText: 'Hapus Cron Job',
      isDanger: true,
      onConfirm: () => {
        db.deleteCronJob(job.id);
        db.logAction(
          currentUser,
          'CRON_JOB_DELETED',
          'HOSTING',
          `Menghapus cron job "${job.command}"`
        );
        showToast('info', 'Cron Dihapus', 'Jadwal cron telah dihapus.');
        refreshList();
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cron Jobs & Scheduled Tasks
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Eksekusi skrip otomatis berkala di latar belakang server crontab.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 shadow-xs"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Tambah Cron Job</span>
        </button>
      </div>

      {/* Crons List Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden w-full max-w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[550px]">
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 font-sans">
            <tr>
              <th className="px-5 py-3">Jadwal (Cron Syntax)</th>
              <th className="px-5 py-3">Perintah Script</th>
              <th className="px-5 py-3">Deskripsi</th>
              <th className="px-5 py-3">Terakhir Dijalankan</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {cronJobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-sans">
                  Belum ada jadwal cron job.
                </td>
              </tr>
            ) : (
              cronJobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      {job.schedule}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200 break-all max-w-sm">
                    {job.command}
                  </td>
                  <td className="px-5 py-3.5 font-sans text-slate-500 dark:text-slate-400">
                    {job.description}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                    {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Pending'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-sans">
                    <button
                      onClick={() => handleDeleteCron(job)}
                      className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60"
                      title="Hapus Cron"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add Cron Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tambah Jadwal Cron Job
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Jadwalkan eksekusi berkala skrip PHP, Python, atau shell script.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Preset Jadwal:
                </label>
                <select
                  value={schedulePreset}
                  onChange={e => setSchedulePreset(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="*/15 * * * *">Setiap 15 Menit (*/15 * * * *)</option>
                  <option value="0 * * * *">Setiap Jam (0 * * * *)</option>
                  <option value="0 0 * * *">Setiap Hari Jam 00:00 Tengah Malam (0 0 * * *)</option>
                  <option value="0 2 * * 0">Setiap Minggu Jam 02:00 (0 2 * * 0)</option>
                  <option value="0 0 1 * *">Setiap Tanggal 1 Awal Bulan (0 0 1 * *)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Perintah Eksekusi (Command):
                </label>
                <input
                  type="text"
                  value={command}
                  onChange={e => setCommand(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Deskripsi / Catatan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="contoh: Sinkronisasi katalog produk"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddCron}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 shadow-xs"
              >
                Simpan Jadwal Cron
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
