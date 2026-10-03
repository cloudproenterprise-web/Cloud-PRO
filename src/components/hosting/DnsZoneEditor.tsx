import React, { useState, useEffect } from 'react';
import {
  Globe,
  PlusCircle,
  Trash2,
  Edit,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Download,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Play,
  Square,
  Zap,
} from 'lucide-react';
import { DnsRecord, HostingAccount } from '../../types';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';

interface DnsZoneEditorProps {
  account: HostingAccount;
  onOpenGatewayModule?: () => void;
}

export const DnsZoneEditor: React.FC<DnsZoneEditorProps> = ({ account, onOpenGatewayModule }) => {
  const { currentUser } = useAuth();
  const { showToast, confirmAction } = useServer();

  if (!currentUser) return null;

  const [records, setRecords] = useState<DnsRecord[]>(() => db.getDnsRecords(account.id));
  const [showAddModal, setShowAddModal] = useState(false);
  const [recordType, setRecordType] = useState<DnsRecord['type']>('A');
  const [recordName, setRecordName] = useState('@');
  const [recordContent, setRecordContent] = useState('');
  const [recordTtl, setRecordTtl] = useState(3600);
  const [recordPriority, setRecordPriority] = useState<number | undefined>(10);

  // Live Cloudflare / Google DNS Check State
  const [isCheckingLiveDns, setIsCheckingLiveDns] = useState(false);
  const [liveNsList, setLiveNsList] = useState<string[]>([]);
  const [liveRootARecords, setLiveRootARecords] = useState<string[]>([]);
  const [liveRdmARecords, setLiveRdmARecords] = useState<string[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const rootDomain = account.primaryDomain.replace(/^rdm\./i, '') || 'denbaguse.my.id';

  const checkLiveCloudflareDns = async () => {
    setIsCheckingLiveDns(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    try {
      const [nsRes, aRootRes, aRdmRes] = await Promise.all([
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(rootDomain)}&type=NS`, { signal: controller.signal })
          .then(r => r.json())
          .catch(() => null),
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(rootDomain)}&type=A`, { signal: controller.signal })
          .then(r => r.json())
          .catch(() => null),
        fetch(`https://dns.google/resolve?name=${encodeURIComponent(`rdm.${rootDomain}`)}&type=A`, { signal: controller.signal })
          .then(r => r.json())
          .catch(() => null),
      ]);
      clearTimeout(timeoutId);
      const nsAnswers = Array.isArray(nsRes?.Answer)
        ? nsRes.Answer.map((a: { data: string }) => a.data.replace(/\.$/, ''))
        : [];
      const aRootAnswers = Array.isArray(aRootRes?.Answer)
        ? aRootRes.Answer.filter((a: { type: number }) => a.type === 1).map((a: { data: string }) => a.data)
        : [];
      const aRdmAnswers = Array.isArray(aRdmRes?.Answer)
        ? aRdmRes.Answer.filter((a: { type: number }) => a.type === 1).map((a: { data: string }) => a.data)
        : [];
      setLiveNsList(nsAnswers);
      setLiveRootARecords(aRootAnswers);
      setLiveRdmARecords(aRdmAnswers);
    } catch {
      clearTimeout(timeoutId);
      // Ignore network errors
    } finally {
      setIsCheckingLiveDns(false);
    }
  };

  useEffect(() => {
    checkLiveCloudflareDns();
  }, [rootDomain]);

  const handleExportCloudflareBindFile = () => {
    const lines = [
      `;; BIND Zone File untuk Import ke Cloudflare (${rootDomain})`,
      `;; Cara pakai: Buka dash.cloudflare.com -> Pilih ${rootDomain} -> DNS -> Records -> Klik "Import and Export" -> Upload file ini`,
      `$ORIGIN ${rootDomain}.`,
      `$TTL 3600`,
      `@ IN A ${account.ipAddress}`,
      `www IN CNAME ${rootDomain}.`,
      `rdm IN A ${account.ipAddress}`,
      `mail IN A ${account.ipAddress}`,
      `ns1 IN A ${account.ipAddress}`,
      `ns2 IN A ${account.ipAddress}`,
      `@ IN MX 10 mail.${rootDomain}.`,
      `@ IN TXT "v=spf1 a mx ip4:${account.ipAddress} ~all"`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudflare-dns-${rootDomain}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(
      'success',
      'File BIND Cloudflare Diunduh',
      `Silakan upload file cloudflare-dns-${rootDomain}.txt di menu DNS -> Import and Export pada dashboard Cloudflare Anda.`
    );
  };

  const copyValue = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const refreshList = () => {
    setRecords([...db.getDnsRecords(account.id)]);
  };

  const handleAddRecord = () => {
    if (!recordContent.trim()) return;

    const newRecord: DnsRecord = {
      id: `dns-${Date.now()}`,
      accountId: account.id,
      domain: account.primaryDomain,
      type: recordType,
      name: recordName.trim(),
      content: recordContent.trim(),
      ttl: recordTtl,
      priority: recordType === 'MX' ? recordPriority : undefined,
    };

    db.saveDnsRecord(newRecord);
    db.logAction(
      currentUser,
      'DNS_RECORD_ADDED',
      'DNS',
      `Menambahkan DNS ${recordType} record: ${recordName} -> ${recordContent} untuk domain ${account.primaryDomain}`
    );
    showToast('success', 'DNS Record Ditambahkan', `${recordType} ${recordName} disimpan.`);
    setRecordContent('');
    setShowAddModal(false);
    refreshList();
  };

  const handleDeleteRecord = (rec: DnsRecord) => {
    confirmAction({
      title: 'Hapus DNS Record',
      message: `Hapus DNS record ${rec.type} (${rec.name})? Domain mungkin memerlukan waktu propagasi.`,
      confirmText: 'Hapus Record',
      isDanger: true,
      onConfirm: () => {
        db.deleteDnsRecord(rec.id);
        db.logAction(
          currentUser,
          'DNS_RECORD_DELETED',
          'DNS',
          `Menghapus DNS ${rec.type} record: ${rec.name} pada ${account.primaryDomain}`
        );
        showToast('info', 'Record Dihapus', `DNS ${rec.type} telah dihapus.`);
        refreshList();
      },
    });
  };

  const handleResetTemplate = () => {
    confirmAction({
      title: 'Reset Zona DNS ke Standar',
      message: 'Reset seluruh DNS record ke konfigurasi standar Cloud PRO? Seluruh record kustom Anda akan digantikan dengan default zone file.',
      confirmText: 'Reset DNS',
      isDanger: true,
      onConfirm: () => {
        const activeNs = db.getDefaultNameserverConfig();
        const ns1Host = activeNs ? activeNs.ns1Host : 'ns1.denbaguse.my.id';
        const ns2Host = activeNs ? activeNs.ns2Host : 'ns2.denbaguse.my.id';
        const nsTtl = activeNs ? activeNs.defaultTtl : 86400;

        const standard: DnsRecord[] = [
          { id: `dns-${Date.now()}-1`, accountId: account.id, domain: account.primaryDomain, type: 'A', name: '@', content: account.ipAddress, ttl: 3600 },
          { id: `dns-${Date.now()}-2`, accountId: account.id, domain: account.primaryDomain, type: 'CNAME', name: 'www', content: account.primaryDomain, ttl: 3600 },
          { id: `dns-${Date.now()}-3`, accountId: account.id, domain: account.primaryDomain, type: 'MX', name: '@', content: `mail.${account.primaryDomain}`, priority: 10, ttl: 3600 },
          { id: `dns-${Date.now()}-4`, accountId: account.id, domain: account.primaryDomain, type: 'A', name: 'mail', content: account.ipAddress, ttl: 3600 },
          { id: `dns-${Date.now()}-5`, accountId: account.id, domain: account.primaryDomain, type: 'TXT', name: '@', content: `v=spf1 a mx ip4:${account.ipAddress} ~all`, ttl: 3600 },
          { id: `dns-${Date.now()}-6`, accountId: account.id, domain: account.primaryDomain, type: 'NS', name: '@', content: ns1Host, ttl: nsTtl },
          { id: `dns-${Date.now()}-7`, accountId: account.id, domain: account.primaryDomain, type: 'NS', name: '@', content: ns2Host, ttl: nsTtl },
        ];
        // remove old and save new
        records.forEach(r => db.deleteDnsRecord(r.id));
        standard.forEach(r => db.saveDnsRecord(r));
        refreshList();
        showToast('success', 'DNS Direset', 'Zona DNS telah dikembalikan ke template awal.');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-teal-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              DNS Zone Editor &mdash; {account.primaryDomain}
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Nameservers:{' '}
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {account.nameservers && account.nameservers.length >= 2
                ? `${account.nameservers[0]} • ${account.nameservers[1]}`
                : 'ns1.denbaguse.my.id • ns2.denbaguse.my.id'}
            </span>{' '}
            &bull; IPv4 Anycast: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{account.ipAddress}</span> &bull; TTL Default: 3600s
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser?.role === 'admin' && onOpenGatewayModule && (
            <button
              onClick={onOpenGatewayModule}
              className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-500 shadow-xs cursor-pointer"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Buka Modul Cloudflare Tunnel &amp; IPv6 IndiHome</span>
            </button>
          )}
          {currentUser?.role === 'admin' && (
            <button
              onClick={handleExportCloudflareBindFile}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-xs cursor-pointer"
              title="Download file .txt untuk di-import langsung ke Cloudflare DNS"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Zona ke Cloudflare (.txt)</span>
            </button>
          )}
          <button
            onClick={handleResetTemplate}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Template DNS</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-500 shadow-xs cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Tambah DNS Record</span>
          </button>
        </div>
      </div>

      {/* LIVE CLOUDFLARE DNS DIAGNOSTIC & POINTING GUIDE (STRICTLY ROOT ADMIN ONLY) */}
      {currentUser?.role === 'admin' && (
      <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 sm:p-5 dark:border-amber-800 dark:bg-amber-950/30 text-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="font-bold text-sm text-amber-950 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Hasil Cek DNS Live Cloudflare untuk <code>{rootDomain}</code>
            </span>
          </div>
          <button
            type="button"
            onClick={checkLiveCloudflareDns}
            disabled={isCheckingLiveDns}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 dark:bg-slate-900 dark:border-amber-700 dark:text-amber-300 cursor-pointer self-start"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isCheckingLiveDns ? 'animate-spin' : ''}`} />
            <span>{isCheckingLiveDns ? 'Mengecek DNS Cloudflare...' : 'Cek Ulang Status DNS Live'}</span>
          </button>
        </div>

        {/* Live Status Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-900/60 dark:bg-slate-900">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              1. Status Nameserver (NS)
            </div>
            <div className="mt-1 font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{liveNsList.length > 0 ? 'Aktif di Cloudflare' : 'Memeriksa...'}</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
              {liveNsList.length > 0 ? liveNsList.join(' • ') : 'ainsley.ns.cloudflare.com • joaquin.ns.cloudflare.com'}
            </div>
          </div>

          <div
            className={`rounded-lg border p-3 bg-white dark:bg-slate-900 ${
              liveRootARecords.length > 0
                ? 'border-emerald-200 dark:border-emerald-900/60'
                : 'border-rose-300 dark:border-rose-800'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              2. Record A ({rootDomain})
            </div>
            {liveRootARecords.length > 0 ? (
              <>
                <div className="mt-1 font-mono font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Terhubung ({liveRootARecords.join(', ')})</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">Domain utama siap diakses publik.</div>
              </>
            ) : (
              <>
                <div className="mt-1 font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>BELUM ADA RECORD A DI CLOUDFLARE!</span>
                </div>
                <div className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
                  Penyebab utama error <code>DNS_PROBE_FINISHED_NXDOMAIN</code>!
                </div>
              </>
            )}
          </div>

          <div
            className={`rounded-lg border p-3 bg-white dark:bg-slate-900 ${
              liveRdmARecords.length > 0
                ? 'border-emerald-200 dark:border-emerald-900/60'
                : 'border-rose-300 dark:border-rose-800'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              3. Record A (rdm.{rootDomain})
            </div>
            {liveRdmARecords.length > 0 ? (
              <>
                <div className="mt-1 font-mono font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Terhubung ({liveRdmARecords.join(', ')})</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">Subdomain RDM siap diakses.</div>
              </>
            ) : (
              <>
                <div className="mt-1 font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>BELUM ADA DI CLOUDFLARE (NXDOMAIN)</span>
                </div>
                <div className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
                  Tambahkan record <code>A</code> untuk <code>rdm</code> di Cloudflare.
                </div>
              </>
            )}
          </div>
        </div>

        {/* Clear Explanation Why Cloudflare NS Alone Is Not Enough */}
        <div className="rounded-lg border border-amber-200 bg-white p-3.5 dark:border-amber-800/60 dark:bg-slate-900 space-y-3">
          <div className="font-bold text-slate-900 dark:text-white">
            Cara Mengisi Form &ldquo;Add record&rdquo; di Cloudflare (Agar Tidak Error <code>CNAME content cannot reference itself</code>):
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Jangan mengisi <strong>Type: CNAME</strong> dengan <strong>Name: @</strong> dan <strong>Target: {rootDomain}</strong> karena <code>@</code> artinya sama dengan <code>{rootDomain}</code> (menunjuk ke dirinya sendiri). Silakan isi <strong>3 baris record</strong> berikut satu per satu di Cloudflare:
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 font-sans">
                <tr>
                  <th className="px-3 py-2">Urutan</th>
                  <th className="px-3 py-2">Pilih Type</th>
                  <th className="px-3 py-2">Isi Kolom Name</th>
                  <th className="px-3 py-2">Isi Kolom IPv4 address / Target</th>
                  <th className="px-3 py-2">Proxy Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                  <td className="px-3 py-2 font-sans font-bold text-slate-700 dark:text-slate-300">Record 1 (Wajib)</td>
                  <td className="px-3 py-2"><span className="rounded bg-sky-600 px-2 py-0.5 text-white font-bold">A</span> (Bukan CNAME)</td>
                  <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">@</td>
                  <td className="px-3 py-2">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{account.ipAddress}</span>
                    <button
                      type="button"
                      onClick={() => copyValue(account.ipAddress, 'row1')}
                      className="ml-2 inline-flex items-center gap-1 rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-sans font-semibold cursor-pointer"
                    >
                      {copiedField === 'row1' ? 'Tersalin!' : 'Salin IP'}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-sans text-amber-600 font-semibold">Proxied (Oranye)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-sans font-bold text-slate-700 dark:text-slate-300">Record 2 (Subdomain www)</td>
                  <td className="px-3 py-2"><span className="rounded bg-amber-500 px-2 py-0.5 text-slate-950 font-bold">CNAME</span></td>
                  <td className="px-3 py-2 font-bold text-rose-600 dark:text-rose-400">www <span className="font-sans font-normal text-slate-500">(Jangan @)</span></td>
                  <td className="px-3 py-2">
                    <span className="font-bold text-slate-900 dark:text-white">{rootDomain}</span>
                    <button
                      type="button"
                      onClick={() => copyValue(rootDomain, 'row2')}
                      className="ml-2 inline-flex items-center gap-1 rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-sans font-semibold cursor-pointer"
                    >
                      {copiedField === 'row2' ? 'Tersalin!' : 'Salin'}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-sans text-amber-600 font-semibold">Proxied (Oranye)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-sans font-bold text-slate-700 dark:text-slate-300">Record 3 (Subdomain RDM)</td>
                  <td className="px-3 py-2"><span className="rounded bg-sky-600 px-2 py-0.5 text-white font-bold">A</span></td>
                  <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">rdm</td>
                  <td className="px-3 py-2">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{account.ipAddress}</span>
                  </td>
                  <td className="px-3 py-2 font-sans text-amber-600 font-semibold">Proxied (Oranye)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCloudflareBindFile}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download File DNS (.txt) untuk Import Otomatis ke Cloudflare</span>
            </button>
            <button
              type="button"
              onClick={() => copyValue(account.ipAddress, 'ip')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              {copiedField === 'ip' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>Salin IP Server: {account.ipAddress}</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* DNS Records Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden w-full max-w-full">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            DNS Resource Records ({records.length})
          </h4>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[600px]">
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 font-sans">
            <tr>
              <th className="px-5 py-3">Tipe</th>
              <th className="px-5 py-3">Host / Name</th>
              <th className="px-5 py-3">Target / Nilai Content</th>
              <th className="px-5 py-3">Priority</th>
              <th className="px-5 py-3">TTL</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {records.map(rec => (
              <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                <td className="px-5 py-3.5">
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                      rec.type === 'A'
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                        : rec.type === 'CNAME'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : rec.type === 'MX'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {rec.type}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                  {rec.name}
                </td>
                <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 break-all max-w-xs">
                  {rec.content}
                </td>
                <td className="px-5 py-3.5 text-slate-500">
                  {rec.priority !== undefined ? rec.priority : '—'}
                </td>
                <td className="px-5 py-3.5 text-slate-500">
                  {rec.ttl}s
                </td>
                <td className="px-5 py-3.5 text-right font-sans">
                  <button
                    onClick={() => handleDeleteRecord(rec)}
                    className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60"
                    title="Hapus Record"
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

      {/* Add DNS Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4">
          <div className="my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tambah DNS Record Baru
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Konfigurasi rute lalu lintas domain <code>{account.primaryDomain}</code>.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Tipe Record:
                  </label>
                  <select
                    value={recordType}
                    onChange={e => setRecordType(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="A">A (IPv4 Address)</option>
                    <option value="AAAA">AAAA (IPv6 Address)</option>
                    <option value="CNAME">CNAME (Alias)</option>
                    <option value="MX">MX (Mail Exchange)</option>
                    <option value="TXT">TXT (Text / SPF / DKIM)</option>
                    <option value="NS">NS (Nameserver)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Host / Name:
                  </label>
                  <input
                    type="text"
                    placeholder="@ atau subdomain"
                    value={recordName}
                    onChange={e => setRecordName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Target / Content Nilai:
                </label>
                <input
                  type="text"
                  placeholder={recordType === 'A' ? '103.147.154.21' : recordType === 'CNAME' ? 'target.domain.com' : 'v=spf1 ...'}
                  value={recordContent}
                  onChange={e => setRecordContent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>

              {recordType === 'MX' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Priority:
                  </label>
                  <input
                    type="number"
                    value={recordPriority}
                    onChange={e => setRecordPriority(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  TTL (Time To Live in seconds):
                </label>
                <select
                  value={recordTtl}
                  onChange={e => setRecordTtl(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value={300}>300s (5 Menit)</option>
                  <option value={3600}>3600s (1 Jam - Rekomendasi)</option>
                  <option value={14400}>14400s (4 Jam)</option>
                  <option value={86400}>86400s (1 Hari)</option>
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
                onClick={handleAddRecord}
                className="rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 shadow-xs"
              >
                Simpan Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
