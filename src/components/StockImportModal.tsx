import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from '@google/genai';
import { StockImportPreviewRow, StockItem } from '../types';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  Upload, 
  Camera, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  Edit2, 
  Trash2, 
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';

interface StockImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoor?: 'door1' | 'door2';
}

export const StockImportModal: React.FC<StockImportModalProps> = ({
  isOpen,
  onClose,
  initialDoor = 'door1'
}) => {
  const { addOrMergeStockItems, isOnline } = useStore();
  const [activeDoor, setActiveDoor] = useState<'door1' | 'door2'>(initialDoor);
  const [rows, setRows] = useState<StockImportPreviewRow[]>([]);
  const [importSource, setImportSource] = useState<'door1_csv' | 'door2_vision'>('door1_csv');
  const [isProcessing, setIsProcessing] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [showPrivacyPlaque, setShowPrivacyPlaque] = useState<boolean>(() => {
    return !sessionStorage.getItem('mjarvis_vision_privacy_acknowledged');
  });
  const [importSummary, setImportSummary] = useState<{ merged: number; added: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const dismissPrivacyPlaque = () => {
    sessionStorage.setItem('mjarvis_vision_privacy_acknowledged', 'true');
    setShowPrivacyPlaque(false);
  };

  /**
   * DOOR 1: Download CSV Template
   */
  const handleDownloadTemplate = () => {
    const csvContent = 
`Item Name,Current Stock,Min Threshold,Unit,Category,Cost Price (Rs),Selling Price (Rs),Supplier,Supplier Phone
Basmati Rice 5kg,12,8,bags,Staples,280,345,Maharani Traders Ltd,+230 5711 0022
Phoenix Beer Crate (x12),6,4,crates,Beverages,720,890,Phoenix Beverages Ltd,+230 5250 8899`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'merchant_jarvis_stock_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * DOOR 1: Client-Side SheetJS Parse (.csv / .xlsx)
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setVisionError(null);
    setImportSummary(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      const parsedRows: StockImportPreviewRow[] = jsonRows.map((r) => {
        // Find matching keys flexibly
        const nameKey = Object.keys(r).find(k => /name|item|product/i.test(k)) || Object.keys(r)[0];
        const stockKey = Object.keys(r).find(k => /current|stock|qty|quant/i.test(k)) || Object.keys(r)[1];
        const minKey = Object.keys(r).find(k => /min|threshold|alert/i.test(k)) || Object.keys(r)[2];
        const unitKey = Object.keys(r).find(k => /unit/i.test(k));
        const catKey = Object.keys(r).find(k => /cat/i.test(k));
        const costKey = Object.keys(r).find(k => /cost/i.test(k));
        const sellKey = Object.keys(r).find(k => /sell|price/i.test(k));
        const suppKey = Object.keys(r).find(k => /supp|vendor/i.test(k));
        const phoneKey = Object.keys(r).find(k => /phone|wa/i.test(k));

        const name = String(r[nameKey] || '').trim();
        const currentStock = parseInt(String(r[stockKey] || '0').replace(/[^\d.-]/g, ''), 10);
        const minThreshold = parseInt(String(r[minKey] || '5').replace(/[^\d.-]/g, ''), 10);
        const unit = String(r[unitKey || ''] || 'units').trim();
        const category = String(r[catKey || ''] || 'General').trim();
        const costPrice = parseFloat(String(r[costKey || '0']).replace(/[^\d.-]/g, '')) || 0;
        const sellingPrice = parseFloat(String(r[sellKey || '0']).replace(/[^\d.-]/g, '')) || 0;
        const supplier = String(r[suppKey || ''] || '').trim();
        const supplierPhone = String(r[phoneKey || ''] || '').trim();

        const isValid = Boolean(name && !isNaN(currentStock) && currentStock >= 0);
        const validationError = !name 
          ? 'Missing item name' 
          : isNaN(currentStock) || currentStock < 0 
          ? 'Invalid stock number' 
          : undefined;

        return {
          name,
          currentStock: isNaN(currentStock) ? 0 : currentStock,
          minThreshold: isNaN(minThreshold) ? 5 : minThreshold,
          unit,
          category,
          costPrice,
          sellingPrice,
          supplier,
          supplierPhone,
          isValid,
          validationError
        };
      }).filter(r => r.name || r.currentStock > 0);

      setRows(parsedRows);
      setImportSource('door1_csv');

      const ext = file.name.endsWith('.xlsx') ? 'xlsx' : 'csv';
      const telemetryLeg = `stock-import rows(${parsedRows.length}) source(${ext})`;
      console.info(`[telemetry] ${telemetryLeg}`);
    } catch (err: any) {
      console.error("SheetJS parse error:", err);
      alert("Error reading spreadsheet file. Please check format.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * DOOR 2: Photograph stock sheet & Gemini Flash Vision Extraction
   */
  const handlePhotographSheet = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setVisionError(null);
    setImportSummary(null);

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = file.type || 'image/jpeg';

        const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
        
        if (!apiKey) {
          throw new Error("Cloud vision key not available. Fallback to Door 1 (CSV/Excel upload).");
        }

        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
Extract items from this photographed grocery/shop stock sheet or inventory notebook into a clean JSON array of objects.
For each item, extract:
- name: (string) Item name in plain Mauritian grocery terms
- currentStock: (number) Current count/quantity
- minThreshold: (number) Minimum reorder threshold (default 5 if not stated)
- unit: (string) Unit of measurement (bags, crates, kg, bottles, tins, packs, etc.)
- category: (string) Category (Staples, Beverages, Dairy, Baking, Household, etc.)
- costPrice: (number) Cost in Rs if visible, else 0
- sellingPrice: (number) Selling price in Rs if visible, else 0
- supplier: (string) Supplier name if visible
- supplierPhone: (string) Supplier phone if visible
- confidence: (number between 0.0 and 1.0) your OCR extraction confidence for this row

Return ONLY raw JSON with format:
[
  {
    "name": "...",
    "currentStock": 10,
    "minThreshold": 5,
    "unit": "bags",
    "category": "Staples",
    "costPrice": 100,
    "sellingPrice": 125,
    "supplier": "...",
    "supplierPhone": "...",
    "confidence": 0.95
  }
]
`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ]
        });

        const rawText = response.text?.trim() || '';
        // Extract JSON from markdown fences if needed
        const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);

        if (!Array.isArray(parsed) || parsed.length === 0) {
          throw new Error("No items detected in photo.");
        }

        const extractedRows: StockImportPreviewRow[] = parsed.map((item: any) => ({
          name: String(item.name || '').trim(),
          currentStock: Number(item.currentStock) || 0,
          minThreshold: Number(item.minThreshold) || 5,
          unit: String(item.unit || 'units').trim(),
          category: String(item.category || 'General').trim(),
          costPrice: Number(item.costPrice) || 0,
          sellingPrice: Number(item.sellingPrice) || 0,
          supplier: String(item.supplier || '').trim(),
          supplierPhone: String(item.supplierPhone || '').trim(),
          isValid: Boolean(item.name && item.currentStock >= 0),
          validationError: !item.name ? 'Unclear item name' : undefined,
          confidence: typeof item.confidence === 'number' ? item.confidence : 0.9
        }));

        setRows(extractedRows);
        setImportSource('door2_vision');

        const telemetryLeg = `stock-import rows(${extractedRows.length}) source(vision_photo)`;
        console.info(`[telemetry] ${telemetryLeg}`);
      } catch (err: any) {
        console.warn("Vision extraction error, fallback to Door 1:", err);
        setVisionError(
          "Cloud vision quota resting or offline — falling back to Door 1 (CSV/Excel upload). You can also use the template."
        );
        setActiveDoor('door1');
      } finally {
        setIsProcessing(false);
        if (cameraInputRef.current) cameraInputRef.current.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  /**
   * Inline row edit in preview table
   */
  const handleUpdateRow = (index: number, field: keyof StockImportPreviewRow, value: any) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value
      };
      // Re-validate
      next[index].isValid = Boolean(next[index].name && next[index].currentStock >= 0);
      next[index].validationError = !next[index].name ? 'Missing name' : undefined;
      return next;
    });
  };

  const handleRemoveRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Confirm & Merge
   */
  const handleConfirmMerge = () => {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert("No valid rows to merge.");
      return;
    }

    const itemsToMerge = validRows.map(r => ({
      name: r.name,
      currentStock: r.currentStock,
      minThreshold: r.minThreshold,
      unit: r.unit || 'units',
      category: r.category || 'General',
      costPrice: r.costPrice || 0,
      sellingPrice: r.sellingPrice || 0,
      supplier: r.supplier || '',
      supplierPhone: r.supplierPhone || ''
    }));

    const result = addOrMergeStockItems(itemsToMerge, importSource);
    setImportSummary(result);
    setRows([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#050c18] border border-cyan-900/80 w-full max-w-2xl rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Stock Doors · Inbound Catalog</h2>
              <p className="text-xs text-slate-400 font-mono">
                Client-side SheetJS & Gemini Flash Vision
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

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Privacy Plaque (shown once per session) */}
          {showPrivacyPlaque && (
            <div className="bg-slate-900/90 border border-cyan-800/60 rounded-xl p-3 flex items-start justify-between gap-3 shadow-md animate-in slide-in-from-top-2">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-slate-100 block mb-0.5">Privacy Notice (Logixtix Estate)</span>
                  <span>
                    Stock sheet photos are analyzed ephemeral in memory for digitizing catalog rows. No sensitive customer information is retained or trained on.
                  </span>
                </div>
              </div>
              <button
                onClick={dismissPrivacyPlaque}
                className="text-[11px] font-mono font-bold text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-slate-800 border border-slate-700 shrink-0"
              >
                Got it
              </button>
            </div>
          )}

          {/* Quota / Error friendly message if Door 2 failed */}
          {visionError && (
            <div className="bg-amber-950/50 border border-amber-800 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Vision Notice:</span>
                <span>{visionError}</span>
              </div>
            </div>
          )}

          {/* Import Success Summary */}
          {importSummary && (
            <div className="bg-emerald-950/70 border border-emerald-800 rounded-xl p-4 text-xs text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-sm block">Catalog Import Complete!</span>
                  <span>{importSummary.merged} items updated · {importSummary.added} new items registered.</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                Done
              </button>
            </div>
          )}

          {/* Door Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-850">
            <button
              onClick={() => setActiveDoor('door1')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                activeDoor === 'door1'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={{ minHeight: '44px' }}
            >
              <Upload className="w-4 h-4" />
              <span>DOOR 1: Upload List (.csv/.xlsx)</span>
            </button>

            <button
              onClick={() => setActiveDoor('door2')}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                activeDoor === 'door2'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={{ minHeight: '44px' }}
            >
              <Camera className="w-4 h-4" />
              <span>DOOR 2: Photo Stock Sheet</span>
            </button>
          </div>

          {/* DOOR 1 Content */}
          {activeDoor === 'door1' && rows.length === 0 && (
            <div className="space-y-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-cyan-800/60 hover:border-cyan-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/60 hover:bg-slate-900/60 transition space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-200 block">
                    Upload Spreadsheet File
                  </span>
                  <span className="text-xs text-slate-400">
                    Supports .csv and .xlsx files (parsed client-side via SheetJS)
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Need the standard template with headers & example rows?</span>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-cyan-300 flex items-center gap-1.5 transition shrink-0"
                  style={{ minHeight: '38px' }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>
            </div>
          )}

          {/* DOOR 2 Content */}
          {activeDoor === 'door2' && rows.length === 0 && (
            <div className="space-y-3">
              <div 
                onClick={() => cameraInputRef.current?.click()}
                className="border-2 border-dashed border-cyan-800/60 hover:border-cyan-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/60 hover:bg-slate-900/60 transition space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-400 flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-200 block">
                    Photograph Stock Sheet or Notebook
                  </span>
                  <span className="text-xs text-slate-400">
                    Take photo or choose picture — Gemini 2.5 Flash extracts items with confidence scores
                  </span>
                </div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotographSheet}
                  className="hidden"
                />
              </div>

              <p className="text-[11px] text-slate-500 text-center font-mono">
                Automatic confidence flags · Merchant can edit every row before merge.
              </p>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-8 text-center space-y-2 bg-slate-950/80 rounded-2xl border border-cyan-900/60">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-200">
                {activeDoor === 'door1' ? 'Parsing spreadsheet rows...' : 'Extracting handwritten/printed items via Gemini Flash...'}
              </p>
              <p className="text-xs text-slate-500">
                Analyzing inventory columns and matching units
              </p>
            </div>
          )}

          {/* PREVIEW TABLE (Doors 1 & 2 share this table) */}
          {rows.length > 0 && !isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>Import Preview ({rows.length} rows)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {importSource === 'door1_csv' ? 'DOOR 1: SheetJS' : 'DOOR 2: Vision OCR'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review and tap any field to edit before confirming.
                  </p>
                </div>

                <button
                  onClick={() => setRows([])}
                  className="text-xs text-rose-400 hover:underline font-mono"
                >
                  Discard list
                </button>
              </div>

              {/* Table Container */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-[11px] text-slate-400 font-mono uppercase tracking-wider sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5">Stock</th>
                        <th className="p-2.5">Unit</th>
                        <th className="p-2.5">Min</th>
                        <th className="p-2.5">Cost</th>
                        <th className="p-2.5">Sell</th>
                        <th className="p-2.5">Supplier</th>
                        {importSource === 'door2_vision' && <th className="p-2.5">Conf.</th>}
                        <th className="p-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {rows.map((row, idx) => (
                        <tr 
                          key={idx} 
                          className={row.isValid ? 'hover:bg-slate-900/40' : 'bg-rose-950/20'}
                        >
                          {/* Validity Chip */}
                          <td className="p-2.5">
                            {row.isValid ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <span title={row.validationError} className="flex items-center text-rose-400">
                                <AlertTriangle className="w-4 h-4" />
                              </span>
                            )}
                          </td>

                          {/* Item Name */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.name}
                              onChange={e => handleUpdateRow(idx, 'name', e.target.value)}
                              className="bg-transparent border-b border-transparent focus:border-cyan-500 text-slate-100 font-semibold outline-none w-32 truncate"
                            />
                          </td>

                          {/* Stock Count */}
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="0"
                              value={row.currentStock}
                              onChange={e => handleUpdateRow(idx, 'currentStock', parseInt(e.target.value, 10) || 0)}
                              className="bg-transparent border-b border-transparent focus:border-cyan-500 font-mono text-cyan-300 font-bold outline-none w-14"
                            />
                          </td>

                          {/* Unit */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.unit}
                              onChange={e => handleUpdateRow(idx, 'unit', e.target.value)}
                              className="bg-transparent border-b border-transparent focus:border-cyan-500 font-mono text-slate-300 outline-none w-16"
                            />
                          </td>

                          {/* Min Threshold */}
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="0"
                              value={row.minThreshold}
                              onChange={e => handleUpdateRow(idx, 'minThreshold', parseInt(e.target.value, 10) || 0)}
                              className="bg-transparent border-b border-transparent focus:border-cyan-500 font-mono text-amber-300 outline-none w-12"
                            />
                          </td>

                          {/* Cost */}
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="0"
                              value={row.costPrice}
                              onChange={e => handleUpdateRow(idx, 'costPrice', parseFloat(e.target.value) || 0)}
                              className="bg-transparent border-b border-transparent focus:border-cyan-500 font-mono text-slate-400 outline-none w-14"
                            />
                          </td>

                          {/* Sell */}
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="0"
                              value={row.sellingPrice}
                              onChange={e => handleUpdateRow(idx, 'sellingPrice', parseFloat(e.target.value) || 0)}
                              className="bg-transparent border-b border-transparent focus:border-cyan-500 font-mono text-teal-300 outline-none w-14"
                            />
                          </td>

                          {/* Supplier */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.supplier}
                              onChange={e => handleUpdateRow(idx, 'supplier', e.target.value)}
                              className="bg-transparent border-b border-transparent focus:border-cyan-500 text-slate-400 outline-none w-24 truncate"
                            />
                          </td>

                          {/* Confidence (Door 2 only) */}
                          {importSource === 'door2_vision' && (
                            <td className="p-2.5">
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                (row.confidence || 0) >= 0.85 
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}>
                                {Math.round((row.confidence || 0.9) * 100)}%
                              </span>
                            </td>
                          )}

                          {/* Delete row */}
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => handleRemoveRow(idx)}
                              className="text-slate-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Confirm & Merge Action */}
              <button
                type="button"
                onClick={handleConfirmMerge}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition active:scale-95"
                style={{ minHeight: '46px' }}
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Confirm & Merge ({rows.filter(r => r.isValid).length} Valid Items)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
