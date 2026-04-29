import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2024-10-01",
  to: "2024-10-31",
  title: "Profitabilitate Octombrie 2024",
  subtitle: "Doar facturi din luna octombrie 2024",
  facturiLabel: "Facturi Octombrie 2024",
  emptyMessage: "Nu există facturi pentru octombrie 2024.",
  dateRangeLabel: "1–31 oct 2024",
  pdfFilename: "Profitabilitate-Octombrie-2024.pdf",
  storageKey: "profitabilitate-oct-2024-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateOct2024() {
  return <ProfitabilitatePage config={CONFIG} />;
}
