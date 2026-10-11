import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { MJARVIS_FULL_BRAND_STAMP, MJARVIS_SHOWROOM } from '../utils/version';
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
  ChevronRight,
  Smartphone,
  Activity,
  Terminal,
  Database,
  Upload,
  Trash2,
  Lock
} from 'lucide-react';
import { verifyDevicePin } from '../utils/security';

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
    budgetNotice,
    cloudChoice,
    setCloudChoiceMode,
    probeCustomCloudConfig,
    deviceSessions,
    signOutElsewhere,
    syncLatencyMs,
    storagePayloadKb,
    cloudSnapshots,
    downloadBackup,
    restoreBackup,
    restoreCloudSnapshot,
    resetShopData,
    factoryResetShop,
    exportDrawer,
    eraseDrawer,
    telemetryEnabled,
    toggleTelemetry,
    licenceKey,
    licenceState,
    activateLicence,
    deleteLicence
  } = useStore();

  const [autoRefreshDiagnostics, setAutoRefreshDiagnostics] = useState(false);
  const [compressedBackup, setCompressedBackup] = useState(true);

  const [eraseModalOpen, setEraseModalOpen] = useState(false);
  const [eraseTypedErase, setEraseTypedErase] = useState('');
  const [erasePin, setErasePin] = useState('');
  const [eraseError, setEraseError] = useState<string | null>(null);

  const [licensingModalOpen, setLicensingModalOpen] = useState(false);
  const [licencePaste, setLicencePaste] = useState('');
  const [licenceError, setLicenceError] = useState<string | null>(null);

  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreStaging, setRestoreStaging] = useState<{ rawContent: string | ArrayBuffer; isCompressed: boolean; summary?: string } | null>(null);
  const [restorePin, setRestorePin] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  const [dangerModalOpen, setDangerModalOpen] = useState(false);
  const [dangerActionType, setDangerActionType] = useState<'reset_shop' | 'factory_reset' | null>(null);
  const [dangerTypedReset, setDangerTypedReset] = useState('');
  const [dangerPin, setDangerPin] = useState('');
  const [dangerError, setDangerError] = useState<string | null>(null);

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

  // Cloud Choice & My Own Cloud guided paste panel state
  const [showCustomPastePanel, setShowCustomPastePanel] = useState(false);
  const [customCloudJsonInput, setCustomCloudJsonInput] = useState('');
  const [probeResult, setProbeResult] = useState<{ success: boolean; projectId?: string; error?: string } | null>(null);
  const [isProbing, setIsProbing] = useState(false);

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

      {/* CLOUD VEIL: CLOUD CHOICE (3 cards) & MULTI-DEVICE & ADVANCED */}
      <div className="bg-[#070e1c] border border-cyan-950/80 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">CLOUD CHOICE & SESSIONS</h3>
              <p className="text-[11px] text-slate-400">Select your tenancy posture & manage connected devices</p>
            </div>
          </div>
          <button
            onClick={handleSyncClick}
            disabled={!isOnline || cloudChoice === 'local_only'}
            className="text-xs text-cyan-400 font-mono flex items-center gap-1 hover:underline disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>

        {/* 1. CLOUD CHOICE: Three cards */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">1. Tenancy Posture</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Card 1: Estate Cloud */}
            <div 
              onClick={() => {
                setCloudChoiceMode('estate');
                setShowCustomPastePanel(false);
              }}
              className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                cloudChoice === 'estate' 
                  ? 'bg-cyan-950/60 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
                  : 'bg-slate-950/80 border-slate-850 hover:border-slate-700'
              }`}
              style={{ minHeight: '90px' }}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-100">Estate Cloud</span>
                  {cloudChoice === 'estate' && <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Default estate infrastructure with secure backup & sync.
                </p>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 pt-2">Active Default</span>
            </div>

            {/* Card 2: My Own Cloud */}
            <div 
              onClick={() => {
                setCloudChoiceMode('custom');
                setShowCustomPastePanel(true);
              }}
              className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                cloudChoice === 'custom' 
                  ? 'bg-teal-950/60 border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.25)]' 
                  : 'bg-slate-950/80 border-slate-850 hover:border-slate-700'
              }`}
              style={{ minHeight: '90px' }}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-100">My Own Cloud</span>
                  {cloudChoice === 'custom' && <CheckCircle className="w-3.5 h-3.5 text-teal-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Bring your own Firebase project configuration JSON.
                </p>
              </div>
              <span className="text-[10px] font-mono text-teal-400 pt-2">Configure & Probe</span>
            </div>

            {/* Card 3: Local Only */}
            <div 
              onClick={() => {
                setCloudChoiceMode('local_only');
                setShowCustomPastePanel(false);
              }}
              className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                cloudChoice === 'local_only' 
                  ? 'bg-amber-950/60 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                  : 'bg-slate-950/80 border-slate-850 hover:border-slate-700'
              }`}
              style={{ minHeight: '90px' }}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-100">Local Only</span>
                  {cloudChoice === 'local_only' && <CheckCircle className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  No cloud sync. Your data lives strictly on this device.
                </p>
              </div>
              <span className="text-[10px] font-mono text-amber-400 pt-2">Strict Offline</span>
            </div>
          </div>

          {/* Guided Paste Panel for 'My Own Cloud' */}
          {showCustomPastePanel && cloudChoice === 'custom' && (
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-teal-800/80 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-300">Guided Custom Cloud Configuration</span>
                <span className="text-[10px] font-mono text-slate-400">Firebase Web SDK JSON</span>
              </div>

              {/* Plain plaque requested */}
              <div className="bg-teal-950/40 border border-teal-800/70 p-2.5 rounded-xl text-[11px] text-teal-200">
                "Your data will live in YOUR cloud; the estate keeps only your contact details."
              </div>

              <textarea
                rows={4}
                value={customCloudJsonInput}
                onChange={e => setCustomCloudJsonInput(e.target.value)}
                placeholder={'{\n  "apiKey": "AIzaSy...",\n  "authDomain": "your-project.firebaseapp.com",\n  "projectId": "your-project-id",\n  "storageBucket": "...",\n  "messagingSenderId": "...",\n  "appId": "..."\n}'}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-100 outline-none"
              />

              {probeResult && (
                <div className={`p-2 rounded-lg text-xs font-mono flex items-center gap-1.5 ${
                  probeResult.success ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  {probeResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{probeResult.success ? `Validation probe passed! Connected to projectId: ${probeResult.projectId}` : `Probe error: ${probeResult.error}`}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!customCloudJsonInput.trim() || isProbing}
                  onClick={async () => {
                    setIsProbing(true);
                    setProbeResult(null);
                    try {
                      const res = await probeCustomCloudConfig(customCloudJsonInput);
                      setProbeResult(res);
                      if (res.success) {
                        saveCustomCloudConfig(customCloudJsonInput);
                      }
                    } catch (err: any) {
                      setProbeResult({ success: false, error: err.message || 'Probe failed' });
                    } finally {
                      setIsProbing(false);
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs disabled:opacity-40 transition"
                  style={{ minHeight: '38px' }}
                >
                  {isProbing ? 'Probing Project...' : 'Validate Probe & Save'}
                </button>
              </div>
            </div>
          )}

          {/* Clause 2: Local Only notice banner if active */}
          {cloudChoice === 'local_only' && (
            <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 text-xs text-amber-300 flex items-center gap-2.5">
              <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Local Only — your shop, your device. All background sync is disabled.</span>
            </div>
          )}
        </div>

        {/* 3. MULTI-DEVICE card */}
        <div className="pt-3 border-t border-slate-850 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Multi-Device Sessions</span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
              {deviceSessions.length} active sessions
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Same login across multiple devices. Heartbeat sync tracked in estate register.
          </p>

          <div className="space-y-2">
            {deviceSessions.map((session, idx) => (
              <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                      {session.deviceName}
                      {session.isCurrent && (
                        <span className="text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded">
                          This device
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Last sync: {new Date(session.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={signOutElsewhere}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            style={{ minHeight: '38px' }}
          >
            <span>Sign out elsewhere</span>
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

      {/* Licensing Door */}
      <div className="bg-[#070e1c] border border-slate-850 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Licensing</h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
            licenceState === 'ACTIVE' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-800 text-slate-400'
          }`}>
            {licenceState}
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Status: {licenceKey?.tier || 'FREE_PILOT'} tier · {licenceKey ? 'Active' : 'Grace Period'}
        </p>
        <button
          onClick={() => setLicensingModalOpen(true)}
          className="w-full p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-teal-300 transition"
        >
          Manage Licence
        </button>
      </div>

      {/* Licensing Modal */}
      {licensingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-teal-900 rounded-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in">
            <h3 className="text-sm font-bold text-teal-400">Licensing Door</h3>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-200">
              <div>Tier: {licenceKey?.tier || 'FREE_PILOT'}</div>
              <div>Organisation: {licenceKey?.org || '—'}</div>
              <div>Expiry: {licenceKey?.expiry || '—'}</div>
            </div>
            <input
              type="text"
              value={licencePaste}
              onChange={e => setLicencePaste(e.target.value)}
              placeholder="Paste MJV Key..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-100 outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLicensingModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  const success = await activateLicence(licencePaste);
                  if (success) {
                    setLicensingModalOpen(false);
                    alert("Licence activated!");
                  } else {
                    setLicenceError("Invalid licence key.");
                  }
                }}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold"
              >
                Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Shop Diagnostics Room */}
      <div className="bg-[#070e1c] border border-cyan-900/60 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Shop Diagnostics Room</h3>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-400 flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefreshDiagnostics}
                onChange={e => setAutoRefreshDiagnostics(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500"
              />
              Auto-refresh
            </label>
            <button
              onClick={() => triggerSync()}
              className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 rounded text-[10px] font-mono text-cyan-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] font-mono text-slate-400 block">Sync Latency</span>
            <span className="text-sm font-bold font-mono text-cyan-400">{syncLatencyMs} ms</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] font-mono text-slate-400 block">Queue Depth</span>
            <span className={`text-sm font-bold font-mono ${syncQueueCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {syncQueueCount} pending
            </span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] font-mono text-slate-400 block">Storage Payload</span>
            <span className="text-sm font-bold font-mono text-teal-400">{storagePayloadKb} KB</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
            <span className="text-[10px] font-mono text-slate-400 block">Live Posture</span>
            <span className="text-xs font-bold font-mono text-amber-300 uppercase truncate block" title={cloudChoice}>
              {cloudChoice === 'estate' ? 'ESTATE CLOUD' : cloudChoice === 'custom' ? 'OWN CLOUD' : 'LOCAL ONLY'}
            </span>
          </div>
        </div>

        {/* Device Presence */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-400">Active Devices ({deviceSessions.length})</span>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {deviceSessions.map((ds, idx) => (
              <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-900 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-200">{ds.deviceName} {ds.isCurrent && '(This)'}</span>
                <span className="text-[10px] text-slate-400">{new Date(ds.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Backup & Restore Card */}
      <div className="bg-[#070e1c] border border-slate-850 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Backup & Restore</h3>
          </div>
          <label className="text-[10px] text-slate-400 flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={compressedBackup}
              onChange={e => setCompressedBackup(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-teal-500"
            />
            Compress (.z)
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => downloadBackup(compressedBackup)}
            className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-teal-300 transition"
          >
            <Download className="w-4 h-4" /> Download Backup ({compressedBackup ? '.z' : '.json'})
          </button>

          <label className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-cyan-300 transition cursor-pointer">
            <Upload className="w-4 h-4" /> Restore from File (.json/.z)
            <input
              type="file"
              accept=".json,.z"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const isCompressed = file.name.endsWith('.z');
                const rawContent = isCompressed ? await file.arrayBuffer() : await file.text();
                try {
                  let jsonStr = '';
                  if (isCompressed && rawContent instanceof ArrayBuffer && typeof DecompressionStream !== 'undefined') {
                    const stream = new Response(rawContent).body!.pipeThrough(new DecompressionStream('gzip'));
                    jsonStr = await new Response(stream).text();
                  } else {
                    jsonStr = rawContent as string;
                  }
                  const parsed = JSON.parse(jsonStr);
                  const summary = `${parsed.orders?.length || 0} orders, ${parsed.ledgerEntries?.length || 0} ledger lines, ${parsed.stockItems?.length || 0} stock items`;
                  setRestoreStaging({ rawContent, isCompressed, summary });
                  setRestoreModalOpen(true);
                } catch (err: any) {
                  alert(`Failed to read backup file: ${err.message}`);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* 3. Cloud Snapshots Card */}
      {cloudSnapshots.length > 0 && (
        <div className="bg-[#070e1c] border border-slate-850 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cloud Backup History (Snapshots)</span>
            <span className="text-[10px] font-mono text-teal-400">{cloudSnapshots.length} stored (max 14)</span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {cloudSnapshots.map(snap => (
              <div key={snap.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="font-bold text-slate-200 block">{snap.date}</span>
                  <span className="text-[10px] text-slate-400">
                    {snap.ordersCount} orders · {snap.ledgerCount} ledger · {snap.stockCount} stock
                  </span>
                </div>
                <button
                  onClick={async () => {
                    if (confirm(`Restore snapshot for ${snap.date}? This will replace current local data.`)) {
                      await restoreCloudSnapshot(snap.id);
                      setRestoreSuccess(`Restored snapshot from ${snap.date}`);
                      setTimeout(() => setRestoreSuccess(null), 3000);
                    }
                  }}
                  className="px-2.5 py-1 bg-teal-950 hover:bg-teal-900 border border-teal-800 text-teal-300 rounded text-[11px]"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
          {restoreSuccess && (
            <div className="p-2 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded text-xs font-mono">
              {restoreSuccess}
            </div>
          )}
        </div>
      )}

      {/* 4. Danger Zone Card */}
      <div className="bg-[#120505] border-2 border-rose-900/80 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400">
            <Trash2 className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Danger Zone</h3>
        </div>
        <p className="text-[11px] text-slate-400">
          Destructive operations require explicit read-back 'RESET' and device PIN verification.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => {
              setDangerActionType('reset_shop');
              setDangerTypedReset('');
              setDangerPin('');
              setDangerError(null);
              setDangerModalOpen(true);
            }}
            className="p-2.5 bg-rose-950/60 hover:bg-rose-950 border border-rose-800/80 rounded-xl text-xs font-bold text-rose-300 transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Shop Data
          </button>
          <button
            onClick={() => {
              setDangerActionType('factory_reset');
              setDangerTypedReset('');
              setDangerPin('');
              setDangerError(null);
              setDangerModalOpen(true);
            }}
            className="p-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 rounded-xl text-xs font-bold text-rose-200 transition flex items-center justify-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" /> Factory Reset
          </button>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {restoreModalOpen && restoreStaging && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-cyan-800 rounded-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in">
            <h3 className="text-sm font-bold text-cyan-300">Confirm Backup Restore</h3>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-200">
              {restoreStaging.summary} will REPLACE current local data.
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Enter Device PIN to Confirm</label>
              <input
                type="password"
                maxLength={6}
                value={restorePin}
                onChange={e => setRestorePin(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center text-lg font-mono text-slate-100 outline-none"
              />
            </div>
            {restoreError && (
              <div className="p-2 bg-rose-950 border border-rose-800 text-rose-300 rounded text-xs font-mono">
                {restoreError}
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setRestoreModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const validPin = await verifyDevicePin(restorePin);
                  if (!validPin) {
                    setRestoreError("Invalid device PIN.");
                    return;
                  }
                  const res = await restoreBackup(restoreStaging.rawContent, restoreStaging.isCompressed);
                  if (res.success) {
                    setRestoreModalOpen(false);
                    alert(res.message);
                  } else {
                    setRestoreError(res.message);
                  }
                }}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
              >
                Proceed Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone Modal */}
      {dangerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-rose-900 rounded-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in">
            <h3 className="text-sm font-bold text-rose-400">
              {dangerActionType === 'reset_shop' ? 'Confirm Reset Shop Data' : 'Confirm Factory Reset'}
            </h3>
            <p className="text-xs text-slate-300">
              Type <span className="font-mono font-bold text-rose-400">RESET</span> below and enter your device PIN.
            </p>
            <input
              type="text"
              value={dangerTypedReset}
              onChange={e => setDangerTypedReset(e.target.value)}
              placeholder="Type RESET"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center text-xs font-mono text-rose-300 outline-none uppercase"
            />
            <div>
              <label className="text-xs text-slate-400 block mb-1">Device PIN</label>
              <input
                type="password"
                maxLength={6}
                value={dangerPin}
                onChange={e => setDangerPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center text-lg font-mono text-slate-100 outline-none"
              />
            </div>
            {dangerError && (
              <div className="p-2 bg-rose-950 border border-rose-800 text-rose-300 rounded text-xs font-mono">
                {dangerError}
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDangerModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (dangerTypedReset.trim().toUpperCase() !== 'RESET') {
                    setDangerError("You must type RESET to confirm.");
                    return;
                  }
                  const validPin = await verifyDevicePin(dangerPin);
                  if (!validPin) {
                    setDangerError("Invalid device PIN.");
                    return;
                  }
                  if (dangerActionType === 'reset_shop') {
                    resetShopData();
                    console.info('[telemetry] danger-zone reset-shop-data');
                    alert("Shop data successfully reset.");
                  } else if (dangerActionType === 'factory_reset') {
                    await factoryResetShop();
                    console.info('[telemetry] danger-zone factory-reset');
                    alert("Factory reset completed.");
                  }
                  setDangerModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
              >
                Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy & Data Section */}
      <div className="bg-[#070e1c] border border-slate-850 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Privacy & Data</h3>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 font-mono text-[11px] text-slate-300 space-y-1">
          <div><strong className="text-slate-400">Posture:</strong> <span className="text-cyan-300">{cloudChoice}</span></div>
          <div><strong className="text-slate-400">Data Map:</strong> Orders ({orders.length}), Ledger ({ledgerEntries.length}), Stock ({stockItems.length})</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={exportDrawer}
            className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-cyan-300 transition"
          >
            <Download className="w-4 h-4" /> Export my drawer
          </button>

          <button
            onClick={() => {
              setEraseTypedErase('');
              setErasePin('');
              setEraseError(null);
              setEraseModalOpen(true);
            }}
            className="p-3 bg-rose-950/60 hover:bg-rose-950 border border-rose-800/80 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-rose-300 transition"
          >
            <Trash2 className="w-4 h-4" /> Erase my drawer
          </button>
        </div>
      </div>

      {/* Telemetry Card */}
      <div className="bg-[#070e1c] border border-slate-850 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Telemetry & Health</h3>
          </div>
          <button
            onClick={toggleTelemetry}
            className={`w-12 h-7 rounded-full transition-colors relative p-1 shrink-0 ${
              telemetryEnabled ? 'bg-teal-500' : 'bg-slate-800'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
              telemetryEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          Master Telemetry Switch: {telemetryEnabled ? 'Active (disclosed legs emitting)' : 'Paused (except governance)'}
        </p>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-xs font-mono text-slate-300 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-1">Monitored Telemetry Legs:</div>
          <div>• stock-import</div>
          <div>• order-edited</div>
          <div>• screen-stumble</div>
          <div>• cloud-budget</div>
          <div>• sync-latency</div>
          <div className="text-rose-400">• danger-zone (governance: always write locally)</div>
          <div className="text-rose-400">• drawer-erased (governance: always write locally)</div>
        </div>
      </div>

      {/* Erase Drawer Modal */}
      {eraseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-rose-900 rounded-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in">
            <h3 className="text-sm font-bold text-rose-400">Erase Drawer Confirmation</h3>
            <p className="text-xs text-slate-300">
              Type <span className="font-mono font-bold text-rose-400">ERASE</span> below and enter your device PIN. This will permanently delete your local drawer data {cloudChoice !== 'local_only' ? 'and cloud drawer docs' : ''}.
            </p>
            <input
              type="text"
              value={eraseTypedErase}
              onChange={e => setEraseTypedErase(e.target.value)}
              placeholder="Type ERASE"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center text-xs font-mono text-rose-300 outline-none uppercase"
            />
            <div>
              <label className="text-xs text-slate-400 block mb-1">Device PIN</label>
              <input
                type="password"
                maxLength={6}
                value={erasePin}
                onChange={e => setErasePin(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-center text-lg font-mono text-slate-100 outline-none"
              />
            </div>
            {eraseError && (
              <div className="p-2 bg-rose-950 border border-rose-800 text-rose-300 rounded text-xs font-mono">
                {eraseError}
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setEraseModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (eraseTypedErase.trim().toUpperCase() !== 'ERASE') {
                    setEraseError("You must type ERASE to confirm.");
                    return;
                  }
                  const res = await eraseDrawer(erasePin);
                  if (res.success) {
                    setEraseModalOpen(false);
                    alert(res.message);
                  } else {
                    setEraseError(res.message);
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
              >
                Erase Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Card: Logixtix Marketing Ltd · Mauritius */}
      <div className="bg-[#050914] border border-cyan-950/70 rounded-2xl p-4 text-xs text-slate-400 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-cyan-300 text-xs tracking-tight">
            {MJARVIS_FULL_BRAND_STAMP}
          </span>
          <span className="font-mono text-[10px] text-teal-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 font-semibold">
            ESTATE EDITION
          </span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900 space-y-1">
          <div className="flex justify-between font-mono text-[11px]">
            <span className="text-slate-400">Current Posture:</span>
            <span className="text-cyan-300 uppercase font-bold">{cloudChoice}</span>
          </div>
          <div className="flex justify-between font-mono text-[11px]">
            <span className="text-slate-400">Data Map:</span>
            <span className="text-teal-300 truncate max-w-[200px]" title="Orders / Ledger / Stock / Sync Queue">
              Orders ({orders.length}) · Ledger ({ledgerEntries.length}) · Stock ({stockItems.length}) · Queue ({syncQueueCount})
            </span>
          </div>
        </div>

        <p className="text-cyan-200 text-[11px] font-mono bg-cyan-950/40 p-2 rounded-lg border border-cyan-900/60">
          Local data lives until you erase it. Cloud snapshots keep 14 days. Telemetry is minimal, disclosed and off-able.
        </p>

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
        <p className="text-[11px] text-slate-300 font-mono mt-2">
          Portal sign-in: <a href="https://jarvismu.com/login" target="_blank" rel="noopener" className="text-cyan-400 underline">jarvismu.com/login</a>
        </p>

        <p className="text-[11px] text-slate-500 border-t border-slate-900 pt-2 font-mono">
          Governed under feat(mjarvis) specifications · Mobile-first PWA for Mauritius SME retailers.
        </p>
      </div>
    </div>
  );
};
