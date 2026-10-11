import React, { useState } from 'react';
import { Cloud, ShieldCheck, CheckCircle2, X, ArrowRight, RefreshCw } from 'lucide-react';

interface CloudMergeModalProps {
  pendingMerge: {
    ordersCount: number;
    ledgerCount: number;
    stockCount: number;
    user: any;
  } | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const CloudMergeModal: React.FC<CloudMergeModalProps> = ({
  pendingMerge,
  onConfirm,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!pendingMerge) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const userEmail = pendingMerge.user?.email || 'Authenticated Merchant';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#050c18] border border-cyan-800/90 w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Estate Cloud Drawer</h2>
              <p className="text-xs text-slate-400 font-mono">
                Guest Honesty · Merge Read-Back
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center space-y-2">
            <div className="text-xs text-cyan-300 font-mono uppercase tracking-wider">
              Signed in as {userEmail}
            </div>
            <h3 className="text-sm font-bold text-slate-100 leading-snug">
              {pendingMerge.ordersCount} orders, {pendingMerge.ledgerCount} ledger lines, {pendingMerge.stockCount} stock items will join your cloud drawer
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Before any cloud write is executed, please confirm claiming these terminal records into your estate tenancy.
            </p>
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-850">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Customer Orders:</span>
              <span className="text-cyan-300 font-bold">{pendingMerge.ordersCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Day-Book Ledger Entries:</span>
              <span className="text-teal-300 font-bold">{pendingMerge.ledgerCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Stock SKUs & Movements:</span>
              <span className="text-emerald-300 font-bold">{pendingMerge.stockCount}</span>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirm}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-sm shadow-[0_0_18px_rgba(6,182,212,0.4)] active:scale-98 transition flex items-center justify-center gap-2"
              style={{ minHeight: '48px' }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting Cloud Drawer...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirm Cloud Drawer Merge</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200"
              style={{ minHeight: '40px' }}
            >
              Keep Local Only (Postpone Cloud Write)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
