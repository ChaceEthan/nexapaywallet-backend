// @ts-nocheck
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { connectDb } = require('./src/config/db');

// Routes (ntidukoraho)
const authRoutes = require('./src/routes/auth');
const walletRoutes = require('./src/routes/wallet');
const kvRoutes = require('./src/routes/kv');

const app = express();

/* =========================
   🔹 BASIC MIDDLEWARES
========================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   🔹 CORS (FIXED VERSION)
========================= */

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://nexapay-wallet.vercel.app' // hindura niba URL yawe itandukanye
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Postman/mobile

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS not allowed'));
    },
    credentials: true
  })
);

/* =========================
   🔹 HEALTH ROUTES
========================= */

app.get('/', (req, res) => {
  res.json({ status: 'API running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

/* =========================
   🔹 API ROUTES (NTIBIHINDUKA)
========================= */

app.use('/api', authRoutes);
app.use('/api', walletRoutes);
app.use('/api', kvRoutes);

/* =========================
   🔹 404 HANDLER
========================= */

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl
  });
});

/* =========================
   🔹 ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error(err?.message || err);

  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      message: 'CORS blocked request'
    });
  }

  res.status(500).json({
    message: 'Server error'
  });
});

/* =========================
   🔹 SERVER START
========================= */

const PORT = process.env.PORT || 10000;

connectDb().catch(() => {
  console.warn('MongoDB connection failed');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;