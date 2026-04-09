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

// ✅ Security
app.use(helmet());

// ✅ Middleware
app.use(express.json());

// ✅ Allowed production origin
const allowedOrigins = [
  process.env.FRONTEND_URL_PROD || "https://nexapay-wallet-z45m.vercel.app"
];

// ✅ CORS CONFIG (FIXED FULLY)
const corsOptions = {
  origin: (origin, callback) => {
    // allow Postman / mobile apps / curl
    if (!origin) return callback(null, true);

    // ✅ allow ALL localhost (5173, 5174, etc)
    if (
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1")
    ) {
      return callback(null, true);
    }

    // ✅ allow production frontend
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("❌ Blocked by CORS:", origin);
    callback(new Error("Not allowed by CORS"));
  },

  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ✅ Apply CORS
app.use(cors(corsOptions));

// ✅ Handle preflight requests properly
app.options("*", cors(corsOptions));

// ✅ Routes
app.use("/api", authRoutes);
app.use("/api", walletRoutes);
app.use("/api", kvRoutes);

// ✅ Health check (important for Render)
app.get("/health", (req, res) => res.status(200).send("OK"));

// ✅ Default route
app.get("/", (req, res) => {
  res.send("🚀 NexaPay Backend Running");
});

// ✅ Start server AFTER DB connection
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