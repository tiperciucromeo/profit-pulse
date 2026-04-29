# Structura proiectului

## Arbore principal (fără node_modules, dist)

```
profit-pulse/
├── data/                      # Date persistente (nu e în Git)
│   ├── invoices_onl.json      # Facturi sincronizate din Oblio
│   ├── cheltuieli.json        # Cheltuieli per lună (TVA, liste)
│   ├── sheets_cache.json      # Cache Google Sheets (24h)
│   ├── costs.json             # (opțional) costuri backup
│   └── costs.example.json     # Exemplu structură costs
│
├── docs/                      # Documentație (acest folder)
│   ├── README.md
│   ├── 01-ARHITECTURA.md
│   ├── 02-STRUCTURA-PROIECT.md
│   ├── 03-API-BACKEND.md
│   ├── 04-FRONTEND.md
│   ├── 05-CONFIGURARE.md
│   └── 06-DEPLOYMENT.md
│
├── public/                    # Asset-uri statice
│   ├── logo.svg
│   └── logo.png
│
├── src/
│   ├── App.tsx                # Router, rutare pagini
│   ├── main.tsx               # Entry point React
│   ├── index.css              # Stiluri globale, Tailwind
│   │
│   ├── assets/                # Imagini, fonturi
│   │   └── logo.png
│   │
│   ├── components/
│   │   ├── AppHeader.tsx       # Header + meniu profitabilitate
│   │   ├── Layout.tsx         # Layout cu Outlet
│   │   ├── ProfitabilitatePage.tsx   # Pagină profitabilitate (reutilizabilă)
│   │   ├── dashboard/         # Componente dashboard (OrdersTable etc.)
│   │   └── ui/                # shadcn/ui (Button, Card, Table etc.)
│   │
│   ├── lib/
│   │   ├── api.ts             # parseJsonResponse, helpers
│   │   ├── profitabilitate.ts # fetchInvoices, fetchCheltuieli, tipuri
│   │   ├── profitabilitateCalcule.ts  # Formule: calcTotalNet, calcProfitFinal
│   │   └── pdfExport.ts       # exportPageToPdf (jsPDF + html2canvas)
│   │
│   ├── pages/
│   │   ├── Index.tsx          # Pagina principală (profit total, linkuri)
│   │   ├── InvoicesPage.tsx   # Facturi ONL
│   │   ├── GoogleSheetsPage.tsx  # Costuri producție (Sheet)
│   │   ├── NotFound.tsx       # 404
│   │   ├── ProfitabilitateSept2024.tsx ... ProfitabilitateMar2026.tsx
│   │   └── AttractorVisualizer.tsx  # (pagina secundară)
│   │
│   └── hooks/
│       └── useDashboardData.ts
│
├── server.mjs                 # Backend Express (API, Oblio, Sheets)
├── vite.config.ts             # Vite: port 8080, proxy /api → 4000
├── package.json
├── .env.example               # Template variabile mediu
├── .env                       # (local, nu se urcă pe Git)
├── .gitignore
└── README.md                  # README principal
```

## Unde găsești...

| Ce cauți | Unde este |
|----------|-----------|
| Rute aplicație | `src/App.tsx` |
| Meniu profitabilitate | `src/components/AppHeader.tsx`, `src/pages/Index.tsx` |
| Logică profitabilitate | `src/components/ProfitabilitatePage.tsx`, `src/lib/profitabilitate.ts` |
| Formule calcul | `src/lib/profitabilitateCalcule.ts` |
| API Oblio / Sheets | `server.mjs` |
| Perioade profitabilitate | `server.mjs` → `PROFITABILITATE_PERIODS` |
| Config pagină lună | ex. `src/pages/ProfitabilitateFeb2026.tsx` (CONFIG) |
| Costuri producție | Google Sheets (Sheet1!A2:C), cache în `data/sheets_cache.json` |
| Facturi | `data/invoices_onl.json` |
| Cheltuieli | `data/cheltuieli.json` (key = storageKey per lună) |

## Adăugare lună nouă de profitabilitate

1. **Creează** `src/pages/ProfitabilitateAbrYYYY.tsx` (ex. ProfitabilitateApr2026.tsx)
2. **Adaugă** import și rută în `src/App.tsx`
3. **Adaugă** în `PROFITABILITATE_LUNI` în `AppHeader.tsx` și `Index.tsx`
4. **Adaugă** în `PROFITABILITATE_PERIODS` în `server.mjs`
