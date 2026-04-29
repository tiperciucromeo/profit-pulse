import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2025-05-01",
  to: "2025-05-31",
  title: "Profitabilitate Mai 2025",
  subtitle: "Doar facturi din luna mai 2025",
  facturiLabel: "Facturi Mai 2025",
  emptyMessage: "Nu există facturi pentru mai 2025.",
  dateRangeLabel: "1–31 mai 2025",
  pdfFilename: "Profitabilitate-Mai-2025.pdf",
  storageKey: "profitabilitate-mai-2025-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateMai2025() {
  return <ProfitabilitatePage config={CONFIG} />;
}
