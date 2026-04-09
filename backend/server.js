 require('dotenv').config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
 
const { connectDb } = require("./src/config/db");
 
const authRoutes = require("./src/routes/auth");
const walletRoutes = require("./src/routes/wallet");
const kvRoutes = require("./src/routes/kv");

const app = express();

// Middleware
app.use(helmet());
app.use(express.json());

// CORS
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5176",
    process.env.FRONTEND_URL
  ],
  credentials: true
}));

// Routes
app.use("/api", authRoutes);
app.use("/api", walletRoutes);
app.use("/api", kvRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("🚀 NexaPay Backend Running");
});

// Start server
const PORT = process.env.PORT || 10000;

connectDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});