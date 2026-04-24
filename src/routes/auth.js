const express = require("express");
const router = express.Router();  
const { signup, signin } = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/apiResponse");
const { ApiError } = require("../utils/apiError");
const User = require("../models/User");

// ================= AUTH ROUTES =================
router.post("/auth/signup", signup);
router.post("/auth/signin", signin);

// ================= ME ROUTE =================
router.get("/auth/me", verifyToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: user._id,
          email: user.email,
          walletAddress: user.walletAddress || null,
        },
      },
      "User details fetched successfully"
    )
  );
}));

module.exports = router;
 