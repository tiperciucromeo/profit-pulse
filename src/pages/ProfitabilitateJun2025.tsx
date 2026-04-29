import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2025-06-01",
  to: "2025-06-30",
  title: "Profitabilitate Iunie 2025",
  subtitle: "Doar facturi din luna iunie 2025",
  facturiLabel: "Facturi Iunie 2025",
  emptyMessage: "Nu există facturi pentru iunie 2025.",
  dateRangeLabel: "1–30 iun 2025",
  pdfFilename: "Profitabilitate-Iunie-2025.pdf",
  storageKey: "profitabilitate-iun-2025-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateJun2025() {
  return <ProfitabilitatePage config={CONFIG} />;
}
