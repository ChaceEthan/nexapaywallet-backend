const binanceService = require("./binanceService");

const CACHE_TTL_MS = Number(process.env.MARKET_CACHE_TTL_MS || 10000);
const STALE_TTL_MS = Number(process.env.MARKET_STALE_TTL_MS || 5 * 60 * 1000);
const FALLBACK_XLM_PRICE = 0.1650;

let cachedMarket = null;
let cachedXlm = {
  price: FALLBACK_XLM_PRICE,
  source: "cached",
  updatedAt: Date.now()
};

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

  const xlmTicker = Array.isArray(value?.data)
    ? value.data.find(item => item?.symbol === "XLMUSDT")
    : null;

  if (xlmTicker?.price !== undefined) {
    const price = Number(xlmTicker.price);
    if (Number.isFinite(price)) {
      cachedXlm = {
        price,
        source: value.source || "cached",
        updatedAt: Date.now()
      };
    }
  }
}

function marketResponse(data, source, extra = {}) {
  const safeData = Array.isArray(data) ? data : [];
  return {
    success: true,
    count: safeData.length,
    data: safeData,
    source,
    timestamp: nowIso(),
    ...extra
  };
}

async function getMarketPrices() {
  const cached = readCache();
  if (cached && !cached.stale) return cached;

  try {
    const data = await binanceService.getPrices({ allowFallback: false });
    const response = marketResponse(data, "binance", { cached: false, stale: false });
    writeCache(response);
    return response;
  } catch (error) {
    console.error("Market API error:", error.message || error);
    const staleCached = readCache();
    if (staleCached) return staleCached;

    try {
      const data = await binanceService.getPrices({ fallbackOnly: true });
      return marketResponse(data, "cached", {
        fallbackFrom: "binance",
        cached: true,
        stale: true
      });
    } catch (fallbackError) {
      console.error("Market fallback error:", fallbackError.message || fallbackError);
      return {
        success: true,
        xlm: FALLBACK_XLM_PRICE,
        source: "cached",
        timestamp: nowIso()
      };
    }
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
  const ticker = (Array.isArray(market.data) ? market.data : [])
    .find(item => item?.symbol === normalizedSymbol);

  if (!ticker) {
    throw new Error("Invalid trading pair symbol");
  }

  return ticker;
}

async function getXLMPrice() {
  try {
    const ticker = await getSymbolPrice("XLMUSDT");
    return {
      success: true,
      symbol: ticker.symbol,
      price: ticker.price,
      xlm: Number(ticker.price) || cachedXlm.price,
      change24h: ticker.change24h,
      source: ticker.source,
      timestamp: ticker.timestamp
    };
  } catch (error) {
    console.error("XLM market error:", error.message || error);
    return {
      success: true,
      xlm: cachedXlm.price || FALLBACK_XLM_PRICE,
      source: "cached",
      timestamp: nowIso()
    };
  }
}

module.exports = {
  getXLMPrice,
  getMarketPrices,
  getPrices,
  get24hStats,
  getSymbolPrice
};
