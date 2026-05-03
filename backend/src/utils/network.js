const axios = require("axios");
const StellarSDK = require("@stellar/stellar-sdk");

const NETWORK_CONFIG = {
  testnet: {
    name: "Testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-rpc-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    chainId: 0
  },
  mainnet: {
    name: "Public Global Stellar Network",
    horizonUrl: "https://horizon.stellar.org",
    sorobanRpcUrl: "https://soroban-rpc.stellar.org",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    chainId: 0
  }
};

function getNetwork() {
  const env = (process.env.STELLAR_NETWORK || "testnet").toLowerCase();
  const config = NETWORK_CONFIG[env];

  if (!config) {
    throw new Error(`Invalid STELLAR_NETWORK: ${env}. Must be 'testnet' or 'mainnet'`);
  }

  return config;
}

function getHorizonUrl() {
  return process.env.HORIZON_URL?.trim() || getNetwork().horizonUrl;
}

function getSorobanRpcUrl() {
  return process.env.SOROBAN_RPC_URL?.trim() || getNetwork().sorobanRpcUrl;
}

function getNetworkPassphrase() {
  return getNetwork().networkPassphrase;
}

function isValidStellarAddress(address) {
  if (!address || typeof address !== "string") return false;
  return StellarSDK.StrKey.isValidEd25519PublicKey(address.trim().toUpperCase());
}

function isValidStellarSecret(secret) {
  if (!secret || typeof secret !== "string") return false;
  return StellarSDK.StrKey.isValidEd25519SecretSeed(secret.trim().toUpperCase());
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getHorizonHealth(options = {}) {
  const horizonUrl = getHorizonUrl();
  const timeout = Math.max(Number(process.env.HORIZON_TIMEOUT_MS || options.timeout || 5000), 1000);
  const retries = Math.max(Number(process.env.HORIZON_RETRY_COUNT || options.retries || 1), 0);
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await axios.get(`${horizonUrl}/`, {
        timeout,
        validateStatus: status => status >= 200 && status < 500
      });

      return {
        success: response.status < 400,
        status: response.status < 400 ? "online" : "degraded",
        network: getNetwork().name,
        horizonUrl,
        latestLedger: response.data?.history_latest_ledger || null,
        fallback: false,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(250 * (attempt + 1));
      }
    }
  }

  return {
    success: false,
    status: "offline",
    network: getNetwork().name,
    horizonUrl,
    latestLedger: null,
    fallback: true,
    message: "Stellar Horizon temporarily unavailable",
    error: lastError?.message || "Unknown Horizon error",
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  NETWORK_CONFIG,
  getNetwork,
  getHorizonUrl,
  getSorobanRpcUrl,
  getNetworkPassphrase,
  getHorizonHealth,
  isValidStellarAddress,
  isValidStellarSecret
};
