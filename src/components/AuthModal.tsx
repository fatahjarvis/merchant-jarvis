import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { updateAuthorizedOperators } from '../utils/firebase';
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
    registerWithEmail, 
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
      } else {
        await registerWithEmail(email, password);
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
              {/* Cloud Veil: auth modal subtitle reads 'Your shop, synced securely across your devices' */}
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
          // Authenticated state
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
          // Guest / Unauthenticated form
          <div className="space-y-4">
            <button
              onClick={handleGoogle}
              disabled={loading || !isOnline}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-semibold text-sm flex items-center justify-center gap-3 transition shadow-sm disabled:opacity-50"
              style={{ minHeight: '44px' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <span className="flex-1 h-px bg-slate-800" />
              <span>or email login</span>
              <span className="flex-1 h-px bg-slate-800" />
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="merchant@shop.mu"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-100 outline-none"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-100 outline-none"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-[0_0_12px_rgba(6,182,212,0.4)] transition"
                style={{ minHeight: '44px' }}
              >
                {mode === 'signin' ? 'Sign In to My Shop Cloud' : 'Create Merchant Account'}
              </button>
            </form>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
              <button
                type="button"
                onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')}
                className="text-cyan-400 hover:underline"
              >
                {mode === 'signin' ? 'New shop? Create your login' : 'Already have an account? Sign in'}
              </button>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-[11px] text-slate-400 space-y-1">
              <span className="text-teal-400 font-semibold block">No internet? No problem.</span>
              <p>
                Merchant Jarvis works fully offline. Orders and entries made offline wait safely on this device and sync when you reconnect.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
