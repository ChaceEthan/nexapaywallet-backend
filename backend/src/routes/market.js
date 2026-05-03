const express = require("express");
const router = express.Router();

const {
  getXLMPrice,
  getMarketPrices,
  get24hStats,
  getSymbolPrice
} = require("../services/marketService");

function sendMarket(res, market) {
  const data = Array.isArray(market?.data) ? market.data : [];
  return res.json({
    success: true,
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
    return sendMarket(res, null);
  }
});

router.get("/market/xlm", async (req, res) => {
  try {
    const priceData = await getXLMPrice();
    return res.json(priceData);
  } catch (error) {
    return res.json({
      success: true,
      symbol: "XLMUSDT",
      price: "0.10",
      change24h: 0,
      source: "static-fallback",
      stale: true,
      timestamp: new Date().toISOString()
    });
  }
});

router.get("/market/prices", async (req, res) => {
  try {
    const market = await getMarketPrices();

    return sendMarket(res, market);
  } catch (error) {
    return sendMarket(res, null);
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
    if (error.message.includes("Invalid trading pair")) {
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
