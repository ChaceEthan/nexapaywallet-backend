// f:/nexapaywallet-backend2/services/coingeckoService.js
const axios = require('axios');
const marketCache = require('../cache/marketCache'); // Path assumes 'services' and 'cache' are sibling directories at the project root

// --- Configuration ---
const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';
const API_TIMEOUT_MS = 10000; // Increased timeout to 10 seconds (within 8-12s recommendation)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500; // 1.5 seconds delay between retries

// Helper function for delays
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches market data for a specific cryptocurrency from CoinGecko API.
 * Includes retry logic and graceful error handling.
 * @param {string} coinId - The ID of the cryptocurrency (e.g., 'bitcoin', 'ethereum').
 * @returns {Promise<{success: boolean, data: object|null, message: string|null}>}
 */
async function fetchCoinGeckoDataWithRetry(coinId) {
    const url = `${COINGECKO_API_BASE_URL}/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await axios.get(url, { timeout: API_TIMEOUT_MS });
            if (response.status === 200 && response.data && Object.keys(response.data).length > 0) {
                // API success
                return { success: true, data: response.data, message: null };
            } else {
                // CoinGecko API might return 200 with empty data if coinId is invalid or temporary issue
                console.warn(`CoinGecko API returned unexpected data for ${coinId} on attempt ${i + 1}. Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
            }
        } catch (error) {
            console.error(`Attempt ${i + 1} to fetch CoinGecko data for ${coinId} failed:`, error.message);
            // Log specific error details without revealing sensitive info
            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNABORTED') {
                    console.error(`Timeout (${API_TIMEOUT_MS}ms) reached for ${coinId}.`);
                } else if (error.response) {
                    console.error(`CoinGecko API responded with error status ${error.response.status} for ${coinId}.`);
                } else if (error.request) {
                    console.error(`No response received from CoinGecko API for ${coinId}.`);
                } else {
                    console.error(`Error setting up request to CoinGecko for ${coinId}: ${error.message}`);
                }
            }

            if (i < MAX_RETRIES - 1) {
                await delay(RETRY_DELAY_MS); // Wait before retrying
            }
        }
    }

    return { success: false, data: null, message: `Failed to fetch fresh data for ${coinId} after ${MAX_RETRIES} attempts.` };
}

/**
 * Main function to get market data, incorporating cache, retry, and graceful failure.
 * @param {string} coinId - The ID of the cryptocurrency.
 * @returns {Promise<{success: boolean, data: object|null, message: string}>}
 */
async function getMarketData(coinId) {
    const cacheKey = `coingecko:${coinId}`;

    // 1. Check cache first for fresh data
    const cachedFreshData = marketCache.get(cacheKey, true); // true for fresh check
    if (cachedFreshData) {
        return { success: true, data: cachedFreshData, message: "Data from fresh cache." };
    }

    // 2. If no fresh cache, attempt to fetch from CoinGecko API with retries
    const apiResult = await fetchCoinGeckoDataWithRetry(coinId);

    if (apiResult.success) {
        // 3. API succeeded: Update cache and return data
        marketCache.set(cacheKey, apiResult.data);
        return { success: true, data: apiResult.data, message: "Data from CoinGecko API." };
    } else {
        // 4. API failed: Attempt to use stale cache
        console.warn(`CoinGecko API failed for ${coinId}. Attempting to use stale cache.`);
        const cachedStaleData = marketCache.get(cacheKey, false); // false for stale check
        if (cachedStaleData) {
            return { success: true, data: cachedStaleData, message: "Data from stale cache fallback." };
        } else {
            // 5. Both API and cache failed: Return graceful failure response
            console.error(`Both CoinGecko API and cache failed for ${coinId}.`);
            return { success: false, data: null, message: "Market data temporarily unavailable." };
        }
    }
}

module.exports = {
    getMarketData,
};