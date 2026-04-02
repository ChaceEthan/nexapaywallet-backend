const User = require("../models/User");

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

module.exports = { connectWallet };
