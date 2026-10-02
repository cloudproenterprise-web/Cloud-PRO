import React, { useState, useEffect } from 'react';
import {
  Server,
  Cpu,
  HardDrive,
  Activity,
  Plus,
  Play,
  Square,
  RotateCw,
  Terminal,
  Shield,
  Camera,
  Layers,
  Search,
  Globe,
  Copy,
  Check,
  Trash2,
  Settings,
  RefreshCw,
  Lock,
  Radio,
  Sliders,
  ChevronRight,
  ExternalLink,
  Info,
  AlertTriangle,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { VpsInstance, VpsSnapshot, VpsFirewallRule } from '../../types';
import { db } from '../../services/storage';
import { CloudProApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

// Futuristic, Iconic KVM Hypervisor Hardware Emblem
const KvmModernEmblem: React.FC<{ className?: string }> = ({ className = 'h-11 w-11' }) => (
  <div className={`relative shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 p-2 shadow-md shadow-sky-950/40 border border-sky-500/30 dark:border-sky-400/25 group ${className}`}>
    {/* Micro Radial Glow */}
    <div className="absolute inset-0 rounded-2xl bg-sky-500/10 blur-xs transition-opacity group-hover:opacity-100" />
    
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative h-full w-full">
      {/* Outer Tech Frame */}
      <rect x="3" y="3" width="34" height="34" rx="8" stroke="url(#kvmFrameGrad)" strokeWidth="1.5" strokeDasharray="3 1.5" opacity="0.7" />
      
      {/* Hypervisor Virtualization Stack */}
      <path d="M8 14L20 8L32 14L20 20L8 14Z" fill="url(#kvmLayerTop)" stroke="#38bdf8" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 20L20 26L32 20" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <path d="M8 26L20 32L32 26" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />

      {/* Center Hardware Micro-core */}
      <circle cx="20" cy="14" r="2.2" fill="#ffffff" />
      <circle cx="20" cy="14" r="4.5" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />

      {/* Bus Nodes */}
      <circle cx="12" cy="12" r="1.2" fill="#38bdf8" />
      <circle cx="28" cy="12" r="1.2" fill="#818cf8" />
      
      <defs>
        <linearGradient id="kvmFrameGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38bdf8" />
          <stop offset="0.5" stopColor="#818cf8" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="kvmLayerTop" x1="8" y1="8" x2="32" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0284c7" stopOpacity="0.8" />
          <stop offset="1" stopColor="#1e1b4b" stopOpacity="0.95" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

export const VpsManager: React.FC = () => {
  const { currentUser } = useAuth();
  const { vpsInstances, showToast, refreshAll, confirmAction } = useServer();

  const [selectedVps, setSelectedVps] = useState<VpsInstance | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'metrics' | 'console' | 'snapshots' | 'firewall' | 'network' | 'resize'>('metrics');
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    'Connected to Cloud PRO KVM Serial Console [pts/0]',
    'Ubuntu 24.04 LTS (GNU/Linux 6.8.0-45-generic x86_64)',
    'Type "help" for a list of simulated server diagnostic commands.',
    '',
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  // Deploy VPS form state
  const [deployName, setDeployName] = useState('');
  const [deployHostname, setDeployHostname] = useState('');
  const [deployRegion, setDeployRegion] = useState({ id: 'ID-CGK1', name: 'Jakarta (ID-CGK1 Data Center)', country: 'id' });
  const [deployOs, setDeployOs] = useState({ distro: 'Ubuntu 24.04 LTS (Noble Numbat)', icon: 'ubuntu' });
  const [deployPlan, setDeployPlan] = useState({
    name: 'Pro Cloud Node',
    vCpu: 4,
    ramMb: 8192,
    diskGb: 160,
    bandwidthGb: 5000,
    price: 32.0,
  });
  const [deployPassword, setDeployPassword] = useState('cPro#Root' + Math.random().toString(36).substring(2, 6) + '!');
  const [deployAutoBackup, setDeployAutoBackup] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);

  // Snapshot form
  const [snapshotName, setSnapshotName] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Firewall form
  const [fwProto, setFwProto] = useState<'TCP' | 'UDP' | 'ICMP'>('TCP');
  const [fwPort, setFwPort] = useState('8080');
  const [fwSource, setFwSource] = useState('0.0.0.0/0');
  const [fwAction, setFwAction] = useState<'ACCEPT' | 'DROP'>('ACCEPT');
  const [fwDesc, setFwDesc] = useState('');
  const [showAddFwModal, setShowAddFwModal] = useState(false);

  // Reverse DNS (PTR)
  const [ptrRecord, setPtrRecord] = useState('');

  // Rebuild modal
  const [showRebuildModal, setShowRebuildModal] = useState(false);
  const [rebuildOs, setRebuildOs] = useState('Debian 12 Bookworm');

  if (!currentUser) return null;

  // Filter instances by role
  const filteredInstances = vpsInstances.filter(vps => {
    if (currentUser.role === 'customer' && vps.customerId !== currentUser.id) return false;
    if (currentUser.role === 'reseller' && vps.resellerId !== currentUser.id) return false;

    if (regionFilter !== 'all' && vps.region !== regionFilter) return false;
    if (statusFilter !== 'all' && vps.status !== statusFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        vps.name.toLowerCase().includes(q) ||
        vps.hostname.toLowerCase().includes(q) ||
        vps.ipV4.includes(q) ||
        vps.osDistro.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate top cluster stats
  const totalCores = filteredInstances.reduce((sum, v) => sum + v.vCpu, 0);
  const totalRamGb = +(filteredInstances.reduce((sum, v) => sum + v.ramMb, 0) / 1024).toFixed(1);
  const totalDiskGb = filteredInstances.reduce((sum, v) => sum + v.diskGb, 0);
  const runningCount = filteredInstances.filter(v => v.status === 'running').length;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handlePower = async (vps: VpsInstance, action: 'start' | 'stop' | 'restart') => {
    const actionLabel = action === 'start' ? 'Menyalakan' : action === 'stop' ? 'Mematikan' : 'Restart';
    try {
      await CloudProApi.powerActionVps(vps.id, action, currentUser);
      showToast('info', `${actionLabel} VPS`, `Perintah ${action} berhasil dikirim ke hypervisor.`);
      refreshAll();
      if (selectedVps && selectedVps.id === vps.id) {
        setSelectedVps(prev => prev ? { ...prev, status: action === 'stop' ? 'stopped' : action === 'restart' ? 'restarting' : 'running' } : null);
      }
    } catch (err: any) {
      showToast('error', 'Gagal Eksekusi Daya', err.message);
    }
  };

  const handleTerminateVps = (vps: VpsInstance) => {
    confirmAction({
      title: 'Terminasi Permanen VPS Instance',
      message: `PERINGATAN KRUSIAL: Menghapus instance "${vps.name}" (${vps.ipV4}) akan menghapus seluruh disk NVMe, snapshot, dan melepaskan alamat IP publik. Lanjutkan?`,
      confirmText: 'Terminasi VPS',
      isDanger: true,
      onConfirm: async () => {
        try {
          await CloudProApi.terminateVps(vps.id, currentUser);
          showToast('info', 'VPS Diterminasi', `Instance ${vps.name} telah dihapus.`);
          if (selectedVps?.id === vps.id) setSelectedVps(null);
          refreshAll();
        } catch (err: any) {
          showToast('error', 'Gagal Terminasi', err.message);
        }
      },
    });
  };

  const handleDeploySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployName.trim() || !deployHostname.trim()) {
      showToast('warning', 'Validasi Gagal', 'Nama instance dan hostname wajib diisi.');
      return;
    }

    try {
      setIsDeploying(true);
      await CloudProApi.provisionVps(
        {
          name: deployName.trim(),
          hostname: deployHostname.trim(),
          region: deployRegion.id,
          regionName: deployRegion.name,
          countryCode: deployRegion.country,
          osDistro: deployOs.distro,
          osIcon: deployOs.icon,
          vCpu: deployPlan.vCpu,
          ramMb: deployPlan.ramMb,
          diskGb: deployPlan.diskGb,
          bandwidthLimitGb: deployPlan.bandwidthGb,
          monthlyPrice: deployPlan.price,
          rootPassword: deployPassword,
          autoBackupEnabled: deployAutoBackup,
        },
        currentUser
      );

      showToast('success', 'VPS Diprovisi', `Proses deployment ${deployName} telah dimasukkan ke background worker.`);
      setShowDeployModal(false);
      setDeployName('');
      setDeployHostname('');
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Memprovisi VPS', err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleExecuteTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    const newHistory = [...terminalHistory, `root@${selectedVps?.hostname || 'vps'}:~# ${cmd}`];

    switch (cmd.toLowerCase()) {
      case 'help':
        newHistory.push('Perintah sistem tersedia:');
        newHistory.push('  uname -a, top, free -m, df -h, ip a, uptime, docker ps, clear');
        break;
      case 'clear':
        setTerminalHistory([]);
        setTerminalInput('');
        return;
      case 'uname -a':
        newHistory.push('Linux ' + (selectedVps?.hostname || 'node') + ' 6.8.0-45-generic #45-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux');
        break;
      case 'free -m':
        newHistory.push('               total        used        free      shared  buff/cache   available');
        newHistory.push(`Mem:           ${selectedVps?.ramMb || 8192}        ${selectedVps?.liveRamMb || 2150}        ${(selectedVps?.ramMb || 8192) - (selectedVps?.liveRamMb || 2150)}          64        1250        ${(selectedVps?.ramMb || 8192) - (selectedVps?.liveRamMb || 2150) + 1200}`);
        newHistory.push('Swap:           2048           0        2048');
        break;
      case 'df -h':
        newHistory.push('Filesystem      Size  Used Avail Use% Mounted on');
        newHistory.push('/dev/vda1        ' + (selectedVps?.diskGb || 160) + 'G   14G  ' + ((selectedVps?.diskGb || 160) - 14) + 'G  11% /');
        newHistory.push('tmpfs           3.9G     0  3.9G   0% /dev/shm');
        newHistory.push('/dev/vda15      105M  6.1M   99M   6% /boot/efi');
        break;
      case 'uptime':
        newHistory.push(` 02:40:15 up ${selectedVps?.uptime || '24 days'}, 1 user, load average: 0.28, 0.35, 0.40`);
        break;
      case 'ip a':
        newHistory.push('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN');
        newHistory.push('    inet 127.0.0.1/8 scope host lo');
        newHistory.push('2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP');
        newHistory.push(`    inet ${selectedVps?.ipV4 || '103.147.154.22'}/24 brd 103.147.154.255 scope global eth0`);
        newHistory.push(`    inet6 ${selectedVps?.ipV6 || '2001:df0:340:1::22'}/64 scope global`);
        break;
      case 'docker ps':
        newHistory.push('CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS');
        newHistory.push('9c31fa78a23b   nginx:alpine   "/docker-entrypoint.…"   2 days ago      Up 2 days      0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp');
        newHistory.push('7b901fc84e11   redis:7-alpine "docker-entrypoint.s…"   5 days ago      Up 5 days      127.0.0.1:6379->6379/tcp');
        break;
      case 'top':
        newHistory.push('top - 02:41:00 up 48 days,  1 user,  load average: 0.22, 0.30, 0.35');
        newHistory.push('Tasks: 112 total,   1 running, 111 sleeping,   0 stopped,   0 zombie');
        newHistory.push(`%Cpu(s): ${selectedVps?.liveCpuPct || 14.5}%us,  1.8%sy,  0.0%ni, 83.2%id,  0.4%wa,  0.0%hi`);
        newHistory.push('  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND');
        newHistory.push(' 1420 root      20   0  712400  42100  18200 S  12.5   0.5  48:12.10 dockerd');
        newHistory.push(' 1890 www-data  20   0  145200  28900  12400 S   3.2   0.3  12:45.33 nginx');
        newHistory.push('  940 root      20   0   18400   4100   2900 S   0.0   0.1   0:04.12 sshd');
        break;
      default:
        newHistory.push(`bash: ${cmd}: command not found. Ketik "help" untuk melihat perintah.`);
        break;
    }

    setTerminalHistory(newHistory);
    setTerminalInput('');
  };

  const handleCreateSnapshot = async () => {
    if (!selectedVps) return;
    try {
      setIsCreatingSnapshot(true);
      await CloudProApi.createVpsSnapshot(selectedVps.id, snapshotName, currentUser);
      showToast('info', 'Snapshot Dimulai', 'Perekaman disk snapshot telah dimasukkan ke background queue.');
      setSnapshotName('');
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Membuat Snapshot', err.message);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = (snap: VpsSnapshot) => {
    if (!selectedVps) return;
    confirmAction({
      title: 'Pulihkan Snapshot VPS',
      message: `Peringatan: Merestore snapshot "${snap.name}" akan menimpa seluruh file sistem saat ini dengan snapshot tanggal ${snap.createdAt.substring(0, 10)}. Lanjutkan?`,
      confirmText: 'Restore Snapshot',
      isDanger: true,
      onConfirm: async () => {
        try {
          await CloudProApi.restoreVpsSnapshot(selectedVps.id, snap.id, currentUser);
          showToast('info', 'Restore Snapshot Berjalan', 'Instance sedang dipulihkan.');
          refreshAll();
        } catch (err: any) {
          showToast('error', 'Gagal Restore Snapshot', err.message);
        }
      },
    });
  };

  const handleAddFwRule = () => {
    if (!selectedVps) return;
    const newRule: VpsFirewallRule = {
      id: `vfw-${Date.now()}`,
      vpsId: selectedVps.id,
      protocol: fwProto,
      portRange: fwPort.trim() || 'ALL',
      source: fwSource.trim() || '0.0.0.0/0',
      action: fwAction,
      description: fwDesc.trim() || `Rule port ${fwPort}`,
    };
    db.saveVpsFirewallRule(newRule);
    showToast('success', 'Aturan Firewall Ditambahkan', `Port ${newRule.portRange} (${newRule.protocol}) ditambahkan.`);
    setShowAddFwModal(false);
    setFwDesc('');
    refreshAll();
  };

  const handleDeleteFwRule = (ruleId: string) => {
    db.deleteVpsFirewallRule(ruleId);
    showToast('info', 'Aturan Dihapus', 'Aturan firewall telah dihapus dari security group VPS.');
    refreshAll();
  };

  const handleSavePtr = () => {
    if (!selectedVps) return;
    const updated = { ...selectedVps, reverseDns: ptrRecord.trim() || selectedVps.hostname };
    db.saveVpsInstance(updated);
    setSelectedVps(updated);
    showToast('success', 'Reverse DNS Disimpan', `rDNS PTR untuk IP ${selectedVps.ipV4} telah diatur ke ${updated.reverseDns}`);
    refreshAll();
  };

  const handleRebuildOs = async () => {
    if (!selectedVps) return;
    try {
      await CloudProApi.rebuildVps(
        selectedVps.id,
        rebuildOs,
        rebuildOs.toLowerCase().includes('ubuntu') ? 'ubuntu' : rebuildOs.toLowerCase().includes('debian') ? 'debian' : 'linux',
        deployPassword,
        currentUser
      );
      showToast('info', 'Rebuild OS Dimulai', `Format dan instalasi ulang ${rebuildOs} sedang dikerjakan.`);
      setShowRebuildModal(false);
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Rebuild', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card - Streamlined & Iconic ("Ramping & Modern") */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Iconic Modern Hypervisor Emblem */}
            <KvmModernEmblem className="h-11 w-11 sm:h-12 sm:w-12 shrink-0" />
            
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
                  Cloud VPS KVM Instances
                </h2>
                
                {/* Iconic Elegant Badge */}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-slate-900/90 px-2.5 py-0.5 text-slate-100 shadow-2xs backdrop-blur-md">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="font-mono text-[10px] font-black uppercase tracking-wider text-sky-300">
                    KVM HYPERVISOR v2.4
                  </span>
                  <span className="text-[10px] text-slate-600 hidden xs:inline">•</span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400 hidden xs:inline">
                    ENTERPRISE
                  </span>
                </div>
              </div>

              <p className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 sm:line-clamp-none">
                Dedicated Virtual Server &bull; Pure NVMe Storage &bull; Dedicated IPv4/IPv6 &bull; Web VNC Console
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDeployModal(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:from-sky-500 hover:to-indigo-500 hover:shadow-sky-500/30 transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Provisi VPS Baru</span>
          </button>
        </div>
      </div>

      {/* Metrics Highlights Bar - Streamlined Compact Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold">Instance Aktif</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
              <Server className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {runningCount}
            </span>
            <span className="font-mono text-[10px] text-slate-400">/ {filteredInstances.length} Total</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold">Total Alokasi vCPU</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Cpu className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {totalCores}
            </span>
            <span className="font-mono text-[10px] text-slate-400">Cores Dedicated</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold">Total Memori RAM</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Activity className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {totalRamGb}
            </span>
            <span className="font-mono text-[10px] text-slate-400">GB DDR5 ECC</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-semibold">Storage NVMe</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <HardDrive className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {totalDiskGb}
            </span>
            <span className="font-mono text-[10px] text-slate-400">GB PCIe 4.0</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari VPS berdasarkan nama, hostname, atau IP..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            aria-label="Filter Wilayah VPS"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">Semua Region</option>
            <option value="ID-CGK1">Jakarta (ID-CGK1)</option>
            <option value="SG-SIN1">Singapore (SG-SIN1)</option>
            <option value="JP-HND1">Tokyo (JP-HND1)</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter Status VPS"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-sky-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="all">Semua Status</option>
            <option value="running">Online / Running</option>
            <option value="stopped">Stopped / Offline</option>
            <option value="restarting">Restarting</option>
            <option value="provisioning">Provisioning</option>
          </select>

          <button
            onClick={() => refreshAll()}
            title="Muat ulang status"
            aria-label="Muat ulang status VPS"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* VPS Instance Cards Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredInstances.map(vps => {
          const isSelected = selectedVps?.id === vps.id;
          return (
            <div
              key={vps.id}
              className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                isSelected
                  ? 'border-sky-500 ring-2 ring-sky-500/20 bg-white dark:bg-slate-900 shadow-lg'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 hover:shadow-sm'
              }`}
            >
              {/* Card Header */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                        vps.status === 'running'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : vps.status === 'stopped'
                          ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}
                    >
                      <Server className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {vps.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            vps.status === 'running'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : vps.status === 'stopped'
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 animate-pulse'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              vps.status === 'running'
                                ? 'bg-emerald-500'
                                : vps.status === 'stopped'
                                ? 'bg-slate-400'
                                : 'bg-amber-500'
                            }`}
                          />
                          {vps.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400 font-mono">
                        {vps.hostname}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                      Rp {Math.round(vps.monthlyPrice * 16000).toLocaleString('id-ID')}
                      <span className="text-[10px] font-normal text-slate-400">/bln</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      ${vps.monthlyPrice.toFixed(2)} &bull; {vps.regionName.split(' ')[0]}
                    </div>
                  </div>
                </div>

                {/* Specs Pill Summary */}
                <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs dark:bg-slate-800/60">
                  <div>
                    <div className="text-[10px] text-slate-400">vCPU</div>
                    <div className="font-bold text-slate-700 dark:text-slate-200">
                      {vps.vCpu} Core
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">RAM</div>
                    <div className="font-bold text-slate-700 dark:text-slate-200">
                      {(vps.ramMb / 1024).toFixed(0)} GB
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Storage</div>
                    <div className="font-bold text-slate-700 dark:text-slate-200">
                      {vps.diskGb} GB NVMe
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Bandwidth</div>
                    <div className="font-bold text-slate-700 dark:text-slate-200">
                      {vps.bandwidthUsedGb}G / {vps.bandwidthLimitGb}G
                    </div>
                  </div>
                </div>

                {/* IP Address & Network */}
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-600 dark:text-slate-300 font-medium">
                      {vps.ipV4}
                    </span>
                    <button
                      onClick={() => handleCopy(vps.ipV4)}
                      title="Salin IPv4"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      {copiedText === vps.ipV4 ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {vps.osDistro.split(' ')[0]} {vps.osDistro.split(' ')[1] || ''}
                  </span>
                </div>

                {/* Quick Action Footer */}
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {vps.status === 'stopped' ? (
                      <button
                        onClick={() => handlePower(vps, 'start')}
                        title="Nyalakan Instance"
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors"
                      >
                        <Play className="h-3 w-3" />
                        <span>Start</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handlePower(vps, 'restart')}
                          title="Restart Instance"
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <RotateCw className="h-3 w-3" />
                          <span>Reboot</span>
                        </button>
                        <button
                          onClick={() => handlePower(vps, 'stop')}
                          title="Matikan Daya"
                          className="flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/20"
                        >
                          <Square className="h-3 w-3" />
                          <span>Stop</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setSelectedVps(vps);
                        setActiveDetailTab('console');
                      }}
                      title="Buka Web Terminal VNC Console"
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Terminal className="h-3 w-3" />
                      <span>Console</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedVps(vps);
                        setActiveDetailTab('metrics');
                      }}
                      className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-sky-700 transition-colors"
                    >
                      <span>Kelola</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredInstances.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <Server className="h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
            Belum Ada VPS Instance
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Tidak ada instance VPS yang cocok dengan kriteria pencarian Anda. Klik tombol di bawah untuk meluncurkan node Cloud KVM pertama Anda.
          </p>
          <button
            onClick={() => setShowDeployModal(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            <span>Deploy VPS Sekarang</span>
          </button>
        </div>
      )}

      {/* Selected VPS Detail Modal Drawer */}
      {selectedVps && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Top Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedVps(null)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                  title="Kembali ke Daftar VPS"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Kembali</span>
                </button>
                <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white font-bold">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedVps.name}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {selectedVps.ipV4}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {selectedVps.regionName} &bull; {selectedVps.osDistro}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedVps(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Navigation Tabs Inside Modal */}
            <div className="flex border-b border-slate-200 px-6 dark:border-slate-800 overflow-x-auto">
              <button
                onClick={() => setActiveDetailTab('metrics')}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeDetailTab === 'metrics'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Activity className="h-4 w-4" />
                <span>Live Telemetry & Spek</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('console')}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeDetailTab === 'console'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Terminal className="h-4 w-4" />
                <span>VNC / Serial Console</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('snapshots')}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeDetailTab === 'snapshots'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Camera className="h-4 w-4" />
                <span>Snapshots & Backup</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('firewall')}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeDetailTab === 'firewall'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Security Group Firewall</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('network')}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeDetailTab === 'network'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Globe className="h-4 w-4" />
                <span>Jaringan & rDNS</span>
              </button>

              <button
                onClick={() => setActiveDetailTab('resize')}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeDetailTab === 'resize'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Sliders className="h-4 w-4" />
                <span>Resize & Rebuild</span>
              </button>
            </div>

            {/* Tab Body Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: METRICS & SPEC BREAKDOWN */}
              {activeDetailTab === 'metrics' && (
                <div className="space-y-6">
                  {/* Power status bar */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          selectedVps.status === 'running'
                            ? 'bg-emerald-500 animate-pulse'
                            : selectedVps.status === 'stopped'
                            ? 'bg-slate-400'
                            : 'bg-amber-500'
                        }`}
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Status: {selectedVps.status.toUpperCase()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Uptime: {selectedVps.uptime}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedVps.status === 'running' ? (
                        <>
                          <button
                            onClick={() => handlePower(selectedVps, 'restart')}
                            className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                            <span>Reboot OS</span>
                          </button>
                          <button
                            onClick={() => handlePower(selectedVps, 'stop')}
                            className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            <Square className="h-3.5 w-3.5" />
                            <span>Power Off</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handlePower(selectedVps, 'start')}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>Nyalakan VPS</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Real-time Hardware Gauges */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Beban CPU Saat Ini</span>
                        <Cpu className="h-4 w-4 text-sky-500" />
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {selectedVps.liveCpuPct}%
                        </span>
                        <span className="text-[11px] text-slate-400">
                          dari {selectedVps.vCpu} Cores Dedicated
                        </span>
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full bg-sky-500 transition-all duration-500"
                          style={{ width: `${selectedVps.liveCpuPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Penggunaan RAM</span>
                        <Activity className="h-4 w-4 text-indigo-500" />
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {(selectedVps.liveRamMb / 1024).toFixed(1)} GB
                        </span>
                        <span className="text-[11px] text-slate-400">
                          / {(selectedVps.ramMb / 1024).toFixed(0)} GB Total
                        </span>
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${(selectedVps.liveRamMb / selectedVps.ramMb) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Bandwidth Bulan Ini</span>
                        <Radio className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          {selectedVps.bandwidthUsedGb} GB
                        </span>
                        <span className="text-[11px] text-slate-400">
                          / {selectedVps.bandwidthLimitGb} GB Kuota
                        </span>
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${(selectedVps.bandwidthUsedGb / selectedVps.bandwidthLimitGb) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Access Credentials & SSH Command Card */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Koneksi Akses SSH Terminal
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Gunakan perintah berikut pada terminal Linux, macOS, atau Windows Terminal Anda:
                    </p>

                    <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900 px-4 py-2.5 font-mono text-xs text-slate-100">
                      <span>ssh root@{selectedVps.ipV4}</span>
                      <button
                        onClick={() => handleCopy(`ssh root@${selectedVps.ipV4}`)}
                        className="rounded p-1 text-slate-400 hover:text-white"
                      >
                        {copiedText === `ssh root@${selectedVps.ipV4}` ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {selectedVps.rootPassword && (
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>Password Root Awal: <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedVps.rootPassword}</strong></span>
                        <button
                          onClick={() => handleCopy(selectedVps.rootPassword!)}
                          className="text-sky-600 hover:underline text-[11px]"
                        >
                          Salin Password
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: INTERACTIVE VNC / SERIAL CONSOLE */}
              {activeDetailTab === 'console' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>KVM Serial WebSocket: <strong>Connected [Port 5901 TLS]</strong></span>
                    </div>
                    <button
                      onClick={() => setTerminalHistory(['KVM Serial Console reconnected.', 'Type "help" for options.'])}
                      className="text-sky-600 hover:underline text-[11px]"
                    >
                      Bersihkan / Reset Layar
                    </button>
                  </div>

                  <div className="h-96 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-y-auto shadow-inner flex flex-col justify-between">
                    <div className="space-y-1">
                      {terminalHistory.map((line, idx) => (
                        <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                          {line}
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleExecuteTerminal} className="mt-3 flex items-center gap-2 border-t border-slate-800 pt-2">
                      <span className="text-emerald-500 font-bold">root@{selectedVps.hostname}:~#</span>
                      <input
                        type="text"
                        value={terminalInput}
                        onChange={e => setTerminalInput(e.target.value)}
                        placeholder="Ketik perintah (contoh: top, df -h, free -m, ip a)..."
                        className="flex-1 bg-transparent text-emerald-300 focus:outline-hidden text-xs font-mono"
                        autoFocus
                      />
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 3: SNAPSHOTS & BACKUP */}
              {activeDetailTab === 'snapshots' && (
                <div className="space-y-6">
                  {/* Create Snapshot Form */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Buat Snapshot Instan
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Snapshot menyimpan seluruh keadaan sistem dan volume NVMe pada titik waktu tertentu untuk pemulihan cepat (point-in-time recovery).
                    </p>

                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={snapshotName}
                        onChange={e => setSnapshotName(e.target.value)}
                        placeholder="Nama snapshot (mis: sebelum-upgrade-database)"
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        onClick={handleCreateSnapshot}
                        disabled={isCreatingSnapshot}
                        className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>{isCreatingSnapshot ? 'Merekam...' : 'Ambil Snapshot'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Snapshot List */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3">
                      Daftar Snapshot Tersimpan ({db.getVpsSnapshots(selectedVps.id).length})
                    </h4>

                    <div className="space-y-2">
                      {db.getVpsSnapshots(selectedVps.id).map(snap => (
                        <div
                          key={snap.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {snap.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Ukuran: {snap.sizeGb} GB &bull; Dibuat: {snap.createdAt.substring(0, 16).replace('T', ' ')}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRestoreSnapshot(snap)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => {
                                db.deleteVpsSnapshot(snap.id);
                                showToast('info', 'Snapshot Dihapus', 'File snapshot telah dihapus dari storage.');
                                refreshAll();
                              }}
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {db.getVpsSnapshots(selectedVps.id).length === 0 && (
                        <div className="p-6 text-center text-xs text-slate-400">
                          Belum ada snapshot untuk instance ini.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: FIREWALL SECURITY GROUPS */}
              {activeDetailTab === 'firewall' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Aturan Firewall Inbound / Outbound
                      </h4>
                      <p className="text-xs text-slate-400">
                        Atur port terbuka pada level hypervisor sebelum mencapai sistem operasi VPS.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddFwModal(true)}
                      className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Tambah Aturan Port</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3 font-semibold">Protokol</th>
                          <th className="p-3 font-semibold">Port Range</th>
                          <th className="p-3 font-semibold">Sumber (CIDR)</th>
                          <th className="p-3 font-semibold">Aksi</th>
                          <th className="p-3 font-semibold">Deskripsi</th>
                          <th className="p-3 text-right">Opsi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {db.getVpsFirewallRules(selectedVps.id).map(rule => (
                          <tr key={rule.id}>
                            <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {rule.protocol}
                            </td>
                            <td className="p-3 font-mono text-slate-900 dark:text-white font-semibold">
                              {rule.portRange}
                            </td>
                            <td className="p-3 font-mono text-slate-500">
                              {rule.source}
                            </td>
                            <td className="p-3">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  rule.action === 'ACCEPT'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}
                              >
                                {rule.action}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">
                              {rule.description}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeleteFwRule(rule.id)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {showAddFwModal && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900/50 dark:bg-sky-950/20">
                      <h5 className="font-bold text-xs text-sky-900 dark:text-sky-300 mb-3">
                        Tambah Aturan Firewall Port Baru
                      </h5>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500">Protokol</label>
                          <select
                            value={fwProto}
                            onChange={e => setFwProto(e.target.value as any)}
                            aria-label="Protokol Aturan Port"
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                          >
                            <option value="TCP">TCP</option>
                            <option value="UDP">UDP</option>
                            <option value="ICMP">ICMP</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500">Port (atau Range)</label>
                          <input
                            type="text"
                            value={fwPort}
                            onChange={e => setFwPort(e.target.value)}
                            placeholder="mis. 8080 atau 3000-4000"
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500">Sumber IP / CIDR</label>
                          <input
                            type="text"
                            value={fwSource}
                            onChange={e => setFwSource(e.target.value)}
                            placeholder="0.0.0.0/0"
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500">Aksi</label>
                          <select
                            value={fwAction}
                            onChange={e => setFwAction(e.target.value as any)}
                            aria-label="Aksi Aturan Port"
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                          >
                            <option value="ACCEPT">ACCEPT (Izinkan)</option>
                            <option value="DROP">DROP (Tolak)</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="text-[10px] font-semibold text-slate-500">Keterangan / Label</label>
                        <input
                          type="text"
                          value={fwDesc}
                          onChange={e => setFwDesc(e.target.value)}
                          placeholder="mis. Port API Backend SpringBoot"
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                        />
                      </div>

                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          onClick={() => setShowAddFwModal(false)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                        >
                          Batal
                        </button>
                        <button
                          onClick={handleAddFwRule}
                          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                        >
                          Simpan Aturan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: NETWORK & REVERSE DNS */}
              {activeDetailTab === 'network' && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Konfigurasi Alamat IP Dedicated
                    </h4>

                    <div className="mt-3 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                        <span className="text-slate-400">Alamat IPv4 Publik</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {selectedVps.ipV4} / 24
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                        <span className="text-slate-400">Gateway IPv4</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {selectedVps.gateway}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                        <span className="text-slate-400">Dedicated IPv6 Subnet</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {selectedVps.ipV6}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Speed Port Link</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          10 Gbps Uplink Redundant
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reverse DNS (PTR) */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Reverse DNS (PTR Record)
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      PTR record sangat penting untuk reputasi pengiriman email SMTP dan validasi hostname reverse lookup.
                    </p>

                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        defaultValue={selectedVps.reverseDns}
                        onChange={e => setPtrRecord(e.target.value)}
                        placeholder="mail.domainanda.com"
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        onClick={handleSavePtr}
                        className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                      >
                        Simpan rDNS
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: RESIZE & REBUILD */}
              {activeDetailTab === 'resize' && (
                <div className="space-y-6">
                  {/* Upgrade Hardware Tier */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Upgrade & Resize Spesifikasi VPS
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Tingkatkan jumlah core CPU dan RAM kapan saja secara instan tanpa kehilangan data disk.
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        { name: 'Standard Tier', vCpu: 2, ramMb: 4096, diskGb: 80, price: 18.0 },
                        { name: 'Production Tier', vCpu: 4, ramMb: 8192, diskGb: 160, price: 32.0 },
                        { name: 'High-Compute Tier', vCpu: 8, ramMb: 16384, diskGb: 320, price: 64.0 },
                      ].map((tier, i) => (
                        <div
                          key={i}
                          className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 hover:border-sky-500 transition-colors dark:border-slate-800"
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {tier.name}
                            </div>
                            <div className="mt-1 text-sm font-black text-sky-600 dark:text-sky-400 font-mono">
                              Rp {Math.round(tier.price * 16000).toLocaleString('id-ID')}/bln
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              (${tier.price.toFixed(2)}/bln)
                            </div>
                            <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                              <div>&bull; {tier.vCpu} Cores Dedicated vCPU</div>
                              <div>&bull; {tier.ramMb / 1024} GB RAM DDR5</div>
                              <div>&bull; {tier.diskGb} GB Pure NVMe</div>
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              try {
                                await CloudProApi.resizeVps(selectedVps.id, tier.vCpu, tier.ramMb, tier.diskGb, tier.price, currentUser);
                                showToast('success', 'Spesifikasi Ditingkatkan', `VPS berhasil di-resize ke ${tier.name}.`);
                                setSelectedVps(prev => prev ? { ...prev, vCpu: tier.vCpu, ramMb: tier.ramMb, diskGb: tier.diskGb, monthlyPrice: tier.price } : null);
                                refreshAll();
                              } catch (e: any) {
                                showToast('error', 'Gagal Resize', e.message);
                              }
                            }}
                            className="mt-3 w-full rounded-lg bg-sky-600 py-1.5 text-center text-xs font-semibold text-white hover:bg-sky-700"
                          >
                            Pilih Paket Ini
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rebuild OS Distro */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                        Format Ulang & Rebuild Sistem Operasi
                      </h4>
                    </div>
                    <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-400/80">
                      Tindakan ini akan memformat disk sistem root dan menginstal OS baru dari image cloud-init. Seluruh data pada partisi sistem akan dibersihkan.
                    </p>

                    <div className="mt-3 flex gap-2">
                      <select
                        value={rebuildOs}
                        onChange={e => setRebuildOs(e.target.value)}
                        aria-label="Pilih Distro OS Baru"
                        className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="Ubuntu 24.04 LTS (Noble Numbat)">Ubuntu 24.04 LTS</option>
                        <option value="Ubuntu 22.04 LTS (Jammy Jellyfish)">Ubuntu 22.04 LTS</option>
                        <option value="Debian 12 Bookworm">Debian 12 Bookworm</option>
                        <option value="Rocky Linux 9.4">Rocky Linux 9.4</option>
                        <option value="AlmaLinux 9.4">AlmaLinux 9.4</option>
                        <option value="Alpine Linux 3.19">Alpine Linux 3.19</option>
                      </select>

                      <button
                        onClick={handleRebuildOs}
                        className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                      >
                        Rebuild OS Sekarang
                      </button>
                    </div>
                  </div>

                  {/* Danger Zone: Terminate VPS */}
                  <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-5 dark:border-rose-900/40 dark:bg-rose-950/20">
                    <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300">
                      Zona Berbahaya: Hapus Instance Permanen
                    </h4>
                    <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">
                      Menghapus instance ini akan melepaskan IP address, menghapus data volume NVMe, dan membatalkan siklus billing berjalan.
                    </p>
                    <button
                      onClick={() => handleTerminateVps(selectedVps)}
                      className="mt-3 flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Terminasi dan Hapus VPS Ini</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEPLOY NEW VPS WIZARD MODAL */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeployModal(false)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Kembali</span>
                </button>
                <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Provisi Dedicated Cloud VPS Instance
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Deploy KVM Virtual Private Server dengan jaringan berkecepatan tinggi dalam hitungan detik.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeployModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeploySubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Step 1: Choose Datacenter Region */}
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  1. Pilih Region & Datacenter
                </label>
                <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {[
                    { id: 'ID-CGK1', name: 'Jakarta (ID-CGK1)', country: 'id', desc: 'Equinix JK1 &bull; Latency 2ms' },
                    { id: 'SG-SIN1', name: 'Singapore (SG-SIN1)', country: 'sg', desc: 'Jurong Node &bull; Latency 8ms' },
                    { id: 'JP-HND1', name: 'Tokyo (JP-HND1)', country: 'jp', desc: 'Equinix TY8 &bull; Latency 45ms' },
                  ].map(r => (
                    <div
                      key={r.id}
                      onClick={() => setDeployRegion({ id: r.id, name: r.name, country: r.country })}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        deployRegion.id === r.id
                          ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20 dark:bg-sky-950/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {r.name}
                      </div>
                      <div
                        className="mt-1 text-[11px] text-slate-500"
                        dangerouslySetInnerHTML={{ __html: r.desc }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2: Choose OS Distro */}
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  2. Pilih Sistem Operasi (OS Image)
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { distro: 'Ubuntu 24.04 LTS (Noble Numbat)', icon: 'ubuntu', label: 'Ubuntu 24.04' },
                    { distro: 'Debian 12 Bookworm', icon: 'debian', label: 'Debian 12' },
                    { distro: 'Rocky Linux 9.4 (Blue Onyx)', icon: 'rocky', label: 'Rocky Linux 9' },
                    { distro: 'Alpine Linux 3.19 (Minimal)', icon: 'alpine', label: 'Alpine 3.19' },
                  ].map(o => (
                    <div
                      key={o.distro}
                      onClick={() => setDeployOs({ distro: o.distro, icon: o.icon })}
                      className={`cursor-pointer rounded-xl border p-3 text-center transition-all ${
                        deployOs.distro === o.distro
                          ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20 dark:bg-sky-950/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {o.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Cloud-Init Ready</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Choose Hardware Plan Tier */}
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white">
                  3. Pilih Spesifikasi Hardware Tier
                </label>
                <div className="mt-2 space-y-2">
                  {[
                    { name: 'Starter Node', vCpu: 1, ramMb: 2048, diskGb: 40, bandwidthGb: 1000, price: 10.0 },
                    { name: 'Standard Cloud', vCpu: 2, ramMb: 4096, diskGb: 80, bandwidthGb: 3000, price: 18.0 },
                    { name: 'Pro Cloud Node', vCpu: 4, ramMb: 8192, diskGb: 160, bandwidthGb: 5000, price: 32.0 },
                    { name: 'High-Compute Node', vCpu: 8, ramMb: 16384, diskGb: 320, bandwidthGb: 10000, price: 64.0 },
                  ].map(p => (
                    <div
                      key={p.name}
                      onClick={() => setDeployPlan(p)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                        deployPlan.name === p.name
                          ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20 dark:bg-sky-950/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {p.name}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {p.vCpu} vCPU Dedicated &bull; {p.ramMb / 1024} GB RAM &bull; {p.diskGb} GB Pure NVMe &bull; {p.bandwidthGb} GB Bandwidth
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-sky-600 dark:text-sky-400 font-mono">
                          Rp {Math.round(p.price * 16000).toLocaleString('id-ID')}
                          <span className="text-[10px] font-normal text-slate-400">/bln</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          ${p.price.toFixed(2)}/bln
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 4: Name and Authentication */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Label Nama Instance
                  </label>
                  <input
                    type="text"
                    value={deployName}
                    onChange={e => setDeployName(e.target.value)}
                    placeholder="mis. jkt-web-cluster-01"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Hostname FQDN
                  </label>
                  <input
                    type="text"
                    value={deployHostname}
                    onChange={e => setDeployHostname(e.target.value)}
                    placeholder="app01.domainanda.com"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Password Root SSH
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={deployPassword}
                    onChange={e => setDeployPassword(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setDeployPassword('cPro#' + Math.random().toString(36).substring(2, 8) + '!')}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Automated Backups Toggle */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Snapshot Otomatis Harian (Auto Backup)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Merekam snapshot harian secara otomatis ke cluster backup sekunder.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={deployAutoBackup}
                  onChange={e => setDeployAutoBackup(e.target.checked)}
                  aria-label="Snapshot Otomatis Harian"
                  className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="text-xs">
                  <span className="text-slate-400">Estimasi Biaya Bulanan: </span>
                  <strong className="font-mono text-slate-900 dark:text-white">
                    Rp {Math.round(deployPlan.price * 16000).toLocaleString('id-ID')}/bulan (${deployPlan.price.toFixed(2)})
                  </strong>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeployModal(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isDeploying}
                    className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-sky-500/20 hover:bg-sky-700 disabled:opacity-50"
                  >
                    <Zap className="h-4 w-4" />
                    <span>{isDeploying ? 'Sedang Memprovisi...' : 'Deploy VPS Sekarang'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
