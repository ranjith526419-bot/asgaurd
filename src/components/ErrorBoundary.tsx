import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside Ephemeral Vault:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-[#fafafa] flex items-center justify-center p-6 selection:bg-indigo-500/30">
          <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#a1a1a1]">
                <Shield className="w-3.5 h-3.5 text-[#6366f1]" />
                <span>Ephemeral Vault Recovery</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#fafafa]">
                Something interrupted the Vault
              </h2>
              <p className="text-xs text-[#a1a1a1] leading-relaxed">
                The application encountered an unexpected client issue. Your confidential data remains safe and was not transmitted.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-left overflow-auto max-h-32">
                <p className="text-[11px] font-mono text-red-400 break-all">
                  {this.state.error.message || 'Unknown runtime error'}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReset}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#6366f1] hover:bg-[#4f46e5] shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
