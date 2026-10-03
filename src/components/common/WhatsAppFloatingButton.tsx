import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Phone,
  Copy,
  Check,
  Server,
  Globe,
  CreditCard,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface WhatsAppFloatingButtonProps {
  defaultPhoneNumber?: string;
  adminName?: string;
  userRole?: string;
}

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  defaultPhoneNumber = '6281226738883',
  adminName = 'Cloud PRO Official Support',
  userRole,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [copied, setCopied] = useState(false);

  // Global event listener to open from TopBar, Sidebar, or anywhere in the app
  useEffect(() => {
    const handleOpen = (e?: Event) => {
      setIsOpen(true);
      const customEvent = e as CustomEvent<{ message?: string }>;
      if (customEvent?.detail?.message) {
        setMessage(customEvent.detail.message);
      }
    };
    window.addEventListener('open-whatsapp-center', handleOpen);
    return () => window.removeEventListener('open-whatsapp-center', handleOpen);
  }, []);

  const quickCategories = [
    {
      id: 'hosting',
      label: 'Hosting & Domain Klien',
      icon: Globe,
      desc: 'vHost, cPanel, SSL, DNS & Website',
      text: 'Halo Admin Cloud PRO, saya butuh bantuan terkait Akun Hosting, Domain, atau File Website.',
    },
    {
      id: 'server',
      label: 'Server VPS & Tailscale',
      icon: Server,
      desc: 'Cluster Nodes, RAM/CPU, SSH & IP',
      text: 'Halo Admin Cloud PRO, saya ingin konsultasi atau butuh bantuan performa Server Node & Jaringan.',
    },
    {
      id: 'billing',
      label: 'Billing & Paket Reseller',
      icon: CreditCard,
      desc: 'Kwitansi invoice, kuota & aktivasi',
      text: 'Halo Tim Billing Cloud PRO, saya butuh konfirmasi tagihan invoice atau upgrade paket kuota.',
    },
    {
      id: 'emergency',
      label: 'Bantuan Darurat 24 Jam',
      icon: AlertTriangle,
      desc: 'Insiden kritis, kendala akses server',
      text: 'URGENT: Halo Tim Cloud PRO, saya membutuhkan bantuan darurat untuk kendala sistem server saya.',
    },
  ];

  const handleSendMessage = (textToSend?: string) => {
    const finalMsg = textToSend || message.trim() || 'Halo Admin Cloud PRO, saya butuh bantuan layanan.';
    let cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMsg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText('081226738883');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* =========================================================================
          INTERACTIVE WHATSAPP HELPDESK CENTER POPUP
          ========================================================================= */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pusat Bantuan WhatsApp Cloud PRO"
          className="fixed bottom-20 right-4 sm:right-6 z-50 w-[92vw] sm:w-96 max-w-sm rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-emerald-950/20 overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          {/* Header with WhatsApp Gradient */}
          <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-xs shadow-xs">
                    {/* Authentic WhatsApp SVG */}
                    <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.04 7.5C8.83 7.5 8.49 7.58 8.2 7.89C7.91 8.2 7.08 8.97 7.08 10.54C7.08 12.11 8.23 13.63 8.39 13.84C8.55 14.05 10.63 17.26 13.82 18.64C14.58 18.97 15.18 19.17 15.64 19.31C16.4 19.56 17.1 19.52 17.65 19.44C18.26 19.35 19.52 18.68 19.78 17.94C20.04 17.2 20.04 16.57 19.96 16.44C19.88 16.31 19.68 16.23 19.36 16.07C19.05 15.92 17.5 15.15 17.21 15.05C16.92 14.94 16.71 14.89 16.5 15.2C16.29 15.52 15.7 16.23 15.52 16.44C15.34 16.65 15.16 16.67 14.85 16.52C14.54 16.36 13.54 16.03 12.35 14.97C11.42 14.15 10.8 13.13 10.62 12.82C10.44 12.51 10.6 12.34 10.76 12.19C10.9 12.05 11.07 11.83 11.23 11.65C11.39 11.46 11.44 11.33 11.55 11.13C11.65 10.92 11.6 10.73 11.52 10.58C11.44 10.42 10.82 8.9 10.56 8.29C10.31 7.69 10.06 7.77 9.87 7.76C9.7 7.75 9.5 7.5 9.04 7.5Z" />
                    </svg>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-300 ring-2 ring-emerald-600 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold tracking-tight text-white">
                      Pusat WhatsApp Center
                    </h3>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" />
                  </div>
                  <p className="text-[11px] text-emerald-100 flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-200"></span>
                    <span>Online 24 Jam &bull; Respon Cepat</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                title="Tutup Panel Bantuan"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 space-y-3.5 bg-slate-50/70 dark:bg-slate-900/60 max-h-[75vh] overflow-y-auto">
            {/* Friendly Greeting Card */}
            <div className="rounded-2xl rounded-tl-sm border border-emerald-100 dark:border-emerald-900/40 bg-white dark:bg-slate-800/90 p-3 shadow-2xs text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              👋 Halo! Selamat datang di <strong>Pusat Layanan Terpadu Cloud PRO</strong>. Butuh bantuan teknis server, deployment website, atau paket reseller? Pilih topik di bawah atau kirim pesan langsung:
            </div>

            {/* Quick Topic Hub Cards */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                Kategori Layanan Bantuan
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {quickCategories.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSendMessage(cat.text)}
                      className="group flex items-center justify-between p-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/70 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 text-left transition-all shadow-2xs cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 truncate">
                            {cat.label}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                            {cat.desc}
                          </div>
                        </div>
                      </div>
                      <Send className="h-3 w-3 text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Direct Message Input */}
            <div className="pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                Ketik Pesan Khusus
              </span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Tulis kendala Anda di sini..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-semibold flex items-center justify-center transition-colors shadow-xs cursor-pointer active:scale-95"
                  title="Kirim Pesan ke WhatsApp"
                  aria-label="Kirim"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Direct Official Contact & Copy Button */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-400">
                <Phone className="h-3 w-3 text-emerald-600" />
                <span className="font-semibold">0812-2673-8883</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Salin Nomor WhatsApp"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="flex items-center gap-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-1 text-[10px] font-bold hover:bg-emerald-200 transition-colors cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Buka WA</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MINIMALIST ICONIC FLOATING LAUNCHER (BOTTOM-RIGHT)
          ========================================================================= */}
      <aside
        aria-label="Cloud PRO WhatsApp Center"
        className="fixed bottom-5 right-4 sm:right-6 z-40 group no-print"
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Buka WhatsApp Helpdesk Center"
          title="Pusat Bantuan WhatsApp Cloud PRO (0812-2673-8883)"
          className={`relative flex items-center gap-2 rounded-full border transition-all duration-300 shadow-xl cursor-pointer active:scale-95 touch-manipulation ${
            isOpen
              ? 'bg-slate-900 text-white border-slate-700 px-3.5 py-2.5 sm:px-4 sm:py-2.5'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400/60 hover:shadow-emerald-500/30 p-2.5 sm:px-3.5 sm:py-2.5'
          }`}
        >
          {/* Subtle Ambient Pulse Ring */}
          {!isOpen && (
            <span className="absolute -inset-1 rounded-full bg-emerald-400/25 blur-xs group-hover:bg-emerald-400/40 transition-all pointer-events-none" />
          )}

          {isOpen ? (
            <div className="flex items-center gap-1.5">
              <X className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              <span className="text-xs font-bold tracking-tight">Tutup</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <svg className="h-5 w-5 sm:h-5.5 sm:w-5.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.04 7.5C8.83 7.5 8.49 7.58 8.2 7.89C7.91 8.2 7.08 8.97 7.08 10.54C7.08 12.11 8.23 13.63 8.39 13.84C8.55 14.05 10.63 17.26 13.82 18.64C14.58 18.97 15.18 19.17 15.64 19.31C16.4 19.56 17.1 19.52 17.65 19.44C18.26 19.35 19.52 18.68 19.78 17.94C20.04 17.2 20.04 16.57 19.96 16.44C19.88 16.31 19.68 16.23 19.36 16.07C19.05 15.92 17.5 15.15 17.21 15.05C16.92 14.94 16.71 14.89 16.5 15.2C16.29 15.52 15.7 16.23 15.52 16.44C15.34 16.65 15.16 16.67 14.85 16.52C14.54 16.36 13.54 16.03 12.35 14.97C11.42 14.15 10.8 13.13 10.62 12.82C10.44 12.51 10.6 12.34 10.76 12.19C10.9 12.05 11.07 11.83 11.23 11.65C11.39 11.46 11.44 11.33 11.55 11.13C11.65 10.92 11.6 10.73 11.52 10.58C11.44 10.42 10.82 8.9 10.56 8.29C10.31 7.69 10.06 7.77 9.87 7.76C9.7 7.75 9.5 7.5 9.04 7.5Z" />
                </svg>
                {/* Active Ping Dot */}
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300 border border-emerald-600" />
                </span>
              </div>
              <span className="hidden sm:inline text-xs font-bold tracking-tight">
                Pusat WA
              </span>
            </div>
          )}
        </button>
      </aside>
    </>
  );
};
