import React, { useState } from 'react';
import {
  Mail,
  PlusCircle,
  Trash2,
  ExternalLink,
  Settings,
  Shield,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { EmailMailbox, HostingAccount } from '../../types';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

interface EmailManagerProps {
  account: HostingAccount;
}

export const EmailManager: React.FC<EmailManagerProps> = ({ account }) => {
  const { currentUser } = useAuth();
  const { showToast, confirmAction } = useServer();

  if (!currentUser) return null;

  const [emails, setEmails] = useState<EmailMailbox[]>(() => db.getEmails(account.id));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [emailUser, setEmailUser] = useState('');
  const [quotaMb, setQuotaMb] = useState(1024);
  const [forwardTo, setForwardTo] = useState('');
  const [showClientConfig, setShowClientConfig] = useState(false);

  const refreshList = () => {
    setEmails([...db.getEmails(account.id)]);
  };

  const handleCreateEmail = () => {
    if (!emailUser.trim()) return;
    const fullAddress = `${emailUser.trim().toLowerCase()}@${account.primaryDomain}`;

    const newMailbox: EmailMailbox = {
      id: `mail-${Date.now()}`,
      accountId: account.id,
      emailAddress: fullAddress,
      quotaMb,
      usedMb: 0,
      forwardTo: forwardTo.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    db.saveEmail(newMailbox);
    db.logAction(
      currentUser,
      'EMAIL_CREATED',
      'HOSTING',
      `Membuat kotak surat email "${fullAddress}" dengan kuota ${quotaMb} MB pada domain ${account.primaryDomain}`
    );
    showToast('success', 'Email Dibuat', `Kotak surat ${fullAddress} aktif.`);
    setEmailUser('');
    setForwardTo('');
    setShowCreateModal(false);
    refreshList();
  };

  const handleDeleteEmail = (mailbox: EmailMailbox) => {
    confirmAction({
      title: 'Hapus Akun Email',
      message: `Yakin ingin menghapus akun email ${mailbox.emailAddress}? Seluruh email di dalam inbox ini akan terhapus.`,
      confirmText: 'Hapus Akun Email',
      isDanger: true,
      onConfirm: () => {
        db.deleteEmail(mailbox.id);
        db.logAction(
          currentUser,
          'EMAIL_DELETED',
          'HOSTING',
          `Menghapus akun email "${mailbox.emailAddress}"`
        );
        showToast('info', 'Email Dihapus', `${mailbox.emailAddress} telah dihapus.`);
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
            <Mail className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Email Hosting & Webmail
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Domain: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">@{account.primaryDomain}</span> &bull; Protocol: IMAP (993) / POP3 (995) / SMTP (465) SSL TLS
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClientConfig(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Koneksi Mail Client</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-xs"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Buat Akun Email</span>
          </button>
        </div>
      </div>

      {/* Mailboxes Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden w-full max-w-full">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Akun Email Terdaftar ({emails.length})
          </h4>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[550px]">
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 font-sans">
            <tr>
              <th className="px-5 py-3">Alamat Email</th>
              <th className="px-5 py-3">Penggunaan Kuota</th>
              <th className="px-5 py-3">Forwarder (Penerusan)</th>
              <th className="px-5 py-3">Dibuat Pada</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {emails.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-sans">
                  Belum ada kotak surat email. Klik &quot;Buat Akun Email&quot; untuk menambahkan akun baru.
                </td>
              </tr>
            ) : (
              emails.map(mail => (
                <tr key={mail.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-indigo-500" />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {mail.emailAddress}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div>
                      {mail.usedMb} MB / {mail.quotaMb} MB
                    </div>
                    <div className="mt-1 h-1 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, (mail.usedMb / mail.quotaMb) * 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-sans text-xs">
                    {mail.forwardTo ? (
                      <span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                        &rarr; {mail.forwardTo}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                    {new Date(mail.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right font-sans">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          showToast('info', 'Membuka Webmail', `Mengarahkan ke Roundcube Webmail untuk ${mail.emailAddress}...`);
                        }}
                        className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 inline-flex items-center gap-1"
                      >
                        <span>Webmail</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmail(mail)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60"
                        title="Hapus Email"
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

      {/* Create Email Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Buat Akun Email Baru
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Buat alamat kotak surat kustom di bawah domain <code>{account.primaryDomain}</code>.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Nama Email:
                </label>
                <div className="mt-1 flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <input
                    type="text"
                    placeholder="contoh: admin, support, kontak"
                    value={emailUser}
                    onChange={e => setEmailUser(e.target.value)}
                    className="w-full px-3 py-2 font-mono text-slate-900 dark:bg-slate-900 dark:text-white outline-hidden"
                    autoFocus
                  />
                  <span className="bg-slate-100 px-3 py-2 font-mono text-slate-500 dark:bg-slate-800 shrink-0">
                    @{account.primaryDomain}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Batas Kuota Kotak Masuk (MB):
                </label>
                <input
                  type="number"
                  min="256"
                  value={quotaMb}
                  onChange={e => setQuotaMb(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Teruskan ke Email Lain (Opsional):
                </label>
                <input
                  type="email"
                  placeholder="contoh: akun.pribadi@gmail.com"
                  value={forwardTo}
                  onChange={e => setForwardTo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateEmail}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-xs"
              >
                Simpan Akun Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mail Client Configuration Modal */}
      {showClientConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Konfigurasi Mail Client (Outlook, Thunderbird, Apple Mail)
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Gunakan parameter terenkripsi SSL/TLS berikut untuk menghubungkan software email di laptop atau HP.
            </p>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-indigo-600 dark:text-indigo-400 font-sans mb-1">
                  Incoming Server (IMAP):
                </div>
                <div>Server: mail.{account.primaryDomain}</div>
                <div>Port: 993 (SSL/TLS)</div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-indigo-600 dark:text-indigo-400 font-sans mb-1">
                  Outgoing Server (SMTP):
                </div>
                <div>Server: mail.{account.primaryDomain}</div>
                <div>Port: 465 (SSL/TLS) atau 587 (STARTTLS)</div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowClientConfig(false)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
