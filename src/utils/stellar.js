function buildHorizonUrl(path = "") {
  const baseUrl = process.env.SOROBAN_NETWORK === "mainnet" 
    ? "https://horizon.stellar.org" 
    : "https://horizon-testnet.stellar.org";
  return baseUrl + path;
}

function buildSorobanRpcUrl() {
  return process.env.SOROBAN_RPC_URL || "https://soroban-rpc.stellar.org";
}

module.exports = {
  buildHorizonUrl,
  buildSorobanRpcUrl,
};
