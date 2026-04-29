# Arhitectura Profit Pulse

## Overview

Aplicația este **full-stack**:
- **Frontend**: React + Vite + TypeScript, UI cu shadcn/ui și Tailwind
- **Backend**: Node.js + Express (`server.mjs`)
- **Date**: JSON local (`data/`), Oblio API, Google Sheets API

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React (Vite)  │────▶│  Express API     │────▶│  Oblio API      │
│   localhost:8080│     │  localhost:4000  │     │  Facturi ONL    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
        │                         │
        │                         ├─────────────▶│  Google Sheets  │
        │                         │              │  Costuri prod.  │
        │                         │              └─────────────────┘
        │                         │
        │                         └─────────────▶│  data/          │
        │                                        │  invoices_onl   │
        │                                        │  cheltuieli     │
        │                                        │  sheets_cache   │
        └───────────────────────────────────────┘
```

## Fluxuri principale

### 1. Sincronizare facturi (Oblio → local)
1. Utilizatorul apasă „Sincronizează Oblio” pe o pagină de profitabilitate
2. Frontend face `POST /api/oblio/sync-invoices`
3. Backend verifică ultima sincronizare (max 1/24h fără `?force=1`)
4. Backend preia facturi noi din Oblio (OAuth 2.0)
5. Backend salvează în `data/invoices_onl.json`

### 2. Calcul profitabilitate (per lună)
1. Frontend încarcă facturi: `GET /api/invoices?from=...&to=...`
2. Frontend încarcă costuri: `GET /api/sheets/costs` (sau prin proxy)
3. Frontend încarcă cheltuieli: `GET /api/cheltuieli/:storageKey`
4. `profitabilitate.ts` + `profitabilitateCalcule.ts` calculează pe client:
   - Suma facturată, cost producție, profit comenzi
   - TVA din sumă, cheltuieli, profit final
5. Utilizatorul poate salva cheltuieli: `POST /api/cheltuieli/:storageKey`

### 3. Profit final agregat (toate lunile)
1. Pagina principală (`/`) face `GET /api/profitabilitate/summary`
2. Backend iterează `PROFITABILITATE_PERIODS`, calculează profit final per lună
3. Sumează și returnează `profitFinalTotal`

## Tehnologii

| Strat | Tehnologie |
|-------|------------|
| Frontend | React 18, Vite 5, TypeScript, React Router 6 |
| UI | shadcn/ui (Radix), Tailwind CSS, Lucide icons |
| State | TanStack React Query (fetch, cache) |
| Backend | Node.js 20+, Express, ES Modules |
| APIs externe | Oblio (OAuth 2.0), Google Sheets (Service Account) |
| Export | jsPDF, html2canvas (PDF) |

## Porturi

- **8080** – Vite dev server (frontend)
- **4000** – Express API (backend)
- Vite proxy: `/api/*` → `http://localhost:4000`
