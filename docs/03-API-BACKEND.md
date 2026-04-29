# API Backend

Backend-ul rulează pe `http://localhost:4000` în dezvoltare. Vite proxy-ează `/api` către 4000.

## Endpoint-uri

### Oblio

| Metodă | Endpoint | Descriere |
|--------|----------|-----------|
| GET | `/api/oblio/test` | Test conexiune Oblio (companies) |
| POST | `/api/oblio/sync-invoices` | Sincronizare facturi. `?force=1` ignoră limita 24h |
| POST | `/api/oblio/fetch-invoices` | **(Deprecat)** Preia toate facturile, full sync |

### Facturi

| Metodă | Endpoint | Parametri | Descriere |
|--------|----------|-----------|-----------|
| GET | `/api/invoices` | `from`, `to` (YYYY-MM-DD) | Facturi filtrate pe perioadă |
| GET | `/api/invoices` | `month`, `day` | Facturi pentru o zi |
| GET | `/api/invoices` | (fără params) | Toate facturile |
| GET | `/api/invoices/summary` | - | Structură lună/zi, totaluri |
| GET | `/api/invoices/day` | `month`, `day` | Facturi pentru o zi (API alternativ) |
| GET | `/api/invoices/debug` | - | Verificare căi fișiere facturi |

### Cheltuieli (profitabilitate)

| Metodă | Endpoint | Descriere |
|--------|----------|-----------|
| GET | `/api/cheltuieli/:storageKey` | Citește cheltuieli pentru o lună |
| POST | `/api/cheltuieli/:storageKey` | Salvează cheltuieli. Body: `{ tvaRate, cheltuieli }` |

`storageKey` exemplu: `profitabilitate-feb-2026-cheltuieli`

### Google Sheets

| Metodă | Endpoint | Parametri | Descriere |
|--------|----------|-----------|-----------|
| GET | `/api/sheets/test` | `spreadsheetId`, `range` | Test citire Sheet |
| GET | `/api/sheets/data` | `spreadsheetId`, `range`, `force=1` | Date din Sheet (cache 24h) |
| GET | `/api/sheets/costs` | `spreadsheetId`, `range`, `force=1` | Costuri ca `{ sku, name, cost }[]` |

### Profitabilitate

| Metodă | Endpoint | Descriere |
|--------|----------|-----------|
| GET | `/api/profitabilitate/summary` | Profit final total (toate lunile), per perioadă |

Răspuns: `{ ok, profitFinalTotal, periods: [{ from, to, profitFinal, ... }] }`

### Health

| Metodă | Endpoint | Descriere |
|--------|----------|-----------|
| GET | `/health` | `{ status: "ok" }` |

## Formate răspuns

- Succes: `{ ok: true, ... }`
- Eroare: `{ ok: false, error: "mesaj" }` cu status HTTP 4xx/5xx

## Variabile mediu necesare

Vezi [05-CONFIGURARE.md](./05-CONFIGURARE.md).

- Oblio: `OBLIO_EMAIL`, `OBLIO_SECRET`, `OBLIO_CIF`
- Google Sheets: `GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID`
- `PORT` (default 4000)
