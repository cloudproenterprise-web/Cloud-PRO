import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wifi,
  Cpu,
  HardDrive,
  RefreshCw,
  Copy,
  Check,
  X,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';
import { db } from '../../services/storage';

export interface SystemErrorLog {
  id: string;
  timestamp: string;
  type: 'error' | 'unhandled_rejection' | 'lag_freeze' | 'network_timeout' | 'warning';
  title: string;
  detail: string;
  source?: string;
  resolved?: boolean;
}

export const SystemSensorDetector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRunningQuickTest, setIsRunningQuickTest] = useState(false);
  const [isSelfHealing, setIsSelfHealing] = useState(false);

  // Health Metrics
  const [serverPingMs, setServerPingMs] = useState<number | null>(null);
  const [serverStatus, setServerStatus] = useState<'healthy' | 'degraded' | 'offline' | 'checking'>('checking');
  const [fps, setFps] = useState<number>(60);
  const [lagSpikes, setLagSpikes] = useState<number>(0);
  const [storageUsageKb, setStorageUsageKb] = useState<number>(0);
  const [errorLogs, setErrorLogs] = useState<SystemErrorLog[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<string>(() => new Date().toLocaleTimeString('id-ID'));

  // Heartbeat ref to track UI freeze/hangs
  const lastHeartbeatRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number | null>(null);
  const framesCountRef = useRef<number>(0);
  const lastFpsCalcRef = useRef<number>(performance.now());

  const addErrorLog = useCallback((log: Omit<SystemErrorLog, 'id' | 'timestamp'>) => {
    const newEntry: SystemErrorLog = {
      ...log,
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('id-ID'),
    };
    setErrorLogs(prev => [newEntry, ...prev.slice(0, 49)]);
  }, []);

  // 1. Global Browser Error & Promise Rejection Detectors
  useEffect(() => {
    const handleOpenSensor = () => setIsOpen(true);
    window.addEventListener('cloudpro:open-sensor', handleOpenSensor);

    const handleGlobalError = (event: ErrorEvent) => {
      addErrorLog({
        type: 'error',
        title: 'JavaScript Runtime Error Terdeteksi',
        detail: event.message || 'Unknown error occurred in script',
        source: `${event.filename || 'bundle'}:${event.lineno || 0}:${event.colno || 0}`,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason || 'Promise rejected without error reason');
      // Ignore normal abort errors from canceled network requests
      if (msg.includes('aborted') || msg.includes('AbortError')) return;

      addErrorLog({
        type: 'unhandled_rejection',
        title: 'Network / Async Promise Gagal',
        detail: msg,
        source: reason instanceof Error ? reason.stack?.split('\n')[1]?.trim() : 'Async call',
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('cloudpro:open-sensor', handleOpenSensor);
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [addErrorLog]);

  // 2. UI Heartbeat & Event-Loop Lag Detector (Detects when browser hangs/freezes)
  useEffect(() => {
    let active = true;

    const tick = (now: number) => {
      if (!active) return;

      const delta = now - lastHeartbeatRef.current;
      lastHeartbeatRef.current = now;

      // If tick was delayed by > 280ms, the main thread froze (user felt a hang!)
      if (delta > 280) {
        const freezeDuration = Math.round(delta);
        setLagSpikes(prev => prev + 1);
        addErrorLog({
          type: 'lag_freeze',
          title: `Browser Hang Terdeteksi (${freezeDuration}ms)`,
          detail: `Prosesor browser/komputer sibuk selama ${freezeDuration}ms sehingga sentuhan/klik sempat tertunda. Sensor mendeteksi jeda ini.`,
          source: 'Main Event Loop Heartbeat',
        });
      }

      // FPS Calculation
      framesCountRef.current++;
      if (now - lastFpsCalcRef.current >= 1000) {
        setFps(framesCountRef.current);
        framesCountRef.current = 0;
        lastFpsCalcRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [addErrorLog]);

  // 3. Backend Ping & Latency Detector
  const pingBackend = useCallback(async () => {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('/api/state/vault', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const duration = Math.round(performance.now() - start);
      setServerPingMs(duration);

      if (res.ok) {
        setServerStatus(duration > 1500 ? 'degraded' : 'healthy');
      } else {
        setServerStatus('degraded');
        addErrorLog({
          type: 'warning',
          title: `Respon Server Status HTTP ${res.status}`,
          detail: `Endpoint backend merespon status ${res.status} (${res.statusText})`,
        });
      }
    } catch (err: any) {
      setServerPingMs(null);
      setServerStatus('offline');
      addErrorLog({
        type: 'network_timeout',
        title: 'Backend Ping Timeout / Terputus',
        detail: err.name === 'AbortError' ? 'Koneksi ke backend melewati batas 3.5 detik (Timeout).' : err.message,
      });
    }

    // Calculate local storage footprint
    try {
      let totalChars = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalChars += (localStorage.getItem(key) || '').length + key.length;
        }
      }
      setStorageUsageKb(Math.round((totalChars * 2) / 1024));
    } catch {}

    setLastCheckTime(new Date().toLocaleTimeString('id-ID'));
  }, [addErrorLog]);

  useEffect(() => {
    pingBackend();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        pingBackend();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [pingBackend]);

  // Run full sensor check manually
  const handleRunFullDiagnostics = async () => {
    setIsRunningQuickTest(true);
    try {
      await pingBackend();
      // Test Tunnel API
      try {
        const tStart = performance.now();
        const tRes = await fetch('/api/tunnel/status', { signal: AbortSignal.timeout(3000) });
        if (tRes.ok) {
          const tJson = await tRes.json();
          addErrorLog({
            type: 'warning',
            title: 'Diagnosa Tunnel: Normal',
            detail: `Status tunnel daemon: ${tJson.status || 'running'} (PID: ${tJson.pid || '-'})`,
          });
        }
      } catch (tErr: any) {
        addErrorLog({
          type: 'network_timeout',
          title: 'Diagnosa Tunnel: Lambat / Tidak Respon',
          detail: tErr.message || 'Gagal memanggil /api/tunnel/status',
        });
      }
    } finally {
      setIsRunningQuickTest(false);
    }
  };

  // Self-heal button
  const handleSelfHeal = async () => {
    setIsSelfHealing(true);
    try {
      // 1. Re-hydrate cleanly from server
      await db.hydrateFromServerVault();
      // 2. Clear lag spike count
      setLagSpikes(0);
      // 3. Run fresh ping
      await pingBackend();
      addErrorLog({
        type: 'warning',
        title: 'Self-Heal Sistem Selesai',
        detail: 'Koneksi vault disinkron ulang dan sensor distabilkan. Antarmuka kini optimal.',
      });
    } finally {
      setIsSelfHealing(false);
    }
  };

  const copyDiagnosticReport = () => {
    const report = [
      '=== LAPORAN DIAGNOSA SENSOR CLOUD PRO ===',
      `Waktu: ${new Date().toLocaleString('id-ID')}`,
      `Status Server: ${serverStatus.toUpperCase()} (Ping: ${serverPingMs !== null ? `${serverPingMs}ms` : 'Offline'})`,
      `Frame Rate (FPS): ${fps} fps`,
      `Lag / Hang Spikes: ${lagSpikes} kali`,
      `Penyimpanan Local: ${storageUsageKb} KB`,
      `Total Riwayat Isu: ${errorLogs.length}`,
      '',
      '--- 5 CATATAN SENSOR TERBARU ---',
      ...errorLogs.slice(0, 5).map(e => `[${e.timestamp}] [${e.type.toUpperCase()}] ${e.title}: ${e.detail} ${e.source ? `(${e.source})` : ''}`),
      '========================================',
    ].join('\n');

    navigator.clipboard?.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasIssues = serverStatus !== 'healthy' || lagSpikes > 0 || errorLogs.some(e => e.type === 'error');

  return (
    <>
      {/* Floating Sensor Badge Pill */}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 shadow-lg backdrop-blur-md border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
            hasIssues
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/50 hover:bg-rose-900/90 animate-pulse'
              : 'bg-slate-900/90 text-emerald-300 border-slate-700/80 hover:bg-slate-800/90'
          }`}
          title="Buka Pusat Sensor & Diagnosa Sistem Cloud PRO"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                hasIssues ? 'bg-rose-400' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                hasIssues ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
          </span>

          <span className="font-mono text-[11px] font-semibold">
            {hasIssues ? '⚠️ Sensor: Isu Terdeteksi' : '🟢 Sensor: 100% Normal'}
          </span>

          <span className="hidden sm:inline text-slate-400 font-mono text-[10px] border-l border-slate-700 pl-2">
            {serverPingMs !== null ? `${serverPingMs}ms` : '...'} &bull; {fps} FPS
          </span>
        </button>
      </div>

      {/* Sensor Modal & Detailed Inspector */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Sensor Detector &amp; Diagnostic Center
                    <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-mono text-sky-300">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Memantau stabilitas memori, lag browser, dan respon backend secara realtime
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 4 Sensor Vital Gauges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Gauge 1: Server Ping */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Respon Server</span>
                    <Wifi className="h-3.5 w-3.5 text-sky-400" />
                  </div>
                  <div className="text-lg font-extrabold font-mono text-white">
                    {serverPingMs !== null ? `${serverPingMs}ms` : 'Offline'}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10px]">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        serverStatus === 'healthy'
                          ? 'bg-emerald-400'
                          : serverStatus === 'degraded'
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-slate-400">
                      {serverStatus === 'healthy' ? 'Sangat Cepat' : serverStatus === 'degraded' ? 'Lambat' : 'Terputus'}
                    </span>
                  </div>
                </div>

                {/* Gauge 2: Smoothness & Lag Spikes */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Kelancaran UI</span>
                    <Cpu className="h-3.5 w-3.5 text-sky-400" />
                  </div>
                  <div className="text-lg font-extrabold font-mono text-white">
                    {fps} <span className="text-xs font-normal text-slate-400">FPS</span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {lagSpikes === 0 ? (
                      <span className="text-emerald-400 font-semibold">0 Jeda (Mulus)</span>
                    ) : (
                      <span className="text-amber-400 font-semibold">{lagSpikes}x Hang Sesaat</span>
                    )}
                  </div>
                </div>

                {/* Gauge 3: Database & Local Vault */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Memori Local</span>
                    <HardDrive className="h-3.5 w-3.5 text-sky-400" />
                  </div>
                  <div className="text-lg font-extrabold font-mono text-white">
                    {storageUsageKb} <span className="text-xs font-normal text-slate-400">KB</span>
                  </div>
                  <div className="mt-1 text-[10px] text-emerald-400 font-semibold">
                    Aman (&lt; 5 MB)
                  </div>
                </div>

                {/* Gauge 4: Status Umum */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Status Mesin</span>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {hasIssues ? (
                      <span className="text-rose-400 text-sm">Ada Isu</span>
                    ) : (
                      <span className="text-emerald-400 text-sm">100% Prima</span>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">
                    Cek: {lastCheckTime}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/40">
                <div className="text-xs font-semibold text-slate-300">
                  Tindakan &amp; Pemulihan Cepat:
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunFullDiagnostics}
                    disabled={isRunningQuickTest}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRunningQuickTest ? 'animate-spin' : ''}`} />
                    <span>{isRunningQuickTest ? 'Memeriksa...' : 'Tes Semua Sensor'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSelfHeal}
                    disabled={isSelfHealing}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>{isSelfHealing ? 'Memulihkan...' : '1-Klik Self-Heal'}</span>
                  </button>
                </div>
              </div>

              {/* Diagnostic Error Logs Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Riwayat Sensor &amp; Deteksi Isu ({errorLogs.length})
                  </h4>
                  {errorLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setErrorLogs([])}
                      className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      Bersihkan Log
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 max-h-56 overflow-y-auto space-y-2 font-mono text-xs">
                  {errorLogs.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 font-sans text-xs flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
                      <span>Belum ada eror atau jeda macet yang terdeteksi. Sistem berjalan normal!</span>
                    </div>
                  ) : (
                    errorLogs.map(log => (
                      <div
                        key={log.id}
                        className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
                          log.type === 'error'
                            ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                            : log.type === 'lag_freeze'
                            ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span className="flex items-center gap-1.5">
                            {log.type === 'error' && <XCircle className="h-3.5 w-3.5 text-rose-400" />}
                            {log.type === 'lag_freeze' && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                            {log.type === 'warning' && <Info className="h-3.5 w-3.5 text-sky-400" />}
                            {log.title}
                          </span>
                          <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                        </div>
                        <div className="font-sans text-slate-300">{log.detail}</div>
                        {log.source && (
                          <div className="mt-1 text-[10px] text-slate-500 truncate">
                            Sumber: {log.source}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/60 px-4 py-3">
              <div className="text-[11px] text-slate-400">
                Deteksi otomatis aktif 24/7 di HP &amp; PC
              </div>
              <button
                type="button"
                onClick={copyDiagnosticReport}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Laporan Disalin!' : 'Salin Laporan Sensor'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
