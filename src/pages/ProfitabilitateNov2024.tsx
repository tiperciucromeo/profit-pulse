import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2024-11-01",
  to: "2024-11-30",
  title: "Profitabilitate Noiembrie 2024",
  subtitle: "Doar facturi din luna noiembrie 2024",
  facturiLabel: "Facturi Noiembrie 2024",
  emptyMessage: "Nu există facturi pentru noiembrie 2024.",
  dateRangeLabel: "1–30 nov 2024",
  pdfFilename: "Profitabilitate-Noiembrie-2024.pdf",
  storageKey: "profitabilitate-nov-2024-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateNov2024() {
  return <ProfitabilitatePage config={CONFIG} />;
}
