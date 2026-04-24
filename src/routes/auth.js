const express = require("express");
const router = express.Router();
<<<<<<< HEAD

const {
  signup,
  signin
} = require("../controllers/authController");

const { verifyToken } = require("../middleware/auth");
const User = require("../models/User");

// ================= AUTH =================
router.post("/auth/signup", signup);
router.post("/auth/signin", signin);

// ================= GET CURRENT USER =================
router.get("/auth/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        walletAddress: user.walletAddress || null
      }
    });

  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});

module.exports = router; 
=======
const { signup, signin } = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/apiResponse");
const { ApiError } = require("../utils/apiError");
const User = require("../models/User");

// ================= AUTH ROUTES =================
router.post("/signup", signup);
router.post("/signin", signin);

// ================= ME ROUTE =================
router.get("/me", verifyToken, asyncHandler(async (req, res) => {
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
>>>>>>> 81195e5 (Fix backend: Binance service + MongoDB + market cleanup)
