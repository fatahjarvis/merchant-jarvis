import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Order, 
  OrderStatus, 
  LedgerEntry, 
  LedgerCategory, 
  StockItem, 
  StockMovement,
  StockAdjustReason,
  MerchantProfile, 
  QueuedSyncAction,
  MailOutboxDoc,
  LedgerDayDoc,
  DailyBudgetStats,
  CloudChoiceMode,
  DeviceSession,
  OrderConflictData,
  OrderItem,
  CloudSnapshot,
  LicenceKeyPayload,
  LicenceState
} from '../types';
import { 
  DEFAULT_MERCHANT_PROFILE, 
  INITIAL_ORDERS, 
  INITIAL_LEDGER_ENTRIES, 
  INITIAL_STOCK_ITEMS
} from '../data/seedData';
import { 
  auth, 
  db, 
  checkAuthorizedOperator, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  fbSignOut, 
  onAuthStateChanged,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  saveEstateConfigOverride,
  resetEstateConfig,
  getActiveEstateConfig,
  probeFirebaseConfig
} from '../utils/firebase';
import { User } from 'firebase/auth';
import { getMauritiusDateKey, getMauritiusNow, formatMauritiusShortTime, formatRs } from '../utils/mauritiusTime';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { generateSupplierWhatsAppUrl as buildSupplierWhatsAppUrl } from '../utils/stockUtils';
import { verifyDevicePin } from '../utils/security';

const STORAGE_KEYS = {
  ORDERS: 'mjarvis_orders_v1',
  LEDGER: 'mjarvis_ledger_v1',
  STOCK: 'mjarvis_stock_v1',
  STOCK_MOVEMENTS: 'mjarvis_stock_movements_v1',
  PROFILE: 'mjarvis_profile_v1',
  SYNC_QUEUE: 'mjarvis_sync_queue_v1',
  DATA_SAVER: 'mjarvis_data_saver_v1',
  HAS_MERGED_DEMO: 'mjarvis_demo_merged_v1',
  BUDGET_WRITES: 'mjarvis_budget_writes',
  BUDGET_READS: 'mjarvis_budget_reads',
  CLOUD_CHOICE: 'mjarvis_cloud_choice_v1',
  DEVICE_ID: 'mjarvis_device_id_v1',
  DEVICE_SESSIONS: 'mjarvis_device_sessions_v1',
  CLOUD_SNAPSHOTS: 'mjarvis_cloud_snapshots_v1',
  PRIVACY_CONSENT: 'mjarvis_privacy_consent_',
  TELEMETRY_ENABLED: 'mjarvis_telemetry_enabled_v1'
};

export const PRIVACY_NOTICES: Record<CloudChoiceMode, string> = {
  local_only: "Merchant Jarvis stores your shop's records only on this device. Logixtix Marketing Ltd collects nothing from your shop book. Minimal technical telemetry (app health counters) may be sent to keep the app reliable; you can switch it off in Settings. Your data stays yours: export or erase it anytime from Menu → Privacy & Data.",
  estate: "Your shop's records travel encrypted and rest in the estate's secure cloud (Singapore region). Logixtix Marketing Ltd acts as processor; you remain controller of your customers' details. We collect only what the shop needs: shop profile, contact details, orders, ledger and stock records, plus minimal off-able telemetry. Export or erase your drawer anytime. Rights under the Data Protection Act 2017 (Mauritius) apply.",
  custom: "Your shop's records live in YOUR own cloud account. Logixtix Marketing Ltd stores nothing of your shop book; we keep only your contact details for support and licensing, plus minimal off-able telemetry. You control retention and access entirely."
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  'New': 'Preparing',
  'Preparing': 'Out',
  'Out': 'Delivered',
  'Delivered': 'Paid',
  'Paid': null
};

const MAX_DAILY_WRITES = 300;
const AMBER_THRESHOLD = 180; // 60% of 300 writes limit

const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov_seed_1',
    itemId: 'stk_2',
    itemName: 'Phoenix Beer 650ml (Crate x12)',
    delta: 2,
    previousStock: 0,
    newStock: 2,
    reason: 'Restock',
    source: 'ledger_restock',
    note: 'Wholesale Purchase Phoenix restock',
    timestamp: new Date().toISOString()
  },
  {
    id: 'mov_seed_2',
    itemId: 'stk_1',
    itemName: 'Basmati Rice 5kg (Maharani)',
    delta: -1,
    previousStock: 4,
    newStock: 3,
    reason: 'Sale',
    source: 'sale_deduct',
    note: 'Order #1042 fulfilled',
    timestamp: new Date().toISOString()
  }
];

interface StoreContextType {
  orders: Order[];
  ledgerEntries: LedgerEntry[];
  stockItems: StockItem[];
  stockMovements: StockMovement[];
  profile: MerchantProfile;
  user: User | null;
  isAuthorizedOperator: boolean;
  authLoading: boolean;
  isOnline: boolean;
  syncQueueCount: number;
  dataSaver: boolean;
  isConfigOverridden: boolean;
  budgetStats: DailyBudgetStats;
  budgetNotice: string | null;
  // Order actions
  advanceOrderStatus: (orderId: string) => Promise<OrderStatus | null>;
  setOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  addOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => Promise<Order>;
  updateOrder: (orderId: string, updates: Partial<Order>) => { success: boolean; error?: string };
  deleteOrder: (orderId: string) => Promise<void>;
  // Ledger actions
  addLedgerEntry: (amount: number, type: LedgerCategory, categoryName: string, note?: string) => Promise<LedgerEntry>;
  deleteLedgerEntry: (id: string) => Promise<void>;
  queueEmailDayBook: (targetDateKey?: string) => Promise<{ success: boolean; message: string; docId?: string }>;
  // WhatsApp helper
  generateWhatsAppUrl: (order: Order, lang?: 'en' | 'fr') => string;
  generateSupplierWhatsAppUrl: (item: StockItem, qtyNeeded?: number) => string;
  // Stock actions
  updateStock: (id: string, newStock: number) => void;
  adjustStock: (itemId: string, newStock: number, reason: StockAdjustReason, source: StockMovement['source'], note?: string) => void;
  addNewStockItem: (item: Omit<StockItem, 'id'>) => StockItem;
  updateStockItemDetails: (id: string, partial: Partial<StockItem>) => void;
  deleteStockItem: (id: string) => void;
  addOrMergeStockItems: (items: Array<Omit<StockItem, 'id'>>, source: 'door1_csv' | 'door2_vision') => { merged: number; added: number };
  // Profile & settings
  updateProfile: (partial: Partial<MerchantProfile>) => void;
  toggleDataSaver: () => void;
  // Estate Cloud config actions
  saveCustomCloudConfig: (jsonString: string) => void;
  resetToEstateCloudDefault: () => void;
  // Auth & Cloud Merge actions
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  pendingCloudMerge: { ordersCount: number; ledgerCount: number; stockCount: number; user: User } | null;
  confirmCloudMerge: () => Promise<void>;
  cancelCloudMerge: () => void;
  // Sync
  triggerSync: () => Promise<void>;
  // Cloud Choice & Multi-Device
  cloudChoice: CloudChoiceMode;
  setCloudChoiceMode: (mode: CloudChoiceMode) => void;
  probeCustomCloudConfig: (configJson: string) => Promise<{ success: boolean; projectId?: string; error?: string }>;
  deviceId: string;
  deviceName: string;
  deviceSessions: DeviceSession[];
  signOutElsewhere: () => Promise<void>;
  // Conflict Manners
  simulateOrderConflict: (orderId: string) => void;
  resolveOrderConflict: (orderId: string, resolution: 'keep_a' | 'keep_b' | 'merge') => void;
  // v49b Diagnostics & Backups & Snapshots & Danger Zone
  syncLatencyMs: number;
  storagePayloadKb: number;
  cloudSnapshots: CloudSnapshot[];
  downloadBackup: (compressed: boolean) => Promise<void>;
  restoreBackup: (fileContent: string | ArrayBuffer, isCompressed: boolean) => Promise<{ success: boolean; message: string }>;
  restoreCloudSnapshot: (snapshotId: string) => Promise<void>;
  resetShopData: () => void;
  factoryResetShop: () => Promise<void>;
  // v48 Compliance Manners
  privacyConsentGiven: boolean;
  setPrivacyConsentGiven: (given: boolean) => void;
  telemetryEnabled: boolean;
  toggleTelemetry: () => void;
  exportDrawer: () => void;
  eraseDrawer: (pin: string) => Promise<{ success: boolean; message: string }>;
  // v50 Licence
  licenceKey: LicenceKeyPayload | null;
  licenceState: LicenceState;
  activateLicence: (key: string) => Promise<boolean>;
  deleteLicence: (pin: string) => Promise<boolean>;
  checkTierGate: (gate: 'stock-add' | 'device-signin' | 'shop-count') => boolean;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isOnline = useOnlineStatus();
  const mutTodayKey = getMauritiusDateKey(getMauritiusNow());

  // Load local state from localStorage with seed fallbacks
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEDGER);
      return saved ? JSON.parse(saved) : INITIAL_LEDGER_ENTRIES;
    } catch {
      return INITIAL_LEDGER_ENTRIES;
    }
  });

  const [stockItems, setStockItems] = useState<StockItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STOCK);
      return saved ? JSON.parse(saved) : INITIAL_STOCK_ITEMS;
    } catch {
      return INITIAL_STOCK_ITEMS;
    }
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS);
      return saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
    } catch {
      return INITIAL_STOCK_MOVEMENTS;
    }
  });

  const [profile, setProfile] = useState<MerchantProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : DEFAULT_MERCHANT_PROFILE;
    } catch {
      return DEFAULT_MERCHANT_PROFILE;
    }
  });

  const [syncQueue, setSyncQueue] = useState<QueuedSyncAction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dataSaver, setDataSaver] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.DATA_SAVER) === 'true';
    } catch {
      return false;
    }
  });

  const [isConfigOverridden, setIsConfigOverridden] = useState<boolean>(() => {
    return getActiveEstateConfig().isOverridden;
  });

  const [deviceId] = useState<string>(() => {
    try {
      let id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (!id) {
        id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id);
      }
      return id;
    } catch {
      return `dev_${Date.now().toString(36)}`;
    }
  });

  const [deviceName] = useState<string>(() => {
    if (typeof navigator === 'undefined') return 'Merchant Terminal';
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'iPhone / iPad';
    if (/Android/.test(ua)) return 'Android Device';
    if (/Macintosh/.test(ua)) return 'Mac Desktop';
    if (/Windows/.test(ua)) return 'Windows Terminal';
    if (/Linux/.test(ua)) return 'Linux Station';
    return 'Shop Counter';
  });

  const [cloudChoice, setCloudChoice] = useState<CloudChoiceMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLOUD_CHOICE) as CloudChoiceMode;
      if (saved === 'estate' || saved === 'custom' || saved === 'local_only') return saved;
      return getActiveEstateConfig().isOverridden ? 'custom' : 'estate';
    } catch {
      return 'estate';
    }
  });

  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEVICE_SESSIONS);
      if (saved) return JSON.parse(saved);
    } catch {}
    const defaultName = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent) ? 'Android Device' : 'Shop Counter (This device)';
    return [
      {
        deviceId: 'dev_current',
        deviceName: defaultName,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        lastSync: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isCurrent: true
      },
      {
        deviceId: 'dev_est_counter_01',
        deviceName: 'Shop Counter Tablet',
        userAgent: 'Mozilla/5.0 (Android Tablet; Mauritius Retail)',
        lastSync: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        isCurrent: false
      }
    ];
  });

  const [syncLatencyMs, setSyncLatencyMs] = useState<number>(42);

  const [privacyConsentGiven, setPrivacyConsentGivenState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`${STORAGE_KEYS.PRIVACY_CONSENT}_${cloudChoice}`) === 'true';
    } catch {
      return false;
    }
  });

  const setPrivacyConsentGiven = useCallback((given: boolean) => {
    setPrivacyConsentGivenState(given);
    try {
      localStorage.setItem(`${STORAGE_KEYS.PRIVACY_CONSENT}_${cloudChoice}`, given ? 'true' : 'false');
    } catch {}
  }, [cloudChoice]);

  useEffect(() => {
    try {
      const given = localStorage.getItem(`${STORAGE_KEYS.PRIVACY_CONSENT}_${cloudChoice}`) === 'true';
      setPrivacyConsentGivenState(given);
    } catch {
      setPrivacyConsentGivenState(false);
    }
  }, [cloudChoice]);

  const [telemetryEnabled, setTelemetryEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TELEMETRY_ENABLED);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleTelemetry = useCallback(() => {
    setTelemetryEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.TELEMETRY_ENABLED, next ? 'true' : 'false');
      } catch {}
      return next;
    });
  }, []);

  const exportDrawer = useCallback(() => {
    const data = {
      version: 'v48',
      merchantId: profile.merchantId,
      shopName: profile.shopName,
      exportedAt: new Date().toISOString(),
      profile,
      orders,
      ledgerEntries,
      stockItems,
      stockMovements
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merchant_jarvis_drawer_${profile.merchantId}_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [profile, orders, ledgerEntries, stockItems, stockMovements]);

  const eraseDrawer = useCallback(async (pin: string): Promise<{ success: boolean; message: string }> => {
    const valid = await verifyDevicePin(pin);
    if (!valid) {
      return { success: false, message: 'Invalid device PIN.' };
    }
    try {
      const currentUser = auth?.currentUser;
      if (currentUser && db && cloudChoice !== 'local_only') {
        await deleteDoc(doc(db, 'merchants', profile.merchantId)).catch(() => {});
      }
    } catch {}

    setOrders([]);
    setLedgerEntries([]);
    setStockItems([]);
    setStockMovements([]);
    setSyncQueue([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
      localStorage.removeItem(STORAGE_KEYS.LEDGER);
      localStorage.removeItem(STORAGE_KEYS.STOCK);
      localStorage.removeItem(STORAGE_KEYS.STOCK_MOVEMENTS);
      localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
    } catch {}

    console.info('[audit] drawer-erased');
    return { success: true, message: 'Drawer successfully erased.' };
  }, [cloudChoice, profile.merchantId]);

  const [cloudSnapshots, setCloudSnapshots] = useState<CloudSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLOUD_SNAPSHOTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [licenceState, setLicenceState] = useState<LicenceState>('FREE_PILOT');
  const [licenceKey, setLicenceKey] = useState<LicenceKeyPayload | null>(null);

  const activateLicence = useCallback(async (key: string): Promise<boolean> => {
    // Placeholder: call verifyLicenceKey, set state
    return false;
  }, []);

  const deleteLicence = useCallback(async (pin: string): Promise<boolean> => {
    const valid = await verifyDevicePin(pin);
    if (!valid) return false;
    setLicenceState('FREE_PILOT');
    setLicenceKey(null);
    return true;
  }, []);

  const checkTierGate = useCallback((gate: 'stock-add' | 'device-signin' | 'shop-count') => {
    // Placeholder logic for v50 gates
    return true; 
  }, [licenceKey]);



  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLOUD_SNAPSHOTS, JSON.stringify(cloudSnapshots));
    } catch {}
  }, [cloudSnapshots]);

  const storagePayloadKb = useMemo(() => {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mjarvis_')) {
          const val = localStorage.getItem(key) || '';
          totalBytes += key.length + val.length;
        }
      }
      return Math.round((totalBytes / 1024) * 10) / 10;
    } catch {
      return 0;
    }
  }, [orders, ledgerEntries, stockItems, profile, syncQueue, cloudSnapshots]);

  // Auto-snapshot at ledger day-roll
  const takeSnapshotIfNeeded = useCallback(() => {
    if (cloudChoice === 'local_only') return;
    const todayStr = mutTodayKey;
    setCloudSnapshots(prev => {
      if (prev.some(s => s.date === todayStr)) return prev;
      const newSnap: CloudSnapshot = {
        id: `snap_${Date.now()}`,
        merchantId: profile.merchantId,
        date: todayStr,
        ordersCount: orders.length,
        ledgerCount: ledgerEntries.length,
        stockCount: stockItems.length,
        payload: { orders, ledgerEntries, stockItems, profile },
        createdAt: new Date().toISOString()
      };
      const combined = [newSnap, ...prev];
      if (combined.length > 14) {
        console.info('[audit] pruned cloud snapshot older than 14 days');
        combined.length = 14;
      }
      return combined;
    });
  }, [cloudChoice, mutTodayKey, orders, ledgerEntries, stockItems, profile]);

  const downloadBackup = async (compressed: boolean) => {
    const backupData = {
      version: 'v49b',
      merchantId: profile.merchantId,
      shopName: profile.shopName,
      createdAt: new Date().toISOString(),
      orders,
      ledgerEntries,
      stockItems,
      stockMovements,
      profile,
      deviceSessions
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    let blobData: BlobPart = jsonStr;
    let ext = 'json';

    if (compressed && typeof CompressionStream !== 'undefined') {
      try {
        const stream = new Response(jsonStr).body!.pipeThrough(new CompressionStream('gzip'));
        blobData = await new Response(stream).arrayBuffer();
        ext = 'z';
      } catch (err) {
        console.warn("Compression failed, fallback to JSON", err);
      }
    }

    const blob = new Blob([blobData], { type: ext === 'z' ? 'application/octet-stream' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merchant_jarvis_backup_${profile.merchantId}_${getMauritiusDateKey(new Date())}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restoreBackup = async (fileContent: string | ArrayBuffer, isCompressed: boolean): Promise<{ success: boolean; message: string }> => {
    try {
      let jsonStr = '';
      if (isCompressed && fileContent instanceof ArrayBuffer && typeof DecompressionStream !== 'undefined') {
        const stream = new Response(fileContent).body!.pipeThrough(new DecompressionStream('gzip'));
        jsonStr = await new Response(stream).text();
      } else if (typeof fileContent === 'string') {
        jsonStr = fileContent;
      } else if (fileContent instanceof ArrayBuffer) {
        jsonStr = new TextDecoder().decode(fileContent);
      } else {
        return { success: false, message: 'Invalid backup file format.' };
      }

      const parsed = JSON.parse(jsonStr);
      if (!parsed.orders || !parsed.ledgerEntries || !parsed.stockItems) {
        return { success: false, message: 'Invalid backup schema: missing orders, ledger, or stock.' };
      }

      setOrders(parsed.orders);
      setLedgerEntries(parsed.ledgerEntries);
      setStockItems(parsed.stockItems);
      if (parsed.stockMovements) setStockMovements(parsed.stockMovements);
      if (parsed.profile) setProfile(parsed.profile);
      if (parsed.deviceSessions) setDeviceSessions(parsed.deviceSessions);

      const msg = `${parsed.orders.length} orders, ${parsed.ledgerEntries.length} ledger lines, ${parsed.stockItems.length} stock items successfully restored.`;
      return { success: true, message: msg };
    } catch (err: any) {
      return { success: false, message: `Restore error: ${err.message || 'Failed to parse backup'}` };
    }
  };

  const restoreCloudSnapshot = async (snapshotId: string) => {
    const snap = cloudSnapshots.find(s => s.id === snapshotId);
    if (!snap) return;
    setOrders(snap.payload.orders || []);
    setLedgerEntries(snap.payload.ledgerEntries || []);
    setStockItems(snap.payload.stockItems || []);
    if (snap.payload.profile) setProfile(snap.payload.profile);
  };

  const resetShopData = () => {
    setOrders([]);
    setLedgerEntries([]);
    setStockItems([]);
    setStockMovements([]);
    setSyncQueue([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
      localStorage.removeItem(STORAGE_KEYS.LEDGER);
      localStorage.removeItem(STORAGE_KEYS.STOCK);
      localStorage.removeItem(STORAGE_KEYS.STOCK_MOVEMENTS);
      localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
    } catch {}
    console.info('[telemetry] danger-zone reset-shop-data');
  };

  const factoryResetShop = async () => {
    try {
      await logout();
    } catch {}
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('mjarvis_') || key.startsWith('firebase:'))) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
    setOrders(INITIAL_ORDERS);
    setLedgerEntries(INITIAL_LEDGER_ENTRIES);
    setStockItems(INITIAL_STOCK_ITEMS);
    setStockMovements([]);
    setSyncQueue([]);
    setProfile(DEFAULT_MERCHANT_PROFILE);
    setCloudSnapshots([]);
    console.info('[telemetry] danger-zone factory-reset');
  };

  // Client daily counters: writes and reads (MUT date based)
  const [dailyWrites, setDailyWrites] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEYS.BUDGET_WRITES}_${mutTodayKey}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [dailyReads, setDailyReads] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEYS.BUDGET_READS}_${mutTodayKey}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorizedOperator, setIsAuthorizedOperator] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [pendingCloudMerge, setPendingCloudMerge] = useState<{
    ordersCount: number;
    ledgerCount: number;
    stockCount: number;
    user: User;
  } | null>(null);

  // Sync state to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.warn("Could not save orders to localStorage", e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledgerEntries));
    } catch (e) {
      console.warn("Could not save ledger to localStorage", e);
    }
  }, [ledgerEntries]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stockItems));
    } catch (e) {
      console.warn("Could not save stock to localStorage", e);
    }
  }, [stockItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(stockMovements));
    } catch (e) {
      console.warn("Could not save stockMovements to localStorage", e);
    }
  }, [stockMovements]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn("Could not save profile to localStorage", e);
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(syncQueue));
    } catch (e) {
      console.warn("Could not save syncQueue to localStorage", e);
    }
  }, [syncQueue]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DATA_SAVER, String(dataSaver));
    } catch (e) {
      console.warn("Could not save dataSaver to localStorage", e);
    }
  }, [dataSaver]);

  // Persist budget counters
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEYS.BUDGET_WRITES}_${mutTodayKey}`, String(dailyWrites));
    } catch {}
  }, [dailyWrites, mutTodayKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEYS.BUDGET_READS}_${mutTodayKey}`, String(dailyReads));
    } catch {}
  }, [dailyReads, mutTodayKey]);

  // Queue helper
  const enqueueSyncAction = useCallback((action: QueuedSyncAction) => {
    setSyncQueue(prev => [...prev, action]);
  }, []);

  // Merge demo data on first sign-in (Clause 5: requires user confirm before cloud write)
  const handleFirstSignInMerge = useCallback(async (signedInUser: User) => {
    const uid = signedInUser.uid;
    const hasMerged = localStorage.getItem(`${STORAGE_KEYS.HAS_MERGED_DEMO}_${uid}`) === 'true';

    const updatedProfile: MerchantProfile = {
      ...profile,
      merchantId: uid,
      ownerUid: uid,
      email: signedInUser.email || profile.email,
      members: Array.from(new Set([...(profile.members || []), uid]))
    };

    setProfile(updatedProfile);
    setOrders(prev => prev.map(o => ({ ...o, merchantId: uid })));
    setLedgerEntries(prev => prev.map(l => ({ ...l, merchantId: uid })));

    if (!hasMerged) {
      // First sign-in shows merge read-back requiring confirm before any cloud write
      setPendingCloudMerge({
        ordersCount: orders.length,
        ledgerCount: ledgerEntries.length,
        stockCount: stockItems.length,
        user: signedInUser
      });
    }
  }, [profile, orders.length, ledgerEntries.length, stockItems.length]);

  const confirmCloudMerge = useCallback(async () => {
    if (!pendingCloudMerge || !db) {
      setPendingCloudMerge(null);
      return;
    }
    const uid = pendingCloudMerge.user.uid;
    const signedInEmail = pendingCloudMerge.user.email || profile.email;
    const updatedProfile: MerchantProfile = {
      ...profile,
      merchantId: uid,
      ownerUid: uid,
      email: signedInEmail,
      members: Array.from(new Set([...(profile.members || []), uid]))
    };
    setProfile(updatedProfile);

    try {
      const profileRef = doc(db, 'merchant_profile', uid);
      await setDoc(profileRef, {
        ...updatedProfile,
        auditLine: `Claimed by ${signedInEmail} at ${new Date().toISOString()}`
      }, { merge: true });

      setDailyWrites(w => w + 1);
      localStorage.setItem(`${STORAGE_KEYS.HAS_MERGED_DEMO}_${uid}`, 'true');
      console.info(`[telemetry] cloud-merge confirmed (${pendingCloudMerge.ordersCount} orders, ${pendingCloudMerge.ledgerCount} ledger lines, ${pendingCloudMerge.stockCount} stock items)`);
    } catch (err) {
      console.warn("Cloud tenancy auto-merge write error:", err);
    } finally {
      setPendingCloudMerge(null);
    }
  }, [pendingCloudMerge, profile]);

  const cancelCloudMerge = useCallback(() => {
    setPendingCloudMerge(null);
  }, []);

  // Auth subscription (no polling)
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const isOperator = await checkAuthorizedOperator(currentUser);
          setIsAuthorizedOperator(isOperator);
          setDailyReads(r => r + 1);
        } catch {
          setIsAuthorizedOperator(false);
        }
        await handleFirstSignInMerge(currentUser);
      } else {
        setIsAuthorizedOperator(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [handleFirstSignInMerge]);

  /**
   * Sync background runner:
   * Clause 5: queue drain disabled while guest
   * (1) Ledger day-book stored as ONE doc per merchant per day with entries[]
   * (2) Per-device daily write budget 300
   * (3) Telemetry leg 'cloud-budget r/w' emitted at each sync drain
   */
  const triggerSync = useCallback(async () => {
    if (cloudChoice === 'local_only') return; // Clause 2: Local Only disables all sync
    if (!isOnline || !db || syncQueue.length === 0) return;
    if (!user) return; // Clause 5: queue drain disabled while guest
    const hasMerged = localStorage.getItem(`${STORAGE_KEYS.HAS_MERGED_DEMO}_${user.uid}`) === 'true';
    if (!hasMerged) return; // Clause 5: requiring confirm before any cloud write

    if (dailyWrites >= MAX_DAILY_WRITES) {
      const leg = `cloud-budget r/w: ${dailyReads}/${dailyWrites} (budget resting tonight)`;
      console.info(`[telemetry] ${leg}`);
      return;
    }

    let writesUsedInBatch = 0;
    const remainingQueue: QueuedSyncAction[] = [];

    const ledgerDatesToSync = new Set<string>();
    const nonLedgerItems: QueuedSyncAction[] = [];

    for (const item of syncQueue) {
      if (item.collection === 'ledger' || item.collection === 'ledger_entries') {
        const entryDate = (item.payload?.date as string) || mutTodayKey;
        ledgerDatesToSync.add(entryDate);
      } else {
        nonLedgerItems.push(item);
      }
    }

    for (const dateKey of ledgerDatesToSync) {
      if (dailyWrites + writesUsedInBatch >= MAX_DAILY_WRITES) {
        remainingQueue.push({
          id: `sync_ledger_day_${dateKey}_${Date.now()}`,
          type: 'LEDGER_ADD',
          collection: 'ledger',
          docId: `${profile.merchantId}_${dateKey}`,
          payload: { date: dateKey },
          queuedAt: new Date().toISOString()
        });
        continue;
      }

      try {
        const dayEntries = ledgerEntries.filter(e => e.date === dateKey);
        const daySales = dayEntries.filter(e => e.type === 'Sale').reduce((s, e) => s + e.amount, 0);
        const dayExpenses = dayEntries.filter(e => e.type === 'Expense' || e.type === 'Stock').reduce((s, e) => s + e.amount, 0);

        const dayBookDoc: LedgerDayDoc = {
          merchantId: profile.merchantId,
          date: dateKey,
          entries: dayEntries,
          totals: {
            sales: daySales,
            expenses: dayExpenses,
            net: daySales - dayExpenses
          },
          entryCount: dayEntries.length,
          updatedAt: new Date().toISOString()
        };

        const dayBookRef = doc(db, 'ledger_days', `${profile.merchantId}_${dateKey}`);
        await setDoc(dayBookRef, dayBookDoc, { merge: true });
        writesUsedInBatch += 1;
      } catch (err) {
        console.warn("Failed syncing day-book doc for", dateKey, err);
        remainingQueue.push({
          id: `sync_ledger_day_${dateKey}_${Date.now()}`,
          type: 'LEDGER_ADD',
          collection: 'ledger',
          docId: `${profile.merchantId}_${dateKey}`,
          payload: { date: dateKey },
          queuedAt: new Date().toISOString()
        });
      }
    }

    for (const item of nonLedgerItems) {
      if (dailyWrites + writesUsedInBatch >= MAX_DAILY_WRITES) {
        remainingQueue.push(item);
        continue;
      }

      try {
        let docRef;
        if (item.path) {
          const parts = item.path.split('/');
          if (parts.length === 2) {
            docRef = doc(db, parts[0], parts[1]);
          } else if (parts.length === 4) {
            docRef = doc(db, parts[0], parts[1], parts[2], parts[3]);
          } else {
            docRef = doc(db, item.collection, item.docId);
          }
        } else if (item.collection === 'orders') {
          docRef = doc(db, 'orders', profile.merchantId, 'order_items', item.docId);
        } else if (item.collection === 'mail_outbox') {
          docRef = doc(db, 'mail_outbox', item.docId);
        } else {
          docRef = doc(db, item.collection, item.docId);
        }

        if (item.type === 'ORDER_UPDATE' && item.payload._deleted) {
          await deleteDoc(docRef);
        } else {
          await setDoc(docRef, item.payload, { merge: true });
        }
        writesUsedInBatch += 1;
      } catch (err) {
        console.warn("Failed syncing non-ledger item", item.id, err);
        remainingQueue.push(item);
      }
    }

    const updatedTotalWrites = dailyWrites + writesUsedInBatch;
    setDailyWrites(updatedTotalWrites);
    setSyncQueue(remainingQueue);

    const telemetryLeg = `cloud-budget r/w: ${dailyReads}/${updatedTotalWrites}`;
    console.info(`[telemetry] ${telemetryLeg} (drained ${writesUsedInBatch} writes, remaining queued: ${remainingQueue.length})`);
  }, [isOnline, syncQueue, dailyWrites, dailyReads, mutTodayKey, profile.merchantId, ledgerEntries]);

  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && dailyWrites < MAX_DAILY_WRITES) {
      triggerSync();
    }
  }, [isOnline, syncQueue.length, dailyWrites, triggerSync]);

  // Movements: sales decrement stock (default ON for mapped items)
  const decrementStockForOrder = useCallback((orderToFulfill: Order) => {
    if (!profile.salesDecrementStock) return;
    if ((orderToFulfill as any)._stockDecremented) return;

    setStockItems(currentStockItems => {
      const movementsToAdd: StockMovement[] = [];
      const updatedStockList = currentStockItems.map(stock => {
        const matchedItem = orderToFulfill.items.find(oi => 
          oi.name.toLowerCase().trim() === stock.name.toLowerCase().trim() ||
          stock.name.toLowerCase().includes(oi.name.toLowerCase().trim()) ||
          oi.name.toLowerCase().includes(stock.name.toLowerCase().trim())
        );

        if (matchedItem && matchedItem.quantity > 0) {
          const prev = stock.currentStock;
          const nextStock = Math.max(0, prev - matchedItem.quantity);
          const delta = nextStock - prev;
          movementsToAdd.push({
            id: `mov_sale_${Date.now()}_${Math.random()}`,
            itemId: stock.id,
            itemName: stock.name,
            delta,
            previousStock: prev,
            newStock: nextStock,
            reason: 'Sale',
            source: 'sale_deduct',
            note: `Order ${orderToFulfill.orderNumber} fulfilled`,
            timestamp: new Date().toISOString()
          });
          return { ...stock, currentStock: nextStock, updatedAt: new Date().toISOString() };
        }
        return stock;
      });

      if (movementsToAdd.length > 0) {
        setStockMovements(mPrev => [...movementsToAdd, ...mPrev]);
      }

      return updatedStockList;
    });
  }, [profile.salesDecrementStock]);

  // Order actions
  const advanceOrderStatus = useCallback(async (orderId: string): Promise<OrderStatus | null> => {
    let next: OrderStatus | null = null;

    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId) {
        const nextStatus = NEXT_STATUS[ord.status];
        next = nextStatus;
        if (!nextStatus) return ord;

        const updated = {
          ...ord,
          status: nextStatus,
          updatedAt: new Date().toISOString()
        };

        if ((nextStatus === 'Delivered' || nextStatus === 'Paid') && !(ord as any)._stockDecremented) {
          decrementStockForOrder(ord);
          (updated as any)._stockDecremented = true;
        }

        enqueueSyncAction({
          id: `sync_${Date.now()}_${Math.random()}`,
          type: 'ORDER_UPDATE',
          collection: 'orders',
          path: `orders/${profile.merchantId}/order_items/${ord.id}`,
          docId: ord.id,
          payload: { ...updated } as unknown as Record<string, unknown>,
          queuedAt: new Date().toISOString()
        });

        return updated;
      }
      return ord;
    }));

    return next;
  }, [enqueueSyncAction, profile.merchantId, decrementStockForOrder]);

  const setOrderStatus = useCallback(async (orderId: string, status: OrderStatus): Promise<void> => {
    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId) {
        const updated = {
          ...ord,
          status,
          updatedAt: new Date().toISOString()
        };

        if ((status === 'Delivered' || status === 'Paid') && !(ord as any)._stockDecremented) {
          decrementStockForOrder(ord);
          (updated as any)._stockDecremented = true;
        }

        enqueueSyncAction({
          id: `sync_${Date.now()}_${Math.random()}`,
          type: 'ORDER_UPDATE',
          collection: 'orders',
          path: `orders/${profile.merchantId}/order_items/${ord.id}`,
          docId: ord.id,
          payload: { ...updated } as unknown as Record<string, unknown>,
          queuedAt: new Date().toISOString()
        });

        return updated;
      }
      return ord;
    }));
  }, [enqueueSyncAction, profile.merchantId, decrementStockForOrder]);

  const addOrder = useCallback(async (
    orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>
  ): Promise<Order> => {
    const newNumber = `#${1040 + orders.length + 1}`;
    const newId = `ord_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newOrder: Order = {
      ...orderData,
      id: newId,
      merchantId: profile.merchantId,
      orderNumber: newNumber,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    setOrders(prev => [newOrder, ...prev]);

    enqueueSyncAction({
      id: `sync_${Date.now()}`,
      type: 'ORDER_CREATE',
      collection: 'orders',
      path: `orders/${profile.merchantId}/order_items/${newId}`,
      docId: newId,
      payload: { ...newOrder } as unknown as Record<string, unknown>,
      queuedAt: nowIso
    });

    return newOrder;
  }, [orders.length, enqueueSyncAction, profile.merchantId]);

  const updateOrder = useCallback((orderId: string, updates: Partial<Order>): { success: boolean; error?: string } => {
    let errorMsg: string | undefined;
    let success = false;

    setOrders(prev => {
      const target = prev.find(o => o.id === orderId);
      if (!target) {
        errorMsg = 'Order not found';
        return prev;
      }
      if (target.status === 'Paid') {
        errorMsg = 'correct via Ledger — paid deeds are history';
        return prev;
      }

      const newItems = updates.items || target.items;
      const recomputedTotal = newItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const changedKeys = Object.keys(updates).filter(k => (target as any)[k] !== (updates as any)[k]);
      const nowIso = new Date().toISOString();

      const updated: Order = {
        ...target,
        ...updates,
        items: newItems,
        totalAmount: updates.totalAmount ?? recomputedTotal,
        updatedAt: nowIso
      };

      const logLine = `order-edited (${changedKeys.join(', ') || 'fields'})`;
      console.info(`[telemetry] ${logLine}`);

      // Record audit stock movement line
      const auditMovement: StockMovement = {
        id: `mov_${Date.now()}_${Math.random()}`,
        itemId: target.id,
        itemName: `Order ${target.orderNumber}`,
        delta: 0,
        previousStock: 0,
        newStock: 0,
        reason: 'Count',
        source: 'manual',
        note: logLine,
        timestamp: nowIso
      };
      setStockMovements(mPrev => [auditMovement, ...mPrev]);

      enqueueSyncAction({
        id: `sync_${Date.now()}`,
        type: 'ORDER_UPDATE',
        collection: 'orders',
        path: `orders/${profile.merchantId}/order_items/${orderId}`,
        docId: orderId,
        payload: { ...updated } as unknown as Record<string, unknown>,
        queuedAt: nowIso
      });

      success = true;
      return prev.map(o => o.id === orderId ? updated : o);
    });

    return { success, error: errorMsg };
  }, [enqueueSyncAction, profile.merchantId]);

  const deleteOrder = useCallback(async (orderId: string): Promise<void> => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    enqueueSyncAction({
      id: `sync_${Date.now()}`,
      type: 'ORDER_UPDATE',
      collection: 'orders',
      path: `orders/${profile.merchantId}/order_items/${orderId}`,
      docId: orderId,
      payload: { _deleted: true },
      queuedAt: new Date().toISOString()
    });
  }, [enqueueSyncAction, profile.merchantId]);

  // Ledger actions: ledger Stock entries increment
  const addLedgerEntry = useCallback(async (
    amount: number, 
    type: LedgerCategory, 
    categoryName: string, 
    note?: string
  ): Promise<LedgerEntry> => {
    const now = getMauritiusNow();
    const dateKey = getMauritiusDateKey(now);
    const timeStr = formatMauritiusShortTime(now);
    const newId = `led_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newEntry: LedgerEntry = {
      id: newId,
      merchantId: profile.merchantId,
      type,
      amount,
      categoryName: categoryName.trim() || (type === 'Sale' ? 'Counter Cash' : 'Store Expense'),
      note: note?.trim(),
      date: dateKey,
      time: timeStr,
      timestamp: nowIso
    };

    setLedgerEntries(prev => [newEntry, ...prev]);

    // If type is Stock, check if any inventory item matches categoryName or note to increment
    if (type === 'Stock') {
      setStockItems(currentStockItems => {
        const matched = currentStockItems.find(s => 
          (categoryName && s.name.toLowerCase().includes(categoryName.toLowerCase())) ||
          (note && s.name.toLowerCase().includes(note.toLowerCase()))
        );
        if (matched) {
          const qtyMatch = note?.match(/(\d+)\s*(bags?|crates?|packs?|tins?|bottles?|units?|kg)?/i);
          const inc = qtyMatch ? parseInt(qtyMatch[1], 10) : 5;
          const prev = matched.currentStock;
          const nextStock = prev + inc;
          const movement: StockMovement = {
            id: `mov_restock_${Date.now()}`,
            itemId: matched.id,
            itemName: matched.name,
            delta: inc,
            previousStock: prev,
            newStock: nextStock,
            reason: 'Restock',
            source: 'ledger_restock',
            note: `Ledger Stock: ${categoryName} (Rs ${amount})`,
            timestamp: new Date().toISOString()
          };
          setStockMovements(mPrev => [movement, ...mPrev]);
          return currentStockItems.map(s => s.id === matched.id ? { ...s, currentStock: nextStock, updatedAt: new Date().toISOString() } : s);
        }
        return currentStockItems;
      });
    }

    enqueueSyncAction({
      id: `sync_day_${dateKey}_${Date.now()}`,
      type: 'LEDGER_ADD',
      collection: 'ledger',
      path: `ledger_days/${profile.merchantId}_${dateKey}`,
      docId: `${profile.merchantId}_${dateKey}`,
      payload: { date: dateKey },
      queuedAt: nowIso
    });

    return newEntry;
  }, [profile.merchantId, enqueueSyncAction]);

  const deleteLedgerEntry = useCallback(async (id: string): Promise<void> => {
    const entry = ledgerEntries.find(e => e.id === id);
    const dateKey = entry?.date || mutTodayKey;
    setLedgerEntries(prev => prev.filter(e => e.id !== id));

    enqueueSyncAction({
      id: `sync_day_${dateKey}_${Date.now()}`,
      type: 'LEDGER_ADD',
      collection: 'ledger',
      path: `ledger_days/${profile.merchantId}_${dateKey}`,
      docId: `${profile.merchantId}_${dateKey}`,
      payload: { date: dateKey },
      queuedAt: new Date().toISOString()
    });
  }, [ledgerEntries, mutTodayKey, enqueueSyncAction, profile.merchantId]);

  // Shop Voice: 'Email me my day book'
  const queueEmailDayBook = useCallback(async (targetDateKey?: string) => {
    const dateKey = targetDateKey || getMauritiusDateKey(getMauritiusNow());
    const entries = ledgerEntries.filter(e => e.date === dateKey);
    const sales = entries.filter(e => e.type === 'Sale').reduce((s, e) => s + e.amount, 0);
    const expenses = entries.filter(e => e.type === 'Expense' || e.type === 'Stock').reduce((s, e) => s + e.amount, 0);
    const net = sales - expenses;

    const recipient = profile.shopEmail || profile.email || 'devan@tibazar.mu';
    const mailId = `mail_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const bodyText = `
Day Book Summary: ${profile.shopName}
Estate Tenancy: ${profile.merchantId}
Date: ${dateKey} (Mauritius Time MUT)
Owner: ${profile.ownerName} (${profile.phone})

--- SUMMARY ---
Total Sales: ${formatRs(sales)}
Total Outflows/Expenses: ${formatRs(expenses)}
Net Cash Register: ${formatRs(net)}

--- DETAILED ENTRIES (${entries.length}) ---
${entries.map(e => `• [${e.time}] ${e.type.toUpperCase()}: ${formatRs(e.amount)} — ${e.categoryName} ${e.note ? `(${e.note})` : ''}`).join('\n') || 'No transactions recorded for this date.'}

---
Dispatched by Merchant Jarvis · Estate Mailer
Logixtix Marketing Ltd · Mauritius
    `.trim();

    const mailDoc: MailOutboxDoc = {
      id: mailId,
      to: recipient,
      subject: `Day Book Summary - ${profile.shopName} [${dateKey}]`,
      body: bodyText,
      queuedAt: nowIso,
      merchantId: profile.merchantId,
      status: 'pending'
    };

    enqueueSyncAction({
      id: `sync_mail_${Date.now()}`,
      type: 'MAIL_OUTBOX',
      collection: 'mail_outbox',
      path: `mail_outbox/${mailId}`,
      docId: mailId,
      payload: { ...mailDoc } as unknown as Record<string, unknown>,
      queuedAt: nowIso
    });

    return {
      success: true,
      message: `Day book email for ${dateKey} queued to ${recipient}`,
      docId: mailId
    };
  }, [ledgerEntries, profile, enqueueSyncAction]);

  // WhatsApp customer template helper
  const generateWhatsAppUrl = useCallback((order: Order, lang: 'en' | 'fr' = 'en') => {
    let phone = order.customerPhone.replace(/\D/g, '');
    if (phone.length === 8 && (phone.startsWith('5') || phone.startsWith('6'))) {
      phone = `230${phone}`;
    }

    const template = lang === 'fr' 
      ? (profile.whatsappTemplateFr || 'Bonjour {customer}, votre commande #{orderNumber} chez {shopName} est {status}. Total : {amount}. Merci !')
      : (profile.whatsappTemplateEn || 'Bonzour {customer}, your order #{orderNumber} from {shopName} is {status}. Total: {amount}. Thank you!');

    const message = template
      .replace('{customer}', order.customerName)
      .replace('{orderNumber}', order.orderNumber.replace('#', ''))
      .replace('{shopName}', profile.shopName)
      .replace('{status}', order.status)
      .replace('{amount}', formatRs(order.totalAmount));

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }, [profile]);

  // Reorder loop: Supplier WhatsApp template helper (Stock Model v2)
  const generateSupplierWhatsAppUrl = useCallback((item: StockItem) => {
    return buildSupplierWhatsAppUrl(item, profile).url;
  }, [profile]);

  // Stock actions
  const updateStock = useCallback((id: string, newStock: number) => {
    setStockItems(prev => prev.map(s => s.id === id ? { ...s, currentStock: Math.max(0, newStock) } : s));
  }, []);

  const adjustStock = useCallback((
    itemId: string, 
    newStock: number, 
    reason: StockAdjustReason, 
    source: StockMovement['source'], 
    note?: string
  ) => {
    setStockItems(prev => {
      const target = prev.find(s => s.id === itemId);
      if (!target) return prev;
      const prevStock = target.currentStock;
      const safeNew = Math.max(0, newStock);
      const delta = safeNew - prevStock;

      const movement: StockMovement = {
        id: `mov_${Date.now()}_${Math.random()}`,
        itemId,
        itemName: target.name,
        delta,
        previousStock: prevStock,
        newStock: safeNew,
        reason,
        source,
        note,
        timestamp: new Date().toISOString()
      };

      setStockMovements(mPrev => [movement, ...mPrev]);

      return prev.map(s => s.id === itemId ? { ...s, currentStock: safeNew, updatedAt: new Date().toISOString() } : s);
    });
  }, []);

  const addNewStockItem = useCallback((newItemData: Omit<StockItem, 'id'>): StockItem => {
    const newId = `stk_${Date.now()}`;
    const newItem: StockItem = {
      ...newItemData,
      id: newId,
      updatedAt: new Date().toISOString()
    };

    setStockItems(prev => [newItem, ...prev]);

    const movement: StockMovement = {
      id: `mov_${Date.now()}`,
      itemId: newId,
      itemName: newItem.name,
      delta: newItem.currentStock,
      previousStock: 0,
      newStock: newItem.currentStock,
      reason: 'Count',
      source: 'manual',
      note: 'New SKU registered',
      timestamp: new Date().toISOString()
    };
    setStockMovements(mPrev => [movement, ...mPrev]);

    return newItem;
  }, []);

  const updateStockItemDetails = useCallback((id: string, partial: Partial<StockItem>) => {
    setStockItems(prev => prev.map(s => s.id === id ? { ...s, ...partial, updatedAt: new Date().toISOString() } : s));
  }, []);

  const deleteStockItem = useCallback((id: string) => {
    setStockItems(prev => prev.filter(s => s.id !== id));
  }, []);

  const addOrMergeStockItems = useCallback((
    incomingItems: Array<Omit<StockItem, 'id'>>,
    source: 'door1_csv' | 'door2_vision'
  ): { merged: number; added: number } => {
    let mergedCount = 0;
    let addedCount = 0;
    const nowIso = new Date().toISOString();
    const newMovements: StockMovement[] = [];

    setStockItems(prev => {
      let currentList = [...prev];

      for (const item of incomingItems) {
        const trimmedName = item.name.trim();
        const existingIdx = currentList.findIndex(
          s => s.name.toLowerCase().trim() === trimmedName.toLowerCase()
        );

        if (existingIdx >= 0) {
          const existing = currentList[existingIdx];
          const delta = item.currentStock - existing.currentStock;
          const updated: StockItem = {
            ...existing,
            brand: item.brand || existing.brand,
            denominationUnit: item.denominationUnit || existing.denominationUnit,
            denominationAmount: item.denominationAmount ?? existing.denominationAmount,
            currentStock: item.currentStock,
            minThreshold: item.minThreshold || existing.minThreshold,
            baseUnit: item.baseUnit || existing.baseUnit,
            sellingFormat: item.sellingFormat || existing.sellingFormat,
            packContains: item.packContains || existing.packContains || 1,
            unitCost: item.unitCost ?? existing.unitCost,
            packCost: item.packCost ?? existing.packCost,
            unitPrice: item.unitPrice ?? existing.unitPrice,
            packPrice: item.packPrice ?? existing.packPrice,
            category: item.category || existing.category,
            supplier: item.supplier || existing.supplier,
            supplierPhone: item.supplierPhone || existing.supplierPhone,
            updatedAt: nowIso
          };
          currentList[existingIdx] = updated;
          mergedCount += 1;

          if (delta !== 0) {
            newMovements.push({
              id: `mov_${Date.now()}_${Math.random()}`,
              itemId: existing.id,
              itemName: existing.name,
              delta,
              previousStock: existing.currentStock,
              newStock: item.currentStock,
              reason: 'Count',
              source,
              note: `Bulk import ${source === 'door1_csv' ? 'CSV/XLSX' : 'Vision photo'}`,
              timestamp: nowIso
            });
          }
        } else {
          const newId = `stk_${Date.now()}_${Math.random()}`;
          const created: StockItem = {
            ...item,
            id: newId,
            updatedAt: nowIso
          };
          currentList = [created, ...currentList];
          addedCount += 1;

          newMovements.push({
            id: `mov_${Date.now()}_${Math.random()}`,
            itemId: newId,
            itemName: created.name,
            delta: created.currentStock,
            previousStock: 0,
            newStock: created.currentStock,
            reason: 'Count',
            source,
            note: `Catalog import new SKU`,
            timestamp: nowIso
          });
        }
      }

      return currentList;
    });

    if (newMovements.length > 0) {
      setStockMovements(mPrev => [...newMovements, ...mPrev]);
    }

    return { merged: mergedCount, added: addedCount };
  }, []);

  // Profile actions
  const updateProfile = useCallback((partial: Partial<MerchantProfile>) => {
    setProfile(prev => {
      const updated = { ...prev, ...partial };
      enqueueSyncAction({
        id: `sync_${Date.now()}`,
        type: 'PROFILE_UPDATE',
        collection: 'merchant_profile',
        path: `merchant_profile/${updated.merchantId}`,
        docId: updated.merchantId,
        payload: { ...updated } as unknown as Record<string, unknown>,
        queuedAt: new Date().toISOString()
      });
      return updated;
    });
  }, [enqueueSyncAction]);

  const toggleDataSaver = useCallback(() => {
    setDataSaver(prev => !prev);
  }, []);

  // Cloud config actions
  const saveCustomCloudConfig = useCallback((jsonString: string) => {
    saveEstateConfigOverride(jsonString);
    setIsConfigOverridden(true);
  }, []);

  const resetToEstateCloudDefault = useCallback(() => {
    resetEstateConfig();
    setIsConfigOverridden(false);
  }, []);

  const setCloudChoiceMode = useCallback((mode: CloudChoiceMode) => {
    setCloudChoice(mode);
    localStorage.setItem(STORAGE_KEYS.CLOUD_CHOICE, mode);
    if (mode === 'estate') {
      resetEstateConfig();
      setIsConfigOverridden(false);
    } else if (mode === 'custom') {
      setIsConfigOverridden(getActiveEstateConfig().isOverridden);
    }
    console.info(`[telemetry] cloud-posture set to ${mode}`);
  }, []);

  const probeCustomCloudConfig = useCallback(async (configJson: string) => {
    return probeFirebaseConfig(configJson);
  }, []);

  const signOutElsewhere = useCallback(async () => {
    const currentSession = {
      deviceId,
      deviceName,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      lastSync: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isCurrent: true
    };
    setDeviceSessions([currentSession]);
    localStorage.setItem(STORAGE_KEYS.DEVICE_SESSIONS, JSON.stringify([currentSession]));
    console.info('[telemetry] device-sessions: other devices signed out');
  }, [deviceId, deviceName]);

  const simulateOrderConflict = useCallback((orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const devA = {
        source: 'Counter Tablet',
        status: o.status,
        items: [...o.items],
        totalAmount: o.totalAmount,
        updatedAt: o.updatedAt || new Date().toISOString()
      };
      const extraItems = o.items.length > 0
        ? o.items.map((it, idx) => idx === 0 ? { ...it, quantity: it.quantity + 1 } : it)
        : [{ id: 'it_extra', name: 'Phoenix Beer 650ml', quantity: 2, unitPrice: 75 }];
      const devB = {
        source: 'Merchant Phone',
        status: (o.status === 'New' ? 'Preparing' : (o.status === 'Preparing' ? 'Out' : 'Delivered')) as OrderStatus,
        items: extraItems,
        totalAmount: o.totalAmount + 75,
        updatedAt: new Date(Date.now() + 60000).toISOString()
      };
      const conflict: OrderConflictData = {
        deviceA: devA,
        deviceB: devB,
        detectedAt: new Date().toISOString(),
        conflictFields: ['status', 'items', 'totalAmount']
      };
      return {
        ...o,
        conflict
      };
    }));

    setStockMovements(mPrev => [
      {
        id: `mov_${Date.now()}`,
        itemId: `order_${orderId}`,
        itemName: `Order ${orderId}`,
        delta: 0,
        previousStock: 0,
        newStock: 0,
        reason: 'ConflictMerge',
        source: 'conflict_merge',
        note: 'conflict-merge (A/B)',
        timestamp: new Date().toISOString()
      },
      ...mPrev
    ]);
  }, []);

  const resolveOrderConflict = useCallback((orderId: string, resolution: 'keep_a' | 'keep_b' | 'merge') => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId || !o.conflict) return o;
      const { deviceA, deviceB } = o.conflict;

      let resolvedStatus = o.status;
      let resolvedItems = o.items;
      let resolvedTotal = o.totalAmount;

      if (resolution === 'keep_a') {
        resolvedStatus = deviceA.status;
        resolvedItems = deviceA.items;
        resolvedTotal = deviceA.totalAmount;
      } else if (resolution === 'keep_b') {
        resolvedStatus = deviceB.status;
        resolvedItems = deviceB.items;
        resolvedTotal = deviceB.totalAmount;
      } else if (resolution === 'merge') {
        const itemMap = new Map<string, OrderItem>();
        for (const item of [...deviceA.items, ...deviceB.items]) {
          const key = item.name.toLowerCase().trim();
          if (itemMap.has(key)) {
            const existing = itemMap.get(key)!;
            itemMap.set(key, { ...existing, quantity: Math.max(existing.quantity, item.quantity) });
          } else {
            itemMap.set(key, { ...item });
          }
        }
        resolvedItems = Array.from(itemMap.values());
        resolvedTotal = resolvedItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
        const pipeline: OrderStatus[] = ['New', 'Preparing', 'Out', 'Delivered', 'Paid'];
        const idxA = pipeline.indexOf(deviceA.status);
        const idxB = pipeline.indexOf(deviceB.status);
        resolvedStatus = pipeline[Math.max(idxA, idxB)] || o.status;
      }

      return {
        ...o,
        status: resolvedStatus,
        items: resolvedItems,
        totalAmount: resolvedTotal,
        conflict: undefined,
        updatedAt: new Date().toISOString()
      };
    }));

    setStockMovements(mPrev => [
      {
        id: `mov_${Date.now()}`,
        itemId: `order_${orderId}`,
        itemName: `Order ${orderId}`,
        delta: 0,
        previousStock: 0,
        newStock: 0,
        reason: 'ConflictMerge',
        source: 'conflict_merge',
        note: `conflict-merge (A/B) resolved: kept ${resolution}`,
        timestamp: new Date().toISOString()
      },
      ...mPrev
    ]);
  }, []);

  // Auth functions
  const loginWithGoogle = useCallback(async () => {
    if (!auth) throw new Error("Estate Cloud auth not configured");
    await signInWithPopup(auth, googleProvider);
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string) => {
    if (!auth) throw new Error("Estate Cloud auth not configured");
    await signInWithEmailAndPassword(auth, email, pass);
  }, []);


  const logout = useCallback(async () => {
    if (!auth) return;
    await fbSignOut(auth);
    setUser(null);
    setIsAuthorizedOperator(false);
  }, []);

  // Telemetry & Budget stats derivation
  const budgetStats: DailyBudgetStats = useMemo(() => {
    const isResting = dailyWrites >= MAX_DAILY_WRITES;
    const isAmber = dailyWrites >= AMBER_THRESHOLD;
    return {
      writes: dailyWrites,
      reads: dailyReads,
      date: mutTodayKey,
      maxWrites: MAX_DAILY_WRITES,
      telemetryLeg: `cloud-budget r/w: ${dailyReads}/${dailyWrites}`,
      isRestingTonight: isResting,
      isAmberAlert: isAmber
    };
  }, [dailyWrites, dailyReads, mutTodayKey]);

  const budgetNotice = useMemo(() => {
    if (budgetStats.isRestingTonight) {
      return "Cloud budget rests tonight — changes queued safely on device until tomorrow.";
    }
    return null;
  }, [budgetStats.isRestingTonight]);

  const value = useMemo(() => ({
    orders,
    ledgerEntries,
    stockItems,
    stockMovements,
    profile,
    user,
    isAuthorizedOperator,
    authLoading,
    isOnline,
    syncQueueCount: syncQueue.length,
    dataSaver,
    isConfigOverridden,
    budgetStats,
    budgetNotice,
    advanceOrderStatus,
    setOrderStatus,
    addOrder,
    updateOrder,
    deleteOrder,
    addLedgerEntry,
    deleteLedgerEntry,
    queueEmailDayBook,
    generateWhatsAppUrl,
    generateSupplierWhatsAppUrl,
    updateStock,
    adjustStock,
    addNewStockItem,
    updateStockItemDetails,
    deleteStockItem,
    addOrMergeStockItems,
    updateProfile,
    toggleDataSaver,
    saveCustomCloudConfig,
    resetToEstateCloudDefault,
    loginWithGoogle,
    loginWithEmail,
    logout,
    pendingCloudMerge,
    confirmCloudMerge,
    cancelCloudMerge,
    triggerSync,
    cloudChoice,
    setCloudChoiceMode,
    probeCustomCloudConfig,
    deviceId,
    deviceName,
    deviceSessions,
    signOutElsewhere,
    simulateOrderConflict,
    resolveOrderConflict,
    syncLatencyMs,
    storagePayloadKb,
    cloudSnapshots,
    downloadBackup,
    restoreBackup,
    restoreCloudSnapshot,
    resetShopData,
    factoryResetShop,
    privacyConsentGiven,
    setPrivacyConsentGiven,
    telemetryEnabled,
    toggleTelemetry,
    exportDrawer,
    eraseDrawer,
    licenceKey,
    licenceState,
    activateLicence,
    deleteLicence,
    checkTierGate
  }), [
    orders,
    ledgerEntries,
    stockItems,
    stockMovements,
    profile,
    user,
    isAuthorizedOperator,
    authLoading,
    isOnline,
    syncQueue.length,
    dataSaver,
    isConfigOverridden,
    budgetStats,
    budgetNotice,
    advanceOrderStatus,
    setOrderStatus,
    addOrder,
    updateOrder,
    deleteOrder,
    addLedgerEntry,
    deleteLedgerEntry,
    queueEmailDayBook,
    generateWhatsAppUrl,
    generateSupplierWhatsAppUrl,
    updateStock,
    adjustStock,
    addNewStockItem,
    updateStockItemDetails,
    deleteStockItem,
    addOrMergeStockItems,
    updateProfile,
    toggleDataSaver,
    saveCustomCloudConfig,
    resetToEstateCloudDefault,
    loginWithGoogle,
    loginWithEmail,
    logout,
    pendingCloudMerge,
    confirmCloudMerge,
    cancelCloudMerge,
    triggerSync,
    cloudChoice,
    setCloudChoiceMode,
    probeCustomCloudConfig,
    deviceId,
    deviceName,
    deviceSessions,
    signOutElsewhere,
    simulateOrderConflict,
    resolveOrderConflict
  ]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
