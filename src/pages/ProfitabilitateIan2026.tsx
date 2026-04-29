import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2026-01-01",
  to: "2026-01-31",
  title: "Profitabilitate Ianuarie 2026",
  subtitle: "Doar facturi din luna ianuarie 2026",
  facturiLabel: "Facturi Ianuarie 2026",
  emptyMessage: "Nu există facturi pentru ianuarie 2026.",
  dateRangeLabel: "1–31 ian 2026",
  pdfFilename: "Profitabilitate-Ianuarie-2026.pdf",
  storageKey: "profitabilitate-ian-2026-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateIan2026() {
  return <ProfitabilitatePage config={CONFIG} />;
}
