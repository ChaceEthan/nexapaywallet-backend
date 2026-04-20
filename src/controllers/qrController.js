/**
 * QR Controller
 * Handles QR code scanning and address resolution
 */

const WalletProfile = require("../models/WalletProfile");
const { validateAddressString } = require("../utils/addressValidator");

/**
 * Resolve QR scanned address to wallet profile
 * 
 * GET /api/qr/resolve/:address
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function resolveAddress(req, res) {
  try {
    const { address } = req.params;

    console.log(`📱 QR Resolve called for: ${address}`);

    // Validate address format
    const validation = validateAddressString(address);

    if (!validation.isValid) {
      console.log(`❌ Invalid address format: ${address}`);
      return res.status(400).json({
        isValid: false,
        message: validation.error || "Invalid address format"
      });
    }

    const normalizedAddress = address.trim().toUpperCase();

    // Search for wallet profile in MongoDB
    const profile = await WalletProfile.findOne({
      address: normalizedAddress
    });

    // Return consistent response
    const response = {
      isValid: true,
      address: normalizedAddress
    };

    if (profile) {
      console.log(`✅ Wallet found: ${profile.name}`);
      response.name = profile.name;
      response.type = profile.type;
      response.accountStatus = profile.accountStatus;
    } else {
      console.log(`⚠️ Wallet not registered: ${normalizedAddress}`);
      response.name = null;
    }

    res.json(response);

  } catch (error) {
    console.error("❌ QR Resolve Error:", error.message);
    res.status(500).json({
      isValid: false,
      message: "Server error during address resolution"
    });
  }
}

module.exports = {
  resolveAddress
};
