<<<<<<< HEAD
/**
 * Market Routes
 * Cryptocurrency market data and price endpoints
 */

const express = require("express");
const router = express.Router();

const { 
  getXLMPrice, 
  getMarketPrices,
  getPrices, 
  getSymbolPrice 
} = require("../services/binanceService");

// ================= MARKET ENDPOINTS =================

/**
 * GET /api/market/xlm
 * Get current XLM (Stellar Lumens) price in USDT
 * No authentication required (public endpoint)
 * 
 * Returns: { success, symbol, price, timestamp }
 */
router.get("/market/xlm", async (req, res) => {
  try {
    const priceData = await getXLMPrice();
    
    if (!priceData.success) {
      return res.status(503).json(priceData);
    }

    res.json(priceData);
  } catch (error) {
    console.error("❌ XLM price error:", error.message);
    res.status(503).json({
      success: false,
      error: "Market data unavailable"
    });
  }
});

/**
 * GET /api/market
 * Get common cryptocurrency market prices (BTC, ETH, XLM, etc.)
 * No authentication required (public endpoint)
 * 
 * Returns: { success, count, data: [...], timestamp }
 */
router.get("/market", async (req, res) => {
  try {
    const marketData = await getMarketPrices();
    
    if (!marketData.success) {
      return res.status(503).json(marketData);
    }

    res.json(marketData);
  } catch (error) {
    console.error("❌ Market prices error:", error.message);
    res.status(503).json({
      success: false,
      error: "Market data unavailable"
    });
  }
});

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
      count: prices.length,
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
 * 
 * Returns: { success, data: { symbol, price }, timestamp }
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
=======
const express = require("express");
const router = express.Router();
const { getMarketPrices } = require("../controllers/marketController");

// ================= MARKET ROUTES =================
router.get("/prices", getMarketPrices);
>>>>>>> 81195e5 (Fix backend: Binance service + MongoDB + market cleanup)

module.exports = router;
