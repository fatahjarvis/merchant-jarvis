import * as XLSX from 'xlsx';
import { StockItem, StockStatusChip, StockImportPreviewRow, MerchantProfile } from '../types';
import { GoogleGenAI } from '@google/genai';

export function getStockStatusChip(item: StockItem): StockStatusChip {
  if (item.currentStock <= 0) return 'OUT';
  if (item.currentStock <= item.minThreshold) return 'LOW';
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
 * DOOR 1: Download CSV template with header row + two example rows
 */
export function generateStockCsvTemplate(): string {
  const headers = ['name', 'currentStock', 'minThreshold', 'unit', 'category', 'costPrice', 'sellingPrice', 'supplier', 'supplierPhone'];
  const row1 = ['Basmati Rice 5kg (Maharani)', '15', '5', 'bags', 'Staples', '280', '345', 'Maharani Traders Ltd', '+23057110022'];
  const row2 = ['Phoenix Beer 650ml (Crate x12)', '10', '4', 'crates', 'Beverages', '720', '890', 'Phoenix Beverages Ltd', '+23052508899'];
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
 * DOOR 1: Client-side CSV/XLSX Parser using SheetJS
 */
export async function parseStockFile(file: File): Promise<{ rows: StockImportPreviewRow[]; source: 'csv' | 'xlsx' }> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const source: 'csv' | 'xlsx' = extension === 'xlsx' || extension === 'xls' ? 'xlsx' : 'csv';
  
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Uploaded spreadsheet has no sheets.');
  
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('Spreadsheet contains no data rows.');
  }

  const rows: StockImportPreviewRow[] = rawRows.map((r, idx) => {
    // Flexible header mapping (lowercase trim)
    const normalized: Record<string, any> = {};
    for (const [k, v] of Object.entries(r)) {
      normalized[k.toLowerCase().trim().replace(/[\s_]+/g, '')] = v;
    }

    const name = String(normalized.name || normalized.itemname || normalized.item || normalized.article || '').trim();
    const currentStock = parseFloat(String(normalized.currentstock ?? normalized.stock ?? normalized.qty ?? normalized.quantity ?? 0));
    const minThreshold = parseFloat(String(normalized.minthreshold ?? normalized.min ?? normalized.minimum ?? 5));
    const unit = String(normalized.unit || normalized.uom || 'units').trim();
    const category = String(normalized.category || normalized.dept || 'General').trim();
    const costPrice = parseFloat(String(normalized.costprice ?? normalized.cost ?? 0));
    const sellingPrice = parseFloat(String(normalized.sellingprice ?? normalized.price ?? normalized.retail ?? 0));
    const supplier = String(normalized.supplier || normalized.vendor || '').trim();
    const supplierPhone = String(normalized.supplierphone || normalized.phone || '').trim();

    let isValid = true;
    let validationError = '';

    if (!name) {
      isValid = false;
      validationError = 'Item name is required';
    } else if (isNaN(currentStock) || currentStock < 0) {
      isValid = false;
      validationError = 'Current stock must be a non-negative number';
    } else if (isNaN(minThreshold) || minThreshold < 0) {
      isValid = false;
      validationError = 'Min threshold must be >= 0';
    }

    return {
      name: name || `Unnamed Row ${idx + 1}`,
      currentStock: isNaN(currentStock) ? 0 : currentStock,
      minThreshold: isNaN(minThreshold) ? 5 : minThreshold,
      unit: unit || 'units',
      category: category || 'General',
      costPrice: isNaN(costPrice) ? 0 : costPrice,
      sellingPrice: isNaN(sellingPrice) ? 0 : sellingPrice,
      supplier,
      supplierPhone,
      isValid,
      validationError: validationError || undefined,
      confidence: 1.0
    };
  });

  return { rows, source };
}

/**
 * DOOR 2: Gemini Vision Extraction for Photographed Stock Sheets
 */
export async function extractStockFromImage(imageFile: File): Promise<{ rows: StockImportPreviewRow[] }> {
  // Convert image to base64
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
You are an expert grocery inventory sheet OCR parser.
Analyze this photographed stock sheet or handwritten shop ledger in Mauritius.
Extract all inventory items as a clean JSON array with exact columns:
[
  {
    "name": "Item name e.g. Basmati Rice 5kg",
    "currentStock": 10,
    "minThreshold": 4,
    "unit": "bags",
    "category": "Staples",
    "costPrice": 280,
    "sellingPrice": 345,
    "supplier": "Supplier name if visible",
    "supplierPhone": "Phone number if visible",
    "confidence": 0.95
  }
]
Output ONLY valid JSON without markdown fences.
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
    const cleanJson = text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('No readable inventory rows detected in photo.');
    }

    const rows: StockImportPreviewRow[] = parsed.map((item: any, idx: number) => {
      const name = String(item.name || '').trim();
      const currentStock = Number(item.currentStock ?? 0);
      const minThreshold = Number(item.minThreshold ?? 5);
      const unit = String(item.unit || 'units').trim();
      const category = String(item.category || 'General').trim();
      const costPrice = Number(item.costPrice ?? 0);
      const sellingPrice = Number(item.sellingPrice ?? 0);
      const supplier = String(item.supplier || '').trim();
      const supplierPhone = String(item.supplierPhone || '').trim();
      const confidence = typeof item.confidence === 'number' ? Math.min(1.0, Math.max(0.1, item.confidence)) : 0.85;

      const isValid = Boolean(name && currentStock >= 0);

      return {
        name: name || `Row ${idx + 1}`,
        currentStock: isNaN(currentStock) ? 0 : currentStock,
        minThreshold: isNaN(minThreshold) ? 5 : minThreshold,
        unit: unit || 'units',
        category: category || 'General',
        costPrice: isNaN(costPrice) ? 0 : costPrice,
        sellingPrice: isNaN(sellingPrice) ? 0 : sellingPrice,
        supplier,
        supplierPhone,
        isValid,
        validationError: isValid ? undefined : 'Incomplete name or negative stock',
        confidence
      };
    });

    return { rows };
  } catch (err: any) {
    console.warn("Vision extraction failed:", err);
    throw new Error(err.message || 'Door 2 Vision quota interrupted. Fallback to Door 1 (Upload CSV/Excel).');
  }
}

/**
 * REORDER LOOP: Supplier WhatsApp Link Generator
 */
export function generateSupplierWhatsAppUrl(
  item: StockItem,
  profile: MerchantProfile
): string {
  const recommendedQty = Math.max(1, (item.minThreshold * 2) - item.currentStock);
  const supplierName = item.supplier || 'Distributor';
  let phone = (item.supplierPhone || '').replace(/\D/g, '');
  if (phone.length === 8 && (phone.startsWith('5') || phone.startsWith('6'))) {
    phone = `230${phone}`;
  }

  const template = profile.whatsappTemplateSupplier || 
    'Bonzour {supplier}, this is {shopName}. Please supply {qty} units of {item}. Mersi!';

  const message = template
    .replace('{supplier}', supplierName)
    .replace('{item}', item.name)
    .replace('{qty}', `${recommendedQty} ${item.unit}`)
    .replace('{shopName}', profile.shopName);

  if (!phone) {
    // If supplier phone is blank, open general WhatsApp share text
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
