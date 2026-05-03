const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const http = require("http");

const { getDbStatus, startDbConnection } = require("./src/utils/db");
const { globalErrorHandler, notFoundHandler } = require("./src/middlewares/errorHandler");
const { initializeBinanceSocket } = require("./src/sockets/binanceSocket");
const { getHorizonHealth } = require("./src/utils/network");

const authRoutes = require("./src/routes/auth");
const walletRoutes = require("./src/routes/wallet");
const kvRoutes = require("./src/routes/kv");
const marketRoutes = require("./src/routes/market");
const transactionRoutes = require("./src/routes/transaction");
const qrRoutes = require("./src/routes/qr");
const userRoutes = require("./src/routes/user");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

const configuredOrigins = [
  process.env.CORS_ORIGINS,
  process.env.CORS_ORIGIN,
  "https://nexapay-wallet-z45m.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173"
];

const allowedOrigins = configuredOrigins
  .filter(Boolean)
  .join(",")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);
const allowAnyOrigin = allowedOrigins.length === 0 || allowedOrigins.includes("*");

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowedOrigin = allowedOrigins.includes(origin);
    const isLocalDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (allowAnyOrigin || isAllowedOrigin || isLocalDevOrigin) return callback(null, true);
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "Accept", "Origin", "X-Requested-With"],
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use("/api", authRoutes);
app.use("/api", walletRoutes);
app.use("/api", kvRoutes);
app.use("/api", marketRoutes);
app.use("/api", transactionRoutes);
app.use("/api", qrRoutes);
app.use("/api", userRoutes);

async function sendHealth(req, res) {
  const horizon = await getHorizonHealth();

  return res.status(200).json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    database: getDbStatus(),
    horizon,
    timestamp: new Date().toISOString()
  });
}

app.get("/health", sendHealth);
app.get("/api/health", sendHealth);
app.get("/api/health/horizon", async (req, res) => {
  const horizon = await getHorizonHealth();
  return res.status(200).json(horizon);
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "NexaPay Backend Running",
    health: "/health"
  });
});

app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 10000;
const server = http.createServer(app);
let binanceSocket = null;

function startKeepAlive() {
  const url = process.env.KEEP_ALIVE_URL?.trim();
  const intervalMs = Math.max(Number(process.env.KEEP_ALIVE_INTERVAL_MS || 10 * 60 * 1000), 60 * 1000);
  if (!url || typeof fetch !== "function") return;

  const timer = setInterval(() => {
    fetch(url, { method: "GET" }).catch((error) => {
      console.warn("Keep-alive ping failed:", error.message);
    });
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

server.on("error", (error) => {
  console.error("Server startup error:", error.message);
});

function startServer() {
  if (server.listening) return server;

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on PORT ${PORT}`);

    startDbConnection().then((connected) => {
      if (!connected) {
        console.warn("MongoDB unavailable. Server is running and will retry the connection.");
      }
    }).catch((error) => {
      console.error("MongoDB startup task failed:", error.message);
    });

    startKeepAlive();

    try {
      binanceSocket = initializeBinanceSocket(server, {
        allowedOrigins: allowAnyOrigin ? ["*"] : allowedOrigins
      });
    } catch (error) {
      console.error("Binance socket unavailable:", error.message);
    }
  });

  return server;
}

function stopServer(callback) {
  if (binanceSocket) {
    binanceSocket.close();
    binanceSocket = null;
  }

  if (!server.listening) {
    if (callback) callback();
    return;
  }

  server.close(callback);
}

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error?.message || error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error?.message || error);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing HTTP server.");
  stopServer(() => {
    process.exit(0);
  });
});

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
module.exports.stopServer = stopServer;
module.exports.server = server;
