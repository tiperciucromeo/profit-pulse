import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Sheet, ChevronDown, Loader2, RefreshCw, TrendingUp } from "lucide-react";

/** Suma Profit Final din fiecare pagină de profitabilitate – folosește API-ul serverului. */
async function fetchProfitSummary(): Promise<{ profitFinalTotal: number }> {
  const res = await fetch("/api/profitabilitate/summary");
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) return { profitFinalTotal: 0 };
  const val = Number(data.profitFinalTotal);
  return { profitFinalTotal: Number.isFinite(val) ? val : 0 };
}

const PROFITABILITATE_LUNI = [
  { path: "/profitabilitate-sept-2024", label: "Septembrie 2024" },
  { path: "/profitabilitate-oct-2024", label: "Octombrie 2024" },
  { path: "/profitabilitate-nov-2024", label: "Noiembrie 2024" },
  { path: "/profitabilitate-dec-2024", label: "Decembrie 2024" },
  { path: "/profitabilitate-ian-2025", label: "Ianuarie 2025" },
  { path: "/profitabilitate-feb-2025", label: "Februarie 2025" },
  { path: "/profitabilitate-mar-2025", label: "Martie 2025" },
  { path: "/profitabilitate-apr-2025", label: "Aprilie 2025" },
  { path: "/profitabilitate-mai-2025", label: "Mai 2025" },
  { path: "/profitabilitate-jun-2025", label: "Iunie 2025" },
  { path: "/profitabilitate-jul-2025", label: "Iulie 2025" },
  { path: "/profitabilitate-aug-2025", label: "August 2025" },
  { path: "/profitabilitate-sept-2025", label: "Septembrie 2025" },
  { path: "/profitabilitate-oct-2025", label: "Octombrie 2025" },
  { path: "/profitabilitate-nov-2025", label: "Noiembrie 2025" },
  { path: "/profitabilitate-dec-2025", label: "Decembrie 2025" },
  { path: "/profitabilitate-ian-2026", label: "Ianuarie 2026" },
  { path: "/profitabilitate-feb-2026", label: "Februarie 2026" },
  { path: "/profitabilitate-mar-2026", label: "Martie 2026" },
];

export default function Index() {
  const {
    data: summary,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["profitabilitate-summary"],
    queryFn: fetchProfitSummary,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });

  const profitTotal = summary?.profitFinalTotal ?? 0;

  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="container mx-auto px-6 py-8 max-w-2xl w-full">
        {/* Caseta Profit Final Total */}
        <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Profit Final Total (toate lunile)
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                title="Reîmprospătare"
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Se calculează...
              </div>
            ) : (
              <p
                className={`text-3xl font-bold ${
                  profitTotal >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {profitTotal.toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Se recalculează automat când revii pe pagină sau la modificări în lunile de profitabilitate.
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            Bine ai venit în Profit Pulse
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Gestionează facturile Oblio, costurile de producție și rapoartele de profitabilitate lunare.
            Folosește meniul de sus pentru navigare.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" className="gap-2">
                <FileText className="h-5 w-5" />
                Profitabilitate
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56 max-h-80 overflow-y-auto">
              {PROFITABILITATE_LUNI.map(({ path, label }) => (
                <DropdownMenuItem key={path} asChild>
                  <Link to={path}>{label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="lg" variant="outline" asChild>
            <Link to="/invoices">
              <FileText className="h-5 w-5 mr-2" />
              Facturi ONL
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/sheets">
              <Sheet className="h-5 w-5 mr-2" />
              Costuri Producție
            </Link>
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
