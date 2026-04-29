import ProfitabilitatePage from "@/components/ProfitabilitatePage";

const CONFIG = {
  from: "2025-08-01",
  to: "2025-08-31",
  title: "Profitabilitate August 2025",
  subtitle: "Doar facturi din luna august 2025",
  facturiLabel: "Facturi August 2025",
  emptyMessage: "Nu există facturi pentru august 2025.",
  dateRangeLabel: "1–31 aug 2025",
  pdfFilename: "Profitabilitate-August-2025.pdf",
  storageKey: "profitabilitate-aug-2025-cheltuieli",
  spreadsheetId: "1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs",
  range: "Sheet1!A2:C",
};

export default function ProfitabilitateAug2025() {
  return <ProfitabilitatePage config={CONFIG} />;
}
