import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2024-09-01",
  to: "2024-09-30",
  title: "Profitabilitate Septembrie 2024",
  subtitle: "Doar facturi din luna septembrie 2024",
  facturiLabel: "Facturi Septembrie 2024",
  emptyMessage: "Nu există facturi pentru septembrie 2024.",
  dateRangeLabel: "1–30 sept 2024",
  pdfFilename: "Profitabilitate-Septembrie-2024.pdf",
  storageKey: "profitabilitate-sept-2024-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateSept2024() {
  return <ProfitabilitatePage config={CONFIG} />;
}
