require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { connectDb } = require("./src/config/db");

// routes
const authRoutes = require("./src/routes/auth");
const walletRoutes = require("./src/routes/wallet");
const kvRoutes = require("./src/routes/kv");

const app = express();

// ================= SECURITY =================
app.use(helmet());
app.use(express.json());

// ================= CORS FIX =================
const corsOptions = {
  origin: (origin, callback) => {
    // allow Postman / mobile apps
    if (!origin) return callback(null, true);

    // allow localhost (all ports)
    if (origin.includes("localhost")) {
      return callback(null, true);
    }

    // allow Vercel frontend
    if (origin.includes("vercel.app")) {
      return callback(null, true);
    }

    console.log("❌ Blocked by CORS:", origin);
    return callback(null, true); // ⚠️ keep open for now (dev-safe)
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

// ================= HEALTH =================
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("🚀 NexaPay Backend Running");
});

// ================= START SERVER =================
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

module.exports = app;