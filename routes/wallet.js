const express = require("express");
const router = express.Router();
const { connectWallet } = require("../controllers/walletController");

router.post("/connect-wallet", connectWallet);

module.exports = router;
