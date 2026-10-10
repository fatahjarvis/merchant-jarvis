/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { BottomTabBar } from './components/BottomTabBar';
import { TodayScreen } from './screens/TodayScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { JarvisVoiceScreen } from './screens/JarvisVoiceScreen';
import { LedgerScreen } from './screens/LedgerScreen';
import { MenuScreen } from './screens/MenuScreen';
import { AdvanceOrderSheet } from './components/AdvanceOrderSheet';
import { NewOrderModal } from './components/NewOrderModal';
import { NewLedgerModal } from './components/NewLedgerModal';
import { AuthModal } from './components/AuthModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { StockRoomModal } from './components/StockRoomModal';
import { StockItemSheet } from './components/StockItemSheet';
import { StockImportModal } from './components/StockImportModal';
import { TabKey, Order, LedgerCategory, StockItem } from './types';
import { MJARVIS_FULL_BRAND_STAMP } from './utils/version';
import { WifiOff } from 'lucide-react';

function MerchantJarvisMain() {
  const { orders, advanceOrderStatus, setOrderStatus, isOnline, budgetNotice, addNewStockItem } = useStore();
  
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isNewLedgerOpen, setIsNewLedgerOpen] = useState(false);
  const [ledgerDefaultType, setLedgerDefaultType] = useState<LedgerCategory>('Sale');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPWAInstallOpen, setIsPWAInstallOpen] = useState(false);

  // Stock modals state (Work Order v45)
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
      unit: 'units',
      category: 'General',
      costPrice: 50,
      sellingPrice: 75,
      supplier: 'Local Supplier',
      supplierPhone: '+230 5...'
    });
    setSelectedStockItem(newItem);
    setIsStockItemSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans select-none antialiased">
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

      {/* Content View Container: Mobile single-column flow */}
      <main className="flex-1 max-w-md w-full mx-auto px-3.5 pt-3">
        {activeTab === 'today' && (
          <TodayScreen
            onOpenNewOrder={() => setIsNewOrderOpen(true)}
            onOpenNewLedger={() => handleOpenNewLedgerWithType('Sale')}
            onSelectTab={setActiveTab}
            onSelectOrder={setSelectedOrder}
            onOpenStockRoom={() => setIsStockRoomOpen(true)}
            onOpenStockItem={handleSelectStockItem}
            onOpenStockImport={handleOpenStockImport}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersScreen
            onOpenNewOrder={() => setIsNewOrderOpen(true)}
            onSelectOrder={setSelectedOrder}
          />
        )}

        {activeTab === 'jarvis' && (
          <JarvisVoiceScreen />
        )}

        {activeTab === 'ledger' && (
          <LedgerScreen
            onOpenNewLedger={handleOpenNewLedgerWithType}
          />
        )}

        {activeTab === 'menu' && (
          <MenuScreen
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenPWAInstall={() => setIsPWAInstallOpen(true)}
            onOpenStockRoom={() => setIsStockRoomOpen(true)}
          />
        )}

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
      <AdvanceOrderSheet
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAdvance={advanceOrderStatus}
        onSetStatus={setOrderStatus}
      />

      {/* New Order Modal Sheet */}
      <NewOrderModal
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
      />

      {/* New Ledger Entry Modal */}
      <NewLedgerModal
        isOpen={isNewLedgerOpen}
        onClose={() => setIsNewLedgerOpen(false)}
        defaultType={ledgerDefaultType}
      />

      {/* Estate Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* PWA Install Modal */}
      <PWAInstallModal
        isOpen={isPWAInstallOpen}
        onClose={() => setIsPWAInstallOpen(false)}
      />

      {/* Stock Room Manager Modal (Item 1) */}
      {isStockRoomOpen && (
        <StockRoomModal
          isOpen={isStockRoomOpen}
          onClose={() => setIsStockRoomOpen(false)}
          onSelectItem={handleSelectStockItem}
          onOpenImport={handleOpenStockImport}
          onAddNewItem={handleAddNewStockItem}
        />
      )}

      {/* Stock Item Sheet (Item 1 & Item 6) */}
      {isStockItemSheetOpen && selectedStockItem && (
        <StockItemSheet
          item={selectedStockItem}
          isOpen={isStockItemSheetOpen}
          onClose={() => {
            setIsStockItemSheetOpen(false);
            setSelectedStockItem(null);
          }}
        />
      )}

      {/* Stock Import Modal (Doors 1 & 2) */}
      {isStockImportOpen && (
        <StockImportModal
          isOpen={isStockImportOpen}
          initialDoor={stockImportInitialDoor}
          onClose={() => setIsStockImportOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <MerchantJarvisMain />
    </StoreProvider>
  );
}
