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

// ✅ CORS
const allowedOrigins = [
  process.env.FRONTEND_URL_LOCAL || "http://localhost:5173",
  "http://localhost:5176",
  process.env.FRONTEND_URL_PROD || "https://nexapay-wallet-z45m.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type','Authorization']
}));

// ✅ Handle preflight requests
app.options("*", cors({
  origin: allowedOrigins,
  credentials: true
}));

// ✅ Routes
app.use("/api", authRoutes);
app.use("/api", walletRoutes);
app.use("/api", kvRoutes);

// ✅ Health check (IMPORTANT for Render)
app.get("/health", (req, res) => res.status(200).send("OK"));

// ✅ Default route
app.get("/", (req, res) => res.send("🚀 NexaPay Backend Running"));

// ✅ Start server AFTER DB
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