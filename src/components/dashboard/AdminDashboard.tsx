import React from 'react';
import {
  Server,
  Users,
  HardDrive,
  Globe,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Layers,
  PlusCircle,
  Terminal,
  Network,
  Zap,
} from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { useAuth } from '../../context/AuthContext';
import { TypewriterText } from '../common/TypewriterText';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenCreateAccount: () => void;
  onOpenCreateReseller: () => void;
  onOpenAddServer: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onOpenCreateAccount,
  onOpenCreateReseller,
  onOpenAddServer,
}) => {
  const { servers, accounts, auditLogs } = useServer();
  const { allUsers } = useAuth();

  const resellersCount = allUsers.filter(u => u.role === 'reseller').length;
  const customersCount = allUsers.filter(u => u.role === 'customer').length;

  const totalDiskGb = servers.reduce((acc, s) => acc + s.totalDiskGb, 0);
  const usedDiskGb = servers.reduce((acc, s) => acc + s.diskUsageGb, 0);
  const totalBwGb = servers.reduce((acc, s) => acc + s.bandwidthUsageGb, 0);

  const totalServices = servers.reduce((acc, s) => acc + s.services.length, 0);
  const runningServices = servers.reduce(
    (acc, s) => acc + s.services.filter(svc => svc.status === 'running').length,
    0
  );

  const diskUsagePercent = totalDiskGb > 0 ? Math.round((usedDiskGb / totalDiskGb) * 100) : 0;
  const activeAccountsCount = accounts.filter(a => a.status === 'active').length;
  const activeAccountPct =
    accounts.length > 0 ? Math.round((activeAccountsCount / accounts.length) * 100) : 100;

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Executive Command Center Hero Banner with 360° Perimeter Gradient Ring */}
      <div className="exec-card-ring relative overflow-hidden rounded-2xl w-full max-w-full min-w-0">
        {/* Subtle Ambient Background Glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-sky-500/5 blur-3xl" />

        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 max-w-full overflow-hidden">
                <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500"></span>
                </span>
                <h2 className="text-[16px] xs:text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center min-h-[1.75rem] sm:min-h-[1.85rem] whitespace-nowrap shrink-0">
                  <TypewriterText
                    text="Cloud PRO Enterprise"
                    speed={80}
                    deleteSpeed={45}
                    delay={200}
                    loop={true}
                    loopDelay={3000}
                    cursorColor="bg-sky-600"
                    className="whitespace-nowrap"
                  />
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold text-emerald-700 whitespace-nowrap shrink-0">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  <span className="hidden xs:inline">SLA </span>99.98% HA
                </span>
              </div>

              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Global Multi-Tier Infrastructure &bull; High Availability Network
              </p>

              <div className="pt-1 grid grid-cols-3 gap-2 max-w-xl">
                <div className="exec-tile-ring rounded-xl px-2.5 py-2 sm:px-3">
                  <div className="text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                    Cluster Tier
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] sm:text-xs font-bold text-slate-900">
                    Enterprise HA
                  </div>
                </div>
                <div className="exec-tile-ring rounded-xl px-2.5 py-2 sm:px-3">
                  <div className="text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                    Server Nodes
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] sm:text-xs font-bold text-slate-900">
                    {servers.length} Aktif <span className="hidden sm:inline">({runningServices}/{totalServices} Svc)</span>
                  </div>
                </div>
                <div className="exec-tile-ring rounded-xl px-2.5 py-2 sm:px-3">
                  <div className="text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                    Jaringan Inti
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] sm:text-xs font-bold text-sky-700">
                    WireGuard Mesh
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5">
              <button
                onClick={onOpenCreateAccount}
                className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-sky-600/15 hover:bg-sky-500 transition-all cursor-pointer w-full sm:w-auto shrink-0 active:scale-95"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Provisi Hosting Baru</span>
              </button>

              {/* 4 Secondary Actions in 1 Single Cohesive Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 w-full sm:w-auto">
                <button
                  onClick={onOpenCreateReseller}
                  className="exec-tile-ring flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
                  title="Tambah Reseller"
                >
                  <Users className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                  <span className="truncate">
                    <span className="hidden min-[380px]:inline">Tambah </span>Reseller
                  </span>
                </button>
                <button
                  onClick={onOpenAddServer}
                  className="exec-tile-ring flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
                  title="Add Server Node"
                >
                  <Server className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                  <span className="truncate">Add Node</span>
                </button>
                <button
                  onClick={() => onNavigate('architecture')}
                  className="exec-tile-ring flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
                  title="Arsitektur Sistem"
                >
                  <Layers className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                  <span className="truncate">
                    Arsitektur<span className="hidden min-[380px]:inline"> Sistem</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('terminal')}
                  className="exec-tile-ring flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 sm:px-3.5 sm:py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
                  title="Web Terminal SSH & Konsol Bash"
                >
                  <Terminal className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                  <span className="truncate">Web Terminal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Metric Cards: Unified 360° Perimeter Ring Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Box 1: Server Nodes */}
        <div className="exec-card-ring group relative overflow-hidden rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 block">
                INFRASTRUCTURE CLUSTER
              </span>
              <span className="font-bold text-sm text-slate-900">Cluster Server Nodes</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-all">
              <Server className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-extrabold tabular-nums text-slate-900">
              {servers.length}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
              100% Online &amp; Stabil
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-slate-800 via-sky-600 to-sky-400" />
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span>
              Primary Master: <strong className="text-slate-800">SG-Equinix TY2</strong>
            </span>
            <button
              onClick={() => onNavigate('servers')}
              className="hover:text-sky-700 flex items-center gap-1 text-sky-600 font-bold cursor-pointer"
            >
              <span>Detail Nodes</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Box 2: Hosting Accounts */}
        <div className="exec-card-ring group relative overflow-hidden rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 block">
                VIRTUAL HOSTS SUITE
              </span>
              <span className="font-bold text-sm text-slate-900">Akun Hosting (vHosts)</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-all">
              <Globe className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-extrabold tabular-nums text-slate-900">
              {accounts.length}
            </span>
            <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200/80">
              {activeAccountsCount} Domain Aktif
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-slate-800 via-sky-600 to-sky-400"
              style={{ width: `${activeAccountPct}%` }}
            />
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span>Tersebar di {servers.length} Cluster Nodes</span>
            <button
              onClick={() => onNavigate('hosting-accounts')}
              className="hover:text-sky-700 flex items-center gap-1 text-sky-600 font-bold cursor-pointer"
            >
              <span>Kelola Akun</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Box 3: Reseller Ecosystem */}
        <div className="exec-card-ring group relative overflow-hidden rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 block">
                MULTI-TENANT ECOSYSTEM
              </span>
              <span className="font-bold text-sm text-slate-900">Mitra Reseller &amp; Pelanggan</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-all">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-extrabold tabular-nums text-slate-900">
              {resellersCount}
            </span>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/90">
              Mitra Reseller &bull; <strong className="text-slate-900">{customersCount}</strong> Pelanggan
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-slate-800 via-sky-600 to-sky-400" />
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span>Multi-Tenant RBAC Terisolasi</span>
            <button
              onClick={() => onNavigate('resellers')}
              className="hover:text-sky-700 flex items-center gap-1 text-sky-600 font-bold cursor-pointer"
            >
              <span>Kelola Reseller</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Box 4: Storage & Traffic */}
        <div className="exec-card-ring group relative overflow-hidden rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 block">
                STORAGE &amp; BANDWIDTH POOL
              </span>
              <span className="font-bold text-sm text-slate-900">Total NVMe Storage &amp; Trafik</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-all">
              <HardDrive className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-extrabold tabular-nums text-slate-900">
              {usedDiskGb}{' '}
              <span className="text-sm font-normal text-slate-400">/ {totalDiskGb} GB</span>
            </span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200/90">
              {diskUsagePercent}% Terpakai
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-slate-800 via-sky-600 to-sky-400"
              style={{ width: `${Math.max(8, diskUsagePercent)}%` }}
            />
          </div>
          <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span>
              Trafik Bulanan: <strong className="text-slate-800">{totalBwGb} GB</strong>
            </span>
            <button
              onClick={() => onNavigate('disk-usage')}
              className="hover:text-sky-700 flex items-center gap-1 text-sky-600 font-bold cursor-pointer"
            >
              <span>Audit Storage</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CORE 2-COLUMN MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start min-w-0">
        {/* ================= KOLOM KIRI ================= */}
        <div className="space-y-6 min-w-0">
          {/* Card: Live Server Nodes & Telemetry */}
          <div className="exec-card-ring rounded-2xl p-4 sm:p-6 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/80">
                  <Activity className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Live Server Nodes &amp; Telemetri
                  </h3>
                  <p className="text-xs text-slate-500">
                    Beban CPU, memori RAM, dan status daemons realtime
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('servers')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Lihat Semua</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {servers.map(server => (
                <div
                  key={server.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:border-slate-300 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{server.name}</h4>
                          {server.isPrimary && (
                            <span className="rounded bg-sky-50 px-2 py-0.5 font-mono text-[9px] font-bold text-sky-700 border border-sky-200/80">
                              PRIMARY
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-slate-500">
                          {server.ipAddress} &bull; {server.location}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto font-bold">
                      {server.services.filter(s => s.status === 'running').length}/
                      {server.services.length} Daemons OK
                    </span>
                  </div>

                  {/* Resource Progress Bars (Unified Sapphire unless critical) */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                    {/* CPU */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="flex justify-between text-slate-600 mb-1 text-[11px]">
                        <span>CPU ({server.totalCpuCores} Core)</span>
                        <span className="font-bold text-slate-900">{server.cpuUsagePct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            server.cpuUsagePct > 80
                              ? 'bg-rose-500'
                              : server.cpuUsagePct > 65
                              ? 'bg-amber-500'
                              : 'bg-sky-600'
                          }`}
                          style={{ width: `${server.cpuUsagePct}%` }}
                        />
                      </div>
                    </div>

                    {/* RAM */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="flex justify-between text-slate-600 mb-1 text-[11px]">
                        <span>RAM ({Math.round(server.totalRamMb / 1024)} GB)</span>
                        <span className="font-bold text-slate-900">
                          {Math.round((server.ramUsageMb / server.totalRamMb) * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-600"
                          style={{
                            width: `${Math.round((server.ramUsageMb / server.totalRamMb) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Disk */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                      <div className="flex justify-between text-slate-600 mb-1 text-[11px]">
                        <span>Disk ({server.totalDiskGb} GB)</span>
                        <span className="font-bold text-slate-900">
                          {Math.round((server.diskUsageGb / server.totalDiskGb) * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-600"
                          style={{
                            width: `${Math.round((server.diskUsageGb / server.totalDiskGb) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active Daemons Badges */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-200/60">
                    {server.services.slice(0, 5).map(svc => (
                      <span
                        key={svc.name}
                        className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-mono text-[10px] text-slate-700 border border-slate-200"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>{svc.name}</span>
                      </span>
                    ))}
                    {server.services.length > 5 && (
                      <span className="inline-flex items-center rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 border border-slate-200">
                        +{server.services.length - 5} lainnya
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Recent Hosting Accounts & Domains */}
          <div className="exec-card-ring rounded-2xl p-4 sm:p-6 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/80">
                  <Globe className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Akun Hosting &amp; Virtual Hosts
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftar domain aktif yang di-host di cluster
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('hosting-accounts')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Kelola Semua</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {accounts.slice(0, 5).map(acc => (
                <div
                  key={acc.id}
                  onClick={() => onNavigate('hosting-accounts')}
                  className="flex items-center justify-between py-3 text-xs transition-colors hover:bg-slate-50/90 px-2.5 rounded-xl cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/80 group-hover:border-sky-300 group-hover:bg-sky-50 transition-colors">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
                        {acc.primaryDomain}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 mt-0.5 truncate">
                        user: <span className="text-slate-800 font-semibold">{acc.username}</span>{' '}
                        &bull; {acc.planName} &bull; PHP {acc.phpVersion}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="font-mono text-[11px] font-semibold text-slate-700">
                        {acc.diskUsedMb} MB{' '}
                        <span className="text-slate-400">/ {acc.diskLimitMb} MB</span>
                      </span>
                      <div className="font-mono text-[10px] text-slate-400">{acc.serverName}</div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        acc.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {acc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= KOLOM KANAN ================= */}
        <div className="space-y-6 min-w-0">
          {/* Card: Quick Control & Grouped Modules by Function (Cohesive Bento Grid) */}
          <div className="exec-card-ring rounded-2xl p-4 sm:p-6 space-y-5 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-sky-600 border border-slate-200/80">
                  <Zap className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Direktori Modul &amp; Layanan Server
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pintasan arsitektur jaringan, virtual server, web hosting, dan keamanan
                  </p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-100 border border-slate-200/80 px-2.5 py-1 font-mono text-[10px] font-bold text-slate-600">
                Bento Control
              </span>
            </div>

            {/* Kelompok 1: Jaringan, Tunnel & DNS */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                <span>1. Jaringan, Tunnel &amp; IPv6 IndiHome</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onNavigate('gateway-tunnel')}
                  className="exec-tile-ring group flex flex-col items-start rounded-xl p-3.5 text-left cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="rounded-lg bg-white p-2 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-colors">
                      <Network className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <h4 className="mt-2.5 text-xs font-bold text-slate-900">
                    CF Tunnel &amp; IPv6 DDNS
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                    Setting 1x Wildcard Tunnel &amp; Auto-DDNS IPv6 IndiHome.
                  </p>
                </button>

                <button
                  onClick={() => onNavigate('tailscale-mesh')}
                  className="exec-tile-ring group flex flex-col items-start rounded-xl p-3.5 text-left cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="rounded-lg bg-white p-2 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-colors">
                      <Terminal className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <h4 className="mt-2.5 text-xs font-bold text-slate-900">
                    Tailscale Mesh &amp; SSH
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                    Remote SSH VPN &amp; sinkronisasi GitHub otomatis.
                  </p>
                </button>

                <button
                  onClick={() => onNavigate('dns-zones')}
                  className="exec-tile-ring group flex flex-col items-start rounded-xl p-3.5 text-left cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="rounded-lg bg-white p-2 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-colors">
                      <Globe className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <h4 className="mt-2.5 text-xs font-bold text-slate-900">DNS Zone (BIND9)</h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                    Kelola record A, AAAA, CNAME, MX, TXT &amp; Export.
                  </p>
                </button>

                <button
                  onClick={() => onNavigate('nameservers')}
                  className="exec-tile-ring group flex flex-col items-start rounded-xl p-3.5 text-left cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="rounded-lg bg-white p-2 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-colors">
                      <Server className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <h4 className="mt-2.5 text-xs font-bold text-slate-900">Private Nameserver</h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                    Cluster NS1/NS2 &amp; manajemen IP Pool.
                  </p>
                </button>
              </div>
            </div>

            {/* Kelompok 2: Manajemen VPS Cloud */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                <span>2. Infrastruktur VPS Cloud (KVM)</span>
              </div>
              <button
                onClick={() => onNavigate('vps')}
                className="exec-tile-ring group flex w-full items-center justify-between rounded-xl p-4 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white p-2.5 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-colors">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Kelola Instance VPS Cloud (KVM Hypervisor)
                    </h4>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Deploy VPS Ubuntu/Debian/AlmaLinux, VNC Console, Rebuild OS &amp; Power Control.
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>

            {/* Kelompok 3: Web Hosting & Keamanan */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                <span>3. Web Hosting, File Manager &amp; Keamanan</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onNavigate('file-manager')}
                  className="exec-tile-ring group flex flex-col items-start rounded-xl p-3.5 text-left cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="rounded-lg bg-white p-2 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-colors">
                      <Globe className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <h4 className="mt-2.5 text-xs font-bold text-slate-900">
                    File Manager &amp; Clone
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                    Kelola /public_html, kloning web &amp; upload ZIP.
                  </p>
                </button>

                <button
                  onClick={() => onNavigate('security')}
                  className="exec-tile-ring group flex flex-col items-start rounded-xl p-3.5 text-left cursor-pointer"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="rounded-lg bg-white p-2 text-sky-600 border border-slate-200/90 shadow-2xs group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-colors">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <h4 className="mt-2.5 text-xs font-bold text-slate-900">Security &amp; Firewall</h4>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                    Firewall iptables, SSL Let&apos;s Encrypt &amp; 2FA.
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Card: Global Resource Allocation */}
          <div className="exec-card-ring rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between mb-4">
              <span className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-sky-600" />
                Alokasi Resource Global
              </span>
              <span className="rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 font-mono text-xs text-sky-700 font-bold">
                {diskUsagePercent}% NVMe
              </span>
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                  <span>Penyimpanan NVMe Cluster</span>
                  <span className="font-mono font-bold text-slate-900">
                    {usedDiskGb} GB / {totalDiskGb} GB
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400"
                    style={{ width: `${diskUsagePercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                  <span>Trafik Bandwidth Bulanan</span>
                  <span className="font-mono font-bold text-slate-900">{totalBwGb} GB</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-700 to-sky-500"
                    style={{ width: '28%' }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>Sistem File: Btrfs / ZFS Mirroring</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Status: Optimal
              </span>
            </div>
          </div>

          {/* Card: Live Security Audit Stream */}
          <div className="exec-card-ring rounded-2xl p-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                Log Audit &amp; Keamanan Sistem
              </h3>
              <button
                onClick={() => onNavigate('security')}
                className="text-xs text-sky-600 hover:text-sky-500 font-bold cursor-pointer"
              >
                Lihat Semua
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {auditLogs.slice(0, 4).map(log => (
                <div key={log.id} className="py-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-slate-800">
                      {log.action}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-500 line-clamp-1">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
