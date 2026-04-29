import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2025-04-01",
  to: "2025-04-30",
  title: "Profitabilitate Aprilie 2025",
  subtitle: "Doar facturi din luna aprilie 2025",
  facturiLabel: "Facturi Aprilie 2025",
  emptyMessage: "Nu există facturi pentru aprilie 2025.",
  dateRangeLabel: "1–30 apr 2025",
  pdfFilename: "Profitabilitate-Aprilie-2025.pdf",
  storageKey: "profitabilitate-apr-2025-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateApr2025() {
  return <ProfitabilitatePage config={CONFIG} />;
}
