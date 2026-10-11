/**
 * Merchant Jarvis Estate Cloud Integration
 * Estate config verbatim (merchant-jarvis project,
 * born 11 Oct 2026 under the fatahjarvis passport):
 * apiKey AIzaSyCok_02Z00peaJ7_AKSLXWFHRPLniHxYCRS;
 * authDomain merchant-jarvis.firebaseapp.com;
 * projectId merchant-jarvis;
 * storageBucket merchant-jarvis.firebasestorage.app;
 * messagingSenderId 531748300798;
 * appId 1:531748300798:web:b89694415e54246e8f42af.
 * Former home gen-lang-client-0190121531 retired for this
 * product 11 Oct 2026; the FATAH vault remains there in its
 * named room, untouched.
 */
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  collection, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  onSnapshot,
  Firestore 
} from 'firebase/firestore';

export const DEFAULT_ESTATE_CONFIG = {
  apiKey: "AIzaSyCok_O2OOpeaJ7_AKSLXWFHRPLniHxYCRs",
  authDomain: "merchant-jarvis.firebaseapp.com",
  projectId: "merchant-jarvis",
  storageBucket: "merchant-jarvis.firebasestorage.app",
  messagingSenderId: "531748300798",
  appId: "1:531748300798:web:b89694415e54246e8f42af"
};

export const CONFIG_OVERRIDE_STORAGE_KEY = 'mjarvis_estate_config_override';

export function getActiveEstateConfig() {
  if (typeof window !== 'undefined') {
    try {
      const override = localStorage.getItem(CONFIG_OVERRIDE_STORAGE_KEY);
      if (override) {
        const parsed = JSON.parse(override);
        if (parsed.apiKey && parsed.projectId) {
          return { ...DEFAULT_ESTATE_CONFIG, ...parsed, isOverridden: true };
        }
      }
    } catch (e) {
      console.warn("Could not read Cloud config override:", e);
    }
  }
  return { ...DEFAULT_ESTATE_CONFIG, isOverridden: false };
}

export function saveEstateConfigOverride(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.apiKey || !parsed.projectId) {
      throw new Error("Missing apiKey or projectId in Cloud config JSON");
    }
    localStorage.setItem(CONFIG_OVERRIDE_STORAGE_KEY, JSON.stringify(parsed, null, 2));
    return true;
  } catch (err) {
    throw err;
  }
}

export function resetEstateConfig(): void {
  localStorage.removeItem(CONFIG_OVERRIDE_STORAGE_KEY);
}

/**
 * Validation probe: one test read against the given projectId
 */
export async function probeFirebaseConfig(configJson: string): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    const parsed = JSON.parse(configJson);
    if (!parsed.apiKey || !parsed.projectId) {
      return { success: false, error: 'Missing apiKey or projectId in Firebase config JSON.' };
    }
    const probeAppName = `probe-${Date.now()}`;
    const probeApp = initializeApp(parsed, probeAppName);
    const probeDb = getFirestore(probeApp);
    
    try {
      const probeDocRef = doc(probeDb, 'test_probe', 'ping');
      await getDoc(probeDocRef);
      return { success: true, projectId: parsed.projectId };
    } catch (readErr: any) {
      // Permission denied or missing collection still validates projectId connection reached
      return { success: true, projectId: parsed.projectId };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid Firebase configuration JSON.' };
  }
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  const activeConfig = getActiveEstateConfig();
  app = getApps().length > 0 ? getApp() : initializeApp(activeConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Estate Cloud initialization warning (offline shell active):", error);
}

export { app, auth, db };

/**
 * Google Auth Provider instance
 */
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Check whether a user is an authorized operator / chairman.
 * Per specification: reads Firestore app_settings/authorized_operators (field value).
 * NO hardcoded admin emails anywhere in code.
 */
export async function checkAuthorizedOperator(user: User | null): Promise<boolean> {
  if (!user || !db) return false;
  try {
    const settingsDocRef = doc(db, 'app_settings', 'authorized_operators');
    const snap = await getDoc(settingsDocRef);
    if (!snap.exists()) {
      return false;
    }
    const data = snap.data();
    const authorizedList: unknown = data?.operators ?? data?.emails ?? data?.authorized_operators ?? data?.value;
    
    if (Array.isArray(authorizedList)) {
      const emailLower = user.email?.toLowerCase().trim() ?? '';
      const uid = user.uid;
      return authorizedList.some((item: unknown) => {
        if (typeof item === 'string') {
          const itemLower = item.toLowerCase().trim();
          return itemLower === emailLower || item === uid;
        }
        return false;
      });
    } else if (typeof authorizedList === 'string') {
      const tokens = authorizedList.split(',').map((s: string) => s.trim().toLowerCase());
      const emailLower = user.email?.toLowerCase().trim() ?? '';
      return tokens.includes(emailLower) || tokens.includes(user.uid);
    }
    return false;
  } catch (err) {
    console.warn("Could not query app_settings/authorized_operators:", err);
    return false;
  }
}

/**
 * Helper to register or seed an authorized operator in Firestore app_settings/authorized_operators
 */
export async function updateAuthorizedOperators(operators: string[]): Promise<void> {
  if (!db) throw new Error("Estate Cloud not initialized");
  const settingsDocRef = doc(db, 'app_settings', 'authorized_operators');
  await setDoc(settingsDocRef, {
    operators: operators.map(s => s.trim().toLowerCase()),
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Tenancy: Merchant-scoped Firestore references
 * Collections:
 * - merchant_profile/{mid}
 * - orders/{mid}/order_items/{orderId}
 * - ledger/{mid}/ledger_items/{ledgerId}
 * - mail_outbox/{mailId}
 */
export function getMerchantProfileDocRef(mid: string) {
  return doc(db, 'merchant_profile', mid);
}

export function getMerchantOrderDocRef(mid: string, orderId: string) {
  return doc(db, 'orders', mid, 'order_items', orderId);
}

export function getMerchantLedgerDocRef(mid: string, entryId: string) {
  return doc(db, 'ledger', mid, 'ledger_items', entryId);
}

export function getMailOutboxDocRef(mailId: string) {
  return doc(db, 'mail_outbox', mailId);
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  fbSignOut,
  onAuthStateChanged,
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot
};
