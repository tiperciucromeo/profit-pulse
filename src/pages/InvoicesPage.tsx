import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, CloudDownload, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api";

type OblioProduct = {
  item?: string;
  name: string;
  code?: string;
  description?: string;
  quantity?: string;
  measuringUnit?: string;
  price?: string;
  vatName?: string;
  vatPercentage?: string;
  vatIncluded?: string;
  management?: string | null;
  workStation?: string;
  discount?: number;
  discountType?: string;
  refItems?: string[];
};

type OblioClient = {
  clientId?: string;
  cif?: string;
  name?: string;
  rc?: string;
  code?: string;
  address?: string;
  state?: string;
  city?: string;
  country?: string;
  iban?: string;
  bank?: string;
  contact?: string;
  phone?: string;
  email?: string;
  vatPayer?: string;
};

type OblioInvoice = {
  id: string;
  number: string;
  seriesName: string;
  issueDate: string;
  dueDate?: string;
  total: string;
  currency?: string;
  canceled?: string;
  storno?: string;
  stornoed?: string;
  draft?: string;
  collected?: string;
  link?: string;
  einvoice?: string;
  type?: string;
  client?: OblioClient;
  products?: OblioProduct[];
  [key: string]: unknown;
};

type InvoicesSummary = {
  fetchedAt: string;
  seriesName: string;
  count: number;
  structure: Record<string, Record<string, number>>;
  monthlyTotals?: Record<string, number>;
  dailyTotals?: Record<string, Record<string, number>>;
};

async function fetchSummary(): Promise<InvoicesSummary> {
  // Încearcă summary (rapid); la 404 folosește /api/invoices și calculează structura
  const resSummary = await fetch("/api/invoices/summary");
  if (resSummary.ok) {
    return parseJsonResponse<InvoicesSummary>(resSummary);
  }
  if (resSummary.status === 404) {
    const resFull = await fetch("/api/invoices");
    if (!resFull.ok) {
      const err = await parseJsonResponse<{ error?: string }>(resFull);
      throw new Error(err.error || `HTTP ${resFull.status}`);
    }
    const data = await parseJsonResponse<{ invoices: OblioInvoice[]; fetchedAt?: string; seriesName?: string; count?: number }>(resFull);
    const invoices = data.invoices || [];
    const structure: Record<string, Record<string, number>> = {};
    const monthlyTotals: Record<string, number> = {};
    const dailyTotals: Record<string, Record<string, number>> = {};
    for (const inv of invoices) {
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
    return {
      fetchedAt: data.fetchedAt,
      seriesName: data.seriesName || "ONL",
      count: data.count ?? invoices.length,
      structure,
      monthlyTotals,
      dailyTotals,
    };
  }
  const err = await parseJsonResponse<{ error?: string }>(resSummary);
  throw new Error(err.error || `HTTP ${resSummary.status}`);
}

async function fetchInvoicesForDay(monthKey: string, dayKey: string): Promise<OblioInvoice[]> {
  const res = await fetch(`/api/invoices?month=${encodeURIComponent(monthKey)}&day=${encodeURIComponent(dayKey)}`);
  if (!res.ok) {
    const err = await parseJsonResponse<{ error?: string }>(res);
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await parseJsonResponse<{ invoices: OblioInvoice[] }>(res);
  return data.invoices || [];
}

function formatMonthKey(key: string): string {
  const [y, m] = key.split("-");
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1);
  return format(date, "MMMM yyyy", { locale: ro });
}

function formatDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return format(date, "EEEE, d MMMM", { locale: ro });
}

// Convertește structure din summary în Map sortat
function structureToMap(structure: Record<string, Record<string, number>>) {
  const entries = Object.entries(structure).sort((a, b) => b[0].localeCompare(a[0]));
  return new Map(
    entries.map(([monthKey, days]) => {
      const dayEntries = Object.entries(days).sort((a, b) => b[0].localeCompare(a[0]));
      return [monthKey, new Map(dayEntries.map(([k, v]) => [k, v]))] as const;
    })
  );
}

async function syncWithOblio(force = false) {
  const url = `/api/oblio/sync-invoices${force ? "?force=1" : ""}`;
  const res = await fetch(url, { method: "POST" });
  const data = await parseJsonResponse<{ error?: string; skipped?: boolean; message?: string; newCount?: number }>(res);
  if (!res.ok) throw new Error(data.error || "Eroare sincronizare");
  return data;
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["invoices-summary"],
    queryFn: fetchSummary,
    staleTime: 5 * 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: (force: boolean) => syncWithOblio(force),
    onSuccess: (result) => {
      const msg = result.skipped
        ? result.message
        : `${result.message}${result.newCount ? ` (${result.newCount} noi)` : ""}`;
      if (result.skipped) {
        toast.info(msg, {
          action: {
            label: "Forțează",
            onClick: () => syncMutation.mutate(true),
          },
        });
      } else {
        toast.success(msg);
      }
      queryClient.invalidateQueries({ queryKey: ["invoices-summary"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-day"] });
      queryClient.invalidateQueries({ queryKey: ["profitabilitate-summary"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Eroare sincronizare"),
  });

  const byMonthAndDay = useMemo(() => {
    if (!data?.structure) return new Map<string, Map<string, number>>();
    return structureToMap(data.structure);
  }, [data]);

  // Lazy: randăm facturile doar când ziua e deschisă
  const [openDayKeys, setOpenDayKeys] = useState<Set<string>>(new Set());

  const toggleDay = (monthKey: string, dayKey: string) => {
    const key = `${monthKey}|${dayKey}`;
    setOpenDayKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-center max-w-sm">
          Se încarcă facturile… La prima încărcare poate dura 10–30 secunde (mii de facturi).
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Eroare</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : String(error)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Asigură-te că serverul rulează și că ai preluat facturile (POST
              /api/oblio/fetch-invoices).
            </p>
            <Button onClick={() => refetch()}>Reîncearcă</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalInvoices = data?.count ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Facturi ONL
              </h1>
              <p className="text-sm text-muted-foreground">
                {totalInvoices} facturi • Actualizat{" "}
                {data?.fetchedAt
                  ? format(new Date(data.fetchedAt), "dd MMM yyyy, HH:mm", {
                      locale: ro,
                    })
                  : "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => syncMutation.mutate(false)}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudDownload className="h-4 w-4" />
                )}
                <span className="ml-2">Sincronizează Oblio</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Reîmprospătare</span>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sheets">Google Sheets</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">Acasă</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="by-month-day" className="w-full">
          <TabsList>
            <TabsTrigger value="by-month-day">
              Pe luni și zile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="by-month-day" className="mt-6">
            {byMonthAndDay.size === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                  <p className="text-muted-foreground">Nu există facturi locale.</p>
                  <p className="text-sm text-muted-foreground mt-2 mb-4">
                    Apasă butonul de mai jos pentru a prelua facturile din Oblio.
                  </p>
                  <Button
                    onClick={() => syncMutation.mutate(true)}
                    disabled={syncMutation.isPending}
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CloudDownload className="h-4 w-4 mr-2" />
                    )}
                    Preia facturile din Oblio
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Array.from(byMonthAndDay.entries()).map(([monthKey, byDay]) => {
                  const monthLabel = formatMonthKey(monthKey);
                  const daysInMonth = byDay.size;
                  const monthTotal = data?.monthlyTotals?.[monthKey] ?? 0;

                  return (
                    <Collapsible key={monthKey} defaultOpen={false} className="group">
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-5 w-5 transition-transform group-data-[state=open]:rotate-90" />
                              <CardTitle className="text-lg">
                                {monthLabel}
                              </CardTitle>
                              <span className="text-sm font-normal text-muted-foreground">
                                ({daysInMonth} zile)
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-medium text-muted-foreground block">
                                Total facturat
                              </span>
                              <span className="font-semibold">
                                {monthTotal.toLocaleString("ro-RO", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                RON
                              </span>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0 space-y-6">
                            {Array.from(byDay.entries()).map(([dayKey, count]) => {
                              const dayLabel = formatDayKey(dayKey);
                              const dayFullKey = `${monthKey}|${dayKey}`;
                              const isOpen = openDayKeys.has(dayFullKey);
                              const dayTotal = data?.dailyTotals?.[monthKey]?.[dayKey] ?? 0;

                              return (
                                <div key={dayKey} className="rounded-lg border bg-muted/30 overflow-hidden">
                                  <div
                                    className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => toggleDay(monthKey, dayKey)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === "Enter" && toggleDay(monthKey, dayKey)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <ChevronRight
                                        className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                                      />
                                      <span className="font-medium">{dayLabel}</span>
                                      <span className="text-sm text-muted-foreground">
                                        ({count} facturi)
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-medium text-muted-foreground block">
                                        Total facturat
                                      </span>
                                      <span className="font-semibold">
                                        {dayTotal.toLocaleString("ro-RO", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}{" "}
                                        RON
                                      </span>
                                    </div>
                                  </div>
                                  {isOpen && (
                                    <DayInvoicesContent monthKey={monthKey} dayKey={dayKey} />
                                  )}
                                </div>
                              );
                            })}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function DayInvoicesContent({ monthKey, dayKey }: { monthKey: string; dayKey: string }) {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices-day", monthKey, dayKey],
    queryFn: () => fetchInvoicesForDay(monthKey, dayKey),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="p-4 border-t flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Se încarcă facturile…
      </div>
    );
  }

  if (!invoices?.length) {
    return (
      <div className="p-4 border-t text-sm text-muted-foreground">
        Nu există facturi pentru această zi.
      </div>
    );
  }

  // Pentru debug: vezi în consola (F12) structura unei facturi
  if (invoices[0]) {
    console.log("Exemplu obiect factură (API Oblio):", invoices[0]);
  }

  return (
    <div className="p-4 pt-0 space-y-4 border-t">
      {invoices
        .sort((a, b) => (a.number || "").localeCompare(b.number || ""))
        .map((inv) => (
          <InvoiceDetailCard key={inv.id} invoice={inv} />
        ))}
    </div>
  );
}

function InvoiceDetailCard({ invoice }: { invoice: OblioInvoice }) {
  const isStorno = invoice.storno === "1" || invoice.canceled === "1";
  const total = parseFloat(invoice.total || "0");
  const c = invoice.client;

  return (
    <Card className={isStorno ? "opacity-70 border-amber-500/30" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-mono">
              ONL {invoice.number}
            </CardTitle>
            <CardDescription>
              {invoice.issueDate
                ? format(new Date(invoice.issueDate), "dd MMM yyyy", {
                    locale: ro,
                  })
                : "—"}
              {invoice.type && ` • ${invoice.type}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold ${
                total < 0 ? "text-destructive" : ""
              }`}
            >
              {total.toLocaleString("ro-RO", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              {invoice.currency || "RON"}
            </span>
            {invoice.link && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={invoice.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Client */}
        {c && (
          <div>
            <h4 className="font-semibold mb-2 text-muted-foreground">
              Client
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
              {c.name && <div><span className="text-muted-foreground">Nume:</span> {c.name}</div>}
              {c.cif && c.cif !== "-" && <div><span className="text-muted-foreground">CIF:</span> {c.cif}</div>}
              {c.address && <div><span className="text-muted-foreground">Adresă:</span> {c.address}</div>}
              {c.city && <div><span className="text-muted-foreground">Oraș:</span> {c.city}</div>}
              {c.state && <div><span className="text-muted-foreground">Județ:</span> {c.state}</div>}
              {c.country && <div><span className="text-muted-foreground">Țară:</span> {c.country}</div>}
              {c.email && <div><span className="text-muted-foreground">Email:</span> {c.email}</div>}
              {c.phone && <div><span className="text-muted-foreground">Telefon:</span> {c.phone}</div>}
              {c.contact && <div><span className="text-muted-foreground">Contact:</span> {c.contact}</div>}
            </div>
          </div>
        )}

        {/* Produse */}
        {invoice.products && invoice.products.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-muted-foreground">
              Produse / Linii
            </h4>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Denumire</TableHead>
                    <TableHead>Cod</TableHead>
                    <TableHead>Cant.</TableHead>
                    <TableHead>UM</TableHead>
                    <TableHead className="text-right">Preț</TableHead>
                    <TableHead>TVA</TableHead>
                    <TableHead>Gestiune</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.products.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {p.name}
                        {p.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {p.description}
                          </div>
                        )}
                        {p.discount !== undefined && (
                          <div className="text-xs text-amber-600 mt-0.5">
                            Discount: {p.discount} {p.discountType === "procentual" ? "%" : "RON"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.code || "—"}
                      </TableCell>
                      <TableCell>{p.quantity ?? "—"}</TableCell>
                      <TableCell>{p.measuringUnit ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {p.price
                          ? parseFloat(p.price).toLocaleString("ro-RO", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {p.vatName || ""}
                        {p.vatPercentage ? ` ${p.vatPercentage}%` : ""}
                      </TableCell>
                      <TableCell>
                        {p.management || "—"}
                        {p.workStation && ` / ${p.workStation}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
