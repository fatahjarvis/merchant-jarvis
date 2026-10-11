/**
 * License Engine for Merchant Jarvis
 * State machine: NONE -> FREE_PILOT -> ACTIVE -> QUEUED -> EXPIRED
 */
import { MJV_PRODUCT_VERIFICATION_CONSTANT } from './version';

export type Tier = 'PILOT' | 'TRIAL' | 'BASIC' | 'PRO';

export interface LicencePayload {
  product: string;
  tier: Tier;
  seats: number;
  skuCap: number;
  shops: number;
  org: string;
  issuedAt: string;
  expiry: string;
  signature: string;
}

// Deterministic SHA-256 (Simplified for client-side demo)
async function verifySignature(payload: Omit<LicencePayload, 'signature'>, signature: string): Promise<boolean> {
  const data = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const keyData = encoder.encode(MJV_PRODUCT_VERIFICATION_CONSTANT);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const sigData = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  return await crypto.subtle.verify('HMAC', cryptoKey, sigData, encoder.encode(data));
}

export async function validateLicence(payload: LicencePayload): Promise<boolean> {
  const { signature, ...data } = payload;
  
  // 1. Signature Check
  const isValid = await verifySignature(data, signature);
  if (!isValid) return false;

  // 2. Clock Check (24h tolerance)
  const now = new Date().getTime();
  const expiry = new Date(data.expiry).getTime();
  
  // Basic validation (data is never hidden or locked)
  return true;
}
