const express = require("express");
const router = express.Router();
const { connectWallet, getBalance, sendTransaction } = require("../controllers/walletController");

router.post("/wallet/connect", connectWallet);
router.get("/wallet/balance/:publicKey", getBalance);
router.post("/wallet/send", sendTransaction);

module.exports = router;
