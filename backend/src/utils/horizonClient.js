// @ts-nocheck
/**
 * Centralized Horizon Client Manager
 * Provides retry logic, timeout handling, and fallback support
 * Prevents backend crashes from Horizon failures
 */

const axios = require("axios");
const { NETWORK_CONFIG, getHorizonUrl, getNetwork } = require("./network");

const HORIZON_TIMEOUT_MS = Math.max(Number(process.env.HORIZON_TIMEOUT_MS || 8000), 1000);
const HORIZON_RETRY_COUNT = Math.max(Number(process.env.HORIZON_RETRY_COUNT || 2), 0);
const HORIZON_CACHE_TTL_MS = Math.max(Number(process.env.HORIZON_CACHE_TTL_MS || 30000), 5000);

let healthCache = null;
let accountCache = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeAddress(address) {
  return String(address || "").trim().toUpperCase();
}

function getHorizonConfig(networkInput) {
  const requestedNetwork = String(networkInput || "").trim().toLowerCase();

  if (requestedNetwork) {
    const config = NETWORK_CONFIG[requestedNetwork];
    if (!config) {
      const error = new Error("Invalid network. Must be testnet or mainnet.");
      error.statusCode = 400;
      throw error;
    }

    return {
      network: requestedNetwork,
      horizonUrl: process.env.HORIZON_URL?.trim() || config.horizonUrl
    };
  }

  const envNetwork = (process.env.STELLAR_NETWORK || "testnet").toLowerCase();
  getNetwork();
  return {
    network: envNetwork,
    horizonUrl: getHorizonUrl()
  };
}

function rememberHealth(status) {
  healthCache = {
    data: status,
    timestamp: Date.now()
  };
  return status;
}

function readHealthCache(network, horizonUrl, error) {
  if (!healthCache || Date.now() - healthCache.timestamp > HORIZON_CACHE_TTL_MS) {
    return null;
  }

  if (healthCache.data.network !== network || healthCache.data.horizon !== horizonUrl) {
    return null;
  }

  return {
    ...healthCache.data,
    success: true,
    online: false,
    mode: "cached",
    cached: true,
    stale: true,
    network,
    horizon: horizonUrl,
    error: error?.message || "Horizon unreachable",
    timestamp: new Date().toISOString()
  };
}

/**
 * Get Horizon health status with retry logic
 * Returns safe response even if Horizon fails
 */
async function getHealthStatus(options = {}) {
  try {
    const { horizonUrl, network } = getHorizonConfig(options.network);
    const timeout = options.timeout || HORIZON_TIMEOUT_MS;
    const retries = options.retries ?? HORIZON_RETRY_COUNT;

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${horizonUrl}/`, {
          timeout,
          validateStatus: () => true // Accept any status
        });
        const latency = Date.now() - startTime;

        if (response.status < 400) {
          return rememberHealth({
            success: true,
            online: true,
            mode: "live",
            network,
            horizon: horizonUrl,
            latency,
            latestLedger: response.data?.history_latest_ledger || null,
            timestamp: new Date().toISOString()
          });
        }

        return rememberHealth({
          success: true,
          online: true,
          mode: "degraded",
          network,
          horizon: horizonUrl,
          latency,
          httpStatus: response.status,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await sleep(500 * (attempt + 1));
        }
      }
    }

    const cached = readHealthCache(network, horizonUrl, lastError);
    if (cached) return cached;

    return {
      success: true,
      online: false,
      mode: "cached",
      network,
      horizon: horizonUrl,
      error: lastError?.message || "Horizon unreachable",
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Horizon health check failed:", error.message);
    return {
      success: true,
      online: false,
      mode: "error",
      network: (process.env.STELLAR_NETWORK || "testnet").toLowerCase(),
      error: error.message || "Health check failed",
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Fetch account details with caching and retry
 * Returns null instead of throwing on 404
 */
async function getAccountDetails(publicKey, options = {}) {
  const normalizedKey = normalizeAddress(publicKey);

  // Check cache
  if (accountCache.has(normalizedKey)) {
    const cached = accountCache.get(normalizedKey);
    if (Date.now() - cached.timestamp < HORIZON_CACHE_TTL_MS) {
      return cached.data;
    }
    accountCache.delete(normalizedKey);
  }

  const horizonUrl = getHorizonUrl();
  const timeout = options.timeout || HORIZON_TIMEOUT_MS;
  const retries = options.retries ?? HORIZON_RETRY_COUNT;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await axios.get(
        `${horizonUrl}/accounts/${normalizedKey}`,
        {
          timeout,
          validateStatus: status => status >= 200 && status < 500
        }
      );

      if (response.status === 404) {
        // Account not found - not an error
        return null;
      }

      if (response.status < 400) {
        // Cache successful response
        accountCache.set(normalizedKey, {
          data: response.data,
          timestamp: Date.now()
        });
        return response.data;
      }

      // Server error, retry
      lastError = response.data || response.statusText;
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
      }
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
      }
    }
  }

  throw new Error(`Failed to fetch account: ${lastError?.message || "Horizon unavailable"}`);
}

/**
 * Fetch transaction history with retry
 * Returns empty array on failure instead of throwing
 */
async function getTransactionHistory(publicKey, options = {}) {
  const normalizedKey = normalizeAddress(publicKey);
  const requestedLimit = Number(options.limit ?? 50);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 50, 1), 200);

  const horizonUrl = getHorizonUrl();
  const timeout = options.timeout || HORIZON_TIMEOUT_MS;
  const retries = options.retries ?? HORIZON_RETRY_COUNT;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await axios.get(
        `${horizonUrl}/accounts/${normalizedKey}/payments`,
        {
          params: { limit, order: "desc" },
          timeout,
          validateStatus: status => status >= 200 && status < 500
        }
      );

      if (response.status === 404) {
        // Account not found - return empty
        return [];
      }

      if (response.status < 400) {
        const records = response.data?._embedded?.records || response.data?.records || [];
        return Array.isArray(records) ? records : [];
      }

      // Server error, retry
      lastError = response.data || response.statusText;
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
      }
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
      }
    }
  }

  // Return empty instead of throwing
  console.error(`Transaction history failed for ${normalizedKey}:`, lastError?.message);
  return [];
}

/**
 * Clear caches (useful for testing or forced refresh)
 */
function clearCache() {
  healthCache = null;
  accountCache.clear();
}

module.exports = {
  getHealthStatus,
  getAccountDetails,
  getTransactionHistory,
  clearCache
};
