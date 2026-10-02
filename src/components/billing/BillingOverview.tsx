import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Eye,
  DollarSign,
  Receipt,
  PlusCircle,
  Zap,
  RefreshCw,
  Trash2,
  Send,
  FileCheck,
  FileWarning,
  RotateCcw,
  Upload,
  Wallet,
  Check,
  X,
  Building2,
  ShieldCheck,
  Sparkles,
  QrCode,
  Phone,
  Mail,
  ChevronDown,
} from 'lucide-react';
import { Invoice, InvoiceItem, CloudProLetterheadConfig } from '../../types';
import { CloudProApi } from '../../services/api';
import { db } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';
import {
  InvoiceDocumentSheet,
  PrintPortalContainer,
  LetterheadConfigModal,
} from './PrintableInvoiceDocument';

interface BillingAutoConfig {
  autoGenerateMonthly: boolean;
  invoiceLeadDays: number;
  autoDeductWallet: boolean;
  autoSuspendOverdue: boolean;
  whatsappReminder: boolean;
  defaultCurrency: 'IDR' | 'USD';
  idrExchangeRate: number;
  bankAccountInfo: string;
  lastRunAt?: string;
}

const AUTO_BILLING_STORAGE_KEY = 'cloudpro_auto_billing_config_v2';

export const BillingOverview: React.FC = () => {
  const { currentUser, currentResellerProfile } = useAuth();
  const { invoices, accounts, showToast, refreshAll } = useServer();

  if (!currentUser) return null;

  // Strictly filter accounts accessible by this user (Reseller never sees Root Admin domain denbaguse.my.id)
  const accessibleAccounts = accounts.filter(acc => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'reseller') {
      return (
        acc.resellerId === currentUser.id &&
        acc.id !== 'acc-rdm-01' &&
        acc.primaryDomain !== 'denbaguse.my.id'
      );
    }
    return (
      (acc.customerId === currentUser.id ||
        acc.username === currentUser.username ||
        acc.customerEmail === currentUser.email ||
        acc.id === 'acc-school-02') &&
      acc.id !== 'acc-rdm-01' &&
      acc.primaryDomain !== 'denbaguse.my.id'
    );
  });

  // Official Cloud PRO Letterhead, Owner, Bank Account & Barcode Signature Configuration
  const [letterheadConfig, setLetterheadConfig] = useState<CloudProLetterheadConfig>(() =>
    db.getLetterheadConfig()
  );
  const [isLetterheadModalOpen, setIsLetterheadModalOpen] = useState(false);

  const handleSaveLetterheadConfig = (nextCfg: CloudProLetterheadConfig) => {
    setLetterheadConfig(nextCfg);
    db.saveLetterheadConfig(nextCfg);
    setAutoConfig(prev => ({
      ...prev,
      bankAccountInfo: `${nextCfg.bank1Name}: ${nextCfg.bank1Number} a.n ${nextCfg.bank1Holder}${
        nextCfg.bank2Number ? ` / ${nextCfg.bank2Name}: ${nextCfg.bank2Number}` : ''
      }`,
    }));
    showToast(
      'success',
      'Kop Resmi & Rekening Cloud PRO Disimpan!',
      `Kop surat otomatis, pemilik (${nextCfg.ownerName}), rekening pembayaran, dan Barcode TTD telah diperbarui.`
    );
  };

  // Document Viewer Modal State (Supports switching between 'unpaid_statement' and 'payment_receipt')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [docViewMode, setDocViewMode] = useState<'unpaid_statement' | 'payment_receipt'>('unpaid_statement');

  // Toggle body.has-print-document whenever selectedInvoice is open so window.print() hides #root and prints ONLY the 1-page A4 sheet
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (selectedInvoice) {
      document.body.classList.add('has-print-document');
    } else {
      document.body.classList.remove('has-print-document');
    }
    return () => {
      document.body.classList.remove('has-print-document');
    };
  }, [selectedInvoice]);

  // Manual Payment Proof Issuance Modal State ("Menerbitkan Bukti Pembayaran Input Manual")
  const [proofTargetInvoice, setProofTargetInvoice] = useState<Invoice | null>(null);
  const [isStandaloneProofModalOpen, setIsStandaloneProofModalOpen] = useState(false);
  const [isProofInvoiceDropdownOpen, setIsProofInvoiceDropdownOpen] = useState(false);
  const [isProofMethodDropdownOpen, setIsProofMethodDropdownOpen] = useState(false);
  const [isManualAccountDropdownOpen, setIsManualAccountDropdownOpen] = useState(false);
  const [isManualDocTypeDropdownOpen, setIsManualDocTypeDropdownOpen] = useState(false);
  const [proofSelectedInvoiceId, setProofSelectedInvoiceId] = useState<string>('');
  const [proofReceiptNumber, setProofReceiptNumber] = useState('');
  const [proofPaymentMethod, setProofPaymentMethod] = useState('Transfer Bank BCA (Verifikasi Manual)');
  const [proofReference, setProofReference] = useState('');
  const [proofPayerName, setProofPayerName] = useState('');
  const [proofUserPhone, setProofUserPhone] = useState('+62 812-2673-8883');
  const [proofVerifiedBy, setProofVerifiedBy] = useState(
    () => db.getLetterheadConfig().ownerName || currentUser.name
  );
  const [proofPaidDate, setProofPaidDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [proofNotes, setProofNotes] = useState(
    'Pembayaran telah diterima dan diverifikasi secara manual. Layanan hosting/domain aktif.'
  );
  const [proofImageDataUrl, setProofImageDataUrl] = useState<string>('');
  const proofFileInputRef = useRef<HTMLInputElement>(null);

  // Online Gateway Pay Modal State
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Midtrans (BCA / Mandiri VA)');
  const [isProcessing, setIsProcessing] = useState(false);

  // Manual Invoice Creation Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [clientMode, setClientMode] = useState<'select' | 'custom'>('select');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accessibleAccounts[0]?.id || accounts[0]?.id || ''
  );
  const [customClientName, setCustomClientName] = useState('');
  const [customClientEmail, setCustomClientEmail] = useState('');
  const [customClientPhone, setCustomClientPhone] = useState('+62 812-2673-8883');
  const [manualAutoNotifyWa, setManualAutoNotifyWa] = useState(true);
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState('');
  const [manualReceiptNumber, setManualReceiptNumber] = useState('');
  const [manualCurrency, setManualCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [manualStatus, setManualStatus] = useState<'unpaid' | 'paid' | 'overdue'>('unpaid');
  const [manualDueDate, setManualDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    return d.toISOString().split('T')[0];
  });
  const [manualPaymentMethod, setManualPaymentMethod] = useState('Transfer Bank BCA / QRIS Manual');
  const [manualPaymentReference, setManualPaymentReference] = useState('');
  const [manualPayerName, setManualPayerName] = useState('');
  const [manualPaymentNotes, setManualPaymentNotes] = useState('');
  const [manualItems, setManualItems] = useState<InvoiceItem[]>([
    {
      description: 'Layanan Cloud Hosting & Domain (1 Tahun)',
      qty: 1,
      unitPrice: 350000,
      amount: 350000,
    },
  ]);

  // Top-Up Modal State
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState(50);

  // Automated Billing Configuration State (Default autoDeductWallet = false so Unpaid Invoices are generated cleanly!)
  const [autoConfig, setAutoConfig] = useState<BillingAutoConfig>(() => {
    try {
      const saved = localStorage.getItem(AUTO_BILLING_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      autoGenerateMonthly: true,
      invoiceLeadDays: 7,
      autoDeductWallet: false,
      autoSuspendOverdue: false,
      whatsappReminder: true,
      defaultCurrency: 'IDR',
      idrExchangeRate: 16000,
      bankAccountInfo: 'Bank BCA: 8420-9918-22 a.n Cloud PRO Enterprise / QRIS Nusantara Host',
    };
  });
  const [isRunningAutoCycle, setIsRunningAutoCycle] = useState(false);
  const [showAutoConfigDetails, setShowAutoConfigDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid' | 'overdue'>('all');

  useEffect(() => {
    if (accessibleAccounts.length > 0 && !accessibleAccounts.some(a => a.id === selectedAccountId)) {
      setSelectedAccountId(accessibleAccounts[0].id);
    }
  }, [currentUser.id, accessibleAccounts.length]);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_BILLING_STORAGE_KEY, JSON.stringify(autoConfig));
    } catch {
      // ignore
    }
  }, [autoConfig]);

  // Ensure default invoices exist if empty
  useEffect(() => {
    if (invoices.length === 0) {
      db.hydrateFromServerVault().then(() => refreshAll());
    }
  }, []);

  const isCustomerRole = currentUser.role === 'customer';
  const isResellerRole = currentUser.role === 'reseller';
  const isManagerRole = currentUser.role === 'admin' || currentUser.role === 'reseller';

  // Reseller 2-Function Billing Mode:
  // 1. 'cloudpro_billing' -> Menerima tagihan & pembayaran lisensi/kapasitas Reseller ke Cloud PRO
  // 2. 'client_billing'   -> Mengelola tagihan & pembayaran ke Klien Reseller (Otomatis & Manual)
  const [resellerBillingMode, setResellerBillingMode] = useState<'cloudpro_billing' | 'client_billing'>('cloudpro_billing');

  // Identify whether an invoice is billed BY Cloud PRO TO the Reseller
  const isCloudProToResellerInvoice = (inv: Invoice): boolean => {
    return (
      inv.id.startsWith('inv_cloudpro_reseller_') ||
      (inv.userId === currentUser.id && !inv.resellerId)
    );
  };

  // Filter invoices for current user or reseller (strictly isolated!)
  const roleScopedInvoices = invoices.filter(inv => {
    if (currentUser.role === 'admin') return true;
    const accessibleIds = new Set(accessibleAccounts.map(a => a.id));
    if (currentUser.role === 'reseller') {
      return (
        (inv.resellerId === currentUser.id ||
          inv.userId === currentUser.id ||
          inv.id === 'inv-default-unpaid-01' ||
          (inv.accountId ? accessibleIds.has(inv.accountId) : false)) &&
        inv.userEmail !== 'admin@denbaguse.my.id'
      );
    }
    // Customer role: show automatic invoices belonging to this customer or their hosting accounts
    const belongsToCustomer =
      inv.userId === currentUser.id ||
      inv.userEmail === currentUser.email ||
      inv.userId === 'usr-cust-02' ||
      (inv.accountId ? accessibleIds.has(inv.accountId) : false);
    return belongsToCustomer && inv.userEmail !== 'admin@denbaguse.my.id';
  });

  // Split Reseller invoices into Function 1 (Cloud PRO -> Reseller) and Function 2 (Reseller -> Clients)
  const resellerCloudProInvoices = roleScopedInvoices.filter(inv => isCloudProToResellerInvoice(inv));
  const resellerClientInvoices = roleScopedInvoices.filter(inv => !isCloudProToResellerInvoice(inv));

  // Auto-seed official Cloud PRO -> Reseller subscription invoice so Function 1 is always ready
  useEffect(() => {
    if (isResellerRole && resellerCloudProInvoices.length === 0) {
      const now = new Date();
      const due = new Date(now.getTime() + 7 * 86400000);
      const resellerBrand = currentResellerProfile?.brandName || currentUser.name;
      const cloudProInv: Invoice = {
        id: `inv_cloudpro_reseller_${currentUser.id}`,
        invoiceNumber: `INV-CPRO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-RSL01`,
        userId: currentUser.id,
        userName: `${currentUser.name} (${resellerBrand})`,
        userEmail: currentUser.email,
        userPhone: currentUser.phone || '+62 812-2673-8883',
        amount: 750000,
        currency: 'IDR',
        status: 'unpaid',
        billingSource: 'automated',
        billingPeriod: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        dueDate: due.toISOString(),
        createdAt: now.toISOString(),
        paymentInstructions: `${letterheadConfig.bank1Name}: ${letterheadConfig.bank1Number} a.n ${letterheadConfig.bank1Holder}`,
        paymentNotes: 'Tagihan Resmi Langganan Lisensi & Kapasitas Reseller WHM Cloud PRO Enterprise.',
        items: [
          {
            description: `Langganan Lisensi Reseller WHM Cloud PRO Enterprise & Alokasi NVMe SSD (${resellerBrand})`,
            qty: 1,
            unitPrice: 750000,
            amount: 750000,
          },
        ],
      };
      db.saveInvoice(cloudProInv);
      refreshAll();
    }
  }, [isResellerRole, resellerCloudProInvoices.length, currentUser.id]);

  // Auto-generate automatic hosting invoice for Customer if none exists yet
  useEffect(() => {
    if (isCustomerRole && accessibleAccounts.length > 0 && roleScopedInvoices.length === 0) {
      const acc = accessibleAccounts[0];
      const now = new Date();
      const due = new Date(now.getTime() + 7 * 86400000);
      const autoInv: Invoice = {
        id: `inv_auto_${acc.id}`,
        invoiceNumber: `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${(acc.username || 'HOST').toUpperCase().slice(0, 5)}`,
        userId: currentUser.id,
        userName: currentUser.name || acc.customerName || 'Pelanggan Hosting cPanel',
        userEmail: currentUser.email || acc.customerEmail || 'admin@websitepelanggan.my.id',
        userPhone: acc.customerWhatsapp || currentUser.phone || '+62 812-2673-8883',
        accountId: acc.id,
        resellerId: acc.resellerId,
        amount: 350000,
        currency: 'IDR',
        status: 'unpaid',
        billingSource: 'automated',
        billingPeriod: now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        dueDate: due.toISOString(),
        createdAt: now.toISOString(),
        paymentInstructions: `${letterheadConfig.bank1Name}: ${letterheadConfig.bank1Number} a.n ${letterheadConfig.bank1Holder}`,
        items: [
          {
            description: `Tagihan Otomatis Perpanjangan Cloud Hosting (${acc.primaryDomain}) — Paket ${acc.planName || acc.packageName || 'Cloud Starter NVMe'}`,
            qty: 1,
            unitPrice: 350000,
            amount: 350000,
          },
        ],
      };
      db.saveInvoice(autoInv);
      refreshAll();
    }
  }, [isCustomerRole, accessibleAccounts.length, roleScopedInvoices.length]);

  // Active invoice list based on role and Reseller's 2-function tab selection
  const activeScopedInvoices = isResellerRole
    ? resellerBillingMode === 'cloudpro_billing'
      ? resellerCloudProInvoices
      : resellerClientInvoices
    : roleScopedInvoices;

  // Whether the current view is for receiving & paying bills (Customer OR Reseller paying Cloud PRO)
  const isPayerView = isCustomerRole || (isResellerRole && resellerBillingMode === 'cloudpro_billing');
  const isClientBillingManagerView =
    currentUser.role === 'admin' || (isResellerRole && resellerBillingMode === 'client_billing');

  const userInvoices = activeScopedInvoices.filter(inv => {
    if (filterStatus === 'all') return true;
    return inv.status === filterStatus;
  });

  const unpaidInvoicesList = activeScopedInvoices.filter(i => i.status === 'unpaid' || i.status === 'overdue');
  const paidInvoicesList = activeScopedInvoices.filter(i => i.status === 'paid');

  const formatMoney = (amount: number, currency = 'IDR') => {
    if (currency === 'IDR') {
      return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
    }
    return `$${Number(amount).toFixed(2)}`;
  };

  // Open Document Viewer in appropriate mode
  const handleOpenDocument = (inv: Invoice, preferredMode?: 'unpaid_statement' | 'payment_receipt') => {
    setSelectedInvoice(inv);
    if (preferredMode) {
      setDocViewMode(preferredMode);
    } else {
      setDocViewMode(inv.status === 'paid' ? 'payment_receipt' : 'unpaid_statement');
    }
  };

  // Open Manual Payment Proof Modal for a specific invoice
  const handleOpenManualProofModal = (inv?: Invoice) => {
    const target = inv || unpaidInvoicesList[0] || roleScopedInvoices[0] || null;
    const autoKw = `KW-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const autoRef = `REF-MANUAL-${Math.floor(100000 + Math.random() * 900000)}`;

    if (target) {
      setProofTargetInvoice(target);
      setProofSelectedInvoiceId(target.id);
      setProofReceiptNumber(target.receiptNumber || autoKw);
      setProofReference(target.paymentReference || autoRef);
      setProofPayerName(target.payerName || target.userName);
      setProofUserPhone(target.userPhone || '+62 812-2673-8883');
      setProofVerifiedBy(letterheadConfig.ownerName || currentUser.name);
      setProofPaymentMethod(target.paymentMethod || `Transfer ${letterheadConfig.bank1Name} (${letterheadConfig.bank1Number})`);
      setProofPaidDate(new Date().toISOString().slice(0, 16));
      setProofNotes(
        'Pembayaran manual telah diterima lunas dan diverifikasi. Bukti pembayaran resmi diterbitkan.'
      );
      setProofImageDataUrl(target.proofImageUrl || '');
    } else {
      // If no invoice exists yet, open Manual Invoice Creation with PAID status pre-selected
      setManualStatus('paid');
      setManualReceiptNumber(autoKw);
      setManualPaymentReference(autoRef);
      setIsManualModalOpen(true);
    }
  };

  const handleProofImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleIssueManualPaymentProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target =
      proofTargetInvoice || roleScopedInvoices.find(i => i.id === proofSelectedInvoiceId);
    if (!target) {
      showToast('error', 'Pilih Tagihan', 'Pilih tagihan invoice yang akan diterbitkan bukti pembayarannya.');
      return;
    }

    setIsProcessing(true);
    try {
      const updated = await CloudProApi.payInvoice(target.id, proofPaymentMethod, currentUser, {
        receiptNumber: proofReceiptNumber,
        paymentReference: proofReference,
        paymentNotes: proofNotes,
        paidAt: proofPaidDate ? new Date(proofPaidDate).toISOString() : new Date().toISOString(),
        payerName: proofPayerName,
        verifiedBy: proofVerifiedBy,
        userPhone: proofUserPhone,
        proofImageUrl: proofImageDataUrl || undefined,
        autoNotify: true,
      });

      refreshAll();
      setProofTargetInvoice(null);
      setIsStandaloneProofModalOpen(false);
      // Automatically open the newly generated Official Payment Receipt!
      setSelectedInvoice(updated);
      setDocViewMode('payment_receipt');

      if (letterheadConfig.autoOpenWhatsAppOnManual) {
        await handleSendWhatsAppDocument(updated, 'receipt', true);
      }

      showToast(
        'success',
        'Bukti Pembayaran Resmi Diterbitkan & Dikirim!',
        `Kwitansi ${updated.receiptNumber} (${updated.userName}) berhasil diterbitkan dengan Barcode TTD & dikirim ke WA (${updated.userPhone || 'terdaftar'}) serta Email.`
      );
    } catch (err: any) {
      showToast('error', 'Gagal Menerbitkan Bukti Bayar', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mark / Revert Invoice to UNPAID ("Fitur Unpaid")
  const handleMarkAsUnpaid = async (inv: Invoice) => {
    try {
      const updated = await CloudProApi.markInvoiceUnpaid(
        inv.id,
        currentUser,
        `Diterbitkan sebagai Bukti Tagihan UNPAID (Belum Dibayar) — Jatuh tempo ${new Date(inv.dueDate).toLocaleDateString('id-ID')}.`
      );
      refreshAll();
      if (selectedInvoice?.id === inv.id) {
        setSelectedInvoice(updated);
        setDocViewMode('unpaid_statement');
      }
      showToast(
        'warning',
        'Status Diubah ke UNPAID (Belum Bayar)',
        `Invoice ${inv.invoiceNumber} kini berstatus UNPAID dan Bukti Tagihan Unpaid siap diterbitkan.`
      );
    } catch (err: any) {
      showToast('error', 'Gagal Ubah ke Unpaid', err.message);
    }
  };

  const handlePayGateway = async () => {
    if (!payingInvoice) return;
    setIsProcessing(true);
    try {
      const updated = await CloudProApi.payInvoice(payingInvoice.id, paymentMethod, currentUser);
      showToast(
        'success',
        'Pembayaran Terverifikasi',
        `Invoice ${payingInvoice.invoiceNumber} berhasil dibayar (${updated.receiptNumber}).`
      );
      setPayingInvoice(null);
      refreshAll();
      setSelectedInvoice(updated);
      setDocViewMode('payment_receipt');
    } catch (err: any) {
      showToast('error', 'Pembayaran Gagal', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    try {
      await CloudProApi.deleteInvoice(inv.id, currentUser);
      showToast('info', 'Invoice Dihapus', `Invoice ${inv.invoiceNumber} telah dihapus dari sistem.`);
      if (selectedInvoice?.id === inv.id) setSelectedInvoice(null);
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Menghapus', err.message);
    }
  };

  const handleSendWhatsAppDocument = async (
    inv: Invoice,
    type: 'unpaid' | 'receipt',
    openWaWindow = true
  ) => {
    const res = await CloudProApi.dispatchBillingNotification(inv, type);
    refreshAll();
    if (selectedInvoice?.id === inv.id) {
      const latest = db.getInvoices().find(i => i.id === inv.id);
      if (latest) setSelectedInvoice(latest);
    }
    showToast(
      'success',
      type === 'receipt'
        ? 'Bukti Pembayaran (PAID) Dikirim ke WA & Email Terdaftar!'
        : 'Bukti Tagihan (UNPAID) Dikirim ke WA & Email Terdaftar!',
      `Terkirim ke nomor WhatsApp terdaftar (+${res.normalizedPhone}) dan email ${inv.userEmail || '-'}.`
    );
    if (openWaWindow) {
      window.open(res.whatsappDirectUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAddItemRow = () => {
    setManualItems(prev => [
      ...prev,
      {
        description: 'Layanan Tambahan / Addon',
        qty: 1,
        unitPrice: manualCurrency === 'IDR' ? 100000 : 10,
        amount: manualCurrency === 'IDR' ? 100000 : 10,
      },
    ]);
  };

  const handleUpdateItemRow = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setManualItems(prev =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'unitPrice') {
          const q = Number(field === 'qty' ? value : updated.qty) || 1;
          const p = Number(field === 'unitPrice' ? value : updated.unitPrice) || 0;
          updated.amount = Number((q * p).toFixed(2));
        }
        return updated;
      })
    );
  };

  const handleRemoveItemRow = (index: number) => {
    if (manualItems.length <= 1) return;
    setManualItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleApplyQuickPreset = (
    preset: 'hosting_idr' | 'domain_idr' | 'clone_idr' | 'vps_idr'
  ) => {
    setManualCurrency('IDR');
    if (preset === 'hosting_idr') {
      setManualItems([
        {
          description: 'Paket Cloud Hosting Pro NVMe SSD (1 Tahun)',
          qty: 1,
          unitPrice: 450000,
          amount: 450000,
        },
      ]);
    } else if (preset === 'domain_idr') {
      setManualItems([
        {
          description: 'Registrasi / Perpanjangan Domain .MY.ID / .ID (1 Tahun)',
          qty: 1,
          unitPrice: 55000,
          amount: 55000,
        },
      ]);
    } else if (preset === 'clone_idr') {
      setManualItems([
        {
          description: 'Jasa Setup & Kloning Website Aplikasi AI Studio / Full-Stack',
          qty: 1,
          unitPrice: 250000,
          amount: 250000,
        },
      ]);
    } else if (preset === 'vps_idr') {
      setManualItems([
        {
          description: 'Dedicated Cloud VPS KVM Linux (Bulanan)',
          qty: 1,
          unitPrice: 185000,
          amount: 185000,
        },
      ]);
    }
  };

  const handleCreateManualInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenAcc =
      accessibleAccounts.find(a => a.id === selectedAccountId) ||
      accounts.find(a => a.id === selectedAccountId);
    const finalName =
      clientMode === 'select'
        ? chosenAcc?.customerName || chosenAcc?.primaryDomain || currentUser.name
        : customClientName.trim() || 'Pelanggan Baru';
    const finalEmail =
      clientMode === 'select'
        ? chosenAcc?.customerEmail || `admin@${chosenAcc?.primaryDomain || 'klien.my.id'}`
        : customClientEmail.trim() || 'client@domain.my.id';
    const finalUserId =
      clientMode === 'select'
        ? chosenAcc?.customerId && chosenAcc.customerId !== currentUser.id
          ? chosenAcc.customerId
          : `cust-client-${chosenAcc?.id || Date.now()}`
        : `cust-manual-${Date.now()}`;

    const chosenCustomer = db
      .getUsers()
      .find(u => u.id === chosenAcc?.customerId || u.email === chosenAcc?.customerEmail);
    const finalPhone =
      customClientPhone.trim() ||
      chosenCustomer?.phone ||
      letterheadConfig.officialWhatsApp ||
      '+62 812-2673-8883';

    const validItems = manualItems.filter(i => i.description.trim() !== '');
    if (validItems.length === 0) {
      showToast('error', 'Item Kosong', 'Masukkan minimal 1 baris deskripsi layanan.');
      return;
    }

    setIsProcessing(true);
    try {
      const created = await CloudProApi.createManualInvoice(
        {
          invoiceNumber: manualInvoiceNumber,
          receiptNumber: manualReceiptNumber,
          userId: finalUserId,
          userName: finalName,
          userEmail: finalEmail,
          userPhone: finalPhone,
          resellerId: currentUser.role === 'reseller' ? currentUser.id : chosenAcc?.resellerId,
          items: validItems.map(it => ({
            description: it.description,
            qty: Number(it.qty) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            amount: Number(it.amount) || 0,
          })),
          currency: manualCurrency,
          status: manualStatus,
          dueDate: new Date(manualDueDate).toISOString(),
          paymentMethod: manualPaymentMethod,
          paymentReference: manualPaymentReference,
          payerName: manualPayerName || finalName,
          verifiedBy: letterheadConfig.ownerName || currentUser.name,
          paymentNotes: manualPaymentNotes,
          autoNotify: manualAutoNotifyWa,
        },
        currentUser
      );

      setIsManualModalOpen(false);
      setManualInvoiceNumber('');
      setManualReceiptNumber('');
      setManualPaymentReference('');
      setManualPaymentNotes('');
      refreshAll();

      // Open the generated document immediately so the user sees the Unpaid Statement or Paid Receipt!
      setSelectedInvoice(created);
      setDocViewMode(created.status === 'paid' ? 'payment_receipt' : 'unpaid_statement');

      if (letterheadConfig.autoOpenWhatsAppOnManual && manualAutoNotifyWa) {
        await handleSendWhatsAppDocument(
          created,
          created.status === 'paid' ? 'receipt' : 'unpaid',
          true
        );
      }

      showToast(
        'success',
        created.status === 'paid'
          ? 'Bukti Pembayaran Manual Diterbitkan & Dikirim ke WA/Email!'
          : 'Bukti Tagihan Unpaid Diterbitkan & Dikirim ke WA/Email!',
        `Nomor ${created.invoiceNumber} (${formatMoney(created.amount, created.currency)}) terkirim ke WA ${created.userPhone || 'terdaftar'} & Email.`
      );
    } catch (err: any) {
      showToast('error', 'Gagal Membuat Invoice', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Automated Billing Cycle (supports forceUnpaid = true to guarantee Unpaid Invoice generation!)
  const handleRunAutomatedBilling = async (forceUnpaidMode = true) => {
    setIsRunningAutoCycle(true);
    try {
      const now = new Date();
      const periodLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const res = await CloudProApi.runAutomatedBillingCycle(
        {
          billingPeriodLabel: periodLabel,
          dueDays: autoConfig.invoiceLeadDays || 7,
          currency: autoConfig.defaultCurrency,
          autoDeductWallet: forceUnpaidMode ? false : autoConfig.autoDeductWallet,
          autoSuspendOverdue: autoConfig.autoSuspendOverdue,
          idrRate: autoConfig.idrExchangeRate,
          forceUnpaid: forceUnpaidMode,
        },
        currentUser
      );
      const nextCfg = { ...autoConfig, lastRunAt: new Date().toISOString() };
      setAutoConfig(nextCfg);
      setFilterStatus('all');
      refreshAll();

      if (res.generatedInvoices.length > 0 && forceUnpaidMode) {
        // Show the first generated Unpaid Statement immediately so the user can verify it works!
        setSelectedInvoice(res.generatedInvoices[0]);
        setDocViewMode('unpaid_statement');
      }

      showToast(
        'success',
        forceUnpaidMode
          ? `Berhasil Menerbitkan ${res.generatedCount} Bukti Tagihan UNPAID Otomatis!`
          : 'Siklus Billing Otomatis Selesai!',
        forceUnpaidMode
          ? `${res.generatedCount} invoice UNPAID otomatis telah diterbitkan untuk akun aktif dan siap dikirim/dicetak.`
          : `Diterbitkan: ${res.generatedCount} invoice | Auto-Debit Lunas: ${res.autoPaidCount} | Auto-Suspend: ${res.suspendedCount}`
      );
    } catch (err: any) {
      showToast('error', 'Gagal Menjalankan Otomatisasi', err.message);
    } finally {
      setIsRunningAutoCycle(false);
    }
  };

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topupAmount <= 0) return;
    setIsProcessing(true);
    try {
      await CloudProApi.topupCredit(currentUser.id, topupAmount, currentUser);
      showToast(
        'success',
        'Deposit Berhasil Ditambahkan',
        `Saldo bertambah $${topupAmount.toFixed(2)}`
      );
      setIsTopupOpen(false);
      refreshAll();
    } catch (err: any) {
      showToast('error', 'Gagal Top-Up', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalManualPreview = manualItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ===================================================================== */}
      {/* RESELLER 2-FUNCTION BILLING SWITCHER (COMPACT 2-COLUMN BAR)            */}
      {/* ===================================================================== */}
      {isResellerRole && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              setResellerBillingMode('cloudpro_billing');
              setFilterStatus('all');
            }}
            className={`flex items-center gap-2.5 rounded-xl border p-2.5 sm:p-3.5 text-left transition-all cursor-pointer ${
              resellerBillingMode === 'cloudpro_billing'
                ? 'border-indigo-500 bg-indigo-50/80 shadow-2xs ring-1 ring-indigo-500/25 dark:border-indigo-500 dark:bg-indigo-950/40'
                : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
            }`}
          >
            <div
              className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${
                resellerBillingMode === 'cloudpro_billing'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Tagihan Induk
                </span>
                <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300">
                  {resellerCloudProInvoices.length}
                </span>
              </div>
              <h4 className="truncate text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Ke Cloud PRO
              </h4>
              <p className="hidden sm:block mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                Tagihan lisensi &amp; pembayaran Reseller ke Cloud PRO Enterprise
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setResellerBillingMode('client_billing');
              setFilterStatus('all');
            }}
            className={`flex items-center gap-2.5 rounded-xl border p-2.5 sm:p-3.5 text-left transition-all cursor-pointer ${
              resellerBillingMode === 'client_billing'
                ? 'border-teal-500 bg-teal-50/80 shadow-2xs ring-1 ring-teal-500/25 dark:border-teal-500 dark:bg-teal-950/40'
                : 'border-slate-200 bg-white hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
            }`}
          >
            <div
              className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${
                resellerBillingMode === 'client_billing'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Billing Klien
                </span>
                <span className="shrink-0 rounded bg-teal-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-teal-700 dark:bg-teal-900/70 dark:text-teal-300">
                  {resellerClientInvoices.length}
                </span>
              </div>
              <h4 className="truncate text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Tagihan Pelanggan
              </h4>
              <p className="hidden sm:block mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                Terbitkan invoice Unpaid &amp; bukti pembayaran untuk klien Anda
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Slim Top Header & Immediate Primary Actions (Terbitkan Bukti Pembayaran First on Mobile) */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-teal-500 shrink-0" />
              <h3 className="truncate text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {isCustomerRole
                  ? 'Tagihan & Bukti Pembayaran Hosting'
                  : isResellerRole && resellerBillingMode === 'cloudpro_billing'
                  ? 'Tagihan Lisensi Reseller — Cloud PRO'
                  : isResellerRole && resellerBillingMode === 'client_billing'
                  ? 'Billing & Kwitansi Klien Reseller'
                  : 'Billing, Invoice & Bukti Pembayaran'}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setIsTopupOpen(true)}
              className="lg:hidden inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shrink-0 cursor-pointer"
            >
              <Wallet className="h-3 w-3 text-teal-500" />
              <span className="font-mono">${(Number(currentUser.creditBalance) || 0).toFixed(2)}</span>
            </button>
          </div>
          <p className="hidden sm:block mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {isPayerView
              ? 'Bayar tagihan secara instan serta cetak PDF Bukti Tagihan (Unpaid) dan Bukti Pembayaran Resmi (Kwitansi Lunas).'
              : 'Terbitkan Bukti Pembayaran Resmi (Kwitansi Lunas) dan Bukti Tagihan Unpaid secara otomatis maupun manual.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
          {isClientBillingManagerView && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleOpenManualProofModal();
                  if (unpaidInvoicesList.length > 0 || activeScopedInvoices.length > 0) {
                    setIsStandaloneProofModalOpen(true);
                  }
                }}
                className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 sm:py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs cursor-pointer"
              >
                <FileCheck className="h-4 w-4 shrink-0" />
                <span>+ Terbitkan Bukti Pembayaran (Manual)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setManualStatus('unpaid');
                  setIsManualModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-2.5 sm:px-3.5 py-2 text-[11px] sm:text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-xs cursor-pointer"
              >
                <FileWarning className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">+ Tagihan Unpaid</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLetterheadModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-2.5 sm:px-3.5 py-2 text-[11px] sm:text-xs font-bold text-white hover:bg-sky-500 shadow-xs cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Kop &amp; Barcode TTD</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsTopupOpen(true)}
            className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <Wallet className="h-3.5 w-3.5 text-teal-500" />
            <span>Wallet (${(Number(currentUser.creditBalance) || 0).toFixed(2)})</span>
          </button>
        </div>
      </div>

      {/* Slim 3-Column Summary Strip (Fits 1 Row on Android & Desktop) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'unpaid' ? 'all' : 'unpaid')}
          className={`rounded-xl sm:rounded-2xl border p-2.5 sm:p-3.5 text-left transition-all cursor-pointer ${
            filterStatus === 'unpaid'
              ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500/30 dark:border-amber-500 dark:bg-amber-950/40'
              : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] sm:text-xs font-bold text-amber-800 dark:text-amber-300">
              Tagihan Unpaid
            </span>
            <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1">
            <span className="font-mono text-sm sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {unpaidInvoicesList.length} <span className="text-[10px] sm:text-xs font-normal text-slate-500">Inv</span>
            </span>
            <span className="hidden sm:inline text-[11px] font-bold text-amber-700 underline dark:text-amber-300">
              Filter &rarr;
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'paid' ? 'all' : 'paid')}
          className={`rounded-xl sm:rounded-2xl border p-2.5 sm:p-3.5 text-left transition-all cursor-pointer ${
            filterStatus === 'paid'
              ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30 dark:border-emerald-500 dark:bg-emerald-950/40'
              : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Bukti Bayar (Lunas)
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1">
            <span className="font-mono text-sm sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {paidInvoicesList.length} <span className="text-[10px] sm:text-xs font-normal text-slate-500">Kwt</span>
            </span>
            <span className="hidden sm:inline text-[11px] font-bold text-emerald-700 underline dark:text-emerald-300">
              Lihat &rarr;
            </span>
          </div>
        </button>

        <div className="rounded-xl sm:rounded-2xl border border-sky-200 bg-sky-50/50 p-2.5 sm:p-3.5 dark:border-sky-900/50 dark:bg-sky-950/20">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] sm:text-xs font-bold text-sky-800 dark:text-sky-300">
              {isResellerRole && resellerBillingMode === 'cloudpro_billing'
                ? 'Status Lisensi'
                : 'Akun vHost Aktif'}
            </span>
            <Zap className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-1">
            <span className="font-mono text-sm sm:text-xl font-bold text-slate-900 dark:text-white tabular-nums truncate">
              {isResellerRole && resellerBillingMode === 'cloudpro_billing'
                ? 'Aktif'
                : `${accessibleAccounts.length}`}
              {!(isResellerRole && resellerBillingMode === 'cloudpro_billing') && (
                <span className="text-[10px] sm:text-xs font-normal text-slate-500"> Akun</span>
              )}
            </span>
            <span className="hidden sm:inline font-mono text-[10px] font-bold text-sky-700 dark:text-sky-300">
              Auto-Billing
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* COMPACT AUTOMATED BILLING BAR WITH COLLAPSIBLE CONFIG (ADMIN/RESELLER) */}
      {/* ===================================================================== */}
      {isClientBillingManagerView && (
        <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/70 p-3 sm:p-4 text-white shadow-sm">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h4 className="truncate text-xs sm:text-sm font-bold text-white">
                  Siklus Tagihan Bulanan Otomatis ({accessibleAccounts.length} Akun)
                </h4>
                <p className="hidden sm:block text-[11px] text-slate-300 truncate">
                  Terbitkan invoice UNPAID berkala &amp; verifikasi kwitansi pembayaran resmi.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleRunAutomatedBilling(true)}
                disabled={isRunningAutoCycle}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3 py-2 text-[11px] sm:text-xs font-bold text-slate-950 hover:bg-amber-300 shadow-2xs cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isRunningAutoCycle ? 'animate-spin' : ''}`} />
                <span>
                  {isRunningAutoCycle ? 'Menerbitkan...' : 'Terbitkan Tagihan UNPAID Otomatis'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRunAutomatedBilling(false)}
                disabled={isRunningAutoCycle}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-sky-500/40 bg-sky-500/10 px-2.5 py-2 text-[11px] font-bold text-sky-300 hover:bg-sky-500/20 cursor-pointer disabled:opacity-60"
                title="Jalankan siklus dengan opsi Auto-Debit Wallet"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Auto-Debit</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAutoConfigDetails(prev => !prev)}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800/90 px-2.5 py-2 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                <span>{showAutoConfigDetails ? 'Tutup Opsi' : 'Opsi Siklus'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Automation Toggles & Payment Instruction Config */}
          {showAutoConfigDetails && (
            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <label className="flex items-start justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 cursor-pointer hover:border-slate-700">
                <div>
                  <div className="font-bold text-slate-100">Cron Tagihan Unpaid</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Terbitkan otomatis H-{autoConfig.invoiceLeadDays} jatuh tempo
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoConfig.autoGenerateMonthly}
                  onChange={e =>
                    setAutoConfig(prev => ({ ...prev, autoGenerateMonthly: e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 accent-amber-400"
                />
              </label>

              <label className="flex items-start justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 cursor-pointer hover:border-slate-700">
                <div>
                  <div className="font-bold text-slate-100">Verifikasi Manual</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Tahan potong saldo sebelum bukti dicek
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!autoConfig.autoDeductWallet}
                  onChange={e =>
                    setAutoConfig(prev => ({ ...prev, autoDeductWallet: !e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 accent-amber-400"
                />
              </label>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100">Mata Uang</span>
                  <select
                    value={autoConfig.defaultCurrency}
                    onChange={e =>
                      setAutoConfig(prev => ({
                        ...prev,
                        defaultCurrency: e.target.value as 'IDR' | 'USD',
                      }))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[11px] font-bold text-amber-300 focus:outline-none"
                  >
                    <option value="IDR">IDR (Rupiah)</option>
                    <option value="USD">USD ($ Dollar)</option>
                  </select>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {autoConfig.lastRunAt
                    ? `Terakhir: ${new Date(autoConfig.lastRunAt).toLocaleTimeString('id-ID')}`
                    : 'Siap menerbitkan tagihan berkala'}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <label className="block font-bold text-slate-100 text-[11px] mb-1">
                  Rekening / QRIS pada Bukti Unpaid:
                </label>
                <input
                  type="text"
                  value={autoConfig.bankAccountInfo}
                  onChange={e =>
                    setAutoConfig(prev => ({ ...prev, bankAccountInfo: e.target.value }))
                  }
                  placeholder="Contoh: BCA 123456789 a.n ..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-200 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* INVOICES TABLE WITH UNPAID & MANUAL RECEIPT ACTIONS                   */}
      {/* ===================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden w-full max-w-full">
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-teal-500 shrink-0" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {isCustomerRole
                ? `Daftar Tagihan & Bukti Pembayaran (${userInvoices.length})`
                : isResellerRole && resellerBillingMode === 'cloudpro_billing'
                ? `Tagihan & Pembayaran ke Cloud PRO (${userInvoices.length})`
                : `Daftar Invoice & Bukti Pembayaran Klien (${userInvoices.length})`}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 'unpaid', 'paid', 'overdue'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`rounded-lg px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                  filterStatus === st
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {st === 'all'
                  ? `Semua (${activeScopedInvoices.length})`
                  : st === 'unpaid'
                  ? `UNPAID (${activeScopedInvoices.filter(i => i.status === 'unpaid').length})`
                  : st === 'paid'
                  ? `LUNAS (${activeScopedInvoices.filter(i => i.status === 'paid').length})`
                  : `Overdue (${activeScopedInvoices.filter(i => i.status === 'overdue').length})`}
              </button>
            ))}
          </div>
        </div>

        {/* MOBILE / ANDROID COMPACT INVOICE CARDS (No horizontal scroll or pull-up required!) */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
          {userInvoices.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400">
              Belum ada catatan tagihan pada filter ini.
            </div>
          ) : (
            userInvoices.map(inv => (
              <div key={inv.id} className="p-3 space-y-2.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {inv.invoiceNumber}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : inv.status === 'overdue'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {inv.status === 'paid' ? 'LUNAS (PAID)' : inv.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {inv.userName}
                    </div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {(Array.isArray(inv.items) && inv.items[0]?.description) ||
                        inv.description ||
                        'Perpanjangan Layanan Hosting'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatMoney(inv.amount, inv.currency)}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      Tempo: {new Date(inv.dueDate).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Direct Mobile Action Buttons — Terbitkan Bukti Pembayaran immediately visible */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {isPayerView ? (
                    inv.status !== 'paid' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setPayingInvoice(inv)}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-teal-500 shadow-2xs cursor-pointer"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Bayar Sekarang</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDocument(inv, 'unpaid_statement')}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-2.5 py-2 text-[11px] font-bold text-amber-800 dark:text-amber-300 cursor-pointer"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Bukti Tagihan</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenDocument(inv, 'payment_receipt')}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-500 shadow-2xs cursor-pointer"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Cetak Bukti Pembayaran</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDocument(inv, 'unpaid_statement')}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Invoice</span>
                        </button>
                      </>
                    )
                  ) : inv.status !== 'paid' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenManualProofModal(inv);
                          setIsStandaloneProofModalOpen(true);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-500 shadow-2xs cursor-pointer"
                      >
                        <FileCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>Terbitkan Bukti Pembayaran</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDocument(inv, 'unpaid_statement')}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-2.5 py-2 text-[11px] font-bold text-amber-800 dark:text-amber-300 cursor-pointer"
                      >
                        <FileWarning className="h-3.5 w-3.5" />
                        <span>Unpaid</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppDocument(inv, 'unpaid')}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400 cursor-pointer"
                        title="Kirim WA"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteInvoice(inv)}
                        className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-500 dark:border-rose-900 dark:bg-rose-950/40 cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenDocument(inv, 'payment_receipt')}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-500 shadow-2xs cursor-pointer"
                      >
                        <FileCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>Lihat / Cetak Bukti Pembayaran</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMarkAsUnpaid(inv)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-400/50 bg-amber-50 px-2.5 py-2 text-[11px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Unpaid</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppDocument(inv, 'receipt')}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400 cursor-pointer"
                        title="Kirim Kwitansi ke WA"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP / TABLET FULL TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[820px]">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider dark:bg-slate-800/60 dark:text-slate-400 font-sans">
              <tr>
                <th className="px-4 py-3">No. Invoice / Kwitansi</th>
                <th className="px-4 py-3">
                  {isResellerRole && resellerBillingMode === 'cloudpro_billing'
                    ? 'Ditagihkan Kepada (Reseller)'
                    : 'Pelanggan / Akun'}
                </th>
                <th className="px-4 py-3">Rincian Layanan</th>
                <th className="px-4 py-3">Jatuh Tempo</th>
                <th className="px-4 py-3">Total Nominal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">
                  {isPayerView ? 'Bayar & Cetak Bukti' : 'Aksi Bukti Unpaid & Bukti Bayar'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {userInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-sans">
                    {isPayerView ? (
                      <>Belum ada tagihan pada filter status ini.</>
                    ) : (
                      <>
                        Tidak ada catatan invoice klien pada filter ini. Klik{' '}
                        <strong>Terbitkan Bukti Tagihan UNPAID Otomatis</strong> atau{' '}
                        <strong>+ Buat Tagihan Unpaid (Manual)</strong> di atas.
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                userInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {inv.invoiceNumber}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 font-sans">
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                            isPayerView || inv.billingSource === 'automated'
                              ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          }`}
                        >
                          {isResellerRole && resellerBillingMode === 'cloudpro_billing'
                            ? 'Tagihan Cloud PRO Enterprise'
                            : isCustomerRole || inv.billingSource === 'automated'
                            ? 'Tagihan Otomatis'
                            : 'Manual'}
                        </span>
                        {inv.receiptNumber && inv.status === 'paid' && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {inv.receiptNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-sans">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {inv.userName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{inv.userEmail}</div>
                      {inv.userPhone && (
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                          <Phone className="h-2.5 w-2.5" />
                          <span>{inv.userPhone}</span>
                          {inv.whatsappSentAt && (
                            <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] font-bold">
                              WA+Email Terkirim
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 font-sans text-slate-600 dark:text-slate-300 max-w-xs">
                      <div className="truncate font-medium">
                        {(Array.isArray(inv.items) && inv.items[0]?.description) ||
                          inv.description ||
                          'Perpanjangan Hosting'}
                      </div>
                      {Array.isArray(inv.items) && inv.items.length > 1 && (
                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                          +{inv.items.length - 1} item lainnya
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-slate-500">
                      {new Date(inv.dueDate).toLocaleDateString('id-ID')}
                    </td>

                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      {formatMoney(inv.amount, inv.currency)}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                            : inv.status === 'overdue'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {inv.status === 'paid' ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>PAID (LUNAS)</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>{inv.status.toUpperCase()}</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right font-sans">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {isPayerView ? (
                          inv.status !== 'paid' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setPayingInvoice(inv)}
                                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-teal-500 shadow-2xs cursor-pointer"
                                title="Bayar Tagihan Sekarang"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                <span>Bayar Sekarang</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDocument(inv, 'unpaid_statement')}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-500/20 dark:text-amber-300 cursor-pointer"
                                title="Lihat & Cetak Bukti Tagihan"
                              >
                                <Printer className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Cetak Bukti Tagihan</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenDocument(inv, 'payment_receipt')}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-500/20 dark:text-emerald-300 cursor-pointer"
                                title="Lihat & Cetak Bukti Pembayaran (Kwitansi Lunas)"
                              >
                                <Printer className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Cetak Bukti Pembayaran</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDocument(inv, 'unpaid_statement')}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                                title="Lihat & Cetak Bukti Tagihan"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Bukti Tagihan</span>
                              </button>
                            </>
                          )
                        ) : (
                          <>
                            {/* Admin / Reseller Controls */}
                            {inv.status !== 'paid' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPayingInvoice(inv)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-teal-500 shadow-2xs cursor-pointer"
                                  title="Bayar via Payment Gateway / Wallet"
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                  <span>Bayar</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenDocument(inv, 'unpaid_statement')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-500/20 dark:text-amber-300 cursor-pointer"
                                  title="Lihat & Cetak Bukti Tagihan Unpaid"
                                >
                                  <FileWarning className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  <span>Bukti Unpaid</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenManualProofModal(inv);
                                    setIsStandaloneProofModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 shadow-2xs cursor-pointer"
                                  title="Input Manual & Terbitkan Bukti Pembayaran Lunas"
                                >
                                  <FileCheck className="h-3.5 w-3.5" />
                                  <span>Terbitkan Bukti Bayar</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppDocument(inv, 'unpaid')}
                                  className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 cursor-pointer"
                                  title="Kirim Bukti Tagihan Unpaid via WhatsApp"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDocument(inv, 'payment_receipt')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-500/20 dark:text-emerald-300 cursor-pointer"
                                  title="Lihat & Cetak Bukti Pembayaran Resmi (Kwitansi Lunas)"
                                >
                                  <FileCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>Bukti Pembayaran</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleMarkAsUnpaid(inv)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 cursor-pointer"
                                  title="Kembalikan Status ke UNPAID (Belum Dibayar)"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Set Unpaid</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppDocument(inv, 'receipt')}
                                  className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 cursor-pointer"
                                  title="Kirim Bukti Pembayaran Lunas via WhatsApp"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteInvoice(inv)}
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Hapus Invoice"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
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

      {/* ===================================================================== */}
      {/* MODAL 1: MENERBITKAN BUKTI PEMBAYARAN (RATA ATAS & CUSTOM DROPDOWN)   */}
      {/* ===================================================================== */}
      {isStandaloneProofModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/65 backdrop-blur-xs p-2 pt-2.5 sm:p-4 sm:pt-6">
            <div className="w-full max-w-xl max-h-[95dvh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5 sm:px-5 sm:py-3 shrink-0 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Terbitkan Bukti Pembayaran Resmi
                    </h3>
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      Verifikasi pembayaran manual &amp; terbitkan Kwitansi Lunas resmi.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsStandaloneProofModalOpen(false);
                    setIsProofInvoiceDropdownOpen(false);
                    setIsProofMethodDropdownOpen(false);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleIssueManualPaymentProofSubmit} className="flex flex-col flex-1 min-h-0 text-xs">
                <div className="flex-1 overflow-y-auto px-3.5 py-2.5 sm:px-5 sm:py-3.5 space-y-2">
                  {/* 1. ELEGANT SLIM CUSTOM DROPDOWN FOR INVOICE SELECTION */}
                  <div className="relative">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                      Pilih Tagihan Invoice yang Dibayar:
                    </label>
                    {(() => {
                      const activeInv =
                        roleScopedInvoices.find(i => i.id === proofSelectedInvoiceId) ||
                        proofTargetInvoice ||
                        roleScopedInvoices[0];
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsProofInvoiceDropdownOpen(prev => !prev);
                              setIsProofMethodDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-left transition-all hover:border-teal-500 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                          >
                            {activeInv ? (
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                                    activeInv.status === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                                  }`}
                                >
                                  {activeInv.status.toUpperCase()}
                                </span>
                                <span className="shrink-0 font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                                  {activeInv.invoiceNumber}
                                </span>
                                <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                  — {activeInv.userName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Pilih tagihan...</span>
                            )}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {activeInv && (
                                <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                  {formatMoney(activeInv.amount, activeInv.currency)}
                                </span>
                              )}
                              <ChevronDown
                                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                                  isProofInvoiceDropdownOpen ? 'rotate-180 text-teal-600' : ''
                                }`}
                              />
                            </div>
                          </button>

                          {isProofInvoiceDropdownOpen && (
                            <div className="mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:divide-slate-700/60">
                              {roleScopedInvoices.map(inv => {
                                const isSelected = inv.id === (activeInv?.id || proofSelectedInvoiceId);
                                return (
                                  <button
                                    key={inv.id}
                                    type="button"
                                    onClick={() => {
                                      setProofSelectedInvoiceId(inv.id);
                                      setProofTargetInvoice(inv);
                                      setProofPayerName(inv.payerName || inv.userName);
                                      setIsProofInvoiceDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-teal-50/70 dark:bg-teal-950/40'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span
                                            className={`shrink-0 rounded px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase ${
                                              inv.status === 'paid'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                                            }`}
                                          >
                                            {inv.status.toUpperCase()}
                                          </span>
                                          <span className="truncate font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                                            {inv.invoiceNumber}
                                          </span>
                                        </div>
                                        <span className="shrink-0 font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                          {formatMoney(inv.amount, inv.currency)}
                                        </span>
                                      </div>
                                      <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                        {inv.userName}
                                      </div>
                                    </div>

                                    <div
                                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                        isSelected
                                          ? 'border-teal-600 bg-teal-600 text-white'
                                          : 'border-slate-300 dark:border-slate-600'
                                      }`}
                                    >
                                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* 2 & 3. Nomor Kwitansi & Kode Referensi Mutasi Bank */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                        Nomor Kwitansi / Bukti:
                      </label>
                      <input
                        type="text"
                        required
                        value={proofReceiptNumber}
                        onChange={e => setProofReceiptNumber(e.target.value)}
                        placeholder="KW-202609-1001"
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-[11px] font-bold text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                        Kode Referensi / Mutasi:
                      </label>
                      <input
                        type="text"
                        required
                        value={proofReference}
                        onChange={e => setProofReference(e.target.value)}
                        placeholder="REF-BCA-882910"
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* 4 & 5. Metode Pembayaran Manual & Tanggal Waktu Pembayaran */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                        Metode Pembayaran Manual:
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProofMethodDropdownOpen(prev => !prev);
                          setIsProofInvoiceDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                      >
                        <span className="truncate">{proofPaymentMethod}</span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </button>
                      {isProofMethodDropdownOpen && (
                        <div className="absolute left-0 right-0 z-20 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:divide-slate-700/60">
                          {[
                            `Transfer ${letterheadConfig.bank1Name} (${letterheadConfig.bank1Number})`,
                            'Transfer Bank BCA (Verifikasi Manual)',
                            'Transfer Bank Mandiri / BRI / BNI / BSI',
                            'QRIS Manual / E-Wallet (Dana, OVO, GoPay)',
                            'Pembayaran Tunai / Cash langsung ke Admin',
                          ].map(methodOpt => {
                            const isChosen = proofPaymentMethod === methodOpt;
                            return (
                              <button
                                key={methodOpt}
                                type="button"
                                onClick={() => {
                                  setProofPaymentMethod(methodOpt);
                                  setIsProofMethodDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[11px] transition-colors cursor-pointer ${
                                  isChosen
                                    ? 'bg-teal-50/80 font-bold text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40'
                                }`}
                              >
                                <span className="truncate">{methodOpt}</span>
                                {isChosen && <Check className="h-3.5 w-3.5 shrink-0 text-teal-600" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                        Tanggal &amp; Waktu Bayar:
                      </label>
                      <input
                        type="datetime-local"
                        value={proofPaidDate}
                        onChange={e => setProofPaidDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* 6, 7 & 8. Diterima Dari, No. WhatsApp & Penerima Barcode TTD */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                        Diterima Dari (Penyetor):
                      </label>
                      <input
                        type="text"
                        required
                        value={proofPayerName}
                        onChange={e => setProofPayerName(e.target.value)}
                        placeholder="Nama pengirim"
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                        No. WhatsApp (Kirim Otomatis):
                      </label>
                      <input
                        type="text"
                        required
                        value={proofUserPhone}
                        onChange={e => setProofUserPhone(e.target.value)}
                        placeholder="+62 812-..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-[11px] text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                        Penerima &amp; Barcode TTD Pemilik Server:
                      </label>
                      <input
                        type="text"
                        required
                        value={proofVerifiedBy}
                        onChange={e => setProofVerifiedBy(e.target.value)}
                        placeholder="Nama Pemilik Server"
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* 9. Catatan / Keterangan pada Bukti Pembayaran (Label Utuh & Jelas) */}
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-[11px]">
                      Catatan / Keterangan pada Bukti Pembayaran:
                    </label>
                    <input
                      type="text"
                      value={proofNotes}
                      onChange={e => setProofNotes(e.target.value)}
                      placeholder="Catatan resmi pada kwitansi pembayaran..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* 10. Lampirkan Foto Struk / Bukti Transfer (Opsional) — Tampil Utuh & Tidak Tertutup Tombol */}
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-[11px] text-slate-700 dark:text-slate-200">
                          Lampirkan Foto Struk / Bukti Transfer (Opsional)
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          Jika dilampirkan, foto struk ikut tampil di Bukti Pembayaran Resmi.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => proofFileInputRef.current?.click()}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 shrink-0" />
                        <span>{proofImageDataUrl ? 'Ganti Gambar' : 'Pilih Gambar'}</span>
                      </button>
                      <input
                        ref={proofFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProofImageUpload}
                        className="hidden"
                      />
                    </div>

                    {proofImageDataUrl && (
                      <div className="mt-2 flex items-center gap-3">
                        <img
                          src={proofImageDataUrl}
                          alt="Bukti Transfer"
                          className="h-10 w-16 rounded object-cover border border-slate-300"
                        />
                        <span className="text-[10px] text-slate-600 dark:text-slate-300 flex-1 truncate">
                          Foto struk siap dilampirkan di kwitansi
                        </span>
                        <button
                          type="button"
                          onClick={() => setProofImageDataUrl('')}
                          className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          Hapus Lampiran
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Bar — Non-overlapping flex footer so field #9 & #10 are never covered */}
                <div className="shrink-0 flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-3.5 py-2.5 sm:px-5 sm:py-3 dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setIsStandaloneProofModalOpen(false)}
                    className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs cursor-pointer"
                  >
                    <FileCheck className="h-4 w-4 shrink-0" />
                    <span>
                      {isProcessing ? 'Menerbitkan...' : 'Terbitkan Bukti Pembayaran Sekarang'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ===================================================================== */}
      {/* MODAL 2: INPUT / BUAT INVOICE MANUAL (RATA ATAS & CUSTOM DROPDOWN)    */}
      {/* ===================================================================== */}
      {isManualModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/65 backdrop-blur-xs p-2.5 pt-3 sm:p-4 sm:pt-6">
            <div className="w-full max-w-2xl max-h-[93dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Penerbitan Dokumen Invoice &amp; Kwitansi
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Terbitkan Bukti Tagihan <strong>UNPAID (Belum Bayar)</strong> atau langsung terbitkan dengan <strong>Bukti Pembayaran (PAID)</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualModalOpen(false);
                    setIsManualAccountDropdownOpen(false);
                    setIsManualDocTypeDropdownOpen(false);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateManualInvoiceSubmit} className="mt-3 space-y-3 text-xs">
                {/* Client Selector Mode */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setClientMode('select')}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-bold cursor-pointer ${
                      clientMode === 'select'
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Pilih dari Akun Hosting Terdaftar ({accessibleAccounts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientMode('custom')}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-bold cursor-pointer ${
                      clientMode === 'custom'
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Ketik Nama Klien Manual (Bebas)
                  </button>
                </div>

                {clientMode === 'select' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2 relative">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        Pilih Akun Hosting / Pelanggan Tujuan:
                      </label>
                      {(() => {
                        const activeAcc =
                          accessibleAccounts.find(a => a.id === selectedAccountId) ||
                          accessibleAccounts[0];
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setIsManualAccountDropdownOpen(prev => !prev);
                                setIsManualDocTypeDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                            >
                              {activeAcc ? (
                                <span className="truncate font-medium">
                                  <strong className="font-mono text-teal-700 dark:text-teal-300">
                                    {activeAcc.primaryDomain}
                                  </strong>{' '}
                                  — {activeAcc.customerName || activeAcc.username}
                                </span>
                              ) : (
                                <span className="text-slate-400">Pilih akun...</span>
                              )}
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            </button>
                            {isManualAccountDropdownOpen && (
                              <div className="mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:divide-slate-700/60">
                                {accessibleAccounts.map(acc => {
                                  const isChosen = acc.id === (activeAcc?.id || selectedAccountId);
                                  return (
                                    <button
                                      key={acc.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedAccountId(acc.id);
                                        setIsManualAccountDropdownOpen(false);
                                      }}
                                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[11px] transition-colors cursor-pointer ${
                                        isChosen
                                          ? 'bg-teal-50/70 dark:bg-teal-950/40'
                                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                                      }`}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="font-mono font-bold text-slate-900 dark:text-white truncate">
                                          {acc.primaryDomain}
                                        </div>
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                          {acc.customerName || acc.username} ({acc.customerEmail || 'Aktif'})
                                        </div>
                                      </div>
                                      <div
                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                          isChosen
                                            ? 'border-teal-600 bg-teal-600 text-white'
                                            : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                      >
                                        {isChosen && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        No. WhatsApp Terdaftar:
                      </label>
                      <input
                        type="text"
                        value={customClientPhone}
                        onChange={e => setCustomClientPhone(e.target.value)}
                        placeholder="+62 812-2673-8883"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-[11px] text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        Nama Pelanggan / Instansi:
                      </label>
                      <input
                        type="text"
                        required
                        value={customClientName}
                        onChange={e => setCustomClientName(e.target.value)}
                        placeholder="Contoh: Yayasan Madrasah / Bpk. Ahmad"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        Email Pelanggan:
                      </label>
                      <input
                        type="email"
                        value={customClientEmail}
                        onChange={e => setCustomClientEmail(e.target.value)}
                        placeholder="admin@domainklien.my.id"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                        No. WhatsApp Terdaftar:
                      </label>
                      <input
                        type="text"
                        value={customClientPhone}
                        onChange={e => setCustomClientPhone(e.target.value)}
                        placeholder="+62 812-..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-[11px] text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualAutoNotifyWa}
                      onChange={e => setManualAutoNotifyWa(e.target.checked)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200">
                      Kirim Otomatis Tagihan/Kwitansi ke WA &amp; Email Terdaftar Saat Diterbitkan
                    </span>
                  </label>
                </div>

                {/* Invoice Metadata Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      No. Invoice (Opsional):
                    </label>
                    <input
                      type="text"
                      value={manualInvoiceNumber}
                      onChange={e => setManualInvoiceNumber(e.target.value)}
                      placeholder="Otomatis INV-..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      Mata Uang:
                    </label>
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-300 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                      {(['IDR', 'USD'] as const).map(curr => (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => setManualCurrency(curr)}
                          className={`rounded-lg py-1 font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                            manualCurrency === curr
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      Jatuh Tempo:
                    </label>
                    <input
                      type="date"
                      value={manualDueDate}
                      onChange={e => setManualDueDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="relative">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      Jenis Dokumen:
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsManualDocTypeDropdownOpen(prev => !prev)}
                      className="w-full flex items-center justify-between gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-[11px] font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                    >
                      <span className="truncate">
                        {manualStatus === 'paid'
                          ? 'PAID (Kwitansi Lunas)'
                          : manualStatus === 'overdue'
                          ? 'OVERDUE (Jatuh Tempo)'
                          : 'UNPAID (Tagihan)'}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </button>
                    {isManualDocTypeDropdownOpen && (
                      <div className="absolute right-0 left-0 z-20 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100 dark:border-slate-700 dark:bg-slate-800">
                        {[
                          { val: 'unpaid', label: 'UNPAID (Tagihan Belum Bayar)' },
                          { val: 'paid', label: 'PAID (Sekaligus Kwitansi Lunas)' },
                          { val: 'overdue', label: 'OVERDUE (Lewat Jatuh Tempo)' },
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => {
                              setManualStatus(opt.val as 'unpaid' | 'paid' | 'overdue');
                              setIsManualDocTypeDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-[11px] font-semibold cursor-pointer ${
                              manualStatus === opt.val
                                ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Extra fields if PAID is chosen during creation */}
                {manualStatus === 'paid' && (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-3 space-y-2.5 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-[11px]">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      <span>Detail Bukti Pembayaran (Kwitansi Lunas Manual)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                          Metode Bayar:
                        </label>
                        <input
                          type="text"
                          value={manualPaymentMethod}
                          onChange={e => setManualPaymentMethod(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                          No. Referensi / Mutasi:
                        </label>
                        <input
                          type="text"
                          value={manualPaymentReference}
                          onChange={e => setManualPaymentReference(e.target.value)}
                          placeholder="Otomatis REF-..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-[11px] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                          Nama Penyetor:
                        </label>
                        <input
                          type="text"
                          value={manualPayerName}
                          onChange={e => setManualPayerName(e.target.value)}
                          placeholder="Sesuai nama pelanggan"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Preset Buttons */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    Template Cepat Layanan (1-Klik Isi Otomatis):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyQuickPreset('hosting_idr')}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      Hosting Pro 1 Thn (Rp 450rb)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyQuickPreset('domain_idr')}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      Domain .MY.ID / .ID (Rp 55rb)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyQuickPreset('clone_idr')}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      Jasa Setup Web (Rp 250rb)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyQuickPreset('vps_idr')}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      Cloud VPS (Rp 185rb)
                    </button>
                  </div>
                </div>

                {/* Line Items Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                      Rincian Item Tagihan:
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 cursor-pointer"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Tambah Item</span>
                    </button>
                  </div>

                  {manualItems.map((it, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-1.5 items-center rounded-xl border border-slate-200 p-2 dark:border-slate-800"
                    >
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          value={it.description}
                          onChange={e => handleUpdateItemRow(idx, 'description', e.target.value)}
                          placeholder="Deskripsi layanan..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={e => handleUpdateItemRow(idx, 'qty', Number(e.target.value))}
                          placeholder="Qty"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={it.unitPrice}
                          onChange={e =>
                            handleUpdateItemRow(idx, 'unitPrice', Number(e.target.value))
                          }
                          placeholder="Harga"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          disabled={manualItems.length <= 1}
                          className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Preview */}
                <div className="flex items-center justify-between rounded-xl bg-slate-900 px-3.5 py-2.5 text-white">
                  <span className="text-xs font-semibold text-slate-300">Total Tagihan Invoice:</span>
                  <span className="font-mono text-sm sm:text-base font-bold text-emerald-400">
                    {formatMoney(totalManualPreview, manualCurrency)}
                  </span>
                </div>

                <div className="sticky bottom-0 z-10 -mx-4 -mb-4 sm:mx-0 sm:mb-0 flex justify-end gap-2 border-t border-slate-100 bg-white/95 px-4 py-2.5 sm:px-0 sm:pb-0 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(false)}
                    className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 sm:flex-initial rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 shadow-xs cursor-pointer"
                  >
                    {isProcessing
                      ? 'Menyimpan...'
                      : manualStatus === 'paid'
                      ? 'Terbitkan Invoice & Bukti Bayar Lunas'
                      : 'Terbitkan Bukti Tagihan UNPAID'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ===================================================================== */}
      {/* MODAL 3: CETAK BUKTI TAGIHAN (UNPAID) & BUKTI PEMBAYARAN (RATA ATAS)  */}
      {/* ===================================================================== */}
      {selectedInvoice &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/65 backdrop-blur-xs p-2.5 pt-3 sm:p-4 sm:pt-6 no-print">
            <div className="w-full max-w-3xl max-h-[93dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              {/* Document Mode Switcher Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDocViewMode('unpaid_statement')}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer ${
                      docViewMode === 'unpaid_statement'
                        ? 'bg-amber-500 text-slate-950 shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <FileWarning className="h-3.5 w-3.5" />
                    <span>Bukti Tagihan (UNPAID)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocViewMode('payment_receipt')}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer ${
                      docViewMode === 'payment_receipt'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <FileCheck className="h-3.5 w-3.5" />
                    <span>Bukti Pembayaran (KWITANSI)</span>
                  </button>

                  {isManagerRole && (
                    <button
                      type="button"
                      onClick={() => setIsLetterheadModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded-xl border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-bold text-sky-700 hover:bg-sky-500/20 dark:text-sky-300 cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>Kop &amp; TTD</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* OFFICIAL 1-PAGE COMPACT DOCUMENT SHEET WITH LETTERHEAD & BARCODE SIGNATURE */}
              <InvoiceDocumentSheet
                invoice={selectedInvoice}
                mode={docViewMode}
                letterhead={letterheadConfig}
                formatMoney={formatMoney}
              />

              {/* Sticky Footer Action Buttons inside Document Viewer — Immediately visible on Android without pulling up */}
              <div className="sticky bottom-0 z-10 -mx-3.5 -mb-3.5 sm:mx-0 sm:mb-0 mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white/95 px-3.5 py-2.5 sm:px-0 sm:pb-0 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
                <div className="flex flex-wrap items-center gap-1.5">
                  {isCustomerRole ? (
                    selectedInvoice.status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => {
                          const inv = selectedInvoice;
                          setSelectedInvoice(null);
                          setPayingInvoice(inv);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-500 cursor-pointer shadow-xs"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Bayar Tagihan Ini Sekarang</span>
                      </button>
                    )
                  ) : selectedInvoice.status !== 'paid' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const inv = selectedInvoice;
                        setSelectedInvoice(null);
                        handleOpenManualProofModal(inv);
                        setIsStandaloneProofModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] sm:text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer"
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      <span>Terbitkan Bukti Pembayaran (Manual)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleMarkAsUnpaid(selectedInvoice)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500 bg-amber-50 px-3 py-2 text-[11px] sm:text-xs font-bold text-amber-800 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Set UNPAID</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {isManagerRole && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSendWhatsAppDocument(
                          selectedInvoice,
                          docViewMode === 'payment_receipt' ? 'receipt' : 'unpaid',
                          true
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] sm:text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Kirim WA</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      document.body.classList.add('has-print-document');
                      window.print();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-[11px] sm:text-xs font-bold text-white hover:bg-sky-500 shadow-xs cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Cetak / PDF (1 Lembar A4)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="rounded-xl bg-slate-900 px-3.5 py-2 text-[11px] sm:text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-700 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Dedicated 1-Page A4 Print Portal (Only visible during print, completely hides #root) */}
      <PrintPortalContainer
        invoice={selectedInvoice}
        mode={docViewMode}
        letterhead={letterheadConfig}
        formatMoney={formatMoney}
      />

      {/* Official Cloud PRO Letterhead, Owner, Bank Account & Barcode Signature Configuration Modal */}
      <LetterheadConfigModal
        isOpen={isLetterheadModalOpen}
        onClose={() => setIsLetterheadModalOpen(false)}
        config={letterheadConfig}
        onSave={handleSaveLetterheadConfig}
      />

      {/* Topup Deposit Modal (Rata Atas via Portal) */}
      {isTopupOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/65 backdrop-blur-xs p-3 pt-4 sm:p-4 sm:pt-8">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Top-Up Saldo Deposit Wallet
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Saldo ini dapat digunakan untuk pembayaran instan maupun cadangan deposit akun.
              </p>
              <form onSubmit={handleTopupSubmit} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nominal Top-Up (USD):
                  </label>
                  <input
                    type="number"
                    min={5}
                    step="any"
                    value={topupAmount}
                    onChange={e => setTopupAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTopupOpen(false)}
                    className="rounded-xl border px-3.5 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 cursor-pointer"
                  >
                    Tambah Saldo +${topupAmount}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Pay Invoice Gateway Modal (Rata Atas via Portal) */}
      {payingInvoice &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/65 backdrop-blur-xs p-3 pt-4 sm:p-4 sm:pt-8">
            <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Konfirmasi &amp; Pelunasan Tagihan
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Invoice <strong>{payingInvoice.invoiceNumber}</strong> sejumlah{' '}
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(payingInvoice.amount, payingInvoice.currency)}
                </span>
              </p>

              <div className="mt-3.5 space-y-2 text-xs">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Gateway / Metode Pembayaran:
                </label>

                {[
                  'Midtrans (BCA / Mandiri / BNI Virtual Account)',
                  'Xendit QRIS Realtime Instant Payment',
                  'Transfer Bank Manual (Verifikasi Instan)',
                  'Stripe (Kartu Kredit / Debit Visa & MasterCard)',
                  'Saldo Deposit Wallet (Instant Deduction)',
                ].map(opt => (
                  <div
                    key={opt}
                    onClick={() => setPaymentMethod(opt)}
                    className={`cursor-pointer rounded-xl border p-2.5 text-[11px] transition-colors ${
                      paymentMethod === opt
                        ? 'border-teal-500 bg-teal-50/50 dark:border-teal-500 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  className="rounded-xl border px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handlePayGateway}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 shadow-xs cursor-pointer"
                >
                  {isProcessing
                    ? 'Verifikasi...'
                    : `Bayar ${formatMoney(payingInvoice.amount, payingInvoice.currency)} Sekarang`}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
