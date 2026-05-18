const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/apiResponse");
const User = require("../models/User");

function isDatabaseUnavailable(error) {
  return [
    "MongoServerSelectionError",
    "MongooseServerSelectionError"
  ].includes(error?.name) || /buffering timed out|not connected|topology|initial connection/i.test(error?.message || "");
}

/**
 * @description Get total registered users
 * @route GET /api/users/count
 */
const getUserCount = asyncHandler(async (req, res) => {
  let count = 0;
  let degraded = false;

  try {
    count = await User.countDocuments();
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    degraded = true;
    console.warn("User count degraded:", error.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalUsers: count,
        degraded
      },
      "User count retrieved successfully"
    )
  );
});

module.exports = {
  getUserCount,
};
