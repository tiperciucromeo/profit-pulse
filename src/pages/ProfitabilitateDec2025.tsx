import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2025-12-01",
  to: "2025-12-31",
  title: "Profitabilitate Decembrie 2025",
  subtitle: "Doar facturi din luna decembrie 2025",
  facturiLabel: "Facturi Decembrie 2025",
  emptyMessage: "Nu există facturi pentru decembrie 2025.",
  dateRangeLabel: "1–31 dec 2025",
  pdfFilename: "Profitabilitate-Decembrie-2025.pdf",
  storageKey: "profitabilitate-dec-2025-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateDec2025() {
  return <ProfitabilitatePage config={CONFIG} />;
}
