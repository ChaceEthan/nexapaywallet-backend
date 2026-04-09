// src/models/Transaction.js

const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    // Sender wallet
    from: {
      type: String,
      required: true,
      index: true
    },

    // Receiver wallet
    to: {
      type: String,
      required: true,
      index: true
    },

    // Amount sent
    amount: {
      type: String,
      required: true
    },

    // Asset type (future proof for NEX token)
    asset: {
      type: String,
      default: "XLM"
    },

    // Transaction status
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending"
    },

    // Optional transaction hash (after real send)
    txHash: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true // adds createdAt & updatedAt automatically
  }
);

module.exports = mongoose.model("Transaction", TransactionSchema);