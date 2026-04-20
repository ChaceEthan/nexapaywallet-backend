require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { connectDb } = require("./src/config/db");
 
const authRoutes = require("./src/routes/auth");
const walletRoutes = require("./src/routes/wallet");
const kvRoutes = require("./src/routes/kv");
const marketRoutes = require("./routes/market");

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