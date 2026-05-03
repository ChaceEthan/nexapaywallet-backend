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

module.exports = {
  NETWORK_CONFIG,
  getNetwork,
  getHorizonUrl,
  getSorobanRpcUrl,
  getNetworkPassphrase,
  isValidStellarAddress,
  isValidStellarSecret
};
