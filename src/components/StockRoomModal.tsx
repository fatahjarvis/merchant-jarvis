import React, { useState, useMemo } from 'react';
import { StockItem, StockStatusChip } from '../types';
import { useStore } from '../context/StoreContext';
import { formatRs } from '../utils/mauritiusTime';
import { getStockStatusChip, getSellingFormatQty } from '../utils/stockUtils';
import { 
  X, 
  Search, 
  Plus, 
  Upload, 
  Camera, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  ChevronRight, 
  MessageSquare, 
  History, 
  Layers,
  ArrowUpDown
} from 'lucide-react';

interface StockRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: StockItem) => void;
  onOpenImport: (door: 'door1' | 'door2') => void;
  onAddNewItem: () => void;
}

export const StockRoomModal: React.FC<StockRoomModalProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  onOpenImport,
  onAddNewItem
}) => {
  const { stockItems, stockMovements, generateSupplierWhatsAppUrl } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | StockStatusChip>('ALL');
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory');

  // Status helper (Stock Model v2 computed on selling-format qty)
  const getItemStatus = (item: StockItem): StockStatusChip => {
    return getStockStatusChip(item);
  };

  const okCount = stockItems.filter(i => getItemStatus(i) === 'OK').length;
  const lowCount = stockItems.filter(i => getItemStatus(i) === 'LOW').length;
  const outCount = stockItems.filter(i => getItemStatus(i) === 'OUT').length;

  const filteredItems = useMemo(() => {
    return stockItems.filter(item => {
      const status = getItemStatus(item);
      const matchesFilter = activeFilter === 'ALL' || status === activeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.supplier && item.supplier.toLowerCase().includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [stockItems, activeFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#040915] border border-cyan-900/80 w-full max-w-xl rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Stock Room · Inventory Manager</h2>
              <p className="text-xs text-slate-400 font-mono">
                {stockItems.length} SKUs registered · {lowCount} low · {outCount} out
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Doors Strip */}
        <div className="p-3 bg-slate-950/90 border-b border-slate-850 grid grid-cols-2 gap-2">
          <button
            onClick={() => onOpenImport('door1')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-cyan-900/60 text-slate-100 text-xs font-semibold active:scale-95 transition"
            style={{ minHeight: '44px' }}
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>DOOR 1: Upload List</span>
          </button>

          <button
            onClick={() => onOpenImport('door2')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-cyan-900/60 text-slate-100 text-xs font-semibold active:scale-95 transition"
            style={{ minHeight: '44px' }}
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>DOOR 2: Photo Sheet</span>
          </button>
        </div>

        {/* Tab switch between Inventory & Movements */}
        <div className="flex items-center px-4 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
              activeTab === 'inventory'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            style={{ minHeight: '38px' }}
          >
            Inventory Catalog ({stockItems.length})
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
              activeTab === 'movements'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            style={{ minHeight: '38px' }}
          >
            Movements Log ({stockMovements.length})
          </button>
        </div>

        {/* Tab 1: Inventory List */}
        {activeTab === 'inventory' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search stock item, category, supplier..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500"
                style={{ minHeight: '44px' }}
              />
            </div>

            {/* OK / LOW / OUT Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                  activeFilter === 'ALL'
                    ? 'bg-slate-200 text-slate-950 border-white'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
                style={{ minHeight: '36px' }}
              >
                ALL ({stockItems.length})
              </button>

              <button
                onClick={() => setActiveFilter('OK')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                  activeFilter === 'OK'
                    ? 'bg-teal-500 text-slate-950 border-teal-400'
                    : 'bg-teal-950/60 text-teal-300 border-teal-800/80'
                }`}
                style={{ minHeight: '36px' }}
              >
                OK ({okCount})
              </button>

              <button
                onClick={() => setActiveFilter('LOW')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                  activeFilter === 'LOW'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                }`}
                style={{ minHeight: '36px' }}
              >
                LOW ({lowCount})
              </button>

              <button
                onClick={() => setActiveFilter('OUT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                  activeFilter === 'OUT'
                    ? 'bg-rose-500 text-slate-950 border-rose-400'
                    : 'bg-rose-950/60 text-rose-300 border-rose-800/80'
                }`}
                style={{ minHeight: '36px' }}
              >
                OUT ({outCount})
              </button>
            </div>

            {/* Item Cards */}
            <div className="space-y-2">
              {filteredItems.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-8 text-center text-xs text-slate-500">
                  No stock items match your search or filter.
                </div>
              ) : (
                filteredItems.map(item => {
                  const status = getItemStatus(item);
                  const isOut = status === 'OUT';
                  const isLow = status === 'LOW';
                  const isOk = status === 'OK';

                  const reorderQty = Math.max(item.minThreshold * 2 - item.currentStock, 5);
                  const waUrl = generateSupplierWhatsAppUrl(item, reorderQty);

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      className="bg-slate-950/90 border border-slate-850 hover:border-cyan-800/60 rounded-xl p-3 flex items-center justify-between cursor-pointer transition active:scale-98"
                      style={{ minHeight: '56px' }}
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
                          <span className="text-xs font-bold text-slate-100 truncate max-w-[170px]">
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
                          <span className="text-slate-500">Min: {item.minThreshold}</span>
                          {(item.unitPrice > 0 || (item.sellingPrice || 0) > 0) && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-teal-400">
                                {formatRs(item.unitPrice || item.sellingPrice || 0)}
                                {item.sellingFormat === 'pack' && item.packPrice ? ` (${formatRs(item.packPrice)}/pk)` : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Supplier WhatsApp button on alert rows */}
                        {(isLow || isOut) && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="w-8 h-8 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-400 flex items-center justify-center transition"
                            title={`WhatsApp supplier for ${item.name}`}
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
            </div>
          </div>
        )}

        {/* Tab 2: Movements Log */}
        {activeTab === 'movements' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-mono text-slate-400">Inventory Movements Audit Trail</span>
              <span className="text-[10px] font-mono text-cyan-400">{stockMovements.length} logged</span>
            </div>

            {stockMovements.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-8 text-center text-xs text-slate-500">
                No movements recorded yet. Movements appear when adjusting stock, uploading CSVs, or selling items.
              </div>
            ) : (
              stockMovements.map(m => (
                <div
                  key={m.id}
                  className="bg-slate-950/80 border border-slate-850 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{m.itemName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {m.reason}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                      <span>Source: {m.source}</span>
                      {m.note && <span>· {m.note}</span>}
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className={`font-bold block ${m.delta >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                      {m.delta >= 0 ? `+${m.delta}` : m.delta}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {m.previousStock} → {m.newStock}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Bottom Bar with "+ Add New Item" */}
        <div className="p-3 bg-slate-950 border-t border-slate-850 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            {stockItems.length} active SKUs
          </span>

          <button
            onClick={onAddNewItem}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-[0_0_12px_rgba(6,182,212,0.3)] transition active:scale-95"
            style={{ minHeight: '40px' }}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>
    </div>
  );
};
