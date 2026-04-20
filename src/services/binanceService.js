/**
 * Binance Market Service
 * Handles cryptocurrency market data from Binance API
 */

const axios = require("axios");

const BINANCE_API_URL = "https://api.binance.com/api/v3/ticker/price";
const REQUEST_TIMEOUT = 5000; // 5 seconds timeout

/**
 * Fetch XLM (Stellar Lumens) price from Binance
 * Returns current USDT price
 *
 * @returns {Promise<Object>} { symbol: "XLMUSDT", price: "..." }
 */
async function getXLMPrice() {
  try {
    const response = await axios.get(BINANCE_API_URL, {
      params: {
        symbol: "XLMUSDT"
      },
      timeout: REQUEST_TIMEOUT
    });

    return {
      success: true,
      symbol: response.data.symbol,
      price: response.data.price,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("❌ Binance API Error (getXLMPrice):", error.message);
    return {
      success: false,
      error: "Failed to fetch XLM price",
      message: error.message
    };
  }
}

/**
 * Fetch multiple cryptocurrency market prices from Binance
 * Returns array of common trading pairs
 *
 * @returns {Promise<Object>} { success, data: [...], timestamp }
 */
async function getMarketPrices() {
  try {
    // Fetch all prices
    const response = await axios.get(BINANCE_API_URL, {
      timeout: REQUEST_TIMEOUT
    });

    // Return only common market pairs for optimization
    const commonSymbols = [
      "BTCUSDT",
      "ETHUSDT",
      "XLMUSDT",
      "XRPUSDT",
      "LTCUSDT",
      "ADAUSDT",
      "DOGEUSDT",
      "BNBUSDT"
    ];

    const filteredPrices = response.data.filter(item =>
      commonSymbols.includes(item.symbol)
    );

    return {
      success: true,
      count: filteredPrices.length,
      data: filteredPrices,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("❌ Binance API Error (getMarketPrices):", error.message);
    return {
      success: false,
      error: "Failed to fetch market prices",
      message: error.message
    };
  }
}

/**
 * Fetch all cryptocurrency prices from Binance
 * @returns {Promise<Array>} Array of price objects with symbol and price
 */
async function getPrices() {
  try {
    const response = await axios.get(BINANCE_API_URL, {
      timeout: REQUEST_TIMEOUT
    });

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
  getXLMPrice,
  getMarketPrices,
  getPrices,
  getSymbolPrice
};
