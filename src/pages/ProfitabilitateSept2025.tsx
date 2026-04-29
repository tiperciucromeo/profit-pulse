import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2025-09-01",
  to: "2025-09-30",
  title: "Profitabilitate Septembrie 2025",
  subtitle: "Doar facturi din luna septembrie 2025",
  facturiLabel: "Facturi Septembrie 2025",
  emptyMessage: "Nu există facturi pentru septembrie 2025.",
  dateRangeLabel: "1–30 sep 2025",
  pdfFilename: "Profitabilitate-Septembrie-2025.pdf",
  storageKey: "profitabilitate-sept-2025-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateSept2025() {
  return <ProfitabilitatePage config={CONFIG} />;
}
