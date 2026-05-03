const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    walletAddress: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true
    },
    walletUnlockedUntil: {
      type: Date,
      default: null
    },
    sessionVersion: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", UserSchema);
