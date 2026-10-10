import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Order, OrderStatus } from '../types';
import { formatRs } from '../utils/mauritiusTime';
import { 
  Search, 
  Plus, 
  Clock, 
  ChevronRight, 
  Phone, 
  Truck, 
  CheckCircle2, 
  Package, 
  ArrowRight,
  Filter,
  MessageSquare
} from 'lucide-react';

interface OrdersScreenProps {
  onOpenNewOrder: () => void;
  onSelectOrder: (order: Order) => void;
}

const STATUS_FILTERS: Array<'All' | OrderStatus> = ['All', 'New', 'Preparing', 'Out', 'Delivered', 'Paid'];

const STATUS_CHIP_COLORS: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  'New': { bg: 'bg-cyan-950/70', text: 'text-cyan-300', border: 'border-cyan-800' },
  'Preparing': { bg: 'bg-amber-950/70', text: 'text-amber-300', border: 'border-amber-800' },
  'Out': { bg: 'bg-indigo-950/70', text: 'text-indigo-300', border: 'border-indigo-800' },
  'Delivered': { bg: 'bg-teal-950/70', text: 'text-teal-300', border: 'border-teal-800' },
  'Paid': { bg: 'bg-emerald-950/70', text: 'text-emerald-300', border: 'border-emerald-800' }
};

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  onOpenNewOrder,
  onSelectOrder
}) => {
  const { orders, generateWhatsAppUrl } = useStore();
  const [activeFilter, setActiveFilter] = useState<'All' | OrderStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      const matchesFilter = activeFilter === 'All' || ord.status === activeFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery = !query || 
        ord.orderNumber.toLowerCase().includes(query) ||
        ord.customerName.toLowerCase().includes(query) ||
        ord.customerPhone.includes(query) ||
        ord.items.some(i => i.name.toLowerCase().includes(query));
      return matchesFilter && matchesQuery;
    });
  }, [orders, activeFilter, searchQuery]);

  return (
    <div className="space-y-3.5 pb-24">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by order #, customer, or phone..."
          className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-3 text-base text-slate-100 placeholder:text-slate-600 outline-none transition"
          style={{ minHeight: '44px' }}
        />
      </div>

      {/* Status Filter Chips (Thumb scrollable) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_FILTERS.map(filter => {
          const count = filter === 'All' ? orders.length : orders.filter(o => o.status === filter).length;
          const isSelected = activeFilter === filter;

          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              style={{ minHeight: '44px' }}
            >
              <span>{filter}</span>
              <span className={`ml-1.5 text-[10px] ${isSelected ? 'text-slate-950' : 'text-slate-500'}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      <div className="space-y-2.5">
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-8 text-center space-y-2">
            <Package className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-sm text-slate-400 font-medium">No orders found</p>
            <p className="text-xs text-slate-600">
              {searchQuery ? 'Try clearing your search query' : 'Tap "+ New order" below to create one'}
            </p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const chipStyle = STATUS_CHIP_COLORS[order.status];

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className="bg-[#070d19] border border-slate-850 hover:border-cyan-600/60 rounded-2xl p-4 cursor-pointer transition shadow-sm active:scale-98 space-y-2.5"
                style={{ minHeight: '44px' }}
              >
                {/* Top Row: Order # + Status Chip + Price */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-cyan-400">{order.orderNumber}</span>
                    <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${chipStyle.bg} ${chipStyle.text} ${chipStyle.border} font-semibold`}>
                      {order.status}
                    </span>
                  </div>
                  <span className="font-mono text-base font-bold text-teal-300 tabular-nums">
                    {formatRs(order.totalAmount)}
                  </span>
                </div>

                {/* Customer Row */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{order.customerName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-slate-400">{order.customerPhone}</span>
                      <a
                        href={generateWhatsAppUrl(order, 'en')}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold transition"
                        title="Open customer WhatsApp chat"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-400" />
                        <span>WA</span>
                      </a>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <span className="flex items-center justify-end gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-cyan-500" />
                      {order.deliveryDueTime}
                    </span>
                    <span className="text-[11px] text-slate-500">{order.deliveryMethod}</span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="text-xs text-slate-400 bg-slate-950/60 rounded-xl px-3 py-2 border border-slate-900 flex items-center justify-between">
                  <span className="truncate pr-2">
                    {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                  </span>
                  <span className="shrink-0 text-cyan-400 flex items-center gap-1 font-semibold text-[11px]">
                    Advance <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating "+ New order" Button in thumb reach (≥44px, bottom-right above tab bar) */}
      <button
        onClick={onOpenNewOrder}
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95 transition hover:brightness-110"
        style={{ minHeight: '48px', minWidth: '44px' }}
      >
        <Plus className="w-5 h-5 stroke-[3]" />
        <span>New order</span>
      </button>
    </div>
  );
};
