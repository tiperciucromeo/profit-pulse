# Profit Pulse

Dashboard de **profitabilitate** pentru magazinul online **Gorgeaux.ro** – calculează profitul pe lună pe baza facturilor Oblio, costurilor de producție din Google Sheets și cheltuielilor introduse manual.

## Ce face aplicația

- **Facturi ONL** – sincronizare din Oblio API, vizualizare
- **Costuri producție** – citire din Google Sheets (SKU → cost/unitate)
- **Profitabilitate lunară** – Sept 2024 … Martie 2026
  - Sumă facturată, cost producție, profit comenzi
  - Cheltuieli (Emag, transport etc.) cu TVA
  - Profit final, export PDF
- **Profit final total** – agregare pe toate lunile

## Documentație completă

Documentația este organizată în folderul [`docs/`](./docs/):

| Document | Conținut |
|----------|----------|
| [docs/README.md](./docs/README.md) | Index documentație |
| [01-ARHITECTURA](./docs/01-ARHITECTURA.md) | Arhitectură, fluxuri, tehnologii |
| [02-STRUCTURA-PROIECT](./docs/02-STRUCTURA-PROIECT.md) | Structura fișierelor, unde găsești fiecare lucru |
| [03-API-BACKEND](./docs/03-API-BACKEND.md) | Endpoint-uri API |
| [04-FRONTEND](./docs/04-FRONTEND.md) | Pagini, componente, routing |
| [05-CONFIGURARE](./docs/05-CONFIGURARE.md) | Variabile mediu, Oblio, Google Sheets |
| [06-DEPLOYMENT](./docs/06-DEPLOYMENT.md) | Deployment, inclusiv **Google Cloud** |

## Quick Start

```bash
# 1. Clonează și instalează
git clone <url-repo>
cd profit-pulse
npm install

# 2. Configurare
cp .env.example .env
# Completează .env cu OBLIO_EMAIL, OBLIO_SECRET, OBLIO_CIF,
# GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_SPREADSHEET_ID

# 3. Pornește
npm run dev:fullstack
```

- **Frontend**: http://localhost:8080  
- **Backend API**: http://localhost:4000  

## Probleme frecvente

**Erori în consolă la `/api/...` (ECONNREFUSED, proxy error)**  
Aplicația are nevoie de **ambele** procese: Vite (8080) și Express (4000). Dacă rulezi `dev:fullstack` de două ori sau rămâne un proces vechi, portul 4000 poate fi ocupat: backend-ul nu pornește, dar frontend-ul da, iar API-ul nu răspunde.

- Oprește toate terminalele unde rulează `npm run dev` / `dev:fullstack` (Ctrl+C).
- Pornește din nou: `npm run dev:fullstack` — scriptul eliberează porturile **4000** și **8080** înainte de pornire.
- Verifică manual: în browser deschide `http://localhost:4000/health` — ar trebui să vezi `{"status":"ok"}`.

**Lipsește `.env`**  
Backend-ul necesită credențiale Oblio și Google Sheets pentru sincronizare și costuri. Copiază `.env.example` în `.env` și completează valorile.

## Tehnologii

- **Frontend**: React, Vite, TypeScript, shadcn/ui, Tailwind
- **Backend**: Node.js, Express
- **Externe**: Oblio API (facturi), Google Sheets API (costuri)

## Deployment pe Google Cloud

Da, poți hosta aplicația pe **Google Cloud** pe un server propriu (Compute Engine) sau serverless (Cloud Run). Ghid detaliat: [docs/06-DEPLOYMENT.md](./docs/06-DEPLOYMENT.md).
