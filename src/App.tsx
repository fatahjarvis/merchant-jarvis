/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicShopScreen } from './screens/PublicShopScreen';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { BottomTabBar } from './components/BottomTabBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdvanceOrderSheet } from './components/AdvanceOrderSheet';
import { NewOrderModal } from './components/NewOrderModal';
import { NewLedgerModal } from './components/NewLedgerModal';
import { AuthModal } from './components/AuthModal';
import { InstallKindnessModal } from './components/InstallKindnessModal';
import { StockRoomModal } from './components/StockRoomModal';
import { StockItemSheet } from './components/StockItemSheet';
import { StockImportModal } from './components/StockImportModal';
import { CloudMergeModal } from './components/CloudMergeModal';
import { DeviceLockScreen } from './components/DeviceLockScreen';
import { hasDevicePin } from './utils/security';
import { TabKey, Order, LedgerCategory, StockItem } from './types';
import { MJARVIS_FULL_BRAND_STAMP } from './utils/version';
import { WifiOff, RefreshCw } from 'lucide-react';

// Clause 6: Code-split screens via React.lazy + dynamic import
const TodayScreen = lazy(() => import('./screens/TodayScreen').then(m => ({ default: m.TodayScreen })));
const OrdersScreen = lazy(() => import('./screens/OrdersScreen').then(m => ({ default: m.OrdersScreen })));
const JarvisVoiceScreen = lazy(() => import('./screens/JarvisVoiceScreen').then(m => ({ default: m.JarvisVoiceScreen })));
const LedgerScreen = lazy(() => import('./screens/LedgerScreen').then(m => ({ default: m.LedgerScreen })));
const MenuScreen = lazy(() => import('./screens/MenuScreen').then(m => ({ default: m.MenuScreen })));

function ScreenSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-3">
      <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
      <span className="text-xs font-mono text-slate-400">Loading screen...</span>
    </div>
  );
}

function MerchantJarvisMain() {
  const { 
    orders, 
    advanceOrderStatus, 
    setOrderStatus, 
    isOnline, 
    budgetNotice, 
    addNewStockItem,
    pendingCloudMerge,
    confirmCloudMerge,
    cancelCloudMerge,
    privacyConsentGiven,
    setPrivacyConsentGiven,
    cloudChoice,
    user
  } = useStore();
  
  const [consentChecked, setConsentChecked] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isNewLedgerOpen, setIsNewLedgerOpen] = useState(false);
  const [ledgerDefaultType, setLedgerDefaultType] = useState<LedgerCategory>('Sale');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPWAInstallOpen, setIsPWAInstallOpen] = useState(false);

  // Clause 1: Device Lock (app opens to lock screen, never straight to Today)
  const [isDeviceLocked, setIsDeviceLocked] = useState<boolean>(() => hasDevicePin());

  // Clause 4: INSTALL KINDNESS - capture beforeinstallprompt at boot
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      console.info('[telemetry] pwa-install beforeinstallprompt-captured');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Stock modals state (Work Order v45 & v46)
  const [isStockRoomOpen, setIsStockRoomOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [isStockItemSheetOpen, setIsStockItemSheetOpen] = useState(false);
  const [isStockImportOpen, setIsStockImportOpen] = useState(false);
  const [stockImportInitialDoor, setStockImportInitialDoor] = useState<'door1' | 'door2'>('door1');

  const openOrdersCount = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Paid').length;

  const handleOpenNewLedgerWithType = (type: LedgerCategory = 'Sale') => {
    setLedgerDefaultType(type);
    setIsNewLedgerOpen(true);
  };

  const handleSelectStockItem = (item: StockItem) => {
    setSelectedStockItem(item);
    setIsStockItemSheetOpen(true);
  };

  const handleOpenStockImport = (door: 'door1' | 'door2' = 'door1') => {
    setStockImportInitialDoor(door);
    setIsStockImportOpen(true);
  };

  const handleAddNewStockItem = () => {
    const newItem = addNewStockItem({
      name: `New Product #${Math.floor(Math.random() * 900 + 100)}`,
      currentStock: 10,
      minThreshold: 5,
      baseUnit: 'units',
      sellingFormat: 'unit',
      packContains: 1,
      unitCost: 50,
      packCost: 50,
      unitPrice: 75,
      packPrice: 75,
      category: 'General',
      supplier: 'Local Supplier',
      supplierPhone: '+230 5...'
    });
    setSelectedStockItem(newItem);
    setIsStockItemSheetOpen(true);
  };

  const handleStartEditOrder = (order: Order) => {
    setOrderToEdit(order);
    setIsNewOrderOpen(true);
  };

  const handleCloseNewOrder = () => {
    setIsNewOrderOpen(false);
    setOrderToEdit(null);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Privacy Consent Modal (First-launch / Posture change) */}
      {!privacyConsentGiven && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-cyan-800/80 rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold">
                🔒
              </div>
              <div>
                <h2 className="text-sm font-bold text-cyan-300 uppercase tracking-wide">Data Privacy & Posture Consent</h2>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Posture: {cloudChoice}</span>
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-56 overflow-y-auto font-sans">
              {cloudChoice === 'local_only' && "Merchant Jarvis stores your shop's records only on this device. Logixtix Marketing Ltd collects nothing from your shop book. Minimal technical telemetry (app health counters) may be sent to keep the app reliable; you can switch it off in Settings. Your data stays yours: export or erase it anytime from Menu → Privacy & Data."}
              {cloudChoice === 'estate' && "Your shop's records travel encrypted and rest in the estate's secure cloud (Singapore region). Logixtix Marketing Ltd acts as processor; you remain controller of your customers' details. We collect only what the shop needs: shop profile, contact details, orders, ledger and stock records, plus minimal off-able telemetry. Export or erase your drawer anytime. Rights under the Data Protection Act 2017 (Mauritius) apply."}
              {cloudChoice === 'custom' && "Your shop's records live in YOUR own cloud account. Logixtix Marketing Ltd stores nothing of your shop book; we keep only your contact details for support and licensing, plus minimal off-able telemetry. You control retention and access entirely."}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={e => setConsentChecked(e.target.checked)}
                className="mt-0.5 rounded bg-slate-950 border-slate-700 text-cyan-500 w-4 h-4 shrink-0"
              />
              <span className="text-xs text-slate-200 font-medium leading-snug">
                I understand and agree to this data posture. (Guest users tick the Local Only notice; no tick, no entry).
              </span>
            </label>

            <button
              disabled={!consentChecked}
              onClick={() => {
                setPrivacyConsentGiven(true);
                setConsentChecked(false);
                if (!user) {
                  setIsAuthOpen(true);
                }
              }}
              className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                consentChecked ? 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer' : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
              }`}
            >
              Enter Shop
            </button>
          </div>
        </div>
      )}
      {/* Offline Toast Banner if disconnected */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 font-bold px-4 py-1.5 text-xs flex items-center justify-center gap-1.5 z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode — Actions are queued locally in browser</span>
        </div>
      )}

      {/* Cloud Budget Rest Notice */}
      {budgetNotice && (
        <div className="bg-amber-950/95 text-amber-200 border-b border-amber-800/80 px-4 py-2 text-xs flex items-center justify-between gap-1.5 z-40">
          <div className="flex items-center gap-1.5">
            <span>🌙</span>
            <span>{budgetNotice}</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-900/80 px-1.5 py-0.5 rounded text-amber-300 shrink-0">
            300/300
          </span>
        </div>
      )}

      {/* Main App Header */}
      <Header onOpenAuth={() => setIsAuthOpen(true)} />

      {/* Content View Container with Error Boundary & Lazy Suspense */}
      <main className="flex-1 max-w-md w-full mx-auto px-3.5 pt-3">
        <Suspense fallback={<ScreenSkeleton />}>
          {activeTab === 'today' && (
            <ErrorBoundary name="today-screen">
              <TodayScreen
                onOpenNewOrder={() => {
                  setOrderToEdit(null);
                  setIsNewOrderOpen(true);
                }}
                onOpenNewLedger={() => handleOpenNewLedgerWithType('Sale')}
                onSelectTab={setActiveTab}
                onSelectOrder={setSelectedOrder}
                onOpenStockRoom={() => setIsStockRoomOpen(true)}
                onOpenStockItem={handleSelectStockItem}
                onOpenStockImport={handleOpenStockImport}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'orders' && (
            <ErrorBoundary name="orders-screen">
              <OrdersScreen
                onOpenNewOrder={() => {
                  setOrderToEdit(null);
                  setIsNewOrderOpen(true);
                }}
                onSelectOrder={setSelectedOrder}
                onEditOrder={handleStartEditOrder}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'jarvis' && (
            <ErrorBoundary name="jarvis-screen">
              <JarvisVoiceScreen />
            </ErrorBoundary>
          )}

          {activeTab === 'ledger' && (
            <ErrorBoundary name="ledger-screen">
              <LedgerScreen
                onOpenNewLedger={handleOpenNewLedgerWithType}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'menu' && (
            <ErrorBoundary name="menu-screen">
              <MenuScreen
                onOpenAuth={() => setIsAuthOpen(true)}
                onOpenPWAInstall={() => setIsPWAInstallOpen(true)}
                onOpenStockRoom={() => setIsStockRoomOpen(true)}
              />
            </ErrorBoundary>
          )}
        </Suspense>

        {/* Global Footer */}
        <footer className="w-full text-center py-3 pb-8 text-[11px] font-mono text-slate-500/80 tracking-tight select-none">
          <span>{MJARVIS_FULL_BRAND_STAMP}</span>
        </footer>
      </main>

      {/* Bottom Navigation Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        openOrdersCount={openOrdersCount}
      />

      {/* Order Advance Status Bottom Sheet */}
      <ErrorBoundary name="advance-order-sheet">
        <AdvanceOrderSheet
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAdvance={advanceOrderStatus}
          onSetStatus={setOrderStatus}
          onEditOrder={handleStartEditOrder}
        />
      </ErrorBoundary>

      {/* New / Edit Order Modal Sheet */}
      <ErrorBoundary name="new-order-modal">
        <NewOrderModal
          isOpen={isNewOrderOpen}
          orderToEdit={orderToEdit}
          onClose={handleCloseNewOrder}
        />
      </ErrorBoundary>

      {/* New Ledger Entry Modal */}
      <ErrorBoundary name="new-ledger-modal">
        <NewLedgerModal
          isOpen={isNewLedgerOpen}
          onClose={() => setIsNewLedgerOpen(false)}
          defaultType={ledgerDefaultType}
        />
      </ErrorBoundary>

      {/* Estate Auth Modal */}
      <ErrorBoundary name="auth-modal">
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
        />
      </ErrorBoundary>

      {/* Install Kindness Modal (Clause 4) */}
      <ErrorBoundary name="install-kindness-modal">
        <InstallKindnessModal
          isOpen={isPWAInstallOpen}
          onClose={() => setIsPWAInstallOpen(false)}
          deferredPrompt={deferredInstallPrompt}
          onClearPrompt={() => setDeferredInstallPrompt(null)}
        />
      </ErrorBoundary>

      {/* Stock Room Manager Modal */}
      {isStockRoomOpen && (
        <ErrorBoundary name="stock-room-modal">
          <StockRoomModal
            isOpen={isStockRoomOpen}
            onClose={() => setIsStockRoomOpen(false)}
            onSelectItem={handleSelectStockItem}
            onOpenImport={handleOpenStockImport}
            onAddNewItem={handleAddNewStockItem}
          />
        </ErrorBoundary>
      )}

      {/* Stock Item Sheet */}
      {isStockItemSheetOpen && selectedStockItem && (
        <ErrorBoundary name="stock-item-sheet">
          <StockItemSheet
            item={selectedStockItem}
            isOpen={isStockItemSheetOpen}
            onClose={() => {
              setIsStockItemSheetOpen(false);
              setSelectedStockItem(null);
            }}
          />
        </ErrorBoundary>
      )}

      {/* Stock Import Modal */}
      {isStockImportOpen && (
        <ErrorBoundary name="stock-import-modal">
          <StockImportModal
            isOpen={isStockImportOpen}
            initialDoor={stockImportInitialDoor}
            onClose={() => setIsStockImportOpen(false)}
          />
        </ErrorBoundary>
      )}

      {/* Clause 5: Cloud Merge Read-Back Modal */}
      {pendingCloudMerge && (
        <ErrorBoundary name="cloud-merge-modal">
          <CloudMergeModal
            pendingMerge={pendingCloudMerge}
            onConfirm={confirmCloudMerge}
            onCancel={cancelCloudMerge}
          />
        </ErrorBoundary>
      )}

      {/* Clause 1: Device Lock Screen */}
      <ErrorBoundary name="device-lock-screen">
        <DeviceLockScreen
          isLocked={isDeviceLocked}
          onUnlock={() => setIsDeviceLocked(false)}
          onLock={() => setIsDeviceLocked(true)}
        />
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/shop/:slug" element={<PublicShopScreen />} />
          <Route path="*" element={<MerchantJarvisMain />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
