const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");

/**
 * @description Send assets
 * @route POST /api/transaction/send
 */
const sendTransaction = asyncHandler(async (req, res) => {
  const { walletId, asset, amount, fee = 0 } = req.body;

  if (!walletId || !asset || !amount) {
    throw new ApiError(400, "walletId, asset, and amount are required");
  }

  const wallet = await Wallet.findById(walletId);
  if (!wallet || wallet.isDeleted) {
    throw new ApiError(404, "Wallet not found");
  }

  const currentBalance = wallet.balances.get(asset) || 0;
  const totalDeduction = amount + fee;

  if (currentBalance < totalDeduction) {
    throw new ApiError(400, `Insufficient ${asset} balance`);
  }

  // Update balance
  wallet.balances.set(asset, currentBalance - totalDeduction);
  wallet.lastActive = Date.now();
  await wallet.save();

  // Create transaction record
  const transaction = await Transaction.create({
    walletId,
    type: "send",
    asset,
    amount,
    fee,
  });

  return res.status(201).json(new ApiResponse(201, transaction, "Transaction sent successfully"));
});

/**
 * @description Swap assets
 * @route POST /api/transaction/swap
 */
const swapTransaction = asyncHandler(async (req, res) => {
  const { walletId, sourceAsset, targetAsset, amount, targetAmount, fee = 0 } = req.body;

  if (!walletId || !sourceAsset || !targetAsset || !amount || !targetAmount) {
    throw new ApiError(400, "walletId, sourceAsset, targetAsset, amount, and targetAmount are required");
  }

  const wallet = await Wallet.findById(walletId);
  if (!wallet || wallet.isDeleted) {
    throw new ApiError(404, "Wallet not found");
  }

  const sourceBalance = wallet.balances.get(sourceAsset) || 0;
  const totalDeduction = amount + fee;

  if (sourceBalance < totalDeduction) {
    throw new ApiError(400, `Insufficient ${sourceAsset} balance`);
  }

  // Deduct from source
  wallet.balances.set(sourceAsset, sourceBalance - totalDeduction);
  
  // Add to target
  const targetBalance = wallet.balances.get(targetAsset) || 0;
  wallet.balances.set(targetAsset, targetBalance + targetAmount);
  
  wallet.lastActive = Date.now();
  await wallet.save();

  // Create transaction record
  const transaction = await Transaction.create({
    walletId,
    type: "swap",
    asset: sourceAsset,
    targetAsset,
    amount,
    targetAmount,
    fee,
  });

  return res.status(201).json(new ApiResponse(201, transaction, "Swap completed successfully"));
});

/**
 * @description Get transactions by wallet ID
 * @route GET /api/transaction/:walletId
 */
const getTransactions = asyncHandler(async (req, res) => {
  const { walletId } = req.params;

  const transactions = await Transaction.find({ walletId }).sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, transactions, "Transactions retrieved successfully"));
});

module.exports = {
  sendTransaction,
  swapTransaction,
  getTransactions,
};
