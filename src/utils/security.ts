/**
 * Security & Device Lock utilities for Merchant Jarvis
 * Stores PIN ONLY as salted SHA-256 hash in localStorage.
 * WebAuthn platform authenticator (fingerprint / biometric) where supported.
 */

const STORAGE_KEYS = {
  PIN_SALT: 'mjarvis_device_pin_salt',
  PIN_HASH: 'mjarvis_device_pin_hash',
  BIO_ENABLED: 'mjarvis_device_bio_enabled',
  BG_TIMESTAMP: 'mjarvis_device_bg_ts'
};

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer);
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

export function hasDevicePin(): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEYS.PIN_HASH));
  } catch {
    return false;
  }
}

export async function setDevicePin(pin: string): Promise<void> {
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);
  localStorage.setItem(STORAGE_KEYS.PIN_SALT, salt);
  localStorage.setItem(STORAGE_KEYS.PIN_HASH, hash);
}

export async function verifyDevicePin(pin: string): Promise<boolean> {
  const salt = localStorage.getItem(STORAGE_KEYS.PIN_SALT);
  const storedHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH);
  if (!salt || !storedHash) return false;
  const computedHash = await hashPin(pin, salt);
  return computedHash === storedHash;
}

export function clearDevicePin(): void {
  localStorage.removeItem(STORAGE_KEYS.PIN_SALT);
  localStorage.removeItem(STORAGE_KEYS.PIN_HASH);
  localStorage.removeItem(STORAGE_KEYS.BIO_ENABLED);
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    return false;
  }
  return false;
}

export function isBiometricEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.BIO_ENABLED) === 'true';
  } catch {
    return false;
  }
}

export function setBiometricEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.BIO_ENABLED, enabled ? 'true' : 'false');
}

/**
 * Biometric authentication via WebAuthn
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  if (!(await isBiometricAvailable())) return false;

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Prompt user verification
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'preferred'
      }
    });

    return Boolean(credential);
  } catch (err: any) {
    // If not supported/cancelled, fallback smoothly
    console.info("Biometric prompt skipped or cancelled:", err?.message || err);
    return false;
  }
}
