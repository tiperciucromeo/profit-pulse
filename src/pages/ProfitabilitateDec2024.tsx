import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2024-12-01",
  to: "2024-12-31",
  title: "Profitabilitate Decembrie 2024",
  subtitle: "Doar facturi din luna decembrie 2024",
  facturiLabel: "Facturi Decembrie 2024",
  emptyMessage: "Nu există facturi pentru decembrie 2024.",
  dateRangeLabel: "1–31 dec 2024",
  pdfFilename: "Profitabilitate-Decembrie-2024.pdf",
  storageKey: "profitabilitate-dec-2024-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateDec2024() {
  return <ProfitabilitatePage config={CONFIG} />;
}
