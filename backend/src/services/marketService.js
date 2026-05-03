const binanceService = require("./binanceService");

const CACHE_TTL_MS = Number(process.env.MARKET_CACHE_TTL_MS || 10000);
const STALE_TTL_MS = Number(process.env.MARKET_STALE_TTL_MS || 5 * 60 * 1000);

let cachedMarket = null;

function nowIso() {
  return new Date().toISOString();
}

function cacheAge() {
  return cachedMarket ? Date.now() - cachedMarket.updatedAt : Infinity;
}

function readCache() {
  if (!cachedMarket) return null;

  const age = cacheAge();
  if (age <= CACHE_TTL_MS) {
    return { ...cachedMarket.value, cached: true, stale: false };
  }

  if (age <= STALE_TTL_MS) {
    return { ...cachedMarket.value, cached: true, stale: true };
  }

  return null;
}

function writeCache(value) {
  cachedMarket = {
    value,
    updatedAt: Date.now()
  };
}

function marketResponse(data, source, extra = {}) {
  return {
    success: true,
    count: data.length,
    data,
    source,
    timestamp: nowIso(),
    ...extra
  };
}

async function getMarketPrices() {
  try {
    const data = await binanceService.getPrices({ allowFallback: false });
    const response = marketResponse(data, "binance", { cached: false, stale: false });
    writeCache(response);
    return response;
  } catch (error) {
    const cached = readCache();
    if (cached) return cached;

    const data = await binanceService.getPrices({ fallbackOnly: true });
    return marketResponse(data, "static-fallback", {
      fallbackFrom: "binance",
      cached: false,
      stale: true
    });
  }
}

async function getPrices() {
  const market = await getMarketPrices();
  return market.data;
}

async function get24hStats() {
  try {
    return await binanceService.get24hStats({ allowFallback: false });
  } catch (error) {
    const cached = readCache();
    if (cached) return cached.data;
    return binanceService.get24hStats({ fallbackOnly: true });
  }
}

async function getSymbolPrice(symbol) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const market = await getMarketPrices();
  const ticker = market.data.find(item => item.symbol === normalizedSymbol);

  if (!ticker) {
    throw new Error("Invalid trading pair symbol");
  }

  return ticker;
}

async function getXLMPrice() {
  const ticker = await getSymbolPrice("XLMUSDT");
  return {
    success: true,
    symbol: ticker.symbol,
    price: ticker.price,
    change24h: ticker.change24h,
    source: ticker.source,
    timestamp: ticker.timestamp
  };
}

module.exports = {
  getXLMPrice,
  getMarketPrices,
  getPrices,
  get24hStats,
  getSymbolPrice
};
