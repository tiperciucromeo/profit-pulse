# Documentația Profit Pulse

Documentație completă pentru aplicația **Profit Pulse** – dashboard de profitabilitate pentru magazinul online **Gorgeaux.ro**.

## Index documentație

| Document | Descriere |
|---------|-----------|
| [01-ARHITECTURA.md](./01-ARHITECTURA.md) | Arhitectura aplicației, fluxuri de date, tehnologii |
| [02-STRUCTURA-PROIECT.md](./02-STRUCTURA-PROIECT.md) | Structura fișierelor și foldere, unde găsești fiecare lucru |
| [03-API-BACKEND.md](./03-API-BACKEND.md) | Endpoint-uri API, parametri, răspunsuri |
| [04-FRONTEND.md](./04-FRONTEND.md) | Pagini, componente, routing, logica UI |
| [05-CONFIGURARE.md](./05-CONFIGURARE.md) | Variabile de mediu, Oblio, Google Sheets, .env |
| [06-DEPLOYMENT.md](./06-DEPLOYMENT.md) | Deployment local, pe server propriu, Google Cloud |

## Despre aplicație

**Profit Pulse** calculează profitabilitatea pe lună pentru facturile ONL (online) din **Oblio**, folosind:

- **Facturi** – din Oblio API (seria ONL)
- **Costuri producție** – din Google Sheets (SKU → cost/unitate)
- **Cheltuieli** – introduse manual (Emag, FAN, transport etc.)

Rezultate: profit total per comandă, profit final (după TVA și cheltuieli), export PDF.

## Quick Start

```bash
cp .env.example .env
# Completează .env cu credențialele Oblio și Google Sheets

npm install
npm run dev:fullstack
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:4000
