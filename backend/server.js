// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// DB
const { connectDb } = require("./src/config/db");

// Routes
const authRoutes = require("./src/routes/auth");
const walletRoutes = require("./src/routes/wallet");
const kvRoutes = require("./src/routes/kv");

const app = express();

// ✅ Security headers
app.use(helmet());

// ✅ JSON middleware
app.use(express.json());

// ✅ CORS (dynamic, localhost + Vercel)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5176",
  process.env.FRONTEND_URL  // Example: https://nexapay-wallet-z45m.vercel.app
];

app.use(cors({
  origin: function(origin, callback) {
    // allow Postman / curl requests (no origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("❌ Not allowed by CORS"));
    }
  },
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true
}));

// ✅ Routes
app.use("/api", authRoutes);
app.use("/api", walletRoutes);
app.use("/api", kvRoutes);

// ✅ Health check (for Render or uptime monitors)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ✅ Default route
app.get("/", (req, res) => {
  res.send("🚀 NexaPay Backend Running");
});

// ✅ Start server AFTER DB is connected
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
    process.exit(1);
  });

// ✅ Export for testing
module.exports = app;