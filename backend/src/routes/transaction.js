const express = require("express");
const router = express.Router();
const transactionService = require("../services/transactionService");
const walletProfileService = require("../services/walletProfileService");
const { isValidStellarAddress } = require("../utils/network");
const { verifyToken, requireUnlockedWallet } = require("../middlewares/auth");

function getRequestIdempotencyKey(req) {
  return req.get("Idempotency-Key") || req.body.idempotencyKey || null;
}

router.post("/transaction", verifyToken, requireUnlockedWallet, async (req, res) => {
  try {
    const { toAddress, amount, memo } = req.body;
    const senderSecretKey = process.env.STELLAR_SECRET_KEY;
    const senderPublicKey = req.authUser.walletAddress;

    if (!toAddress || !amount) {
      return res.status(400).json({
        success: false,
        message: "toAddress and amount are required"
      });
    }

    if (!senderSecretKey) {
      return res.status(500).json({
        success: false,
        message: "Server not configured for transactions"
      });
    }

    if (!isValidStellarAddress(toAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recipient address format"
      });
    }

    const result = await transactionService.executeTransaction({
      userId: req.user.id,
      senderPublicKey,
      receiverPublicKey: toAddress,
      amount,
      senderSecretKey,
      memo,
      idempotencyKey: getRequestIdempotencyKey(req)
    });

    if (!result.success) {
      return res.status(result.idempotentReplay ? 200 : 400).json({
        success: false,
        message: result.idempotentReplay ? "Transaction already exists" : "Transaction submission failed",
        error: result.submitDetails.error,
        transaction: result.transaction
      });
    }

    return res.status(200).json({
      success: true,
      message: result.idempotentReplay ? "Transaction already processed" : "Transaction sent successfully",
      transaction: result.transaction,
      txHash: result.transaction.txHash
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Transaction failed",
      error: error.message
    });
  }
});

router.get("/transactions/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    const normalizedAddress = String(address || "").trim().toUpperCase();

    if (!isValidStellarAddress(normalizedAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address"
      });
    }

    const transactions = await transactionService.getTransactionHistory(
      normalizedAddress,
      limit,
      skip
    );

    const result = transactions.map(tx => ({
      txHash: tx.txHash,
      type: tx.from === normalizedAddress ? "sent" : "received",
      senderAddress: tx.from,
      senderName: tx.fromName,
      receiverAddress: tx.to,
      receiverName: tx.toName,
      amount: tx.amount,
      fee: tx.fee,
      totalDeduction: tx.metadata?.totalDeduction ||
        (tx.type === "sent" ? (parseFloat(tx.amount) + parseFloat(tx.fee)).toFixed(7) : tx.amount),
      status: tx.status,
      timestamp: tx.createdAt,
      memo: tx.metadata?.memo || null
    }));

    return res.status(200).json({
      success: true,
      count: result.length,
      transactions: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transaction history",
      error: error.message
    });
  }
});

router.get("/resolve-address/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const profile = await walletProfileService.getProfileDetails(address);

    return res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to resolve address",
      error: error.message
    });
  }
});

router.post("/wallet-profile", verifyToken, async (req, res) => {
  try {
    const { address, name, description } = req.body;

    if (!address || !name) {
      return res.status(400).json({
        success: false,
        message: "address and name are required"
      });
    }

    if (!isValidStellarAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Stellar address"
      });
    }

    const profile = await walletProfileService.createOrUpdateProfile(
      address,
      name,
      req.user.id
    );

    if (description) {
      profile.description = description;
      await profile.save();
    }

    return res.status(200).json({
      success: true,
      message: "Wallet profile saved",
      profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to save profile",
      error: error.message
    });
  }
});

router.get("/wallet-profiles", verifyToken, async (req, res) => {
  try {
    const profiles = await walletProfileService.getProfilesByUserId(req.user.id);

    return res.status(200).json({
      success: true,
      count: profiles.length,
      profiles
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profiles",
      error: error.message
    });
  }
});

router.delete("/wallet-profile/:address", verifyToken, async (req, res) => {
  try {
    const { address } = req.params;

    if (!isValidStellarAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address"
      });
    }

    const deleted = await walletProfileService.deleteProfile(address);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Profile not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile deleted"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete profile",
      error: error.message
    });
  }
});

module.exports = router;
