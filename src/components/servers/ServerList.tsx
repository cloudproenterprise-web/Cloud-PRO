import React, { useState } from 'react';
import {
  Server,
  PlusCircle,
  Activity,
  RefreshCw,
  HardDrive,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { ServerNode } from '../../types';
import { CloudProApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

export const ServerList: React.FC = () => {
  const { currentUser } = useAuth();
  const { servers, showToast, refreshAll } = useServer();

  const [selectedServer, setSelectedServer] = useState<ServerNode>(servers[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeHost, setNewNodeHost] = useState('');
  const [newNodeIp, setNewNodeIp] = useState('');
  const [newNodeLocation, setNewNodeLocation] = useState('Tokyo (Equinix TY2)');
  const [isRestarting, setIsRestarting] = useState<string | null>(null);

  if (!currentUser) return null;

  const handleRestartService = async (serviceName: string) => {
    setIsRestarting(serviceName);
    try {
      await CloudProApi.restartService(selectedServer.id, serviceName, currentUser);
      showToast('info', 'Restart Daemon Diajukan', `Sinyal restart untuk service ${serviceName} sedang dieksekusi.`);
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Restart Service', err.message);
    } finally {
      setTimeout(() => setIsRestarting(null), 2500);
    }
  };

  const handleAddServer = async () => {
    if (!newNodeName.trim() || !newNodeIp.trim()) return;

    try {
      await CloudProApi.createServerNode(
        {
          name: newNodeName.trim(),
          hostname: newNodeHost.trim() || `${newNodeName.toLowerCase()}.cloudpro.net`,
          ipAddress: newNodeIp.trim(),
          location: newNodeLocation,
          countryCode: 'JP',
          osType: 'AlmaLinux 9.4 (64-bit)',
          status: 'online',
          totalCpuCores: 16,
          cpuUsagePct: 15.0,
          totalRamMb: 65536,
          ramUsageMb: 12400,
          totalDiskGb: 2000,
          diskUsageGb: 140,
          bandwidthUsageGb: 220,
          loadAverage: [0.18, 0.22, 0.20],
          uptimeDays: 1,
          isPrimary: false,
          services: [
            { name: 'nginx', displayName: 'Nginx Web Server', status: 'running', port: 80, version: '1.26.1', memoryMb: 350, uptime: '1d' },
            { name: 'mariadb', displayName: 'MariaDB Server', status: 'running', port: 3306, version: '10.11.8', memoryMb: 1400, uptime: '1d' },
            { name: 'php_fpm', displayName: 'PHP-FPM Manager', status: 'running', port: 9000, version: '8.3.8', memoryMb: 800, uptime: '1d' },
            { name: 'named', displayName: 'BIND9 DNS', status: 'running', port: 53, version: '9.18.26', memoryMb: 210, uptime: '1d' },
            { name: 'postfix', displayName: 'Postfix Mailer', status: 'running', port: 25, version: '3.8.6', memoryMb: 140, uptime: '1d' },
            { name: 'pure_ftpd', displayName: 'Pure-FTPd', status: 'running', port: 21, version: '1.0.51', memoryMb: 70, uptime: '1d' },
          ],
        },
        currentUser
      );
      showToast('success', 'Server Node Ditambahkan', `Node ${newNodeName} berhasil terdaftar dalam cluster.`);
      setShowAddModal(false);
      setNewNodeName('');
      setNewNodeIp('');
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Menambah Server', err.message);
    }
  };

  const activeNode = servers.find(s => s.id === selectedServer.id) || servers[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Multi-Server Nodes & Daemons Management
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Monitor beban CPU, RAM, disk, load average, serta kontrol restart service daemon tanpa downtime.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-xs"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Tambah Server Node Baru</span>
        </button>
      </div>

      {/* Nodes Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {servers.map(srv => (
          <button
            key={srv.id}
            onClick={() => setSelectedServer(srv)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium transition-all ${
              selectedServer.id === srv.id
                ? 'border-emerald-500 bg-white text-emerald-900 shadow-xs dark:border-emerald-500 dark:bg-slate-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                srv.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold text-slate-900 dark:text-white">{srv.name}</span>
            <span className="font-mono text-[10px] text-slate-400">({srv.location})</span>
            {srv.isPrimary && (
              <span className="rounded bg-sky-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                PRIMARY
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Selected Node Detailed Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Node Telemetry Box */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {activeNode.name}
              </h4>
              <p className="font-mono text-xs text-slate-400 mt-0.5">
                {activeNode.ipAddress} &bull; {activeNode.location}
              </p>
            </div>
            <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
              {activeNode.status}
            </span>
          </div>

          <div className="mt-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Hostname FQDN</span>
              <span className="text-slate-800 dark:text-slate-200">{activeNode.hostname}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Sistem Operasi</span>
              <span className="text-slate-800 dark:text-slate-200">{activeNode.osType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Uptime</span>
              <span className="text-slate-800 dark:text-slate-200">{activeNode.uptimeDays} Hari</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
              <span className="text-slate-500">Load Average</span>
              <span className="text-slate-800 dark:text-slate-200">
                {(activeNode.loadAverage || [0.12, 0.08, 0.05]).map(l => Number(l || 0).toFixed(2)).join(', ')}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Akun Ter-hosting</span>
              <span className="text-slate-800 dark:text-slate-200">{activeNode.assignedAccountsCount} Akun vHost</span>
            </div>
          </div>
        </div>

        {/* Live Daemons Control Grid */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Service Daemons & Health Check
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Proses sistem inti web server, database, DNS dan mail
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {(activeNode.services || []).length} Daemons Dimonitor
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {(activeNode.services || []).map(svc => (
              <div key={svc.name} className="flex items-center justify-between py-3 text-xs">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      svc.status === 'running'
                        ? 'bg-emerald-500'
                        : svc.status === 'degraded'
                        ? 'bg-amber-500 animate-spin'
                        : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {svc.displayName}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">
                      port: {svc.port} &bull; v{svc.version} &bull; RAM: {svc.memoryMb} MB
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-slate-400 hidden sm:inline">
                    Uptime: {svc.uptime}
                  </span>
                  <button
                    onClick={() => handleRestartService(svc.name)}
                    disabled={isRestarting === svc.name}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="Restart Service Daemon"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRestarting === svc.name ? 'animate-spin' : ''}`} />
                    <span>{isRestarting === svc.name ? 'Restarting...' : 'Restart'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Server Node Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tambah Server Node Cluster Baru
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Daftarkan mesin dedicated server atau VPS ke dalam cluster Cloud PRO.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Nama Node:
                </label>
                <input
                  type="text"
                  placeholder="contoh: TY-Equinix-Node04"
                  value={newNodeName}
                  onChange={e => setNewNodeName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  IP Publik Dedicated:
                </label>
                <input
                  type="text"
                  placeholder="contoh: 133.242.180.55"
                  value={newNodeIp}
                  onChange={e => setNewNodeIp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Lokasi Datacenter:
                </label>
                <select
                  value={newNodeLocation}
                  onChange={e => setNewNodeLocation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Tokyo (Equinix TY2)">Tokyo (Equinix TY2 - Japan)</option>
                  <option value="Singapore (Equinix SG1)">Singapore (Equinix SG1)</option>
                  <option value="Jakarta (Cyber 1 DC)">Jakarta (Cyber 1 DC - Indonesia)</option>
                  <option value="Frankfurt (Interxion FRA)">Frankfurt (Interxion FRA - Germany)</option>
                </select>
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
                onClick={handleAddServer}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-xs"
              >
                Simpan & Daftarkan Node
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
