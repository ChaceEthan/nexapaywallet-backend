// server.js
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// MongoDB connection
const { connectDb } = require("./src/config/db");

// Routes
const authRoutes = require("./src/routes/auth");
const walletRoutes = require("./src/routes/wallet");
const kvRoutes = require("./src/routes/kv");

const app = express();

// Security headers
app.use(helmet());

// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5176",
  process.env.FRONTEND_URL || "https://nexapay-wallet-z45m.vercel.app"
];

// CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow tools like Postman
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// JSON middleware
app.use(express.json());

// API Routes
app.use("/api", authRoutes);
app.use("/api", walletRoutes);
app.use("/api", kvRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("🚀 NexaPay Wallet Backend is running!");
});

// Start server after DB connection
const PORT = process.env.PORT || 10000;

connectDb()
  .then(() => {
    console.log("✅ MongoDB connected");
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Graceful error for port in use
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use. Stop other processes or change the PORT.`);
        process.exit(1);
      } else {
        console.error(err);
      }
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

module.exports = app;