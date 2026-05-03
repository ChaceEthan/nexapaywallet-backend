const express = require("express");
const router = express.Router();

const {
  createWallet,
  importWallet,
  connectWallet,
  switchWallet,
  disconnectWallet,
  getBalance,
  unlockWallet,
  lockWallet,
  verifyPhrase,
  sendTransaction,
  generatePaymentLink
} = require("../controllers/walletController");

const { verifyToken, requireUnlockedWallet } = require("../middlewares/auth");

router.post("/wallet/create", verifyToken, createWallet);
router.post("/wallet/import", verifyToken, importWallet);
router.post("/wallet/connect", verifyToken, connectWallet);
router.post("/wallet/switch", verifyToken, switchWallet);
router.post("/wallet/disconnect", verifyToken, disconnectWallet);
router.get("/wallet/balance", verifyToken, getBalance);
router.post("/wallet/unlock", verifyToken, unlockWallet);
router.post("/wallet/lock", verifyToken, lockWallet);
router.post("/wallet/send", verifyToken, requireUnlockedWallet, sendTransaction);
router.post("/wallet/link", verifyToken, generatePaymentLink);
router.post("/wallet/verify-phrase", verifyToken, verifyPhrase);

module.exports = router;
