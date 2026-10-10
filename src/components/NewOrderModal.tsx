import React, { useState } from 'react';
import { OrderItem } from '../types';
import { useStore } from '../context/StoreContext';
import { getMauritiusDateKey, getMauritiusNow, formatRs } from '../utils/mauritiusTime';
import { X, Plus, Trash2, ShoppingCart } from 'lucide-react';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ITEMS: Array<{ name: string; unitPrice: number }> = [
  { name: 'Basmati Rice 5kg', unitPrice: 345 },
  { name: 'Phoenix Beer 650ml Crate', unitPrice: 890 },
  { name: 'Farata Flour 2kg', unitPrice: 78 },
  { name: 'Anchor Milk Powder 1kg', unitPrice: 360 },
  { name: 'Dholl Grams 1kg', unitPrice: 65 },
  { name: 'Cooking Oil 2L Moroil', unitPrice: 195 }
];

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose }) => {
  const { addOrder, profile } = useStore();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+230 ');
  const [deliveryMethod, setDeliveryMethod] = useState<'Pickup' | 'Express Delivery' | 'Shop Counter'>('Express Delivery');
  const [deliveryDueTime, setDeliveryDueTime] = useState('15:00');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { id: 'item_1', name: 'Basmati Rice 5kg', quantity: 1, unitPrice: 345 }
  ]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);

  const handleAddPreset = (preset: { name: string; unitPrice: number }) => {
    const existing = items.find(i => i.name === preset.name);
    if (existing) {
      setItems(items.map(i => i.name === preset.name ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { id: `it_${Date.now()}_${Math.random()}`, name: preset.name, quantity: 1, unitPrice: preset.unitPrice }]);
    }
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim() || !customItemPrice) return;
    const priceNum = parseFloat(customItemPrice) || 0;
    setItems([...items, {
      id: `it_${Date.now()}`,
      name: customItemName.trim(),
      quantity: 1,
      unitPrice: priceNum
    }]);
    setCustomItemName('');
    setCustomItemPrice('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleQuantityChange = (id: string, delta: number) => {
    setItems(items.map(i => {
      if (i.id === id) {
        const nextQ = Math.max(1, i.quantity + delta);
        return { ...i, quantity: nextQ };
      }
      return i;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || items.length === 0) return;

    const todayDateKey = getMauritiusDateKey(getMauritiusNow());

    await addOrder({
      merchantId: profile.merchantId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || '+230',
      items,
      totalAmount,
      status: 'New',
      deliveryMethod,
      deliveryDueTime,
      deliveryDueDate: todayDateKey,
      isDueToday: true,
      notes: notes.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div 
        className="w-full max-w-md bg-[#0a0f1d] border-t sm:border border-cyan-900/60 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">+ New Customer Order</h2>
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
          {/* Customer details */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Customer Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Marie-Louise, Dev, Sam"
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-3 text-base text-slate-100 placeholder:text-slate-600 outline-none"
                style={{ minHeight: '44px' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Phone (Mauritius)</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="+230 5..."
                  className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-3 text-base font-mono text-slate-100 outline-none"
                  style={{ minHeight: '44px' }}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Due Time (MUT)</label>
                <input
                  type="time"
                  value={deliveryDueTime}
                  onChange={e => setDeliveryDueTime(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-3 text-base font-mono text-slate-100 outline-none"
                  style={{ minHeight: '44px' }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Fulfillment Mode</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Pickup', 'Express Delivery', 'Shop Counter'] as const).map(mode => (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => setDeliveryMethod(mode)}
                    className={`py-2 px-1 text-xs rounded-lg font-medium border transition ${
                      deliveryMethod === mode
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800'
                    }`}
                    style={{ minHeight: '44px' }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Quick Grocery Presets</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ITEMS.map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleAddPreset(p)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1 active:scale-95"
                  style={{ minHeight: '36px' }}
                >
                  <Plus className="w-3 h-3 text-cyan-400" />
                  <span>{p.name}</span>
                  <span className="font-mono text-[11px] text-teal-400">({p.unitPrice})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-900">
            <label className="text-xs text-slate-400 font-medium block">Order Items ({items.length})</label>
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-900 text-sm">
                <span className="text-slate-200 truncate flex-1 font-medium">{item.name}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item.id, -1)}
                    className="w-7 h-7 rounded bg-slate-900 text-slate-300 flex items-center justify-center font-bold"
                  >-</button>
                  <span className="font-mono text-cyan-300 font-bold px-1.5 text-xs">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(item.id, 1)}
                    className="w-7 h-7 rounded bg-slate-900 text-slate-300 flex items-center justify-center font-bold"
                  >+</button>
                  <span className="font-mono text-slate-300 text-xs w-16 text-right">
                    {formatRs(item.unitPrice * item.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-rose-400 p-1 hover:text-rose-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Add custom item row */}
            <div className="pt-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="Custom item name"
                value={customItemName}
                onChange={e => setCustomItemName(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none"
              />
              <input
                type="number"
                placeholder="Rs"
                value={customItemPrice}
                onChange={e => setCustomItemPrice(e.target.value)}
                className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-200 outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="px-2.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded-lg text-xs font-semibold"
              >
                Add
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Delivery Notes / Landmark</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Near Mosque, Call on arrival, Leave with neighbor"
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none"
            />
          </div>

          {/* Total Bar and Submit */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Total Payable</span>
              <span className="font-mono text-xl font-extrabold text-cyan-400">{formatRs(totalAmount)}</span>
            </div>
            <button
              type="submit"
              disabled={!customerName.trim() || items.length === 0}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-base shadow-[0_0_16px_rgba(6,182,212,0.4)] disabled:opacity-40 hover:brightness-110 active:scale-98 transition"
              style={{ minHeight: '48px' }}
            >
              Confirm Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
