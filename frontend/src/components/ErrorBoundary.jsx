import React from 'react';
import { AlertCircle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL: React Error Boundary caught an uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });

    // Handle chunk loading failure (e.g. after a new deployment on Vercel)
    const errorStr = (error?.message || '').toLowerCase();
    if (
      errorStr.includes('failed to fetch dynamically imported module') ||
      errorStr.includes('loading chunk') ||
      errorStr.includes('chunkloaderror')
    ) {
      console.warn('Detected stale chunk load error. Triggering automatic reload...');
      const hasReloaded = sessionStorage.getItem('crm_chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('crm_chunk_reload', 'true');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem('crm_chunk_reload');
    window.location.reload();
  };

  handleReset = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('crm_active_tab');
    } catch {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'Unknown render error occurred';

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 text-slate-800 dark:text-slate-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center mx-auto mb-5 text-rose-600 dark:text-rose-400 shadow-sm">
              <ShieldAlert size={32} />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Workspace Encountered an Error
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              We prevented a blank screen crash. Your data is safe. You can reload the page or reset the active view to continue.
            </p>

            <div className="p-3 mb-6 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-left border border-slate-200 dark:border-slate-700/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Diagnostic Details
              </div>
              <div className="text-xs font-mono text-rose-600 dark:text-rose-400 break-words line-clamp-3">
                {errorMessage}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={15} />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home size={15} />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
