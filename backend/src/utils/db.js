const mongoose = require("mongoose");

mongoose.set("bufferCommands", false);

const MONGO_URI = process.env.MONGO_URI?.trim();
const DB_RECONNECT_MS = Math.max(Number(process.env.DB_RECONNECT_MS || 10000), 1000);

let lastConnectionError = null;
let reconnectTimer = null;
let connectionStarted = false;

async function connectDb() {
  if (!MONGO_URI) {
    console.warn("MONGO_URI is not defined. Database connection skipped.");
    return false;
  }

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });

    lastConnectionError = null;
    console.log("MongoDB connected");
    return true;
  } catch (error) {
    lastConnectionError = error.message;
    console.error("MongoDB connection error:", error.message);
    return false;
  }
}

function scheduleReconnect() {
  if (!MONGO_URI || reconnectTimer) return;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;

    const connected = await connectDb();
    if (!connected) scheduleReconnect();
  }, DB_RECONNECT_MS);

  if (typeof reconnectTimer.unref === "function") {
    reconnectTimer.unref();
  }
}

async function startDbConnection() {
  if (connectionStarted) return mongoose.connection.readyState === 1;
  connectionStarted = true;

  const connected = await connectDb();
  if (!connected) scheduleReconnect();
  return connected;
}

function getDbStatus() {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  return {
    state: states[mongoose.connection.readyState] || "unknown",
    connected: mongoose.connection.readyState === 1,
    lastError: lastConnectionError
  };
}

mongoose.connection.on("disconnected", () => {
  if (MONGO_URI) {
    console.warn("MongoDB disconnected");
    scheduleReconnect();
  }
});

mongoose.connection.on("error", (error) => {
  lastConnectionError = error.message;
  console.error("MongoDB runtime error:", error.message);
});

module.exports = {
  connectDb,
  startDbConnection,
  getDbStatus
};
