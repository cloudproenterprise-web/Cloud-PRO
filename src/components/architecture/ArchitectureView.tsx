import React, { useState } from 'react';
import {
  Layers,
  Server,
  Users,
  Database,
  Shield,
  Cpu,
  Terminal,
  Globe,
  HardDrive,
  Copy,
  Check,
  CheckCircle2,
  FolderTree,
  Network,
  Zap,
} from 'lucide-react';
import { TypewriterText } from '../common/TypewriterText';
import { useServer } from '../../context/ServerContext';

export const ArchitectureView: React.FC = () => {
  const { servers, accounts } = useServer();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const primaryServer = servers.find((s) => s.isPrimary) || servers[0];

  return (
    <div className="space-y-6">
      {/* Top Banner with Typewriter Animated Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            </span>
            <span className="font-mono text-xs font-semibold tracking-wider text-sky-600 dark:text-sky-400 uppercase">
              SYSTEM ARCHITECTURE SPECIFICATION
            </span>
          </div>

          {/* Baris Pertama dengan Animasi Berjalan Writer (Typewriter) */}
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white min-h-[1.75rem] leading-snug">
            <TypewriterText
              text="Cloud PRO - Reseller Hosting Management System"
              speed={35}
              delay={100}
              cursorColor="bg-emerald-500"
            />
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Arsitektur modular multi-tenant dengan isolasi tiga tingkat: Root Cluster Admin &rarr; Reseller Partner &rarr; End-User Hosting Account.
          </p>
        </div>
      </div>

      {/* Cluster Hierarchy & Visual Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier 1: Admin */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-5 dark:border-sky-900/50 dark:bg-sky-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-sky-600 dark:text-sky-400 uppercase">
                Tier 1 &bull; Level Root
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cluster Administrator
              </h3>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            Mengontrol node server fisik/VPS, pool IP, alokasi paket reseller global, dan firewall cluster.
          </p>
          <ul className="mt-3 space-y-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
              <span>Multi-Node Server Daemons</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
              <span>Global Billing & Invoice</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
              <span>KVM Cloud VPS Management</span>
            </li>
          </ul>
        </div>

        {/* Tier 2: Reseller */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
                Tier 2 &bull; Level Tenant
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Reseller Partner
              </h3>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            Memiliki kuota disk & bandwidth sendiri, fitur white-label (logo & nama sendiri), serta mengelola pelanggan turunan.
          </p>
          <ul className="mt-3 space-y-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
              <span>White-label Custom Domain</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
              <span>Sub-account Isolation</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
              <span>Custom Pricing & Plans</span>
            </li>
          </ul>
        </div>

        {/* Tier 3: End Customer */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                Tier 3 &bull; Level Client
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                End-User cPanel
              </h3>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            Akses langsung panel cPanel untuk web hosting, file manager, database MySQL, akun email, DNS, dan sertifikat SSL.
          </p>
          <ul className="mt-3 space-y-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Web File Manager & Code Editor</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>MySQL DB & phpMyAdmin Bridge</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>AutoSSL Let's Encrypt</span>
            </li>
          </ul>
        </div>
      </div>

      {/* ASCII Architectural Diagram */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-slate-200 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="font-mono text-xs font-semibold text-slate-300">
              CLUSTER TOPOLOGY & DATA FLOW DIAGRAM
            </span>
          </div>
          <button
            onClick={() =>
              copyToClipboard(
                `+---------------------------------------------------+
|            Cloud PRO Root Administrator           |
|   (Full Cluster, Server Nodes, Global Billing)    |
+-------------------------+-------------------------+
                          |
                          v
+---------------------------------------------------+
|                  Reseller Tenant                  |
| (Resource Allocation, White-label, Sub-customers) |
+-------------------------+-------------------------+
                          |
                          v
+---------------------------------------------------+
|                  End Customer                     |
|   (Hosting Account, Domains, DB, Email, Files)    |
+---------------------------------------------------+`,
                'ascii-diagram'
              )
            }
            className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
          >
            {copiedSection === 'ascii-diagram' ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Salin Diagram</span>
              </>
            )}
          </button>
        </div>
        <pre className="mt-4 overflow-x-auto font-mono text-[11px] leading-relaxed text-emerald-400/90 selection:bg-emerald-950">
{`           +---------------------------------------------------+
           |            Cloud PRO Root Administrator           |
           |   (Full Cluster, Server Nodes, Global Billing)    |
           +-------------------------+-------------------------+
                                     |
                                     v
           +---------------------------------------------------+
           |                  Reseller Tenant                  |
           | (Resource Allocation, White-label, Sub-customers) |
           +-------------------------+-------------------------+
                                     |
                                     v
           +---------------------------------------------------+
           |                  End Customer                     |
           |   (Hosting Account, Domains, DB, Email, Files)    |
           +---------------------------------------------------+`}
        </pre>
      </div>

      {/* Linux Ubuntu Multi-Account Architecture Specification */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Arsitektur Isolasi Multi-Tenant pada Server Linux Ubuntu
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Spesifikasi isolasi sistem pengguna, reverse proxy Nginx, dan pemisahan basis data antar virtual host.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
            <p className="font-semibold text-sm">
              Isolasi Native Multi-User &amp; Multi-VirtualHost Linux
            </p>
            <p className="mt-1 text-xs">
              Setiap akun hosting beroperasi di dalam ruang direktori terisolasi dengan pengaturan permission sistem tersendiri, memungkinkan banyak aplikasi produksi berjalan paralel pada satu node fisik.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/40">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="h-4 w-4 text-sky-500" />
                1. Akun Sistem Terpisah
              </h4>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Buat user Linux baru di Ubuntu untuk aplikasi kedua:
              </p>
              <div className="mt-2 rounded bg-slate-900 p-2 font-mono text-[10px] text-slate-300">
                sudo adduser siakad2<br/>
                sudo usermod -aG sudo siakad2
              </div>
              <p className="mt-1.5 text-[10px] text-slate-500">
                File aplikasi 1 ada di <code className="text-sky-500">/home/user1/</code> dan aplikasi 2 ada di <code className="text-sky-500">/home/siakad2/</code>.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/40">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Network className="h-4 w-4 text-emerald-500" />
                2. Nginx Reverse Proxy
              </h4>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Gunakan Nginx di port 80/443 untuk meneruskan ke port masing-masing:
              </p>
              <div className="mt-2 rounded bg-slate-900 p-2 font-mono text-[10px] text-slate-300">
                Aplikasi 1 &rarr; Port 3001<br/>
                CloudPRO &rarr; Port 3000
              </div>
              <p className="mt-1.5 text-[10px] text-slate-500">
                Nginx otomatis membedakan traffic berdasarkan nama domain atau subdomain lokal.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/40">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Database className="h-4 w-4 text-purple-500" />
                3. Database Terpisah
              </h4>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Gunakan MariaDB/MySQL yang sama, buat database & user terpisah:
              </p>
              <div className="mt-2 rounded bg-slate-900 p-2 font-mono text-[10px] text-slate-300">
                CREATE DATABASE cloudpro;<br/>
                GRANT ALL ON cloudpro.* TO 'user2'@'localhost';
              </div>
              <p className="mt-1.5 text-[10px] text-slate-500">
                Data kedua aplikasi dijamin 100% terisolasi tanpa saling tumpang tindih.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daemons & Stack Component Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          Status Service Daemons & Stack Engine
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Node utama: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{primaryServer?.name} ({primaryServer?.ipAddress})</span>
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {primaryServer?.services.map((svc) => (
            <div
              key={svc.name}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {svc.name}
                </span>
                <span className="block font-mono text-[10px] text-slate-400">
                  v{svc.version} &bull; Port {svc.port}
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Running
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
