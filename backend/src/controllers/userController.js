const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/apiResponse");
const User = require("../models/User");

/**
 * @description Get total registered users
 * @route GET /api/users/count
 */
const getUserCount = asyncHandler(async (req, res) => {
  const count = await User.countDocuments();

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
