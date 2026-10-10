import { Order, LedgerEntry, StockItem, MerchantProfile } from '../types';
import { getMauritiusDateKey, getMauritiusNow } from '../utils/mauritiusTime';

const today = getMauritiusNow();
const todayKey = getMauritiusDateKey(today);

// Calculate previous dates
const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
const yesterdayKey = getMauritiusDateKey(yesterday);

const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
const twoDaysAgoKey = getMauritiusDateKey(twoDaysAgo);

export const DEFAULT_MERCHANT_PROFILE: MerchantProfile = {
  merchantId: 'merchant_pl_001',
  shopName: 'Ti Bazar Central',
  ownerName: 'Devan Seetul',
  phone: '+230 5712 9081',
  email: 'fatahjarvis@gmail.com',
  shopEmail: 'tibazar.central@gmail.com',
  whatsappNumber: '+230 5712 9081',
  whatsappTemplateEn: 'Bonzour {customer}, your order #{orderNumber} from {shopName} is {status}. Total: {amount}. Thank you!',
  whatsappTemplateFr: 'Bonjour {customer}, votre commande #{orderNumber} chez {shopName} est {status}. Total : {amount}. Merci !',
  whatsappTemplateSupplier: '…please supply {qty} {unit} of {item} ({brand})…',
  salesDecrementStock: true,
  ownerUid: 'demo_local_user',
  members: ['demo_local_user'],
  brn: 'C19084723',
  district: 'Port Louis',
  address: '24 Rue La Corderie, Port Louis',
  dataSaver: false,
  voiceSpeed: 1.0,
  preferredVoice: 'Microsoft Ryan',
  isChairmanOperator: true
};

export const INITIAL_STOCK_ITEMS: StockItem[] = [
  {
    id: 'stk_1',
    name: 'Basmati Rice 5kg (Maharani)',
    currentStock: 3,
    minThreshold: 8,
    baseUnit: 'bags',
    sellingFormat: 'unit',
    unitCost: 280,
    unitPrice: 345,
    category: 'Staples',
    supplier: 'Maharani Traders Ltd',
    supplierPhone: '+230 5711 0022'
  },
  {
    id: 'stk_2',
    name: 'Phoenix Beer 650ml (Crate x12)',
    currentStock: 2,
    minThreshold: 6,
    baseUnit: 'crates',
    sellingFormat: 'unit',
    unitCost: 720,
    unitPrice: 890,
    category: 'Beverages',
    supplier: 'Phoenix Beverages Ltd',
    supplierPhone: '+230 5250 8899'
  },
  {
    id: 'stk_3',
    name: 'Farata Flour Les Moulins 2kg',
    currentStock: 4,
    minThreshold: 10,
    baseUnit: 'packs',
    sellingFormat: 'unit',
    unitCost: 62,
    unitPrice: 78,
    category: 'Baking',
    supplier: 'Les Moulins de la Concorde',
    supplierPhone: '+230 5840 1122'
  },
  {
    id: 'stk_4',
    name: 'Anchor Milk Powder 1kg Tin',
    currentStock: 5,
    minThreshold: 12,
    baseUnit: 'tins',
    sellingFormat: 'unit',
    unitCost: 295,
    unitPrice: 360,
    category: 'Dairy',
    supplier: 'Innodis Food Ltd',
    supplierPhone: '+230 5910 4455'
  },
  {
    id: 'stk_5',
    name: 'Yellow Dholl Grams 1kg',
    currentStock: 14,
    minThreshold: 8,
    baseUnit: 'bags',
    sellingFormat: 'unit',
    unitCost: 48,
    unitPrice: 65,
    category: 'Grains',
    supplier: 'Port Louis Grain Distr',
    supplierPhone: '+230 5733 9988'
  },
  {
    id: 'stk_6',
    name: 'Sunlight Dishwashing Liquid 750ml',
    currentStock: 18,
    minThreshold: 6,
    baseUnit: 'bottles',
    sellingFormat: 'unit',
    unitCost: 72,
    unitPrice: 95,
    category: 'Household',
    supplier: 'Unilever Indian Ocean',
    supplierPhone: '+230 5222 3344'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_101',
    merchantId: 'merchant_pl_001',
    orderNumber: '#1042',
    customerName: 'Amina Cassam',
    customerPhone: '+230 5841 2233',
    items: [
      { id: 'i1', name: 'Basmati Rice 5kg', quantity: 1, unitPrice: 345 },
      { id: 'i2', name: 'Anchor Milk Powder 1kg', quantity: 2, unitPrice: 360 },
      { id: 'i3', name: 'Farata Flour 2kg', quantity: 2, unitPrice: 78 }
    ],
    totalAmount: 1221,
    status: 'New',
    deliveryMethod: 'Express Delivery',
    deliveryDueTime: '14:30',
    deliveryDueDate: todayKey,
    isDueToday: true,
    notes: 'Please pack in double paper bags for Plaine Verte delivery',
    createdAt: new Date(today.getTime() - 90 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 90 * 60 * 1000).toISOString()
  },
  {
    id: 'ord_102',
    merchantId: 'merchant_pl_001',
    orderNumber: '#1043',
    customerName: 'Ravi Teeluck',
    customerPhone: '+230 5790 4110',
    items: [
      { id: 'i4', name: 'Phoenix Beer Crate (x12)', quantity: 2, unitPrice: 890 },
      { id: 'i5', name: 'Roasted Peanuts 500g', quantity: 3, unitPrice: 85 }
    ],
    totalAmount: 2035,
    status: 'Preparing',
    deliveryMethod: 'Pickup',
    deliveryDueTime: '16:00',
    deliveryDueDate: todayKey,
    isDueToday: true,
    notes: 'Ravi will collect after office in his van',
    createdAt: new Date(today.getTime() - 150 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 40 * 60 * 1000).toISOString()
  },
  {
    id: 'ord_103',
    merchantId: 'merchant_pl_001',
    orderNumber: '#1044',
    customerName: 'Madame Marie-Claude',
    customerPhone: '+230 5258 7761',
    items: [
      { id: 'i6', name: 'Dholl Grams 1kg', quantity: 3, unitPrice: 65 },
      { id: 'i7', name: 'Sunlight Dishwashing 750ml', quantity: 1, unitPrice: 95 },
      { id: 'i8', name: 'Cooking Oil 2L Moroil', quantity: 2, unitPrice: 195 }
    ],
    totalAmount: 680,
    status: 'Out',
    deliveryMethod: 'Express Delivery',
    deliveryDueTime: '13:00',
    deliveryDueDate: todayKey,
    isDueToday: true,
    notes: 'On bike with courier Sam to Champ de Mars',
    createdAt: new Date(today.getTime() - 210 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 25 * 60 * 1000).toISOString()
  },
  {
    id: 'ord_104',
    merchantId: 'merchant_pl_001',
    orderNumber: '#1040',
    customerName: 'Kiran Gungoo',
    customerPhone: '+230 5912 3344',
    items: [
      { id: 'i9', name: 'Basmati Rice 5kg', quantity: 2, unitPrice: 345 },
      { id: 'i10', name: 'Anchor Milk 1kg', quantity: 1, unitPrice: 360 }
    ],
    totalAmount: 1050,
    status: 'Delivered',
    deliveryMethod: 'Shop Counter',
    deliveryDueTime: '11:15',
    deliveryDueDate: todayKey,
    isDueToday: true,
    notes: 'Customer collected at 11:20 AM',
    createdAt: new Date(today.getTime() - 360 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 180 * 60 * 1000).toISOString()
  },
  {
    id: 'ord_105',
    merchantId: 'merchant_pl_001',
    orderNumber: '#1039',
    customerName: 'Sunil Bhugun',
    customerPhone: '+230 5723 9988',
    items: [
      { id: 'i11', name: 'Sugar 5kg Special Demerara', quantity: 4, unitPrice: 160 },
      { id: 'i12', name: 'Tea Leaves Corson 500g', quantity: 2, unitPrice: 140 }
    ],
    totalAmount: 920,
    status: 'Paid',
    deliveryMethod: 'Pickup',
    deliveryDueTime: '10:00',
    deliveryDueDate: todayKey,
    isDueToday: true,
    notes: 'Paid cash at counter',
    createdAt: new Date(today.getTime() - 480 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 240 * 60 * 1000).toISOString()
  }
];

export const INITIAL_LEDGER_ENTRIES: LedgerEntry[] = [
  {
    id: 'led_1',
    merchantId: 'merchant_pl_001',
    type: 'Sale',
    amount: 920,
    categoryName: 'Counter Cash',
    note: 'Order #1039 cash settlement Sunil',
    date: todayKey,
    time: '10:05',
    timestamp: new Date(today.getTime() - 240 * 60 * 1000).toISOString()
  },
  {
    id: 'led_2',
    merchantId: 'merchant_pl_001',
    type: 'Sale',
    amount: 1050,
    categoryName: 'Juice & Provisions',
    note: 'Order #1040 counter collection Kiran',
    date: todayKey,
    time: '11:25',
    timestamp: new Date(today.getTime() - 180 * 60 * 1000).toISOString()
  },
  {
    id: 'led_3',
    merchantId: 'merchant_pl_001',
    type: 'Expense',
    amount: 350,
    categoryName: 'Logistics Courier',
    note: 'Fuel for delivery motorbike Sam',
    date: todayKey,
    time: '12:10',
    timestamp: new Date(today.getTime() - 130 * 60 * 1000).toISOString()
  },
  {
    id: 'led_4',
    merchantId: 'merchant_pl_001',
    type: 'Stock',
    amount: 1440,
    categoryName: 'Wholesale Purchase',
    note: 'Phoenix Beverages crate deposit restock',
    date: todayKey,
    time: '12:45',
    timestamp: new Date(today.getTime() - 95 * 60 * 1000).toISOString()
  },
  {
    id: 'led_5',
    merchantId: 'merchant_pl_001',
    type: 'Sale',
    amount: 2450,
    categoryName: 'Juice & Provisions',
    note: 'Morning walk-in customers bread & groceries',
    date: todayKey,
    time: '08:30',
    timestamp: new Date(today.getTime() - 320 * 60 * 1000).toISOString()
  },
  // Yesterday
  {
    id: 'led_6',
    merchantId: 'merchant_pl_001',
    type: 'Sale',
    amount: 8600,
    categoryName: 'Counter Cash',
    note: 'Full day store trade',
    date: yesterdayKey,
    time: '18:00',
    timestamp: new Date(yesterday.getTime() + 18 * 3600000).toISOString()
  },
  {
    id: 'led_7',
    merchantId: 'merchant_pl_001',
    type: 'Expense',
    amount: 1200,
    categoryName: 'Utilities & CEB',
    note: 'CEB electricity shop partial advance',
    date: yesterdayKey,
    time: '15:20',
    timestamp: new Date(yesterday.getTime() + 15 * 3600000).toISOString()
  },
  // 2 Days ago
  {
    id: 'led_8',
    merchantId: 'merchant_pl_001',
    type: 'Sale',
    amount: 9400,
    categoryName: 'Counter Cash',
    note: 'Pre-weekend rush groceries',
    date: twoDaysAgoKey,
    time: '18:30',
    timestamp: new Date(twoDaysAgo.getTime() + 18 * 3600000).toISOString()
  }
];
