const { Server } = require("socket.io");
const WebSocket = require("ws");

const BINANCE_WS_URL = process.env.BINANCE_WS_URL || "wss://stream.binance.com:9443/ws";
const RECONNECT_MS = Math.max(Number(process.env.BINANCE_WS_RECONNECT_MS || 5000), 1000);
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
    cors: {
      origin: createCorsOrigin(options.allowedOrigins),
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  let socket = null;
  let reconnectTimer = null;

  function scheduleReconnect() {
    if (reconnectTimer) return;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_MS);

    if (typeof reconnectTimer.unref === "function") {
      reconnectTimer.unref();
    }
  }

  function connect() {
    try {
      socket = new WebSocket(BINANCE_WS_URL);

      socket.on("open", () => {
        console.log("Binance Connected");
        socket.send(JSON.stringify({
          method: "SUBSCRIBE",
          params: STREAMS,
          id: Date.now()
        }));
      });

      socket.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          const ticker = normalizeTicker(data);
          if (ticker) {
            io.emit("market:update", ticker);
          }
        } catch (error) {
          // Ignore malformed upstream frames.
        }
      });

      socket.on("error", () => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.close();
        }
      });

      socket.on("close", scheduleReconnect);
    } catch (error) {
      scheduleReconnect();
    }
  }

  connect();

  return {
    io,
    close: () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) socket.close();
      io.close();
    }
  };
}

module.exports = {
  initializeBinanceSocket
};
