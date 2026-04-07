// @ts-nocheck
const User = require("../models/User");
const axios = require("axios");
const Transaction = require("../models/Transaction");

// CONNECT WALLET
async function connectWallet(req, res) {
  try {
    const { email, walletAddress } = req.body;

    if (!email || !walletAddress) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOneAndUpdate(
      { email },
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

// GET BALANCE
async function getBalance(req, res) {
  try {
    const { publicKey } = req.params;

    const response = await axios.get(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);

    const balance = response.data.balances.find(b => b.asset_type === "native");

    res.json({
      balance: balance ? balance.balance : "0",
      account: publicKey
    });

  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ message: "Account not found" });
    }
    res.status(500).json({ message: "Balance error", error: err.message });
  }
}

// SEND TRANSACTION (PREPARE ONLY)
async function sendTransaction(req, res) {
  try {
    const { fromPublicKey, toPublicKey, amount } = req.body;

    if (!fromPublicKey || !toPublicKey || !amount) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const tx = await Transaction.create({
      from: fromPublicKey,
      to: toPublicKey,
      amount,
      status: "pending"
    });

    res.json({
      message: "Transaction ready for signing",
      tx
    });

  } catch (err) {
    res.status(500).json({ message: "Transaction error", error: err.message });
  }
}

// MOBILE PAYMENT LINK
async function generatePaymentLink(req, res) {
  try {
    const { destination, amount } = req.body;

    if (!destination || !amount) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const link = `web+stellar:pay?destination=${destination}&amount=${amount}&asset_code=XLM`;

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
