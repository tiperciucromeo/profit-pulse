import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2025-11-01",
  to: "2025-11-30",
  title: "Profitabilitate Noiembrie 2025",
  subtitle: "Doar facturi din luna noiembrie 2025",
  facturiLabel: "Facturi Noiembrie 2025",
  emptyMessage: "Nu există facturi pentru noiembrie 2025.",
  dateRangeLabel: "1–30 nov 2025",
  pdfFilename: "Profitabilitate-Noiembrie-2025.pdf",
  storageKey: "profitabilitate-nov-2025-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateNov2025() {
  return <ProfitabilitatePage config={CONFIG} />;
}
