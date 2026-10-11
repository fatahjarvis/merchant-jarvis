import React, { useState, useRef } from 'react';
import { StockImportPreviewRow } from '../types';
import { useStore } from '../context/StoreContext';
import { 
  downloadStockExcelTemplateV2, 
  parseStockFile, 
  extractStockFromImage,
  STANDARD_MEASURE_UNITS,
  STANDARD_BRANDS
} from '../utils/stockUtils';
import { 
  X, 
  Upload, 
  Camera, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Trash2, 
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
  const { addOrMergeStockItems } = useStore();
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
   * TEMPLATE V2: Download Excel (.xlsx) with LISTS Sheet and Dropdowns via ExcelJS
   */
  const handleDownloadTemplate = async () => {
    try {
      await downloadStockExcelTemplateV2();
    } catch (err) {
      console.error("Template V2 download error:", err);
      alert("Unable to generate template. Please retry.");
    }
  };

  /**
   * DOOR 1: Client-Side SheetJS Parse (.csv / .xlsx) reading LISTS sheet if present
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setVisionError(null);
    setImportSummary(null);

    try {
      const result = await parseStockFile(file);
      setRows(result.rows);
      setImportSource('door1_csv');

      const ext = file.name.endsWith('.xlsx') ? 'xlsx' : 'csv';
      const telemetryLeg = `stock-import rows(${result.rows.length}) source(${ext})`;
      console.info(`[telemetry] ${telemetryLeg}`);
    } catch (err: any) {
      console.error("SheetJS parse error:", err);
      alert(err.message || "Error reading spreadsheet file. Please check format.");
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

    try {
      const result = await extractStockFromImage(file);
      setRows(result.rows);
      setImportSource('door2_vision');

      const telemetryLeg = `stock-import rows(${result.rows.length}) source(vision_photo)`;
      console.info(`[telemetry] ${telemetryLeg}`);
    } catch (err: any) {
      console.warn("Vision extraction error, fallback to Door 1:", err);
      setVisionError(
        err.message || "Cloud vision quota resting or offline — falling back to Door 1 (CSV/Excel upload)."
      );
      setActiveDoor('door1');
    } finally {
      setIsProcessing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
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
   * Confirm & Merge with Stock Model v2 fields
   */
  const handleConfirmMerge = () => {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert("No valid rows to merge.");
      return;
    }

    const itemsToMerge = validRows.map(r => ({
      name: r.name,
      brand: r.brand,
      denominationUnit: r.denominationUnit || r.unitMeasure,
      denominationAmount: r.denominationAmount ?? r.unitMeasureAmount,
      currentStock: r.currentStock,
      minThreshold: r.minThreshold,
      baseUnit: r.baseUnit || r.unit || 'units',
      sellingFormat: r.sellingFormat || 'unit',
      packContains: r.packContains || 1,
      unitCost: r.unitCost ?? r.costPrice ?? 0,
      packCost: r.packCost ?? ((r.unitCost ?? r.costPrice ?? 0) * (r.packContains || 1)),
      unitPrice: r.unitPrice ?? r.sellingPrice ?? 0,
      packPrice: r.packPrice ?? ((r.unitPrice ?? r.sellingPrice ?? 0) * (r.packContains || 1)),
      category: r.category || 'General',
      supplier: r.supplier || '',
      supplierPhone: r.supplierPhone || ''
    }));

    const result = addOrMergeStockItems(itemsToMerge, importSource);
    setImportSummary(result);
    setRows([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#050c18] border border-cyan-900/80 w-full max-w-3xl rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Stock Doors · Inbound Catalog V2</h2>
              <p className="text-xs text-slate-400 font-mono">
                Client-side SheetJS + ExcelJS (Dropdowns) & Gemini Flash Vision
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
          {/* Privacy Plaque */}
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
              <span>DOOR 1: Upload List (.xlsx/.csv)</span>
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
                    Upload Spreadsheet File (.xlsx or .csv)
                  </span>
                  <span className="text-xs text-slate-400">
                    Supports Template V2 with LISTS sheet & data validation dropdowns
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Download Template V2 (.xlsx with LISTS & dropdowns)</span>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/80 text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5 transition shrink-0"
                  style={{ minHeight: '38px' }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template V2</span>
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
                    Gemini 2.5 Flash extracts brand, format, packs and confidence scores
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
                {activeDoor === 'door1' ? 'Parsing spreadsheet rows...' : 'Extracting items via Gemini Flash...'}
              </p>
              <p className="text-xs text-slate-500">
                Matching columns against LISTS sheet and checking for new categories
              </p>
            </div>
          )}

          {/* PREVIEW TABLE */}
          {rows.length > 0 && !isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>Import Preview ({rows.length} rows)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {importSource === 'door1_csv' ? 'DOOR 1: SheetJS V2' : 'DOOR 2: Vision OCR V2'}
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
                <datalist id="denomination-units-list">
                  {STANDARD_MEASURE_UNITS.map(u => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
                <datalist id="brands-list">
                  {STANDARD_BRANDS.map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>

                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-[11px] text-slate-400 font-mono uppercase tracking-wider sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Item Name</th>
                        <th className="p-2.5">Unit</th>
                        <th className="p-2.5">Amount</th>
                        <th className="p-2.5">Brand</th>
                        <th className="p-2.5">Stock</th>
                        <th className="p-2.5">Base Unit</th>
                        <th className="p-2.5">Format</th>
                        <th className="p-2.5">Min</th>
                        <th className="p-2.5">Cost</th>
                        <th className="p-2.5">Sell</th>
                        <th className="p-2.5">Category</th>
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
                              className="bg-transparent border-b border-transparent focus:border-cyan-500 text-slate-100 font-semibold outline-none w-28 truncate"
                            />
                          </td>

                          {/* Unit (ml, L, g, Kg with dropdown list) */}
                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                list="denomination-units-list"
                                value={row.denominationUnit || ''}
                                placeholder="e.g. Kg"
                                onChange={e => handleUpdateRow(idx, 'denominationUnit', e.target.value)}
                                className="bg-transparent border-b border-transparent focus:border-cyan-500 font-mono text-cyan-300 outline-none w-14"
                              />
                              {row.isNewDenominationUnit && (
                                <span 
                                  title="New denomination unit not found in standard Lists" 
                                  className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1 py-0.2 rounded font-mono shrink-0"
                                >
                                  new — add to Lists
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Amount (e.g. 5 for 5 Kg, 650 for 650 ml) */}
                          <td className="p-2.5">
                            <input
                              type="number"
                              step="any"
                              value={row.denominationAmount ?? ''}
                              placeholder="e.g. 5"
                              onChange={e => handleUpdateRow(idx, 'denominationAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                              className="bg-transparent border-b border-transparent focus:border-cyan-500 font-mono text-slate-300 outline-none w-14"
                            />
                          </td>

                          {/* Brand (with dropdown list & amber flag if new) */}
                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                list="brands-list"
                                value={row.brand || ''}
                                placeholder="Brand"
                                onChange={e => handleUpdateRow(idx, 'brand', e.target.value)}
                                className="bg-transparent border-b border-transparent focus:border-cyan-500 text-slate-300 outline-none w-20 truncate"
                              />
                              {row.isNewBrand && (
                                <span 
                                  title="New brand not found in standard Lists" 
                                  className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1 py-0.2 rounded font-mono shrink-0"
                                >
                                  new — add to Lists
                                </span>
                              )}
                            </div>
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

                          {/* Base Unit (with amber tag if new) */}
                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={row.baseUnit || row.unit || ''}
                                onChange={e => handleUpdateRow(idx, 'baseUnit', e.target.value)}
                                className="bg-transparent border-b border-transparent focus:border-cyan-500 font-mono text-slate-300 outline-none w-14"
                              />
                              {row.isNewBaseUnit && (
                                <span 
                                  title="New unit not found in standard Lists" 
                                  className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1 py-0.2 rounded font-mono shrink-0"
                                >
                                  new — add to Lists
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Format (unit / pack) */}
                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              <select
                                value={row.sellingFormat || 'unit'}
                                onChange={e => handleUpdateRow(idx, 'sellingFormat', e.target.value)}
                                className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 font-mono text-[11px] text-slate-300 outline-none"
                              >
                                <option value="unit">unit</option>
                                <option value="pack">pack</option>
                              </select>
                              {row.isNewSellingFormat && (
                                <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1 py-0.2 rounded font-mono">
                                  new
                                </span>
                              )}
                            </div>
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

                          {/* Unit Cost */}
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="0"
                              value={row.unitCost ?? row.costPrice ?? 0}
                              onChange={e => handleUpdateRow(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                              className="bg-transparent border-b border-transparent focus:border-cyan-500 font-mono text-slate-400 outline-none w-14"
                            />
                          </td>

                          {/* Unit Sell */}
                          <td className="p-2.5">
                            <input
                              type="number"
                              min="0"
                              value={row.unitPrice ?? row.sellingPrice ?? 0}
                              onChange={e => handleUpdateRow(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="bg-transparent border-b border-transparent focus:border-cyan-500 font-mono text-teal-300 outline-none w-14"
                            />
                          </td>

                          {/* Category (with amber tag if new) */}
                          <td className="p-2.5">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={row.category}
                                onChange={e => handleUpdateRow(idx, 'category', e.target.value)}
                                className="bg-transparent border-b border-transparent focus:border-cyan-500 text-slate-300 outline-none w-20 truncate"
                              />
                              {row.isNewCategory && (
                                <span 
                                  title="New category not found in standard Lists" 
                                  className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1 py-0.2 rounded font-mono shrink-0"
                                >
                                  new — add to Lists
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Supplier */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={row.supplier}
                              onChange={e => handleUpdateRow(idx, 'supplier', e.target.value)}
                              className="bg-transparent border-b border-transparent focus:border-cyan-500 text-slate-400 outline-none w-20 truncate"
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
