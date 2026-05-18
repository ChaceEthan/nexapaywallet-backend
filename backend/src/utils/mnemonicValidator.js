// @ts-nocheck
/**
 * BIP39 Mnemonic Validator
 * Validates and normalizes recovery phrases
 */

const bip39 = require("bip39");

/**
 * Validate and normalize a recovery phrase
 * Ensures it's a valid BIP39 mnemonic
 */
function validateRecoveryPhrase(phrase) {
  if (!phrase || typeof phrase !== "string") {
    throw new Error("Recovery phrase must be a non-empty string");
  }

  // Normalize: lowercase, trim, single spaces
  const normalized = String(phrase)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .join(" ");

  if (normalized.length === 0) {
    throw new Error("Recovery phrase cannot be empty");
  }

  const wordCount = normalized.split(" ").length;

  // BIP39 supports 12, 15, 18, 21, or 24 words
  if (![12, 15, 18, 21, 24].includes(wordCount)) {
    throw new Error(`Recovery phrase must contain 12, 15, 18, 21, or 24 words. Received ${wordCount} words.`);
  }

  // Validate checksum
  if (!bip39.validateMnemonic(normalized)) {
    throw new Error("Recovery phrase has an invalid checksum. Please check for typos.");
  }

  return normalized;
}

/**
 * Validate phrase array format
 * Converts array to string and validates
 */
function validateRecoveryPhraseArray(phraseArray) {
  if (!Array.isArray(phraseArray)) {
    throw new Error("Recovery phrase must be an array or string");
  }

  const phrase = phraseArray
    .map(word => String(word || "").trim())
    .filter(word => word.length > 0)
    .join(" ");

  return validateRecoveryPhrase(phrase);
}

/**
 * Validate phrase from request (string or array)
 */
function normalizeAndValidatePhrase(phraseInput) {
  if (Array.isArray(phraseInput)) {
    return validateRecoveryPhraseArray(phraseInput);
  }

  return validateRecoveryPhrase(phraseInput);
}

/**
 * Check if a string is a valid BIP39 mnemonic
 * Returns boolean instead of throwing
 */
function isValidMnemonic(phrase) {
  try {
    validateRecoveryPhrase(phrase);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  validateRecoveryPhrase,
  validateRecoveryPhraseArray,
  normalizeAndValidatePhrase,
  isValidMnemonic
};
