const express = require("express");
const router = express.Router();

const {
  connectWallet,
  getBalance,
  sendTransaction,
  generatePaymentLink
} = require("../controllers/walletController");

const { verifyToken } = require("../middleware/auth");

// ✅ Protected routes
router.post("/wallet/connect", verifyToken, connectWallet);
router.get("/wallet/balance", verifyToken, getBalance);
router.post("/wallet/send", verifyToken, sendTransaction);
router.post("/wallet/link", verifyToken, generatePaymentLink);

module.exports = router;
