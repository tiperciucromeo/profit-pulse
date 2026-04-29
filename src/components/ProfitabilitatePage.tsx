import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, FileText, Plus, Trash2, Save, FileDown, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { exportPageToPdf } from "@/lib/pdfExport";
import { toast } from "sonner";
import {
  type Invoice,
  type CostItem,
  type ProfitabilitateConfig,
  isTransportOrShipping,
  isDiscountOrReducere,
  formatProduct,
  fetchInvoicesForPeriod,
  fetchCostsForPeriod,
  fetchCheltuieli,
  saveCheltuieli,
} from "@/lib/profitabilitate";

const SPREADSHEET_ID = "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs";
const RANGE = "Sheet1!A2:C";

const DEFAULT_CHELTUIELI = [
  { label: "", value: "", hasTva: true },
  { label: "", value: "", hasTva: true },
  { label: "", value: "", hasTva: true },
];

type RowData = {
  inv: Invoice;
  products: string[];
  skus: string[];
  sumaFacturata: number;
  preturi: number[];
  costProductie: number[];
  totalCostProductie: number;
  profitComanda: number;
  reducere: number;
  transport: number;
  isStorno: boolean;
};

export default function ProfitabilitatePage({ config }: { config: ProfitabilitateConfig }) {
  const queryClient = useQueryClient();
  const fullConfig = useMemo(
    () => ({ ...config, spreadsheetId: config.spreadsheetId || SPREADSHEET_ID, range: config.range || RANGE }),
    [config]
  );

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [costs, setCosts] = useState<CostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tvaRate, setTvaRate] = useState<string>("19");
  const [cheltuieli, setCheltuieli] = useState<{ label: string; value: string; hasTva?: boolean }[]>(DEFAULT_CHELTUIELI);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageContentRef = useRef<HTMLDivElement>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [inv, cst] = await Promise.all([
        fetchInvoicesForPeriod(fullConfig),
        fetchCostsForPeriod(fullConfig, { force: true }),
      ]);
      const filtered = (inv || []).filter((i) => {
        const d = i.issueDate || "";
        return d >= fullConfig.from && d <= fullConfig.to;
      });
      setInvoices(filtered);
      setCosts(cst || []);
      toast.success("Date reîmprospătate din Google Sheets");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eroare la reîmprospătare");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveCheltuieli = async () => {
    const ok = await saveCheltuieli(fullConfig.storageKey, { tvaRate, cheltuieli });
    if (ok) {
      setSavedMessage("Salvat!");
      setTimeout(() => setSavedMessage(null), 2000);
      queryClient.invalidateQueries({ queryKey: ["profitabilitate-summary"] });
    } else {
      toast.error("Eroare la salvare. Verifică că serverul rulează.");
    }
  };

  const handleExportPdf = async () => {
    if (!pageContentRef.current) return;
    setIsExportingPdf(true);
    try {
      await exportPageToPdf(pageContentRef.current, fullConfig.pdfFilename);
      toast.success("PDF generat cu succes");
    } catch (err) {
      console.error("Export PDF failed:", err);
      const msg =
        err instanceof Error ? err.message : "Eroare la generarea PDF";
      toast.error(msg.length > 120 ? `${msg.slice(0, 120)}…` : msg);
    } finally {
      setIsExportingPdf(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      fetchInvoicesForPeriod(fullConfig),
      fetchCostsForPeriod(fullConfig),
      fetchCheltuieli(fullConfig.storageKey),
    ])
      .then(([inv, cst, chelt]) => {
        if (cancelled) return;
        const filtered = (inv || []).filter((i) => {
          const d = i.issueDate || "";
          return d >= fullConfig.from && d <= fullConfig.to;
        });
        setInvoices(filtered);
        setCosts(cst || []);
        setTvaRate(chelt.tvaRate ?? "19");
        if (Array.isArray(chelt.cheltuieli) && chelt.cheltuieli.length > 0) {
          setCheltuieli(chelt.cheltuieli.map((c) => ({ ...c, hasTva: c.hasTva !== false })));
        } else {
          // Migrare: dacă există date în localStorage, le salvăm pe server
          try {
            const raw = localStorage.getItem(fullConfig.storageKey);
            if (raw) {
              const parsed = JSON.parse(raw) as { tvaRate?: string; cheltuieli?: { label: string; value: string; hasTva?: boolean }[] };
              if (Array.isArray(parsed?.cheltuieli) && parsed.cheltuieli.length > 0) {
                saveCheltuieli(fullConfig.storageKey, {
                  tvaRate: parsed.tvaRate ?? "19",
                  cheltuieli: parsed.cheltuieli.map((c) => ({ ...c, hasTva: c.hasTva !== false })),
                }).then((ok) => {
                  if (ok && !cancelled) {
                    setTvaRate(parsed.tvaRate ?? "19");
                    setCheltuieli(parsed.cheltuieli!.map((c) => ({ ...c, hasTva: c.hasTva !== false })));
                  }
                });
              }
            }
          } catch {
            /* ignoră */
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fullConfig.storageKey, fullConfig.from, fullConfig.to]);

  const costBySku = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of costs) {
      const sku = (c?.sku ?? "").toString().trim();
      if (sku) map[sku] = Number(c?.cost) || 0;
    }
    return map;
  }, [costs]);

  const rows = useMemo((): RowData[] => {
    return (invoices || []).filter(Boolean).map((inv) => {
      const products: string[] = [];
      const skus: string[] = [];
      const preturi: number[] = [];
      const costProductie: number[] = [];
      let reducere = 0;
      let transport = 0;
      let totalCostProductie = 0;

      for (const p of inv?.products || []) {
        if (isTransportOrShipping(p)) {
          const qty = parseFloat(p.quantity || "0") || 0;
          const price = parseFloat(p.price || "0") || 0;
          transport += qty * price;
          continue;
        }
        if (isDiscountOrReducere(p)) {
          reducere += p.discount ?? 0;
          continue;
        }
        const sku = (p.code || "").trim();
        const qty = parseFloat(p.quantity || "0") || 0;
        const cost = costBySku[sku] ?? 0;
        products.push(formatProduct(p));
        skus.push(sku || "—");
        preturi.push(parseFloat(p.price || "0") || 0);
        costProductie.push(cost);
        totalCostProductie += qty * cost;
      }

      const sumaFacturata = parseFloat(String(inv?.total || "0").replace(",", ".")) || 0;
      const profitComanda = sumaFacturata < 0 ? sumaFacturata : sumaFacturata - totalCostProductie;
      const isStorno = inv?.storno === "1" || inv?.canceled === "1" || sumaFacturata < 0;
      return {
        inv,
        products,
        skus,
        sumaFacturata,
        preturi,
        costProductie,
        totalCostProductie,
        profitComanda,
        reducere,
        transport,
        isStorno,
      };
    });
  }, [invoices, costBySku]);

  // Total Suma Facturată (net) = sumă toate facturile (inclusiv storno negative)
  const totalSumaFacturataNet = useMemo(
    () => rows.reduce((s, r) => s + r.sumaFacturata, 0),
    [rows]
  );

  // Suma facturilor stornate = doar facturile cu minus (valoare negativă)
  const sumaDocumenteStorno = useMemo(
    () => rows.filter((r) => r.sumaFacturata < 0).reduce((s, r) => s + r.sumaFacturata, 0),
    [rows]
  );

  // Total Fără Storno = Net + |Suma storno| = suma doar facturilor pozitive (fără documentele storno)
  // Formula: Net - sumaDocumenteStorno (sumaDocumenteStorno e negativă, deci Net - neg = Net + pozitiv)
  const totalSumaFacturataFaraStorno = useMemo(
    () => totalSumaFacturataNet - sumaDocumenteStorno,
    [totalSumaFacturataNet, sumaDocumenteStorno]
  );

  const handleSyncOblio = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/oblio/sync-invoices?force=1", { method: "POST" });
      const data = await res.json();
      if (data?.ok) {
        const [inv] = await Promise.all([fetchInvoicesForPeriod(fullConfig)]);
        const filtered = (inv || []).filter((i) => {
          const d = i.issueDate || "";
          return d >= fullConfig.from && d <= fullConfig.to;
        });
        setInvoices(filtered);
        toast.success(data.message || "Facturi sincronizate cu Oblio");
        queryClient.invalidateQueries({ queryKey: ["profitabilitate-summary"] });
      } else {
        toast.error(data?.error || "Eroare la sincronizare");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eroare la sincronizare");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700 text-white">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800">{fullConfig.title}</h1>
                <p className="text-sm text-slate-500">{fullConfig.subtitle}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncOblio}
                disabled={isRefreshing || isLoading || !!error}
                title="Sincronizează facturile din Oblio (actualizează cache-ul local)"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizează Oblio
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading || !!error}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reîmprospătare
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExportingPdf || isLoading || !!error}
                title="Exportă rezumatul, cheltuielile și profitul final — fără tabelul cu facturi"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                Salvează PDF
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/invoices">Facturi</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">Acasă</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 py-4 flex flex-col flex-1">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-slate-500" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 text-red-800">
            <p className="font-medium">Eroare</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-xl">
            {/* Doar această zonă merge în PDF (rezumat + cheltuieli + profit final), fără tabelul facturilor */}
            <div ref={pageContentRef} className="shrink-0 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="font-semibold text-slate-800">{fullConfig.facturiLabel}</h2>
              <div className="mt-2 flex flex-wrap gap-6 text-sm">
                <span className="text-slate-500">{invoices.length} facturi ({fullConfig.dateRangeLabel})</span>
                <span className="text-slate-400 text-xs">
                  Dacă totalul nu se potrivește cu Oblio, apasă „Sincronizează Oblio”.
                </span>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Suma Facturată (net)</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">
                    {totalSumaFacturataNet.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">cu storno inclus</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total fără storno</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">
                    {totalSumaFacturataFaraStorno.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Net + Suma stornate (doar facturi pozitive)</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Suma Facturilor Stornate sau anulate</p>
                  <p className={`mt-1 text-lg font-semibold ${sumaDocumenteStorno >= 0 ? "text-slate-800" : "text-red-600"}`}>
                    {sumaDocumenteStorno.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">facturi cu minus</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">TVA din Suma Facturată</p>
                  <p className="mt-1 text-lg font-semibold text-slate-700">
                    {(() => {
                      const rate = parseFloat(tvaRate) || 0;
                      const tva = rate > 0 && totalSumaFacturataNet > 0 ? totalSumaFacturataNet * rate / (100 + rate) : 0;
                      return `${tva.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON`;
                    })()}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">({tvaRate}% TVA)</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Cost Producție</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">
                    {rows.reduce((s, r) => s + r.totalCostProductie, 0).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Profit Total Comenzi</p>
                  <p className={`mt-1 text-lg font-semibold ${rows.reduce((s, r) => s + r.profitComanda, 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {rows.reduce((s, r) => s + r.profitComanda, 0).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Cheltuieli</h3>
                <div className="mb-4 flex items-center gap-3">
                  <Label htmlFor="tva-rate" className="text-sm text-slate-600">TVA %</Label>
                  <Input
                    id="tva-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="19"
                    value={tvaRate}
                    onChange={(e) => setTvaRate(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-xs text-slate-500">(procent pentru calcul TVA din cheltuieli)</span>
                </div>
                <div className="flex flex-col gap-3">
                  {cheltuieli.map((c, i) => {
                    const amount = parseFloat(c.value) || 0;
                    const rate = parseFloat(tvaRate) || 0;
                    const hasTva = c.hasTva !== false;
                    const tva = hasTva && rate > 0 && amount > 0 ? amount * rate / (100 + rate) : 0;
                    return (
                      <div key={i} className="flex flex-col sm:flex-row gap-2 sm:items-end border-b border-amber-100 pb-3 last:border-0 last:pb-0">
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={`chelt-name-${i}`} className="text-xs text-slate-600">Denumire cheltuială</Label>
                          <Input
                            id={`chelt-name-${i}`}
                            type="text"
                            placeholder="ex. Chirie, Utilități..."
                            value={c.label}
                            onChange={(e) => {
                              const next = [...cheltuieli];
                              next[i] = { ...next[i], label: e.target.value };
                              setCheltuieli(next);
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div className="w-full sm:w-32">
                          <Label htmlFor={`chelt-${i}`} className="text-xs text-slate-600">Sumă (RON)</Label>
                          <Input
                            id={`chelt-${i}`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={c.value}
                            onChange={(e) => {
                              const next = [...cheltuieli];
                              next[i] = { ...next[i], value: e.target.value };
                              setCheltuieli(next);
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-center gap-2 sm:self-end sm:pb-1">
                          <Checkbox
                            id={`chelt-tva-${i}`}
                            checked={hasTva}
                            onCheckedChange={(checked) => {
                              const next = [...cheltuieli];
                              next[i] = { ...next[i], hasTva: checked !== false };
                              setCheltuieli(next);
                            }}
                          />
                          <Label htmlFor={`chelt-tva-${i}`} className="text-xs text-slate-600 cursor-pointer">Are TVA</Label>
                        </div>
                        <div className="w-full sm:w-32">
                          <Label className="text-xs text-slate-600">TVA (RON)</Label>
                          <div className={`mt-1 h-10 rounded-md border px-3 py-2 text-sm font-medium ${hasTva ? "border-input bg-muted text-slate-700" : "border-slate-200 bg-slate-100 text-slate-400"}`}>
                            {tva.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON
                          </div>
                        </div>
                        {cheltuieli.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setCheltuieli(cheltuieli.filter((_, j) => j !== i))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCheltuieli([...cheltuieli, { label: "", value: "", hasTva: true }])}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adaugă cheltuieli
                  </Button>
                  <Button type="button" size="sm" onClick={handleSaveCheltuieli}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvează cheltuieli
                  </Button>
                  {savedMessage && <span className="text-sm text-emerald-600 font-medium">{savedMessage}</span>}
                </div>
              </div>
              <div className="mt-4">
                <div className="rounded-lg border-2 border-slate-300 bg-slate-50 px-4 py-3 shadow-sm">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Profit Final</p>
                  <p className="mt-1 text-xl font-bold text-slate-800">
                    {(() => {
                      const totalSuma = totalSumaFacturataNet;
                      const rate = parseFloat(tvaRate) || 0;
                      const tvaDinSuma = rate > 0 && totalSuma > 0 ? totalSuma * rate / (100 + rate) : 0;
                      const totalCost = rows.reduce((s, r) => s + r.totalCostProductie, 0);
                      const sumaCheltuieli = cheltuieli.reduce((s, c) => s + (parseFloat(c.value) || 0), 0);
                      const sumaTvaCheltuieli = cheltuieli.reduce((s, c) => {
                        if (c.hasTva === false) return s;
                        const amt = parseFloat(c.value) || 0;
                        return s + (rate > 0 && amt > 0 ? amt * rate / (100 + rate) : 0);
                      }, 0);
                      const profitFinal = totalSuma - tvaDinSuma - totalCost - sumaCheltuieli + sumaTvaCheltuieli;
                      return (
                        <span className={profitFinal >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {profitFinal.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON
                        </span>
                      );
                    })()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Suma Facturată − TVA Facturată − Cost Producție − Cheltuieli + TVA Cheltuieli
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[900px] border-collapse">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2 border-slate-300">
                    <TableHead className="w-[70px] py-4 font-semibold border border-slate-200 bg-slate-100">Serie</TableHead>
                    <TableHead className="w-[100px] py-4 font-semibold border border-slate-200 bg-slate-100">Număr</TableHead>
                    <TableHead className="w-[110px] py-4 font-semibold text-right border border-slate-200 bg-slate-100">Suma facturată</TableHead>
                    <TableHead className="w-[100px] py-4 font-semibold border border-slate-200 bg-slate-100">SKU</TableHead>
                    <TableHead className="min-w-[180px] py-4 font-semibold border border-slate-200 bg-slate-100">Produse vândute</TableHead>
                    <TableHead className="w-[120px] py-4 font-semibold text-right border border-slate-200 bg-slate-100">Preț produs</TableHead>
                    <TableHead className="w-[110px] py-4 font-semibold text-right border border-slate-200 bg-slate-100">Preț producție</TableHead>
                    <TableHead className="w-[110px] py-4 font-semibold text-right border border-slate-200 bg-slate-100">Profit comandă</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-slate-500 border border-slate-200">
                        {fullConfig.emptyMessage}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {rows.map(({ inv, products, skus, sumaFacturata, preturi, costProductie, profitComanda, isStorno }, idx) => (
                        <TableRow
                          key={inv?.id ?? `row-${idx}`}
                          className={`border-b border-slate-200 ${isStorno ? "bg-amber-50/90 hover:bg-amber-100/90 border-l-4 border-l-amber-400" : "hover:bg-slate-50/80"}`}
                        >
                          <TableCell className="font-medium py-3 align-top border border-slate-200">{inv.seriesName || "—"}</TableCell>
                          <TableCell className="font-mono py-3 align-top border border-slate-200">{inv.number}</TableCell>
                          <TableCell className="text-right py-3 align-top border border-slate-200">
                            {sumaFacturata !== 0 ? `${sumaFacturata.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON` : "—"}
                          </TableCell>
                          <TableCell className="py-3 align-top font-mono text-sm border border-slate-200">
                            {skus.length === 0 ? <span className="text-slate-400">—</span> : (
                              <ul className="list-none space-y-1 text-sm font-mono">
                                {skus.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                            )}
                          </TableCell>
                          <TableCell className="py-3 align-top border border-slate-200">
                            {products.length === 0 ? <span className="text-slate-400">—</span> : (
                              <ul className="list-disc list-inside space-y-0.5 text-sm leading-relaxed">
                                {products.map((p, i) => <li key={i}>{p}</li>)}
                              </ul>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-3 align-top border border-slate-200">
                            {preturi.length === 0 ? <span className="text-slate-400">—</span> : (
                              <ul className="list-none space-y-1 text-sm text-right">
                                {preturi.map((pr, i) => (
                                  <li key={i}>{pr.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON</li>
                                ))}
                              </ul>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-3 align-top border border-slate-200">
                            {costProductie.length === 0 ? <span className="text-slate-400">—</span> : (
                              <ul className="list-none space-y-1 text-sm text-right">
                                {costProductie.map((c, i) => (
                                  <li key={i}>{c > 0 ? `${c.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON` : "—"}</li>
                                ))}
                              </ul>
                            )}
                          </TableCell>
                          <TableCell className="text-right py-3 align-top border border-slate-200">
                            <span className={profitComanda >= 0 ? "text-emerald-600" : "text-red-600"}>
                              {profitComanda.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-200/60 font-semibold border-t-2 border-slate-300">
                        <TableCell colSpan={2} className="text-right py-4 border border-slate-200">Total</TableCell>
                        <TableCell className="text-right py-4 border border-slate-200">
                          {totalSumaFacturataNet.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON
                        </TableCell>
                        <TableCell colSpan={4} className="py-4 border border-slate-200" />
                        <TableCell className="text-right py-4 border border-slate-200">
                          <span className={rows.reduce((s, r) => s + r.profitComanda, 0) >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                            {rows.reduce((s, r) => s + r.profitComanda, 0).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON
                          </span>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
