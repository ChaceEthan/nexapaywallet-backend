const User = require("../models/User");
const axios = require("axios");

// ================= GET BALANCE =================
async function getBalance(req, res) {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user || !user.walletAddress) {
      return res.status(400).json({ message: "No wallet connected" });
    }

    const response = await axios.get(
      `https://horizon-testnet.stellar.org/accounts/${user.walletAddress}`
    );

    const balance = response.data.balances.find(
      b => b.asset_type === "native"
    );

    res.json({
      balance: balance ? balance.balance : "0",
      account: user.walletAddress
    });

  } catch (err) {
    res.status(500).json({
      message: "Balance error",
      error: err.message
    });
  }
}

// ================= CONNECT WALLET =================
async function connectWallet(req, res) {
  try {
    const userId = req.user.id;
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet address required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { walletAddress },
      { new: true }
    );

    res.json({
      message: "Wallet connected",
      walletAddress: user.walletAddress
    });

  } catch (err) {
    res.status(500).json({
      message: "Connect error",
      error: err.message
    });
  }
}

// ================= SEND TRANSACTION =================
async function sendTransaction(req, res) {
  try {
    const { toPublicKey, amount } = req.body;

    if (!toPublicKey || !amount) {
      return res.status(400).json({ message: "Missing fields" });
    }

    res.json({
      message: "Transaction prepared",
      toPublicKey,
      amount
    });

  } catch (err) {
    res.status(500).json({
      message: "Transaction error",
      error: err.message
    });
  }
}

// ================= PAYMENT LINK =================
async function generatePaymentLink(req, res) {
  try {
    const { destination, amount } = req.body;

    const link = `web+stellar:pay?destination=${destination}&amount=${amount}&asset_code=XLM`;

    res.json({
      paymentLink: link
    });

  } catch (err) {
    res.status(500).json({
      message: "Link error",
      error: err.message
    });
  }
}

// ================= EXPORT ALL =================
module.exports = {
  getBalance,
  connectWallet,
  sendTransaction,
  generatePaymentLink
};