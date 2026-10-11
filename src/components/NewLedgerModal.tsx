import React, { useState } from 'react';
import { LedgerCategory, StockItem } from '../types';
import { useStore } from '../context/StoreContext';
import { X, TrendingUp, TrendingDown, Package, PlusCircle, ArrowUpRight } from 'lucide-react';

interface NewLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: LedgerCategory;
}

const CATEGORY_PRESETS: Record<LedgerCategory, string[]> = {
  'Sale': ['Counter Cash', 'Juice Provisions', 'Customer Delivery', 'Bulk Sale', 'Bakery / Bread'],
  'Expense': ['Courier Logistics', 'CEB Electricity', 'Lunch / Meals', 'Packaging Bags', 'Store Cleaning'],
  'Stock': ['Phoenix Beverages', 'Rice Wholesale', 'Les Moulins Flour', 'Dairy & Milk Restock', 'Dholl & Spices']
};

export const NewLedgerModal: React.FC<NewLedgerModalProps> = ({ 
  isOpen, 
  onClose,
  defaultType = 'Sale'
}) => {
  const { addLedgerEntry, stockItems } = useStore();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<LedgerCategory>(defaultType);
  const [categoryName, setCategoryName] = useState('');
  const [note, setNote] = useState('');
  const [selectedStockSku, setSelectedStockSku] = useState<StockItem | null>(null);
  const [restockQty, setRestockQty] = useState('5');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    let finalCategory = categoryName || CATEGORY_PRESETS[type][0];
    let finalNote = note;

    if (type === 'Stock' && selectedStockSku) {
      finalCategory = `Restock ${selectedStockSku.name}`;
      const qtyNumber = parseInt(restockQty, 10) || 5;
      const skuUnit = selectedStockSku.baseUnit || selectedStockSku.unit || 'units';
      finalNote = note 
        ? `${note} (+${qtyNumber} ${skuUnit})` 
        : `Restocked ${qtyNumber} ${skuUnit} from ${selectedStockSku.supplier || 'supplier'}`;
    }

    await addLedgerEntry(
      parsedAmount,
      type,
      finalCategory,
      finalNote
    );

    setAmount('');
    setNote('');
    setSelectedStockSku(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div 
        className="w-full max-w-md bg-[#0a0f1d] border-t sm:border border-cyan-900/60 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-950/80 border border-teal-800/60 flex items-center justify-center text-teal-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Quick Day Entry</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Hero Monospace */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Entry Amount (Mauritian Rupee)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xl font-bold text-teal-400">
                Rs
              </span>
              <input
                type="number"
                required
                step="any"
                autoFocus
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl pl-14 pr-4 py-3.5 text-2xl font-mono font-bold text-slate-100 placeholder:text-slate-600 outline-none"
                style={{ minHeight: '52px' }}
              />
            </div>
          </div>

          {/* Category Chips: Sale / Expense / Stock */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Entry Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setType('Sale'); setCategoryName(CATEGORY_PRESETS['Sale'][0]); setSelectedStockSku(null); }}
                className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition ${
                  type === 'Sale'
                    ? 'bg-teal-500/20 text-teal-300 border-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.3)]'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
                style={{ minHeight: '44px' }}
              >
                <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                <span>Sale</span>
              </button>

              <button
                type="button"
                onClick={() => { setType('Expense'); setCategoryName(CATEGORY_PRESETS['Expense'][0]); setSelectedStockSku(null); }}
                className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition ${
                  type === 'Expense'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
                style={{ minHeight: '44px' }}
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                <span>Expense</span>
              </button>

              <button
                type="button"
                onClick={() => { setType('Stock'); setCategoryName(CATEGORY_PRESETS['Stock'][0]); }}
                className={`py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold border transition ${
                  type === 'Stock'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
                style={{ minHeight: '44px' }}
              >
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span>Stock</span>
              </button>
            </div>
          </div>

          {/* If Stock type: Item 6 Movement Increment hook */}
          {type === 'Stock' && (
            <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Link to Inventory Item (Increments Stock)
                </span>
                <span className="text-[10px] text-amber-400 font-mono">MOVEMENT</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {stockItems.map(sku => (
                  <button
                    key={sku.id}
                    type="button"
                    onClick={() => {
                      setSelectedStockSku(sku);
                      setCategoryName(`Restock ${sku.name}`);
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-mono border transition ${
                      selectedStockSku?.id === sku.id
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                    }`}
                  >
                    {sku.name}
                  </button>
                ))}
              </div>

              {selectedStockSku && (
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-400">Qty added:</span>
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={e => setRestockQty(e.target.value)}
                    className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-cyan-300 outline-none"
                  />
                  <span className="text-slate-400 font-mono">{selectedStockSku.baseUnit || selectedStockSku.unit}</span>
                </div>
              )}
            </div>
          )}

          {/* Quick preset chips */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Category Tag</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CATEGORY_PRESETS[type].map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategoryName(cat)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                    categoryName === cat
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  style={{ minHeight: '36px' }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              placeholder="Or type custom category..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Optional Note / Reference</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Counter shift 1, receipt #89, van delivery"
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold text-base shadow-[0_0_16px_rgba(20,184,166,0.35)] disabled:opacity-40 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2"
            style={{ minHeight: '48px' }}
          >
            <span>Record into Ledger</span>
          </button>
        </form>
      </div>
    </div>
  );
};
