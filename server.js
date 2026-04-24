// ================= ENV LOAD =================
require("dotenv").config();

// ================= IMPORTS =================
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

// ================= ENV VALIDATION =================
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env file");
  process.exit(1);
}

// ================= APP INIT =================
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

// ================= GLOBAL ERROR HANDLING =================
process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection:", reason);
});

// ================= START SERVER =================
const PORT = process.env.PORT || 10000;
 
const startServer = async () => {
  console.log("MONGO_URI:", process.env.MONGO_URI ? "Loaded" : "Missing");

  let isConnected = false;

  try {
    await connectDb();
    console.log("✅ MongoDB connected");
    isConnected = true;
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    console.warn("⚠️ Running in degraded mode (no DB)");
  }

  app.listen(PORT, "0.0.0.0", () => { 
    console.log(` 
🚀 NexaPay Backend Started
📡 Server running on port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || "development"}
${isConnected ? "✅ MongoDB Connected" : "⚠️ MongoDB Disconnected"}
    `);
  });
};

startServer();

module.exports = app;
