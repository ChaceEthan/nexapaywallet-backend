<<<<<<< HEAD
/**
 * Transaction Model
 * Records all financial transactions (sends/receives)
 * Includes identity resolution and fee tracking
 */

=======
>>>>>>> 81195e5 (Fix backend: Binance service + MongoDB + market cleanup)
const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
<<<<<<< HEAD
    // Sender wallet address
    from: {
      type: String,
      required: true,
      index: true
    },

    // Sender display name (resolved from WalletProfile)
    fromName: {
      type: String,
      default: "Unknown"
    },

    // Receiver wallet address
    to: {
      type: String,
      required: true,
      index: true
    },

    // Receiver display name (resolved from WalletProfile)
    toName: {
      type: String,
      default: "Unknown"
    },

    // Amount sent (in XLM or asset)
    amount: {
      type: String,
      required: true
    },

    // Platform fee (deducted from sender)
    fee: {
      type: String,
      required: true,
      default: "0"
    },

    // Fee percentage used (e.g., 0.1 for 0.1%)
    feePercentage: {
      type: Number,
      default: 0.1
    },

    // Asset type (XLM, future: NEX token, etc.)
    asset: {
      type: String,
      default: "XLM"
    },

    // Transaction type
    type: {
      type: String,
      enum: ["sent", "received"],
      default: "sent"
    },

    // Transaction status (pending/success/failed)
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending"
    },

    // Stellar transaction hash (after successful submission)
    txHash: {
      type: String,
      default: null,
      sparse: true,
      unique: true
    },

    // Stellar ledger sequence (for tracking)
    ledger: {
      type: Number,
      default: null
    },

    // Error message (if status is "failed")
    errorMessage: {
      type: String,
      default: null
    },

    // Metadata (memo, notes, etc.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true // adds createdAt & updatedAt
  }
);

// Indexes for fast queries
TransactionSchema.index({ status: 1 });

=======
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    type: {
      type: String,
      enum: ["send", "receive", "swap"],
      required: true,
    },
    asset: {
      type: String,
      required: true,
      // For swap, this could be the source asset
    },
    targetAsset: {
      type: String,
      // Only for swap
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    targetAmount: {
      type: Number,
      // Only for swap
      min: 0,
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

>>>>>>> 81195e5 (Fix backend: Binance service + MongoDB + market cleanup)
module.exports = mongoose.model("Transaction", TransactionSchema);