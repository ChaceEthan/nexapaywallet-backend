const express = require("express");
const router = express.Router();

const {
  connectWallet,
  getBalance,
  sendTransaction,
  generatePaymentLink
} = require("../controllers/walletController");

const { verifyToken } = require("../middleware/auth");

// ================= SECURITY ROUTES =================

// Connect wallet (user logged in only)
router.post("/wallet/connect", verifyToken, connectWallet);

// Get balance (NO params, uses token user)
router.get("/wallet/balance", verifyToken, getBalance);

// Send transaction (secure)
router.post("/wallet/send", verifyToken, sendTransaction);

// Generate payment link
router.post("/wallet/link", verifyToken, generatePaymentLink);

module.exports = router;
