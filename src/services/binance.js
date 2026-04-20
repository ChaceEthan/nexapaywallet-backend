const axios = require("axios");

const BINANCE_API_URL = "https://api.binance.com/api/v3/ticker/price";
const REQUEST_TIMEOUT = 5000; // 5 seconds timeout

/**
 * Fetch all cryptocurrency prices from Binance
 * @returns {Promise<Array>} Array of price objects with symbol and price
 */
async function getPrices() {
  try {
    const response = await axios.get(BINANCE_API_URL, {
      timeout: REQUEST_TIMEOUT
    });

    // Filter only common trading pairs (optional, returns all by default)
    return response.data;
  } catch (error) {
    console.error("❌ Binance API Error (getPrices):", error.message);
    throw new Error("Market data unavailable");
  }
}

/**
 * Fetch specific symbol price from Binance
 * @param {string} symbol - Trading pair symbol (e.g., 'BTCUSDT')
 * @returns {Promise<Object>} Price object with symbol and price
 */
async function getSymbolPrice(symbol) {
  try {
    if (!symbol || typeof symbol !== "string") {
      throw new Error("Invalid symbol provided");
    }

    const normalizedSymbol = symbol.toUpperCase().trim();
    
    const response = await axios.get(BINANCE_API_URL, {
      params: {
        symbol: normalizedSymbol
      },
      timeout: REQUEST_TIMEOUT
    });

    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      throw new Error("Invalid trading pair symbol");
    }
    console.error("❌ Binance API Error (getSymbolPrice):", error.message);
    throw new Error("Market data unavailable");
  }
}

module.exports = {
  getPrices,
  getSymbolPrice
};
