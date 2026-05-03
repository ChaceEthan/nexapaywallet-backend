const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true
    },
    from: {
      type: String,
      required: true,
      index: true,
      trim: true,
      uppercase: true
    },
    fromName: {
      type: String,
      default: "Unknown"
    },
    to: {
      type: String,
      required: true,
      index: true,
      trim: true,
      uppercase: true
    },
    toName: {
      type: String,
      default: "Unknown"
    },
    amount: {
      type: String,
      required: true
    },
    fee: {
      type: String,
      required: true,
      default: "0"
    },
    feePercentage: {
      type: Number,
      default: 0.1
    },
    asset: {
      type: String,
      default: "XLM"
    },
    type: {
      type: String,
      enum: ["sent", "received"],
      default: "sent"
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
      index: true
    },
    network: {
      type: String,
      enum: ["testnet", "mainnet"],
      default: "testnet"
    },
    txHash: {
      type: String,
      default: null,
      sparse: true,
      unique: true
    },
    ledger: {
      type: Number,
      default: null
    },
    errorMessage: {
      type: String,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

TransactionSchema.index({ from: 1, createdAt: -1 });
TransactionSchema.index({ to: 1, createdAt: -1 });
TransactionSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true, $ne: null } } }
);
TransactionSchema.index(
  { from: 1, idempotencyKey: 1 },
  { unique: true }
);

module.exports = mongoose.model("Transaction", TransactionSchema);
