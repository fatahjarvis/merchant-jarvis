import React, { useState } from 'react';
import { StockItem, StockAdjustReason } from '../types';
import { useStore } from '../context/StoreContext';
import { formatRs } from '../utils/mauritiusTime';
import { 
  X, 
  Save, 
  Trash2, 
  Plus, 
  Minus, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  MessageSquare, 
  ExternalLink,
  Phone,
  Tag,
  Building2
} from 'lucide-react';

interface StockItemSheetProps {
  item: StockItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const REASONS: StockAdjustReason[] = ['Count', 'Damage', 'Return'];

export const StockItemSheet: React.FC<StockItemSheetProps> = ({
  item,
  isOpen,
  onClose
}) => {
  const { 
    updateStockItemDetails, 
    adjustStock, 
    deleteStockItem, 
    generateSupplierWhatsAppUrl 
  } = useStore();

  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState(item?.category || 'General');
  const [baseUnit, setBaseUnit] = useState(item?.baseUnit || 'units');
  const [currentStock, setCurrentStock] = useState(item?.currentStock || 0);
  const [minThreshold, setMinThreshold] = useState(item?.minThreshold || 5);
  const [unitCost, setUnitCost] = useState(item?.unitCost || 0);
  const [unitPrice, setUnitPrice] = useState(item?.unitPrice || 0);
  const [supplier, setSupplier] = useState(item?.supplier || '');
  const [supplierPhone, setSupplierPhone] = useState(item?.supplierPhone || '');
  
  // Manual adjust state
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [selectedReason, setSelectedReason] = useState<StockAdjustReason>('Count');
  const [adjustNote, setAdjustNote] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category || 'General');
      setUnit(item.unit || 'units');
      setCurrentStock(item.currentStock);
      setMinThreshold(item.minThreshold);
      setCostPrice(item.costPrice || 0);
      setSellingPrice(item.sellingPrice || 0);
      setSupplier(item.supplier || '');
      setSupplierPhone(item.supplierPhone || '');
      setAdjustDelta(0);
      setSelectedReason('Count');
      setAdjustNote('');
      setSaveSuccess(false);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const isLow = currentStock <= minThreshold && currentStock > 0;
  const isOut = currentStock === 0;
  const isOk = currentStock > minThreshold;

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateStockItemDetails(item.id, {
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim(),
      minThreshold: Number(minThreshold) || 0,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      supplier: supplier.trim(),
      supplierPhone: supplierPhone.trim()
    });

    if (adjustDelta !== 0) {
      const newStockVal = Math.max(0, currentStock + adjustDelta);
      adjustStock(item.id, newStockVal, selectedReason, 'manual', adjustNote || `Manual ${selectedReason} adjustment`);
      setCurrentStock(newStockVal);
      setAdjustDelta(0);
      setAdjustNote('');
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 700);
  };

  const handleApplyDelta = (delta: number) => {
    setAdjustDelta(prev => prev + delta);
  };

  const handleDelete = () => {
    if (window.confirm(`Remove "${item.name}" from stock inventory?`)) {
      deleteStockItem(item.id);
      onClose();
    }
  };

  const recommendedReorderQty = Math.max(minThreshold * 2 - currentStock, 5);
  const supplierWhatsAppUrl = generateSupplierWhatsAppUrl(
    { ...item, name, supplier, supplierPhone, currentStock, minThreshold },
    recommendedReorderQty
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#050b16] border border-cyan-950 w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border ${
              isOut 
                ? 'bg-rose-950/80 border-rose-800 text-rose-400' 
                : isLow 
                ? 'bg-amber-950/80 border-amber-800 text-amber-400' 
                : 'bg-teal-950/80 border-teal-800 text-teal-400'
            }`}>
              {isOut ? 'OUT' : isLow ? 'LOW' : 'OK'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 truncate max-w-[220px]">{item.name}</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {currentStock} {unit} in stock · Min limit: {minThreshold}
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

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {saveSuccess && (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Stock item & movements updated successfully!</span>
            </div>
          )}

          {/* Reorder Loop Alert & Supplier WhatsApp Button */}
          {(isLow || isOut) && (
            <div className="bg-gradient-to-r from-amber-950/40 via-amber-950/20 to-slate-950 border border-amber-800/60 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Reorder Alert · Restock Required
                </span>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  Deficit: {Math.max(0, minThreshold - currentStock)} {unit}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Recommended reorder: <strong>{recommendedReorderQty} {unit}</strong> from {supplier || 'Supplier'}.
              </p>
              
              <a
                href={supplierWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                style={{ minHeight: '44px' }}
              >
                <MessageSquare className="w-4 h-4 text-slate-950" />
                <span>WhatsApp Supplier Reorder ({recommendedReorderQty} {unit})</span>
              </a>
            </div>
          )}

          {/* Quick Manual Adjust Widget with Mandatory Reason Chip */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Manual Stock Adjustment
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                New: {Math.max(0, currentStock + adjustDelta)} {unit}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyDelta(-5)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-rose-400 hover:bg-slate-800"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDelta(-1)}
                  className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 flex items-center justify-center hover:bg-slate-800"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center font-mono">
                <span className="text-lg font-bold text-slate-100 tabular-nums">
                  {adjustDelta > 0 ? `+${adjustDelta}` : adjustDelta}
                </span>
                <span className="block text-[10px] text-slate-500">adjustment</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyDelta(1)}
                  className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 flex items-center justify-center hover:bg-slate-800"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDelta(5)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-teal-400 hover:bg-slate-800"
                >
                  +5
                </button>
              </div>
            </div>

            {/* Mandatory Reason Chip (Count / Damage / Return) */}
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1.5">
                Reason for change (Required for audit log):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {REASONS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedReason(r)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      selectedReason === r
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                    style={{ minHeight: '40px' }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {adjustDelta !== 0 && (
              <input
                type="text"
                value={adjustNote}
                onChange={e => setAdjustNote(e.target.value)}
                placeholder="Optional adjustment note (e.g. Broken bottle, audit recount)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              />
            )}
          </div>

          {/* Template Fields Form */}
          <form onSubmit={handleSaveDetails} className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Item Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="e.g. Staples, Beverages"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Unit of Measure</label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="e.g. bags, crates, kg"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Base Stock Count</label>
                <input
                  type="number"
                  min="0"
                  value={currentStock}
                  onChange={e => setCurrentStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-cyan-300 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Low Alert Limit</label>
                <input
                  type="number"
                  min="0"
                  value={minThreshold}
                  onChange={e => setMinThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-amber-300 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Cost Price (Rs)</label>
                <input
                  type="number"
                  min="0"
                  value={costPrice}
                  onChange={e => setCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Selling Price (Rs)</label>
                <input
                  type="number"
                  min="0"
                  value={sellingPrice}
                  onChange={e => setSellingPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-teal-300 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="e.g. Innodis Ltd"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Supplier Phone (WA)</label>
                <input
                  type="text"
                  value={supplierPhone}
                  onChange={e => setSupplierPhone(e.target.value)}
                  placeholder="+230 5..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition active:scale-95"
                style={{ minHeight: '46px' }}
              >
                <Save className="w-4 h-4" /> Save Item Changes
              </button>
              
              <button
                type="button"
                onClick={handleDelete}
                className="w-12 h-12 rounded-xl bg-rose-950/40 hover:bg-rose-950 border border-rose-800/80 text-rose-400 flex items-center justify-center transition active:scale-95 shrink-0"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
