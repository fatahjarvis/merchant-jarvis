import React, { useState, useEffect, useCallback } from 'react';
import { 
  hasDevicePin, 
  verifyDevicePin, 
  setDevicePin, 
  isBiometricAvailable, 
  authenticateWithBiometrics,
  setBiometricEnabled,
  isBiometricEnabled
} from '../utils/security';
import { useStore } from '../context/StoreContext';
import { 
  Lock, 
  ShieldCheck, 
  Fingerprint, 
  Delete, 
  Store, 
  KeyRound, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

interface DeviceLockScreenProps {
  isLocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
}

export const DeviceLockScreen: React.FC<DeviceLockScreenProps> = ({
  isLocked,
  onUnlock,
  onLock
}) => {
  const { profile, loginWithEmail, loginWithGoogle } = useStore();
  const [pinState, setPinState] = useState<'locked' | 'first_setup' | 'forgot_verify' | 'forgot_new_pin'>('locked');
  const [enteredPin, setEnteredPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [setupStep, setSetupStep] = useState<'enter' | 'confirm'>('enter');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [hasBio, setHasBio] = useState(false);
  
  // Estate verify fields for forgot PIN
  const [estateEmail, setEstateEmail] = useState('');
  const [estatePass, setEstatePass] = useState('');
  const [isVerifyingEstate, setIsVerifyingEstate] = useState(false);

  // Check initial state
  useEffect(() => {
    const pinExists = hasDevicePin();
    if (!pinExists) {
      setPinState('first_setup');
    } else {
      setPinState('locked');
    }

    isBiometricAvailable().then(avail => {
      setHasBio(avail);
      // Auto trigger biometric if enabled and locked
      if (avail && isBiometricEnabled() && isLocked) {
        authenticateWithBiometrics().then(success => {
          if (success) {
            console.info('[telemetry] device-unlocked (webauthn-biometric)');
            onUnlock();
          }
        });
      }
    });
  }, [isLocked, onUnlock]);

  // Auto-lock after 5 minutes backgrounded
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem('mjarvis_device_bg_ts', String(Date.now()));
      } else if (document.visibilityState === 'visible') {
        const bgTsStr = localStorage.getItem('mjarvis_device_bg_ts');
        if (bgTsStr) {
          const bgTs = parseInt(bgTsStr, 10);
          const elapsedMs = Date.now() - bgTs;
          const fiveMinutesMs = 5 * 60 * 1000;
          if (elapsedMs >= fiveMinutesMs && hasDevicePin()) {
            console.info('[telemetry] device-autolocked (5m-backgrounded)');
            onLock();
            setEnteredPin('');
            setErrorMsg('Terminal locked after 5 minutes inactivity');
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [onLock]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleDigit = useCallback(async (digit: string) => {
    setErrorMsg(null);
    if (pinState === 'locked') {
      const next = enteredPin + digit;
      if (next.length > 6) return;
      setEnteredPin(next);

      if (next.length >= 4) {
        // Attempt unlock on 4, 5, or 6 digits
        const ok = await verifyDevicePin(next);
        if (ok) {
          console.info('[telemetry] device-unlocked (pin-pad)');
          setEnteredPin('');
          onUnlock();
        } else if (next.length === 6) {
          triggerShake();
          setErrorMsg('Incorrect PIN. Please try again.');
          setTimeout(() => setEnteredPin(''), 400);
        }
      }
    } else if (pinState === 'first_setup' || pinState === 'forgot_new_pin') {
      if (setupStep === 'enter') {
        if (setupPin.length < 6) {
          setSetupPin(prev => prev + digit);
        }
      } else {
        if (confirmPin.length < 6) {
          setConfirmPin(prev => prev + digit);
        }
      }
    }
  }, [pinState, enteredPin, setupStep, setupPin, confirmPin, onUnlock]);

  const handleDelete = () => {
    setErrorMsg(null);
    if (pinState === 'locked') {
      setEnteredPin(prev => prev.slice(0, -1));
    } else if (setupStep === 'enter') {
      setSetupPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setErrorMsg(null);
    setEnteredPin('');
    setSetupPin('');
    setConfirmPin('');
  };

  const handleBiometricTap = async () => {
    setErrorMsg(null);
    const ok = await authenticateWithBiometrics();
    if (ok) {
      console.info('[telemetry] device-unlocked (webauthn-biometric)');
      setBiometricEnabled(true);
      onUnlock();
    } else {
      setErrorMsg('Biometric verification cancelled or unavailable.');
    }
  };

  // Setup Step 1 -> Step 2
  const handleProceedSetupConfirm = () => {
    if (setupPin.length < 4 || setupPin.length > 6) {
      setErrorMsg('PIN must be 4 to 6 digits.');
      triggerShake();
      return;
    }
    setErrorMsg(null);
    setSetupStep('confirm');
  };

  // Complete PIN setup
  const handleFinalizePinSetup = async () => {
    if (confirmPin !== setupPin) {
      setErrorMsg('PINs do not match. Please re-enter.');
      triggerShake();
      setConfirmPin('');
      return;
    }
    await setDevicePin(setupPin);
    if (hasBio) {
      setBiometricEnabled(true);
    }
    console.info('[telemetry] device-pin-configured (salted-hash)');
    setEnteredPin('');
    setSetupPin('');
    setConfirmPin('');
    setSetupStep('enter');
    setPinState('locked');
    onUnlock();
  };

  // Forgot PIN -> Estate verify
  const handleVerifyEstateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingEstate(true);
    setErrorMsg(null);
    try {
      await loginWithEmail(estateEmail, estatePass);
      // Success, move to new PIN setup
      setPinState('forgot_new_pin');
      setSetupStep('enter');
      setSetupPin('');
      setConfirmPin('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Estate sign-in failed. Please verify credentials.');
      triggerShake();
    } finally {
      setIsVerifyingEstate(false);
    }
  };

  const handleGoogleEstateVerify = async () => {
    setErrorMsg(null);
    setIsVerifyingEstate(true);
    try {
      await loginWithGoogle();
      setPinState('forgot_new_pin');
      setSetupStep('enter');
      setSetupPin('');
      setConfirmPin('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Estate verification failed.');
    } finally {
      setIsVerifyingEstate(false);
    }
  };

  // If not locked and already setup, render nothing
  if (!isLocked && hasDevicePin()) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#020610] flex flex-col justify-between p-6 select-none animate-in fade-in">
      {/* Top Brand & Shop Info */}
      <div className="pt-8 text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-400 p-0.5 mx-auto shadow-[0_0_25px_rgba(6,182,212,0.4)]">
          <div className="w-full h-full bg-[#030914] rounded-2xl flex items-center justify-center text-cyan-400">
            <Store className="w-8 h-8" />
          </div>
        </div>
        
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            {profile.shopName || 'Merchant Jarvis'}
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Logixtix · Your Protected Shop Terminal
          </p>
        </div>
      </div>

      {/* Middle: PIN Prompt & Dots or Setup Form */}
      <div className="my-auto max-w-xs mx-auto w-full space-y-4 text-center">
        {errorMsg && (
          <div className="bg-rose-950/70 border border-rose-800/80 rounded-xl p-2.5 text-xs text-rose-300 flex items-center justify-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Regular Locked PIN Screen */}
        {pinState === 'locked' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300 font-medium">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Enter 4–6 digit Device PIN</span>
            </div>

            {/* PIN Dots */}
            <div className={`flex justify-center items-center gap-3 py-2 ${shake ? 'animate-bounce' : ''}`}>
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = enteredPin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border transition-all duration-150 ${
                      isFilled
                        ? 'bg-cyan-400 border-cyan-300 scale-110 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                        : 'border-slate-700 bg-slate-900/60'
                    }`}
                  />
                );
              })}
            </div>

            {enteredPin.length >= 4 && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await verifyDevicePin(enteredPin);
                  if (ok) {
                    onUnlock();
                  } else {
                    triggerShake();
                    setErrorMsg('Incorrect PIN.');
                  }
                }}
                className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 py-1"
              >
                Tap to unlock ({enteredPin.length} digits)
              </button>
            )}
          </div>
        )}

        {/* 2. First Launch PIN Setup */}
        {(pinState === 'first_setup' || pinState === 'forgot_new_pin') && (
          <div className="bg-slate-950/80 border border-cyan-900/60 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-cyan-400">
              <KeyRound className="w-4 h-4" />
              <span>{setupStep === 'enter' ? 'Set 4–6 Digit PIN' : 'Confirm New PIN'}</span>
            </div>
            
            <p className="text-[11px] text-slate-400">
              {setupStep === 'enter' 
                ? 'Stored only as salted cryptographic hash. Protects your shop terminal.' 
                : 'Re-enter your PIN to confirm.'}
            </p>

            {/* Dots for setup */}
            <div className="flex justify-center items-center gap-3 py-1">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const currentStr = setupStep === 'enter' ? setupPin : confirmPin;
                const isFilled = currentStr.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      isFilled
                        ? 'bg-teal-400 border-teal-300 scale-110 shadow-[0_0_8px_rgba(45,212,191,0.5)]'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  />
                );
              })}
            </div>

            <div className="pt-2 flex gap-2">
              {setupStep === 'enter' ? (
                <button
                  type="button"
                  disabled={setupPin.length < 4}
                  onClick={handleProceedSetupConfirm}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                  style={{ minHeight: '44px' }}
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setSetupStep('enter');
                      setConfirmPin('');
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
                    style={{ minHeight: '44px' }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={confirmPin.length < 4}
                    onClick={handleFinalizePinSetup}
                    className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 disabled:opacity-40 text-slate-950 font-bold text-xs"
                    style={{ minHeight: '44px' }}
                  >
                    Confirm & Save PIN
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Forgot PIN Estate Sign-in Screen */}
        {pinState === 'forgot_verify' && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 text-left space-y-3">
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-100">Verify Estate Sign-in</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Authenticate with your shop estate credentials to reset device PIN.
              </p>
            </div>

            <form onSubmit={handleVerifyEstateLogin} className="space-y-2">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Estate Email</label>
                <input
                  type="email"
                  required
                  value={estateEmail}
                  onChange={e => setEstateEmail(e.target.value)}
                  placeholder="owner@estate.mu"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={estatePass}
                  onChange={e => setEstatePass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingEstate}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition"
                style={{ minHeight: '44px' }}
              >
                {isVerifyingEstate ? 'Verifying...' : 'Verify Estate & Reset PIN'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleGoogleEstateVerify}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 font-medium"
              style={{ minHeight: '40px' }}
            >
              Sign in with Google Estate
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setPinState('locked')}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                Cancel and return to PIN pad
              </button>
            </div>
          </div>
        )}

        {/* PIN Pad (Numbers 1-9, Bio, 0, Delete) */}
        {pinState !== 'forgot_verify' && (
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(String(digit))}
                className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-cyan-950/80 border border-slate-800/90 text-xl font-bold font-mono text-slate-100 shadow-sm active:scale-95 transition flex items-center justify-center"
                style={{ minHeight: '52px' }}
              >
                {digit}
              </button>
            ))}

            {/* Bottom Row: Biometric / Clear, 0, Backspace */}
            {hasBio ? (
              <button
                type="button"
                onClick={handleBiometricTap}
                className="h-14 rounded-2xl bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 shadow-sm active:scale-95 transition flex items-center justify-center"
                title="Unlock with Fingerprint or Face ID"
                style={{ minHeight: '52px' }}
              >
                <Fingerprint className="w-6 h-6 stroke-[2]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClear}
                className="h-14 rounded-2xl bg-slate-900/40 hover:bg-slate-850 border border-slate-850 text-xs font-mono font-semibold text-slate-400 active:scale-95 transition flex items-center justify-center"
                style={{ minHeight: '52px' }}
              >
                CLR
              </button>
            )}

            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-14 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-cyan-950/80 border border-slate-800/90 text-xl font-bold font-mono text-slate-100 shadow-sm active:scale-95 transition flex items-center justify-center"
              style={{ minHeight: '52px' }}
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/90 text-slate-300 shadow-sm active:scale-95 transition flex items-center justify-center"
              title="Delete digit"
              style={{ minHeight: '52px' }}
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Footer: Forgot PIN / Guest Guarantee */}
      <div className="pb-4 text-center space-y-2">
        {pinState === 'locked' && (
          <button
            type="button"
            onClick={() => {
              setPinState('forgot_verify');
              setErrorMsg(null);
            }}
            className="text-xs font-medium text-slate-400 hover:text-cyan-400 transition underline underline-offset-4"
          >
            Forgot PIN? Verify with estate sign-in
          </button>
        )}

        <p className="text-[11px] text-slate-600 font-mono">
          Local Guest Data Guaranteed Intact · Cryptographic Salted Storage
        </p>
      </div>
    </div>
  );
};
