import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2025-07-01",
  to: "2025-07-31",
  title: "Profitabilitate Iulie 2025",
  subtitle: "Doar facturi din luna iulie 2025",
  facturiLabel: "Facturi Iulie 2025",
  emptyMessage: "Nu există facturi pentru iulie 2025.",
  dateRangeLabel: "1–31 iul 2025",
  pdfFilename: "Profitabilitate-Iulie-2025.pdf",
  storageKey: "profitabilitate-iul-2025-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateJul2025() {
  return <ProfitabilitatePage config={CONFIG} />;
}
