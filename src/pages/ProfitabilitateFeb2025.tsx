import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2025-02-01",
  to: "2025-02-28",
  title: "Profitabilitate Februarie 2025",
  subtitle: "Doar facturi din luna februarie 2025",
  facturiLabel: "Facturi Februarie 2025",
  emptyMessage: "Nu există facturi pentru februarie 2025.",
  dateRangeLabel: "1–28 feb 2025",
  pdfFilename: "Profitabilitate-Februarie-2025.pdf",
  storageKey: "profitabilitate-feb-2025-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateFeb2025() {
  return <ProfitabilitatePage config={CONFIG} />;
}
