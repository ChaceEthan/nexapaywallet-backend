# NexaPay Backend

Production Express API for NexaPay wallet auth, wallet session handling, QR parsing, Stellar transactions, and Binance market data with cache/static fallback.

## Run

```bash
npm install
npm start
```

The server binds `process.env.PORT` and exposes:

```text
GET /health
GET /api/health
```

## Render

Use the repository `render.yaml`, or configure the service manually:

```text
Root Directory: backend
Build Command: npm ci --omit=dev
Start Command: npm start
Health Check Path: /health
```
