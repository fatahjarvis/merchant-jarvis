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
  conflict?: OrderConflictData;
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
  denominationUnit?: string; // 'ml', 'L', 'g', 'Kg'
  denominationAmount?: number; // e.g. 5, 650
  updatedAt?: string;
  // Backward compatibility aliases
  unit?: string;
  costPrice?: number;
  sellingPrice?: number;
  unitMeasure?: string;
  unitMeasureAmount?: number;
}

export type CloudChoiceMode = 'estate' | 'custom' | 'local_only';

export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  userAgent?: string;
  lastSync: string;
  createdAt: string;
  isCurrent?: boolean;
}

export interface OrderConflictData {
  deviceA: {
    source: string;
    status: OrderStatus;
    items: OrderItem[];
    totalAmount: number;
    updatedAt: string;
  };
  deviceB: {
    source: string;
    status: OrderStatus;
    items: OrderItem[];
    totalAmount: number;
    updatedAt: string;
  };
  detectedAt: string;
  conflictFields: string[];
}

export type StockAdjustReason = 'Count' | 'Damage' | 'Return' | 'Sale' | 'Restock' | 'ConflictMerge';

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  delta: number;
  previousStock: number;
  newStock: number;
  reason: StockAdjustReason;
  source: 'manual' | 'door1_csv' | 'door2_vision' | 'door3_voice' | 'sale_deduct' | 'ledger_restock' | 'conflict_merge';
  note?: string;
  timestamp: string;
}

export interface StockImportPreviewRow {
  name: string;
  brand?: string;
  denominationUnit?: string; // 'ml', 'L', 'g', 'Kg'
  denominationAmount?: number; // e.g. 5, 650
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
  isNewBrand?: boolean;
  isNewDenominationUnit?: boolean;
  // Backward compatibility aliases
  unit?: string;
  costPrice?: number;
  sellingPrice?: number;
  unitMeasure?: string;
  unitMeasureAmount?: number;
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

export interface CloudSnapshot {
  id: string;
  merchantId: string;
  date: string; // YYYY-MM-DD
  ordersCount: number;
  ledgerCount: number;
  stockCount: number;
  payload: {
    orders: any[];
    ledgerEntries: any[];
    stockItems: any[];
    profile: any;
  };
  createdAt: string;
}

export type LicenceTier = 'FREE_PILOT' | 'COMMERCIAL_BASIC' | 'COMMERCIAL_PRO';
export type LicenceState = 'NONE' | 'FREE_PILOT' | 'ACTIVE' | 'QUEUED' | 'EXPIRED';

export interface LicenceKeyPayload {
  product: string;
  tier: LicenceTier;
  seats: number;
  skuCap: number;
  shops: number;
  org: string;
  issuedAt: string;
  expiry: string;
}

