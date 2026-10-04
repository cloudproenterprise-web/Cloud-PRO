import React from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldCheck } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class RootErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CloudPRO Root Guard] Caught uncaught UI error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRecover = () => {
    // Attempt graceful recovery without wiping critical auth/database state
    try {
      this.setState({ hasError: false, error: null, errorInfo: null });
      window.location.reload();
    } catch {
      window.location.href = '/';
    }
  };

  handleResetState = () => {
    try {
      // Clear non-critical temporary session keys while leaving auth and database safe
      sessionStorage.clear();
      this.setState({ hasError: false, error: null, errorInfo: null });
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl border border-slate-800 bg-slate-950/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Cloud PRO Enterprise Guard
                </h2>
                <p className="text-xs text-slate-400">
                  Sistem Pemulihan Otomatis Antarmuka (Auto-Heal)
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Basis Data &amp; Server Aman Terisolasi</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Terdeteksi inkonsistensi sementara pada perenderan komponen antarmuka. Data server, akun hosting, dan database Anda tidak terpengaruh dan tetap berjalan normal di latar belakang.
              </p>
              {this.state.error && (
                <div className="mt-2 rounded-lg bg-black/50 p-2 font-mono text-[11px] text-amber-300 break-all">
                  {this.state.error.message || 'Unknown runtime anomaly'}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleRecover}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-600/20 hover:bg-sky-500 active:scale-98 transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Muat Ulang &amp; Pulihkan Sesi</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetState}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Reset ke Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
