const express = require("express");
const router = express.Router();

const {
  signup,
  signin
} = require("../controllers/authController");

const { verifyToken } = require("../middlewares/auth");

router.post("/auth/signup", signup);
router.post("/auth/signin", signin);

router.get("/auth/me", verifyToken, async (req, res) => {
  try {
    const user = req.authUser;

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        walletAddress: user.walletAddress || null,
        walletUnlockedUntil: user.walletUnlockedUntil || null
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
});

module.exports = router;
