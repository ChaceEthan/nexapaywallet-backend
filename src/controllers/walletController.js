const User = require("../models/User");
const axios = require("axios");

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

module.exports = { getBalance };