
/**
 * Transaction Routes
 * Core API endpoints for money system
 * - POST /api/transaction - Send transaction
 * - GET /api/transactions/:address - Get history
 * - GET /api/resolve-address/:address - Resolve wallet identity
 * - POST /api/wallet-profile - Create/update profile
 */

const express = require("express");
const router = express.Router();
const transactionService = require("../services/transactionService");
const walletProfileService = require("../services/walletProfileService");
const { isValidStellarAddress } = require("../config/network");
const { verifyToken } = require("../middleware/auth");
const {
  sendTransaction,
  swapTransaction,
  getTransactions,
} = require("../controllers/transactionController");

// ================= TRANSACTION ENDPOINTS =================

/**
 * POST /api/transaction
 * Send XLM transaction with fee deduction
 * 
 * Body:
 * - toAddress: Recipient Stellar address
 * - amount: Amount in XLM
 * - memo: Optional transaction memo
 * - senderSecretKey: Sender's secret key (from secure storage)
 * 
 * Returns: Transaction object with hash
 */
router.post("/transaction", verifyToken, async (req, res) => {
  try {
    const { toAddress, amount, memo } = req.body;
    const senderSecretKey = process.env.STELLAR_SECRET_KEY;

    // Validate inputs
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

    // Validate receiver address
    if (!isValidStellarAddress(toAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recipient address format"
      });
    }

    // Get sender's public key from token or DB
    const senderPublicKey = req.user.walletAddress;
    if (!senderPublicKey) {
      return res.status(400).json({
        success: false,
        message: "User wallet not connected"
      });
    }

    // Execute transaction
    const result = await transactionService.executeTransaction({
      senderPublicKey,
      receiverPublicKey: toAddress,
      amount,
      senderSecretKey,
      memo
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Transaction submission failed",
        error: result.submitDetails.error,
        transaction: result.transaction
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction sent successfully",
      transaction: result.transaction,
      txHash: result.transaction.txHash
    });

  } catch (error) {
    console.error("Transaction error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Transaction failed",
      error: error.message
    });
  }
});

/**
 * GET /api/transactions/:address
 * Get transaction history for wallet address
 * Resolves sender/receiver names (no "Unknown")
 * 
 * Query params:
 * - limit: Number of records (default 50)
 * - skip: Pagination offset (default 0)
 * 
 * Returns: Array of transactions with resolved names
 */
router.get("/transactions/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Validate address
    if (!isValidStellarAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address"
      });
    }

    // Get transaction history
    const transactions = await transactionService.getTransactionHistory(
      address,
      Math.min(parseInt(limit) || 50, 100), // Max 100
      parseInt(skip) || 0
    );

    // Transform to response format
    const result = transactions.map(tx => ({
      txHash: tx.txHash,
      type: tx.from === address ? "sent" : "received",
      senderAddress: tx.from,
      senderName: tx.fromName,
      receiverAddress: tx.to,
      receiverName: tx.toName,
      amount: tx.amount,
      fee: tx.fee,
      totalDeduction: tx.type === "sent" ? 
        (parseFloat(tx.amount) + parseFloat(tx.fee)).toFixed(7) : 
        tx.amount,
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
    console.error("History error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch transaction history",
      error: error.message
    });
  }
});

// ================= WALLET IDENTITY ENDPOINTS =================

/**
 * GET /api/resolve-address/:address
 * Resolve wallet address to identity
 * Used by QR scanner frontend
 * 
 * Returns: { address, isValid, name, description, type, accountStatus }
 */
router.get("/resolve-address/:address", async (req, res) => {
  try {
    const { address } = req.params;

    // Get profile details
    const profile = await walletProfileService.getProfileDetails(address);

    return res.status(200).json({
      success: true,
      profile
    });

  } catch (error) {
    console.error("Resolve error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resolve address",
      error: error.message
    });
  }
});

/**
 * POST /api/wallet-profile
 * Create or update wallet profile
 * Maps address to display name
 * 
 * Body:
 * - address: Stellar address
 * - name: Display name
 * 
 * Returns: Created/updated profile
 */
router.post("/wallet-profile", verifyToken, async (req, res) => {
  try {
    const { address, name, description } = req.body;

    if (!address || !name) {
      return res.status(400).json({
        success: false,
        message: "address and name are required"
      });
    }

    // Validate address
    if (!isValidStellarAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Stellar address"
      });
    }

    // Create/update profile
    const profile = await walletProfileService.createOrUpdateProfile(
      address,
      name,
      req.user.id
    );

    // Update description if provided
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
    console.error("Profile error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to save profile",
      error: error.message
    });
  }
});

/**
 * GET /api/wallet-profiles
 * Get all wallet profiles for authenticated user
 * 
 * Returns: Array of profiles
 */
router.get("/wallet-profiles", verifyToken, async (req, res) => {
  try {
    const profiles = await walletProfileService.getProfilesByUserId(req.user.id);

    return res.status(200).json({
      success: true,
      count: profiles.length,
      profiles
    });

  } catch (error) {
    console.error("Profiles error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profiles",
      error: error.message
    });
  }
});

/**
 * DELETE /api/wallet-profile/:address
 * Delete wallet profile
 */
router.delete("/wallet-profile/:address", verifyToken, async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address
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
    console.error("Delete error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete profile",
      error: error.message
    });
  }
});

// ================= INTERNAL WALLET TRANSACTION ROUTES =================
router.post("/send", sendTransaction);
router.post("/swap", swapTransaction);
router.get("/:walletId", getTransactions); 

module.exports = router;
