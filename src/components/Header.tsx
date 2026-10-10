import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { formatMauritiusClock, getMauritiusNow } from '../utils/mauritiusTime';
import { Cloud, CloudOff, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

export const Header: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { 
    isOnline, 
    syncQueueCount, 
    profile, 
    isAuthorizedOperator, 
    user, 
    triggerSync, 
    dataSaver,
    budgetStats,
    budgetNotice
  } = useStore();
  const [clock, setClock] = useState(() => formatMauritiusClock(getMauritiusNow()));
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(formatMauritiusClock(getMauritiusNow()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await triggerSync();
    setTimeout(() => setIsSyncing(false), 600);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#030712]/95 backdrop-blur-md border-b border-cyan-950/60 px-4 pt-3 pb-2.5 safe-top">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-900/40 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <span className="font-mono text-cyan-400 font-black text-sm tracking-tighter">MJ</span>
            {isAuthorizedOperator && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#030712] rounded-full flex items-center justify-center">
                <ShieldCheck className="w-2.5 h-2.5 text-black stroke-[3]" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-slate-100 tracking-tight leading-tight">
                Merchant Jarvis
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 font-semibold">
                MUT
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[170px] leading-tight">
              {profile.shopName}
            </p>
          </div>
        </div>

        {/* Right Status Capsule: MUT Clock + Connectivity + Auth */}
        <div className="flex items-center gap-2">
          {/* Live MUT Clock */}
          <div className="text-right hidden xs:block">
            <div className="text-xs font-mono font-bold text-cyan-300 tracking-wider">
              {clock.split(' ')[0]}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              MUT (UTC+4)
            </div>
          </div>

          {/* Sync / Connectivity Capsule */}
          <button
            onClick={handleManualSync}
            disabled={!isOnline}
            title={isOnline ? (syncQueueCount > 0 ? `${syncQueueCount} pending offline mutations` : "Connected to estate cloud") : "Offline shell active"}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 hover:border-cyan-700/60 transition active:scale-95"
            style={{ minHeight: '36px' }}
          >
            {isOnline ? (
              syncQueueCount > 0 ? (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="font-mono text-amber-400 font-semibold text-[11px]">{syncQueueCount}</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-teal-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_#2dd4bf]"></span>
                </>
              )
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] text-amber-400 font-medium">Off</span>
              </>
            )}
          </button>

          {/* Budget Telemetry / Amber Badge at >= 60% */}
          {budgetStats.isAmberAlert && (
            <span 
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                budgetStats.isRestingTonight
                  ? 'bg-rose-950/90 text-rose-300 border-rose-800'
                  : 'bg-amber-950/90 text-amber-300 border-amber-800'
              }`}
              title={`${budgetStats.telemetryLeg} (daily limit: ${budgetStats.maxWrites})`}
            >
              {budgetStats.writes}/{budgetStats.maxWrites}w
            </span>
          )}

          {/* User button / Login */}
          <button
            onClick={onOpenAuth}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/50 transition active:scale-95"
            title={user ? `Signed in as ${user.email || 'Merchant'}` : "Merchant Sign In"}
          >
            {user ? (
              <span className="font-mono text-xs font-bold text-teal-400 uppercase">
                {user.email ? user.email.slice(0, 2) : 'ME'}
              </span>
            ) : (
              <Zap className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Cloud budget resting note if 300 daily writes reached */}
      {budgetNotice && (
        <div className="max-w-md mx-auto mt-1.5 bg-amber-950/70 border border-amber-800/80 rounded-xl px-2.5 py-1 text-[11px] text-amber-200 flex items-center justify-between font-sans">
          <span>🌙 {budgetNotice}</span>
          <span className="font-mono font-bold text-[10px] text-amber-400 shrink-0 ml-1">300/300</span>
        </div>
      )}

      {/* Data saver indicator strip if enabled */}
      {dataSaver && (
        <div className="max-w-md mx-auto mt-1 flex items-center justify-between text-[11px] text-teal-300/80 px-1 font-mono">
          <span>⚡ Data-saver active (audio minimized)</span>
          <span>Logixtix MU</span>
        </div>
      )}
    </header>
  );
};
