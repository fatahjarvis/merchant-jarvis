import React, { useState, useEffect } from 'react';
import { Order, OrderItem } from '../types';
import { useStore } from '../context/StoreContext';
import { getMauritiusDateKey, getMauritiusNow, formatRs } from '../utils/mauritiusTime';
import { X, Plus, Trash2, ShoppingCart, Lock, AlertCircle } from 'lucide-react';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderToEdit?: Order | null;
}

const PRESET_ITEMS: Array<{ name: string; unitPrice: number }> = [
  { name: 'Basmati Rice 5kg', unitPrice: 345 },
  { name: 'Phoenix Beer 650ml Crate', unitPrice: 890 },
  { name: 'Farata Flour 2kg', unitPrice: 78 },
  { name: 'Anchor Milk Powder 1kg', unitPrice: 360 },
  { name: 'Dholl Grams 1kg', unitPrice: 65 },
  { name: 'Cooking Oil 2L Moroil', unitPrice: 195 }
];

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ 
  isOpen, 
  onClose,
  orderToEdit = null
}) => {
  const { addOrder, updateOrder, profile } = useStore();
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditMode = Boolean(orderToEdit);
  const isPaidLocked = isEditMode && orderToEdit?.status === 'Paid';

  useEffect(() => {
    if (orderToEdit) {
      setCustomerName(orderToEdit.customerName || '');
      setCustomerPhone(orderToEdit.customerPhone || '+230 ');
      setDeliveryMethod(orderToEdit.deliveryMethod || 'Express Delivery');
      setDeliveryDueTime(orderToEdit.deliveryDueTime || '15:00');
      setNotes(orderToEdit.notes || '');
      setItems(orderToEdit.items && orderToEdit.items.length > 0 ? [...orderToEdit.items] : [
        { id: 'item_1', name: 'Basmati Rice 5kg', quantity: 1, unitPrice: 345 }
      ]);
      setErrorMessage(null);
    } else {
      setCustomerName('');
      setCustomerPhone('+230 ');
      setDeliveryMethod('Express Delivery');
      setDeliveryDueTime('15:00');
      setNotes('');
      setItems([
        { id: 'item_1', name: 'Basmati Rice 5kg', quantity: 1, unitPrice: 345 }
      ]);
      setErrorMessage(null);
    }
  }, [orderToEdit, isOpen]);

  if (!isOpen) return null;

  // Totals recompute
  const totalAmount = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);

  const handleAddPreset = (preset: { name: string; unitPrice: number }) => {
    if (isPaidLocked) return;
    const existing = items.find(i => i.name === preset.name);
    if (existing) {
      setItems(items.map(i => i.name === preset.name ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { id: `it_${Date.now()}_${Math.random()}`, name: preset.name, quantity: 1, unitPrice: preset.unitPrice }]);
    }
  };

  const handleAddCustomItem = () => {
    if (isPaidLocked) return;
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
    if (isPaidLocked) return;
    setItems(items.filter(i => i.id !== id));
  };

  const handleQuantityChange = (id: string, delta: number) => {
    if (isPaidLocked) return;
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

    if (isPaidLocked) {
      setErrorMessage('correct via Ledger — paid deeds are history');
      return;
    }

    if (isEditMode && orderToEdit) {
      const result = updateOrder(orderToEdit.id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || '+230',
        items,
        totalAmount,
        deliveryMethod,
        deliveryDueTime,
        notes: notes.trim()
      });

      if (!result.success && result.error) {
        setErrorMessage(result.error);
        return;
      }
    } else {
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
    }

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
            <h2 className="text-lg font-bold text-slate-100">
              {isEditMode ? `Edit Order ${orderToEdit?.orderNumber}` : '+ New Customer Order'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paid orders locked message pointer */}
        {isPaidLocked && (
          <div className="bg-amber-950/70 border border-amber-800/80 rounded-xl p-3 text-xs text-amber-300 flex items-center gap-2.5 shadow-md">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold block">Order Locked</span>
              <span>correct via Ledger — paid deeds are history</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-950/70 border border-rose-800/80 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Details */}
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Customer Name *</label>
              <input
                type="text"
                required
                disabled={isPaidLocked}
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Marie Dupont, Vikram Patel"
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none disabled:opacity-60"
                style={{ minHeight: '44px' }}
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Phone Number (WhatsApp)</label>
              <input
                type="tel"
                disabled={isPaidLocked}
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="+230 5..."
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-600 outline-none disabled:opacity-60"
                style={{ minHeight: '44px' }}
              />
            </div>
          </div>

          {/* Delivery Configuration */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Fulfillment Mode</label>
              <select
                disabled={isPaidLocked}
                value={deliveryMethod}
                onChange={e => setDeliveryMethod(e.target.value as any)}
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none disabled:opacity-60"
                style={{ minHeight: '44px' }}
              >
                <option value="Express Delivery">Express Delivery</option>
                <option value="Pickup">Pickup at Shop</option>
                <option value="Shop Counter">Shop Counter</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Target Time</label>
              <input
                type="time"
                disabled={isPaidLocked}
                value={deliveryDueTime}
                onChange={e => setDeliveryDueTime(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-100 outline-none disabled:opacity-60"
                style={{ minHeight: '44px' }}
              />
            </div>
          </div>

          {/* Preset Grocery Items */}
          {!isPaidLocked && (
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Quick Add Popular Items</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ITEMS.map(preset => (
                  <button
                    type="button"
                    key={preset.name}
                    onClick={() => handleAddPreset(preset)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1 active:scale-95 transition"
                  >
                    <Plus className="w-3 h-3 text-cyan-400" />
                    <span>{preset.name}</span>
                    <span className="text-[10px] text-teal-400 font-mono">({formatRs(preset.unitPrice)})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium block">Order Items</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-slate-900/70 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <span className="font-semibold text-slate-200 truncate flex-1 pr-2">{item.name}</span>
                  
                  <div className="flex items-center gap-2">
                    {!isPaidLocked && (
                      <div className="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-cyan-300">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                    )}
                    {isPaidLocked && (
                      <span className="font-mono text-cyan-300 font-bold px-2">{item.quantity}x</span>
                    )}

                    <span className="font-mono text-teal-300 w-16 text-right font-bold">
                      {formatRs(item.unitPrice * item.quantity)}
                    </span>

                    {!isPaidLocked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom line item */}
            {!isPaidLocked && (
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Custom item name..."
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
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Delivery Notes / Landmark</label>
            <input
              type="text"
              disabled={isPaidLocked}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Near Mosque, Call on arrival, Leave with neighbor"
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none disabled:opacity-60"
            />
          </div>

          {/* Total Bar and Submit */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Total Payable</span>
              <span className="font-mono text-xl font-extrabold text-cyan-400">{formatRs(totalAmount)}</span>
            </div>
            
            {isPaidLocked ? (
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-6 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-sm"
              >
                Close (Locked)
              </button>
            ) : (
              <button
                type="submit"
                disabled={!customerName.trim() || items.length === 0}
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-base shadow-[0_0_16px_rgba(6,182,212,0.4)] disabled:opacity-40 hover:brightness-110 active:scale-98 transition"
                style={{ minHeight: '48px' }}
              >
                {isEditMode ? 'Save Order Edits' : 'Confirm Order'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
