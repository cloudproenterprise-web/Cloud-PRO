import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X, Trash2 } from 'lucide-react';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  isDanger?: boolean;
  isDestructive?: boolean;
  inputPlaceholder?: string;
  inputValue?: string;
  onConfirm: (inputValue?: string) => void | Promise<void>;
}

interface ConfirmationModalProps {
  options: ConfirmDialogOptions | null;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ options, onClose }) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (options?.inputValue) {
      setInputText(options.inputValue);
    } else {
      setInputText('');
    }
  }, [options]);

  if (!options) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await options.onConfirm(options.inputPlaceholder ? inputText : undefined);
      onClose();
    } catch {
      // Handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              options.isDanger
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
            }`}
          >
            {options.isDanger ? (
              <Trash2 className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>

          <div className="flex-1 pr-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {options.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {options.message}
            </p>

            {options.inputPlaceholder !== undefined && (
              <div className="mt-4">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={options.inputPlaceholder}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            {options.cancelText || 'Batal'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || (options.inputPlaceholder !== undefined && !inputText.trim())}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all ${
              options.isDanger || options.isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50'
                : 'bg-sky-600 hover:bg-sky-700 disabled:opacity-50'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Memproses...</span>
              </>
            ) : (
              options.confirmText || options.confirmLabel || 'Konfirmasi'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
