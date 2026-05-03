const { isValidStellarAddress: isValidNetworkAddress } = require("./network");

/**
 * Validate if string is a valid Stellar address
 * Stellar public keys: Start with "G", 56 characters, base32 encoded
 * 
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid Stellar address format
 */
function isValidStellarAddress(address) {
  return isValidNetworkAddress(address);
}

/**
 * Safely validate address with error catching
 * @param {string} address - Address to validate
 * @returns {Object} { isValid: boolean, error?: string }
 */
function validateAddressString(address) {
  try {
    if (!address) {
      return { isValid: false, error: "Address is required" };
    }

    if (typeof address !== "string") {
      return { isValid: false, error: "Address must be a string" };
    }

    const normalized = address.trim().toUpperCase();

    if (normalized.length !== 56) {
      return { isValid: false, error: "Address must be 56 characters" };
    }

    if (!normalized.startsWith("G")) {
      return { isValid: false, error: "Address must start with G" };
    }

    if (!isValidNetworkAddress(normalized)) {
      return { isValid: false, error: "Invalid Stellar address checksum" };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: "Address validation error" };
  }
}

module.exports = {
  isValidStellarAddress,
  validateAddressString
};
