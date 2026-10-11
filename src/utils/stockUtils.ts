import * as XLSX from 'xlsx';
import { StockItem, StockStatusChip, StockImportPreviewRow, MerchantProfile } from '../types';
import { GoogleGenAI } from '@google/genai';

export const STANDARD_MEASURE_UNITS = [
  'ml',
  'L',
  'g',
  'Kg',
  'cl',
  'mg',
  'pcs'
];

export const STANDARD_BRANDS = [
  'Maharani',
  'Phoenix',
  'Twinings',
  'Anchor',
  'Nestle',
  'Kraft',
  'Doritos',
  'Coca-Cola',
  'Dodo',
  'Ciel',
  'Bois Chéri',
  'Pearle',
  'Milo',
  'Les Moulins',
  'Eagle'
];

export const STANDARD_BASE_UNITS = [
  'units',
  'bags',
  'crates',
  'packs',
  'kg',
  'bottles',
  'tins',
  'boxes',
  'cartons',
  'litres',
  'grams',
  'pieces'
];

export const STANDARD_CATEGORIES = [
  'Staples',
  'Beverages',
  'Baking',
  'Dairy',
  'Grains',
  'Household',
  'Snacks',
  'Produce',
  'Personal Care',
  'General'
];

export const STANDARD_SELLING_FORMATS = ['unit', 'pack'] as const;

/**
 * STOCK MODEL v2: Status chip computed on selling-format qty
 */
export function getSellingFormatQty(item: StockItem): number {
  if (item.sellingFormat === 'pack' && item.packContains && item.packContains > 0) {
    return Math.floor(item.currentStock / item.packContains);
  }
  return item.currentStock;
}

export function getStockStatusChip(item: StockItem): StockStatusChip {
  const qty = getSellingFormatQty(item);
  if (qty <= 0) return 'OUT';
  if (qty <= item.minThreshold) return 'LOW';
  return 'OK';
}

export function getStockChipColor(status: StockStatusChip): { bg: string; text: string; border: string } {
  switch (status) {
    case 'OUT':
      return { bg: 'bg-rose-950/80', text: 'text-rose-400', border: 'border-rose-800' };
    case 'LOW':
      return { bg: 'bg-amber-950/80', text: 'text-amber-400', border: 'border-amber-800' };
    case 'OK':
      return { bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-800' };
  }
}

/**
 * TEMPLATE V2: Lazy-loaded ExcelJS with LISTS sheet & data validation dropdowns
 * Schema:
 * A: Item Name
 * B: Unit (dropdown: ml, L, g, Kg from LISTS)
 * C: Amount (e.g. 5 for 5 Kg, 650 for 650 ml)
 * D: Brand (dropdown from LISTS)
 * E: Current Stock
 * F: Min Threshold
 * G: Base Unit (dropdown from LISTS)
 * H: Selling Format (dropdown: unit, pack from LISTS)
 * I: Pack Contains
 * J: Unit Cost (Rs)
 * K: Pack Cost (Rs)
 * L: Unit Price (Rs)
 * M: Pack Price (Rs)
 * N: Category (dropdown from LISTS)
 * O: Supplier
 * P: Supplier Phone
 */
export async function downloadStockExcelTemplateV2(): Promise<void> {
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Merchant Jarvis';
  workbook.created = new Date();

  // Sheet 1: Stock Template
  const sheet = workbook.addWorksheet('Stock Template');
  sheet.columns = [
    { header: 'Item Name', key: 'name', width: 28 },
    { header: 'Unit', key: 'unit', width: 14 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Brand', key: 'brand', width: 18 },
    { header: 'Current Stock', key: 'currentStock', width: 14 },
    { header: 'Min Threshold', key: 'minThreshold', width: 14 },
    { header: 'Base Unit', key: 'baseUnit', width: 14 },
    { header: 'Selling Format', key: 'sellingFormat', width: 15 },
    { header: 'Pack Contains', key: 'packContains', width: 14 },
    { header: 'Unit Cost (Rs)', key: 'unitCost', width: 14 },
    { header: 'Pack Cost (Rs)', key: 'packCost', width: 14 },
    { header: 'Unit Price (Rs)', key: 'unitPrice', width: 14 },
    { header: 'Pack Price (Rs)', key: 'packPrice', width: 14 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Supplier', key: 'supplier', width: 24 },
    { header: 'Supplier Phone', key: 'supplierPhone', width: 18 }
  ];

  // Two example rows matching merchant specifications
  sheet.addRow({
    name: 'Basmati Rice 5kg',
    unit: 'Kg',
    amount: 5,
    brand: 'Maharani',
    currentStock: 15,
    minThreshold: 5,
    baseUnit: 'bags',
    sellingFormat: 'unit',
    packContains: 1,
    unitCost: 280,
    packCost: 280,
    unitPrice: 345,
    packPrice: 345,
    category: 'Staples',
    supplier: 'Maharani Traders Ltd',
    supplierPhone: '+23057110022'
  });

  sheet.addRow({
    name: 'Phoenix Beer 650ml',
    unit: 'ml',
    amount: 650,
    brand: 'Phoenix',
    currentStock: 24,
    minThreshold: 6,
    baseUnit: 'bottles',
    sellingFormat: 'pack',
    packContains: 12,
    unitCost: 60,
    packCost: 720,
    unitPrice: 75,
    packPrice: 890,
    category: 'Beverages',
    supplier: 'Phoenix Beverages Ltd',
    supplierPhone: '+23052508899'
  });

  // Sheet 2: LISTS
  const listsSheet = workbook.addWorksheet('LISTS');
  listsSheet.columns = [
    { header: 'Units', key: 'units', width: 14 },
    { header: 'Brands', key: 'brands', width: 20 },
    { header: 'Base Units', key: 'baseUnits', width: 16 },
    { header: 'Categories', key: 'categories', width: 22 },
    { header: 'Formats', key: 'formats', width: 14 }
  ];

  const maxLen = Math.max(
    STANDARD_MEASURE_UNITS.length,
    STANDARD_BRANDS.length,
    STANDARD_BASE_UNITS.length,
    STANDARD_CATEGORIES.length,
    STANDARD_SELLING_FORMATS.length
  );

  for (let i = 0; i < maxLen; i++) {
    listsSheet.addRow({
      units: STANDARD_MEASURE_UNITS[i] || '',
      brands: STANDARD_BRANDS[i] || '',
      baseUnits: STANDARD_BASE_UNITS[i] || '',
      categories: STANDARD_CATEGORIES[i] || '',
      formats: STANDARD_SELLING_FORMATS[i] || ''
    });
  }

  // Add dropdown validations on Stock Template rows (configured & editable under sheet 'LISTS')
  // B: Unit -> LISTS A2:A50
  // D: Brand -> LISTS B2:B100
  // G: Base Unit -> LISTS C2:C50
  // H: Selling Format -> LISTS E2:E10
  // N: Category -> LISTS D2:D50
  for (let r = 2; r <= 300; r++) {
    sheet.getCell(`B${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`'LISTS'!$A$2:$A$50`]
    };
    sheet.getCell(`D${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`'LISTS'!$B$2:$B$100`]
    };
    sheet.getCell(`G${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`'LISTS'!$C$2:$C$50`]
    };
    sheet.getCell(`H${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`'LISTS'!$E$2:$E$10`]
    };
    sheet.getCell(`N${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`'LISTS'!$D$2:$D$50`]
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'merchant_jarvis_stock_template_v2.xlsx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Fallback CSV template
 */
export function generateStockCsvTemplate(): string {
  const headers = [
    'Item Name',
    'Unit',
    'Amount',
    'Brand',
    'Current Stock',
    'Min Threshold',
    'Base Unit',
    'Selling Format',
    'Pack Contains',
    'Unit Cost (Rs)',
    'Pack Cost (Rs)',
    'Unit Price (Rs)',
    'Pack Price (Rs)',
    'Category',
    'Supplier',
    'Supplier Phone'
  ];
  const row1 = ['Basmati Rice 5kg', 'Kg', '5', 'Maharani', '15', '5', 'bags', 'unit', '1', '280', '280', '345', '345', 'Staples', 'Maharani Traders Ltd', '+23057110022'];
  const row2 = ['Phoenix Beer 650ml', 'ml', '650', 'Phoenix', '24', '6', 'bottles', 'pack', '12', '60', '720', '75', '890', 'Beverages', 'Phoenix Beverages Ltd', '+23052508899'];
  return [headers.join(','), row1.join(','), row2.join(',')].join('\n');
}

export function downloadStockCsvTemplate(): void {
  const csvContent = generateStockCsvTemplate();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'merchant_jarvis_stock_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * DOOR 1: Client-side CSV/XLSX Parser using SheetJS with LISTS sheet detection
 */
export async function parseStockFile(file: File): Promise<{ rows: StockImportPreviewRow[]; source: 'csv' | 'xlsx' }> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const source: 'csv' | 'xlsx' = extension === 'xlsx' || extension === 'xls' ? 'xlsx' : 'csv';

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Read LISTS sheet if present to accept merchant-extended values
  const knownUnits = new Set(STANDARD_BASE_UNITS.map(u => u.toLowerCase().trim()));
  const knownDenominationUnits = new Set(STANDARD_MEASURE_UNITS.map(u => u.toLowerCase().trim()));
  const knownBrands = new Set(STANDARD_BRANDS.map(b => b.toLowerCase().trim()));
  const knownCategories = new Set(STANDARD_CATEGORIES.map(c => c.toLowerCase().trim()));
  const knownFormats = new Set(['unit', 'pack']);

  if (workbook.SheetNames.includes('LISTS')) {
    const listsSheet = workbook.Sheets['LISTS'];
    const listsData: any[] = XLSX.utils.sheet_to_json(listsSheet, { defval: '' });
    for (const r of listsData) {
      for (const [k, v] of Object.entries(r)) {
        const strVal = String(v || '').trim();
        if (!strVal) continue;
        const strLower = strVal.toLowerCase();
        const keyLower = k.toLowerCase();
        if (keyLower.includes('brand')) knownBrands.add(strLower);
        else if (keyLower.includes('base') || keyLower === 'base units') knownUnits.add(strLower);
        else if (keyLower.includes('unit') || keyLower.includes('measure')) {
          knownDenominationUnits.add(strLower);
          knownUnits.add(strLower);
        }
        else if (keyLower.includes('cat')) knownCategories.add(strLower);
        else if (keyLower.includes('format')) knownFormats.add(strLower);
      }
    }
  }

  // Find target sheet (prefer first sheet that is not LISTS)
  const targetSheetName = workbook.SheetNames.find(s => s !== 'LISTS') || workbook.SheetNames[0];
  if (!targetSheetName) throw new Error('Uploaded spreadsheet has no data sheets.');

  const worksheet = workbook.Sheets[targetSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('Spreadsheet contains no data rows.');
  }

  const rows: StockImportPreviewRow[] = rawRows.map((r, idx) => {
    const normalized: Record<string, any> = {};
    for (const [k, v] of Object.entries(r)) {
      normalized[k.toLowerCase().trim().replace(/[\s_()rs.]+/g, '')] = v;
    }

    const name = String(normalized.itemname || normalized.name || normalized.item || normalized.article || '').trim();
    const brand = String(normalized.brand || normalized.marque || '').trim();
    
    // Denomination Unit (ml, L, g, Kg) and Amount
    const denominationUnit = String(normalized.unit || normalized.denominationunit || normalized.measureunit || '').trim();
    const rawAmount = normalized.amount ?? normalized.denominationamount ?? normalized.unitamount ?? normalized.qtyperunit;
    const denominationAmount = rawAmount !== undefined && rawAmount !== '' ? parseFloat(String(rawAmount)) : undefined;

    const currentStock = parseFloat(String(normalized.currentstock ?? normalized.stock ?? normalized.qty ?? normalized.quantity ?? 0));
    const minThreshold = parseFloat(String(normalized.minthreshold ?? normalized.min ?? normalized.minimum ?? 5));
    
    // Base unit (handles baseunit or fallback if only unit was provided in older templates)
    let baseUnit = String(normalized.baseunit || normalized.uom || '').trim();
    if (!baseUnit) {
      if (denominationUnit && knownUnits.has(denominationUnit.toLowerCase()) && !['ml', 'l', 'g', 'kg', 'cl', 'mg'].includes(denominationUnit.toLowerCase())) {
        baseUnit = denominationUnit;
      } else {
        baseUnit = 'units';
      }
    }
    
    const rawFormat = String(normalized.sellingformat || normalized.format || 'unit').toLowerCase().trim();
    const sellingFormat: 'unit' | 'pack' = rawFormat === 'pack' ? 'pack' : 'unit';

    const packContains = parseInt(String(normalized.packcontains ?? normalized.packsize ?? 1), 10) || 1;
    const unitCost = parseFloat(String(normalized.unitcost ?? normalized.costprice ?? normalized.cost ?? 0)) || 0;
    const packCost = parseFloat(String(normalized.packcost ?? (unitCost * packContains))) || unitCost;
    const unitPrice = parseFloat(String(normalized.unitprice ?? normalized.sellingprice ?? normalized.price ?? normalized.retail ?? 0)) || 0;
    const packPrice = parseFloat(String(normalized.packprice ?? (unitPrice * packContains))) || unitPrice;

    const category = String(normalized.category || normalized.dept || 'General').trim();
    const supplier = String(normalized.supplier || normalized.vendor || '').trim();
    const supplierPhone = String(normalized.supplierphone || normalized.phone || '').trim();

    // Unknowns flagged amber as 'new — add to Lists'
    const isNewCategory = Boolean(category && !knownCategories.has(category.toLowerCase()));
    const isNewBaseUnit = Boolean(baseUnit && !knownUnits.has(baseUnit.toLowerCase()));
    const isNewSellingFormat = Boolean(rawFormat && !knownFormats.has(rawFormat.toLowerCase()));
    const isNewBrand = Boolean(brand && !knownBrands.has(brand.toLowerCase()));
    const isNewDenominationUnit = Boolean(denominationUnit && !knownDenominationUnits.has(denominationUnit.toLowerCase()));

    let isValid = true;
    let validationError = '';

    if (!name) {
      isValid = false;
      validationError = 'Item name is required';
    } else if (isNaN(currentStock) || currentStock < 0) {
      isValid = false;
      validationError = 'Current stock must be >= 0';
    } else if (isNaN(minThreshold) || minThreshold < 0) {
      isValid = false;
      validationError = 'Min threshold must be >= 0';
    }

    return {
      name: name || `Unnamed Row ${idx + 1}`,
      brand: brand || undefined,
      denominationUnit: denominationUnit || undefined,
      denominationAmount: !isNaN(Number(denominationAmount)) ? denominationAmount : undefined,
      currentStock: isNaN(currentStock) ? 0 : currentStock,
      minThreshold: isNaN(minThreshold) ? 5 : minThreshold,
      baseUnit: baseUnit || 'units',
      sellingFormat,
      packContains,
      unitCost,
      packCost,
      unitPrice,
      packPrice,
      category: category || 'General',
      supplier,
      supplierPhone,
      isValid,
      validationError: validationError || undefined,
      confidence: 1.0,
      isNewCategory,
      isNewBaseUnit,
      isNewSellingFormat,
      isNewBrand,
      isNewDenominationUnit,
      // Backward compat aliases
      unit: baseUnit || 'units',
      costPrice: unitCost,
      sellingPrice: unitPrice,
      unitMeasure: denominationUnit || undefined,
      unitMeasureAmount: denominationAmount
    };
  }).filter(r => r.name || r.currentStock > 0);

  return { rows, source };
}

/**
 * DOOR 2: Gemini Vision Extraction with Stock v2 fields (brand, packContains, etc.)
 */
export async function extractStockFromImage(imageFile: File): Promise<{ rows: StockImportPreviewRow[] }> {
  const arrayBuffer = await imageFile.arrayBuffer();
  const base64Data = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
    (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Cloud Vision API key unavailable. Falling back to Door 1 (CSV/Excel upload).');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are an expert grocery inventory OCR parser for Mauritian retailer sheets.
Analyze this photographed stock sheet or handwritten shop ledger.
Extract inventory items including brand, unit denomination (ml, L, g, Kg), amount, and pack details when visible.
Output a clean JSON array with exact fields:
[
  {
    "name": "Basmati Rice 5kg",
    "denominationUnit": "Kg",
    "denominationAmount": 5,
    "brand": "Maharani",
    "currentStock": 15,
    "minThreshold": 5,
    "baseUnit": "bags",
    "sellingFormat": "unit",
    "packContains": 1,
    "unitCost": 280,
    "packCost": 280,
    "unitPrice": 345,
    "packPrice": 345,
    "category": "Staples",
    "supplier": "Maharani Traders Ltd",
    "supplierPhone": "+230 5711 0022",
    "confidence": 0.95
  }
]
Field guidelines:
- denominationUnit is the measure unit on package (ml, L, g, Kg).
- denominationAmount is the number for that unit (e.g. 5 for 5 Kg, 650 for 650 ml).
- sellingFormat is either "unit" or "pack". Default "unit" if sold singly.
- baseUnit is inventory counting measure (bottles, bags, kg, crates, tins, packs, units).
- Return ONLY valid JSON without markdown fences.
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
                mimeType: imageFile.type || 'image/jpeg',
                data: base64Data
              }
            }
          ]
        }
      ]
    });

    const text = response.text?.trim() || '[]';
    const cleanJson = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('No readable inventory rows detected in photo.');
    }

    const rows: StockImportPreviewRow[] = parsed.map((item: any, idx: number) => {
      const name = String(item.name || '').trim();
      const brand = String(item.brand || '').trim();
      const denominationUnit = String(item.denominationUnit || item.unit || '').trim();
      const denominationAmount = Number(item.denominationAmount || item.amount) || undefined;
      const currentStock = Number(item.currentStock ?? 0);
      const minThreshold = Number(item.minThreshold ?? 5);
      const baseUnit = String(item.baseUnit || 'units').trim();
      const sellingFormat: 'unit' | 'pack' = item.sellingFormat === 'pack' ? 'pack' : 'unit';
      const packContains = Number(item.packContains ?? 1) || 1;
      const unitCost = Number(item.unitCost ?? item.costPrice ?? 0);
      const packCost = Number(item.packCost ?? (unitCost * packContains));
      const unitPrice = Number(item.unitPrice ?? item.sellingPrice ?? 0);
      const packPrice = Number(item.packPrice ?? (unitPrice * packContains));
      const category = String(item.category || 'General').trim();
      const supplier = String(item.supplier || '').trim();
      const supplierPhone = String(item.supplierPhone || '').trim();
      const confidence = typeof item.confidence === 'number' ? Math.min(1.0, Math.max(0.1, item.confidence)) : 0.85;

      const isValid = Boolean(name && currentStock >= 0);

      return {
        name: name || `Row ${idx + 1}`,
        brand: brand || undefined,
        denominationUnit: denominationUnit || undefined,
        denominationAmount,
        currentStock: isNaN(currentStock) ? 0 : currentStock,
        minThreshold: isNaN(minThreshold) ? 5 : minThreshold,
        baseUnit: baseUnit || 'units',
        sellingFormat,
        packContains,
        unitCost: isNaN(unitCost) ? 0 : unitCost,
        packCost: isNaN(packCost) ? 0 : packCost,
        unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
        packPrice: isNaN(packPrice) ? 0 : packPrice,
        category: category || 'General',
        supplier,
        supplierPhone,
        isValid,
        validationError: isValid ? undefined : 'Incomplete name or negative stock',
        confidence,
        unit: baseUnit || 'units',
        costPrice: unitCost,
        sellingPrice: unitPrice,
        unitMeasure: denominationUnit || undefined,
        unitMeasureAmount: denominationAmount
      };
    });

    return { rows };
  } catch (err: any) {
    console.error('Vision extraction stumble:', err);
    throw new Error(err.message || 'Vision model stumble reading stock sheet.');
  }
}

/**
 * Reorder suggestion rounded up to whole packs for supplier wa.me
 */
export function generateSupplierWhatsAppUrl(
  item: StockItem,
  profile: MerchantProfile,
  customTemplate?: string
): { url: string; preview: string; reorderQty: number; unitLabel: string } {
  const isPack = item.sellingFormat === 'pack';
  const packSize = item.packContains && item.packContains > 0 ? item.packContains : 1;

  let reorderQty = 0;
  let unitLabel = '';

  if (isPack) {
    const currentPacks = Math.floor(item.currentStock / packSize);
    const deficitPacks = Math.max(1, item.minThreshold - currentPacks);
    reorderQty = deficitPacks;
    unitLabel = 'packs';
  } else {
    reorderQty = Math.max(1, item.minThreshold - item.currentStock);
    unitLabel = item.baseUnit || 'units';
  }

  const defaultTemplate = 'Bonzour {supplier}, this is {shopName}. Please supply {qty} {unit} of {item} ({brand}). Mersi!';
  const template = customTemplate || defaultTemplate;

  const phone = (item.supplierPhone || '').replace(/[^0-9+]/g, '');
  const brandDisplay = item.brand || 'standard';
  
  const text = template
    .replace('{supplier}', item.supplier || 'Supplier')
    .replace('{shopName}', profile.shopName || 'Merchant Jarvis')
    .replace('{qty}', String(reorderQty))
    .replace('{unit}', unitLabel)
    .replace('{item}', item.name)
    .replace('{brand}', brandDisplay);

  const encoded = encodeURIComponent(text);
  const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

  return { url, preview: text, reorderQty, unitLabel };
}
