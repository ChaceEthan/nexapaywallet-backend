const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// ================= SECURITY =================
app.use(helmet());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// ================= CORS =================
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Add your production domains here
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://nexapay.vercel.app"
    ];
    
    if (allowedOrigins.some(o => origin.startsWith(o)) || origin.includes("localhost")) {
      return callback(null, true);
    }

    return callback(null, true); // Fallback to true for development, tighten for prod
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ================= ROUTES =================
const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/wallet");
const transactionRoutes = require("./routes/transaction");
const userRoutes = require("./routes/user");
const marketRoutes = require("./routes/market");

app.use("/api/auth", authRoutes); // Kept without v1 for simplicity based on user request format
app.use("/api/wallet", walletRoutes);
app.use("/api/transaction", transactionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/market", marketRoutes);

// ================= HEALTH =================
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is healthy" });
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("🚀 NexaPay API v1 is live");
});

// ================= ERROR HANDLING =================
app.use(errorHandler);

module.exports = { app };
