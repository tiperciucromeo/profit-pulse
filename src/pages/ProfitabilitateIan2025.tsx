import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2025-01-01",
  to: "2025-01-31",
  title: "Profitabilitate Ianuarie 2025",
  subtitle: "Doar facturi din luna ianuarie 2025",
  facturiLabel: "Facturi Ianuarie 2025",
  emptyMessage: "Nu există facturi pentru ianuarie 2025.",
  dateRangeLabel: "1–31 ian 2025",
  pdfFilename: "Profitabilitate-Ianuarie-2025.pdf",
  storageKey: "profitabilitate-ian-2025-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateIan2025() {
  return <ProfitabilitatePage config={CONFIG} />;
}
