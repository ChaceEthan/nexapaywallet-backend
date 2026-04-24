const mongoose = require("mongoose");

<<<<<<< HEAD
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  walletAddress: {
    type: String,
    unique: true, // Ensures no two users have the same wallet address
    sparse: true, // Allows multiple documents to have a null or undefined walletAddress
  },
});
=======
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    walletAddress: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);
>>>>>>> 81195e5 (Fix backend: Binance service + MongoDB + market cleanup)

module.exports = mongoose.model("User", UserSchema);