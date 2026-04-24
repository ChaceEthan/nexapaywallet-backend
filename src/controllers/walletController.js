<<<<<<< HEAD
const User = require("../models/User");
const axios = require("axios");

// ================= GET BALANCE =================
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

// ================= CONNECT WALLET =================
async function connectWallet(req, res) {
  try {
    const userId = req.user.id;
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet address required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { walletAddress },
      { new: true }
    );

    res.json({
      message: "Wallet connected",
      walletAddress: user.walletAddress
    });

  } catch (err) {
    res.status(500).json({
      message: "Connect error",
      error: err.message
    });
  }
}

// ================= SEND TRANSACTION =================
async function sendTransaction(req, res) {
  try {
    const { toPublicKey, amount } = req.body;

    if (!toPublicKey || !amount) {
      return res.status(400).json({ message: "Missing fields" });
    }

    res.json({
      message: "Transaction prepared",
      toPublicKey,
      amount
    });

  } catch (err) {
    res.status(500).json({
      message: "Transaction error",
      error: err.message
    });
  }
}

// ================= PAYMENT LINK =================
async function generatePaymentLink(req, res) {
  try {
    const { destination, amount } = req.body;

    const link = `web+stellar:pay?destination=${destination}&amount=${amount}&asset_code=XLM`;

    res.json({
      paymentLink: link
    });

  } catch (err) {
    res.status(500).json({
      message: "Link error",
      error: err.message
    });
  }
}

// ================= EXPORT ALL =================
module.exports = {
  getBalance,
  connectWallet,
  sendTransaction,
  generatePaymentLink
=======
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const Wallet = require("../models/Wallet");

/**
 * @description Create a new wallet
 * @route POST /api/v1/wallet/create
 */
const createWallet = asyncHandler(async (req, res) => {
  const { publicKey, name, network } = req.body;

  if (!publicKey) {
    throw new ApiError(400, "Public key is required");
  }

  const existingWallet = await Wallet.findOne({ publicKey });
  if (existingWallet) {
    if (existingWallet.isDeleted) {
      existingWallet.isDeleted = false;
      existingWallet.lastActive = Date.now();
      await existingWallet.save();
      return res.status(200).json(new ApiResponse(200, existingWallet, "Wallet restored"));
    }
    throw new ApiError(400, "Wallet with this public key already exists");
  }

  const wallet = await Wallet.create({
    publicKey,
    name,
    network,
  });

  return res.status(201).json(new ApiResponse(201, wallet, "Wallet created successfully"));
});

/**
 * @description Get all active wallets
 * @route GET /api/v1/wallet/all
 */
const getAllWallets = asyncHandler(async (req, res) => {
  const wallets = await Wallet.find({ isDeleted: false });
  return res.status(200).json(new ApiResponse(200, wallets, "Wallets retrieved successfully"));
});

/**
 * @description Soft delete a wallet
 * @route DELETE /api/v1/wallet/:id
 */
const deleteWallet = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const wallet = await Wallet.findById(id);
  if (!wallet || wallet.isDeleted) {
    throw new ApiError(404, "Wallet not found");
  }

  wallet.isDeleted = true;
  await wallet.save();

  return res.status(200).json(new ApiResponse(200, null, "Wallet deleted successfully"));
});

/**
 * @description Update lastActive for a wallet
 * @route PATCH /api/v1/wallet/active
 */
const updateActive = asyncHandler(async (req, res) => {
  const { publicKey } = req.body;

  if (!publicKey) {
    throw new ApiError(400, "Public key is required");
  }

  const wallet = await Wallet.findOne({ publicKey, isDeleted: false });
  if (!wallet) {
    throw new ApiError(404, "Wallet not found");
  }

  wallet.lastActive = Date.now();
  await wallet.save();

  return res.status(200).json(new ApiResponse(200, wallet, "Wallet activity updated"));
});

module.exports = {
  createWallet,
  getAllWallets,
  deleteWallet,
  updateActive,
>>>>>>> 81195e5 (Fix backend: Binance service + MongoDB + market cleanup)
};