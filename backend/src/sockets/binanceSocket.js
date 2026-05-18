const { Server } = require("socket.io");
const WebSocket = require("ws");

const BINANCE_WS_URL = process.env.BINANCE_WS_URL || "wss://stream.binance.com:9443/ws";
const RECONNECT_MS = Math.max(Number(process.env.BINANCE_WS_RECONNECT_MS || 5000), 1000);
const HEARTBEAT_MS = Math.max(Number(process.env.BINANCE_WS_HEARTBEAT_MS || 30000), 5000);
const STREAMS = ["xlmusdt@ticker", "btcusdt@ticker", "ethusdt@ticker"];
let activeMarketSocket = null;

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
  if (activeMarketSocket && !activeMarketSocket.closed) {
    return activeMarketSocket;
  }

  let io = null;

  try {
    io = new Server(server, {
      path: "/ws/market",
      pingInterval: HEARTBEAT_MS,
      pingTimeout: Math.max(Math.floor(HEARTBEAT_MS / 2), 5000),
      cors: {
        origin: createCorsOrigin(options.allowedOrigins),
        methods: ["GET", "POST"],
        credentials: true
      }
    });
  } catch (error) {
    console.error("Socket.IO initialization failed:", error.message || error);
    return {
      io: null,
      close: () => {}
    };
  }

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

  function safeBroadcast(event, payload) {
    try {
      if (io) io.emit(event, payload);
    } catch (error) {
      console.error("Market websocket broadcast failed:", error.message || error);
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
        console.log("Binance market stream connected");
        try {
          socket.send(JSON.stringify({
            method: "SUBSCRIBE",
            params: STREAMS,
            id: Date.now()
          }));
        } catch (error) {
          console.error("Binance subscribe failed:", error.message || error);
          scheduleReconnect();
          return;
        }

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
            safeBroadcast("market:update", ticker);
          }
        } catch (error) {
          console.warn("Ignored malformed market websocket frame:", error.message || error);
        }
      });

      socket.on("error", (error) => {
        console.error("Binance websocket error:", error.message || error);
        if (socket?.readyState === WebSocket.OPEN) socket.close();
        else scheduleReconnect();
      });

      socket.on("close", (code, reason) => {
        console.warn("Binance websocket closed:", code, reason?.toString?.() || "");
        scheduleReconnect();
      });
    } catch (error) {
      console.error("Binance websocket setup failed:", error.message || error);
      scheduleReconnect();
    }
  }

  io.on("connection", (client) => {
    client.on("error", (error) => {
      console.error("Market websocket client error:", error.message || error);
    });
  });

  io.engine.on("connection_error", (error) => {
    console.error("Market websocket handshake error:", error.message || error);
  });

  const controller = {
    io,
    closed: false,
    close: () => {
      controller.closed = true;
      shuttingDown = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearHeartbeat();
      if (socket) {
        try {
          socket.close();
        } catch {
          socket.terminate();
        }
      }
      if (io) io.close();
      if (activeMarketSocket === controller) {
        activeMarketSocket = null;
      }
    }
  };

  activeMarketSocket = controller;
  connect();

  return controller;
}

module.exports = {
  initializeBinanceSocket
};
