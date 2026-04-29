import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2025-10-01",
  to: "2025-10-31",
  title: "Profitabilitate Octombrie 2025",
  subtitle: "Doar facturi din luna octombrie 2025",
  facturiLabel: "Facturi Octombrie 2025",
  emptyMessage: "Nu există facturi pentru octombrie 2025.",
  dateRangeLabel: "1–31 oct 2025",
  pdfFilename: "Profitabilitate-Octombrie-2025.pdf",
  storageKey: "profitabilitate-oct-2025-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateOct2025() {
  return <ProfitabilitatePage config={CONFIG} />;
}
