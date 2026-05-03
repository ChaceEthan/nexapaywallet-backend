const express = require("express");
const router = express.Router();

const {
  getXLMPrice,
  getMarketPrices,
  get24hStats,
  getSymbolPrice
} = require("../services/marketService");

router.get("/market/xlm", async (req, res) => {
  try {
    const priceData = await getXLMPrice();
    return res.json(priceData);
  } catch (error) {
    return res.status(503).json({
      success: false,
      error: "Market data unavailable"
    });
  }
});

router.get("/market/prices", async (req, res) => {
  try {
    const market = await getMarketPrices();

    return res.json({
      success: true,
      count: market.data.length,
      data: market.data,
      source: market.source,
      fallbackFrom: market.fallbackFrom,
      cached: market.cached,
      stale: market.stale,
      timestamp: market.timestamp
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      error: "Market data unavailable"
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
    return res.status(503).json({
      success: false,
      error: "Market data unavailable"
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

    return res.status(503).json({
      success: false,
      error: "Market data unavailable"
    });
  }
});

module.exports = router;
