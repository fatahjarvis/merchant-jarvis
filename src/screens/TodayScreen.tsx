import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  getShopkeeperGreeting, 
  formatMauritiusDateString, 
  formatMauritiusClock, 
  formatRs, 
  getMauritiusNow, 
  getMauritiusDateKey 
} from '../utils/mauritiusTime';
import { 
  ShoppingBag, 
  Truck, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  Mic, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Clock,
  Sparkles,
  Phone,
  MessageSquare,
  Package,
  Upload,
  Camera,
  Search,
  ChevronRight
} from 'lucide-react';
import { Order, StockItem, StockStatusChip } from '../types';
import { getStockStatusChip, getSellingFormatQty } from '../utils/stockUtils';

interface TodayScreenProps {
  onOpenNewOrder: () => void;
  onOpenNewLedger: () => void;
  onSelectTab: (tab: any) => void;
  onSelectOrder: (order: Order) => void;
  onOpenStockRoom: () => void;
  onOpenStockItem: (item: StockItem) => void;
  onOpenStockImport: (door: 'door1' | 'door2') => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  onOpenNewOrder,
  onOpenNewLedger,
  onSelectTab,
  onSelectOrder,
  onOpenStockRoom,
  onOpenStockItem,
  onOpenStockImport
}) => {
  const { 
    orders, 
    ledgerEntries, 
    stockItems, 
    profile, 
    user,
    generateWhatsAppUrl,
    generateSupplierWhatsAppUrl 
  } = useStore();

  const [stockExpanded, setStockExpanded] = useState(true);
  const [deliveriesExpanded, setDeliveriesExpanded] = useState(true);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  const mutNow = getMauritiusNow();
  const todayKey = getMauritiusDateKey(mutNow);
  const greeting = getShopkeeperGreeting(profile.ownerName);

  // Metrics
  const openOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Paid');
  const deliveriesDueToday = orders.filter(o => (o.deliveryDueDate === todayKey || o.isDueToday) && (o.status === 'New' || o.status === 'Preparing' || o.status === 'Out'));
  
  // Stock status helper (Stock Model v2 computed on selling-format qty)
  const getItemStatus = (item: StockItem): StockStatusChip => {
    return getStockStatusChip(item);
  };

  const lowStock = stockItems.filter(s => getItemStatus(s) === 'LOW');
  const outStock = stockItems.filter(s => getItemStatus(s) === 'OUT');
  const okStock = stockItems.filter(s => getItemStatus(s) === 'OK');

  // Today ledger
  const todayLedger = ledgerEntries.filter(e => e.date === todayKey);
  const todaySales = todayLedger.filter(e => e.type === 'Sale').reduce((sum, e) => sum + e.amount, 0);
  const todayExpenses = todayLedger.filter(e => e.type === 'Expense' || e.type === 'Stock').reduce((sum, e) => sum + e.amount, 0);
  const netCash = todaySales - todayExpenses;

  // Filtered stock items preview for Today screen
  const filteredStock = useMemo(() => {
    const q = stockSearchQuery.toLowerCase().trim();
    if (!q) {
      // Prioritize low and out items, then others
      return [...outStock, ...lowStock, ...okStock].slice(0, 5);
    }
    return stockItems.filter(i => 
      i.name.toLowerCase().includes(q) || 
      (i.category && i.category.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [stockItems, stockSearchQuery, outStock, lowStock, okStock]);

  return (
    <div className="space-y-4 pb-20">
      {/* One-line greeting with MUT (UTC+4) date & clock banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#041d24] to-slate-900 border border-cyan-900/50 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between text-xs text-cyan-400 font-mono mb-1">
          <span>{formatMauritiusDateString(mutNow)}</span>
          <span className="font-bold">{formatMauritiusClock(mutNow).split(' ')[0]} MUT</span>
        </div>
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span>{greeting}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {profile.shopName} · {profile.district}, Mauritius
        </p>
      </div>

      {/* Clause 5: GUEST HONESTY banner on signed-out Today */}
      {!user && (
        <div className="bg-gradient-to-r from-[#061e38] via-slate-900 to-[#07243b] border border-cyan-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-lg animate-in fade-in">
          <div className="text-xs text-slate-200">
            <span className="font-bold text-cyan-300 block mb-0.5">Guest mode</span>
            <span>Your data lives on this device only. Sign in to sync with the estate cloud.</span>
          </div>
          <button
            onClick={() => onSelectTab('menu')}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.4)] transition active:scale-95"
            style={{ minHeight: '38px' }}
          >
            Sign in
          </button>
        </div>
      )}

      {/* Quick Action Shortcuts - Thumb Reach */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onOpenNewOrder}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-800/40 text-slate-100 active:scale-95 transition"
          style={{ minHeight: '68px' }}
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-1">
            <Plus className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="text-xs font-semibold">New Order</span>
        </button>

        <button
          onClick={onOpenNewLedger}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-teal-800/40 text-slate-100 active:scale-95 transition"
          style={{ minHeight: '68px' }}
        >
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center mb-1">
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-semibold">Day Entry</span>
        </button>

        <button
          onClick={() => onSelectTab('jarvis')}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-b from-cyan-950/80 to-slate-900 border border-cyan-500/40 text-cyan-300 active:scale-95 transition shadow-[0_0_12px_rgba(6,182,212,0.2)]"
          style={{ minHeight: '68px' }}
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center mb-1 font-bold">
            <Mic className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-bold">Ask Jarvis</span>
        </button>
      </div>

      {/* Today Register Card (Monospace figures) */}
      <div className="bg-[#060b17] border border-cyan-950 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Today's Day Book
          </span>
          <button 
            onClick={() => onSelectTab('ledger')}
            className="text-xs text-cyan-400 font-mono flex items-center gap-1 hover:underline"
          >
            Ledger <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Sales</span>
            <span className="font-mono text-base font-bold text-teal-400 block tabular-nums">
              {formatRs(todaySales)}
            </span>
          </div>

          <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Outflows</span>
            <span className="font-mono text-base font-bold text-rose-400 block tabular-nums">
              {formatRs(todayExpenses)}
            </span>
          </div>

          <div className="bg-cyan-950/40 rounded-xl p-2.5 border border-cyan-900/60">
            <span className="text-[11px] text-cyan-300 block mb-0.5 font-medium">Net Cash</span>
            <span className={`font-mono text-base font-bold block tabular-nums ${netCash >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
              {formatRs(netCash)}
            </span>
          </div>
        </div>
      </div>

      {/* Day Pulse Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Open Orders */}
        <div 
          onClick={() => onSelectTab('orders')}
          className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl p-3 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] text-slate-500 font-mono">ALL</span>
          </div>
          <span className="font-mono text-xl font-bold text-slate-100 block tabular-nums">
            {openOrders.length}
          </span>
          <span className="text-[11px] text-slate-400">Open Orders</span>
        </div>

        {/* Deliveries Due Today */}
        <div 
          onClick={() => onSelectTab('orders')}
          className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl p-3 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <Truck className="w-4 h-4 text-teal-400" />
            <span className="text-[10px] text-teal-400 font-mono">DUE</span>
          </div>
          <span className="font-mono text-xl font-bold text-teal-300 block tabular-nums">
            {deliveriesDueToday.length}
          </span>
          <span className="text-[11px] text-slate-400">Deliveries Due</span>
        </div>

        {/* Stock Room Alert Card */}
        <div 
          onClick={onOpenStockRoom}
          className={`border rounded-xl p-3 cursor-pointer transition ${
            lowStock.length + outStock.length > 0 
              ? 'bg-amber-950/30 border-amber-800/60' 
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <Package className={`w-4 h-4 ${lowStock.length + outStock.length > 0 ? 'text-amber-400' : 'text-cyan-400'}`} />
            <span className="text-[10px] font-mono text-amber-400">STOCK</span>
          </div>
          <span className={`font-mono text-xl font-bold block tabular-nums ${lowStock.length + outStock.length > 0 ? 'text-amber-300' : 'text-slate-100'}`}>
            {lowStock.length + outStock.length}
          </span>
          <span className="text-[11px] text-slate-400">Alerts Pending</span>
        </div>
      </div>

      {/* Deliveries Due Today Collapsible List */}
      <div className="bg-[#0a0f1d] border border-slate-850 rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => setDeliveriesExpanded(!deliveriesExpanded)}
          className="w-full flex items-center justify-between p-3.5 bg-slate-900/60 hover:bg-slate-900 text-left transition"
          style={{ minHeight: '44px' }}
        >
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-bold text-slate-200">
              Deliveries Due Today ({deliveriesDueToday.length})
            </span>
          </div>
          {deliveriesExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {deliveriesExpanded && (
          <div className="p-3 space-y-2 border-t border-slate-900">
            {deliveriesDueToday.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                All today's orders have been delivered or paid! 🎉
              </p>
            ) : (
              deliveriesDueToday.map(order => (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className="bg-slate-950/90 border border-slate-850 hover:border-cyan-700/60 rounded-xl p-3 flex items-center justify-between cursor-pointer transition active:scale-98"
                  style={{ minHeight: '52px' }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">{order.orderNumber}</span>
                      <span className="text-xs font-semibold text-slate-200">{order.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" /> {order.deliveryDueTime}
                      </span>
                      <span>·</span>
                      <span>{order.deliveryMethod}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-teal-300 block">
                        {formatRs(order.totalAmount)}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {order.status}
                      </span>
                    </div>

                    <a
                      href={generateWhatsAppUrl(order, 'en')}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-400 flex items-center justify-center transition"
                      title="Send WhatsApp update to customer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* STOCK ROOM SECTION (Item 1 & Item 5: OK/LOW/OUT chips, search, WhatsApp supplier button) */}
      <div className="bg-[#070e1c] border border-cyan-950/80 rounded-2xl overflow-hidden shadow-lg space-y-0">
        <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">Stock Room & Reorder Loop</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {okStock.length} OK · {lowStock.length} Low · {outStock.length} Out
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenStockRoom}
              className="text-xs text-cyan-400 font-mono flex items-center gap-1 hover:underline"
            >
              <span>Manage</span> <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Quick Doors Strip in Today screen */}
        <div className="p-2.5 bg-slate-950/80 border-b border-slate-900 grid grid-cols-2 gap-2">
          <button
            onClick={() => onOpenStockImport('door1')}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-semibold"
            style={{ minHeight: '40px' }}
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Door 1: Upload List</span>
          </button>

          <button
            onClick={() => onOpenStockImport('door2')}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-semibold"
            style={{ minHeight: '40px' }}
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Door 2: Photo Sheet</span>
          </button>
        </div>

        {/* Search bar for stock */}
        <div className="p-3 border-b border-slate-900 bg-slate-950/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={stockSearchQuery}
              onChange={e => setStockSearchQuery(e.target.value)}
              placeholder="Search stock catalog..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Stock Item Rows with OK/LOW/OUT chips and Supplier WhatsApp button */}
        <div className="p-3 space-y-2">
          {filteredStock.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">
              No matching stock items found.
            </p>
          ) : (
            filteredStock.map(item => {
              const status = getItemStatus(item);
              const isOut = status === 'OUT';
              const isLow = status === 'LOW';
              const supplierUrl = generateSupplierWhatsAppUrl(item);

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenStockItem(item)}
                  className="bg-slate-950/90 border border-slate-850 hover:border-cyan-800/60 rounded-xl p-3 flex items-center justify-between cursor-pointer transition active:scale-98"
                  style={{ minHeight: '52px' }}
                >
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                        isOut
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : isLow
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-teal-950 text-teal-300 border-teal-800'
                      }`}>
                        {status}
                      </span>
                      <span className="text-xs font-bold text-slate-100 truncate max-w-[160px]">
                        {item.name}{item.brand ? ` (${item.brand})` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span className="font-mono text-cyan-300 font-semibold">
                        {item.currentStock} {item.baseUnit || item.unit || 'units'}
                        {item.sellingFormat === 'pack' && item.packContains && item.packContains > 1 && (
                          <span className="text-slate-400 font-normal"> ({getSellingFormatQty(item)} pk)</span>
                        )}
                      </span>
                      <span>·</span>
                      <span className="text-slate-500 font-mono">Min: {item.minThreshold}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Item 5: REORDER LOOP Supplier WhatsApp Button */}
                    {(isLow || isOut) && (
                      <a
                        href={supplierUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="w-8 h-8 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-400 flex items-center justify-center transition"
                        title={`Send WhatsApp reorder to ${item.supplier || 'supplier'}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              );
            })
          )}

          <button
            onClick={onOpenStockRoom}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-cyan-400 font-mono text-xs flex items-center justify-center gap-1.5 transition mt-2"
          >
            <span>View All {stockItems.length} SKUs in Stock Room</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
