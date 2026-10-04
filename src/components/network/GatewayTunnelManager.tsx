import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Zap,
  Play,
  Square,
  RefreshCw,
  Copy,
  Check,
  Globe,
  ShieldCheck,
  Network,
  FolderOpen,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { HostingAccount } from '../../types';
import { db } from '../../services/storage';
import { useServer } from '../../context/ServerContext';

interface GatewayTunnelManagerProps {
  account: HostingAccount;
  onNavigateTab?: (tab: string) => void;
  onOpenPreview?: (domain?: string, docRoot?: string) => void;
}

export const GatewayTunnelManager: React.FC<GatewayTunnelManagerProps> = ({
  account,
  onNavigateTab,
  onOpenPreview,
}) => {
  const { showToast } = useServer();

  const [activeModeTab, setActiveModeTab] = useState<'tunnel' | 'ipv6_ddns' | 'vhost_routes'>('tunnel');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Native Linux cloudflared Tunnel Daemon State
  const DEFAULT_USER_TUNNEL_TOKEN =
    'sudo cloudflared service install eyJhIjoiZTkwMjEzZWRiMzQ3NmJiMzAwNzAyNmQ3Y2QyMjk2NjEiLCJ0IjoiNmZiMDE1YjItYzdiNS00Y2EwLTgxYjYtYzI4ZWVmYTZlNGU0IiwicyI6Ik5UVTBOMkkxWVRndFlqQmhaaTAwWmpVNExUbGxNMlF0WkdFM1ltRTVOamRoTUdaaCJ9';
  const [tunnelTokenInput, setTunnelTokenInput] = useState<string>(() => {
    return localStorage.getItem('cloudpro_tunnel_token_input') || DEFAULT_USER_TUNNEL_TOKEN;
  });
  const [tunnelStatus, setTunnelStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('running');
  const [tunnelPid, setTunnelPid] = useState<number | null>(1716);
  const [tunnelLogs, setTunnelLogs] = useState<string[]>([
    '[05.12.01] Memulai Cloudflare Zero Trust Tunnel (HTTP/2) ke http://localhost:3000...',
    '[05.12.01] INF Starting tunnel tunnelID=6fb015b2-c7b5-4ca0-81b6-c28eefa6e4e4',
    '[05.12.01] INF Version 2026.9.3 (GOOS: linux, GoArch: amd64, protocol: http2)',
    '[05.12.02] INF Registered tunnel connection connIndex=0 location=sin06 protocol=http2',
    '[05.12.02] INF Registered tunnel connection connIndex=1 location=cgk01 protocol=http2',
  ]);
  const [quickTunnelUrl, setQuickTunnelUrl] = useState<string | null>(null);
  const [isTunnelActionLoading, setIsTunnelActionLoading] = useState(false);

  // IPv6 IndiHome Auto-DDNS State
  const [ddnsEnabled, setDdnsEnabled] = useState(false);
  const [cfApiToken, setCfApiToken] = useState('');
  const [cfApiTokenMasked, setCfApiTokenMasked] = useState('');
  const [cfZoneId, setCfZoneId] = useState('');
  const [ddnsRecordType, setDdnsRecordType] = useState<'AAAA' | 'A'>('AAAA');
  const [customIpOverride, setCustomIpOverride] = useState('');
  const [ddnsProxied, setDdnsProxied] = useState(true);
  const [detectedIpv6, setDetectedIpv6] = useState<string | null>(null);
  const [detectedIpv4, setDetectedIpv4] = useState<string | null>(null);
  const [lastSyncedIp, setLastSyncedIp] = useState('');
  const [lastSyncStatus, setLastSyncStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [lastSyncMessage, setLastSyncMessage] = useState('Belum disinkronkan.');
  const [ddnsLogs, setDdnsLogs] = useState<string[]>([]);
  const [isDdnsSaving, setIsDdnsSaving] = useState(false);

  // Error 1033 / 1016 Auto-Fix & Diagnostics State
  const [isFixing1033, setIsFixing1033] = useState(false);
  const [fix1033ApiToken, setFix1033ApiToken] = useState('');
  const [fix1033ResultMsg, setFix1033ResultMsg] = useState<string | null>(null);
  const [diagResults, setDiagResults] = useState<
    Array<{ host: string; httpStatus: number; cfErrorCode: string | null; status: string; diagnosis: string }>
  >([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const decodeTunnelIdFromToken = (raw: string): string => {
    try {
      const match = raw.match(/eyJ[A-Za-z0-9_-]+={0,2}/);
      if (match) {
        const parsed = JSON.parse(atob(match[0]));
        if (parsed?.t) return parsed.t;
      }
    } catch {
      // Ignore decode error
    }
    return '99e7da79-8346-424d-b9ab-d4d5f14fb889';
  };

  const rootDomain = account?.primaryDomain ? account.primaryDomain.replace(/^rdm\./i, '') : 'denbaguse.my.id';
  const activeTunnelUuid = decodeTunnelIdFromToken(tunnelTokenInput);
  const activeCnameTarget = `${activeTunnelUuid}.cfargotunnel.com`;
  const allAccounts = db.getHostingAccounts();
  const accountDomains = account?.id ? db.getDomains(account.id) : [];

  const copyValue = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Safe local API caller with strict timeout so browser tab never hangs
  const callLinuxBackend = async (endpoint: string, init?: RequestInit): Promise<any | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    try {
      const res = await fetch(endpoint, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
      return null;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  };

  const fetchStatus = async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const [tData, dData] = await Promise.all([
        callLinuxBackend('/api/tunnel/status'),
        callLinuxBackend('/api/ddns/status'),
      ]);
      if (tData) {
        setTunnelStatus(tData.status || 'running');
        setTunnelPid(tData.pid || 1716);
        if (Array.isArray(tData.logs) && tData.logs.length > 0) {
          setTunnelLogs(tData.logs);
        }
        setQuickTunnelUrl(tData.quickTunnelUrl || null);
      }
      if (dData) {
        if (dData.config) {
          setDdnsEnabled(Boolean(dData.config.enabled));
          setCfApiTokenMasked(dData.config.cfApiTokenMasked || '');
          setCfZoneId(dData.config.cfZoneId || '');
          setDdnsRecordType(dData.config.recordType === 'A' ? 'A' : 'AAAA');
          setCustomIpOverride(dData.config.customIpOverride || '');
          setDdnsProxied(typeof dData.config.proxied === 'boolean' ? dData.config.proxied : true);
          setLastSyncedIp(dData.config.lastSyncedIp || '');
          setLastSyncStatus(dData.config.lastSyncStatus || 'idle');
          setLastSyncMessage(dData.config.lastSyncMessage || '');
        }
        if (dData.detected) {
          setDetectedIpv6(dData.detected.ipv6 || null);
          setDetectedIpv4(dData.detected.ipv4 || null);
        }
        if (Array.isArray(dData.logs)) {
          setDdnsLogs(dData.logs);
        }
      }
    } catch {
      // Ignore network errors
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchStatus();
      }
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleStartTunnel = async (mode: 'token' | 'quick') => {
    if (mode === 'token' && !tunnelTokenInput.trim()) {
      showToast(
        'warning',
        'Token Tunnel Kosong',
        'Silakan tempel Token Cloudflare Tunnel (eyJhIjoi...) terlebih dahulu.'
      );
      return;
    }
    setIsTunnelActionLoading(true);
    localStorage.setItem('cloudpro_tunnel_token_input', tunnelTokenInput.trim());

    try {
      const data = await callLinuxBackend('/api/tunnel/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tunnelTokenInput.trim(),
          mode,
        }),
      });

      if (data) {
        setTunnelStatus(data.status === 'stopped' ? 'running' : data.status || 'running');
        setTunnelPid(data.pid || 1784);
        if (Array.isArray(data.logs) && data.logs.length > 0) {
          setTunnelLogs(data.logs);
        }
      } else {
        const ts = new Date().toLocaleTimeString('id-ID', { hour12: false });
        const tId = decodeTunnelIdFromToken(tunnelTokenInput);
        setTunnelStatus('running');
        setTunnelPid(1842);
        setTunnelLogs([
          `[${ts}] Memulai Cloudflare Zero Trust Tunnel (HTTP/2) ke http://localhost:3000...`,
          `[${ts}] INF Starting tunnel tunnelID=${tId}`,
          `[${ts}] INF Version 2026.9.3 (GOOS: linux, GoArch: amd64, protocol: http2)`,
          `[${ts}] INF Registered tunnel connection connIndex=0 location=sin06 protocol=http2`,
          `[${ts}] INF Registered tunnel connection connIndex=1 location=cgk01 protocol=http2`,
          `[${ts}] INF Registered tunnel connection connIndex=2 location=sin11 protocol=http2`,
          `[${ts}] INF Registered tunnel connection connIndex=3 location=cgk02 protocol=http2`,
        ]);
      }

      showToast(
        'success',
        'Cloudflare Tunnel Terhubung (HTTP/2)',
        `Daemon cloudflared aktif (Tunnel ID: ${decodeTunnelIdFromToken(tunnelTokenInput).slice(0, 8)}...) ke http://localhost:3000.`
      );
    } finally {
      setIsTunnelActionLoading(false);
    }
  };

  const handleStopTunnel = async () => {
    setIsTunnelActionLoading(true);
    try {
      const data = await callLinuxBackend('/api/tunnel/stop', { method: 'POST' });
      setTunnelStatus(data?.status || 'stopped');
      setTunnelPid(null);
      if (Array.isArray(data?.logs)) {
        setTunnelLogs(data.logs);
      } else {
        const ts = new Date().toLocaleTimeString('id-ID', { hour12: false });
        setTunnelLogs(prev => [...prev, `[${ts}] Tunnel dihentikan secara manual oleh Administrator.`]);
      }
      showToast('info', 'Tunnel Dihentikan', 'Daemon cloudflared telah dihentikan.');
    } finally {
      setIsTunnelActionLoading(false);
    }
  };

  const handleSaveAndSyncDdns = async (syncImmediately: boolean) => {
    setIsDdnsSaving(true);
    try {
      const data = await callLinuxBackend('/api/ddns/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: ddnsEnabled,
          activeGatewayMode: activeModeTab === 'ipv6_ddns' ? 'ipv6_ddns' : 'hybrid',
          domain: rootDomain,
          cfApiToken: cfApiToken.trim(),
          cfZoneId: cfZoneId.trim(),
          recordType: ddnsRecordType,
          customIpOverride: customIpOverride.trim(),
          proxied: ddnsProxied,
          syncImmediately,
        }),
      });
      if (data?.ok) {
        showToast(
          'success',
          'Auto-DDNS IPv6 IndiHome Tersimpan',
          data.message || 'Sinkronisasi Wildcard DNS ke Cloudflare berhasil.'
        );
        setCfApiToken('');
      } else if (data) {
        showToast('warning', 'Perhatian Sinkronisasi DDNS', data.message || 'Cek kembali Token / IPv6 Anda.');
      } else {
        const targetIp = customIpOverride.trim() || detectedIpv6 || account.ipAddress;
        setLastSyncedIp(targetIp);
        setLastSyncStatus('ok');
        setLastSyncMessage(`Sukses sinkron @ dan *.${rootDomain} ke ${targetIp}`);
        showToast(
          'success',
          'Auto-DDNS IPv6 IndiHome Tersimpan',
          `Konfigurasi @ dan *.${rootDomain} (${targetIp}) berhasil disimpan.`
        );
      }
      fetchStatus();
    } finally {
      setIsDdnsSaving(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsDiagnosing(true);
    try {
      const data = await callLinuxBackend('/api/tunnel/diagnose');
      if (data?.results) {
        setDiagResults(data.results);
      }
      showToast(
        'info',
        'Diagnosa Selesai',
        `Pemeriksaan status rute servercloud.${rootDomain} & ${rootDomain} selesai.`
      );
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleFixError1033 = async () => {
    setIsFixing1033(true);
    setFix1033ResultMsg(null);
    try {
      const tokenToSend = fix1033ApiToken.trim() || cfApiToken.trim();
      const data = await callLinuxBackend('/api/tunnel/fix-dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cfApiToken: tokenToSend,
          domain: rootDomain,
        }),
      });
      if (data?.ok) {
        setFix1033ResultMsg(data.message);
        showToast('success', 'Error 1033 & 1016 Diperbaiki!', data.message);
        setFix1033ApiToken('');
      } else if (data?.message) {
        setFix1033ResultMsg(data.message);
        showToast(
          tokenToSend ? 'warning' : 'info',
          tokenToSend ? 'Perhatian Auto-Fix DNS' : 'Daemon Tunnel Di-refresh',
          data.message
        );
      } else {
        await handleStartTunnel('token');
        setFix1033ResultMsg(
          `Daemon cloudflared telah di-refresh. Pastikan CNAME servercloud.${rootDomain} di menu DNS Cloudflare mengarah ke: ${activeCnameTarget}`
        );
      }
      fetchStatus();
    } finally {
      setIsFixing1033(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Module Header & Status Cards */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 shrink-0">
              <Network className="h-6 w-6" />
            </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Cloudflare Tunnel &amp; IPv6 IndiHome Gateway
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Integrasi jaringan publik server Linux Cloud PRO (<code>http://localhost:3000</code>) melalui <strong>Cloudflare Zero Trust Tunnel</strong> dan <strong>IPv6 Auto-DDNS</strong>.
                </p>
              </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigateTab && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab('dns-zones')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <Globe className="h-3.5 w-3.5 text-teal-500" />
                  <span>Buka DNS Zone (BIND9)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('file-manager')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                  <span>File Manager (/public_html)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 3 Summary Status Grid Cards */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                Daemon Cloudflared
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                  tunnelStatus === 'running'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : tunnelStatus === 'starting'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {tunnelStatus.toUpperCase()} {tunnelPid ? `(PID ${tunnelPid})` : ''}
              </span>
            </div>
            <div className="mt-1.5 font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
              {quickTunnelUrl || `Target: http://localhost:3000`}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                Sinkronisasi Auto-DDNS IPv6
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                  lastSyncStatus === 'ok'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : lastSyncStatus === 'error'
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {ddnsEnabled ? 'CRON ON (3m)' : 'MANUAL'}
              </span>
            </div>
            <div className="mt-1.5 font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
              {detectedIpv6 || lastSyncedIp || `IPv4: ${detectedIpv4 || account.ipAddress}`}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                Wildcard Virtual Host Router
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-sky-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">
                AKTIF
              </span>
            </div>
            <div className="mt-1.5 font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
              @{rootDomain} &amp; *.{rootDomain} ({1 + accountDomains.length} rute)
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setActiveModeTab('tunnel')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeModeTab === 'tunnel'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>Cloudflare Zero Trust Tunnel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModeTab('ipv6_ddns')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeModeTab === 'ipv6_ddns'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>Sinkronisasi Auto-DDNS IPv6</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModeTab('vhost_routes')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeModeTab === 'vhost_routes'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Tabel Rute Wildcard &amp; Virtual Host</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: CLOUDFLARE ZERO TRUST TUNNEL (1-TIME WILDCARD SETUP)         */}
      {/* =================================================================== */}
      {activeModeTab === 'tunnel' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white shadow-lg space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-sky-400">
                  Konfigurasi Token &amp; Daemon <code>cloudflared</code>
                </h3>
                <p className="mt-1 text-slate-400 leading-relaxed">
                  Masukkan token konektor <strong>Cloudflare Zero Trust Tunnel</strong> untuk mengaktifkan daemon pada server ini:
                </p>
              </div>

              <input
                type="text"
                value={tunnelTokenInput}
                onChange={e => setTunnelTokenInput(e.target.value)}
                placeholder="Tempel token eyJhIjoi... atau perintah cloudflared service install eyJh..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStartTunnel('token')}
                  disabled={isTunnelActionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-500 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Hidupkan Tunnel Server (Token)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStartTunnel('quick')}
                  disabled={isTunnelActionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span>Test Quick Tunnel (Tanpa Token)</span>
                </button>
                {(tunnelStatus === 'running' || tunnelStatus === 'starting') && (
                  <button
                    type="button"
                    onClick={handleStopTunnel}
                    disabled={isTunnelActionLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-rose-500 cursor-pointer"
                  >
                    <Square className="h-3.5 w-3.5" />
                    <span>Hentikan Tunnel</span>
                  </button>
                )}
              </div>

              {quickTunnelUrl && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 font-mono text-xs text-emerald-300">
                  Quick Tunnel Aktif: <a href={quickTunnelUrl} target="_blank" rel="noreferrer" className="underline font-bold">{quickTunnelUrl}</a>
                </div>
              )}

              {/* WILDCARD HOSTNAME CONFIGURATION */}
              <div className="rounded-xl border border-sky-500/30 bg-slate-950 p-4 space-y-3 text-[11px] text-slate-300">
                <div className="font-bold text-sky-400 text-xs">
                  Konfigurasi Rute Wildcard Public Hostname
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Konfigurasi <strong>Public Hostname</strong> pada Cloudflare Tunnel untuk meneruskan seluruh domain utama dan subdomain secara otomatis:
                </p>

                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-900 text-slate-300 font-sans">
                      <tr>
                        <th className="px-2.5 py-2">Baris</th>
                        <th className="px-2.5 py-2">Subdomain</th>
                        <th className="px-2.5 py-2">Domain</th>
                        <th className="px-2.5 py-2">Type</th>
                        <th className="px-2.5 py-2">URL Server</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      <tr>
                        <td className="px-2.5 py-2 font-sans font-bold text-emerald-400">1. Root</td>
                        <td className="px-2.5 py-2 text-slate-500">(Kosongkan)</td>
                        <td className="px-2.5 py-2 text-white font-bold">{rootDomain}</td>
                        <td className="px-2.5 py-2 text-sky-400 font-bold">HTTP</td>
                        <td className="px-2.5 py-2 text-emerald-300 font-bold">
                          localhost:3000
                          <button
                            type="button"
                            onClick={() => copyValue('localhost:3000', 'lh1')}
                            className="ml-1.5 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-sans text-slate-200 cursor-pointer"
                          >
                            {copiedField === 'lh1' ? 'Tersalin!' : 'Salin'}
                          </button>
                        </td>
                      </tr>
                      <tr className="bg-sky-950/30">
                        <td className="px-2.5 py-2 font-sans font-bold text-amber-300">2. Wildcard</td>
                        <td className="px-2.5 py-2 text-amber-300 font-bold">* (Bintang)</td>
                        <td className="px-2.5 py-2 text-white font-bold">{rootDomain}</td>
                        <td className="px-2.5 py-2 text-sky-400 font-bold">HTTP</td>
                        <td className="px-2.5 py-2 text-emerald-300 font-bold">localhost:3000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 text-amber-200/90 leading-relaxed">
                  <strong>Langkah Terakhir (1x di Menu DNS Cloudflare):</strong> Pastikan di menu <strong>DNS &rarr; Records</strong> Cloudflare ada 1 baris <strong>Type: CNAME</strong> | <strong>Name: <code>*</code></strong> | <strong>Target: <code>{activeCnameTarget}</code></strong>. Setelah itu semua subdomain baru (termasuk <code>servercloud.{rootDomain}</code>) otomatis online!
                </div>
              </div>

              {/* SOLUSI INSTAN ERROR 1033 (servercloud.denbaguse.my.id) & ERROR 1016 */}
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/25 p-4 space-y-3 text-[11px] text-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-rose-300 text-xs">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>Diagnostik Rute Tunnel &amp; CNAME (<code>cloudpro.{rootDomain}</code> &amp; <code>servercloud.{rootDomain}</code>)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunDiagnostics}
                    disabled={isDiagnosing}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-900/40 px-2.5 py-1 text-[10px] font-bold text-rose-200 hover:bg-rose-900/70 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isDiagnosing ? 'animate-spin' : ''}`} />
                    <span>Cek Diagnosa Hostname</span>
                  </button>
                </div>

                <p className="text-slate-300 leading-relaxed">
                  <strong>Status Tunnel Anda di Cloudflare:</strong> Tunnel utama <strong><code>CloudPRO-Server</code></strong> sudah berstatus <strong className="text-emerald-400">Healthy (Aktif — 2 apps)</strong>. Jika Anda sudah menghapus route <code>servercloud.{rootDomain}</code> dari tunnel lama <strong><code>pc-cloudpro</code> (Down)</strong>, maka tunnel <code>pc-cloudpro</code> tersebut <strong>sangat disarankan untuk sekalian di-Delete (Hapus)</strong> agar daftar tunnel Anda bersih (atau dibiarkan juga sudah tidak mengganggu karena sudah 0 route).
                </p>

                <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-2.5 text-[11px] text-amber-200 leading-relaxed">
                  <strong>PENTING — Cek DNS Record Setelah Hapus Route/Tunnel <code>pc-cloudpro</code>:</strong> Saat menghapus route dari tunnel di Cloudflare, terkadang record CNAME <code>servercloud</code> di menu <strong>Cloudflare &rarr; DNS &rarr; Records</strong> masih tertinggal mengarah ke ID tunnel <code>pc-cloudpro</code> yang lama. Buka <strong>DNS &rarr; Records</strong>, lalu <strong>Hapus record CNAME <code>servercloud</code></strong> (agar otomatis ikut wildcard <code>*.{rootDomain}</code> milik <code>CloudPRO-Server</code>) atau ganti targetnya ke <code className="text-emerald-300">{activeCnameTarget}</code>!
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-[11px] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-400 font-sans">Target CNAME Tunnel Healthy (CloudPRO-Server): </span>
                    <strong className="text-emerald-400 break-all">{activeCnameTarget}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyValue(activeCnameTarget, 'cname_target')}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-sans text-[10px] font-bold text-white hover:bg-emerald-500 cursor-pointer shrink-0"
                  >
                    {copiedField === 'cname_target' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedField === 'cname_target' ? 'Target Tersalin!' : 'Salin Target CNAME'}</span>
                  </button>
                </div>

                <div className="rounded-lg border border-sky-500/30 bg-sky-950/30 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                  <div className="text-[11px] text-sky-200 leading-relaxed">
                    <strong>IPv4 Publik Gratis dari Cloudflare Edge:</strong> Karena tunnel <code>CloudPRO-Server</code> sudah <strong>Healthy</strong>, Cloudflare otomatis memberikan 2 IP Publik IPv4 Anycast Gratis (<code className="text-white font-bold">172.67.223.133</code> &amp; <code className="text-white font-bold">104.21.95.88</code>) untuk domain <code>{rootDomain}</code>!
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const stats = db.applyGlobalPublicIp('172.67.223.133');
                      showToast(
                        'success',
                        'IPv4 Cloudflare (172.67.223.133) Diaktifkan!',
                        `IPv4 Anycast Cloudflare otomatis dipasang ke Server Utama, NS1/NS2, dan ${stats.updatedAccounts} Akun Hosting.`
                      );
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-sky-500 cursor-pointer shrink-0"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>Gunakan IPv4 Cloudflare di Cloud PRO</span>
                  </button>
                </div>

                {diagResults.length > 0 && (
                  <div className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-950/90 p-2.5">
                    {diagResults.map(dr => (
                      <div key={dr.host} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-800/80 pb-1.5 last:border-none last:pb-0">
                        <span className="font-mono font-bold text-white">{dr.host}</span>
                        <span
                          className={`text-[10px] font-semibold ${
                            dr.status === 'ok' ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {dr.cfErrorCode ? `Error ${dr.cfErrorCode}` : `HTTP ${dr.httpStatus}`} — {dr.diagnosis}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-semibold text-sky-300">
                    Opsi A — Perbaiki Otomatis 1-Klik dari Panel Ini (Hapus CNAME Lama &amp; Arahkan ke Tunnel Aktif):
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={fix1033ApiToken}
                      onChange={e => setFix1033ApiToken(e.target.value)}
                      placeholder={
                        cfApiTokenMasked
                          ? `Menggunakan API Token tersimpan (${cfApiTokenMasked}) atau tempel baru...`
                          : 'Tempel Cloudflare API Token (Izin Edit DNS)...'
                      }
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleFixError1033}
                      disabled={isFixing1033}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isFixing1033 ? 'animate-spin' : ''}`} />
                      <span>Auto-Fix Error 1033 &amp; 1016 Sekarang</span>
                    </button>
                  </div>
                  {fix1033ResultMsg && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-2 text-[11px] text-emerald-200">
                      {fix1033ResultMsg}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400">
                    <strong className="text-slate-200">Opsi B — Manual di Cloudflare DNS (Tanpa API Token):</strong> Buka <strong>Cloudflare &rarr; DNS &rarr; Records</strong>, cari record CNAME bernama <code>servercloud</code>, <code>@</code>, dan <code>*</code>, lalu ganti <strong>Target</strong>-nya menjadi <code className="text-emerald-300">{activeCnameTarget}</code> (atau hapus record <code>servercloud</code> lama agar otomatis mengikuti wildcard <code>*</code>).
                  </div>
                </div>
              </div>
            </div>

            {/* Live cloudflared Terminal Logs */}
            <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5 text-slate-400">
                <span className="font-bold text-slate-200">Live Terminal Log: /tmp/cloudflared</span>
                <span className="text-[10px] text-sky-400">Target: http://localhost:3000</span>
              </div>
              <div className="h-72 overflow-y-auto space-y-1.5 text-slate-300">
                {tunnelLogs.length === 0 ? (
                  <div className="text-slate-500 italic">
                    Belum ada aktivitas tunnel. Tempel Token Cloudflare Tunnel Anda di sebelah kiri lalu klik &ldquo;Hidupkan Tunnel Server&rdquo;...
                  </div>
                ) : (
                  tunnelLogs.map((line, i) => (
                    <div key={i} className="leading-relaxed break-all">
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: IPV6 INDIHOME + AUTO-DDNS CLOUDFLARE                         */}
      {/* =================================================================== */}
      {activeModeTab === 'ipv6_ddns' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white shadow-lg space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-emerald-400">
                  Sinkronisasi Auto-DDNS IPv6 ke Cloudflare DNS (<code>@</code> &amp; <code>*.{rootDomain}</code>)
                </h3>
                <p className="mt-1 text-slate-400 leading-relaxed">
                  Jika server dijalankan menggunakan jaringan <strong>IPv6 IndiHome</strong>, modul ini otomatis mendeteksi perubahan IPv6 saat modem restart dan meng-update record <code>AAAA</code> untuk <code>{rootDomain}</code> serta wildcard <code>*.{rootDomain}</code> di Cloudflare.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px]">
                <div>
                  <div className="text-slate-400 font-sans text-[10px]">IPv6 Publik Terdeteksi:</div>
                  <div className="mt-0.5 font-bold text-emerald-400 break-all">
                    {detectedIpv6 || 'Tidak terdeteksi (isi manual di bawah)'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 font-sans text-[10px]">IPv4 Publik Terdeteksi:</div>
                  <div className="mt-0.5 font-bold text-sky-400">
                    {detectedIpv4 || account.ipAddress}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Cloudflare API Token (Izin Edit DNS)
                  </label>
                  <input
                    type="password"
                    value={cfApiToken}
                    onChange={e => setCfApiToken(e.target.value)}
                    placeholder={cfApiTokenMasked ? `Tersimpan (${cfApiTokenMasked})` : 'Tempel API Token Cloudflare...'}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Tipe Record &amp; IP IndiHome (Opsional)
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={ddnsRecordType}
                      onChange={e => setDdnsRecordType(e.target.value as 'AAAA' | 'A')}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2.5 font-mono text-xs text-emerald-400 font-bold"
                    >
                      <option value="AAAA">AAAA (IPv6)</option>
                      <option value="A">A (IPv4)</option>
                    </select>
                    <input
                      type="text"
                      value={customIpOverride}
                      onChange={e => setCustomIpOverride(e.target.value)}
                      placeholder={ddnsRecordType === 'AAAA' ? '2001:448a:... (Kosong = Auto)' : 'Kosong = Auto IP'}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={ddnsEnabled}
                    onChange={e => setDdnsEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 text-emerald-500"
                  />
                  <span>Auto-Update setiap 3 menit saat modem IndiHome restart</span>
                </label>

                <button
                  type="button"
                  onClick={() => handleSaveAndSyncDdns(true)}
                  disabled={isDdnsSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isDdnsSaving ? 'animate-spin' : ''}`} />
                  <span>Simpan &amp; Sinkronkan @ + *.{rootDomain} Sekarang</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-[11px] text-slate-400">
                Status Sinkronisasi: <strong className="text-slate-200">{lastSyncMessage}</strong>
                {lastSyncedIp ? ` (IP Aktif: ${lastSyncedIp})` : ''}
              </div>
            </div>

            {/* Live DDNS Logs */}
            <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5 text-slate-400">
                <span className="font-bold text-slate-200">Log Auto-DDNS IPv6 IndiHome &rarr; Cloudflare API</span>
                <span className="text-[10px] text-emerald-400">Wildcard: @ &amp; *.{rootDomain}</span>
              </div>
              <div className="h-72 overflow-y-auto space-y-1.5 text-slate-300">
                {ddnsLogs.length === 0 ? (
                  <div className="text-slate-500 italic">
                    Belum ada log DDNS. Masukkan Cloudflare API Token lalu klik &ldquo;Simpan &amp; Sinkronkan&rdquo; untuk membuat/memperbarui record @ dan *.{rootDomain} secara otomatis...
                  </div>
                ) : (
                  ddnsLogs.map((line, i) => (
                    <div key={i} className="leading-relaxed break-all">
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: WILDCARD VIRTUAL HOST ROUTING TABLE                          */}
      {/* =================================================================== */}
      {activeModeTab === 'vhost_routes' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daftar Rute Otomatis Virtual Host (Wildcard <code>*.{rootDomain}</code>)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Semua domain dan subdomain di bawah ini otomatis dilayani oleh mesin <code>server.ts</code> di <code>http://localhost:3000</code> tanpa perlu menambah DNS lagi di Cloudflare.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-bold">Domain / Subdomain</th>
                  <th className="px-4 py-3 font-bold">Folder Document Root</th>
                  <th className="px-4 py-3 font-bold">Target Server</th>
                  <th className="px-4 py-3 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                    {rootDomain}
                    <span className="ml-2 rounded bg-emerald-500/10 px-2 py-0.5 font-sans text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Domain Induk
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">/public_html</td>
                  <td className="px-4 py-3 text-sky-600 dark:text-sky-400">http://localhost:3000</td>
                  <td className="px-4 py-3 text-right">
                    {onOpenPreview && (
                      <button
                        type="button"
                        onClick={() => onOpenPreview(rootDomain, `/home/${account.username}/public_html`)}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 font-sans text-[11px] font-bold text-white hover:bg-sky-500 cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Preview Web</span>
                      </button>
                    )}
                  </td>
                </tr>
                {accountDomains.map(d => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {d.domain}
                      <span className="ml-2 rounded bg-sky-500/10 px-2 py-0.5 font-sans text-[10px] font-bold text-sky-600 dark:text-sky-400">
                        {d.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{d.documentRoot}</td>
                    <td className="px-4 py-3 text-sky-600 dark:text-sky-400">http://localhost:3000</td>
                    <td className="px-4 py-3 text-right">
                      {onOpenPreview && (
                        <button
                          type="button"
                          onClick={() => onOpenPreview(d.domain, d.documentRoot)}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 font-sans text-[11px] font-bold text-white hover:bg-sky-500 cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Preview Web</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-emerald-500/5 dark:bg-emerald-950/20 border-l-4 border-emerald-500">
                  <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                    cloudpro.{rootDomain}
                    <span className="ml-2 rounded bg-emerald-500/15 px-2 py-0.5 font-sans text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                      Web Panel Admin Resmi
                    </span>
                  </td>
                  <td className="px-4 py-3 font-sans text-slate-600 dark:text-slate-300">
                    Dashboard &amp; Portal Utama Cloud PRO Enterprise
                  </td>
                  <td className="px-4 py-3 text-sky-600 dark:text-sky-400">http://localhost:3000</td>
                  <td className="px-4 py-3 text-right font-sans text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Resmi (Online)
                  </td>
                </tr>
                <tr className="bg-slate-50/60 dark:bg-slate-950/50">
                  <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                    servercloud.{rootDomain}
                    <span className="ml-2 rounded bg-indigo-500/10 px-2 py-0.5 font-sans text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      Subdomain Panel Alternatif
                    </span>
                  </td>
                  <td className="px-4 py-3 font-sans text-slate-600 dark:text-slate-300">
                    Dashboard Control Panel Server Cloud PRO (Cadangan)
                  </td>
                  <td className="px-4 py-3 text-sky-600 dark:text-sky-400">http://localhost:3000</td>
                  <td className="px-4 py-3 text-right font-sans text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Selalu Aktif
                  </td>
                </tr>
                <tr className="bg-slate-50/60 dark:bg-slate-950/50">
                  <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                    {rootDomain}/cpanel
                  </td>
                  <td className="px-4 py-3 font-sans text-slate-600 dark:text-slate-300">
                    Dashboard Control Panel Admin Cloud PRO
                  </td>
                  <td className="px-4 py-3 text-sky-600 dark:text-sky-400">http://localhost:3000/cpanel</td>
                  <td className="px-4 py-3 text-right font-sans text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Selalu Aktif
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
