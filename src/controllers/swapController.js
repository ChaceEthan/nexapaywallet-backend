const mongoose = require("mongoose");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const marketService = require("../services/marketService");

/**
 * @description Execute a swap using live market prices
 * @route POST /api/swap
 */
const executeSwap = asyncHandler(async (req, res) => {
  const { walletId, fromAsset, toAsset, amount } = req.body;

  // Check if database is connected before performing DB operations
  if (mongoose.connection.readyState !== 1) {
    throw new ApiError(503, "Database connection is unavailable. Service is operating in degraded mode.");
  }

  if (!walletId || !fromAsset || !toAsset || !amount) {
    throw new ApiError(400, "walletId, fromAsset, toAsset, and amount are required");
  }

  if (amount <= 0) {
    throw new ApiError(400, "Amount must be greater than zero");
  }

  // Fetch live prices
  const prices = marketService.getPrices();
  const fromData = prices[fromAsset.toLowerCase()];
  const toData = prices[toAsset.toLowerCase()];

  if (!fromData || !toData) {
    throw new ApiError(400, "Invalid assets for swap");
  }

  const fromPrice = fromData.price;
  const toPrice = toData.price;

  // Calculations
  const rate = fromPrice / toPrice;
  const receiveAmount = amount * rate;
  const fee = amount * 0.000001;
  const totalDeduction = amount + fee;

  // Validate Wallet
  const wallet = await Wallet.findById(walletId);
  if (!wallet || wallet.isDeleted) {
    throw new ApiError(404, "Wallet not found");
  }

  // Validate Balance
  const sourceBalance = wallet.balances.get(fromAsset) || 0;
  if (sourceBalance < totalDeduction) {
    throw new ApiError(400, `Insufficient ${fromAsset} balance`);
  }

  // Update Balances
  wallet.balances.set(fromAsset, sourceBalance - totalDeduction);
  
  const targetBalance = wallet.balances.get(toAsset) || 0;
  wallet.balances.set(toAsset, targetBalance + receiveAmount);

  wallet.lastActive = Date.now();
  await wallet.save();

  // Save Transaction Record
  await Transaction.create({
    walletId,
    type: "swap",
    asset: fromAsset,
    targetAsset: toAsset,
    amount: amount,
    targetAmount: receiveAmount,
    fee: fee,
  });

  // Prepare response
  const newBalances = {};
  for (let [key, val] of wallet.balances.entries()) {
    newBalances[key] = val;
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        receiveAmount,
        fee,
        newBalances
      },
      "Swap executed successfully"
    )
  );
});

module.exports = {
  executeSwap
};
