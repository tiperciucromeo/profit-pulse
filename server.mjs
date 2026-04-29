import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");
const INVOICES_FILE = path.join(DATA_DIR, "invoices_onl.json");
const CHELTUIELI_FILE = path.join(DATA_DIR, "cheltuieli.json");
const SHEETS_CACHE_FILE = path.join(DATA_DIR, "sheets_cache.json");
const SHEETS_CACHE_MS = 24 * 60 * 60 * 1000; // 24 ore

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Oblio OAuth Token ────────────────────────────────────────────────
let cachedToken = null;
let tokenExpiresAt = 0;

async function getOblioToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const { OBLIO_EMAIL, OBLIO_SECRET } = process.env;
  if (!OBLIO_EMAIL || !OBLIO_SECRET) {
    throw new Error(
      "Lipsesc credentialele Oblio. Setează OBLIO_EMAIL și OBLIO_SECRET în .env"
    );
  }

  const res = await fetch("https://www.oblio.eu/api/authorize/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: OBLIO_EMAIL,
      client_secret: OBLIO_SECRET,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Oblio auth failed: ${res.status} – ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (Number(data.expires_in) - 60) * 1000;
  console.log("Oblio token obținut cu succes.");
  return cachedToken;
}

// ─── Fetch ONL invoices din Oblio (paginated) ───────────────────────
// issuedAfter: "YYYY-MM-DD" – doar facturi de la această dată înainte (incremental)
async function fetchONLInvoicesFromOblio({ issuedAfter } = {}) {
  const { OBLIO_CIF } = process.env;
  if (!OBLIO_CIF) {
    throw new Error("Lipsește OBLIO_CIF în .env");
  }

  const token = await getOblioToken();
  const allInvoices = [];
  let offset = 0;
  const limit = 100;

  const mode = issuedAfter ? `incremental (de la ${issuedAfter})` : "complet";
  console.log(`Preluare facturi ONL ${mode} pentru CIF ${OBLIO_CIF}...`);

  while (true) {
    const url = new URL("https://www.oblio.eu/api/docs/invoice/list");
    url.searchParams.set("cif", OBLIO_CIF);
    url.searchParams.set("seriesName", "ONL");
    url.searchParams.set("withProducts", "1");
    url.searchParams.set("limitPerPage", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("orderBy", "number");
    url.searchParams.set("orderDir", "ASC");
    if (issuedAfter) {
      url.searchParams.set("issuedAfter", issuedAfter);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Oblio list error: ${res.status} – ${text}`);
    }

    const json = await res.json();
    const invoices = json.data || [];

    if (invoices.length === 0) break;

    allInvoices.push(...invoices);
    if (allInvoices.length <= 500 || allInvoices.length % 500 === 0) {
      console.log(`  ✓ Primit ${invoices.length} facturi (total: ${allInvoices.length})`);
    }

    if (invoices.length < limit) break;

    offset += limit;
    await sleep(350);
  }

  console.log(`Total facturi preluate: ${allInvoices.length}`);
  return allInvoices;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Save / Load local data ──────────────────────────────────────────
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 ore

function saveInvoices(invoices, { lastSyncAt } = {}) {
  const now = new Date().toISOString();
  const payload = {
    fetchedAt: now,
    lastSyncAt: lastSyncAt || now,
    seriesName: "ONL",
    count: invoices.length,
    invoices,
  };
  fs.writeFileSync(INVOICES_FILE, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`Salvat ${invoices.length} facturi în ${INVOICES_FILE}`);
}

function getMaxIssueDate(invoices) {
  let max = "";
  for (const inv of invoices || []) {
    const d = inv.issueDate || "";
    if (d > max) max = d;
  }
  return max;
}

function loadLocalInvoices() {
  const pathsToTry = [
    INVOICES_FILE,
    path.join(process.cwd(), "data", "invoices_onl.json"),
  ];
  for (const filePath of pathsToTry) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
      } catch (err) {
        console.error("Eroare citire facturi:", err);
        return null;
      }
    }
  }
  console.warn("Fișier facturi negăsit. Căutat în:", pathsToTry);
  return null;
}

// ─── API Routes ──────────────────────────────────────────────────────

// Sincronizare: verifică o dată la 24h, preia doar facturi noi
// ?force=1 – ignoră verificarea de 24h (full sync dacă nu există date)
app.post("/api/oblio/sync-invoices", async (req, res) => {
  try {
    const force = req.query.force === "1" || req.query.force === "true";
    const existing = loadLocalInvoices();

    if (existing?.lastSyncAt && !force) {
      const lastSync = new Date(existing.lastSyncAt).getTime();
      const elapsed = Date.now() - lastSync;
      if (elapsed < SYNC_INTERVAL_MS) {
        const hoursLeft = Math.ceil((SYNC_INTERVAL_MS - elapsed) / (60 * 60 * 1000));
        return res.json({
          ok: true,
          skipped: true,
          message: `Ultima sincronizare a fost acum ${Math.floor(elapsed / (60 * 60 * 1000))} ore. Încercați în ${hoursLeft} ore.`,
          lastSyncAt: existing.lastSyncAt,
          count: existing.count,
        });
      }
    }

    let invoices;
    if (!existing?.invoices?.length) {
      invoices = await fetchONLInvoicesFromOblio({});
      saveInvoices(invoices);
      return res.json({
        ok: true,
        message: `Preluate și salvate ${invoices.length} facturi ONL (primă încărcare).`,
        count: invoices.length,
        fetchedAt: new Date().toISOString(),
        newCount: invoices.length,
      });
    }

    const maxDate = getMaxIssueDate(existing.invoices);
    const issuedAfter = maxDate || undefined;
    const newFromOblio = await fetchONLInvoicesFromOblio({ issuedAfter });

    const existingIds = new Set(existing.invoices.map((inv) => String(inv.id)));
    const toAdd = newFromOblio.filter((inv) => !existingIds.has(String(inv.id)));

    if (toAdd.length === 0) {
      saveInvoices(existing.invoices, { lastSyncAt: new Date().toISOString() });
      return res.json({
        ok: true,
        message: "Nu există facturi noi.",
        count: existing.invoices.length,
        lastSyncAt: new Date().toISOString(),
        newCount: 0,
      });
    }

    const merged = [...existing.invoices, ...toAdd].sort((a, b) => {
      const da = a.issueDate || "";
      const db = b.issueDate || "";
      if (da !== db) return da.localeCompare(db);
      return (a.number || "").localeCompare(b.number || "");
    });

    saveInvoices(merged, { lastSyncAt: new Date().toISOString() });
    return res.json({
      ok: true,
      message: `Adăugate ${toAdd.length} facturi noi. Total: ${merged.length}.`,
      count: merged.length,
      lastSyncAt: new Date().toISOString(),
      newCount: toAdd.length,
    });
  } catch (error) {
    console.error("Eroare la sincronizare:", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Deprecat: folosește sync-invoices. Păstrat pentru compatibilitate.
app.post("/api/oblio/fetch-invoices", async (_req, res) => {
  try {
    const invoices = await fetchONLInvoicesFromOblio({});
    saveInvoices(invoices);
    res.json({
      ok: true,
      message: `Preluate și salvate ${invoices.length} facturi ONL.`,
      count: invoices.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Eroare la preluarea facturilor:", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Summary: structură lună/zi fără date complete (încărcare rapidă)
app.get("/api/invoices/summary", (_req, res) => {
  const data = loadLocalInvoices();
  if (!data) {
    return res.status(404).json({
      ok: false,
      error: "Nu există facturi locale. Apelează POST /api/oblio/fetch-invoices mai întâi.",
    });
  }
  const structure = {};
  const monthlyTotals = {};
  const dailyTotals = {};
  for (const inv of data.invoices || []) {
    const date = inv.issueDate || "";
    const monthKey = date.slice(0, 7);
    const dayKey = date;
    if (!monthKey || monthKey.length < 7) continue;
    if (!structure[monthKey]) structure[monthKey] = {};
    structure[monthKey][dayKey] = (structure[monthKey][dayKey] || 0) + 1;
    const total = parseFloat(inv.total || "0");
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + total;
    if (!dailyTotals[monthKey]) dailyTotals[monthKey] = {};
    dailyTotals[monthKey][dayKey] = (dailyTotals[monthKey][dayKey] || 0) + total;
  }
  res.json({
    fetchedAt: data.fetchedAt,
    lastSyncAt: data.lastSyncAt || data.fetchedAt,
    seriesName: data.seriesName,
    count: data.count,
    structure,
    monthlyTotals,
    dailyTotals,
  });
});

// Facturi pentru o zi specifică (încărcare la cerere)
app.get("/api/invoices/day", (req, res) => {
  const data = loadLocalInvoices();
  if (!data) {
    return res.status(404).json({
      ok: false,
      error: "Nu există facturi locale.",
    });
  }
  const month = req.query.month?.toString();
  const day = req.query.day?.toString();
  if (!month || !day) {
    return res.status(400).json({ ok: false, error: "Parametri month și day sunt obligatorii." });
  }
  const filtered = (data.invoices || []).filter((inv) => {
    const d = inv.issueDate || "";
    return d.startsWith(month) && d === day;
  });
  res.json({ invoices: filtered });
});

// Return locally stored invoices (full - pentru compatibilitate)
app.get("/api/invoices", (req, res) => {
  const data = loadLocalInvoices();
  if (!data) {
    return res.status(404).json({
      ok: false,
      error: "Nu există facturi locale. Apelează POST /api/oblio/fetch-invoices mai întâi.",
    });
  }
  const month = req.query.month?.toString();
  const day = req.query.day?.toString();
  const from = req.query.from?.toString();
  const to = req.query.to?.toString();

  if (month && day) {
    const filtered = (data.invoices || []).filter((inv) => {
      const d = inv.issueDate || "";
      return d.startsWith(month) && d === day;
    });
    return res.json({ ...data, invoices: filtered, count: filtered.length });
  }

  if (from || to) {
    const stornoOnly = req.query.stornoOnly === "1" || req.query.stornoOnly === "true";
    const filtered = (data.invoices || []).filter((inv) => {
      const d = inv.issueDate || "";
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (stornoOnly) {
        return inv.storno === "1";
      }
      if (inv.canceled === "1") return false;
      return true;
    });
    return res.json({ ...data, invoices: filtered, count: filtered.length });
  }

  res.json(data);
});

// ─── Cheltuieli (profitabilitate) – persistente pe server ─────────────
function loadCheltuieliAll() {
  if (!fs.existsSync(CHELTUIELI_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CHELTUIELI_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveCheltuieliAll(data) {
  fs.writeFileSync(CHELTUIELI_FILE, JSON.stringify(data, null, 2), "utf-8");
}

app.get("/api/cheltuieli/:storageKey", (req, res) => {
  const storageKey = req.params.storageKey;
  if (!storageKey) return res.status(400).json({ ok: false, error: "storageKey lipsă." });
  const all = loadCheltuieliAll();
  const entry = all[storageKey] || null;
  res.json(entry ? { tvaRate: entry.tvaRate ?? "19", cheltuieli: entry.cheltuieli ?? [] } : { tvaRate: "19", cheltuieli: [] });
});

app.post("/api/cheltuieli/:storageKey", (req, res) => {
  const storageKey = req.params.storageKey;
  if (!storageKey) return res.status(400).json({ ok: false, error: "storageKey lipsă." });
  const { tvaRate, cheltuieli } = req.body || {};
  const all = loadCheltuieliAll();
  all[storageKey] = { tvaRate: tvaRate ?? "19", cheltuieli: Array.isArray(cheltuieli) ? cheltuieli : [] };
  saveCheltuieliAll(all);
  res.json({ ok: true, tvaRate: all[storageKey].tvaRate, cheltuieli: all[storageKey].cheltuieli });
});

// ─── Profit Final agregat (toate lunile) ──────────────────────────────
const PROFITABILITATE_PERIODS = [
  { from: "2024-09-01", to: "2024-09-30", storageKey: "profitabilitate-sept-2024-cheltuieli" },
  { from: "2024-10-01", to: "2024-10-31", storageKey: "profitabilitate-oct-2024-cheltuieli" },
  { from: "2024-11-01", to: "2024-11-30", storageKey: "profitabilitate-nov-2024-cheltuieli" },
  { from: "2024-12-01", to: "2024-12-31", storageKey: "profitabilitate-dec-2024-cheltuieli" },
  { from: "2025-01-01", to: "2025-01-31", storageKey: "profitabilitate-ian-2025-cheltuieli" },
  { from: "2025-02-01", to: "2025-02-28", storageKey: "profitabilitate-feb-2025-cheltuieli" },
  { from: "2025-03-01", to: "2025-03-31", storageKey: "profitabilitate-mar-2025-cheltuieli" },
  { from: "2025-04-01", to: "2025-04-30", storageKey: "profitabilitate-apr-2025-cheltuieli" },
  { from: "2025-05-01", to: "2025-05-31", storageKey: "profitabilitate-mai-2025-cheltuieli" },
  { from: "2025-06-01", to: "2025-06-30", storageKey: "profitabilitate-iun-2025-cheltuieli" },
  { from: "2025-07-01", to: "2025-07-31", storageKey: "profitabilitate-iul-2025-cheltuieli" },
  { from: "2025-08-01", to: "2025-08-31", storageKey: "profitabilitate-aug-2025-cheltuieli" },
  { from: "2025-09-01", to: "2025-09-30", storageKey: "profitabilitate-sept-2025-cheltuieli" },
  { from: "2025-10-01", to: "2025-10-31", storageKey: "profitabilitate-oct-2025-cheltuieli" },
  { from: "2025-11-01", to: "2025-11-30", storageKey: "profitabilitate-nov-2025-cheltuieli" },
  { from: "2025-12-01", to: "2025-12-31", storageKey: "profitabilitate-dec-2025-cheltuieli" },
  { from: "2026-01-01", to: "2026-01-31", storageKey: "profitabilitate-ian-2026-cheltuieli" },
  { from: "2026-02-01", to: "2026-02-28", storageKey: "profitabilitate-feb-2026-cheltuieli" },
  { from: "2026-03-01", to: "2026-03-31", storageKey: "profitabilitate-mar-2026-cheltuieli" },
];

function isTransportOrShipping(p) {
  const name = (p?.name || "").toLowerCase();
  return name.includes("transport") || name.includes("shipping");
}

function isDiscountOrReducere(p) {
  const name = (p?.name || "").toLowerCase();
  return (
    p?.discount !== undefined ||
    (p?.refItems != null && p.refItems.length > 0) ||
    name.includes("discount") ||
    name.includes("reducere") ||
    name.includes("cod reducere")
  );
}

app.get("/api/profitabilitate/summary", async (req, res) => {
  try {
    const data = loadLocalInvoices();
    if (!data?.invoices?.length) {
      return res.json({ ok: true, profitFinalTotal: 0, periods: [], message: "Nu există facturi." });
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs";
    const range = "Sheet1!A2:C";
    let costBySku = {};
    try {
      const costRows = await getSheetsDataWithCache(spreadsheetId, range, false);
      for (const row of costRows) {
        const [sku, , costStr] = row;
        if (!sku) continue;
        const cost = parseFloat(String(costStr || "0").replace(",", ".")) || 0;
        costBySku[String(sku).trim()] = isNaN(cost) ? 0 : cost;
      }
    } catch (err) {
      console.warn("Costuri Sheets indisponibile:", err?.message);
    }

    const allCheltuieli = loadCheltuieliAll();
    const invoices = data.invoices.filter((inv) => inv.canceled !== "1");
    let profitFinalTotal = 0;
    const periods = [];

    for (const period of PROFITABILITATE_PERIODS) {
      const filtered = invoices.filter((inv) => {
        const d = inv.issueDate || "";
        return d >= period.from && d <= period.to;
      });

      const rows = filtered.map((inv) => {
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

      const totalSumaNet = rows.reduce((s, r) => s + r.sumaFacturata, 0);
      const totalCost = rows.reduce((s, r) => s + r.totalCostProductie, 0);
      const entry = allCheltuieli[period.storageKey] || {};
      const tvaRate = parseFloat(entry.tvaRate || "19") || 0;
      const cheltuieliList = Array.isArray(entry.cheltuieli) ? entry.cheltuieli : [];
      const sumaCheltuieli = cheltuieliList.reduce((s, c) => s + (parseFloat(c?.value || "0") || 0), 0);
      const sumaTvaCheltuieli = cheltuieliList.reduce((s, c) => {
        if (c?.hasTva === false) return s;
        const amt = parseFloat(c?.value || "0") || 0;
        return s + (tvaRate > 0 && amt > 0 ? (amt * tvaRate) / (100 + tvaRate) : 0);
      }, 0);
      const tvaDinSuma = tvaRate > 0 && totalSumaNet > 0 ? (totalSumaNet * tvaRate) / (100 + tvaRate) : 0;
      const profitFinal = totalSumaNet - tvaDinSuma - totalCost - sumaCheltuieli + sumaTvaCheltuieli;

      profitFinalTotal += profitFinal;
      periods.push({
        from: period.from,
        to: period.to,
        profitFinal,
        totalSumaNet,
        invoiceCount: filtered.length,
      });
    }

    res.json({
      ok: true,
      profitFinalTotal,
      periods,
    });
  } catch (error) {
    console.error("Eroare profitabilitate summary:", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Quick connection test: get companies from Oblio
app.get("/api/oblio/test", async (_req, res) => {
  try {
    const token = await getOblioToken();
    const r = await fetch("https://www.oblio.eu/api/nomenclature/companies", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    res.json({ ok: true, data });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// ─── Google Sheets ────────────────────────────────────────────────────
async function loadFromGoogleSheets(spreadsheetId, range = "Costs!A2:C") {
  const { GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY } = process.env;
  if (!GOOGLE_SHEETS_CLIENT_EMAIL || !GOOGLE_SHEETS_PRIVATE_KEY) {
    throw new Error(
      "Lipsesc credențialele Google Sheets. Setează GOOGLE_SHEETS_CLIENT_EMAIL și GOOGLE_SHEETS_PRIVATE_KEY în .env"
    );
  }
  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: GOOGLE_SHEETS_CLIENT_EMAIL,
    key: GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return res.data.values || [];
}

function loadSheetsCache() {
  if (!fs.existsSync(SHEETS_CACHE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(SHEETS_CACHE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function saveSheetsCache(payload) {
  fs.writeFileSync(SHEETS_CACHE_FILE, JSON.stringify(payload, null, 2), "utf-8");
}

/** Returnează rândurile din Sheet, cu cache 24h. force=true ignoră cache-ul. */
async function getSheetsDataWithCache(spreadsheetId, range, force = false) {
  const cacheKey = `${spreadsheetId}|${range}`;
  const cached = loadSheetsCache();
  const entry = cached?.[cacheKey];
  const now = Date.now();

  if (!force && entry && now - (entry.fetchedAt || 0) < SHEETS_CACHE_MS) {
    return entry.rows || [];
  }

  const rows = await loadFromGoogleSheets(spreadsheetId, range);
  const next = { ...(cached || {}), [cacheKey]: { fetchedAt: now, rows } };
  saveSheetsCache(next);
  return rows;
}

app.get("/api/sheets/test", async (req, res) => {
  try {
    const spreadsheetId = req.query.spreadsheetId?.toString();
    const range = req.query.range?.toString() || "Costs!A2:C";
    if (!spreadsheetId) {
      return res.status(400).json({
        ok: false,
        error: "Parametrul spreadsheetId este obligatoriu.",
      });
    }
    const rows = await loadFromGoogleSheets(spreadsheetId, range);
    res.json({
      ok: true,
      message: `Citite ${rows.length} rânduri.`,
      rows,
      totalRows: rows.length,
    });
  } catch (error) {
    console.error("Eroare Google Sheets:", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Toate datele din Sheet, cu cache 24h. ?force=1 forțează reîmprospătare.
app.get("/api/sheets/data", async (req, res) => {
  try {
    const spreadsheetId =
      req.query.spreadsheetId?.toString() ||
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const range =
      req.query.range?.toString() ||
      process.env.GOOGLE_SHEETS_RANGE ||
      "Sheet1!A2:C";
    const force = req.query.force === "1" || req.query.force === "true";

    if (!spreadsheetId) {
      return res.status(400).json({
        ok: false,
        error: "Lipsește spreadsheetId (query sau GOOGLE_SHEETS_SPREADSHEET_ID).",
      });
    }

    const rows = await getSheetsDataWithCache(spreadsheetId, range, force);
    const cacheKey = `${spreadsheetId}|${range}`;
    const cached = loadSheetsCache();
    const entry = cached?.[cacheKey];
    const nextSyncAt = entry?.fetchedAt
      ? new Date(entry.fetchedAt + SHEETS_CACHE_MS).toISOString()
      : null;

    res.json({
      ok: true,
      rows,
      totalRows: rows.length,
      fetchedAt: entry?.fetchedAt ? new Date(entry.fetchedAt).toISOString() : null,
      nextSyncAt,
    });
  } catch (error) {
    console.error("Eroare Google Sheets data:", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/sheets/costs", async (req, res) => {
  try {
    const spreadsheetId =
      req.query.spreadsheetId?.toString() || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const range =
      req.query.range?.toString() || process.env.GOOGLE_SHEETS_RANGE || "Costs!A2:C";
    const force = req.query.force === "1" || req.query.force === "true";
    if (!spreadsheetId) {
      return res.status(400).json({
        ok: false,
        error: "Lipsește spreadsheetId (query sau GOOGLE_SHEETS_SPREADSHEET_ID).",
      });
    }
    const rows = await getSheetsDataWithCache(spreadsheetId, range, force);
    const costs = [];
    for (const row of rows) {
      const [sku, name, costStr] = row;
      if (!sku) continue;
      const cost = parseFloat(String(costStr || "0").replace(",", "."));
      costs.push({
        sku: String(sku).trim(),
        name: String(name || "").trim(),
        cost: isNaN(cost) ? 0 : cost,
      });
    }
    res.json({
      ok: true,
      count: costs.length,
      costs,
    });
  } catch (error) {
    console.error("Eroare Google Sheets costs:", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Debug: verifică dacă fișierul facturi există
app.get("/api/invoices/debug", (_req, res) => {
  const pathsToTry = [
    INVOICES_FILE,
    path.join(process.cwd(), "data", "invoices_onl.json"),
  ];
  const results = pathsToTry.map((p) => ({
    path: p,
    exists: fs.existsSync(p),
  }));
  res.json({
    cwd: process.cwd(),
    __dirname,
    pathsChecked: results,
    hasData: !!loadLocalInvoices(),
  });
});

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log("  GET  /api/oblio/test            – Test conexiune Oblio");
  console.log("  POST /api/oblio/sync-invoices   – Sincronizare (verificare 24h, doar facturi noi)");
  console.log("  POST /api/oblio/fetch-invoices  – Preia toate facturile (deprecat)");
  console.log("  GET  /api/sheets/test           – Test conexiune Google Sheets");
  console.log("  GET  /api/sheets/data           – Toate datele (cache 24h)");
  console.log("  GET  /api/sheets/costs           – Costuri din Sheet (SKU, nume, cost)");
  console.log("  GET  /api/invoices              – Facturile locale");
  console.log("  GET  /api/profitabilitate/summary – Profit final total (toate lunile)");
});
