/**
 * Address Validator Utility
 * Validates Stellar addresses safely
 */

/**
 * Validate if string is a valid Stellar address
 * Stellar public keys: Start with "G", 56 characters, base32 encoded
 * 
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid Stellar address format
 */
function isValidStellarAddress(address) {
  if (!address) return false;
  if (typeof address !== "string") return false;
  
  // Must be 56 characters
  if (address.length !== 56) return false;
  
  // Must start with "G" (public key) or "S" (secret key)
  if (!address.startsWith("G") && !address.startsWith("S")) return false;
  
  // Valid base32 characters: A-Z, 2-7 (except I, O, l, o, 1)
  const validPattern = /^[GS][A-Z2-7]{55}$/;
  return validPattern.test(address);
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

    if (!normalized.startsWith("G") && !normalized.startsWith("S")) {
      return { isValid: false, error: "Address must start with G or S" };
    }

    const validPattern = /^[GS][A-Z2-7]{55}$/;
    if (!validPattern.test(normalized)) {
      return { isValid: false, error: "Invalid Stellar address format" };
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
