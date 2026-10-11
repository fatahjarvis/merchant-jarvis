import React from 'react';
import { Order } from '../types';
import { formatRs } from '../utils/mauritiusTime';
import { 
  X, 
  AlertTriangle, 
  GitMerge, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface ConflictResolutionModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (orderId: string, resolution: 'keep_a' | 'keep_b' | 'merge') => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  order,
  isOpen,
  onClose,
  onResolve
}) => {
  if (!isOpen || !order || !order.conflict) return null;

  const { deviceA, deviceB, conflictFields, detectedAt } = order.conflict;

  const handleChoice = (resolution: 'keep_a' | 'keep_b' | 'merge') => {
    onResolve(order.id, resolution);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#070e1c] border border-amber-800/80 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-amber-950/40 border-b border-amber-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-700/80 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100">Conflict Manners · Order #{order.orderNumber}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-900/80 text-amber-300 border border-amber-700 font-bold">
                  conflict-merge (A/B)
                </span>
              </div>
              <p className="text-xs text-amber-300/80">
                Two devices submitted concurrent updates for this deed.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center hover:text-white transition"
            style={{ minHeight: '36px', minWidth: '36px' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Read-Back Plaque */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 space-y-1">
            <span className="font-bold text-cyan-400 block flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Read-Back Resolution Plaque
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Merchant Jarvis detected conflicting edits between <strong>Device A</strong> ({deviceA.source}) and <strong>Device B</strong> ({deviceB.source}). Compare both deed versions below and select how the shop will resolve this history.
            </p>
            {conflictFields.length > 0 && (
              <div className="text-[10px] font-mono text-amber-400 pt-1">
                Discrepant fields: {conflictFields.join(', ')}
              </div>
            )}
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Device A Card */}
            <div className="bg-slate-950 border border-cyan-900/70 rounded-2xl p-3.5 space-y-2.5 relative">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                  <Monitor className="w-4 h-4" />
                  <span>Device A ({deviceA.source})</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  {deviceA.status}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block">Total Price:</span>
                <span className="text-base font-bold font-mono text-teal-300">
                  {formatRs(deviceA.totalAmount)}
                </span>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[11px] text-slate-400 block">Items list:</span>
                <ul className="text-xs text-slate-300 space-y-1 bg-slate-900/70 p-2 rounded-lg border border-slate-850">
                  {deviceA.items.map((it, idx) => (
                    <li key={idx} className="flex justify-between text-[11px]">
                      <span>{it.quantity}x {it.name}</span>
                      <span className="font-mono text-slate-400">{formatRs(it.unitPrice * it.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleChoice('keep_a')}
                className="w-full py-2 px-3 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                style={{ minHeight: '40px' }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Keep Device A</span>
              </button>
            </div>

            {/* Device B Card */}
            <div className="bg-slate-950 border border-purple-900/70 rounded-2xl p-3.5 space-y-2.5 relative">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                  <Smartphone className="w-4 h-4" />
                  <span>Device B ({deviceB.source})</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                  {deviceB.status}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block">Total Price:</span>
                <span className="text-base font-bold font-mono text-teal-300">
                  {formatRs(deviceB.totalAmount)}
                </span>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[11px] text-slate-400 block">Items list:</span>
                <ul className="text-xs text-slate-300 space-y-1 bg-slate-900/70 p-2 rounded-lg border border-slate-850">
                  {deviceB.items.map((it, idx) => (
                    <li key={idx} className="flex justify-between text-[11px]">
                      <span>{it.quantity}x {it.name}</span>
                      <span className="font-mono text-slate-400">{formatRs(it.unitPrice * it.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleChoice('keep_b')}
                className="w-full py-2 px-3 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                style={{ minHeight: '40px' }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Keep Device B</span>
              </button>
            </div>
          </div>

          {/* Merge Option */}
          <div className="bg-slate-950 border border-emerald-900/70 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <GitMerge className="w-4 h-4" />
                <span>Merge Both Devices (Combined Items)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Combines item lists from both versions, recalculates order total, and retains the most progressed status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleChoice('merge')}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shrink-0 transition"
              style={{ minHeight: '40px' }}
            >
              Merge & Resolve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
