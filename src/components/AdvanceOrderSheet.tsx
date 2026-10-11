import React from 'react';
import { Order, OrderStatus } from '../types';
import { useStore } from '../context/StoreContext';
import { formatRs } from '../utils/mauritiusTime';
import { CheckCircle2, ArrowRight, X, Phone, Clock, MessageSquare, Edit2, Lock } from 'lucide-react';

interface AdvanceOrderSheetProps {
  order: Order | null;
  onClose: () => void;
  onAdvance: (orderId: string) => Promise<OrderStatus | null>;
  onSetStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onEditOrder?: (order: Order) => void;
}

const STATUS_PIPELINE: OrderStatus[] = ['New', 'Preparing', 'Out', 'Delivered', 'Paid'];

const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  'New': 'Order received from customer',
  'Preparing': 'Items being picked & packed',
  'Out': 'Courier on the road for delivery',
  'Delivered': 'Received by customer',
  'Paid': 'Payment settled in shop cash/juice'
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  'New': 'Preparing',
  'Preparing': 'Out',
  'Out': 'Delivered',
  'Delivered': 'Paid',
  'Paid': null
};

export const AdvanceOrderSheet: React.FC<AdvanceOrderSheetProps> = ({
  order,
  onClose,
  onAdvance,
  onSetStatus,
  onEditOrder
}) => {
  const { generateWhatsAppUrl } = useStore();
  if (!order) return null;

  const nextStatus = NEXT_STATUS[order.status];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div 
        className="w-full max-w-md bg-[#0a0f1d] border-t sm:border border-cyan-900/60 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-cyan-400 font-bold text-lg">{order.orderNumber}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                {order.status}
              </span>
            </div>
            <p className="text-sm text-slate-300 font-semibold">{order.customerName}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount & Time Details */}
        <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Total Amount</span>
            <span className="font-mono text-xl font-bold text-teal-300 tracking-tight">
              {formatRs(order.totalAmount)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block flex items-center justify-end gap-1">
              <Clock className="w-3 h-3 text-cyan-400" /> Due Time
            </span>
            <span className="font-mono text-sm font-semibold text-slate-200">
              {order.deliveryDueTime} ({order.deliveryMethod})
            </span>
          </div>
        </div>

        {/* Customer contact shortcut with WhatsApp integration */}
        <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
          <span className="text-xs font-mono text-slate-400">{order.customerPhone}</span>
          <div className="flex items-center gap-1.5">
            <a
              href={`tel:${order.customerPhone}`}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300"
              style={{ minHeight: '44px' }}
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
            <a
              href={generateWhatsAppUrl(order, 'en')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-750 rounded-lg text-xs font-semibold text-emerald-300"
              style={{ minHeight: '44px' }}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp
            </a>
          </div>
        </div>

        {/* Status Pipeline Visualizer */}
        <div>
          <label className="text-xs text-slate-400 font-medium block mb-2">Order Stage Flow</label>
          <div className="grid grid-cols-5 gap-1 text-center">
            {STATUS_PIPELINE.map((st, idx) => {
              const isCurrent = order.status === st;
              const isPassed = STATUS_PIPELINE.indexOf(order.status) > idx;

              return (
                <button
                  key={st}
                  onClick={async () => {
                    await onSetStatus(order.id, st);
                    onClose();
                  }}
                  className={`py-2 px-1 rounded-lg text-[11px] font-mono transition border ${
                    isCurrent
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                      : isPassed
                      ? 'bg-teal-950/70 text-teal-300 border-teal-800/60'
                      : 'bg-slate-900/50 text-slate-500 border-slate-800'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Items summary */}
        <div className="text-xs space-y-1 bg-slate-950/40 p-3 rounded-lg border border-slate-900">
          <span className="text-slate-400 font-medium block mb-1">Items ({order.items.length}):</span>
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between text-slate-300">
              <span>{item.quantity}x {item.name}</span>
              <span className="font-mono">{formatRs(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
          {order.notes && (
            <p className="mt-2 pt-2 border-t border-slate-900 text-slate-400 italic">
              Note: {order.notes}
            </p>
          )}
        </div>

        {/* Clause 3 (v46) / WORK-ORDER: Order Edit below Paid */}
        {order.status !== 'Paid' ? (
          <button
            type="button"
            onClick={() => {
              onEditOrder?.(order);
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-98"
            style={{ minHeight: '44px' }}
          >
            <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Edit Order Details</span>
          </button>
        ) : (
          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>correct via Ledger — paid deeds are history</span>
          </div>
        )}

        {/* Big Action Button */}
        {nextStatus ? (
          <button
            onClick={async () => {
              await onAdvance(order.id);
              onClose();
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-98 transition"
            style={{ minHeight: '48px' }}
          >
            <span>Advance to {nextStatus}</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 bg-emerald-950/50 border border-emerald-800/50 rounded-xl text-emerald-400 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            <span>Order Completed & Fully Paid</span>
          </div>
        )}
      </div>
    </div>
  );
};
