const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema(
  {
    publicKey: {
      type: String,
      required: [true, "Public key is required"],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: "My Wallet",
    },
    network: {
      type: String,
      enum: ["testnet", "mainnet"],
      default: "testnet",
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false, // For soft delete
    },
    balances: {
      type: Map,
      of: Number,
      default: { XLM: 10000, USDC: 0, USDT: 0 } // Giving some testnet XLM by default
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Wallet", WalletSchema);
