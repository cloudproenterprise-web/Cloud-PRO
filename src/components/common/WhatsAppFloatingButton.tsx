import React, { useState } from 'react';
import { MessageCircle, X, Send, Phone, CheckCircle, ExternalLink, Sparkles } from 'lucide-react';

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

  const quickMessages = [
    'Halo Admin Cloud PRO, saya butuh bantuan seputar Server & Cluster Nodes.',
    'Halo Tim Cloud PRO, saya pelanggan/klien butuh bantuan Akun Hosting & Domain.',
    'Halo Support, saya Mitra Reseller ingin konsultasi Paket & Kuota.',
    'Bantuan kendala remote SSH Tailscale atau update script server.',
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

  return (
    <>
      {/* Interactive Chat Popup */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-80 sm:w-88 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs">
                    {/* Minimalist Authentic WhatsApp SVG */}
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.04 7.5C8.83 7.5 8.49 7.58 8.2 7.89C7.91 8.2 7.08 8.97 7.08 10.54C7.08 12.11 8.23 13.63 8.39 13.84C8.55 14.05 10.63 17.26 13.82 18.64C14.58 18.97 15.18 19.17 15.64 19.31C16.4 19.56 17.1 19.52 17.65 19.44C18.26 19.35 19.52 18.68 19.78 17.94C20.04 17.2 20.04 16.57 19.96 16.44C19.88 16.31 19.68 16.23 19.36 16.07C19.05 15.92 17.5 15.15 17.21 15.05C16.92 14.94 16.71 14.89 16.5 15.2C16.29 15.52 15.7 16.23 15.52 16.44C15.34 16.65 15.16 16.67 14.85 16.52C14.54 16.36 13.54 16.03 12.35 14.97C11.42 14.15 10.8 13.13 10.62 12.82C10.44 12.51 10.6 12.34 10.76 12.19C10.9 12.05 11.07 11.83 11.23 11.65C11.39 11.46 11.44 11.33 11.55 11.13C11.65 10.92 11.6 10.73 11.52 10.58C11.44 10.42 10.82 8.9 10.56 8.29C10.31 7.69 10.06 7.77 9.87 7.76C9.7 7.75 9.5 7.5 9.04 7.5Z" />
                    </svg>
                  </div>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-300 ring-2 ring-emerald-600 animate-pulse"></span>
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight">{adminName}</h4>
                  <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300"></span>
                    Online &bull; Respons Cepat
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
                title="Tutup WhatsApp Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 bg-slate-50/70 max-h-96 overflow-y-auto">
            {/* Greeting Speech Bubble */}
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200/90 shadow-2xs text-xs text-slate-700 leading-relaxed">
              👋 Halo! Selamat datang di layanan bantuan <strong>Cloud PRO</strong>. Ada yang bisa kami bantu seputar server, hosting, atau jaringan Anda hari ini?
            </div>

            {/* Quick questions chips */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Pertanyaan Cepat
              </span>
              <div className="space-y-1.5">
                {quickMessages.map((msg, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(msg)}
                    className="w-full text-left text-[11px] p-2 rounded-xl bg-white hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200/80 text-slate-700 hover:text-emerald-800 transition-colors flex items-center justify-between group shadow-2xs cursor-pointer"
                  >
                    <span className="line-clamp-1">{msg}</span>
                    <Send className="h-3 w-3 text-slate-400 group-hover:text-emerald-600 shrink-0 ml-1.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
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
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none shadow-2xs"
                />
                <button
                  onClick={() => handleSendMessage()}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-semibold flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                  title="Kirim ke WhatsApp"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Target WhatsApp Number Config */}
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
                    className="text-emerald-600 font-bold hover:underline"
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
                    className="hover:text-emerald-600 hover:underline cursor-pointer text-[10px]"
                  >
                    Ganti Nomor
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (Minimalist, Bottom-Right) */}
      <div className="fixed bottom-6 right-6 z-40 group">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Buka Chat WhatsApp Cloud PRO"
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-105 active:scale-95 border border-emerald-400/50 cursor-pointer"
        >
          {/* Subtle green ambient ring */}
          <span className="absolute -inset-1 rounded-full bg-emerald-400/20 blur-xs group-hover:bg-emerald-400/30 transition-all"></span>

          {isOpen ? (
            <X className="relative h-5 w-5 transition-transform duration-200" />
          ) : (
            <svg
              className="relative h-6 w-6 fill-current transition-transform duration-200 group-hover:scale-110"
              viewBox="0 0 24 24"
            >
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.04 7.5C8.83 7.5 8.49 7.58 8.2 7.89C7.91 8.2 7.08 8.97 7.08 10.54C7.08 12.11 8.23 13.63 8.39 13.84C8.55 14.05 10.63 17.26 13.82 18.64C14.58 18.97 15.18 19.17 15.64 19.31C16.4 19.56 17.1 19.52 17.65 19.44C18.26 19.35 19.52 18.68 19.78 17.94C20.04 17.2 20.04 16.57 19.96 16.44C19.88 16.31 19.68 16.23 19.36 16.07C19.05 15.92 17.5 15.15 17.21 15.05C16.92 14.94 16.71 14.89 16.5 15.2C16.29 15.52 15.7 16.23 15.52 16.44C15.34 16.65 15.16 16.67 14.85 16.52C14.54 16.36 13.54 16.03 12.35 14.97C11.42 14.15 10.8 13.13 10.62 12.82C10.44 12.51 10.6 12.34 10.76 12.19C10.9 12.05 11.07 11.83 11.23 11.65C11.39 11.46 11.44 11.33 11.55 11.13C11.65 10.92 11.6 10.73 11.52 10.58C11.44 10.42 10.82 8.9 10.56 8.29C10.31 7.69 10.06 7.77 9.87 7.76C9.7 7.75 9.5 7.5 9.04 7.5Z" />
            </svg>
          )}

          {/* Online green indicator badge */}
          {!isOpen && (
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white"></span>
            </span>
          )}
        </button>

        {/* Minimalist Tooltip on hover */}
        {!isOpen && (
          <div className="absolute right-14 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center pointer-events-none whitespace-nowrap">
            <div className="bg-slate-900 text-white font-medium text-xs px-2.5 py-1.5 rounded-lg shadow-md border border-slate-700">
              WhatsApp Support
            </div>
            <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -ml-1 border-r border-b border-slate-700"></div>
          </div>
        )}
      </div>
    </>
  );
};
