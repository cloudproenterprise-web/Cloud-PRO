import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { HostingAccount } from '../../types';
import { CloudProApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

interface SslManagerProps {
  account: HostingAccount;
}

export const SslManager: React.FC<SslManagerProps> = ({ account }) => {
  const { currentUser } = useAuth();
  const { showToast, refreshAll } = useServer();

  if (!currentUser || !account) return null;

  const [isIssuing, setIsIssuing] = useState(false);
  const [forceHttps, setForceHttps] = useState(account?.forceHttps || false);

  const handleIssueSsl = async () => {
    setIsIssuing(true);
    try {
      await CloudProApi.issueSsl(account.id, currentUser);
      showToast('info', 'Task AutoSSL Dimulai', 'Penerbitan sertifikat SSL Let\'s Encrypt telah dimasukkan ke background worker.');
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Request SSL', err.message);
    } finally {
      setIsIssuing(false);
    }
  };

  const handleToggleHttps = async (val: boolean) => {
    setForceHttps(val);
    try {
      await CloudProApi.toggleForceHttps(account.id, val, currentUser);
      showToast('success', 'Konfigurasi HTTPS Tersimpan', `Force HTTPS redirect sekarang ${val ? 'Aktif' : 'Nonaktif'}.`);
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Ubah HTTPS', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Sertifikat Keamanan SSL / TLS (Let&apos;s Encrypt AutoSSL)
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Enkripsi end-to-end HTTPS dengan perpanjangan otomatis otomatis setiap 90 hari.
          </p>
        </div>

        <button
          onClick={handleIssueSsl}
          disabled={isIssuing}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isIssuing ? 'animate-spin' : ''}`} />
          <span>{isIssuing ? 'Menerbitkan...' : 'Terbitkan / Perbarui AutoSSL'}</span>
        </button>
      </div>

      {/* SSL Status Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Sertifikat SSL Aktif & Valid
                </h4>
                <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  SECURE (TLS 1.3)
                </span>
              </div>
              <p className="font-mono text-xs text-slate-400 mt-0.5">
                Diterbitkan oleh: {account.sslProvider}
              </p>
            </div>
          </div>
        </div>

        {/* Certificate Details */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-slate-100 pt-4 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400">Domain Terproteksi (SANs):</span>
            <div className="mt-1 font-mono font-semibold text-slate-900 dark:text-white">
              {account.primaryDomain}, *.{account.primaryDomain}
            </div>
          </div>
          <div>
            <span className="text-slate-400">Algoritma Kunci:</span>
            <div className="mt-1 font-mono font-semibold text-slate-900 dark:text-white">
              ECDSA P-256 / SHA-256 with RSA
            </div>
          </div>
          <div>
            <span className="text-slate-400">Kedaluwarsa Pada:</span>
            <div className="mt-1 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {account.sslExpiresAt ? new Date(account.sslExpiresAt).toLocaleDateString() : 'Auto-renewing'}
            </div>
          </div>
        </div>
      </div>

      {/* Force HTTPS Switch */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Paksa Pengalihan HTTPS (Force HTTPS Redirect 301)
          </h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Secara otomatis mengarahkan semua pengunjung dari HTTP:// ke HTTPS:// terenkripsi.
          </p>
        </div>

        <button
          onClick={() => handleToggleHttps(!forceHttps)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
            forceHttps ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              forceHttps ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
