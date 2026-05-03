const bcrypt = require("bcryptjs");
const User = require("../models/User");
const walletService = require("../services/walletService");
const transactionService = require("../services/transactionService");
const { getAccountDetails, getBalance: getNetworkBalance } = require("../services/transactionService");
const { isValidStellarAddress } = require("../utils/network");
const { createToken, serializeUser } = require("../utils/authToken");

const DEFAULT_UNLOCK_TTL_MS = 15 * 60 * 1000;

function getUnlockTtlMs() {
  const ttl = Number(process.env.WALLET_UNLOCK_TTL_MS || DEFAULT_UNLOCK_TTL_MS);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_UNLOCK_TTL_MS;
}

function getRequestIdempotencyKey(req) {
  return req.get("Idempotency-Key") || req.body.idempotencyKey || null;
}

function sendError(res, error, fallbackMessage = "Wallet request failed") {
  const statusCode = error.statusCode || error.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && process.env.NODE_ENV === "production"
      ? fallbackMessage
      : error.message || fallbackMessage,
    error: process.env.NODE_ENV === "production" ? undefined : error.message
  });
}

function sendWalletMutation(res, statusCode, message, user, wallet = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    token: createToken(user),
    user: serializeUser(user),
    walletAddress: user.walletAddress || null,
    walletUnlockedUntil: user.walletUnlockedUntil || null,
    ...wallet
  });
}

async function getBalance(req, res) {
  try {
    const user = req.authUser || await User.findById(req.user.id);

    if (!user || !user.walletAddress) {
      return res.status(400).json({ success: false, message: "No wallet connected" });
    }

    let balance;
    try {
      balance = await getNetworkBalance(user.walletAddress);
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: "Balance service temporarily unavailable",
        account: user.walletAddress,
        balance: null
      });
    }

    return res.json({
      success: true,
      balance,
      account: user.walletAddress
    });
  } catch (error) {
    return sendError(res, error, "Balance error");
  }
}

async function createWallet(req, res) {
  try {
    const result = await walletService.createWallet(req.user.id, req.body);
    return sendWalletMutation(res, 201, "Wallet created", result.user, result.wallet);
  } catch (error) {
    return sendError(res, error, "Create wallet error");
  }
}

async function importWallet(req, res) {
  try {
    const result = await walletService.importWallet(req.user.id, req.body);
    return sendWalletMutation(res, 200, "Wallet imported", result.user, result.wallet);
  } catch (error) {
    return sendError(res, error, "Import wallet error");
  }
}

async function connectWallet(req, res) {
  try {
    const result = await walletService.importWallet(req.user.id, req.body);
    return sendWalletMutation(res, 200, "Wallet connected", result.user, result.wallet);
  } catch (error) {
    return sendError(res, error, "Connect wallet error");
  }
}

async function switchWallet(req, res) {
  try {
    const result = await walletService.switchWallet(req.user.id, req.body);
    return sendWalletMutation(res, 200, "Wallet switched", result.user, result.wallet);
  } catch (error) {
    return sendError(res, error, "Switch wallet error");
  }
}

async function disconnectWallet(req, res) {
  try {
    const user = await walletService.disconnectWallet(req.user.id, req.body);
    return sendWalletMutation(res, 200, "Wallet disconnected", user, {
      disconnected: true,
      dataDeleted: false
    });
  } catch (error) {
    return sendError(res, error, "Disconnect wallet error");
  }
}

async function unlockWallet(req, res) {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required to unlock wallet" });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.walletAddress) {
      return res.status(400).json({ success: false, message: "No wallet connected" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid wallet unlock credentials" });
    }

    user.walletUnlockedUntil = new Date(Date.now() + getUnlockTtlMs());
    await user.save();

    return res.json({
      success: true,
      message: "Wallet unlocked",
      walletUnlockedUntil: user.walletUnlockedUntil
    });
  } catch (error) {
    return sendError(res, error, "Unlock error");
  }
}

async function lockWallet(req, res) {
  try {
    await User.findByIdAndUpdate(req.user.id, { walletUnlockedUntil: null });
    return res.json({ success: true, message: "Wallet locked" });
  } catch (error) {
    return sendError(res, error, "Lock error");
  }
}

async function verifyPhrase(req, res) {
  try {
    const { phrase } = req.body;
    const configuredPhraseHash = process.env.WALLET_RECOVERY_PHRASE_HASH?.trim();

    if (!configuredPhraseHash) {
      return res.status(503).json({
        success: false,
        message: "Recovery phrase verification is not configured"
      });
    }

    const normalizedPhrase = Array.isArray(phrase)
      ? phrase.join(" ").trim()
      : String(phrase || "").trim();

    const valid = normalizedPhrase && await bcrypt.compare(normalizedPhrase, configuredPhraseHash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Invalid recovery phrase"
      });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.walletAddress) {
      return res.status(400).json({ success: false, message: "No wallet connected" });
    }

    user.walletUnlockedUntil = new Date(Date.now() + getUnlockTtlMs());
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Recovery phrase verified successfully",
      walletUnlockedUntil: user.walletUnlockedUntil
    });
  } catch (error) {
    return sendError(res, error, "Server error during verification");
  }
}

async function sendTransaction(req, res) {
  try {
    const { toPublicKey, toAddress, amount, memo } = req.body;
    const receiverPublicKey = toAddress || toPublicKey;
    const senderSecretKey = process.env.STELLAR_SECRET_KEY;
    const senderPublicKey = req.authUser.walletAddress;

    if (!senderSecretKey) {
      return res.status(503).json({
        success: false,
        message: "Server transaction signer is not configured"
      });
    }

    const result = await transactionService.executeTransaction({
      userId: req.user.id,
      senderPublicKey,
      receiverPublicKey,
      amount,
      senderSecretKey,
      memo,
      idempotencyKey: getRequestIdempotencyKey(req)
    });

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json({
      success: result.success,
      message: result.success ? "Transaction sent successfully" : "Transaction submission failed",
      transaction: result.transaction,
      txHash: result.transaction?.txHash || null,
      error: result.submitDetails?.error || null
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Transaction error",
      error: err.message
    });
  }
}

async function generatePaymentLink(req, res) {
  try {
    const { destination, amount } = req.body;

    if (!destination || !isValidStellarAddress(destination)) {
      return res.status(400).json({ success: false, message: "Valid destination is required" });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    const link = `web+stellar:pay?destination=${encodeURIComponent(destination.trim().toUpperCase())}&amount=${encodeURIComponent(amount)}&asset_code=XLM`;

    return res.json({
      success: true,
      paymentLink: link
    });
  } catch (error) {
    return sendError(res, error, "Link error");
  }
}

module.exports = {
  getAccountDetails,
  getBalance,
  createWallet,
  importWallet,
  connectWallet,
  switchWallet,
  disconnectWallet,
  unlockWallet,
  lockWallet,
  verifyPhrase,
  sendTransaction,
  generatePaymentLink
};
