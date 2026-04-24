const { ApiError } = require("../utils/apiError");
const User = require("../models/User");

/**
 * @description Service for wallet related operations
 */
class WalletService {
  /**
   * @description Link a wallet address to a user
   * @param {string} userId - ID of the user
   * @param {string} address - Wallet address to link
   */
  async linkWallet(userId, address) {
    if (!address) {
      throw new ApiError(400, "Wallet address is required");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Check if address is already linked to another user
    const existingUser = await User.findOne({ walletAddress: address });
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new ApiError(400, "Wallet address already linked to another account");
    }

    user.walletAddress = address;
    await user.save();

    return user;
  }

  /**
   * @description Get user wallet details
   * @param {string} userId 
   */
  async getWalletDetails(userId) {
    const user = await User.findById(userId).select("walletAddress");
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    return user.walletAddress;
  }
}

module.exports = new WalletService();
