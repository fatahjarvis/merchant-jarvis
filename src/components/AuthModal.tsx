import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { updateAuthorizedOperators, db, auth, checkAuthorizedOperator, getMerchantProfileDocRef } from '../utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { X, ShieldCheck, Mail, Lock, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { 
    user, 
    isAuthorizedOperator, 
    loginWithGoogle, 
    loginWithEmail, 
    logout,
    isOnline
  } = useStore();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [operatorSeedEmail, setOperatorSeedEmail] = useState('');
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState(false);

  if (!isOpen) return null;

  const handleGoogle = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.warn("Google sign in issue:", err);
      setErrorMsg(err.message || 'Google sign-in interrupted. Check estate popup permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setLoading(true);
      setErrorMsg('');
      if (mode === 'signin') {
        await loginWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      console.warn("Email auth issue:", err);
      setErrorMsg(err.message || 'Authentication error. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedOperator = async () => {
    if (!operatorSeedEmail.trim()) return;
    try {
      setLoading(true);
      await updateAuthorizedOperators([operatorSeedEmail.trim()]);
      setSeedSuccess(true);
      setOperatorSeedEmail('');
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed updating estate operators directory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div 
        className="w-full max-w-md bg-[#0a0f1d] border-t sm:border border-cyan-900/60 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Shop Cloud Sign-In</h2>
              <p className="text-[11px] text-cyan-400/90 font-mono">Your shop, synced securely across your devices</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {user ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Signed In Account</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isAuthorizedOperator 
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700 font-bold'
                    : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                }`}>
                  {isAuthorizedOperator ? 'CHAIRMAN OPERATOR' : 'MERCHANT ACCOUNT'}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-100 truncate">{user.email || user.displayName || user.uid}</p>
              <p className="text-[11px] text-slate-400 font-mono">ID: {user.uid.slice(0, 16)}...</p>
            </div>
            {/* Operator info: reads Cloud app_settings/authorized_operators */}
            <div className="text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-900 space-y-1.5">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Role Authority: Estate Cloud Check
              </span>
              <p className="text-slate-400 text-[11px]">
                Chairman operator status dynamically confirmed via Estate Cloud authority register. No hardcoded emails.
              </p>
              {isAuthorizedOperator && (
                <div className="pt-2 border-t border-slate-900">
                  <label className="text-[11px] text-slate-400 block mb-1">Add/Authorize Estate Operator:</label>
                  <div className="flex gap-1.5">
                    <input
                      type="email"
                      value={operatorSeedEmail}
                      onChange={e => setOperatorSeedEmail(e.target.value)}
                      placeholder="operator@logixtix.mu"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none font-mono"
                    />
                    <button
                      onClick={handleSeedOperator}
                      disabled={loading || !operatorSeedEmail}
                      className="px-3 py-1.5 bg-cyan-900 hover:bg-cyan-800 text-cyan-200 rounded-lg text-xs font-semibold"
                    >
                      Authorize
                    </button>
                  </div>
                  {seedSuccess && (
                    <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Updated Estate Cloud authorized operators
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={async () => {
                await logout();
              }}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800/80 text-rose-400 text-sm font-semibold flex items-center justify-center gap-2 transition"
              style={{ minHeight: '44px' }}
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollmentError ? (
              <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl space-y-3">
                <h3 className="text-sm font-bold text-rose-300">Enrollment Required</h3>
                <p className="text-xs text-rose-200">
                  This shop is not enrolled yet — contact Logixtix Marketing Ltd to open your shop.
                </p>
                <button
                  onClick={async () => {
                    await logout();
                    setEnrollmentError(false);
                  }}
                  className="w-full py-2 bg-rose-900 text-rose-100 rounded-lg text-xs font-bold"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await loginWithGoogle();
                      const user = auth.currentUser;
                      if (user) {
                        const isOperator = await checkAuthorizedOperator(user);
                        const profileRef = doc(db, 'merchant_profile', user.uid);
                        const profileSnap = await getDoc(profileRef);
                        if (!isOperator && !profileSnap.exists()) {
                          setEnrollmentError(true);
                          return;
                        }
                      }
                      onClose();
                    } catch (err: any) {
                      setErrorMsg(err.message || 'Google sign-in interrupted.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !isOnline}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-semibold text-sm flex items-center justify-center gap-3 transition shadow-sm disabled:opacity-50"
                  style={{ minHeight: '44px' }}
                >
                  <span>Continue with Google</span>
                </button>
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <span className="flex-1 h-px bg-slate-800" />
                  <span>or email login</span>
                  <span className="flex-1 h-px bg-slate-800" />
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!email || !password) return;
                  try {
                    setLoading(true);
                    setErrorMsg('');
                    await loginWithEmail(email, password);
                    const user = auth.currentUser;
                    if (user) {
                      const isOperator = await checkAuthorizedOperator(user);
                      const profileRef = doc(db, 'merchant_profile', user.uid);
                      const profileSnap = await getDoc(profileRef);
                      if (!isOperator && !profileSnap.exists()) {
                        setEnrollmentError(true);
                        return;
                      }
                    }
                    onClose();
                  } catch (err: any) {
                    setErrorMsg(err.message || 'Authentication error.');
                  } finally {
                    setLoading(false);
                  }
                }} className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1">Email</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-medium block mb-1">Password</label>
                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm">
                    Sign In to My Shop Cloud
                  </button>
                </form>
              </>
            )}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-[11px] text-slate-400">
              <span className="text-teal-400 font-semibold block">No internet? No problem.</span>
              <p>Merchant Jarvis works fully offline. Orders and entries made offline wait safely on this device and sync when you reconnect.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
