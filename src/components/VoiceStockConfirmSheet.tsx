import React from 'react';
import { StockItem } from '../types';
import { 
  Check, 
  X, 
  Mic, 
  Volume2, 
  ArrowRight, 
  Sparkles,
  AlertCircle
} from 'lucide-react';

export interface VoiceStockIntentPayload {
  type: 'stock-set' | 'stock-add' | 'stock-min';
  item: StockItem;
  targetValue: number;
  delta?: number;
  originalValue: number;
  unit: string;
  speechReadBack: string;
}

interface VoiceStockConfirmSheetProps {
  intent: VoiceStockIntentPayload | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const VoiceStockConfirmSheet: React.FC<VoiceStockConfirmSheetProps> = ({
  intent,
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !intent) return null;

  const isAdd = intent.type === 'stock-add';
  const isSet = intent.type === 'stock-set';
  const isMin = intent.type === 'stock-min';

  const intentLabel = isAdd 
    ? 'STOCK-ADD' 
    : isSet 
    ? 'STOCK-SET' 
    : 'STOCK-MIN (THRESHOLD)';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#050c18] border border-cyan-800/90 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Top Strip */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/80 text-cyan-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-cyan-300">
                DOOR 3 · ORB READ-BACK CONFIRM
              </span>
              <p className="text-[10px] text-slate-400 font-mono">Verify voice inventory intent before write</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
            {intentLabel}
          </span>
        </div>

        {/* Read-back Speech Plaque */}
        <div className="bg-slate-950/90 border border-cyan-900/60 rounded-xl p-3 flex items-start gap-2.5">
          <Volume2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-200 italic leading-relaxed">
            "{intent.speechReadBack}"
          </p>
        </div>

        {/* Target Item & Mutation Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-mono block mb-0.5">Target SKU:</span>
            <h4 className="text-sm font-bold text-slate-100">{intent.item.name}</h4>
            <span className="text-xs text-slate-400">Category: {intent.item.category}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 font-mono block">
                {isMin ? 'Current Min Limit' : 'Previous Count'}
              </span>
              <span className="font-mono text-base font-bold text-slate-300">
                {intent.originalValue} {intent.unit}
              </span>
            </div>

            <div className="bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-800/60">
              <span className="text-[10px] text-cyan-400 font-mono block font-bold">
                {isMin ? 'New Min Limit' : isAdd ? `+${intent.delta} Result` : 'New Target Count'}
              </span>
              <span className="font-mono text-base font-bold text-cyan-300">
                {intent.targetValue} {intent.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-850 transition"
            style={{ minHeight: '44px' }}
          >
            Cancel / Reject
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition active:scale-95"
            style={{ minHeight: '44px' }}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirm & Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
