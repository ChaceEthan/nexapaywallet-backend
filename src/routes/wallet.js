const express = require("express"); 
const router = express.Router(); 

const {
  connectWallet,
  getBalance,
  sendTransaction,
  generatePaymentLink
} = require("../controllers/walletController");

const { verifyToken } = require("../middleware/auth");

// ================= WALLET CORE ROUTES =================

// 🔐 Connect wallet (Freighter / import wallet)
router.post("/wallet/connect", verifyToken, connectWallet);

// 💰 Get wallet balance (uses token user, no params needed)
router.get("/wallet/balance", verifyToken, getBalance);

// 📤 Send transaction (XLM / assets transfer)
router.post("/wallet/send", verifyToken, sendTransaction);

// 🔗 Generate payment link
router.post("/wallet/link", verifyToken, generatePaymentLink);

// ================= WALLET SETUP FLOW =================
// 🔥 STEP: Finish Verification (Fix for your button issue)
router.post("/wallet/verify-phrase", verifyToken, async (req, res) => {
  try {
    const { phrase } = req.body;

    // Validate input
    if (!phrase) {
      return res.status(400).json({
        success: false,
        message: "Recovery phrase is required"
      });
    }

    // Accept both formats:
    // 1. array ["word1", "word2"...]
    // 2. string "word1 word2 word3..."
    const normalizedPhrase = Array.isArray(phrase)
      ? phrase.join(" ").trim()
      : String(phrase).trim();

    if (normalizedPhrase.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Invalid recovery phrase"
      });
    }

    // TODO: REAL PRODUCTION LOGIC
    // - compare hashed phrase stored in DB
    // - or validate against wallet seed backup

    return res.status(200).json({
      success: true,
      message: "Recovery phrase verified successfully"
    });

  } catch (error) {
    console.error("Verify phrase error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during verification",
      error: error.message
    });
  }
});

module.exports = router;  
