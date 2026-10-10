import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, Check, X, Smartphone } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div 
        className="w-full max-w-md bg-[#0a0f1d] border-t sm:border border-cyan-900/60 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-100">Install Merchant Jarvis</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isInstalled ? (
          <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-800 text-teal-300 text-sm flex items-center gap-3">
            <Check className="w-6 h-6 text-teal-400 shrink-0" />
            <div>
              <p className="font-bold">App Already Installed!</p>
              <p className="text-xs text-teal-400/80 mt-0.5">Running in standalone WebAPK mode on your device.</p>
            </div>
          </div>
        ) : isInstallable ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Install Merchant Jarvis directly onto your Android / Samsung Internet or Chrome home screen for instant 1-tap offline access.
            </p>
            <button
              onClick={handleInstallClick}
              className="w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base shadow-[0_0_16px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 transition"
              style={{ minHeight: '48px' }}
            >
              <Download className="w-5 h-5" />
              <span>Install WebAPK Now</span>
            </button>
          </div>
        ) : isIOS ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-300 font-medium">
              How to install on iPhone / iPad (Safari):
            </p>
            <div className="space-y-2.5 text-xs text-slate-300 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 flex items-center justify-center font-mono font-bold">1</span>
                <span>Tap the <Share2 className="w-4 h-4 inline text-cyan-400 mx-1" /> <strong>Share</strong> button at bottom of Safari.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 flex items-center justify-center font-mono font-bold">2</span>
                <span>Scroll down and choose <PlusSquare className="w-4 h-4 inline text-teal-400 mx-1" /> <strong>Add to Home Screen</strong>.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 flex items-center justify-center font-mono font-bold">3</span>
                <span>Tap <strong>Add</strong> in the top-right corner.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              To install this PWA companion on your browser, click your browser menu (⋮) and select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
              WebAPK · Offline Service Worker · Standalone
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold"
            style={{ minHeight: '44px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
