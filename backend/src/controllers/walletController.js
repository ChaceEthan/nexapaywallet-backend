const User = require("../models/User");
const axios = require("axios");

async function connectWallet(req, res) {
  try {
    const { email, walletAddress } = req.body;

    if (!email || !walletAddress) {
      return res.status(400).json({ message: "Email and walletAddress are required" });
    }

    const user = await User.findOneAndUpdate({ email }, { walletAddress }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "Wallet connected", email: user.email, walletAddress: user.walletAddress });
  } catch (error) {
    console.error("Connect Wallet error:", error);
    return res.status(500).json({ message: "Error connecting wallet", error: error.message });
  }
}

async function getBalance(req, res) {
  try {
    const { publicKey } = req.params;

    if (!publicKey) {
      return res.status(400).json({ message: "Public key is required" });
    }

    // Fetch from Stellar Horizon API (testnet)
    const horizonUrl = `https://horizon-testnet.stellar.org/accounts/${publicKey}`;
    
    const response = await axios.get(horizonUrl, {
      timeout: 5000,
    });

    const balance = response.data.balances[0]?.balance || "0";
    const sequence = response.data.sequence;

    return res.json({
      message: "Balance retrieved successfully",
      publicKey,
      balance,
      sequence,
      account: response.data,
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({ message: "Account not found on testnet" });
    }
    console.error("GetBalance error:", error.message);
    return res.status(500).json({ message: "Error retrieving balance", error: error.message });
  }
}

async function sendTransaction(req, res) {
  try {
    const { fromPublicKey, toPublicKey, amount } = req.body;

    if (!fromPublicKey || !toPublicKey || !amount) {
      return res.status(400).json({ message: "fromPublicKey, toPublicKey, and amount are required" });
    }

    // Mock response - real transaction signing would happen on frontend
    return res.json({
      message: "Transaction prepared (sign on frontend)",
      transaction: {
        fromPublicKey,
        toPublicKey,
        amount,
        network: process.env.SOROBAN_NETWORK || "testnet",
        status: "ready_to_sign",
      },
    });
  } catch (error) {
    console.error("SendTransaction error:", error);
    return res.status(500).json({ message: "Error preparing transaction", error: error.message });
  }
}

module.exports = { connectWallet, getBalance, sendTransaction };
