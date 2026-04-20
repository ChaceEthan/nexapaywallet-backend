/**
 * WalletProfile Model
 * Maps Stellar addresses to user identities (names, display info)
 * Resolves "Unknown" issue in transaction history
 */

const mongoose = require("mongoose");

const WalletProfileSchema = new mongoose.Schema(
  {
    // Stellar address (public key)
    address: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },

    // User's display name for this wallet
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },

    // Optional description/nickname
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },

    // Wallet type (personal, business, etc.)
    type: {
      type: String,
      enum: ["personal", "business", "service"],
      default: "personal"
    },

    // Account status (active, inactive, verified)
    accountStatus: {
      type: String,
      enum: ["active", "inactive", "frozen"],
      default: "active"
    },

    // User ID (if profile belongs to a user account)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true
    },

    // Verification flag
    isVerified: {
      type: Boolean,
      default: false
    },

    // Profile image/avatar URL (future)
    avatarUrl: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true // adds createdAt & updatedAt
  }
);

// Index for fast lookups
WalletProfileSchema.index({ address: 1 });
WalletProfileSchema.index({ userId: 1 });

module.exports = mongoose.model("WalletProfile", WalletProfileSchema);
