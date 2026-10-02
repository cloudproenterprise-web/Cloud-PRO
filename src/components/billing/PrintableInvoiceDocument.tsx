import React from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Clock,
  Building2,
  ShieldCheck,
  Server,
  QrCode,
  X,
  Save,
  RotateCcw,
} from 'lucide-react';
import { Invoice, CloudProLetterheadConfig } from '../../types';
import { DEFAULT_LETTERHEAD_CONFIG } from '../../services/storage';
import { CloudProLogo } from '../common/CloudProLogo';

/**
 * Generates a deterministic 21x21 QR-like matrix + 1D Barcode bars from a verification string
 * so the owner's digital barcode signature renders as crisp, scannable-style SVG vectors at 300+ DPI.
 */
export const BarcodeSignatureBlock: React.FC<{
  payload: string;
  signatureHash: string;
  ownerName: string;
  ownerTitle: string;
  cityAndDate: string;
  isPaid: boolean;
}> = ({ payload, signatureHash, ownerName, ownerTitle, cityAndDate, isPaid }) => {
  const size = 21;
  const cells: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder patterns (7x7 corners)
  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[r0 + r][c0 + c] = isBorder || isInner;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    cells[6][i] = i % 2 === 0;
    cells[i][6] = i % 2 === 0;
  }

  // Deterministic hash fill from payload
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  let seed = Math.abs(hash) || 987654321;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinderTL = r < 8 && c < 8;
      const inFinderTR = r < 8 && c >= size - 8;
      const inFinderBL = r >= size - 8 && c < 8;
      const inCenterBadge = r >= 8 && r <= 12 && c >= 8 && c <= 12;
      if (inFinderTL || inFinderTR || inFinderBL || r === 6 || c === 6) continue;
      if (inCenterBadge) {
        cells[r][c] = (r === 8 || r === 12 || c === 8 || c === 12) || (r === 10 && c === 10);
        continue;
      }
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      cells[r][c] = (seed & 3) !== 0;
    }
  }

  // 1D Linear Barcode bars
  const bars: number[] = [];
  let barSeed = Math.abs(hash) + 1337;
  for (let i = 0; i < 34; i++) {
    barSeed = (barSeed * 1103515245 + 12345) & 0x7fffffff;
    bars.push((barSeed % 3) + 1);
  }

  return (
    <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
      <div className="text-[10px] text-slate-600 font-medium">{cityAndDate}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 mt-0.5">
        {isPaid ? 'Penerima & Pengesahan Cloud PRO Enterprise' : 'Diterbitkan Resmi Oleh Cloud PRO Enterprise'}
      </div>

      {/* Barcode + QR Signature Box */}
      <div className="mt-1.5 inline-flex items-center gap-2.5 rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-2xs">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-16 w-16 shrink-0 text-slate-900"
          shapeRendering="crispEdges"
          aria-label="Digital Signature QR Barcode"
        >
          {cells.map((row, rIdx) =>
            row.map((filled, cIdx) =>
              filled ? (
                <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width={1} height={1} fill="currentColor" />
              ) : null
            )
          )}
        </svg>

        <div className="text-left border-l border-slate-200 pl-2.5">
          <div className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 text-[8px] font-mono font-bold text-emerald-800 uppercase">
            <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
            <span>BARCODE TTD SAH</span>
          </div>
          <div className="mt-1 font-bold text-[11px] text-slate-900 leading-tight">{ownerName}</div>
          <div className="text-[9px] text-slate-500 leading-tight">{ownerTitle}</div>
          {/* 1D Linear Barcode */}
          <svg
            viewBox="0 0 110 14"
            className="mt-1 h-3 w-28 text-slate-900"
            shapeRendering="crispEdges"
          >
            {(() => {
              let x = 0;
              return bars.map((w, idx) => {
                const el =
                  idx % 2 === 0 ? (
                    <rect key={idx} x={x} y={0} width={w * 1.4} height={14} fill="currentColor" />
                  ) : null;
                x += w * 1.5;
                return el;
              });
            })()}
          </svg>
          <div className="font-mono text-[8px] text-slate-500 tracking-tight">{signatureHash}</div>
        </div>
      </div>
    </div>
  );
};

export const InvoiceDocumentSheet: React.FC<{
  invoice: Invoice;
  mode: 'unpaid_statement' | 'payment_receipt';
  letterhead: CloudProLetterheadConfig;
  formatMoney: (amount: number, currency?: string) => string;
  isPrintPortal?: boolean;
}> = ({ invoice, mode, letterhead, formatMoney, isPrintPortal = false }) => {
  const isPaidReceipt = mode === 'payment_receipt';
  const sigHash =
    invoice.signatureHash ||
    `SIG-CPRO-${(invoice.receiptNumber || invoice.invoiceNumber).replace(/[^A-Z0-9]/gi, '')}`;
  const qrPayload = `CLOUDPRO|${isPaidReceipt ? 'RECEIPT' : 'INVOICE'}|NO:${
    invoice.receiptNumber || invoice.invoiceNumber
  }|AMT:${invoice.currency}${invoice.amount}|OWNER:${letterhead.ownerName}`;

  const docDateStr =
    isPaidReceipt && invoice.paidAt
      ? new Date(invoice.paidAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : new Date(invoice.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

  return (
    <div
      className={`bg-white text-slate-900 font-sans ${
        isPrintPortal
          ? 'w-full max-w-[190mm] mx-auto p-0 text-[11px]'
          : 'rounded-2xl border-2 border-slate-200 p-4 sm:p-6 shadow-xs text-xs'
      }`}
    >
      {/* ================================================================= */}
      {/* 1. KOP SURAT RESMI OTOMATIS SERVER CLOUD PRO (RAMPING & ELEGAN)   */}
      {/* ================================================================= */}
      <div className="border-b-4 border-double border-slate-900 pb-3 mb-3.5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            <CloudProLogo variant="icon" size="lg" showSubtitle={false} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
                {letterhead.headerTitle}
              </h2>
              <span className="rounded bg-sky-100 border border-sky-300 px-1.5 py-0.5 font-mono text-[9px] font-bold text-sky-900">
                {letterhead.serverDomain}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-slate-700 mt-0.5">
              {letterhead.headerSubtitle}
            </p>
            <p className="text-[9.5px] text-slate-500 mt-0.5">
              {letterhead.officeAddress} &bull; Email: {letterhead.officialEmail} &bull; WA Resmi:{' '}
              {letterhead.officialWhatsApp}
            </p>
          </div>
        </div>

        {/* Status Stamp Pill on Top Right */}
        <div className="text-right shrink-0">
          <div
            className={`inline-flex items-center gap-1 rounded-lg border-2 px-2.5 py-1 font-mono text-[10px] font-extrabold uppercase tracking-wider ${
              isPaidReceipt && invoice.status === 'paid'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                : 'border-amber-500 bg-amber-50 text-amber-900'
            }`}
          >
            {isPaidReceipt && invoice.status === 'paid' ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>PAID / LUNAS SAH</span>
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span>UNPAID / TAGIHAN</span>
              </>
            )}
          </div>
          <div className="font-mono text-[9px] text-slate-500 mt-1">
            {invoice.billingSource === 'automated' ? 'AUTO-BILLING SERVER' : 'MANUAL OFFICIAL DOC'}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. JUDUL DOKUMEN & NOMOR REFERENSI                                */}
      {/* ================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 mb-3.5">
        <div>
          <div className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-tight">
            {isPaidReceipt
              ? 'BUKTI PEMBAYARAN RESMI (KWITANSI LUNAS)'
              : 'BUKTI TAGIHAN LAYANAN (UNPAID INVOICE)'}
          </div>
          <div className="font-mono text-[10.5px] font-bold text-sky-700">
            {isPaidReceipt
              ? `No. Kwitansi: ${invoice.receiptNumber || `KW-${invoice.invoiceNumber}`} (Ref: ${invoice.invoiceNumber})`
              : `No. Invoice: ${invoice.invoiceNumber}`}
          </div>
        </div>

        <div className="text-right font-mono text-[10px] text-slate-600">
          <div>
            Tgl. Terbit: <strong>{new Date(invoice.createdAt).toLocaleDateString('id-ID')}</strong>
          </div>
          <div>
            {isPaidReceipt && invoice.paidAt ? (
              <>
                Tgl. Lunas: <strong className="text-emerald-700">{new Date(invoice.paidAt).toLocaleString('id-ID')}</strong>
              </>
            ) : (
              <>
                Jatuh Tempo: <strong className="text-amber-700">{new Date(invoice.dueDate).toLocaleDateString('id-ID')}</strong>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. DATA PELANGGAN & PEMILIK SERVER CLOUD PRO (2 KOLOM RAMPING)    */}
      {/* ================================================================= */}
      <div className="grid grid-cols-2 gap-3 mb-3.5 text-[10.5px]">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            {isPaidReceipt ? 'Diterima Pembayaran Dari (Pelanggan):' : 'Ditagihkan Kepada (Pelanggan):'}
          </div>
          <div className="font-bold text-slate-900 text-xs mt-0.5">
            {invoice.payerName || invoice.userName}
          </div>
          <div className="font-mono text-[10px] text-slate-600">{invoice.userEmail || '-'}</div>
          {invoice.userPhone && (
            <div className="font-mono text-[10px] text-emerald-700 font-semibold">
              WA Terdaftar: {invoice.userPhone}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-right">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Pemilik &amp; Penerima Resmi Cloud PRO Enterprise:
          </div>
          <div className="font-bold text-slate-900 text-xs mt-0.5">{letterhead.ownerName}</div>
          <div className="text-[10px] text-slate-600">{letterhead.ownerTitle}</div>
          <div className="font-mono text-[10px] text-sky-700 font-semibold">
            {letterhead.serverDomain}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 4. TABEL RINCIAN LAYANAN & HARGA                                  */}
      {/* ================================================================= */}
      <div className="rounded-xl border border-slate-300 overflow-hidden mb-3">
        <table className="w-full text-left text-[10.5px]">
          <thead className="bg-slate-900 text-white text-[9.5px] font-bold uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2">No</th>
              <th className="px-3 py-2">Deskripsi Layanan Hosting / Domain / Server</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Harga Satuan</th>
              <th className="px-3 py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {(Array.isArray(invoice.items) && invoice.items.length > 0
              ? invoice.items
              : [
                  {
                    description: invoice.description || 'Perpanjangan Layanan Cloud Hosting & Domain',
                    qty: 1,
                    unitPrice: invoice.amount || 0,
                    amount: invoice.amount || 0,
                  },
                ]
            ).map((it, idx) => (
              <tr key={idx} className="bg-white">
                <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                <td className="px-3 py-2 font-sans font-semibold text-slate-800">
                  {it.description}
                </td>
                <td className="px-3 py-2 text-right text-slate-600">{it.qty || 1}</td>
                <td className="px-3 py-2 text-right text-slate-600">
                  {formatMoney(it.unitPrice ?? it.amount, invoice.currency)}
                </td>
                <td className="px-3 py-2 text-right font-bold text-slate-900">
                  {formatMoney(it.amount, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white font-mono">
              <td colSpan={4} className="px-3 py-2.5 font-sans text-[10.5px] font-bold uppercase tracking-wider text-right text-slate-200">
                {isPaidReceipt ? 'TOTAL PEMBAYARAN DITERIMA (LUNAS):' : 'TOTAL TAGIHAN HARUS DIBAYAR:'}
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-extrabold text-emerald-400">
                {formatMoney(invoice.amount, invoice.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ================================================================= */}
      {/* 5. REKENING SERVER CLOUD PRO & BARCODE TANDA TANGAN PEMILIK       */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start pt-1">
        {/* Left 7 Cols: Rekening Pembayaran Cloud PRO (Unpaid) or Bukti Verifikasi (Paid) */}
        <div className="sm:col-span-7">
          {!isPaidReceipt ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 text-[10px] text-slate-800 space-y-1.5">
              <div className="font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <Building2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Rekening Pembayaran Resmi Cloud PRO Enterprise:</span>
              </div>
              <div className="font-mono space-y-1 pl-1">
                <div>
                  &bull; <strong>{letterhead.bank1Name}:</strong>{' '}
                  <span className="font-bold text-slate-950">{letterhead.bank1Number}</span> a.n{' '}
                  <strong>{letterhead.bank1Holder}</strong>
                </div>
                {letterhead.bank2Number && (
                  <div>
                    &bull; <strong>{letterhead.bank2Name}:</strong>{' '}
                    <span className="font-bold text-slate-950">{letterhead.bank2Number}</span> a.n{' '}
                    <strong>{letterhead.bank2Holder}</strong>
                  </div>
                )}
                {letterhead.qrisInfo && (
                  <div>
                    &bull; <strong>QRIS Resmi:</strong> {letterhead.qrisInfo}
                  </div>
                )}
              </div>
              <p className="text-[9.5px] text-slate-600 pt-0.5">
                {invoice.paymentNotes ||
                  'Harap sertakan Nomor Invoice saat transfer. Kwitansi Lunas diterbitkan otomatis/manual setelah pembayaran.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 text-[10px] text-slate-800 space-y-1.5">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Rincian Pengesahan Bukti Pembayaran (Lunas):</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[9.5px]">
                <div>
                  Metode: <strong>{invoice.paymentMethod || 'Transfer Bank'}</strong>
                </div>
                <div>
                  No. Ref: <strong>{invoice.paymentReference || '-'}</strong>
                </div>
                <div>
                  Penyetor: <strong>{invoice.payerName || invoice.userName}</strong>
                </div>
                <div>
                  Penerima: <strong>{invoice.verifiedBy || letterhead.ownerName}</strong>
                </div>
              </div>
              <div className="text-[9.5px] text-slate-600 border-t border-emerald-200 pt-1">
                Rekening Penerima Cloud PRO Enterprise: <strong>{letterhead.bank1Name} {letterhead.bank1Number}</strong> a.n <strong>{letterhead.bank1Holder}</strong>
              </div>
              {invoice.proofImageUrl && (
                <div className="pt-1">
                  <img
                    src={invoice.proofImageUrl}
                    alt="Bukti Transfer"
                    className="max-h-24 rounded-lg border border-emerald-300 object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Digital Signature Barcode of Cloud PRO Owner */}
        <div className="sm:col-span-5 flex justify-end">
          <BarcodeSignatureBlock
            payload={qrPayload}
            signatureHash={sigHash}
            ownerName={invoice.verifiedBy || letterhead.ownerName}
            ownerTitle={letterhead.ownerTitle}
            cityAndDate={`${letterhead.signatureCity}, ${docDateStr}`}
            isPaid={isPaidReceipt && invoice.status === 'paid'}
          />
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-500">
        <span>{letterhead.footerNote}</span>
        <span className="font-mono font-semibold text-slate-700">
          {letterhead.serverDomain} &bull; {sigHash}
        </span>
      </div>
    </div>
  );
};

export const PrintPortalContainer: React.FC<{
  invoice: Invoice | null;
  mode: 'unpaid_statement' | 'payment_receipt';
  letterhead: CloudProLetterheadConfig;
  formatMoney: (amount: number, currency?: string) => string;
}> = ({ invoice, mode, letterhead, formatMoney }) => {
  if (!invoice || typeof document === 'undefined') return null;

  return createPortal(
    <div id="cloudpro-print-sheet" className="hidden print:block">
      <InvoiceDocumentSheet
        invoice={invoice}
        mode={mode}
        letterhead={letterhead}
        formatMoney={formatMoney}
        isPrintPortal={true}
      />
    </div>,
    document.body
  );
};

export const LetterheadConfigModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  config: CloudProLetterheadConfig;
  onSave: (nextConfig: CloudProLetterheadConfig) => void;
}> = ({ isOpen, onClose, config, onSave }) => {
  const [form, setForm] = React.useState<CloudProLetterheadConfig>(config);

  React.useEffect(() => {
    setForm(config);
  }, [config, isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/65 backdrop-blur-xs p-2.5 pt-3 sm:p-4 sm:pt-6 no-print">
      <div className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Modul Kop Resmi, Pemilik, Rekening &amp; Barcode TTD Cloud PRO Enterprise
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur Kop Surat otomatis, Nama Pemilik/Penerima Cloud PRO Enterprise, Nomor Rekening Pembayaran, Barcode TTD, &amp; WhatsApp Otomatis.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Section 1: Kop Surat & Identitas Server Cloud PRO */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              1. Kop Resmi &amp; Identitas Cloud PRO Enterprise
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Kop Utama Cloud PRO Enterprise:
                </label>
                <input
                  type="text"
                  required
                  value={form.headerTitle}
                  onChange={e => setForm({ ...form, headerTitle: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Domain Resmi Server pada Kop:
                </label>
                <input
                  type="text"
                  required
                  value={form.serverDomain}
                  onChange={e => setForm({ ...form, serverDomain: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sub-Kop / Deskripsi Layanan Resmi:
              </label>
              <input
                type="text"
                required
                value={form.headerSubtitle}
                onChange={e => setForm({ ...form, headerSubtitle: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat / Node Server:
                </label>
                <input
                  type="text"
                  value={form.officeAddress}
                  onChange={e => setForm({ ...form, officeAddress: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Resmi Kop:
                </label>
                <input
                  type="text"
                  value={form.officialEmail}
                  onChange={e => setForm({ ...form, officialEmail: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Resmi Cloud PRO Enterprise:
                </label>
                <input
                  type="text"
                  value={form.officialWhatsApp}
                  onChange={e => setForm({ ...form, officialWhatsApp: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pemilik Server & Tanda Tangan Barcode */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="font-bold text-emerald-950 dark:text-emerald-300 uppercase tracking-wider text-[11px]">
              2. Pemilik / Penerima Cloud PRO Enterprise &amp; Tanda Tangan Barcode
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pemilik / Penerima Server:
                </label>
                <input
                  type="text"
                  required
                  value={form.ownerName}
                  onChange={e => setForm({ ...form, ownerName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jabatan pada Tanda Tangan Barcode:
                </label>
                <input
                  type="text"
                  required
                  value={form.ownerTitle}
                  onChange={e => setForm({ ...form, ownerTitle: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kota / Lokasi Pengesahan:
                </label>
                <input
                  type="text"
                  value={form.signatureCity}
                  onChange={e => setForm({ ...form, signatureCity: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Nomor Rekening Pembayaran Milik Server Cloud PRO */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="font-bold text-amber-950 dark:text-amber-300 uppercase tracking-wider text-[11px]">
              3. Input Nomor Rekening Pembayaran Milik Cloud PRO Enterprise
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Bank Utama (Rekening 1):
                </label>
                <input
                  type="text"
                  required
                  value={form.bank1Name}
                  onChange={e => setForm({ ...form, bank1Name: e.target.value })}
                  placeholder="Contoh: Bank BCA"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Rekening 1:
                </label>
                <input
                  type="text"
                  required
                  value={form.bank1Number}
                  onChange={e => setForm({ ...form, bank1Number: e.target.value })}
                  placeholder="8420-9918-22"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Atas Nama Pemilik Rekening 1:
                </label>
                <input
                  type="text"
                  required
                  value={form.bank1Holder}
                  onChange={e => setForm({ ...form, bank1Holder: e.target.value })}
                  placeholder="Jaenal Maskun"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Bank Kedua (Opsional):
                </label>
                <input
                  type="text"
                  value={form.bank2Name}
                  onChange={e => setForm({ ...form, bank2Name: e.target.value })}
                  placeholder="Contoh: Bank Mandiri / BRI / BSI"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Rekening 2:
                </label>
                <input
                  type="text"
                  value={form.bank2Number}
                  onChange={e => setForm({ ...form, bank2Number: e.target.value })}
                  placeholder="139-00-..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Atas Nama Pemilik Rekening 2:
                </label>
                <input
                  type="text"
                  value={form.bank2Holder}
                  onChange={e => setForm({ ...form, bank2Holder: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Informasi QRIS / E-Wallet Cloud PRO Enterprise:
              </label>
              <input
                type="text"
                value={form.qrisInfo}
                onChange={e => setForm({ ...form, qrisInfo: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Section 4: Pengiriman Otomatis WhatsApp Terdaftar & Email */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3 dark:border-sky-900/50 dark:bg-sky-950/20">
            <div className="font-bold text-sky-950 dark:text-sky-300 uppercase tracking-wider text-[11px]">
              4. Pengiriman Otomatis Tagihan (UNPAID) &amp; Kwitansi (PAID) ke WhatsApp Terdaftar &amp; Email
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 cursor-pointer dark:border-slate-800 dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={form.autoSendWhatsApp}
                  onChange={e => setForm({ ...form, autoSendWhatsApp: e.target.checked })}
                  className="h-4 w-4 accent-emerald-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Kirim Otomatis ke WA Terdaftar
                </span>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 cursor-pointer dark:border-slate-800 dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={form.autoSendEmail}
                  onChange={e => setForm({ ...form, autoSendEmail: e.target.checked })}
                  className="h-4 w-4 accent-sky-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Kirim Otomatis ke Email Terdaftar
                </span>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 cursor-pointer dark:border-slate-800 dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={form.autoOpenWhatsAppOnManual}
                  onChange={e => setForm({ ...form, autoOpenWhatsAppOnManual: e.target.checked })}
                  className="h-4 w-4 accent-teal-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Buka Chat WA Saat Terbit Manual
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Endpoint API WhatsApp Gateway (Fonnte / Wablas / Opsional):
                </label>
                <input
                  type="text"
                  value={form.waGatewayUrl || ''}
                  onChange={e => setForm({ ...form, waGatewayUrl: e.target.value })}
                  placeholder="https://api.fonnte.com/send (Kosongkan jika pakai Outbox / WA Web)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Token API WhatsApp Gateway (Opsional):
                </label>
                <input
                  type="password"
                  value={form.waGatewayToken || ''}
                  onChange={e => setForm({ ...form, waGatewayToken: e.target.value })}
                  placeholder="Token API Gateway..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => setForm({ ...DEFAULT_LETTERHEAD_CONFIG })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Default Cloud PRO Enterprise</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-500 shadow-xs cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Simpan Pengaturan Kop &amp; Rekening</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
