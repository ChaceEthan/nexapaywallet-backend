const { Server } = require("socket.io");
const WebSocket = require("ws");

const BINANCE_WS_URL = process.env.BINANCE_WS_URL || "wss://stream.binance.com:9443/ws";
const RECONNECT_MS = Math.max(Number(process.env.BINANCE_WS_RECONNECT_MS || 5000), 1000);
const HEARTBEAT_MS = Math.max(Number(process.env.BINANCE_WS_HEARTBEAT_MS || 30000), 5000);
const STREAMS = ["xlmusdt@ticker", "btcusdt@ticker", "ethusdt@ticker"];

function normalizeTicker(payload) {
  if (!payload?.s || !payload?.c) return null;

  return {
    symbol: String(payload.s).toUpperCase(),
    price: String(payload.c),
    change24h: Number(payload.P ?? 0),
    volume24h: Number(payload.q ?? 0),
    source: "binance-ws",
    timestamp: new Date().toISOString()
  };
}

function createCorsOrigin(allowedOrigins = []) {
  if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) return true;
  return allowedOrigins;
}

function initializeBinanceSocket(server, options = {}) {
  const io = new Server(server, {
    path: "/ws/market",
    pingInterval: HEARTBEAT_MS,
    pingTimeout: Math.max(Math.floor(HEARTBEAT_MS / 2), 5000),
    cors: {
      origin: createCorsOrigin(options.allowedOrigins),
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  let socket = null;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let shuttingDown = false;

  function clearHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  function scheduleReconnect() {
    if (shuttingDown) return;
    if (reconnectTimer) return;
    clearHeartbeat();

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_MS);

    if (typeof reconnectTimer.unref === "function") {
      reconnectTimer.unref();
    }
  }

  function connect() {
    if (shuttingDown) return;

    try {
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.terminate();
      }

      socket = new WebSocket(BINANCE_WS_URL);

      socket.on("open", () => {
        console.log("Binance Connected");
        socket.send(JSON.stringify({
          method: "SUBSCRIBE",
          params: STREAMS,
          id: Date.now()
        }));

        clearHeartbeat();
        heartbeatTimer = setInterval(() => {
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            scheduleReconnect();
            return;
          }

          try {
            socket.ping();
          } catch {
            scheduleReconnect();
          }
        }, HEARTBEAT_MS);

        if (typeof heartbeatTimer.unref === "function") {
          heartbeatTimer.unref();
        }
      });

      socket.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          const ticker = normalizeTicker(data);
          if (ticker) {
            io.emit("market:update", ticker);
          }
        } catch {
          // Ignore malformed upstream frames.
        }
      });

      socket.on("error", () => {
        if (socket?.readyState === WebSocket.OPEN) socket.close();
      });

      socket.on("close", scheduleReconnect);
    } catch {
      scheduleReconnect();
    }
  }

  connect();

  return {
    io,
    close: () => {
      shuttingDown = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearHeartbeat();
      if (socket) socket.close();
      io.close();
    }
  };
}

module.exports = {
  initializeBinanceSocket
};
