const express = require("express");
const router = express.Router();

const {
  getXLMPrice,
  getMarketPrices,
  get24hStats,
  getSymbolPrice
} = require("../services/marketService");

const FALLBACK_XLM_PRICE = 0.1650;

function fallbackXlmResponse() {
  return {
    success: true,
    symbol: "XLMUSDT",
    price: String(FALLBACK_XLM_PRICE),
    xlm: FALLBACK_XLM_PRICE,
    change24h: 0,
    source: "cached",
    stale: true,
    timestamp: new Date().toISOString()
  };
}

function sendMarket(res, market) {
  if (market?.xlm !== undefined && !Array.isArray(market?.data)) {
    return res.json({
      success: true,
      xlm: market.xlm,
      source: market.source || "cached",
      timestamp: market.timestamp || new Date().toISOString()
    });
  }

  const data = Array.isArray(market?.data) ? market.data : [];
  const xlmTicker = data.find(item => item?.symbol === "XLMUSDT");
  const xlm = Number(xlmTicker?.price);

  return res.json({
    success: true,
    xlm: Number.isFinite(xlm) ? xlm : FALLBACK_XLM_PRICE,
    count: data.length,
    data,
    source: market?.source || "static-fallback",
    fallbackFrom: market?.fallbackFrom || null,
    cached: Boolean(market?.cached),
    stale: Boolean(market?.stale),
    timestamp: market?.timestamp || new Date().toISOString()
  });
}

router.get("/market", async (req, res) => {
  try {
    return sendMarket(res, await getMarketPrices());
  } catch (error) {
    console.error("GET /api/market error:", error);
    return res.json({
      success: true,
      xlm: FALLBACK_XLM_PRICE,
      source: "cached",
      timestamp: new Date().toISOString()
    });
  }
});

router.get("/market/xlm", async (req, res) => {
  try {
    const priceData = await getXLMPrice();
    return res.json(priceData);
  } catch (error) {
    console.error("GET /api/market/xlm error:", error);
    return res.json(fallbackXlmResponse());
  }
});

router.get("/market/prices", async (req, res) => {
  try {
    const market = await getMarketPrices();

    return sendMarket(res, market);
  } catch (error) {
    console.error("GET /api/market/prices error:", error);
    return res.json({
      success: true,
      xlm: FALLBACK_XLM_PRICE,
      source: "cached",
      timestamp: new Date().toISOString()
    });
  }
});

router.get("/market/stats", async (req, res) => {
  try {
    const stats = await get24hStats();
    return res.json({
      success: true,
      count: stats.length,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("GET /api/market/stats error:", error);
    return res.json({
      success: true,
      count: 0,
      data: [],
      source: "static-fallback",
      stale: true,
      timestamp: new Date().toISOString()
    });
  }
});

router.get("/market/price/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: "Symbol parameter is required"
      });
    }

    const priceData = await getSymbolPrice(symbol);

    return res.json({
      success: true,
      data: priceData,
      source: priceData.source,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("GET /api/market/price/:symbol error:", error);
    if (String(error.message || "").includes("Invalid trading pair")) {
      return res.status(400).json({
        success: false,
        error: "Invalid trading pair symbol"
      });
    }

    return res.status(200).json({
      success: false,
      error: "Market data unavailable"
    });
  }
});

module.exports = router;
