// server.js
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { connectDb } = require("./db"); // Mongoose connection

// Routes
const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/wallet");
const kvRoutes = require("./routes/kv");

const app = express();

// Middleware
app.use(express.json());

// CORS configuration
app.use(cors({
  origin: "https://nexapay-wallet-z45m.vercel.app", // frontend origin
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Connect to MongoDB
connectDb()
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Routes prefix
app.use("/api", authRoutes);
app.use("/api", walletRoutes);
app.use("/api", kvRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});

// Start server safely
const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Please free the port and restart server.`);
    process.exit(1);
  } else {
    console.error(err);
  }
});