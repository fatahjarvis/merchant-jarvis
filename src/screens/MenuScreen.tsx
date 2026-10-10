import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { MJARVIS_FULL_BRAND_STAMP } from '../utils/version';
import { 
  Store, 
  Download, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  FileText, 
  Save, 
  RefreshCw, 
  ExternalLink,
  MessageSquare,
  Mail,
  Cloud,
  CloudOff,
  Code2,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Package,
  Layers,
  ChevronRight
} from 'lucide-react';

interface MenuScreenProps {
  onOpenAuth: () => void;
  onOpenPWAInstall: () => void;
  onOpenStockRoom: () => void;
}

const MAURITIUS_DISTRICTS = [
  'Port Louis',
  'Plaines Wilhems',
  'Pamplemousses',
  'Rivière du Rempart',
  'Flacq',
  'Grand Port',
  'Savanne',
  'Black River',
  'Moka'
];

export const MenuScreen: React.FC<MenuScreenProps> = ({
  onOpenAuth,
  onOpenPWAInstall,
  onOpenStockRoom
}) => {
  const { 
    profile, 
    updateProfile, 
    dataSaver, 
    toggleDataSaver, 
    user, 
    isAuthorizedOperator, 
    logout,
    orders,
    ledgerEntries,
    stockItems,
    syncQueueCount,
    triggerSync,
    isOnline,
    saveCustomCloudConfig,
    resetToEstateCloudDefault,
    isConfigOverridden,
    budgetStats,
    budgetNotice
  } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [shopName, setShopName] = useState(profile.shopName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [phone, setPhone] = useState(profile.phone);
  const [shopEmail, setShopEmail] = useState(profile.shopEmail || profile.email || '');
  const [whatsappNumber, setWhatsappNumber] = useState(profile.whatsappNumber || profile.phone || '');
  const [brn, setBrn] = useState(profile.brn);
  const [district, setDistrict] = useState(profile.district);
  const [address, setAddress] = useState(profile.address);
  
  // WhatsApp templates state (3 tongue-slots: EN, FR, Supplier)
  const [isEditingTemplates, setIsEditingTemplates] = useState(false);
  const [templateEn, setTemplateEn] = useState(
    profile.whatsappTemplateEn || 'Bonzour {customer}, your order #{orderNumber} from {shopName} is {status}. Total: {amount}. Thank you!'
  );
  const [templateFr, setTemplateFr] = useState(
    profile.whatsappTemplateFr || 'Bonjour {customer}, votre commande #{orderNumber} chez {shopName} est {status}. Total : {amount}. Merci !'
  );
  const [templateSupplier, setTemplateSupplier] = useState(
    profile.whatsappTemplateSupplier || '…please supply {qty} {unit} of {item} ({brand})…'
  );

  // Cloud config override state (estate-hand only)
  const [showAdvancedCloud, setShowAdvancedCloud] = useState(false);
  const [customConfigJson, setCustomConfigJson] = useState('');
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      shopName: shopName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      shopEmail: shopEmail.trim(),
      whatsappNumber: whatsappNumber.trim(),
      brn: brn.trim(),
      district,
      address: address.trim()
    });
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSaveTemplates = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      whatsappTemplateEn: templateEn.trim(),
      whatsappTemplateFr: templateFr.trim(),
      whatsappTemplateSupplier: templateSupplier.trim()
    });
    setIsEditingTemplates(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleApplyConfigOverride = () => {
    try {
      saveCustomCloudConfig(customConfigJson);
      setConfigFeedback("Custom Estate Cloud config applied to localStorage.");
      setTimeout(() => setConfigFeedback(null), 3500);
    } catch (err: any) {
      setConfigFeedback(`Error: ${err.message || 'Invalid JSON'}`);
    }
  };

  const handleResetConfig = () => {
    resetToEstateCloudDefault();
    setCustomConfigJson('');
    setConfigFeedback("Reset to Estate Cloud baseline default.");
    setTimeout(() => setConfigFeedback(null), 3500);
  };

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await triggerSync();
    setTimeout(() => setIsSyncing(false), 600);
  };

  const toggleSalesDecrement = () => {
    updateProfile({
      salesDecrementStock: !profile.salesDecrementStock
    });
  };

  const lowStockCount = stockItems.filter(s => s.currentStock <= s.minThreshold).length;

  return (
    <div className="space-y-4 pb-24">
      {/* Merchant Profile Card */}
      <div className="bg-[#070e1c] border border-cyan-950/80 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">{profile.shopName}</h2>
              <p className="text-xs text-slate-400">{profile.ownerName} · {profile.district}</p>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-cyan-400 hover:border-cyan-600 transition"
            style={{ minHeight: '38px' }}
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {saveSuccess && (
          <div className="mt-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800 p-2 rounded-lg flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Profile & templates saved successfully!</span>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-3 mt-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Owner Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Shop Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 outline-none"
                />
              </div>
            </div>

            {/* Shop Voice: shopEmail + whatsappNumber */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Shop Email (Day Book)</label>
                <input
                  type="email"
                  value={shopEmail}
                  onChange={e => setShopEmail(e.target.value)}
                  placeholder="shop@tibazar.mu"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">WhatsApp Business #</label>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={e => setWhatsappNumber(e.target.value)}
                  placeholder="+230 5..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">BRN (Business No.)</label>
                <input
                  type="text"
                  value={brn}
                  onChange={e => setBrn(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">District</label>
                <select
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  {MAURITIUS_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              style={{ minHeight: '44px' }}
            >
              <Save className="w-4 h-4" /> Save Profile
            </button>
          </form>
        ) : (
          <div className="space-y-2 mt-3 text-xs text-slate-300">
            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-cyan-400" /> Shop Email</span>
              <span className="font-mono text-cyan-300">{profile.shopEmail || profile.email}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp</span>
              <span className="font-mono text-emerald-300">{profile.whatsappNumber || profile.phone}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-cyan-400" /> BRN</span>
              <span className="font-mono text-cyan-300 font-bold">{profile.brn}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-teal-400" /> Phone</span>
              <span className="font-mono text-slate-200">{profile.phone}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-amber-400" /> Location</span>
              <span className="text-slate-200 text-right">{profile.address}</span>
            </div>
          </div>
        )}
      </div>

      {/* STOCK MANAGER ENTRY CARD (Work order v45 Item 1) */}
      <div 
        onClick={onOpenStockRoom}
        className="bg-[#070e1c] border border-cyan-800/80 hover:border-cyan-500 rounded-2xl p-4 cursor-pointer transition shadow-xl space-y-2.5 active:scale-98"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700 text-cyan-400 flex items-center justify-center">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>Stock Room Manager</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  DOORS 1·2·3
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {stockItems.length} items · {lowStockCount} alert{lowStockCount === 1 ? '' : 's'} · CSV/Excel & Vision Photo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-mono font-bold text-cyan-400">
            <span>Open</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* SHOP VOICE: WhatsApp Templates Editor (Item 5: 3rd Tongue-Slot for Supplier Reorder) */}
      <div className="bg-[#070e1c] border border-slate-850 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Shop Voice · WhatsApp Templates</h3>
              <p className="text-[11px] text-slate-400">3 tongue-slots: Customer EN, FR, and Supplier Reorder</p>
            </div>
          </div>
          <button
            onClick={() => setIsEditingTemplates(!isEditingTemplates)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-semibold"
            style={{ minHeight: '36px' }}
          >
            {isEditingTemplates ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {isEditingTemplates ? (
          <form onSubmit={handleSaveTemplates} className="space-y-3 pt-1">
            {/* Slot 1: English */}
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                1. Customer English Template
              </label>
              <textarea
                rows={2}
                value={templateEn}
                onChange={e => setTemplateEn(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 outline-none font-sans"
              />
            </div>

            {/* Slot 2: Français */}
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                2. Client Français Template
              </label>
              <textarea
                rows={2}
                value={templateFr}
                onChange={e => setTemplateFr(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 outline-none font-sans"
              />
            </div>

            {/* Slot 3: Supplier Reorder (Item 5) */}
            <div>
              <label className="text-xs text-emerald-400 font-medium block mb-1">
                3. Supplier Reorder Loop Template ({'{supplier}'}, {'{item}'}, {'{qty}'}, {'{shopName}'})
              </label>
              <textarea
                rows={2}
                value={templateSupplier}
                onChange={e => setTemplateSupplier(e.target.value)}
                className="w-full bg-slate-900 border border-emerald-800/80 rounded-xl p-2.5 text-xs text-slate-100 outline-none font-sans"
              />
            </div>

            <p className="text-[10px] text-slate-500 font-mono">
              Supplier tokens: {'{supplier}'}, {'{item}'}, {'{qty}'}, {'{shopName}'}
            </p>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              style={{ minHeight: '40px' }}
            >
              <Save className="w-3.5 h-3.5" /> Save All 3 WhatsApp Templates
            </button>
          </form>
        ) : (
          <div className="space-y-2 text-xs text-slate-300">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-900">
              <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold block mb-0.5">Customer EN:</span>
              <p className="italic text-slate-300">"{profile.whatsappTemplateEn}"</p>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-900">
              <span className="text-[10px] text-teal-400 font-mono uppercase font-bold block mb-0.5">Customer FR:</span>
              <p className="italic text-slate-300">"{profile.whatsappTemplateFr}"</p>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-emerald-900/50">
              <span className="text-[10px] text-emerald-300 font-mono uppercase font-bold block mb-0.5">Supplier Reorder Loop:</span>
              <p className="italic text-slate-300">"{profile.whatsappTemplateSupplier}"</p>
            </div>
          </div>
        )}
      </div>

      {/* CLOUD VEIL: CLOUD SYNC Panel */}
      <div className="bg-[#070e1c] border border-cyan-950/80 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">CLOUD SYNC</h3>
              <p className="text-[11px] text-slate-400">Tenancy drawer & live synchronization</p>
            </div>
          </div>
          <button
            onClick={handleSyncClick}
            disabled={!isOnline}
            className="text-xs text-cyan-400 font-mono flex items-center gap-1 hover:underline disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>

        {/* Status card (Connected / Offline guest) */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isOnline ? (
              <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            ) : (
              <div className="w-3 h-3 rounded-full bg-amber-400" />
            )}
            <div>
              <span className="text-xs font-bold text-slate-100 block">
                {isOnline ? (user ? 'Connected' : 'Connected (Offline guest)') : 'Offline guest mode'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Tenancy: {profile.merchantId}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
            isOnline ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-amber-950 text-amber-300 border-amber-800'
          }`}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* Local Storage & Sync Queue Status */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-950 p-2 rounded-xl border border-slate-900">
            <span className="text-[10px] text-slate-500 block">Orders</span>
            <span className="font-mono font-bold text-slate-200">{orders.length}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded-xl border border-slate-900">
            <span className="text-[10px] text-slate-500 block">Stock SKUs</span>
            <span className="font-mono font-bold text-slate-200">{stockItems.length}</span>
          </div>
          <div className="bg-slate-950 p-2 rounded-xl border border-slate-900">
            <span className="text-[10px] text-slate-500 block">Pending Queue</span>
            <span className={`font-mono font-bold ${syncQueueCount > 0 ? 'text-amber-400' : 'text-teal-400'}`}>
              {syncQueueCount}
            </span>
          </div>
        </div>

        {/* Telemetry Leg: cloud-budget r/w & Daily Device Budget */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-900 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-300">
              {budgetStats.telemetryLeg}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              budgetStats.isRestingTonight
                ? 'bg-rose-950 text-rose-300 border-rose-800'
                : budgetStats.isAmberAlert
                ? 'bg-amber-950 text-amber-300 border-amber-800 font-bold'
                : 'bg-teal-950 text-teal-300 border-teal-800'
            }`}>
              {budgetStats.isRestingTonight 
                ? 'RESTING' 
                : budgetStats.isAmberAlert 
                ? 'AMBER 60%+' 
                : 'BUDGET OK'}
            </span>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                budgetStats.isRestingTonight 
                  ? 'bg-rose-500' 
                  : budgetStats.isAmberAlert 
                  ? 'bg-amber-400' 
                  : 'bg-teal-400'
              }`}
              style={{ width: `${Math.min(100, (budgetStats.writes / budgetStats.maxWrites) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Daily writes: {budgetStats.writes} / {budgetStats.maxWrites}</span>
            <span>Single-doc day-book active</span>
          </div>

          {budgetNotice && (
            <div className="pt-1 text-[11px] text-amber-300 italic">
              🌙 {budgetNotice}
            </div>
          )}
        </div>

        {/* Estate Auth Status */}
        <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Account: <strong className="text-slate-200">{user?.email || 'Guest Drawer'}</strong>
          </span>
          <button
            onClick={onOpenAuth}
            className="text-xs text-cyan-400 font-semibold hover:underline"
          >
            {user ? 'Account Roles' : 'Sign In'}
          </button>
        </div>

        {/* ADVANCED Section: estate-hand only, hidden behind operator role */}
        <div className="pt-2 border-t border-slate-900">
          <button
            onClick={() => setShowAdvancedCloud(!showAdvancedCloud)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-cyan-400 transition py-1"
          >
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Code2 className="w-3.5 h-3.5 text-cyan-500" />
              ADVANCED CLOUD CONFIG (Estate-Hand Only)
            </span>
            <span className="text-[10px] font-mono text-cyan-400">
              {showAdvancedCloud ? 'Hide' : 'Show'}
            </span>
          </button>

          {showAdvancedCloud && (
            <div className="mt-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Custom Cloud Override</span>
                {isConfigOverridden ? (
                  <span className="text-[10px] text-amber-400 font-mono bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    OVERRIDE ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] text-teal-400 font-mono bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
                    ESTATE DEFAULT
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Paste an override config JSON stored in localStorage for custom estate environments.
              </p>

              <textarea
                rows={4}
                value={customConfigJson}
                onChange={e => setCustomConfigJson(e.target.value)}
                placeholder='{\n  "apiKey": "...",\n  "projectId": "..."\n}'
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-100 outline-none"
              />

              {configFeedback && (
                <div className="text-xs font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-800 p-2 rounded-lg">
                  {configFeedback}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyConfigOverride}
                  disabled={!customConfigJson.trim()}
                  className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs disabled:opacity-40"
                  style={{ minHeight: '38px' }}
                >
                  Save Override JSON
                </button>
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1"
                  style={{ minHeight: '38px' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Estate Default</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preferences & Tools Section (Item 6: MOVEMENTS Settings toggle 'sales decrement stock') */}
      <div className="bg-[#070e1c] border border-slate-850 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferences & Movements</h3>

        {/* Sales Decrement Stock Toggle (Item 6) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div>
            <span className="text-sm font-bold text-slate-200 block">Sales Decrement Stock</span>
            <span className="text-xs text-slate-400">
              Automatically decrements inventory count when orders are delivered or paid (default ON)
            </span>
          </div>
          <button
            onClick={toggleSalesDecrement}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 shrink-0 ${
              profile.salesDecrementStock ? 'bg-cyan-500' : 'bg-slate-800'
            }`}
            style={{ minHeight: '28px' }}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              profile.salesDecrementStock ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Data-Saver Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div>
            <span className="text-sm font-bold text-slate-200 block">Data-Saver Mode</span>
            <span className="text-xs text-slate-400">Minimizes network sync & voice bandwidth</span>
          </div>
          <button
            onClick={toggleDataSaver}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 shrink-0 ${
              dataSaver ? 'bg-cyan-500' : 'bg-slate-800'
            }`}
            style={{ minHeight: '28px' }}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              dataSaver ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Install PWA Button */}
        <button
          onClick={onOpenPWAInstall}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 text-left transition"
          style={{ minHeight: '48px' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-200 block">Install App (PWA)</span>
              <span className="text-xs text-slate-400">Android WebAPK / iOS Safari standalone</span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-400">Launch</span>
        </button>
      </div>

      {/* About Card: Logixtix Marketing Ltd · Mauritius */}
      <div className="bg-[#050914] border border-cyan-950/70 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-cyan-300 text-xs tracking-tight">
            {MJARVIS_FULL_BRAND_STAMP}
          </span>
          <span className="font-mono text-[10px] text-teal-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 font-semibold">
            ESTATE EDITION
          </span>
        </div>

        <p className="leading-relaxed">
          Merchant Jarvis. Sibling product of the{' '}
          <a
            href="https://jarvismu.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 underline font-medium inline-flex items-center gap-0.5"
          >
            {MJARVIS_SHOWROOM} <ExternalLink className="w-3 h-3 inline" />
          </a>{' '}
          showroom.
        </p>

        <p className="text-[11px] text-slate-500 border-t border-slate-900 pt-2 font-mono">
          Governed under feat(mjarvis) specifications · Mobile-first PWA for Mauritius SME retailers.
        </p>
      </div>
    </div>
  );
};
