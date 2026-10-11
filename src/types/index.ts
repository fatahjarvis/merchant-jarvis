/**
 * Core Merchant Jarvis Types & Interfaces
 */

export type OrderStatus = 'New' | 'Preparing' | 'Out' | 'Delivered' | 'Paid';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  merchantId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number; // in MUR (Rs)
  status: OrderStatus;
  deliveryMethod: 'Pickup' | 'Express Delivery' | 'Shop Counter';
  deliveryDueTime: string; // e.g. "14:30"
  deliveryDueDate: string; // "YYYY-MM-DD"
  isDueToday: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LedgerCategory = 'Sale' | 'Expense' | 'Stock';

export interface LedgerEntry {
  id: string;
  merchantId: string;
  type: LedgerCategory;
  amount: number; // in MUR (Rs)
  categoryName: string; // e.g. "Counter Cash", "Supplier FARATA", "Juice delivery"
  note?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: string; // ISO
}

export interface LedgerDayDoc {
  merchantId: string;
  date: string; // YYYY-MM-DD in MUT
  entries: LedgerEntry[];
  totals: {
    sales: number;
    expenses: number;
    net: number;
  };
  entryCount: number;
  updatedAt: string;
}

export interface DailyBudgetStats {
  writes: number;
  reads: number;
  date: string; // YYYY-MM-DD in MUT
  maxWrites: number;
  telemetryLeg: string;
  isRestingTonight: boolean;
  isAmberAlert: boolean;
}

export type StockStatusChip = 'OK' | 'LOW' | 'OUT';

export interface StockItem {
  id: string;
  name: string;
  brand?: string;
  currentStock: number;
  minThreshold: number;
  baseUnit: string;
  sellingFormat: 'unit' | 'pack';
  packContains?: number;
  unitCost: number;
  packCost?: number;
  unitPrice: number;
  packPrice?: number;
  category: string;
  supplier?: string;
  supplierPhone?: string;
  updatedAt?: string;
  // Backward compatibility aliases
  unit?: string;
  costPrice?: number;
  sellingPrice?: number;
}

export type StockAdjustReason = 'Count' | 'Damage' | 'Return' | 'Sale' | 'Restock';

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  delta: number;
  previousStock: number;
  newStock: number;
  reason: StockAdjustReason;
  source: 'manual' | 'door1_csv' | 'door2_vision' | 'door3_voice' | 'sale_deduct' | 'ledger_restock';
  note?: string;
  timestamp: string;
}

export interface StockImportPreviewRow {
  name: string;
  brand?: string;
  currentStock: number;
  minThreshold: number;
  baseUnit: string;
  sellingFormat: 'unit' | 'pack';
  packContains?: number;
  unitCost: number;
  packCost?: number;
  unitPrice: number;
  packPrice?: number;
  category: string;
  supplier?: string;
  supplierPhone?: string;
  isValid: boolean;
  validationError?: string;
  confidence?: number; // For Door 2 vision extraction (0.0 to 1.0)
  isNewCategory?: boolean;
  isNewBaseUnit?: boolean;
  isNewSellingFormat?: boolean;
  // Backward compatibility aliases
  unit?: string;
  costPrice?: number;
  sellingPrice?: number;
}

export interface MerchantProfile {
  merchantId: string;
  shopName: string;
  ownerName: string;
  phone: string;
  email: string;
  shopEmail: string;
  whatsappNumber: string;
  whatsappTemplateEn: string;
  whatsappTemplateFr: string;
  whatsappTemplateSupplier: string; // {supplier}, {item}, {qty}, {shopName}
  salesDecrementStock: boolean; // default ON for mapped items
  ownerUid: string;
  members: string[];
  brn: string; // Business Registration Number Mauritius
  district: string;
  address: string;
  dataSaver: boolean;
  voiceSpeed: number;
  preferredVoice: string;
  isChairmanOperator?: boolean;
}

export interface MailOutboxDoc {
  id: string;
  to: string;
  subject: string;
  body: string;
  queuedAt: string;
  merchantId: string;
  status: 'pending' | 'sent' | 'failed';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  timestamp: string;
  audioSpoken?: boolean;
  contextAction?: string;
}

export type TabKey = 'today' | 'orders' | 'jarvis' | 'ledger' | 'menu';

export interface QueuedSyncAction {
  id: string;
  type: 'ORDER_CREATE' | 'ORDER_UPDATE' | 'LEDGER_ADD' | 'LEDGER_DELETE' | 'PROFILE_UPDATE' | 'MAIL_OUTBOX';
  collection: string; // e.g. 'merchant_profile' | 'orders/{mid}' | 'ledger/{mid}' | 'mail_outbox'
  docId: string;
  path?: string; // full custom doc path if applicable
  payload: Record<string, unknown>;
  queuedAt: string;
}
