// @ts-nocheck
const User = require("../models/User");
const axios = require("axios");
 
// CONNECT WALLET
async function connectWallet(req, res) {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet address required" });
    }

    const userId = req.user.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { walletAddress },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message: "Wallet connected",
      walletAddress: user.walletAddress
    });

  } catch (err) {
    res.status(500).json({ message: "Connect error", error: err.message });
  }
}

// GET BALANCE (SAFE VERSION)
async function getBalance(req, res) {
  try {
    const user = await User.findById(req.user.id);

    if (!user || !user.walletAddress) {
      return res.status(400).json({ message: "No wallet connected" });
    }

    const response = await axios.get(
      `https://horizon-testnet.stellar.org/accounts/${user.walletAddress}`
    );

    
    const balance = response.data.balances.find(
      (b) => b.asset_type === "native"
    );

    res.json({
      balance: balance ? balance.balance : "0",
      account: user.walletAddress
    });

  } catch (err) {
     res.status(500).json({ message: "Balance error", error: err.message });
  }
}

// SEND TRANSACTION (BASIC)
async function sendTransaction(req, res) {
  try {
    const { toPublicKey, amount } = req.body;

    if (!toPublicKey || !amount) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findById(req.user.id);

    if (!user.walletAddress) {
      return res.status(400).json({ message: "No wallet connected" });
    }

    // NOTE: actual signing will be frontend (Freighter)
    res.json({
      message: "Transaction request created",
      from: user.walletAddress,
      to: toPublicKey,
      amount
    });

  } catch (err) {
    res.status(500).json({ message: "Transaction error", error: err.message });
  }
}

// PAYMENT LINK
async function generatePaymentLink(req, res) {
  try {
    const { amount } = req.body;

    const user = await User.findById(req.user.id);

    if (!user.walletAddress) {
      return res.status(400).json({ message: "No wallet connected" });
    }

    const link = `web+stellar:pay?destination=${user.walletAddress}&amount=${amount}&asset_code=XLM`;

    res.json({
      paymentLink: link
    });

  } catch (err) {
    res.status(500).json({ message: "Link error", error: err.message });
  }
}

module.exports = {
  connectWallet,
  getBalance,
  sendTransaction,
  generatePaymentLink
}; 