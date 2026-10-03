import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  HardDrive,
  Archive,
  CreditCard,
  Globe,
  ArrowUp,
  Users,
  X,
  Send,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface FloatingGlassDockProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  activeDomain?: string;
  defaultPhoneNumber?: string;
  adminName?: string;
}

export const FloatingGlassDock: React.FC<FloatingGlassDockProps> = ({
  activeTab,
  onNavigate,
  activeDomain,
  defaultPhoneNumber = '6281226738883',
  adminName = 'Cloud PRO Enterprise Support',
}) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'admin';

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isMobilePulledUp, setIsMobilePulledUp] = useState(false);

  // Integrated WhatsApp Quick-Chat state
  const [isWaOpen, setIsWaOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  const quickMessages = [
    'Halo Admin Cloud PRO Enterprise, saya butuh bantuan seputar Server & Cluster Nodes.',
    'Halo Tim Cloud PRO Enterprise, saya pelanggan/klien butuh bantuan Akun Hosting & Domain.',
    'Halo Support, saya Mitra Reseller ingin konsultasi Paket & Kuota.',
    'Bantuan kendala remote SSH Tailscale atau update script server.',
  ];

  const handleSendMessage = (textToSend?: string) => {
    const finalMsg =
      textToSend || message.trim() || 'Halo Admin Cloud PRO Enterprise, saya butuh bantuan layanan.';
    let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMsg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Reset mobile dock visibility when navigating to a new tab so initial screen & SSH bottom input are unobstructed
  useEffect(() => {
    setIsMobilePulledUp(false);
    setIsWaOpen(false);
  }, [activeTab]);

  useEffect(() => {
    let touchStartY = 0;

    const handleScroll = () => {
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setShowScrollTop(y > 220);
      if (y > 55) {
        setIsMobilePulledUp(true);
      } else if (y <= 20) {
        setIsMobilePulledUp(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches || e.touches.length === 0) return;
      const currentY = e.touches[0].clientY;
      const deltaPullUp = touchStartY - currentY; // positive when finger drags upward ("ditarik ke atas")
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      if (deltaPullUp > 28 && y > 10) {
        setIsMobilePulledUp(true);
      } else if (deltaPullUp < -35 && y <= 40) {
        setIsMobilePulledUp(false);
      }
    };

    const syncVisualViewport = () => {
      try {
        const vv = window.visualViewport;
        if (!vv) {
          document.documentElement.style.setProperty('--vv-bottom-offset', '0px');
          return;
        }
        const occluded = Math.round(window.innerHeight - (vv.height + vv.offsetTop));
        // Compensate Android browser toolbar offset (< 140px), ignore full soft keyboard
        if (occluded > 0 && occluded < 140) {
          document.documentElement.style.setProperty('--vv-bottom-offset', `${occluded}px`);
        } else {
          document.documentElement.style.setProperty('--vv-bottom-offset', '0px');
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('resize', syncVisualViewport, { passive: true });
    window.addEventListener('scroll', syncVisualViewport, { passive: true });
    window.visualViewport?.addEventListener('resize', syncVisualViewport);
    window.visualViewport?.addEventListener('scroll', syncVisualViewport);

    handleScroll();
    syncVisualViewport();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', syncVisualViewport);
      window.removeEventListener('scroll', syncVisualViewport);
      window.visualViewport?.removeEventListener('resize', syncVisualViewport);
      window.visualViewport?.removeEventListener('scroll', syncVisualViewport);
    };
  }, []);

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const rootTab =
    role === 'admin'
      ? 'dashboard'
      : role === 'reseller'
      ? 'reseller-dashboard'
      : 'customer-dashboard';

  const dockItems =
    role === 'reseller'
      ? [
          { id: rootTab, label: 'Dashboard Panel', shortLabel: 'Home', icon: LayoutDashboard },
          { id: 'hosting-accounts', label: 'vHost Klien', shortLabel: 'vHost', icon: Globe },
          { id: 'customers', label: 'Pelanggan Saya', shortLabel: 'Klien', icon: Users },
          { id: 'disk-cleaner', label: 'Audit & Bersih Disk', shortLabel: 'Disk', icon: HardDrive },
          { id: 'billing', label: 'Billing & Kwitansi', shortLabel: 'Billing', icon: CreditCard },
        ]
      : [
          { id: rootTab, label: 'Dashboard Utama', shortLabel: 'Home', icon: LayoutDashboard },
          { id: 'file-manager', label: 'File Manager Web', shortLabel: 'Files', icon: FolderOpen },
          { id: 'disk-cleaner', label: 'Audit & Bersih Disk', shortLabel: 'Disk', icon: HardDrive },
          { id: 'backups', label: 'Backup & Restore ZIP', shortLabel: 'Backup', icon: Archive },
          { id: 'billing', label: 'Billing & Kwitansi', shortLabel: 'Billing', icon: CreditCard },
        ];

  const isTabActive = (itemId: string) => {
    if (itemId === rootTab) {
      return (
        activeTab === 'dashboard' ||
        activeTab === 'reseller-dashboard' ||
        activeTab === 'customer-dashboard'
      );
    }
    if (itemId === 'file-manager') {
      return activeTab === 'file-manager' || activeTab === 'cpanel-files';
    }
    if (itemId === 'disk-cleaner') {
      return (
        activeTab === 'disk-cleaner' ||
        activeTab === 'cpanel-cleaner' ||
        activeTab === 'disk-usage' ||
        activeTab === 'cpanel-disk' ||
        activeTab === 'cpanel-disk-cleaner'
      );
    }
    if (itemId === 'backups') {
      return (
        activeTab === 'backups' ||
        activeTab === 'backup' ||
        activeTab === 'restore' ||
        activeTab === 'cpanel-backup' ||
        activeTab === 'cpanel-restore' ||
        activeTab === 'cpanel-backups'
      );
    }
    return activeTab === itemId;
  };

  return (
    <>
      {/* Integrated WhatsApp Support Popup (Anchored beside Vertical Right Rail on Desktop, above Bottom Dock on Mobile) */}
      {isWaOpen && (
        <div className="fixed bottom-19 right-3 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:right-17 z-50 w-[calc(100vw-1.5rem)] max-w-84 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 lg:slide-in-from-right-4 no-print">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-3.5 text-white border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.04 7.5C8.83 7.5 8.49 7.58 8.2 7.89C7.91 8.2 7.08 8.97 7.08 10.54C7.08 12.11 8.23 13.63 8.39 13.84C8.55 14.05 10.63 17.26 13.82 18.64C14.58 18.97 15.18 19.17 15.64 19.31C16.4 19.56 17.1 19.52 17.65 19.44C18.26 19.35 19.52 18.68 19.78 17.94C20.04 17.2 20.04 16.57 19.96 16.44C19.88 16.31 19.68 16.23 19.36 16.07C19.05 15.92 17.5 15.15 17.21 15.05C16.92 14.94 16.71 14.89 16.5 15.2C16.29 15.52 15.7 16.23 15.52 16.44C15.34 16.65 15.16 16.67 14.85 16.52C14.54 16.36 13.54 16.03 12.35 14.97C11.42 14.15 10.8 13.13 10.62 12.82C10.44 12.51 10.6 12.34 10.76 12.19C10.9 12.05 11.07 11.83 11.23 11.65C11.39 11.46 11.44 11.33 11.55 11.13C11.65 10.92 11.6 10.73 11.52 10.58C11.44 10.42 10.82 8.9 10.56 8.29C10.31 7.69 10.06 7.77 9.87 7.76C9.7 7.75 9.5 7.5 9.04 7.5Z" />
                    </svg>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900"></span>
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-tight">{adminName}</h4>
                  <p className="text-[10px] text-slate-300 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    Online &bull; Respons Cepat
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsWaOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title="Tutup WhatsApp Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-3.5 space-y-3 bg-slate-50/70 max-h-88 overflow-y-auto">
            <div className="bg-white p-2.5 rounded-2xl rounded-tl-none border border-slate-200/90 shadow-2xs text-xs text-slate-700 leading-relaxed">
              Halo! Selamat datang di layanan bantuan <strong>Cloud PRO Enterprise</strong>. Ada yang bisa kami bantu seputar server, hosting, atau jaringan Anda?
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Pertanyaan Cepat
              </span>
              <div className="space-y-1.5">
                {quickMessages.map((msg, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(msg)}
                    className="w-full text-left text-[11px] p-2 rounded-xl bg-white hover:bg-sky-50 hover:border-sky-200 border border-slate-200/80 text-slate-700 hover:text-sky-800 transition-colors flex items-center justify-between group shadow-2xs cursor-pointer"
                  >
                    <span className="line-clamp-1">{msg}</span>
                    <Send className="h-3 w-3 text-slate-400 group-hover:text-sky-600 shrink-0 ml-1.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Pesan Khusus
              </span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Ketik pertanyaan Anda..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none shadow-2xs"
                />
                <button
                  onClick={() => handleSendMessage()}
                  className="rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 text-xs font-semibold flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                  title="Kirim ke WhatsApp"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-400">
              {isEditingPhone ? (
                <div className="flex items-center gap-1 w-full">
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="flex-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-800"
                    placeholder="Contoh: 6281234567890"
                  />
                  <button
                    onClick={() => setIsEditingPhone(false)}
                    className="text-sky-600 font-bold hover:underline cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                    <Phone className="h-3 w-3 text-emerald-600" />
                    <span>0812-2673-8883</span>
                  </span>
                  <button
                    onClick={() => setIsEditingPhone(true)}
                    className="hover:text-sky-600 hover:underline cursor-pointer text-[10px]"
                  >
                    Ganti Nomor
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================================
          1. DESKTOP (lg+): MINIMALIST VERTICAL RIGHT-HAND COMMAND RAIL
          Positioned cleanly on the right edge so it never blocks tables, logs, or bottom footer
         ===================================================================================== */}
      <aside
        aria-label="Cloud PRO Enterprise Desktop Quick Rail"
        className="exec-dark-ring fixed right-3 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-1.5 rounded-2xl p-1.5 text-white backdrop-blur-xl no-print"
      >
        {/* Top Cluster Online Pulse + Active Domain Hover Badge */}
        <div className="group relative flex h-8 w-9 items-center justify-center border-b border-slate-800/90 pb-1">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          </span>
          {/* Slide-out Left Tooltip */}
          <div className="pointer-events-none absolute right-full mr-3 hidden group-hover:flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-700/90 bg-slate-900/98 px-3 py-1.5 text-[11px] font-semibold text-white shadow-xl">
            <span className="text-sky-400 font-bold">Cloud PRO Enterprise</span>
            {activeDomain && (
              <>
                <span className="text-slate-600">&bull;</span>
                <span className="font-mono text-slate-300">{activeDomain}</span>
              </>
            )}
          </div>
        </div>

        {/* Vertical Navigation Icon Buttons */}
        <div className="flex flex-col items-center gap-1">
          {dockItems.map(item => {
            const Icon = item.icon;
            const active = isTabActive(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-label={item.label}
                className={`group relative flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 ${
                  active
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-500/30'
                    : 'text-slate-400 hover:bg-slate-800/90 hover:text-white'
                }`}
              >
                {active && (
                  <span className="absolute right-0 top-2 bottom-2 w-0.5 rounded-l-full bg-white" />
                )}
                <Icon
                  className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                    active ? 'text-white' : 'text-slate-400 group-hover:text-sky-400'
                  }`}
                />
                {/* Slide-out Left Tooltip */}
                <span className="pointer-events-none absolute right-full mr-3 hidden group-hover:inline-flex items-center whitespace-nowrap rounded-lg border border-slate-700/90 bg-slate-900/98 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="my-0.5 h-px w-6 bg-slate-800/90" />

        {/* Integrated WhatsApp Support Button */}
        <button
          type="button"
          onClick={() => setIsWaOpen(prev => !prev)}
          aria-label="WhatsApp Support Cloud PRO Enterprise"
          className={`group relative flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer active:scale-95 ${
            isWaOpen
              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
              : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/25'
          }`}
        >
          {isWaOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.04 7.5C8.83 7.5 8.49 7.58 8.2 7.89C7.91 8.2 7.08 8.97 7.08 10.54C7.08 12.11 8.23 13.63 8.39 13.84C8.55 14.05 10.63 17.26 13.82 18.64C14.58 18.97 15.18 19.17 15.64 19.31C16.4 19.56 17.1 19.52 17.65 19.44C18.26 19.35 19.52 18.68 19.78 17.94C20.04 17.2 20.04 16.57 19.96 16.44C19.88 16.31 19.68 16.23 19.36 16.07C19.05 15.92 17.5 15.15 17.21 15.05C16.92 14.94 16.71 14.89 16.5 15.2C16.29 15.52 15.7 16.23 15.52 16.44C15.34 16.65 15.16 16.67 14.85 16.52C14.54 16.36 13.54 16.03 12.35 14.97C11.42 14.15 10.8 13.13 10.62 12.82C10.44 12.51 10.6 12.34 10.76 12.19C10.9 12.05 11.07 11.83 11.23 11.65C11.39 11.46 11.44 11.33 11.55 11.13C11.65 10.92 11.6 10.73 11.52 10.58C11.44 10.42 10.82 8.9 10.56 8.29C10.31 7.69 10.06 7.77 9.87 7.76C9.7 7.75 9.5 7.5 9.04 7.5Z" />
            </svg>
          )}
          <span className="pointer-events-none absolute right-full mr-3 hidden group-hover:inline-flex items-center whitespace-nowrap rounded-lg border border-slate-700/90 bg-slate-900/98 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 shadow-lg">
            WhatsApp Support
          </span>
        </button>

        {/* Scroll-to-Top Button */}
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Kembali ke Atas"
            className="group relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/90 hover:bg-sky-600 border border-slate-700/80 hover:border-sky-400 text-sky-300 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <ArrowUp className="h-4 w-4" />
            <span className="pointer-events-none absolute right-full mr-3 hidden group-hover:inline-flex items-center whitespace-nowrap rounded-lg border border-slate-700/90 bg-slate-900/98 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
              Kembali ke Atas
            </span>
          </button>
        )}
      </aside>

      {/* =====================================================================================
          2. MOBILE / TABLET (< lg): ERGONOMIC BOTTOM HORIZONTAL GLASS DOCK
          Appears ONLY when pulled up / scrolled down on Android so initial view & SSH bar stay clean
         ===================================================================================== */}
      <div
        aria-label="Cloud PRO Enterprise Mobile Quick Dock"
        className={`mobile-sticky-dock fixed left-2.5 right-2.5 lg:hidden z-40 flex justify-center pointer-events-none no-print transform-gpu transition-all duration-300 ${
          isMobilePulledUp || isWaOpen
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-24 scale-95'
        }`}
      >
        <div
          className={`exec-dark-ring flex items-center justify-between gap-1 sm:gap-1.5 w-full max-w-lg rounded-2xl px-2 py-1.5 text-white backdrop-blur-xl ${
            isMobilePulledUp || isWaOpen ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
        >
          {/* Quick Action Pills */}
          <div className="flex flex-1 items-center justify-around gap-0.5 sm:gap-1">
            {dockItems.map(item => {
              const Icon = item.icon;
              const active = isTabActive(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`group relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-semibold transition-all cursor-pointer active:scale-95 ${
                    active
                      ? 'bg-sky-600 text-white shadow-sm shadow-sky-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                  title={item.label}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      active ? 'text-white' : 'text-sky-400'
                    }`}
                  />
                  <span className="leading-tight tracking-tight">{item.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Right Zone: WhatsApp + Scroll-to-Top */}
          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-700/80">
            <button
              type="button"
              onClick={() => setIsWaOpen(prev => !prev)}
              aria-label="WhatsApp Support Cloud PRO Enterprise"
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer active:scale-95 ${
                isWaOpen
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300/60'
                  : 'bg-emerald-500/95 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              <span className="relative flex items-center justify-center">
                {isWaOpen ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.04 7.5C8.83 7.5 8.49 7.58 8.2 7.89C7.91 8.2 7.08 8.97 7.08 10.54C7.08 12.11 8.23 13.63 8.39 13.84C8.55 14.05 10.63 17.26 13.82 18.64C14.58 18.97 15.18 19.17 15.64 19.31C16.4 19.56 17.1 19.52 17.65 19.44C18.26 19.35 19.52 18.68 19.78 17.94C20.04 17.2 20.04 16.57 19.96 16.44C19.88 16.31 19.68 16.23 19.36 16.07C19.05 15.92 17.5 15.15 17.21 15.05C16.92 14.94 16.71 14.89 16.5 15.2C16.29 15.52 15.7 16.23 15.52 16.44C15.34 16.65 15.16 16.67 14.85 16.52C14.54 16.36 13.54 16.03 12.35 14.97C11.42 14.15 10.8 13.13 10.62 12.82C10.44 12.51 10.6 12.34 10.76 12.19C10.9 12.05 11.07 11.83 11.23 11.65C11.39 11.46 11.44 11.33 11.55 11.13C11.65 10.92 11.6 10.73 11.52 10.58C11.44 10.42 10.82 8.9 10.56 8.29C10.31 7.69 10.06 7.77 9.87 7.76C9.7 7.75 9.5 7.5 9.04 7.5Z" />
                  </svg>
                )}
              </span>
              <span className="leading-tight tracking-tight">Chat WA</span>
            </button>

            {showScrollTop && (
              <button
                type="button"
                onClick={scrollToTop}
                className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-slate-800 hover:bg-sky-600 border border-slate-700 px-2 py-1 text-[10px] font-bold text-sky-300 hover:text-white transition-all cursor-pointer active:scale-95"
                title="Kembali ke Atas"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span className="leading-tight">Atas</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
