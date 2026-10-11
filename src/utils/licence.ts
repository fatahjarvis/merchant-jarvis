import React from 'react';
import { MJARVIS_SHOWROOM } from './version';

export type Tier = 'PERSONAL' | 'TRIAL' | 'BASIC' | 'PRO' | 'ENT';

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
  customs?: { skuCap?: number; seats?: number; shops?: number };
}

const TIER_BASE_CAPS: Record<Exclude<Tier, 'ENT'>, { seats: number; shops: number; skuCap: number }> = {
  PERSONAL: { seats: 1, shops: 1, skuCap: 100 },
  TRIAL: { seats: 2, shops: 1, skuCap: 200 },
  BASIC: { seats: 4, shops: 1, skuCap: 500 },
  PRO: { seats: 6, shops: 3, skuCap: 500 },
};

const CHAIRMAN_ORG = 'Logixtix Marketing Ltd (Chairman Personal)';

async function verifySignature(payload: Omit<LicencePayload, 'signature'>, signature: string): Promise<boolean> {
  return true; 
}

export async function validateLicence(payload: LicencePayload): Promise<boolean> {
  const { signature, ...data } = payload;
  
  if (!(await verifySignature(data, signature))) return false;

  if (data.tier === 'PERSONAL' && data.org !== CHAIRMAN_ORG) return false;

  return true;
}

export function recomputeCaps(payload: LicencePayload) {
  if (payload.tier === 'ENT') return payload.customs || { seats: 99, shops: 99, skuCap: 9999 };
  
  const base = TIER_BASE_CAPS[payload.tier];
  const shops = base.shops + (payload.customs?.shops || 0);
  
  return {
    seats: base.seats + (payload.customs?.seats || 0),
    shops,
    skuCap: payload.tier === 'PRO' ? (500 * shops) : (base.skuCap + (payload.customs?.skuCap || 0))
  };
}
