# Frontend

## Rutare (`src/App.tsx`)

| Rută | Componentă | Descriere |
|------|------------|-----------|
| `/` | Index | Pagina principală, profit total, linkuri |
| `/invoices` | InvoicesPage | Facturi ONL |
| `/sheets` | GoogleSheetsPage | Costuri producție (Google Sheet) |
| `/profitabilitate-sept-2024` ... `/profitabilitate-mar-2026` | Profitabilitate* | Pagini profitabilitate pe lună |
| `*` | NotFound | 404 |

## Pagini principale

### Index
- Afișează **Profit Final Total** (toate lunile) din `GET /api/profitabilitate/summary`
- Butoane: Profitabilitate (dropdown luni), Facturi ONL, Costuri Producție

### Profitabilitate (orice lună)
- Componenta comună: `ProfitabilitatePage.tsx`
- Config per lună: `from`, `to`, `title`, `storageKey`, `pdfFilename` etc.
- Conținut: carduri KPI, tabel facturi+produse, secțiune cheltuieli, export PDF

### InvoicesPage
- Afișează facturile din `/api/invoices` (cu filtre)

### GoogleSheetsPage
- Afișează costurile din Google Sheets (`/api/sheets/costs`)

## Componente cheie

| Componentă | Rol |
|------------|-----|
| `Layout` | Wrapper cu `AppHeader` + `<Outlet />` |
| `AppHeader` | Logo, meniu Profitabilitate (dropdown), Facturi ONL, Costuri |
| `ProfitabilitatePage` | Pagină profitabilitate: fetch, calcule, tabel, cheltuieli, PDF |

## Librării

| Fișier | Rol |
|-------|-----|
| `api.ts` | `parseJsonResponse()` – parse JSON cu mesaj clar dacă backend e oprit |
| `profitabilitate.ts` | `fetchInvoicesForPeriod`, `fetchCheltuieli`, `saveCheltuieli`, tipuri |
| `profitabilitateCalcule.ts` | `calcTotalNet`, `calcProfitFinal`, `calcTvaDinSuma` |
| `pdfExport.ts` | `exportPageToPdf()` – export div în PDF |

## UI

- **shadcn/ui** în `src/components/ui/` (Button, Card, Table, Input etc.)
- **Tailwind CSS** pentru stiluri
- **Lucide** pentru iconițe

## Port

Vite rulează pe **8080** (config în `vite.config.ts`).
