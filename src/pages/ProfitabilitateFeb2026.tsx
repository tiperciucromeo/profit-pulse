import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2026-02-01",
  to: "2026-02-28",
  title: "Profitabilitate Februarie 2026",
  subtitle: "Doar facturi din luna februarie 2026",
  facturiLabel: "Facturi Februarie 2026",
  emptyMessage: "Nu există facturi pentru februarie 2026.",
  dateRangeLabel: "1–28 feb 2026",
  pdfFilename: "Profitabilitate-Februarie-2026.pdf",
  storageKey: "profitabilitate-feb-2026-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateFeb2026() {
  return <ProfitabilitatePage config={CONFIG} />;
}
