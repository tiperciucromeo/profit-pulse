import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2026-03-01",
  to: "2026-03-31",
  title: "Profitabilitate Martie 2026",
  subtitle: "Doar facturi din luna martie 2026",
  facturiLabel: "Facturi Martie 2026",
  emptyMessage: "Nu există facturi pentru martie 2026.",
  dateRangeLabel: "1–31 mar 2026",
  pdfFilename: "Profitabilitate-Martie-2026.pdf",
  storageKey: "profitabilitate-mar-2026-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateMar2026() {
  return <ProfitabilitatePage config={CONFIG} />;
}
