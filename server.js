<<<<<<< HEAD
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { connectDb } = require("./src/config/db");
 
const authRoutes = require("./src/routes/auth");
const walletRoutes = require("./src/routes/wallet");
const kvRoutes = require("./src/routes/kv");
const marketRoutes = require("./src/routes/market");
const transactionRoutes = require("./src/routes/transaction");
const qrRoutes = require("./src/routes/qr");

const app = express();

// ================= SECURITY =================
app.use(helmet());
app.use(express.json());

// ================= CORS =================
const corsOptions = {
   origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (origin.includes("localhost")) return callback(null, true);
    if (origin.includes("vercel.app")) return callback(null, true);

    return callback(null, true);
 },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ================= ROUTES =================
app.use("/api", authRoutes);
app.use("/api", walletRoutes);
app.use("/api", kvRoutes);
app.use("/api", marketRoutes);
app.use("/api", transactionRoutes);
app.use("/api", qrRoutes);

// ================= HEALTH =================
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("🚀 NexaPay Backend Running");
});

// ================= START =================
const PORT = process.env.PORT || 10000;

connectDb()
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err);
   });

module.exports = app; 
=======
// 1. ENV LOAD: Must be at the very top
require("dotenv").config();

const { app } = require("./src/app");
const { connectDb } = require("./src/config/db");

// 2. ENV VALIDATION: Stop immediately if critical config is missing
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env file");
  process.exit(1);
}

const PORT = process.env.PORT || 10000;

// 3. GLOBAL ERROR HANDLERS: Prevent process crashes from async errors
process.on('uncaughtException', (err) => {
  console.error('🔥 Critical Uncaught Exception:', err);
  // Keep running for stability, but log the event
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

/**
 * @description Start the server and connect to the database
 */
const startServer = async () => {
  console.log("MONGO_URI:", process.env.MONGO_URI ? "Loaded" : "Missing");
  
  // 4. DATABASE INITIALIZATION: Attempt connection but don't block server startup on failure
  const isConnected = await connectDb();
  
  if (!isConnected) {
    console.warn("⚠️ Database not connected. Running in degraded mode.");
  }

  // 5. START EXPRESS: Always start the process
  app.listen(PORT, "0.0.0.0", () => {
    const statusEmoji = isConnected ? "✅" : "⚠️";
    const dbStatus = isConnected ? "Connected" : "Disconnected (Degraded Mode)";

    console.log(`
🚀 NexaPay Backend Started
📡 Server running on: http://localhost:${PORT}
📁 Environment: ${process.env.NODE_ENV || 'development'}
${statusEmoji} MongoDB Status: ${dbStatus}
    `);
  });
};

startServer();
>>>>>>> 81195e5 (Fix backend: Binance service + MongoDB + market cleanup)
