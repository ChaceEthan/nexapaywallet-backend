const axios = require("axios");

const BINANCE_API_URL = process.env.BINANCE_API_URL || "https://api.binance.com/api/v3";
const REQUEST_TIMEOUT_MS = Number(process.env.BINANCE_REQUEST_TIMEOUT_MS || 8000);
const RETRY_COUNT = Math.max(Number(process.env.BINANCE_RETRY_COUNT || 2), 0);
const RETRY_DELAY_MS = Math.max(Number(process.env.BINANCE_RETRY_DELAY_MS || 250), 0);

const SYMBOLS = ["XLMUSDT", "BTCUSDT", "ETHUSDT", "USDCUSDT"];

const FALLBACK_TICKERS = {
  XLMUSDT: { price: "0.10", change24h: 0, volume24h: 0 },
  BTCUSDT: { price: "60000", change24h: 0, volume24h: 0 },
  ETHUSDT: { price: "3000", change24h: 0, volume24h: 0 },
  USDCUSDT: { price: "1", change24h: 0, volume24h: 0 }
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeTicker(ticker) {
  const symbol = String(ticker.symbol || "").toUpperCase();
  const price = Number(ticker.lastPrice ?? ticker.price);

  if (!SYMBOLS.includes(symbol) || !Number.isFinite(price) || price <= 0) {
    return null;
  }

  return {
    symbol,
    price: String(price),
    change24h: Number(ticker.priceChangePercent ?? 0),
    volume24h: Number(ticker.quoteVolume ?? ticker.volume ?? 0),
    source: "binance",
    timestamp: new Date().toISOString()
  };
}

function fallbackTickers() {
  console.log("Using fallback data");
  return SYMBOLS.map(symbol => ({
    symbol,
    price: FALLBACK_TICKERS[symbol].price,
    change24h: FALLBACK_TICKERS[symbol].change24h,
    volume24h: FALLBACK_TICKERS[symbol].volume24h,
    source: "static-fallback",
    timestamp: new Date().toISOString()
  }));
}

async function requestWithRetry(path, params = {}) {
  let lastError;

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt += 1) {
    try {
      const response = await axios.get(`${BINANCE_API_URL}${path}`, {
        params,
        timeout: REQUEST_TIMEOUT_MS,
        headers: { accept: "application/json" }
      });
      return response.data;
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_COUNT) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError;
}

async function fetch24hTickers() {
  const data = await requestWithRetry("/ticker/24hr", {
    symbols: JSON.stringify(SYMBOLS)
  });

  const tickers = (Array.isArray(data) ? data : [data])
    .map(normalizeTicker)
    .filter(Boolean);

  if (tickers.length === 0) {
    throw new Error("Binance ticker response was empty");
  }

  return tickers;
}

async function getPrices(options = {}) {
  if (options.fallbackOnly) {
    return fallbackTickers();
  }

  try {
    return await fetch24hTickers();
  } catch (error) {
    if (options.allowFallback === false) {
      throw error;
    }
    return fallbackTickers();
  }
}

async function get24hStats(options = {}) {
  if (options.fallbackOnly) {
    return fallbackTickers();
  }

  const tickers = await getPrices(options);
  return tickers.map(ticker => ({
    symbol: ticker.symbol,
    price: ticker.price,
    change24h: ticker.change24h,
    volume24h: ticker.volume24h,
    source: ticker.source,
    timestamp: ticker.timestamp
  }));
}

module.exports = {
  SYMBOLS,
  getPrices,
  get24hStats
};
