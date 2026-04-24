const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const axios = require("axios");

// ================= GET BALANCE =================
const getBalance = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);

  if (!user || !user.walletAddress) {
    throw new ApiError(400, "No wallet connected");
  }

  try {
    const response = await axios.get(
      `https://horizon-testnet.stellar.org/accounts/${user.walletAddress}`
    );

    const balance = response.data.balances.find(b => b.asset_type === "native");

    return res.status(200).json(
      new ApiResponse(200, {
        balance: balance ? balance.balance : "0",
        account: user.walletAddress
      }, "Balance retrieved successfully")
    );
  } catch (err) {
    throw new ApiError(500, `Horizon API Error: ${err.message}`);
  }
});

// ================= CONNECT WALLET =================
const connectWallet = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { walletAddress } = req.body;

  if (!walletAddress) {
    throw new ApiError(400, "Wallet address required");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { walletAddress },
    { new: true }
  );

  return res.status(200).json(
    new ApiResponse(200, { walletAddress: user.walletAddress }, "Wallet connected successfully")
  );
});

// ================= SEND TRANSACTION =================
const sendTransaction = asyncHandler(async (req, res) => {
  const { toPublicKey, amount } = req.body;

  if (!toPublicKey || !amount) {
    throw new ApiError(400, "Missing required fields: toPublicKey, amount");
  }

  return res.status(200).json(
    new ApiResponse(200, { toPublicKey, amount }, "Transaction prepared")
  );
});

// ================= PAYMENT LINK =================
const generatePaymentLink = asyncHandler(async (req, res) => {
  const { destination, amount } = req.body;
  const link = `web+stellar:pay?destination=${destination}&amount=${amount}&asset_code=XLM`;

  return res.status(200).json(
    new ApiResponse(200, { paymentLink: link }, "Payment link generated successfully")
  );
});

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

// ================= EXPORT ALL =================
module.exports = {
  getBalance,
  connectWallet,
  sendTransaction,
  generatePaymentLink,
  createWallet,
  getAllWallets,
  deleteWallet,
  updateActive,
}; 