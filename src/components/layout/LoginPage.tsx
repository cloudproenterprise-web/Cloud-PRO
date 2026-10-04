import React, { useState, useEffect } from 'react';
import { CloudProLogo } from '../common/CloudProLogo';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowRight,
  CheckCircle2,
  User as UserIcon,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Server,
  Network,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

type PortalRole = 'admin' | 'reseller' | 'customer';

interface SavedRoleCredential {
  user: string;
  pass: string;
  updatedAt: string;
}

type DeviceSavedCredentialsMap = Partial<Record<PortalRole, SavedRoleCredential>>;

const DEVICE_CREDS_STORAGE_KEY = 'cloudpro_device_saved_creds_v1';
const DEVICE_LAST_ROLE_KEY = 'cloudpro_device_last_role_v1';

const readDeviceCredentials = (): DeviceSavedCredentialsMap => {
  try {
    const raw = localStorage.getItem(DEVICE_CREDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const [selectedRole, setSelectedRole] = useState<PortalRole>(() => {
    try {
      const savedRole = localStorage.getItem(DEVICE_LAST_ROLE_KEY) as PortalRole | null;
      if (savedRole === 'admin' || savedRole === 'reseller' || savedRole === 'customer') {
        return savedRole;
      }
    } catch {}
    return 'admin';
  });

  // Empty by default on a new device; auto-filled only if this device has logged in before
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  const [isAutoFilledFromDevice, setIsAutoFilledFromDevice] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load saved credentials for the selected role if this device has previously logged in
  useEffect(() => {
    const map = readDeviceCredentials();
    const saved = map[selectedRole];
    if (saved && saved.user) {
      setUsername(saved.user);
      setPassword(saved.pass || '');
      setIsAutoFilledFromDevice(true);
    } else {
      setUsername('');
      setPassword('');
      setIsAutoFilledFromDevice(false);
    }
  }, [selectedRole]);

  const handleRoleSelect = (role: PortalRole) => {
    setSelectedRole(role);
    setErrorMessage('');
    try {
      localStorage.setItem(DEVICE_LAST_ROLE_KEY, role);
    } catch {}
  };

  const handleClearDeviceMemory = () => {
    try {
      const map = readDeviceCredentials();
      delete map[selectedRole];
      localStorage.setItem(DEVICE_CREDS_STORAGE_KEY, JSON.stringify(map));
    } catch {}
    setUsername('');
    setPassword('');
    setIsAutoFilledFromDevice(false);
    setErrorMessage('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage('Silakan masukkan Username / Email dan Kata Sandi akun Anda terlebih dahulu.');
      return;
    }

    setErrorMessage('');

    // Save credentials on this device so subsequent visits auto-fill automatically
    try {
      localStorage.setItem(DEVICE_LAST_ROLE_KEY, selectedRole);
      const map = readDeviceCredentials();
      if (rememberDevice) {
        map[selectedRole] = {
          user: cleanUser,
          pass: password,
          updatedAt: new Date().toISOString(),
        };
      } else {
        delete map[selectedRole];
      }
      localStorage.setItem(DEVICE_CREDS_STORAGE_KEY, JSON.stringify(map));
    } catch {}

    login(cleanUser, selectedRole);
  };

  const roleLabels: Record<PortalRole, { title: string; badge: string; placeholder: string }> = {
    admin: {
      title: 'Root Administrator',
      badge: 'CLUSTER ROOT',
      placeholder: 'Username / email Root Admin (mis. admin)...',
    },
    reseller: {
      title: 'WHM Reseller Partner',
      badge: 'WHM PORTAL',
      placeholder: 'Username / email Mitra Reseller...',
    },
    customer: {
      title: 'cPanel Web Client',
      badge: 'CPANEL SUITE',
      placeholder: 'Username / email Klien cPanel...',
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-3 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Subtle Executive Architectural Lighting & Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(rgba(148, 163, 184, 0.22) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-sky-600/10 blur-3xl" />

      <div className="exec-dark-ring w-full max-w-md sm:max-w-xl lg:max-w-5xl relative z-10 grid grid-cols-1 lg:grid-cols-12 rounded-2xl sm:rounded-3xl backdrop-blur-2xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* ================= LEFT COLUMN: EXECUTIVE INFRASTRUCTURE SHOWCASE (Desktop / Large Tablet Only) ================= */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-8 lg:p-10 border-r border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-950/80 to-slate-950">
          <div className="space-y-6">
            {/* Official Brand Lockup + Live SLA Indicator */}
            <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              <CloudProLogo
                variant="full"
                size="lg"
                cloudTextColor="text-white"
                brandSuffix="Enterprise"
                showSubtitle={true}
                subtitleText="ENTERPRISE CLOUD PANEL"
                noTruncate={true}
              />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-bold text-emerald-300 shrink-0 whitespace-nowrap shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                SLA 99.99% HA
              </span>
            </div>

            {/* Executive Value Proposition */}
            <div className="space-y-2.5 pt-1">
              <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-sky-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Multi-Tier Cloud &amp; Bare-Metal Control Plane</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-[26px] font-extrabold tracking-tight text-white leading-snug">
                Manajemen Server, KVM Hypervisor, &amp; Web Hosting Terpadu Kelas Enterprise.
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
                Dirancang dengan arsitektur isolasi multi-tenant (Root Admin, WHM Reseller, dan
                cPanel Klien), integrasi penuh Cloudflare Wildcard Tunnel, IPv6 DDNS, dan penyimpanan
                NVMe berkecepatan tinggi.
              </p>
            </div>

            {/* 3 Architectural Pillars */}
            <div className="grid grid-cols-1 gap-3 pt-1">
              <div className="flex items-start gap-3.5 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/80 text-sky-400">
                  <Server className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Cluster Server Nodes &amp; KVM Cloud VPS
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                    Pemantauan daemon systemd realtime, terminal SSH langsung, dan orkestrasi virtual
                    machine Linux.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/80 text-sky-400">
                  <Network className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Wildcard Cloudflare Tunnel &amp; Tailscale Mesh VPN
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                    Routing domain/subdomain otomatis tanpa port-forwarding serta sinkronisasi
                    pembaruan GitHub 1-klik.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/80 text-sky-400">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Multi-Tenant WHM Reseller &amp; cPanel Web Suite
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                    File Manager, Auto-Cloner, MySQL/phpMyAdmin, AutoSSL Let&apos;s Encrypt, dan
                    Billing Kwitansi resmi.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Cluster Telemetry Strip */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <span>Gateway: ZeroSSL TLS 1.3 &bull; HTTP/3 QUIC</span>
            <span className="text-sky-400 font-semibold">Cloud PRO Enterprise v2.6</span>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: AUTHENTICATION VAULT (Streamlined for Mobile/Android & Full on Desktop) ================= */}
        <div className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-7 lg:p-10 bg-slate-900/95">
          <div>
            {/* Mobile Header Branding (< lg screens): Full-Size Logo & Subtitle */}
            <div className="flex lg:hidden items-center justify-between pb-3.5 mb-4 border-b border-slate-800/80">
              <CloudProLogo
                variant="full"
                size="md"
                cloudTextColor="text-white"
                brandSuffix="Enterprise"
                showSubtitle={true}
                subtitleText="ENTERPRISE CLOUD PANEL"
                noTruncate={true}
              />
            </div>

            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm sm:text-base lg:text-lg font-extrabold text-white tracking-tight">
                Autentikasi Portal
              </h2>
              <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-sky-300">
                {roleLabels[selectedRole].badge}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mb-3.5 sm:mb-4">
              Pilih tingkat otorisasi portal dan masukkan kredensial akun Anda.
            </p>

            {/* Touch-Friendly Role Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800/90 mb-3.5 sm:mb-4 text-xs">
              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`py-2 sm:py-2.5 px-1 rounded-lg font-bold transition-all cursor-pointer text-center text-[10.5px] sm:text-xs ${
                  selectedRole === 'admin'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70'
                }`}
              >
                Root Admin
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('reseller')}
                className={`py-2 sm:py-2.5 px-1 rounded-lg font-bold transition-all cursor-pointer text-center text-[10.5px] sm:text-xs ${
                  selectedRole === 'reseller'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70'
                }`}
              >
                Reseller
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('customer')}
                className={`py-2 sm:py-2.5 px-1 rounded-lg font-bold transition-all cursor-pointer text-center text-[10.5px] sm:text-xs ${
                  selectedRole === 'customer'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70'
                }`}
              >
                cPanel Klien
              </button>
            </div>

            {/* Smart Device Auto-Fill Status Banner */}
            {isAutoFilledFromDevice && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-sky-500/30 bg-sky-950/40 px-3 py-1.5 sm:py-2 text-[10.5px] sm:text-[11px] text-sky-200">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Sparkles className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">
                    Perangkat dikenali &bull; Kredensial terisi otomatis
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearDeviceMemory}
                  className="inline-flex items-center gap-1 shrink-0 font-mono text-[9.5px] sm:text-[10px] font-semibold text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                  title="Kosongkan kredensial yang tersimpan di perangkat ini"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="mb-3 rounded-xl border border-rose-500/40 bg-rose-950/50 p-2.5 sm:p-3 text-[11px] sm:text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} autoComplete="on" className="space-y-3 sm:space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-300">
                    Username / Email Akun
                  </label>
                  <span className="font-mono text-[9px] sm:text-[10px] text-slate-500">
                    {roleLabels[selectedRole].title}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    placeholder={roleLabels[selectedRole].placeholder}
                    value={username}
                    onChange={e => {
                      setUsername(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/90 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1">
                  Kata Sandi Keamanan
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi..."
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/90 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Device Auto-Fill Toggle */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2 text-[10.5px] sm:text-[11px] text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={e => setRememberDevice(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-sky-600 focus:ring-sky-500/30 cursor-pointer"
                  />
                  <span>Simpan &amp; isi otomatis di perangkat ini</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition-all cursor-pointer active:scale-[0.99]"
              >
                <span>
                  Masuk Portal{' '}
                  {selectedRole === 'admin'
                    ? 'Root Admin'
                    : selectedRole === 'reseller'
                    ? 'Reseller'
                    : 'cPanel Klien'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Executive Security & Infrastructure Telemetry Footer with Live SLA */}
          <div className="mt-4 sm:mt-5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-slate-950/70 p-2 sm:p-2.5 text-[10px] sm:text-[10.5px]">
              <div className="flex items-center gap-1.5 text-slate-300 min-w-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                <span className="truncate">Sesi Aman &bull; TLS 1.3 QUIC</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 sm:px-2.5 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold text-emerald-300 shrink-0 shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                SLA 99.99% HA
              </span>
            </div>

            <div className="text-center text-[10px] sm:text-[11px] text-slate-500">
              &copy; {new Date().getFullYear()}{' '}
              <strong className="text-slate-300 font-semibold">Cloud PRO Enterprise</strong>. Seluruh hak cipta dilindungi.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
