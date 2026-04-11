const express = require("express");
const router = express.Router();

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