# Configurare

## Variabile de mediu (`.env`)

Copiază `.env.example` în `.env`:

```bash
cp .env.example .env
```

### Oblio (facturi)

| Variabilă | Descriere | Exemplu |
|-----------|-----------|---------|
| `OBLIO_EMAIL` | Email cont Oblio (client_id) | `cont@firma.ro` |
| `OBLIO_SECRET` | Secret token Oblio (client_secret) | din Oblio Dashboard |
| `OBLIO_CIF` | CIF firmă pentru filtrare facturi | `RO12345678` |

Obținere credențiale: [Oblio](https://www.oblio.eu) → Setări → API / Aplicații.

### Google Sheets (costuri producție)

| Variabilă | Descriere | Exemplu |
|-----------|-----------|---------|
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Email Service Account | `xxx@proiect.iam.gserviceaccount.com` |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Cheie privată (cu `\n` sau multi-line) | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | ID din URL Sheet | `1DVDqSXOWrZJ6N82JgPsssfZ17JyIQHB6o3v2x5faWTs` |
| `GOOGLE_SHEETS_RANGE` | Range citit | `Sheet1!A2:C` sau `Costs!A2:C` |

Structură Sheet recomandată:
- Coloana A: SKU
- Coloana B: Nume produs
- Coloana C: Cost producție per unitate

Creare Service Account: Google Cloud Console → APIs & Services → Credentials → Create credentials → Service account.

### Server

| Variabilă | Descriere | Default |
|-----------|-----------|---------|
| `PORT` | Port backend | `4000` |

## Fișiere sensibile (nu se pun pe Git)

- `.env` – credențiale
- `data/` – facturi, cheltuieli, cache (optional în .gitignore)

## Verificare

- Oblio: `curl http://localhost:4000/api/oblio/test`
- Sheets: `curl "http://localhost:4000/api/sheets/test?spreadsheetId=YOUR_ID"`
