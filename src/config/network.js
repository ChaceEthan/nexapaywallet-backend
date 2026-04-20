/**
 * Stellar Network Configuration
 * Toggle between testnet (development) and mainnet (production)
 */

const NETWORK_CONFIG = {
  testnet: {
    name: "Testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-rpc-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    chainId: 0 // Testnet chain ID
  },
  mainnet: {
    name: "Public Global Stellar Network ; September 2015",
    horizonUrl: "https://horizon.stellar.org",
    sorobanRpcUrl: "https://soroban-rpc.stellar.org",
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    chainId: 0 // Mainnet chain ID
  }
};

// Get active network based on environment
function getNetwork() {
  const env = process.env.STELLAR_NETWORK || "testnet";
  const config = NETWORK_CONFIG[env];
  
  if (!config) {
    throw new Error(`Invalid STELLAR_NETWORK: ${env}. Must be 'testnet' or 'mainnet'`);
  }
  
  return config;
}

// Get Horizon URL
function getHorizonUrl() {
  return getNetwork().horizonUrl;
}

// Get Soroban RPC URL
function getSorobanRpcUrl() {
  return getNetwork().sorobanRpcUrl;
}

// Get network passphrase
function getNetworkPassphrase() {
  return getNetwork().networkPassphrase;
}

// Validate if address is valid Stellar address format
function isValidStellarAddress(address) {
  if (!address || typeof address !== "string") return false;
  
  // Stellar addresses (public keys) start with 'G' and are 56 characters
  // Stellar secret keys start with 'S' and are 56 characters
  const stellarAddressRegex = /^[GB][A-Z2-7]{54}$/;
  const stellarSecretRegex = /^S[A-Z2-7]{55}$/;
  
  return stellarAddressRegex.test(address) || stellarSecretRegex.test(address);
}

module.exports = {
  NETWORK_CONFIG,
  getNetwork,
  getHorizonUrl,
  getSorobanRpcUrl,
  getNetworkPassphrase,
  isValidStellarAddress
};
