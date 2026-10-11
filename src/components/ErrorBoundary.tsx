import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const telemetryLeg = `screen-stumble ${this.props.name}`;
    console.warn(`[telemetry] ${telemetryLeg}`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 my-3 bg-[#08111e] border border-amber-900/60 rounded-2xl shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  This screen stumbled — telemetry recorded
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  {this.props.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                One stumbling organ never kills the shop. Your active ledger, orders, and local stock remain intact.
              </p>
              {this.state.error && (
                <p className="text-[11px] font-mono text-slate-500 mt-1 truncate max-w-sm">
                  {this.state.error.message}
                </p>
              )}
            </div>
          </div>

          <div className="pt-1 flex items-center justify-end">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 transition active:scale-95"
              style={{ minHeight: '40px' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Revive Component</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
