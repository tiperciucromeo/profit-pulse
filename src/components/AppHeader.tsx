import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Sheet, ChevronDown } from "lucide-react";
import logoImg from "@/assets/logo.png";

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

export function AppHeader() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-3 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img
            src={logoImg}
            alt="Profit Pulse"
            className="h-10 w-10 object-contain"
          />
          <span className="text-xl font-bold text-foreground">Profit Pulse</span>
        </Link>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1.5">
                <FileText className="h-4 w-4" />
                Profitabilitate
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
              {PROFITABILITATE_LUNI.map(({ path, label }) => (
                <DropdownMenuItem key={path} asChild>
                  <Link to={path}>{label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" asChild>
            <Link to="/invoices" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Facturi ONL
            </Link>
          </Button>

          <Button variant="ghost" asChild>
            <Link to="/sheets" className="gap-1.5">
              <Sheet className="h-4 w-4" />
              Costuri Producție
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
