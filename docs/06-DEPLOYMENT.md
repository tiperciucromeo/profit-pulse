# Deployment

## Da, poți hosta pe Google Cloud pe un server propriu

Profit Pulse poate rula pe:
- **Google Cloud Run** (containerizat, serverless)
- **Google Compute Engine** (VM – server propriu)
- **Google App Engine** (PaaS)

Mai jos: opțiuni practice și pași de deployment.

---

## 1. Build producție

```bash
npm install
npm run build
```

- Frontend: fișiere statice în `dist/`
- Backend: `server.mjs` (Node.js)

---

## 2. Google Cloud Run (recomandat – simplu)

Un singur container servește API-ul și fișierele statice.

### Pasul 1: Dockerfile

Creează `Dockerfile` în rădăcina proiectului:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server.mjs ./
COPY dist/ ./dist/
RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.mjs"]
```

**Notă**: Pentru Cloud Run, serverul trebuie să servească și frontend-ul (fișiere din `dist/`). Adaugă în `server.mjs` **înainte** de `app.listen()`:

```javascript
// Servește frontend în producție (după toate route-urile /api)
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
}
```

Rutele `/api/*` și `/health` sunt definite înainte, deci vor fi matchede corect.

### Pasul 2: Build și push

```bash
# Conectare la Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Build imagine
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/profit-pulse

# Deploy
gcloud run deploy profit-pulse \
  --image gcr.io/YOUR_PROJECT_ID/profit-pulse \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated
```

### Pasul 3: Variabile de mediu

Setează `OBLIO_EMAIL`, `OBLIO_SECRET`, `OBLIO_CIF`, `GOOGLE_SHEETS_*` în Cloud Run:
- Console → Cloud Run → profit-pulse → Edit & deploy → Variables & secrets

---

## 3. Google Compute Engine (VM – server propriu)

Control total, ca pe un VPS clasic.

### Pasul 1: Creează VM

```bash
gcloud compute instances create profit-pulse-vm \
  --zone=europe-west1-b \
  --machine-type=e2-small \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud
```

### Pasul 2: Conectare și instalare

```bash
gcloud compute ssh profit-pulse-vm --zone=europe-west1-b

# pe VM
sudo apt update && sudo apt install -y nodejs npm nginx
```

### Pasul 3: Deploy aplicație

- Clonezi repo pe VM (sau transfer fișiere)
- `npm install && npm run build`
- Rulezi `node server.mjs` cu PM2 sau systemd

### Pasul 4: Nginx reverse proxy

Nginx ascultă pe 80/443 și proxy-ează către Node (ex. 4000):

```nginx
server {
  listen 80;
  server_name domeniu-tau.ro;

  location /api {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location / {
    proxy_pass http://127.0.0.1:8080;  # sau servești direct din dist/
    proxy_http_version 1.1;
    proxy_set_header Host $host;
  }
}
```

Sau: Node servește atât API cât și `dist/` (ca la Cloud Run), și Nginx doar face proxy către un singur port.

---

## 4. Considerații pentru producție

| Aspect | Recomandare |
|--------|-------------|
| **Date** | `data/` trebuie persistent. Pe Cloud Run: montare Cloud Storage sau volum. Pe VM: folder local. |
| **HTTPS** | Cloud Run: HTTPS automat. Pe VM: Let’s Encrypt + Nginx. |
| **Secrete** | Folosește Secret Manager sau variabile de mediu, nu `.env` în cod. |
| **CORS** | Dacă frontend e pe alt domeniu, configurează CORS în `server.mjs`. |

---

## 5. Verificare rapidă după deploy

```bash
curl https://domeniu-tau.ro/health
curl https://domeniu-tau.ro/api/oblio/test
```
