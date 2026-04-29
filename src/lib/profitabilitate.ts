/**
 * Logică partajată pentru paginile de profitabilitate.
 * O singură sursă de adevăr – evită erori de tip copy-paste (ex. isTransport vs isTransportOrShipping).
 */

import { parseJsonResponse } from "@/lib/api";

export type Product = {
  name?: string;
  code?: string;
  quantity?: string;
  price?: string;
  discount?: number;
  discountType?: string;
  refItems?: string[];
};

export type Invoice = {
  id: string;
  number: string;
  seriesName?: string;
  issueDate: string;
  total?: string;
  products?: Product[];
  storno?: string;
  canceled?: string;
  stornoed?: string;
};

export type CostItem = { sku: string; name: string; cost: number };

export type ProfitabilitateConfig = {
  from: string;
  to: string;
  title: string;
  subtitle: string;
  facturiLabel: string;
  emptyMessage: string;
  dateRangeLabel: string;
  pdfFilename: string;
  storageKey: string;
  spreadsheetId?: string;
  range?: string;
};

export function isTransportOrShipping(p: Product): boolean {
  const name = (p.name || "").toLowerCase();
  return name.includes("transport") || name.includes("shipping");
}

export function isDiscountOrReducere(p: Product): boolean {
  const name = (p.name || "").toLowerCase();
  return (
    p.discount !== undefined ||
    (p.refItems != null && p.refItems.length > 0) ||
    name.includes("discount") ||
    name.includes("reducere") ||
    name.includes("cod reducere")
  );
}

export function formatProduct(p: Product): string {
  const qty = parseFloat(p.quantity || "0") || 0;
  const price = parseFloat(p.price || "0") || 0;
  const name = (p.name || "").replace(/^Discount\s+"/, "").replace(/"$/, "");
  if (qty === 0) return name;
  return `${name} (${qty} × ${price.toFixed(2)} RON)`;
}

export async function fetchInvoicesForPeriod(config: ProfitabilitateConfig): Promise<Invoice[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(
      `/api/invoices?from=${config.from}&to=${config.to}`,
      { signal: controller.signal }
    );
    const data = await parseJsonResponse<{ invoices: Invoice[] }>(res);
    return data?.invoices ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

const DEFAULT_SPREADSHEET_ID = "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs";
const DEFAULT_RANGE = "Sheet1!A2:C";

export type CheltuieliData = {
  tvaRate: string;
  cheltuieli: { label: string; value: string; hasTva?: boolean }[];
};

export async function fetchCheltuieli(storageKey: string): Promise<CheltuieliData> {
  try {
    const res = await fetch(`/api/cheltuieli/${encodeURIComponent(storageKey)}`);
    const data = await parseJsonResponse<CheltuieliData>(res);
    return {
      tvaRate: data?.tvaRate ?? "19",
      cheltuieli: Array.isArray(data?.cheltuieli) ? data.cheltuieli.map((c) => ({ ...c, hasTva: c.hasTva !== false })) : [],
    };
  } catch {
    return { tvaRate: "19", cheltuieli: [] };
  }
}

export async function saveCheltuieli(storageKey: string, data: CheltuieliData): Promise<boolean> {
  try {
    const res = await fetch(`/api/cheltuieli/${encodeURIComponent(storageKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Calculează Profit Final pentru o perioadă – aceeași logică ca pe pagina Profitabilitate.
 * Folosit pentru suma totală pe Home.
 */
export function computeProfitFinalForPeriod(
  invoices: Invoice[],
  costs: CostItem[],
  cheltuieliData: { tvaRate: string; cheltuieli: { value: string; hasTva?: boolean }[] }
): number {
  const costBySku: Record<string, number> = {};
  for (const c of costs) {
    const sku = (c?.sku ?? "").toString().trim();
    if (sku) costBySku[sku] = Number(c?.cost) || 0;
  }

  const rows = invoices.map((inv) => {
    let totalCostProductie = 0;
    for (const p of inv?.products || []) {
      if (isTransportOrShipping(p) || isDiscountOrReducere(p)) continue;
      const sku = (p?.code || "").trim();
      const qty = parseFloat(p?.quantity || "0") || 0;
      const cost = costBySku[sku] ?? 0;
      totalCostProductie += qty * cost;
    }
    const sumaFacturata = parseFloat(String(inv?.total || "0").replace(",", ".")) || 0;
    return { sumaFacturata, totalCostProductie };
  });

  const totalSuma = rows.reduce((s, r) => s + r.sumaFacturata, 0);
  const totalCost = rows.reduce((s, r) => s + r.totalCostProductie, 0);
  const rate = parseFloat(cheltuieliData.tvaRate || "19") || 0;
  const tvaDinSuma = rate > 0 && totalSuma > 0 ? (totalSuma * rate) / (100 + rate) : 0;
  const sumaCheltuieli = (cheltuieliData.cheltuieli || []).reduce(
    (s, c) => s + (parseFloat(c?.value || "0") || 0),
    0
  );
  const sumaTvaCheltuieli = (cheltuieliData.cheltuieli || []).reduce((s, c) => {
    if (c?.hasTva === false) return s;
    const amt = parseFloat(c?.value || "0") || 0;
    return s + (rate > 0 && amt > 0 ? (amt * rate) / (100 + rate) : 0);
  }, 0);

  return totalSuma - tvaDinSuma - totalCost - sumaCheltuieli + sumaTvaCheltuieli;
}

export async function fetchCostsForPeriod(config: ProfitabilitateConfig, options?: { force?: boolean }): Promise<CostItem[]> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const spreadsheetId = config.spreadsheetId ?? DEFAULT_SPREADSHEET_ID;
  const range = config.range ?? DEFAULT_RANGE;
  const force = options?.force === true;
  const forceParam = force ? "&force=1" : "";
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(
      `/api/sheets/costs?spreadsheetId=${spreadsheetId}&range=${encodeURIComponent(range)}${forceParam}`,
      { signal: controller.signal }
    );
    const data = await parseJsonResponse<{ costs?: CostItem[] }>(res);
    return Array.isArray(data?.costs) ? data.costs : [];
  } catch {
    return [];
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
