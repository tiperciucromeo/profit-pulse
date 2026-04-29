import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle, AlertCircle, RefreshCw, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api";

const STORAGE_KEY_PREFIX = "sheets-data-v2-";

type SheetsResponse = {
  ok: boolean;
  rows: string[][];
  totalRows: number;
  fetchedAt?: string | null;
  nextSyncAt?: string | null;
  error?: string;
};

function getStorageKey(spreadsheetId: string, range: string) {
  return `${STORAGE_KEY_PREFIX}${spreadsheetId}|${range}`;
}

function clearSheetsCache() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("sheets-data-")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

function loadFromStorage(spreadsheetId: string, range: string): SheetsResponse | null {
  try {
    const raw = localStorage.getItem(getStorageKey(spreadsheetId, range));
    if (!raw) return null;
    const data = JSON.parse(raw) as SheetsResponse;
    return data?.ok && Array.isArray(data.rows) ? data : null;
  } catch {
    return null;
  }
}

function saveToStorage(spreadsheetId: string, range: string, data: SheetsResponse) {
  if (!data?.ok) return;
  try {
    localStorage.setItem(getStorageKey(spreadsheetId, range), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function getErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Lipsesc credențialele") || msg.includes("GOOGLE_SHEETS")) {
    return "Lipsesc credențialele în .env. Adaugă GOOGLE_SHEETS_CLIENT_EMAIL și GOOGLE_SHEETS_PRIVATE_KEY.";
  }
  if (msg.includes("permission") || msg.includes("does not have permission") || msg.includes("insufficient")) {
    return "Partajează spreadsheet-ul cu adresa Service Account (Viewer). Verifică în .env: GOOGLE_SHEETS_CLIENT_EMAIL.";
  }
  if (msg.includes("Unable to parse range") || msg.includes("parse range")) {
    return "Range invalid. Verifică formatul (ex: Sheet1!A2:C) și că tab-ul există.";
  }
  return msg;
}

async function fetchSheetsData(spreadsheetId: string, range: string, force = false): Promise<SheetsResponse> {
  const params = new URLSearchParams({
    spreadsheetId: spreadsheetId.trim(),
    range,
  });

  // Folosim /api/sheets/test?full=1 pentru a obține TOATE rândurile (nu doar 20)
  const testUrl = `/api/sheets/test?${params}&full=1`;
  let res = await fetch(testUrl);
  if (res.ok) {
    const data = await parseJsonResponse<SheetsResponse>(res);
    if (data.ok) return { ...data, fetchedAt: null, nextSyncAt: null };
    throw new Error(data.error || "Eroare la preluarea datelor");
  }

  // Fallback: /api/sheets/data (cu cache)
  res = await fetch(`/api/sheets/data?${params}${force ? "&force=1" : ""}`);
  if (res.ok) {
    const data = await parseJsonResponse<SheetsResponse>(res);
    if (data.ok) return data;
    throw new Error(data.error || "Eroare la preluarea datelor");
  }

  const data = await parseJsonResponse<{ ok?: boolean; error?: string }>(res).catch(() => ({}));
  throw new Error(data.error || `Eroare ${res.status}`);
}

export default function GoogleSheetsPage() {
  const [spreadsheetId, setSpreadsheetId] = useState(
    "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs"
  );
  const [range, setRange] = useState("Sheet1!A2:C");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [data, setData] = useState<SheetsResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (!sessionStorage.getItem("sheets-cache-cleared")) {
      clearSheetsCache();
      sessionStorage.setItem("sheets-cache-cleared", "1");
    }
  }, []);

  useEffect(() => {
    const cached = loadFromStorage(spreadsheetId, range);
    if (cached) {
      setData(cached);
      setError(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchSheetsData(spreadsheetId, range, false)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) saveToStorage(spreadsheetId, range, result);
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spreadsheetId, range]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const fresh = await fetchSheetsData(spreadsheetId, range, true);
      if (fresh.ok) {
        saveToStorage(spreadsheetId, range, fresh);
        setData(fresh);
        toast.success(`${fresh.totalRows} rânduri reîmprospătate din Google Sheets.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      toast.error(getErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  };

  const allRows: string[][] = Array.isArray(data?.rows) ? data.rows : [];
  const totalRows = data?.totalRows ?? allRows.length;

  const searchLower = search.trim().toLowerCase();
  const filteredRows = searchLower
    ? allRows.filter((row) => {
        const sku = String(row?.[0] ?? "").toLowerCase();
        const nume = String(row?.[1] ?? "").toLowerCase();
        return sku.includes(searchLower) || nume.includes(searchLower);
      })
    : allRows;

  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / safePageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safePage - 1) * safePageSize;
  const paginatedRows = filteredRows.slice(startIdx, startIdx + safePageSize);

  const isSuccess = data?.ok ?? false;

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800">
                  Costuri producție
                </h1>
                <p className="text-sm text-slate-500">
                  {totalRows > 0 ? `${totalRows.toLocaleString("ro-RO")} produse` : "Google Sheets"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <Link to="/invoices">Facturi ONL</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                <Link to="/">Acasă</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                {isSuccess && data?.ok ? (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                ) : error ? (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-slate-800">
                    {isSuccess && data?.ok ? "Date din Google Sheet" : error ? "Eroare" : "Se încarcă..."}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {isSuccess && data?.ok
                      ? `${totalRows.toLocaleString("ro-RO")} rânduri`
                      : error
                        ? getErrorMessage(error)
                        : "Se încarcă datele..."}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing || !spreadsheetId.trim()}
                className="border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Reîmprospătare</span>
              </Button>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-6 rounded-xl border border-red-200 bg-red-50/50 p-4">
              <p className="font-medium text-red-800">Cum rezolvi:</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-red-700/90">
                <li>Verifică credențialele în <code className="rounded bg-red-100 px-1 py-0.5 text-xs">.env</code></li>
                <li>Partajează spreadsheet-ul cu adresa Service Account (Viewer)</li>
                <li>Verifică range-ul (ex: Sheet1!A2:C)</li>
                <li>Repornește backend-ul după modificări</li>
              </ul>
            </div>
          )}

          {isSuccess && data?.ok && allRows.length > 0 && (
            <div className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Caută după SKU sau nume produs..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="h-11 pl-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                    autoComplete="off"
                  />
                  {search && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {filteredRows.length} rezultate
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <span className="text-sm text-slate-500">Pe pagină:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[90px] h-11 rounded-xl border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 overflow-hidden shadow-inner">
                <div className="max-h-[70vh] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200 hover:bg-transparent">
                        <TableHead className="sticky top-0 z-10 bg-slate-100/95 py-4 font-semibold text-slate-700">
                          SKU
                        </TableHead>
                        <TableHead className="sticky top-0 z-10 bg-slate-100/95 py-4 font-semibold text-slate-700">
                          Nume produs
                        </TableHead>
                        <TableHead className="sticky top-0 z-10 bg-slate-100/95 py-4 text-right font-semibold text-slate-700">
                          Cost
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-32 text-center text-slate-500">
                            {search ? "Nu s-au găsit rezultate." : "—"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRows.map((row, i) => (
                          <TableRow
                            key={`${startIdx}-${i}`}
                            className="border-slate-100 hover:bg-emerald-50/30 transition-colors"
                          >
                            <TableCell className="font-mono text-sm text-slate-700">
                              {row[0] ?? "—"}
                            </TableCell>
                            <TableCell className="text-slate-600">{row[1] ?? "—"}</TableCell>
                            <TableCell className="text-right font-medium text-slate-800">
                              {row[2] ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-sm text-slate-500">
                  {search
                    ? `${filteredRows.length.toLocaleString("ro-RO")} din ${totalRows.toLocaleString("ro-RO")} rânduri`
                    : `${totalRows.toLocaleString("ro-RO")} rânduri stocate local`}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="h-9 w-9 rounded-lg border-slate-200 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[90px] px-3 py-1.5 text-center text-sm font-medium text-slate-600">
                      {safePage} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="h-9 w-9 rounded-lg border-slate-200 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
