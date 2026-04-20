/**
 * Wallet Profile Service
 * Manages wallet identity resolution (address → name mapping)
 * Eliminates "Unknown" wallet names in transaction history
 */

const WalletProfile = require("../models/WalletProfile");
const { isValidStellarAddress } = require("../config/network");

/**
 * Create or update a wallet profile
 * 
 * @param {string} address - Stellar address
 * @param {string} name - Display name
 * @param {string} userId - Optional user ID for linking
 * @returns {object} Created/updated profile
 */
async function createOrUpdateProfile(address, name, userId = null) {
  if (!isValidStellarAddress(address)) {
    throw new Error("Invalid Stellar address format");
  }

  if (!name || name.trim().length === 0) {
    throw new Error("Name is required");
  }

  const profile = await WalletProfile.findOneAndUpdate(
    { address: address.toUpperCase() },
    {
      address: address.toUpperCase(),
      name: name.trim(),
      userId: userId || undefined
    },
    { upsert: true, new: true }
  );

  return profile;
}

/**
 * Get wallet profile by address
 * 
 * @param {string} address - Stellar address
 * @returns {object|null} Profile or null if not found
 */
async function getProfileByAddress(address) {
  if (!isValidStellarAddress(address)) {
    return null;
  }

  const profile = await WalletProfile.findOne({
    address: address.toUpperCase()
  });

  return profile;
}

/**
 * Resolve name for address
 * Returns name if profile exists, otherwise "Unknown"
 * 
 * @param {string} address - Stellar address
 * @returns {string} Display name or "Unknown"
 */
async function resolveName(address) {
  const profile = await getProfileByAddress(address);
  return profile ? profile.name : "Unknown";
}

/**
 * Batch resolve names for multiple addresses
 * Returns map of address → name
 * 
 * @param {array} addresses - Array of Stellar addresses
 * @returns {object} Map of address → name
 */
async function resolveNames(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return {};
  }

  const validAddresses = addresses.filter(isValidStellarAddress).map(a => a.toUpperCase());
  
  const profiles = await WalletProfile.find({
    address: { $in: validAddresses }
  });

  const nameMap = {};
  
  // First, add all resolved names
  for (const profile of profiles) {
    nameMap[profile.address] = profile.name;
  }

  // Then, set "Unknown" for unresolved addresses
  for (const address of validAddresses) {
    if (!nameMap[address]) {
      nameMap[address] = "Unknown";
    }
  }

  return nameMap;
}

/**
 * Get all profiles for a user
 * 
 * @param {string} userId - User ID
 * @returns {array} Array of profiles
 */
async function getProfilesByUserId(userId) {
  const profiles = await WalletProfile.find({ userId });
  return profiles;
}

/**
 * Get profile with full details
 * Used for resolve-address API
 * 
 * @param {string} address - Stellar address
 * @returns {object} Profile details or null
 */
async function getProfileDetails(address) {
  if (!isValidStellarAddress(address)) {
    return {
      address,
      isValid: false,
      name: null,
      accountStatus: null,
      message: "Invalid Stellar address format"
    };
  }

  const profile = await getProfileByAddress(address);

  if (!profile) {
    return {
      address: address.toUpperCase(),
      isValid: true,
      name: "Unknown",
      accountStatus: "unknown",
      message: "Wallet not registered in system"
    };
  }

  return {
    address: profile.address,
    isValid: true,
    name: profile.name,
    description: profile.description || "",
    type: profile.type,
    accountStatus: profile.accountStatus,
    isVerified: profile.isVerified,
    createdAt: profile.createdAt
  };
}

/**
 * Delete a wallet profile
 * 
 * @param {string} address - Stellar address
 * @returns {boolean} True if deleted, false if not found
 */
async function deleteProfile(address) {
  const result = await WalletProfile.deleteOne({
    address: address.toUpperCase()
  });

  return result.deletedCount > 0;
}

module.exports = {
  createOrUpdateProfile,
  getProfileByAddress,
  resolveName,
  resolveNames,
  getProfilesByUserId,
  getProfileDetails,
  deleteProfile
};
