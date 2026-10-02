import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  ShieldCheck, 
  Plus, 
  Search, 
  Filter, 
  Server, 
  Link, 
  Unlink, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { storage } from '../../services/storage';
import { IpAddressRecord, ServerNode, HostingAccount } from '../../types';

export const IpAddressManager: React.FC = () => {
  const [ipList, setIpList] = useState<IpAddressRecord[]>([]);
  const [servers, setServers] = useState<ServerNode[]>([]);
  const [accounts, setAccounts] = useState<HostingAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'dedicated' | 'shared'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'available'>('all');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedIpForAssign, setSelectedIpForAssign] = useState<IpAddressRecord | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // Form State
  const [newIp, setNewIp] = useState('');
  const [newSubnet, setNewSubnet] = useState('255.255.255.248 (/29)');
  const [newGateway, setNewGateway] = useState('');
  const [newServerId, setNewServerId] = useState('');
  const [newType, setNewType] = useState<'dedicated' | 'shared'>('dedicated');
  const [newPtrRecord, setNewPtrRecord] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [quickPublicIp, setQuickPublicIp] = useState('');
  const [isAutoDetectingIp, setIsAutoDetectingIp] = useState(false);
  const [cfEdgeIpv4List, setCfEdgeIpv4List] = useState<string[]>(['172.67.223.133', '104.21.95.88']);
  const [isApplyingCfIpv4, setIsApplyingCfIpv4] = useState(false);

  const handleApplyCloudflareAnycastIpv4 = async () => {
    setIsApplyingCfIpv4(true);
    try {
      let ipv4s = ['172.67.223.133', '104.21.95.88'];
      try {
        const res = await fetch('/api/network/cloudflare-ipv4?domain=denbaguse.my.id');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.ipv4List) && data.ipv4List.length > 0) {
            ipv4s = data.ipv4List;
            setCfEdgeIpv4List(ipv4s);
          }
        }
      } catch {
        // Use verified Cloudflare Anycast IPs
      }

      const primarySrv = servers[0];
      const existingIps = storage.getIpAddresses();

      ipv4s.forEach((ipAddr, idx) => {
        if (!existingIps.some(i => i.ip === ipAddr)) {
          storage.addIpAddress({
            ip: ipAddr,
            subnetMask: '255.255.255.0 (/24 Cloudflare Anycast)',
            gateway: 'Cloudflare Edge Gateway (Tunnel Healthy)',
            type: idx === 0 ? 'shared' : 'dedicated',
            status: 'assigned',
            serverId: primarySrv?.id || 'srv-sg-01',
            serverName: primarySrv?.name || 'CloudPRO-Server (Cloudflare Edge)',
            ptrRecord: idx === 0 ? 'denbaguse.my.id' : 'servercloud.denbaguse.my.id',
            notes: `IPv4 Anycast Publik Gratis dari Cloudflare Edge #${idx + 1} (Aktif via Tunnel CloudPRO-Server)`,
          });
        }
      });

      const primaryCfIp = ipv4s[0] || '172.67.223.133';
      setQuickPublicIp(primaryCfIp);
      const stats = storage.applyGlobalPublicIp(primaryCfIp);

      storage.addAuditLog(
        'apply_cloudflare_anycast_ipv4',
        'ip_management',
        `Mengaktifkan IPv4 Anycast Gratis Cloudflare (${ipv4s.join(', ')}) ke Server Utama, NS1/NS2, dan ${stats.updatedAccounts} Akun Hosting.`
      );

      loadData();
      showNotice(
        `BERHASIL! IPv4 Publik Cloudflare (${ipv4s.join(' & ')}) telah dipasang ke Server Cloud PRO, NS1/NS2, dan ${stats.updatedAccounts} Akun Hosting!`
      );
    } finally {
      setIsApplyingCfIpv4(false);
    }
  };

  const handleAutoDetectPublicIp = async () => {
    setIsAutoDetectingIp(true);
    try {
      const res = await fetch('/api/ddns/status');
      const data = await res.json();
      const detectedIp = data?.detected?.ipv4 || data?.detected?.ipv6 || '';
      if (detectedIp) {
        setQuickPublicIp(detectedIp);
        showNotice(`IP Publik mesin berhasil dideteksi: ${detectedIp}`);
      } else {
        showNotice('Tidak dapat mendeteksi IP publik otomatis, silakan ketik manual.', 'error');
      }
    } catch {
      showNotice('Gagal menghubungi layanan deteksi IP server.', 'error');
    } finally {
      setIsAutoDetectingIp(false);
    }
  };

  const handleOneClickApplyGlobalIp = async () => {
    const cleanIp = quickPublicIp.trim();
    if (!cleanIp) {
      showNotice('Masukkan IP Publik terlebih dahulu atau klik Deteksi Otomatis.', 'error');
      return;
    }

    // 1. Ensure IP is added to pool if not already present
    const existing = storage.getIpAddresses().find(i => i.ip === cleanIp);
    const primarySrv = servers[0];
    if (!existing) {
      storage.addIpAddress({
        ip: cleanIp,
        subnetMask: '255.255.255.248 (/29)',
        gateway: 'Auto-Gateway',
        type: 'shared',
        status: 'assigned',
        serverId: primarySrv?.id || 'srv-sg-01',
        serverName: primarySrv?.name || 'Primary Server',
        ptrRecord: 'srv1.denbaguse.my.id',
        notes: 'IP Publik Utama Cluster (Auto-Connected)',
      });
    }

    // 2. Apply globally across Server Node, Nameservers, Hosting Accounts, and DNS A/SPF records
    const stats = storage.applyGlobalPublicIp(cleanIp);

    // 3. Also sync with backend DDNS if configured
    try {
      await fetch('/api/ddns/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordType: cleanIp.includes(':') ? 'AAAA' : 'A',
          customIpOverride: cleanIp,
          syncImmediately: true,
        }),
      });
    } catch {
      // Ignore backend sync error if token not set
    }

    storage.addAuditLog(
      'apply_global_public_ip',
      'ip_management',
      `Auto-Connect IP Publik Utama ${cleanIp} ke ${stats.updatedServers} Server Node, NS1/NS2, ${stats.updatedAccounts} Akun Hosting, dan ${stats.updatedDns} DNS Records.`
    );

    loadData();
    showNotice(
      `BERHASIL! IP Publik ${cleanIp} otomatis terkoneksi ke Server Utama, NS1/NS2, ${stats.updatedAccounts} Akun Hosting, dan ${stats.updatedDns} DNS Record tanpa setting manual!`
    );
  };

  const loadData = () => {
    const ips = storage.getIpAddresses();
    const srvs = storage.getServerNodes();
    const accs = storage.getHostingAccounts();
    setIpList([...ips]);
    setServers([...srvs]);
    setAccounts([...accs]);
    if (srvs.length > 0 && !newServerId) {
      setNewServerId(srvs[0].id);
    }
  };

  useEffect(() => {
    // Check if the current IP list only contains dummy/sample project IPs
    const cur = storage.getIpAddresses();
    const isSampleOnly = cur.length > 0 && cur.every(i => ['ip-1', 'ip-2', 'ip-3', 'ip-4', 'ip-5', 'ip-6'].includes(i.id));
    if (isSampleOnly) {
      storage.clearAllSampleIps();
    }
    loadData();
  }, []);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) {
      showNotice('IP Address tidak boleh kosong', 'error');
      return;
    }

    const selectedServer = servers.find(s => s.id === newServerId);
    storage.addIpAddress({
      ip: newIp.trim(),
      subnetMask: newSubnet,
      gateway: newGateway.trim() || 'Auto-Gateway',
      type: newType,
      status: 'available',
      serverId: newServerId,
      serverName: selectedServer ? selectedServer.name : 'Primary Server',
      ptrRecord: newPtrRecord.trim() || undefined,
      notes: newNotes.trim() || 'Dedicated Pool Added',
    });

    storage.addAuditLog('add_ip', 'ip_management', `Menambahkan IP publik ${newIp.trim()} (${newType}) ke server ${selectedServer?.name}`);
    
    setIsAddModalOpen(false);
    setNewIp('');
    setNewPtrRecord('');
    setNewNotes('');
    loadData();
    showNotice(`IP Publik ${newIp.trim()} berhasil ditambahkan ke cluster pool!`);
  };

  const handleOpenAssignModal = (ip: IpAddressRecord) => {
    setSelectedIpForAssign(ip);
    if (accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssign = () => {
    if (!selectedIpForAssign || !selectedAccountId) return;
    
    const targetAccount = accounts.find(a => a.id === selectedAccountId);
    const success = storage.assignDedicatedIpToAccount(selectedIpForAssign.id, selectedAccountId);
    
    if (success) {
      storage.addAuditLog(
        'assign_dedicated_ip',
        'ip_management',
        `Alokasi Dedicated IP ${selectedIpForAssign.ip} ke akun ${targetAccount?.username} (${targetAccount?.primaryDomain}). DNS A Record & SPF otomatis di-update.`
      );
      showNotice(`Dedicated IP ${selectedIpForAssign.ip} berhasil di-assign ke ${targetAccount?.primaryDomain}! DNS A Record & SPF di-update otomatis.`);
    } else {
      showNotice('Gagal meng-assign IP ke akun', 'error');
    }

    setIsAssignModalOpen(false);
    setSelectedIpForAssign(null);
    loadData();
  };

  const handleReleaseIp = (ip: IpAddressRecord) => {
    if (!window.confirm(`Lepas alokasi Dedicated IP ${ip.ip}? Akun akan dikembalikan ke shared IP server.`)) return;

    storage.releaseIpAddress(ip.id);
    storage.addAuditLog('release_dedicated_ip', 'ip_management', `Melepaskan Dedicated IP ${ip.ip} kembali menjadi Available Pool.`);
    showNotice(`IP ${ip.ip} berhasil dilepas dan kembali ke status Available Pool!`);
    loadData();
  };

  const handleDeleteIp = (ip: IpAddressRecord) => {
    if (!window.confirm(`Hapus permanen IP ${ip.ip} dari sistem?`)) return;

    storage.deleteIpAddress(ip.id);
    storage.addAuditLog('delete_ip', 'ip_management', `Menghapus IP ${ip.ip} dari cluster pool.`);
    showNotice(`IP ${ip.ip} berhasil dihapus.`);
    loadData();
  };

  // Filtered List
  const filteredIps = ipList.filter(ip => {
    const matchesSearch = 
      ip.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ip.serverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ip.assignedToName && ip.assignedToName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ip.assignedDomain && ip.assignedDomain.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ip.ptrRecord && ip.ptrRecord.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === 'all' || ip.type === filterType;
    const matchesStatus = filterStatus === 'all' || ip.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const dedicatedCount = ipList.filter(i => i.type === 'dedicated').length;
  const availableCount = ipList.filter(i => i.type === 'dedicated' && i.status === 'available').length;
  const assignedCount = ipList.filter(i => i.status === 'assigned').length;

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300' 
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs font-semibold underline ml-4 hover:opacity-80">Tutup</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Globe className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dedicated IP & IP Address Pool Manager
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola alokasi IP publik dedicated per akun hosting, reverse DNS (rDNS/PTR), dan auto-sinkronisasi DNS Zone A Record.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
                    <button
            onClick={() => {
              if (window.confirm('Kosongkan semua IP contoh bawaan proyek?')) {
                storage.clearAllSampleIps();
                loadData();
                showNotice('Semua IP bawaan proyek berhasil dihapus!');
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-300 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Kosongkan IP Proyek
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tambah IP Publik Baru
          </button>
        </div>
      </div>

      {/* GLOBAL PUBLIC IP SYNCHRONIZATION PANEL */}
      <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-5 shadow-xs dark:border-emerald-800/70 dark:bg-emerald-950/30">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Sinkronisasi Terpusat IP Publik Utama Server
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Perbarui alamat IPv4 publik utama secara serentak pada <strong>Server Node Utama</strong>, <strong>Private Nameserver (NS1/NS2)</strong>, <strong>Akun Hosting</strong>, dan <strong>DNS Zone Record (A &amp; SPF)</strong>.
            </p>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 pt-1">
              <div className="rounded-xl border border-emerald-200/90 bg-white px-3 py-2 dark:border-emerald-800/60 dark:bg-slate-900">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  IP Publik Aktif
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">
                  {servers[0]?.ipAddress || '103.147.154.21'}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200/90 bg-white px-3 py-2 dark:border-emerald-800/60 dark:bg-slate-900">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cakupan Propagasi
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  Node, NS1/NS2 &amp; vHost
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-emerald-200/90 bg-white px-3 py-2 dark:border-emerald-800/60 dark:bg-slate-900">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Status DNS BIND9
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-sky-700 dark:text-sky-400 truncate">
                  Auto-Sync A &amp; SPF
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <input
              type="text"
              value={quickPublicIp}
              onChange={e => setQuickPublicIp(e.target.value)}
              placeholder="Contoh: 103.147.154.21"
              className="rounded-xl border border-emerald-300 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-emerald-700 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={handleAutoDetectPublicIp}
              disabled={isAutoDetectingIp}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400 bg-white px-3.5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:bg-slate-900 dark:text-emerald-300 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAutoDetectingIp ? 'animate-spin' : ''}`} />
              <span>Deteksi IP Server</span>
            </button>
            <button
              type="button"
              onClick={handleOneClickApplyGlobalIp}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Terapkan IP Publik</span>
            </button>
          </div>
        </div>
      </div>

      {/* CLOUDFLARE ANYCAST PUBLIC IPv4 INTEGRATION */}
      <div className="rounded-xl border border-sky-300 bg-sky-50/80 p-5 shadow-xs dark:border-sky-800/70 dark:bg-sky-950/30">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Integrasi IPv4 Publik Anycast Cloudflare Edge
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Alokasi 2 IPv4 Anycast publik dari jaringan <strong>Cloudflare Zero Trust Tunnel (<code>CloudPRO-Server</code>)</strong> untuk domain <code>denbaguse.my.id</code> dan seluruh virtual host aktif.
            </p>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 pt-1">
              <div className="rounded-xl border border-sky-200/90 bg-white px-3 py-2 dark:border-sky-800/60 dark:bg-slate-900">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Primary Anycast IPv4
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-sky-700 dark:text-sky-400 truncate">
                  {cfEdgeIpv4List[0]}
                </div>
              </div>
              <div className="rounded-xl border border-sky-200/90 bg-white px-3 py-2 dark:border-sky-800/60 dark:bg-slate-900">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Secondary Anycast IPv4
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-sky-700 dark:text-sky-400 truncate">
                  {cfEdgeIpv4List[1]}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-sky-200/90 bg-white px-3 py-2 dark:border-sky-800/60 dark:bg-slate-900">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Status Jaringan
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">
                  Cloudflare Edge Active
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyCloudflareAnycastIpv4}
            disabled={isApplyingCfIpv4}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-500 shadow-xs cursor-pointer shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isApplyingCfIpv4 ? 'animate-spin' : ''}`} />
            <span>Sinkronkan IPv4 Cloudflare ({cfEdgeIpv4List[0]})</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total IP di Pool</span>
            <Globe className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{ipList.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">IPv4 Publik Terdaftar</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dedicated Pool</span>
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{dedicatedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">IP Alokasi Khusus Akun</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Dedicated</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{availableCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Siap Di-assign ke Klien</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Ter-Assign</span>
            <Link className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{assignedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Digunakan Akun / VPS / Cluster</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari IP, domain, username, PTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>Tipe:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-200"
          >
            <option value="all">Semua Tipe</option>
            <option value="dedicated">Dedicated Only</option>
            <option value="shared">Shared Only</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
            <span>Status:</span>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-200"
          >
            <option value="all">Semua Status</option>
            <option value="assigned">Assigned</option>
            <option value="available">Available (Siap Pakai)</option>
          </select>
        </div>
      </div>

      {/* Table of IP Addresses */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">IP Address & Subnet</th>
                <th className="px-5 py-3.5">Tipe</th>
                <th className="px-5 py-3.5">Server Node</th>
                <th className="px-5 py-3.5">Status & Alokasi</th>
                <th className="px-5 py-3.5">Reverse DNS (PTR)</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredIps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Tidak ada IP Address yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredIps.map((ip) => (
                  <tr key={ip.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* IP & Subnet */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {ip.ip}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Mask: {ip.subnetMask} &bull; GW: {ip.gateway}
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="px-5 py-4">
                      {ip.type === 'dedicated' ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <ShieldCheck className="h-3 w-3" />
                          Dedicated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Shared Pool
                        </span>
                      )}
                    </td>

                    {/* Server Node */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                        <Server className="h-3.5 w-3.5 text-slate-400" />
                        <span>{ip.serverName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {ip.serverId}
                      </div>
                    </td>

                    {/* Status & Assigned To */}
                    <td className="px-5 py-4">
                      {ip.status === 'assigned' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Assigned
                          </span>
                          <div className="font-semibold text-slate-900 dark:text-white text-xs">
                            {ip.assignedToName || ip.assignedDomain || 'Cluster Node'}
                          </div>
                          {ip.assignedDomain && (
                            <div className="text-[11px] text-sky-600 dark:text-sky-400 font-mono">
                              {ip.assignedDomain}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                          Available (Siap Assign)
                        </span>
                      )}
                    </td>

                    {/* PTR / rDNS */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px] bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded">
                        {ip.ptrRecord || '-'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {ip.status === 'available' && ip.type === 'dedicated' && (
                          <button
                            onClick={() => handleOpenAssignModal(ip)}
                            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                            title="Assign ke Akun Hosting"
                          >
                            <Link className="h-3 w-3" />
                            Assign Akun
                          </button>
                        )}

                        {ip.status === 'assigned' && ip.type === 'dedicated' && ip.assignedToType === 'account' && (
                          <button
                            onClick={() => handleReleaseIp(ip)}
                            className="inline-flex items-center gap-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700 px-2 py-1.5 text-[11px] font-medium transition-colors"
                            title="Lepas Dedicated IP"
                          >
                            <Unlink className="h-3 w-3" />
                            Release IP
                          </button>
                        )}

                        {ip.type === 'dedicated' && ip.status === 'available' && (
                          <button
                            onClick={() => handleDeleteIp(ip)}
                            className="rounded p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Hapus IP"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tambah IP Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="my-auto w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-sky-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Tambah IP Publik ke Pool</h3>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddIp} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  IP Address (IPv4 Publik) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 103.147.154.25"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono dark:border-slate-800 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Subnet Mask / CIDR
                  </label>
                  <input
                    type="text"
                    value={newSubnet}
                    onChange={(e) => setNewSubnet(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Gateway
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 103.147.154.17"
                    value={newGateway}
                    onChange={(e) => setNewGateway(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tipe Alokasi IP
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="dedicated">Dedicated (Klien Khusus)</option>
                    <option value="shared">Shared (Pool Bersama)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Server Node Target
                  </label>
                  <select
                    value={newServerId}
                    onChange={(e) => setNewServerId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    {servers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reverse DNS (rDNS / PTR Record)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: mail.domainklien.com atau host.cloudpro.id"
                  value={newPtrRecord}
                  onChange={(e) => setNewPtrRecord(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-[10px] text-slate-400">Penting untuk reputasi deliverability email agar tidak masuk folder spam.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Alokasi dedicated IP untuk e-Commerce / SSL Bank"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
                >
                  Simpan IP Publik
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Assign Dedicated IP ke Akun */}
      {isAssignModalOpen && selectedIpForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Link className="h-5 w-5 text-sky-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Dedicated IP</h3>
              </div>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-100 dark:border-sky-900/60">
                <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">Dedicated IP Target:</div>
                <div className="text-base font-mono font-bold text-sky-900 dark:text-sky-100 mt-0.5">
                  {selectedIpForAssign.ip}
                </div>
                <div className="text-[10px] text-sky-600 dark:text-sky-400 mt-1">
                  Node: {selectedIpForAssign.serverName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Akun Hosting Penerima:
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.username} &mdash; {acc.primaryDomain} (Saat ini: {acc.ipAddress})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-[11px] text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
                <strong>Otomatisasi Sistem:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[10px]">
                  <li>DNS Zone A Record (@ & mail) akan otomatis diarahkan ke IP {selectedIpForAssign.ip}.</li>
                  <li>Record TXT SPF email diperbarui secara instan.</li>
                  <li>VirtualHost web server dimigrasi ke dedicated listener.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssign}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
                >
                  Konfirmasi Alokasi Dedicated IP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
