import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Share, 
  MoreVertical, 
  PlusSquare, 
  Sparkles, 
  CheckCircle2,
  Compass,
  Smartphone
} from 'lucide-react';

interface InstallKindnessModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onClearPrompt: () => void;
}

export const InstallKindnessModal: React.FC<InstallKindnessModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onClearPrompt
}) => {
  const [isOpera, setIsOpera] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      setIsOpera(/OPR\/|Opera/i.test(ua));
      setIsIOS(/iPhone|iPad|iPod/i.test(ua));
    }
  }, []);

  if (!isOpen) return null;

  const handleNativeTrigger = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.info(`[telemetry] pwa-install native outcome(${choice.outcome})`);
        onClearPrompt();
        onClose();
      } catch (err) {
        console.warn("Failed to prompt native install:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#050b18] border border-cyan-900/80 w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Install Merchant Jarvis</h2>
              <p className="text-xs text-slate-400 font-mono">
                Install Kindness · Standalone Shop App
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-300">
          {/* Case 1: Native prompt captured */}
          {deferredPrompt ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-700/80 text-cyan-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-100">Ready for Instant Installation</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Add Merchant Jarvis directly to your home screen or desktop for full-screen offline reliability.
                </p>
              </div>

              <button
                type="button"
                onClick={handleNativeTrigger}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-sm shadow-[0_0_18px_rgba(6,182,212,0.4)] active:scale-98 transition flex items-center justify-center gap-2"
                style={{ minHeight: '48px' }}
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Install App Now</span>
              </button>
            </div>
          ) : isOpera ? (
            /* Case 2: Opera UA without event -> Opera-kindness card */
            <div className="bg-gradient-to-br from-[#1a0808] via-slate-950 to-[#12080a] border border-rose-900/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center font-bold">
                  O
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-300">Opera Kindness Notice</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Opera browser detected</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Opera handles web application installation via its built-in menu. To add Merchant Jarvis as a full-screen shop app:
              </p>

              <ol className="space-y-2 font-mono text-[11px] text-slate-300 bg-black/40 p-3 rounded-xl border border-slate-900 list-decimal list-inside">
                <li>Tap the red Opera <strong>'O' logo</strong> or menu button at the top/bottom bar.</li>
                <li>Tap <strong>'Add to Home screen'</strong> or <strong>'Install app'</strong>.</li>
                <li>Confirm to launch directly from your home screen in standalone mode.</li>
              </ol>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Fast local offline cache active</span>
                <span className="text-emerald-400 font-bold">Ready</span>
              </div>
            </div>
          ) : isIOS ? (
            /* Case 3: iOS Safari Guidance Sheet */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Install on iPhone / iPad</h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Apple Safari requires adding to home screen through the Share sheet:
              </p>

              <div className="space-y-2 font-mono text-[11px] bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                <div className="flex items-center gap-2.5">
                  <Share className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>1. Tap the <strong>Share</strong> button at the bottom of Safari.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <PlusSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>2. Scroll down and tap <strong>'Add to Home Screen'</strong>.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>3. Tap <strong>'Add'</strong> in the top-right corner.</span>
                </div>
              </div>
            </div>
          ) : (
            /* Case 4: General Browser Guidance Fallback */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Browser Installation Guidance</h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Your browser supports installing Merchant Jarvis as a desktop or mobile application:
              </p>

              <div className="space-y-2 font-mono text-[11px] bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                <div className="flex items-center gap-2.5">
                  <MoreVertical className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>1. Tap the browser menu <strong>(⋮ or ⋯)</strong> at the corner.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>2. Select <strong>'Install Merchant Jarvis'</strong> or <strong>'Add to Home screen'</strong>.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>3. Confirm installation to enable full-screen standalone mode.</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200 underline font-mono"
            >
              Continue using in browser
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
