const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/apiResponse");
const Wallet = require("../models/Wallet");

/**
 * @description Get total unique active users (wallets)
 * @route GET /api/v1/users/count
 */
const getUserCount = asyncHandler(async (req, res) => {
  // Count unique active wallets (not deleted)
  const count = await Wallet.countDocuments({ isDeleted: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalUsers: count,
      },
      "User count retrieved successfully"
    )
  );
});

module.exports = {
  getUserCount,
};
