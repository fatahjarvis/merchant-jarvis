import { GoogleGenAI } from '@google/genai';
import { Order, LedgerEntry, StockItem, MerchantProfile } from '../types';
import { formatRs, getMauritiusNow, formatMauritiusShortTime } from '../utils/mauritiusTime';
import { VoiceStockIntentPayload } from '../components/VoiceStockConfirmSheet';

export interface JarvisResponse {
  speechText: string;
  displayText: string;
  stockIntent?: VoiceStockIntentPayload;
  actionTaken?: {
    type: 'ADD_SALE' | 'ADD_EXPENSE' | 'ADVANCE_ORDER';
    details: string;
  };
}

function findBestMatchingStockItem(query: string, items: StockItem[]): StockItem | null {
  const q = query.toLowerCase();
  // Exact name or substring match
  for (const item of items) {
    const itemNameLower = item.name.toLowerCase();
    if (q.includes(itemNameLower)) return item;

    // Check individual significant words
    const words = itemNameLower.split(/\s+/).filter(w => w.length > 3 && !/^(les|de|la|du|tin|pack|crate|bag|bottle|5kg|2kg|1kg)$/i.test(w));
    if (words.some(w => q.includes(w))) {
      return item;
    }
  }

  // Keyword associations
  if (q.includes('rice') || q.includes('duri')) {
    return items.find(i => /rice|basmati/i.test(i.name)) || null;
  }
  if (q.includes('beer') || q.includes('biere') || q.includes('phoenix')) {
    return items.find(i => /beer|phoenix/i.test(i.name)) || null;
  }
  if (q.includes('flour') || q.includes('farine') || q.includes('farata')) {
    return items.find(i => /flour|farata/i.test(i.name)) || null;
  }
  if (q.includes('milk') || q.includes('lait') || q.includes('anchor')) {
    return items.find(i => /milk|anchor/i.test(i.name)) || null;
  }
  if (q.includes('dholl') || q.includes('dal') || q.includes('grams')) {
    return items.find(i => /dholl|grams/i.test(i.name)) || null;
  }
  if (q.includes('sunlight') || q.includes('soap') || q.includes('dishwashing')) {
    return items.find(i => /sunlight|dishwashing/i.test(i.name)) || null;
  }

  return items[0] || null;
}

export function parseStockIntent(query: string, stockItems: StockItem[]): VoiceStockIntentPayload | null {
  const q = query.toLowerCase().trim();

  // 1. DOOR 3: stock-min (intent to adjust minimum safe stock limit)
  if (
    q.includes('stock-min') || 
    q.includes('stock min') || 
    q.includes('set min') || 
    q.includes('min stock') || 
    q.includes('minimum threshold') || 
    q.includes('min threshold') ||
    q.includes('reorder threshold')
  ) {
    const numMatch = q.match(/(\d+)/);
    if (numMatch) {
      const val = parseInt(numMatch[1], 10);
      const item = findBestMatchingStockItem(q, stockItems);
      if (item) {
        const itemUnit = item.baseUnit || item.unit || 'units';
        const brandStr = item.brand ? ` (${item.brand})` : '';
        return {
          type: 'stock-min',
          item,
          targetValue: val,
          originalValue: item.minThreshold,
          unit: itemUnit,
          speechReadBack: `Confirm setting minimum safe stock threshold for ${item.name}${brandStr} from ${item.minThreshold} to ${val} ${itemUnit}?`
        };
      }
    }
  }

  // 2. DOOR 3: stock-add (intent to increment inventory / received stock)
  if (
    q.includes('stock-add') || 
    q.includes('stock add') || 
    q.startsWith('add ') || 
    q.includes('add more') || 
    q.includes('received ') || 
    q.includes('increment ')
  ) {
    const numMatch = q.match(/(\d+)/);
    if (numMatch) {
      const delta = parseInt(numMatch[1], 10);
      const item = findBestMatchingStockItem(q, stockItems);
      if (item) {
        const nextVal = item.currentStock + delta;
        const itemUnit = item.baseUnit || item.unit || 'units';
        const brandStr = item.brand ? ` (${item.brand})` : '';
        return {
          type: 'stock-add',
          item,
          targetValue: nextVal,
          delta,
          originalValue: item.currentStock,
          unit: itemUnit,
          speechReadBack: `Confirm adding ${delta} ${itemUnit} to ${item.name}${brandStr}? Total will become ${nextVal} ${itemUnit}.`
        };
      }
    }
  }

  // 3. DOOR 3: stock-set (intent to set direct inventory count)
  if (
    q.includes('stock-set') || 
    q.includes('stock set') || 
    q.startsWith('set ') || 
    q.includes('update stock') || 
    q.includes('count ') || 
    q.includes('inventory count')
  ) {
    const numMatch = q.match(/(\d+)/);
    if (numMatch) {
      const targetVal = parseInt(numMatch[1], 10);
      const item = findBestMatchingStockItem(q, stockItems);
      if (item) {
        const itemUnit = item.baseUnit || item.unit || 'units';
        const brandStr = item.brand ? ` (${item.brand})` : '';
        return {
          type: 'stock-set',
          item,
          targetValue: targetVal,
          originalValue: item.currentStock,
          unit: itemUnit,
          speechReadBack: `Confirm updating stock count for ${item.name}${brandStr} from ${item.currentStock} to ${targetVal} ${itemUnit}?`
        };
      }
    }
  }

  return null;
}

export async function askJarvisEngine(
  prompt: string,
  context: {
    orders: Order[];
    ledgerEntries: LedgerEntry[];
    stockItems: StockItem[];
    profile: MerchantProfile;
    isOnline: boolean;
  }
): Promise<JarvisResponse> {
  const query = prompt.trim().toLowerCase();
  const mutNow = getMauritiusNow();
  const todayDateKey = mutNow.toISOString().split('T')[0];

  // 1. Check for DOOR 3 Voice Inventory Intents (stock-set / stock-add / stock-min)
  const stockIntent = parseStockIntent(query, context.stockItems);
  if (stockIntent) {
    const actionLabel = stockIntent.type === 'stock-add' 
      ? `Add +${stockIntent.delta}` 
      : stockIntent.type === 'stock-set' 
      ? `Set to ${stockIntent.targetValue}` 
      : `Min threshold to ${stockIntent.targetValue}`;

    return {
      speechText: stockIntent.speechReadBack,
      displayText: `Voice Intent: [${stockIntent.type.toUpperCase()}]\nTarget SKU: ${stockIntent.item.name}\nProposed: ${stockIntent.originalValue} → ${stockIntent.targetValue} ${stockIntent.unit}\n\nPlease confirm on the sheet below to apply to store inventory.`,
      stockIntent
    };
  }

  // Calculate live numbers
  const todayOrders = context.orders.filter(o => o.deliveryDueDate === todayDateKey || o.isDueToday);
  const openOrders = context.orders.filter(o => o.status !== 'Delivered' && o.status !== 'Paid');
  const deliveriesDueToday = todayOrders.filter(o => o.status === 'New' || o.status === 'Preparing' || o.status === 'Out');
  const lowStock = context.stockItems.filter(s => s.currentStock <= s.minThreshold);

  const todayEntries = context.ledgerEntries.filter(e => e.date === todayDateKey);
  const todaySales = todayEntries.filter(e => e.type === 'Sale').reduce((sum, e) => sum + e.amount, 0);
  const todayExpenses = todayEntries.filter(e => e.type === 'Expense' || e.type === 'Stock').reduce((sum, e) => sum + e.amount, 0);
  const netCash = todaySales - todayExpenses;

  // Local-first fast responses for direct shopkeeper questions
  if (query.includes('stock') || query.includes('inventory') || query.includes('reorder') || query.includes('low')) {
    if (lowStock.length === 0) {
      return {
        speechText: "All store stock is healthy. No items are below minimum threshold.",
        displayText: "All inventory is healthy. No items below threshold."
      };
    }
    const itemNames = lowStock.map(s => `${s.name}${s.brand ? ` (${s.brand})` : ''} (${s.currentStock} ${s.baseUnit || s.unit || 'units'} left)`).join(', ');
    return {
      speechText: `You have ${lowStock.length} items low on stock. ${itemNames}. Consider reordering today.`,
      displayText: `Low stock alert (${lowStock.length} items):\n• ${lowStock.map(s => `${s.name}${s.brand ? ` (${s.brand})` : ''}: ${s.currentStock} ${s.baseUnit || s.unit || 'units'} (Min: ${s.minThreshold})`).join('\n• ')}`
    };
  }

  if (query.includes('summary') || query.includes('today') || query.includes('pulse') || query.includes('overview') || query.includes('status')) {
    const speech = `Here is your day pulse. Today's sales total ${formatRs(todaySales)}. You have ${openOrders.length} active orders, with ${deliveriesDueToday.length} deliveries due today. ${lowStock.length} items are running low.`;
    const display = `Day Pulse Summary:\n• Sales Today: ${formatRs(todaySales)}\n• Active Orders: ${openOrders.length} (${deliveriesDueToday.length} due today)\n• Low Stock: ${lowStock.length} items flagged\n• Net Register: ${formatRs(netCash)}`;
    return { speechText: speech, displayText: display };
  }

  if (query.includes('sale') || query.includes('revenue') || query.includes('ledger') || query.includes('cash') || query.includes('money') || query.includes('register')) {
    const speech = `Today you have recorded ${formatRs(todaySales)} in sales and ${formatRs(todayExpenses)} in expenses. Your net cash balance is ${formatRs(netCash)}.`;
    const display = `Ledger Status:\n• Sales: ${formatRs(todaySales)}\n• Outflows: ${formatRs(todayExpenses)}\n• Net Balance: ${formatRs(netCash)}`;
    return { speechText: speech, displayText: display };
  }

  if (query.includes('order') || query.includes('delivery') || query.includes('courier')) {
    if (deliveriesDueToday.length === 0) {
      return {
        speechText: "No deliveries are scheduled for today. All current orders are either fulfilled or in shop pickup.",
        displayText: "No pending deliveries due today."
      };
    }
    const nextOrder = deliveriesDueToday[0];
    const speech = `You have ${deliveriesDueToday.length} deliveries due today. Next is ${nextOrder.orderNumber} for ${nextOrder.customerName} at ${nextOrder.deliveryDueTime}. Total ${formatRs(nextOrder.totalAmount)}.`;
    const display = `Pending Deliveries (${deliveriesDueToday.length}):\n• ${deliveriesDueToday.map(o => `${o.orderNumber}: ${o.customerName} (${formatRs(o.totalAmount)}) — Due ${o.deliveryDueTime} [${o.status}]`).join('\n• ')}`;
    return { speechText: speech, displayText: display };
  }

  if (query.includes('sms') || query.includes('message') || query.includes('whatsapp') || query.includes('customer')) {
    return {
      speechText: "Here is a standard delivery SMS in Mauritian English: Bonzour, your order from Ti Bazar is prepared and out for delivery. Thank you for shopping with us.",
      displayText: `Customer SMS Template:\n"Bonzour [Customer], your order from ${context.profile.shopName} is ready and out for delivery. Total: [Amount]. Courier will call shortly. Mersi!"`
    };
  }

  // If online and GEMINI_API_KEY is available, consult Gemini model for contextual reasoning
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;

  if (context.isOnline && apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const promptInstruction = `
You are Merchant Jarvis, an AI shop companion for SME shopkeepers in Mauritius by Logixtix Marketing Ltd.
Speak in plain shopkeeper English: short, direct, friendly, and practical sentences.
Never use complicated corporate jargon. Mention Mauritian Rupee (Rs) where applicable.

STORE CONTEXT:
Shop Name: ${context.profile.shopName}
Owner: ${context.profile.ownerName}
Location: ${context.profile.address}, ${context.profile.district}, Mauritius
Time: ${formatMauritiusShortTime(mutNow)} MUT
Today's Sales: Rs ${todaySales}
Today's Expenses: Rs ${todayExpenses}
Net Cash: Rs ${netCash}
Active Orders: ${openOrders.length}
Deliveries Due Today: ${deliveriesDueToday.length}
Low Stock Items: ${lowStock.map(s => `${s.name} (${s.currentStock} left)`).join(', ') || 'None'}

USER QUESTION: "${prompt}"

Provide a concise answer (max 3 short sentences) suitable for text-to-speech.
`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptInstruction
      });
      const text = response.text?.trim() || "Understood. I am keeping track of your shop's operations.";
      return {
        speechText: text,
        displayText: text
      };
    } catch (err) {
      console.warn("Gemini query failed, fallback to local logic:", err);
    }
  }

  // Fallback shopkeeper response
  return {
    speechText: `Jarvis is listening. I am tracking ${openOrders.length} open orders and Rs ${todaySales} in day sales for ${context.profile.shopName}. Ask me about stock, orders, or today's pulse.`,
    displayText: `I'm monitoring your shop:\n• Active orders: ${openOrders.length}\n• Today's sales: ${formatRs(todaySales)}\n• Low stock items: ${lowStock.length}\nTry asking: "Today's summary", "Check low stock", or "Deliveries due".`
  };
}
