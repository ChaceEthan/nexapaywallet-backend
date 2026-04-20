const express = require("express");
const router = express.Router();

const { getPrices, getSymbolPrice } = require("../services/binance");

// ================= MARKET PRICES =================

/**
 * GET /api/market/prices
 * Fetch all cryptocurrency prices from Binance
 * No authentication required (public endpoint)
 */
router.get("/market/prices", async (req, res) => {
  try {
    const prices = await getPrices();
    
    res.json({
      success: true,
      data: prices,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Market prices error:", error.message);
    res.status(503).json({
      success: false,
      error: "Market data unavailable"
    });
  }
});

/**
 * GET /api/market/price/:symbol
 * Fetch specific trading pair price from Binance
 * No authentication required (public endpoint)
 * 
 * @param {string} symbol - Trading pair (e.g., BTCUSDT, ETHUSDT)
 */
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

    res.json({
      success: true,
      data: priceData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Market price error:", error.message);
    
    if (error.message.includes("Invalid trading pair")) {
      return res.status(400).json({
        success: false,
        error: "Invalid trading pair symbol"
      });
    }

    res.status(503).json({
      success: false,
      error: "Market data unavailable"
    });
  }
});

module.exports = router;
