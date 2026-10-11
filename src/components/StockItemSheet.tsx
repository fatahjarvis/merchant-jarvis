import React, { useState, useEffect } from 'react';
import { StockItem, StockAdjustReason } from '../types';
import { useStore } from '../context/StoreContext';
import { formatRs } from '../utils/mauritiusTime';
import { 
  getStockStatusChip, 
  getSellingFormatQty, 
  STANDARD_MEASURE_UNITS, 
  STANDARD_BRANDS 
} from '../utils/stockUtils';
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
  Tag, 
  Building2,
  Layers
} from 'lucide-react';

interface StockItemSheetProps {
  item: StockItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const REASONS: StockAdjustReason[] = ['Count', 'Damage', 'Return', 'Restock'];

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

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('General');
  const [baseUnit, setBaseUnit] = useState('units');
  const [sellingFormat, setSellingFormat] = useState<'unit' | 'pack'>('unit');
  const [packContains, setPackContains] = useState<number>(1);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minThreshold, setMinThreshold] = useState<number>(5);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [packCost, setPackCost] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [packPrice, setPackPrice] = useState<number>(0);
  const [denominationUnit, setDenominationUnit] = useState('');
  const [denominationAmount, setDenominationAmount] = useState<number | ''>('');
  const [supplier, setSupplier] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  
  // Manual adjust state
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [selectedReason, setSelectedReason] = useState<StockAdjustReason>('Count');
  const [adjustNote, setAdjustNote] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setBrand(item.brand || '');
      setDenominationUnit(item.denominationUnit || item.unitMeasure || '');
      setDenominationAmount(item.denominationAmount ?? item.unitMeasureAmount ?? '');
      setCategory(item.category || 'General');
      setBaseUnit(item.baseUnit || item.unit || 'units');
      setSellingFormat(item.sellingFormat || 'unit');
      setPackContains(item.packContains || 1);
      setCurrentStock(item.currentStock || 0);
      setMinThreshold(item.minThreshold || 5);
      setUnitCost(item.unitCost ?? item.costPrice ?? 0);
      setPackCost(item.packCost ?? ((item.unitCost ?? item.costPrice ?? 0) * (item.packContains || 1)));
      setUnitPrice(item.unitPrice ?? item.sellingPrice ?? 0);
      setPackPrice(item.packPrice ?? ((item.unitPrice ?? item.sellingPrice ?? 0) * (item.packContains || 1)));
      setSupplier(item.supplier || '');
      setSupplierPhone(item.supplierPhone || '');
      setAdjustDelta(0);
      setSelectedReason('Count');
      setAdjustNote('');
      setSaveSuccess(false);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  // Status chip computed on selling-format qty
  const status = getStockStatusChip({
    ...item,
    currentStock,
    minThreshold,
    sellingFormat,
    packContains
  });
  const isOut = status === 'OUT';
  const isLow = status === 'LOW';

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateStockItemDetails(item.id, {
      name: name.trim(),
      brand: brand.trim() || undefined,
      denominationUnit: denominationUnit.trim() || undefined,
      denominationAmount: denominationAmount !== '' ? Number(denominationAmount) : undefined,
      unitMeasure: denominationUnit.trim() || undefined,
      unitMeasureAmount: denominationAmount !== '' ? Number(denominationAmount) : undefined,
      category: category.trim(),
      baseUnit: baseUnit.trim(),
      sellingFormat,
      packContains: sellingFormat === 'pack' ? Math.max(1, packContains) : 1,
      minThreshold: Number(minThreshold) || 0,
      unitCost: Number(unitCost) || 0,
      packCost: Number(packCost) || 0,
      unitPrice: Number(unitPrice) || 0,
      packPrice: Number(packPrice) || 0,
      supplier: supplier.trim(),
      supplierPhone: supplierPhone.trim()
    });

    if (adjustDelta !== 0) {
      const newStockVal = Math.max(0, currentStock + adjustDelta);
      adjustStock(
        item.id, 
        newStockVal, 
        selectedReason, 
        'manual', 
        adjustNote || `Manual ${selectedReason} adjustment`
      );
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

  const currentItemDraft: StockItem = {
    ...item,
    name,
    brand,
    supplier,
    supplierPhone,
    currentStock,
    minThreshold,
    baseUnit,
    sellingFormat,
    packContains,
    unitCost,
    packCost,
    unitPrice,
    packPrice
  };

  // Reorder suggestion rounds up to whole packs
  let reorderQty: number;
  let unitLabel: string;
  if (sellingFormat === 'pack' && packContains > 1) {
    const deficitBase = Math.max(1, (minThreshold * packContains * 2) - currentStock);
    reorderQty = Math.max(1, Math.ceil(deficitBase / packContains));
    unitLabel = 'packs';
  } else {
    reorderQty = Math.max(1, (minThreshold * 2) - currentStock);
    unitLabel = baseUnit || 'units';
  }

  const supplierWhatsAppUrl = generateSupplierWhatsAppUrl(currentItemDraft);

  const displaySellingQty = getSellingFormatQty(currentItemDraft);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
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
              {status}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 truncate max-w-[220px]">
                {name || item.name}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {currentStock} {baseUnit} in stock
                {sellingFormat === 'pack' && packContains > 1 && ` · (${displaySellingQty} packs of ${packContains})`}
                {' · '}Min limit: {minThreshold}
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
                  {sellingFormat === 'pack' ? `${reorderQty} packs` : `${reorderQty} ${baseUnit}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Recommended reorder: <strong>{reorderQty} {unitLabel}</strong> from {supplier || 'Supplier'}.
              </p>
              
              <a
                href={supplierWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                style={{ minHeight: '44px' }}
              >
                <MessageSquare className="w-4 h-4 text-slate-950" />
                <span>WhatsApp Supplier Reorder ({reorderQty} {unitLabel})</span>
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
                New: {Math.max(0, currentStock + adjustDelta)} {baseUnit}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyDelta(-5)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-bold"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDelta(-1)}
                  className="w-9 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>

              <span className={`font-mono text-base font-bold px-3 py-1 rounded-lg border ${
                adjustDelta > 0 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                  : adjustDelta < 0 
                  ? 'bg-rose-950 text-rose-300 border-rose-800' 
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                {adjustDelta > 0 ? `+${adjustDelta}` : adjustDelta}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyDelta(1)}
                  className="w-9 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyDelta(5)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-bold"
                >
                  +5
                </button>
              </div>
            </div>

            {adjustDelta !== 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <span className="text-[11px] text-slate-400 font-medium block">
                  Adjustment Reason (Required):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {REASONS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedReason(r)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                        selectedReason === r 
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400' 
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  placeholder="Optional note e.g. Counted during morning shelf check"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                />
              </div>
            )}
          </div>

          {/* Full Stock Item Edit Form (v2 Fields) */}
          <form onSubmit={handleSaveDetails} className="space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-850">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Stock Model v2 Fields
              </span>
              <span className="text-[10px] font-mono text-cyan-400">Merchant Jarvis v1.0.1</span>
            </div>

            {/* Name & Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Brand</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    list="stock-brands-list"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="e.g. Phoenix, Maharani"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
                  />
                  <datalist id="stock-brands-list">
                    {STANDARD_BRANDS.map(b => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Unit Denomination (ml, L, g, Kg) & Amount */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Unit Denomination</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    list="stock-measure-units-list"
                    value={denominationUnit}
                    onChange={e => setDenominationUnit(e.target.value)}
                    placeholder="e.g. Kg, ml, L, g"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-cyan-300 font-mono outline-none focus:border-cyan-500"
                  />
                  <datalist id="stock-measure-units-list">
                    {STANDARD_MEASURE_UNITS.map(u => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Unit Amount</label>
                <input
                  type="number"
                  step="any"
                  value={denominationAmount}
                  onChange={e => setDenominationAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="e.g. 5 (for 5 Kg)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Category & Base Unit */}
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
                <label className="text-xs text-slate-400 font-medium block mb-1">Base Unit</label>
                <input
                  type="text"
                  value={baseUnit}
                  onChange={e => setBaseUnit(e.target.value)}
                  placeholder="e.g. bottles, bags, kg"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none font-mono"
                />
              </div>
            </div>

            {/* Selling Format & Pack Contains */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Selling Format</label>
                <select
                  value={sellingFormat}
                  onChange={e => setSellingFormat(e.target.value as 'unit' | 'pack')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none font-mono"
                >
                  <option value="unit">unit (Single)</option>
                  <option value="pack">pack (Case / Multipack)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Pack Contains</label>
                <input
                  type="number"
                  min="1"
                  disabled={sellingFormat !== 'pack'}
                  value={packContains}
                  onChange={e => {
                    const count = Math.max(1, parseInt(e.target.value, 10) || 1);
                    setPackContains(count);
                    setPackCost(Number((unitCost * count).toFixed(2)));
                    setPackPrice(Number((unitPrice * count).toFixed(2)));
                  }}
                  className={`w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono outline-none ${
                    sellingFormat === 'pack' ? 'text-cyan-300' : 'text-slate-600 opacity-60'
                  }`}
                />
              </div>
            </div>

            {/* Stock Count & Threshold */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Current Stock ({baseUnit})</label>
                <input
                  type="number"
                  min="0"
                  value={currentStock}
                  onChange={e => setCurrentStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-cyan-300 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  Min Threshold ({sellingFormat === 'pack' ? 'packs' : baseUnit})
                </label>
                <input
                  type="number"
                  min="0"
                  value={minThreshold}
                  onChange={e => setMinThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-amber-300 outline-none"
                />
              </div>
            </div>

            {/* Unit Cost & Pack Cost */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Unit Cost (Rs)</label>
                <input
                  type="number"
                  min="0"
                  value={unitCost}
                  onChange={e => {
                    const cost = Math.max(0, parseFloat(e.target.value) || 0);
                    setUnitCost(cost);
                    if (sellingFormat === 'pack') {
                      setPackCost(Number((cost * packContains).toFixed(2)));
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Pack Cost (Rs)</label>
                <input
                  type="number"
                  min="0"
                  value={packCost}
                  onChange={e => setPackCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-300 outline-none"
                />
              </div>
            </div>

            {/* Unit Price & Pack Price */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Unit Price (Rs)</label>
                <input
                  type="number"
                  min="0"
                  value={unitPrice}
                  onChange={e => {
                    const price = Math.max(0, parseFloat(e.target.value) || 0);
                    setUnitPrice(price);
                    if (sellingFormat === 'pack') {
                      setPackPrice(Number((price * packContains).toFixed(2)));
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-teal-300 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Pack Price (Rs)</label>
                <input
                  type="number"
                  min="0"
                  value={packPrice}
                  onChange={e => setPackPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-teal-400 outline-none"
                />
              </div>
            </div>

            {/* Supplier & Phone */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="e.g. Phoenix Beverages"
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

            {/* Actions */}
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
