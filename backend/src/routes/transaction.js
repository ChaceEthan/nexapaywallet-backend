const express = require("express");
const router = express.Router();
const transactionService = require("../services/transactionService");
const walletProfileService = require("../services/walletProfileService");
const { isValidStellarAddress } = require("../utils/network");
const { verifyToken, requireUnlockedWallet } = require("../middlewares/auth");

function getRequestIdempotencyKey(req) {
  return req.get("Idempotency-Key") || req.body.idempotencyKey || null;
}

function safeNumberString(value, fallback = "0") {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(7).replace(/\.?0+$/, "") : fallback;
}

function normalizeTransactionRecord(record, publicKey) {
  const r = record?.toObject ? record.toObject() : (record || {});
  const normalizedPublicKey = String(publicKey || "").trim().toUpperCase();
  const operationType = String(r.type || r.operationType || "").trim().toLowerCase();
  const from = String(
    r.from ||
    r.funder ||
    (operationType === "account_merge" ? r.account : null) ||
    r.source_account ||
    ""
  ).trim().toUpperCase();
  const to = String(
    r.to ||
    r.account ||
    r.into ||
    (from === normalizedPublicKey ? "" : normalizedPublicKey)
  ).trim().toUpperCase();
  const id = r.id || r.txHash || r.transaction_hash || r.paging_token || null;
  const amount = safeNumberString(r.amount ?? r.starting_balance ?? r.source_amount, "0");
  const fee = safeNumberString(r.fee, "0");
  const assetCode = r.asset_code || r.asset || (r.asset_type === "native" ? "XLM" : "XLM");
  const createdAt = r.created_at || r.createdAt || r.updatedAt || r.submittedAt || null;
  const type = from === normalizedPublicKey ? "sent" : "received";

  return {
    id,
    type,
    from: from || normalizedPublicKey,
    to: to || normalizedPublicKey,
    amount,
    asset_code: assetCode,
    created_at: createdAt,
    txHash: r.txHash || r.transaction_hash || id,
    senderAddress: from || normalizedPublicKey,
    senderName: r.fromName || "Unknown",
    receiverAddress: to || normalizedPublicKey,
    receiverName: r.toName || "Unknown",
    fee,
    totalDeduction: r.metadata?.totalDeduction ||
      (type === "sent" ? safeNumberString(Number(amount) + Number(fee), amount) : amount),
    status: r.status || (r.transaction_successful === false ? "failed" : "success"),
    timestamp: createdAt,
    memo: r.metadata?.memo || null
  };
}

async function sendTransactionHistory(req, res, address) {
  const { limit = 50, skip = 0 } = req.query;
  const normalizedAddress = String(address || "").trim().toUpperCase();

  if (!isValidStellarAddress(normalizedAddress)) {
    return res.status(400).json({
      success: false,
      error: "Invalid wallet address"
    });
  }

  let transactions = [];
  let source = "mongodb";

  try {
    transactions = await transactionService.getTransactionHistory(
      normalizedAddress,
      limit,
      skip
    );
  } catch (dbError) {
    console.error("Mongo transaction history error:", dbError);
  }

  if (!Array.isArray(transactions) || transactions.length === 0) {
    try {
      transactions = await transactionService.getHorizonPaymentHistory(normalizedAddress, limit);
      source = "horizon";
    } catch (horizonError) {
      console.error("Horizon transaction history error:", horizonError);
      transactions = Array.isArray(transactions) ? transactions : [];
    }
  }

  const result = (Array.isArray(transactions) ? transactions : [])
    .filter(Boolean)
    .map(tx => normalizeTransactionRecord(tx, normalizedAddress));

  return res.status(200).json({
    success: true,
    count: result.length,
    source,
    transactions: result
  });
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
        error: result.submitDetails?.error || "Transaction submission failed",
        transaction: result.transaction || null
      });
    }

    return res.status(200).json({
      success: true,
      message: result.idempotentReplay ? "Transaction already processed" : "Transaction sent successfully",
      transaction: result.transaction || null,
      txHash: result.transaction?.txHash || null
    });
  } catch (error) {
    console.error("POST /api/transaction error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
});

router.get("/transactions", async (req, res) => {
  try {
    let address = req.query.address;

    if (!address) {
      let authenticated = false;
      await verifyToken(req, res, () => {
        authenticated = true;
      });

      if (!authenticated || res.headersSent) return;
      address = req.authUser?.walletAddress || req.user?.walletAddress;
    }

    return await sendTransactionHistory(req, res, address);
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
});

router.get("/transactions/:address", async (req, res) => {
  try {
    const { address } = req.params;
    return await sendTransactionHistory(req, res, address);
  } catch (error) {
    console.error("GET /api/transactions/:address error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
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
    console.error("GET /api/resolve-address/:address error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
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
