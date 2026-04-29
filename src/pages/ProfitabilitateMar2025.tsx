import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2025-03-01",
  to: "2025-03-31",
  title: "Profitabilitate Martie 2025",
  subtitle: "Doar facturi din luna martie 2025",
  facturiLabel: "Facturi Martie 2025",
  emptyMessage: "Nu există facturi pentru martie 2025.",
  dateRangeLabel: "1–31 mar 2025",
  pdfFilename: "Profitabilitate-Martie-2025.pdf",
  storageKey: "profitabilitate-mar-2025-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateMar2025() {
  return <ProfitabilitatePage config={CONFIG} />;
}
