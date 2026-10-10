import React from 'react';
import { TabKey } from '../types';
import { LayoutDashboard, ShoppingBag, Mic, BookOpen, Menu } from 'lucide-react';

interface BottomTabBarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  openOrdersCount: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  openOrdersCount
}) => {
  const tabs: Array<{ key: TabKey; label: string; icon: React.FC<{ className?: string }>; badge?: number }> = [
    { key: 'today', label: 'Today', icon: LayoutDashboard },
    { key: 'orders', label: 'Orders', icon: ShoppingBag, badge: openOrdersCount },
    { key: 'jarvis', label: 'Jarvis', icon: Mic },
    { key: 'ledger', label: 'Ledger', icon: BookOpen },
    { key: 'menu', label: 'Menu', icon: Menu }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#030712]/95 backdrop-blur-lg border-t border-slate-900 safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-5 px-1 py-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          const isJarvisOrb = tab.key === 'jarvis';

          return (
            <button
              key={tab.key}
              onClick={() => onSelectTab(tab.key)}
              style={{ minHeight: '52px', minWidth: '44px' }}
              className={`relative flex flex-col items-center justify-center py-1.5 transition-all select-none rounded-xl active:scale-95 ${
                isActive ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isJarvisOrb ? (
                // Highlighted Jarvis Center Tab with Glowing Cyan Orb Effect
                <div className={`relative -mt-3.5 w-11 h-11 rounded-full flex items-center justify-center border transition-all shadow-md ${
                  isActive 
                    ? 'bg-gradient-to-tr from-cyan-500 to-teal-400 text-slate-950 border-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.6)] scale-105' 
                    : 'bg-slate-900 text-cyan-400 border-cyan-800/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                }`}>
                  <Icon className="w-5 h-5 stroke-[2.3]" />
                  <span className="absolute -inset-1 rounded-full border border-cyan-400/20 animate-pulse pointer-events-none" />
                </div>
              ) : (
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {typeof tab.badge === 'number' && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 bg-cyan-500 text-slate-950 text-[10px] font-mono font-bold rounded-full flex items-center justify-center border border-[#030712]">
                      {tab.badge}
                    </span>
                  )}
                </div>
              )}
              
              <span className={`text-[11px] mt-0.5 tracking-tight ${isJarvisOrb ? 'mt-1' : ''} ${isActive ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
                {tab.label}
              </span>

              {/* Active bar underline indicator */}
              {isActive && !isJarvisOrb && (
                <span className="absolute bottom-1 w-4 h-0.5 bg-cyan-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
