import React, { useState } from 'react';
import {
  Server,
  Globe,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  Save,
  PlusCircle,
  Trash2,
  Layers,
  ArrowRight,
  Info,
  Check,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import { PrivateNameserverConfig, ServerNode } from '../../types';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

export const PrivateNameserverManager: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast, confirmAction, refreshAll } = useServer();

  const [configs, setConfigs] = useState<PrivateNameserverConfig[]>(() => db.getNameserverConfigs());
  const [activeConfigId, setActiveConfigId] = useState<string>(() => {
    const def = db.getDefaultNameserverConfig();
    return def ? def.id : (configs[0]?.id || '');
  });

  const [serverNodes] = useState<ServerNode[]>(() => db.getServerNodes());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Edit / Form state
  const selectedConfig = configs.find(c => c.id === activeConfigId) || configs[0] || {
    id: `ns-cfg-${Date.now()}`,
    domain: 'denbaguse.my.id',
    ns1Host: 'ns1.denbaguse.my.id',
    ns1Ip: '103.147.154.21',
    ns2Host: 'ns2.denbaguse.my.id',
    ns2Ip: '103.253.212.88',
    dnssecEnabled: true,
    dnssecKeyTag: 23719,
    dnssecAlgorithm: 13,
    dnssecDigestType: 2,
    dnssecDigest: '48F82C99D34F181BAEF37C2F0E2A5D076E1B6833D224859A3BC85A094EE12A1B',
    soaEmail: 'hostmaster.denbaguse.my.id',
    defaultTtl: 3600,
    bindServiceStatus: 'active',
    isDefaultGlobal: true,
    updatedAt: new Date().toISOString(),
  };

  const [domain, setDomain] = useState(selectedConfig.domain);
  const [ns1Host, setNs1Host] = useState(selectedConfig.ns1Host);
  const [ns1Ip, setNs1Ip] = useState(selectedConfig.ns1Ip);
  const [ns1Ipv6, setNs1Ipv6] = useState(selectedConfig.ns1Ipv6 || '');
  const [ns2Host, setNs2Host] = useState(selectedConfig.ns2Host);
  const [ns2Ip, setNs2Ip] = useState(selectedConfig.ns2Ip);
  const [ns2Ipv6, setNs2Ipv6] = useState(selectedConfig.ns2Ipv6 || '');
  const [soaEmail, setSoaEmail] = useState(selectedConfig.soaEmail);
  const [defaultTtl, setDefaultTtl] = useState(selectedConfig.defaultTtl || 3600);
  const [dnssecEnabled, setDnssecEnabled] = useState(selectedConfig.dnssecEnabled);
  const [isDefaultGlobal, setIsDefaultGlobal] = useState(selectedConfig.isDefaultGlobal);

  // Live DNS Lookup Simulation State
  const [testDomain, setTestDomain] = useState('denbaguse.my.id');
  const [isTestingLookup, setIsTestingLookup] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    status: 'success' | 'warning' | 'idle';
    message: string;
    resolvedNs: string[];
    soaSerial: string;
    responseTimeMs: number;
  } | null>(null);

  if (!currentUser) return null;

  // Sync state when selection changes
  const handleSelectConfig = (cfg: PrivateNameserverConfig) => {
    setActiveConfigId(cfg.id);
    setDomain(cfg.domain);
    setNs1Host(cfg.ns1Host);
    setNs1Ip(cfg.ns1Ip);
    setNs1Ipv6(cfg.ns1Ipv6 || '');
    setNs2Host(cfg.ns2Host);
    setNs2Ip(cfg.ns2Ip);
    setNs2Ipv6(cfg.ns2Ipv6 || '');
    setSoaEmail(cfg.soaEmail);
    setDefaultTtl(cfg.defaultTtl || 3600);
    setDnssecEnabled(cfg.dnssecEnabled);
    setIsDefaultGlobal(cfg.isDefaultGlobal);
    setLookupResult(null);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast('info', 'Tersalin', `Teks disalin ke clipboard.`);
  };

  const handleDomainChange = (val: string) => {
    const clean = val.toLowerCase().replace(/https?:\/\//, '').replace(/\/.*$/, '').trim();
    setDomain(clean);
    setNs1Host(`ns1.${clean}`);
    setNs2Host(`ns2.${clean}`);
    setSoaEmail(`hostmaster.${clean}`);
  };

  const handleSave = () => {
    if (!domain.trim() || !ns1Host.trim() || !ns1Ip.trim() || !ns2Host.trim() || !ns2Ip.trim()) {
      showToast('error', 'Validasi Gagal', 'Domain utama, NS1, NS2, dan alamat IP wajib diisi.');
      return;
    }

    const updated: PrivateNameserverConfig = {
      ...selectedConfig,
      domain: domain.trim(),
      ns1Host: ns1Host.trim(),
      ns1Ip: ns1Ip.trim(),
      ns1Ipv6: ns1Ipv6.trim() || undefined,
      ns2Host: ns2Host.trim(),
      ns2Ip: ns2Ip.trim(),
      ns2Ipv6: ns2Ipv6.trim() || undefined,
      soaEmail: soaEmail.trim(),
      defaultTtl: Number(defaultTtl),
      dnssecEnabled,
      isDefaultGlobal,
      bindServiceStatus: 'active',
      updatedAt: new Date().toISOString(),
    };

    db.saveNameserverConfig(updated);
    db.logAction(
      currentUser,
      'NAMESERVER_CONFIG_SAVED',
      'DNS',
      `Menyimpan private nameserver ${ns1Host} (${ns1Ip}) & ${ns2Host} (${ns2Ip}) untuk ${domain}`
    );

    const updatedList = db.getNameserverConfigs();
    setConfigs(updatedList);
    showToast('success', 'Nameserver Disimpan', 'Konfigurasi BIND DNS cluster berhasil diperbarui.');
    refreshAll();
  };

  const handleSyncAllAccounts = () => {
    confirmAction({
      title: 'Sinkronisasi Seluruh Akun Hosting ke Private NS',
      message: `Perbarui seluruh zona DNS (${db.getHostingAccounts().length} akun) agar menggunakan ${ns1Host} dan ${ns2Host} secara otomatis?`,
      confirmText: 'Sync Semua Zona',
      isDanger: false,
      onConfirm: () => {
        const count = db.syncAllAccountsToNameserver({
          ...selectedConfig,
          ns1Host,
          ns2Host,
          defaultTtl,
        });
        showToast(
          'success',
          'Sinkronisasi Berhasil',
          `${count} akun hosting sekarang menggunakan nameserver ${ns1Host} & ${ns2Host}.`
        );
        refreshAll();
      },
    });
  };

  const handleTestLookup = () => {
    setIsTestingLookup(true);
    setLookupResult(null);

    setTimeout(() => {
      setIsTestingLookup(false);
      setLookupResult({
        status: 'success',
        message: `Query Authoritative DNS ke ${ns1Host} (${ns1Ip}) berhasil merespons status NOERROR.`,
        resolvedNs: [ns1Host, ns2Host],
        soaSerial: `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}01`,
        responseTimeMs: Math.floor(Math.random() * 18) + 12,
      });
      showToast('success', 'DNS Lookup Sukses', `Authoritative server ${ns1Host} aktif merespons.`);
    }, 900);
  };

  const totalHostingAccounts = db.getHostingAccounts().length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Private Nameserver & DNS Cluster Manager
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gunakan nameserver brand Anda sendiri (contoh: <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">ns1.{domain}</span> & <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">ns2.{domain}</span>) agar domain klien otomatis terhubung tanpa setting manual.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncAllAccounts}
            className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-300 transition-colors shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync ke Semua Akun ({totalHostingAccounts})</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Simpan Nameserver</span>
          </button>
        </div>
      </div>

      {/* IndiHome & Local Server IPv6 DDNS Architecture Guide */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-5 dark:border-sky-900/60 dark:bg-sky-950/20 text-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white font-bold text-xs">
            <Info className="h-4 w-4" />
          </div>
          <div className="space-y-2 flex-1">
            <h4 className="font-bold uppercase tracking-wider text-sky-900 dark:text-sky-200">
              Integrasi Server Lokal / IndiHome IPv6 DDNS &amp; Nameserver Klien
            </h4>
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed space-y-1.5">
              <p>
                <strong>Apakah nameserver klien bisa menggunakan domain Cloud PRO atau domain sendiri?</strong><br />
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">&bull; YA, BISA MENGGUNAKAN DOMAIN APA SAJA:</span> Anda bebas menggunakan domain server utama Anda (contoh: <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold text-sky-700 dark:text-sky-300">ns1.{domain}</code> &amp; <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold text-sky-700 dark:text-sky-300">ns2.{domain}</code>), domain resmi Cloud PRO (<code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold text-sky-700 dark:text-sky-300">ns1.cloudpro.id</code>), maupun domain brand reseller Anda.
              </p>
              <p>
                <strong>Karakteristik Jaringan IndiHome:</strong> Jaringan IndiHome menerapkan <em>CGNAT</em> pada IPv4 (IP privat), namun memberikan <strong>IP Publik Asli IPv6 (/64)</strong> yang bisa diakses langsung dari internet global. Agar seluruh pengunjung website klien (baik pengguna wifi/seluler IPv4 maupun IPv6) dapat membuka website tanpa terkendala, Cloud PRO mendukung 2 metode:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-xl border border-sky-200 bg-white/90 p-3 dark:border-sky-900 dark:bg-slate-900/90">
                  <div className="font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Metode 1: Cloudflare Dual-Stack (Direkomendasikan)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    Domain nameserver dipasang di Cloudflare dengan Proxy AAAA IPv6 aktif. Cloudflare otomatis menyediakan jembatan IPv4 + IPv6 global ke server lokal Anda.
                  </p>
                </div>
                <div className="rounded-xl border border-sky-200 bg-white/90 p-3 dark:border-sky-900 dark:bg-slate-900/90">
                  <div className="font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Metode 2: Cloudflare Zero Trust Tunnel</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    Aktifkan modul <code className="font-mono text-[10px]">cloudflared</code> bawaan Cloud PRO. Semua domain &amp; subdomain klien langsung tembus tanpa perlu IP Publik statis dan tanpa setting port-forwarding modem.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Step-by-Step for Glue Records */}
      <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-5 dark:border-teal-950 dark:bg-teal-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-xs">
            !
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
              Konfigurasi Glue Records (Child Nameservers) pada Registrar Domain
            </h4>
            <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed">
              Daftarkan alamat <strong>Glue Records (Child Nameservers)</strong> berikut pada panel manajemen registrar domain Anda untuk mengarahkan resolusi DNS ke cluster server ini:
            </p>

            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
              <div className="flex flex-col justify-between gap-2 rounded-xl border border-teal-200 bg-white p-3 dark:border-teal-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Primary Nameserver (NS1)</div>
                    <div className="mt-0.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {ns1Host}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(`${ns1Host} ${ns1Ip}${ns1Ipv6 ? ` ${ns1Ipv6}` : ''}`, 'ns1')}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Salin Glue Record NS1"
                  >
                    {copiedKey === 'ns1' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="space-y-0.5 font-mono text-[11px] border-t border-slate-100 pt-1.5 dark:border-slate-800">
                  <div className="text-teal-600 dark:text-teal-400">IPv4 (A): <strong>{ns1Ip}</strong></div>
                  {ns1Ipv6 && (
                    <div className="text-sky-600 dark:text-sky-400 truncate">IPv6 (AAAA): <strong>{ns1Ipv6}</strong></div>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between gap-2 rounded-xl border border-teal-200 bg-white p-3 dark:border-teal-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Secondary Nameserver (NS2)</div>
                    <div className="mt-0.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {ns2Host}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(`${ns2Host} ${ns2Ip}${ns2Ipv6 ? ` ${ns2Ipv6}` : ''}`, 'ns2')}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Salin Glue Record NS2"
                  >
                    {copiedKey === 'ns2' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="space-y-0.5 font-mono text-[11px] border-t border-slate-100 pt-1.5 dark:border-slate-800">
                  <div className="text-teal-600 dark:text-teal-400">IPv4 (A): <strong>{ns2Ip}</strong></div>
                  {ns2Ipv6 && (
                    <div className="text-sky-600 dark:text-sky-400 truncate">IPv6 (AAAA): <strong>{ns2Ipv6}</strong></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Settings Form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-2 space-y-5 text-xs">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-teal-500" />
              <span>Konfigurasi Authoritative Nameserver</span>
            </h4>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              BIND9 daemon di server node akan menerbitkan SOA dan NS record ini untuk setiap akun hosting baru.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Domain Utama Server / Brand: *
              </label>
              <input
                type="text"
                placeholder="denbaguse.my.id"
                value={domain}
                onChange={e => handleDomainChange(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="mt-1 block text-[10px] text-slate-400">
                Ubah domain ini untuk otomatis mengubah prefiks ns1 & ns2.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Email Kontak SOA (Zone Authority):
              </label>
              <input
                type="text"
                placeholder="hostmaster.denbaguse.my.id"
                value={soaEmail}
                onChange={e => setSoaEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="mt-1 block text-[10px] text-slate-400">
                Format SOA email menggunakan titik alih-alih tanda @.
              </span>
            </div>
          </div>

          {/* Nameserver Pair Inputs */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-4">
            <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Pasangan Nameserver (Cluster Nodes)</span>
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                BIND9 Sync Active
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Primary Host (NS1):
                </label>
                <input
                  type="text"
                  value={ns1Host}
                  onChange={e => setNs1Host(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  IP Target NS1 (A Record Glue - IPv4):
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={ns1Ip}
                    onChange={e => setNs1Ip(e.target.value)}
                    placeholder="103.147.154.21"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {serverNodes[0] && (
                    <button
                      type="button"
                      onClick={() => setNs1Ip(serverNodes[0].ipAddress)}
                      className="rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      title="Gunakan IP Server Node 1"
                    >
                      Node 1
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  IPv6 Target NS1 (AAAA Record Glue - Opsional):
                </label>
                <input
                  type="text"
                  value={ns1Ipv6}
                  onChange={e => setNs1Ipv6(e.target.value)}
                  placeholder="2001:db8::1 (Contoh IPv6 IndiHome / Server)"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Secondary Host (NS2):
                </label>
                <input
                  type="text"
                  value={ns2Host}
                  onChange={e => setNs2Host(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  IP Target NS2 (A Record Glue - IPv4):
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={ns2Ip}
                    onChange={e => setNs2Ip(e.target.value)}
                    placeholder="103.253.212.88"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {serverNodes[1] ? (
                    <button
                      type="button"
                      onClick={() => setNs2Ip(serverNodes[1].ipAddress)}
                      className="rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      title="Gunakan IP Server Node 2"
                    >
                      Node 2
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNs2Ip(ns1Ip)}
                      className="rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      title="Gunakan IP yang sama"
                    >
                      Samakan
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  IPv6 Target NS2 (AAAA Record Glue - Opsional):
                </label>
                <input
                  type="text"
                  value={ns2Ipv6}
                  onChange={e => setNs2Ipv6(e.target.value)}
                  placeholder="2001:db8::2 (Contoh IPv6 IndiHome / Server)"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Default TTL Zona (Detik):
              </label>
              <select
                value={defaultTtl}
                onChange={e => setDefaultTtl(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value={300}>300s (5 Menit - Propagasi Cepat)</option>
                <option value={3600}>3600s (1 Jam - Standar Direkomendasikan)</option>
                <option value={14400}>14400s (4 Jam)</option>
                <option value={86400}>86400s (24 Jam - Cache Maksimal)</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Jadikan NS Default Global</div>
                <div className="text-[10px] text-slate-400">Gunakan untuk semua akun hosting baru secara otomatis</div>
              </div>
              <input
                type="checkbox"
                checked={isDefaultGlobal}
                onChange={e => setIsDefaultGlobal(e.target.checked)}
                className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* DNSSEC Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="font-bold text-slate-900 dark:text-white">
                  DNSSEC Cryptographic Signing (ECDSA P-256)
                </span>
              </div>
              <input
                type="checkbox"
                checked={dnssecEnabled}
                onChange={e => setDnssecEnabled(e.target.checked)}
                className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
              />
            </div>

            {dnssecEnabled && selectedConfig.dnssecDigest && (
              <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 space-y-2 text-[11px]">
                <div className="text-slate-500">
                  Untuk mengaktifkan DNSSEC di registrar Anda, tambahkan <strong>DS Record</strong> berikut:
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                  <div>Key Tag: <span className="font-bold text-slate-900 dark:text-white">{selectedConfig.dnssecKeyTag}</span></div>
                  <div>Algoritma: <span className="font-bold text-slate-900 dark:text-white">13 (ECDSAP256SHA256)</span></div>
                  <div>Digest Type: <span className="font-bold text-slate-900 dark:text-white">2 (SHA-256)</span></div>
                </div>
                <div className="mt-1 flex items-center justify-between rounded bg-slate-100 p-2 font-mono text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300 overflow-x-auto">
                  <span>{selectedConfig.dnssecDigest}</span>
                  <button
                    onClick={() => handleCopy(selectedConfig.dnssecDigest || '', 'digest')}
                    className="ml-2 rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0"
                  >
                    {copiedKey === 'digest' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live DNS Checker & Instruction Summary */}
        <div className="space-y-6">
          {/* Live Query Tool */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <RefreshCw className="h-4 w-4 text-teal-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Tes Propagasi & Resolusi DNS
              </h4>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium">Domain Uji:</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={testDomain}
                    onChange={e => setTestDomain(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    onClick={handleTestLookup}
                    disabled={isTestingLookup}
                    className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
                  >
                    {isTestingLookup ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>Cek NS</span>
                    )}
                  </button>
                </div>
              </div>

              {lookupResult && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-[11px] dark:border-emerald-900 dark:bg-emerald-950/30 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Resolusi Berhasil ({lookupResult.responseTimeMs} ms)</span>
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-300 text-[10px]">
                    {lookupResult.message}
                  </p>
                  <div className="rounded-lg bg-white/80 p-2 font-mono text-[10px] text-slate-800 dark:bg-slate-900 dark:text-slate-200 space-y-0.5">
                    <div>SOA Serial: {lookupResult.soaSerial}</div>
                    <div>NS 1: {lookupResult.resolvedNs[0]}</div>
                    <div>NS 2: {lookupResult.resolvedNs[1]}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Client Instructions Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Info className="h-4 w-4 text-sky-500" />
              <span>Instruksi untuk Klien Anda</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Kirimkan instruksi berikut kepada pelanggan atau pembeli hosting Anda:
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 space-y-2 font-mono">
              <div className="font-sans font-semibold text-slate-900 dark:text-white text-xs">
                Arahkan Nameserver Domain Anda ke:
              </div>
              <div className="rounded bg-white p-1.5 dark:bg-slate-900 text-teal-600 dark:text-teal-400 font-bold flex justify-between items-center">
                <span>1. {ns1Host}</span>
                <button onClick={() => handleCopy(ns1Host, 'c-ns1')} className="text-slate-400 hover:text-slate-600">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="rounded bg-white p-1.5 dark:bg-slate-900 text-teal-600 dark:text-teal-400 font-bold flex justify-between items-center">
                <span>2. {ns2Host}</span>
                <button onClick={() => handleCopy(ns2Host, 'c-ns2')} className="text-slate-400 hover:text-slate-600">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 leading-relaxed">
              Propagasi biasanya memakan waktu antara 10 menit hingga 24 jam tergantung ISP klien.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
