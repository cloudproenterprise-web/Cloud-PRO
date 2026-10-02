import React, { useState } from 'react';
import {
  Shield,
  KeyRound,
  Lock,
  QrCode,
  CheckCircle2,
  Trash2,
  PlusCircle,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  Terminal,
} from 'lucide-react';
import { AuditLog, FirewallRule, ApiKeyItem } from '../../types';
import { TailscaleMeshNode } from './TailscaleMeshNode';
import { Network } from 'lucide-react';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

export const SecurityCenter: React.FC = () => {
  const { currentUser, toggle2FA } = useAuth();
  const { auditLogs, firewallRules, apiKeys, showToast, refreshAll, confirmAction } = useServer();

  const [activeTab, setActiveTab] = useState<'audit' | 'firewall' | '2fa' | 'apikeys' | 'rbac' | 'tailscale'>('audit');
  const [auditFilter, setAuditFilter] = useState<string>('ALL');

  // Firewall Rule Modal
  const [showAddFwModal, setShowAddFwModal] = useState(false);
  const [fwIp, setFwIp] = useState('');
  const [fwType, setFwType] = useState<'whitelist' | 'blacklist'>('blacklist');
  const [fwReason, setFwReason] = useState('');

  // API Key Modal
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');

  if (!currentUser) return null;

  const filteredLogs = auditLogs.filter(log => {
    if (auditFilter === 'ALL') return true;
    return log.category === auditFilter;
  });

  const handleToggle2FA = () => {
    const isNowOn = toggle2FA();
    showToast(
      isNowOn ? 'success' : 'info',
      `Two-Factor Authentication ${isNowOn ? 'Diaktifkan' : 'Dinonaktifkan'}`,
      isNowOn ? 'Akun Anda kini terlindungi dengan kode OTP 2FA.' : 'Proteksi 2FA telah dimatikan.'
    );
  };

  const handleAddFirewall = () => {
    if (!fwIp.trim()) return;

    const newRule: FirewallRule = {
      id: `fw-${Date.now()}`,
      ipOrSubnet: fwIp.trim(),
      type: fwType,
      reason: fwReason.trim() || 'Manual IP Rule by Operator',
      hits: 0,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    db.saveFirewallRule(newRule);
    db.logAction(
      currentUser,
      fwType === 'blacklist' ? 'FIREWALL_IP_BLOCKED' : 'FIREWALL_IP_WHITELISTED',
      'SECURITY',
      `Menambahkan aturan firewall ${fwType.toUpperCase()} untuk ${fwIp} (${newRule.reason})`
    );
    showToast('success', 'Aturan Firewall Disimpan', `IP ${fwIp} dimasukkan ke ${fwType}.`);
    setFwIp('');
    setFwReason('');
    setShowAddFwModal(false);
    refreshAll();
  };

  const handleDeleteFirewall = (rule: FirewallRule) => {
    confirmAction({
      title: 'Hapus Aturan Firewall',
      message: `Hapus aturan ${rule.type.toUpperCase()} untuk alamat ${rule.ipOrSubnet}?`,
      confirmText: 'Hapus Aturan',
      isDanger: true,
      onConfirm: () => {
        db.deleteFirewallRule(rule.id);
        db.logAction(
          currentUser,
          'FIREWALL_RULE_REMOVED',
          'SECURITY',
          `Menghapus aturan firewall ${rule.ipOrSubnet}`
        );
        showToast('info', 'Aturan Dihapus', `IP ${rule.ipOrSubnet} dihapus dari firewall.`);
        refreshAll();
      },
    });
  };

  const handleAddApiKey = () => {
    if (!keyName.trim()) return;

    const prefix = 'cpro_live_' + Math.random().toString(36).substring(2, 6);
    const newKey: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: keyName.trim(),
      keyPrefix: prefix,
      tokenMasked: `${prefix}*******************${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      scopes: ['accounts:read', 'accounts:write', 'dns:read', 'billing:read'],
      createdAt: new Date().toISOString(),
    };

    db.saveApiKey(newKey);
    db.logAction(
      currentUser,
      'API_KEY_CREATED',
      'SECURITY',
      `Membuat API Key baru: ${newKey.name} (${newKey.keyPrefix})`
    );
    showToast('success', 'API Key Diterbitkan', `API Key ${newKey.name} siap digunakan.`);
    setKeyName('');
    setShowAddKeyModal(false);
    refreshAll();
  };

  const handleDeleteApiKey = (key: ApiKeyItem) => {
    confirmAction({
      title: 'Revokasi API Key',
      message: `Revokasi kunci "${key.name}" (${key.keyPrefix})? Akses integrasi otomatis menggunakan kunci ini akan ditolak segera.`,
      confirmText: 'Revokasi Kunci',
      isDanger: true,
      onConfirm: () => {
        db.deleteApiKey(key.id);
        db.logAction(
          currentUser,
          'API_KEY_REVOKED',
          'SECURITY',
          `Merevokasi API Key: ${key.name} (${key.keyPrefix})`
        );
        showToast('info', 'API Key Dihapus', 'Kunci otorisasi telah direvokasi.');
        refreshAll();
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pusat Keamanan, Firewall & Audit Log
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Proteksi Role-Based Access Control (RBAC), 2FA TOTP, IP Whitelist/Blacklist, dan log audit tamper-evident.
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        {[
          { id: 'audit', label: 'Audit Logs Aktivitas' },
          { id: 'firewall', label: 'Firewall IP Rules' },
          { id: '2fa', label: 'Two-Factor Authentication (2FA)' },
          { id: 'apikeys', label: 'Kunci Akses API (API Keys)' },
          { id: 'rbac', label: 'Matriks RBAC & Izin' },
          { id: 'tailscale', label: '⚡ Tailscale VPN & Remote SSH' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              <Filter className="h-3.5 w-3.5" />
              <span>Kategori:</span>
              {['ALL', 'AUTH', 'SERVER', 'HOSTING', 'BILLING', 'SECURITY', 'DNS'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setAuditFilter(cat)}
                  className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                    auditFilter === cat
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <span className="font-mono text-xs text-slate-400">
              {filteredLogs.length} Events Tercatat
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden w-full max-w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[620px]">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 font-sans">
                <tr>
                  <th className="px-5 py-3">Waktu & Tanggal</th>
                  <th className="px-5 py-3">Pengguna & Role</th>
                  <th className="px-5 py-3">Aksi Peristiwa</th>
                  <th className="px-5 py-3">IP Address</th>
                  <th className="px-5 py-3">Rincian Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-sans">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {log.userName}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">
                        {log.role}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{log.ipAddress}</td>
                    <td className="px-5 py-3 font-sans text-slate-700 dark:text-slate-300 max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Firewall Rules */}
      {activeTab === 'firewall' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Daftar Aturan IP Firewall ({firewallRules.length})
            </h4>
            <button
              onClick={() => setShowAddFwModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 shadow-xs"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Tambah Aturan IP</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden w-full max-w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 font-sans">
                <tr>
                  <th className="px-5 py-3">IP / Subnet CIDR</th>
                  <th className="px-5 py-3">Tipe Tindakan</th>
                  <th className="px-5 py-3">Alasan / Catatan Ancaman</th>
                  <th className="px-5 py-3">Total Block Hits</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {firewallRules.map(rule => (
                  <tr key={rule.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {rule.ipOrSubnet}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          rule.type === 'whitelist'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {rule.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-sans text-slate-600 dark:text-slate-300">
                      {rule.reason}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300">
                      {rule.hits.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-sans">
                      <button
                        onClick={() => handleDeleteFirewall(rule)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60"
                        title="Hapus Aturan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 2FA */}
      {activeTab === '2fa' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 max-w-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Autentikasi Dua Faktor (2FA TOTP)
              </h4>
              <p className="text-xs text-slate-400">
                Gunakan Google Authenticator atau Authy untuk memverifikasi login akun Anda.
              </p>
            </div>
            <button
              onClick={handleToggle2FA}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                currentUser.twoFactorEnabled
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {currentUser.twoFactorEnabled ? 'Matikan 2FA' : 'Aktifkan 2FA Sekarang'}
            </button>
          </div>

          {currentUser.twoFactorEnabled ? (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Akun Anda saat ini terlindungi dengan 2FA aktif</span>
              </div>

              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] text-slate-400">Secret Key Generator:</span>
                <div className="font-mono text-sm font-bold text-slate-900 dark:text-white tracking-widest">
                  {currentUser.twoFactorSecret || 'CP78A99BKZ22'}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Masukkan secret key di atas pada aplikasi Google Authenticator jika scanner kamera tidak tersedia.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
              Sangat disarankan untuk mengaktifkan 2FA untuk akun Administrator dan Reseller demi mencegah pengambilalihan akun akibat pencurian kata sandi.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: API Keys */}
      {activeTab === 'apikeys' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Kunci API Terdaftar ({apiKeys.length})
            </h4>
            <button
              onClick={() => setShowAddKeyModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 shadow-xs"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Buat API Key Baru</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden w-full max-w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 font-sans">
                <tr>
                  <th className="px-5 py-3">Label / Nama Kunci</th>
                  <th className="px-5 py-3">Token Masked</th>
                  <th className="px-5 py-3">Scope Izin</th>
                  <th className="px-5 py-3">Terakhir Digunakan</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {apiKeys.map(k => (
                  <tr key={k.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-sans font-semibold text-slate-900 dark:text-white">
                      {k.name}
                    </td>
                    <td className="px-5 py-3.5 text-purple-600 dark:text-purple-400">
                      {k.tokenMasked}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map(s => (
                          <span
                            key={s}
                            className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Belum pernah'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-sans">
                      <button
                        onClick={() => handleDeleteApiKey(k)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60"
                        title="Revoke Key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RBAC Matrix */}
      {activeTab === 'rbac' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden w-full max-w-full">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Role & Permission Access Matrix
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Hierarki isolasi akses antara Root Admin, Mitra Reseller, dan Pelanggan Akhir
            </p>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Modul / Kapabilitas Sistem</th>
                <th className="px-5 py-3 text-center">Root Administrator</th>
                <th className="px-5 py-3 text-center">Mitra Reseller</th>
                <th className="px-5 py-3 text-center">Pelanggan (Customer)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {[
                { name: 'Multi-Server Nodes & Daemons CRUD', admin: 'FULL', res: 'Stat View Only', cust: 'NO ACCESS' },
                { name: 'Manajemen Mitra Reseller & Kuota', admin: 'FULL', res: 'Own Balance Only', cust: 'NO ACCESS' },
                { name: 'Provisioning Akun Hosting (vHosts)', admin: 'FULL (Any Node)', res: 'Within Quota Limit', cust: 'Self-service Subdomain' },
                { name: 'cPanel File Manager, DB & Email', admin: 'Super Access', res: 'Impersonation Access', cust: 'FULL (Own Account)' },
                { name: 'White-Label Branding System', admin: 'System Setup', res: 'FULL Customization', cust: 'NO ACCESS' },
                { name: 'Global Billing & Payment Gateway', admin: 'Global Ledger', res: 'Deposit & Sub-Invoices', cust: 'Pay & View Invoices' },
                { name: 'Backup & 1-Click Restore', admin: 'Cluster Snapshots', res: 'Customer Snapshots', cust: 'Account Snapshots' },
                { name: 'Firewall IP Whitelist/Blacklist', admin: 'FULL Global Rules', res: 'NO ACCESS', cust: 'NO ACCESS' },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3 font-sans font-semibold text-slate-800 dark:text-slate-200">
                    {row.name}
                  </td>
                  <td className="px-5 py-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                    {row.admin}
                  </td>
                  <td className="px-5 py-3 text-center text-indigo-600 dark:text-indigo-400">
                    {row.res}
                  </td>
                  <td className="px-5 py-3 text-center text-slate-500">
                    {row.cust}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* TAB 6: Tailscale Mesh & Remote SSH Node */}
      {activeTab === 'tailscale' && (
        <TailscaleMeshNode />
      )}

      {/* Add Firewall Modal */}
      {showAddFwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tambah Aturan Firewall IP
            </h3>
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Tipe Aturan:
                </label>
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFwType('blacklist')}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
                      fwType === 'blacklist'
                        ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200'
                        : 'border-slate-200'
                    }`}
                  >
                    Blacklist (Blokir Akses)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFwType('whitelist')}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold ${
                      fwType === 'whitelist'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
                        : 'border-slate-200'
                    }`}
                  >
                    Whitelist (Izinkan Akses)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Alamat IP atau Subnet CIDR:
                </label>
                <input
                  type="text"
                  placeholder="contoh: 182.253.110.42 atau 10.0.0.0/16"
                  value={fwIp}
                  onChange={e => setFwIp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Alasan / Keterangan:
                </label>
                <input
                  type="text"
                  placeholder="contoh: Brute force login botnet"
                  value={fwReason}
                  onChange={e => setFwReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddFwModal(false)}
                className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddFirewall}
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 shadow-xs"
              >
                Simpan Aturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add API Key Modal */}
      {showAddKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Terbitkan API Key Baru
            </h3>
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Nama Identitas Kunci (Identifier):
                </label>
                <input
                  type="text"
                  placeholder="contoh: WHMCS Billing Integration"
                  value={keyName}
                  onChange={e => setKeyName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddKeyModal(false)}
                className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddApiKey}
                className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 shadow-xs"
              >
                Generate Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
