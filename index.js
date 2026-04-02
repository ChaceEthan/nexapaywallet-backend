require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDb } = require('./config/db');

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const kvRoutes = require('./routes/kv');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : [
      'https://nexapay-wallet.vercel.app',
      'https://nexapay-wallet.onrender.com',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: origin not allowed')); 
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api', authRoutes);
app.use('/api', walletRoutes);
app.use('/api', kvRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.path });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err && err.message && err.message.includes('CORS policy')) {
    return res.status(403).json({ message: err.message });
  }
  res.status(500).json({ message: 'Internal server error', error: err?.message });
});

const PORT = process.env.PORT || 10000;

connectDb().catch(() => {
  console.warn('Server started but MongoDB connection failed. Retrying in background.');
});

app.listen(PORT, () => {
  console.log(`\nServer listening on port ${PORT}`);
  console.log(`CORS origins: ${allowedOrigins.join(', ')}`);
});

module.exports = app;
