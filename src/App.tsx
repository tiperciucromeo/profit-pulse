import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import InvoicesPage from "./pages/InvoicesPage";
import GoogleSheetsPage from "./pages/GoogleSheetsPage";
import ProfitabilitateSept2024 from "./pages/ProfitabilitateSept2024";
import ProfitabilitateFeb2025 from "./pages/ProfitabilitateFeb2025";
import ProfitabilitateIan2025 from "./pages/ProfitabilitateIan2025";
import ProfitabilitateDec2024 from "./pages/ProfitabilitateDec2024";
import ProfitabilitateNov2024 from "./pages/ProfitabilitateNov2024";
import ProfitabilitateOct2024 from "./pages/ProfitabilitateOct2024";
import ProfitabilitateMar2025 from "./pages/ProfitabilitateMar2025";
import ProfitabilitateApr2025 from "./pages/ProfitabilitateApr2025";
import ProfitabilitateMai2025 from "./pages/ProfitabilitateMai2025";
import ProfitabilitateJun2025 from "./pages/ProfitabilitateJun2025";
import ProfitabilitateJul2025 from "./pages/ProfitabilitateJul2025";
import ProfitabilitateAug2025 from "./pages/ProfitabilitateAug2025";
import ProfitabilitateOct2025 from "./pages/ProfitabilitateOct2025";
import ProfitabilitateSept2025 from "./pages/ProfitabilitateSept2025";
import ProfitabilitateNov2025 from "./pages/ProfitabilitateNov2025";
import ProfitabilitateDec2025 from "./pages/ProfitabilitateDec2025";
import ProfitabilitateIan2026 from "./pages/ProfitabilitateIan2026";
import ProfitabilitateFeb2026 from "./pages/ProfitabilitateFeb2026";
import ProfitabilitateMar2026 from "./pages/ProfitabilitateMar2026";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/sheets" element={<GoogleSheetsPage />} />
          <Route path="/profitabilitate-sept-2024" element={<ProfitabilitateSept2024 />} />
          <Route path="/profitabilitate-feb-2025" element={<ProfitabilitateFeb2025 />} />
          <Route path="/profitabilitate-ian-2025" element={<ProfitabilitateIan2025 />} />
          <Route path="/profitabilitate-dec-2024" element={<ProfitabilitateDec2024 />} />
          <Route path="/profitabilitate-nov-2024" element={<ProfitabilitateNov2024 />} />
          <Route path="/profitabilitate-oct-2024" element={<ProfitabilitateOct2024 />} />
          <Route path="/profitabilitate-mar-2025" element={<ProfitabilitateMar2025 />} />
          <Route path="/profitabilitate-apr-2025" element={<ProfitabilitateApr2025 />} />
          <Route path="/profitabilitate-mai-2025" element={<ProfitabilitateMai2025 />} />
          <Route path="/profitabilitate-jun-2025" element={<ProfitabilitateJun2025 />} />
          <Route path="/profitabilitate-jul-2025" element={<ProfitabilitateJul2025 />} />
          <Route path="/profitabilitate-aug-2025" element={<ProfitabilitateAug2025 />} />
          <Route path="/profitabilitate-oct-2025" element={<ProfitabilitateOct2025 />} />
          <Route path="/profitabilitate-sept-2025" element={<ProfitabilitateSept2025 />} />
          <Route path="/profitabilitate-nov-2025" element={<ProfitabilitateNov2025 />} />
          <Route path="/profitabilitate-dec-2025" element={<ProfitabilitateDec2025 />} />
          <Route path="/profitabilitate-ian-2026" element={<ProfitabilitateIan2026 />} />
            <Route path="/profitabilitate-feb-2026" element={<ProfitabilitateFeb2026 />} />
            <Route path="/profitabilitate-mar-2026" element={<ProfitabilitateMar2026 />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
