const axios = require("axios");
const crypto = require("crypto");
const StellarSDK = require("@stellar/stellar-sdk");
const Transaction = require("../models/Transaction");
const feeService = require("./feeService");
const walletProfileService = require("./walletProfileService");
const {
  getHorizonUrl,
  getNetwork,
  isValidStellarAddress,
  isValidStellarSecret
} = require("../utils/network");

const REQUEST_TIMEOUT = 8000;
const IDEMPOTENCY_WINDOW_MS = 30 * 1000;

function normalizeAmount(amount) {
  const amountString = String(amount ?? "").trim();
  const amountNum = Number(amountString);

  if (!amountString || !Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const [, decimals = ""] = amountString.split(".");
  if (decimals.length > 7) {
    throw new Error("Amount supports up to 7 decimal places");
  }

  return amountNum.toFixed(7).replace(/\.?0+$/, "");
}

function normalizeMemo(memo) {
  if (memo === undefined || memo === null || memo === "") return null;

  const normalizedMemo = String(memo).trim();
  if (Buffer.byteLength(normalizedMemo, "utf8") > 28) {
    throw new Error("Memo too long (max 28 bytes)");
  }

  return normalizedMemo;
}

function getPlatformFeeAddress() {
  const feeAddress = process.env.PLATFORM_FEE_ADDRESS?.trim().toUpperCase();
  if (!feeAddress) return null;

  if (!isValidStellarAddress(feeAddress)) {
    throw new Error("PLATFORM_FEE_ADDRESS is invalid");
  }

  return feeAddress;
}

function buildIdempotencyKey(options) {
  if (options.idempotencyKey) {
    return String(options.idempotencyKey).trim();
  }

  const bucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS);
  return crypto
    .createHash("sha256")
    .update([
      options.userId || "anonymous",
      options.senderPublicKey,
      options.receiverPublicKey,
      options.amount,
      options.memo || "",
      bucket
    ].join(":"))
    .digest("hex");
}

async function getAccountDetails(publicKey) {
  if (!isValidStellarAddress(publicKey)) {
    throw new Error("Invalid Stellar address");
  }

  try {
    const horizonUrl = getHorizonUrl();
    const response = await axios.get(`${horizonUrl}/accounts/${publicKey}`, {
      timeout: REQUEST_TIMEOUT
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Account not found on network. Please fund account first.");
    }
    throw new Error(`Failed to fetch account: ${error.message}`);
  }
}

async function getBalance(publicKey) {
  const account = await getAccountDetails(publicKey);
  const nativeBalance = account.balances.find(balance => balance.asset_type === "native");
  return nativeBalance ? nativeBalance.balance : "0";
}

function validateAddresses(senderPublicKey, receiverPublicKey) {
  if (!isValidStellarAddress(senderPublicKey)) {
    throw new Error("Invalid sender address");
  }

  if (!isValidStellarAddress(receiverPublicKey)) {
    throw new Error("Invalid receiver address");
  }

  if (senderPublicKey === receiverPublicKey) {
    throw new Error("Cannot send to yourself");
  }
}

function validateSecretForSender(senderSecretKey, senderPublicKey) {
  if (!isValidStellarSecret(senderSecretKey)) {
    throw new Error("Invalid sender secret key");
  }

  const keypair = StellarSDK.Keypair.fromSecret(senderSecretKey.trim().toUpperCase());
  if (keypair.publicKey() !== senderPublicKey) {
    throw new Error("Configured secret key does not match sender wallet");
  }

  return keypair;
}

async function prepareTransaction(options) {
  const senderPublicKey = String(options.senderPublicKey || "").trim().toUpperCase();
  const receiverPublicKey = String(options.receiverPublicKey || "").trim().toUpperCase();
  const amount = normalizeAmount(options.amount);
  const memo = normalizeMemo(options.memo);

  validateAddresses(senderPublicKey, receiverPublicKey);

  const senderAccount = await getAccountDetails(senderPublicKey);
  const senderBalance = await getBalance(senderPublicKey);
  const feeReceiver = getPlatformFeeAddress();
  const fee = feeReceiver ? feeService.calculateFee(amount) : "0";
  const deduction = feeService.calculateTotalDeduction(amount, fee);

  const fundCheck = feeService.validateSufficientFunds(senderBalance, amount, fee);
  if (!fundCheck.isValid) {
    throw new Error(fundCheck.reason);
  }

  try {
    await getAccountDetails(receiverPublicKey);
  } catch (error) {
    throw new Error(`Receiver account not found: ${error.message}`);
  }

  return {
    senderPublicKey,
    receiverPublicKey,
    amount: deduction.amount,
    fee: deduction.fee,
    totalDeduction: deduction.totalDeduction,
    senderBalance,
    sourceSequence: senderAccount.sequence,
    memo,
    feeReceiver
  };
}

function buildTransaction(options, sourceAccount) {
  const network = getNetwork();
  const builder = new StellarSDK.TransactionBuilder(sourceAccount, {
    fee: StellarSDK.BASE_FEE,
    networkPassphrase: network.networkPassphrase
  });

  builder.addOperation(
    StellarSDK.Operation.payment({
      destination: options.receiverPublicKey,
      asset: StellarSDK.Asset.native(),
      amount: options.amount
    })
  );

  if (Number(options.fee) > 0 && options.feeReceiver) {
    builder.addOperation(
      StellarSDK.Operation.payment({
        destination: options.feeReceiver,
        asset: StellarSDK.Asset.native(),
        amount: options.fee
      })
    );
  }

  if (options.memo) {
    builder.addMemo(StellarSDK.Memo.text(options.memo));
  }

  builder.setTimeout(300);
  return builder.build();
}

function signTransaction(transaction, secretKey) {
  const keypair = StellarSDK.Keypair.fromSecret(secretKey.trim().toUpperCase());
  transaction.sign(keypair);
  return transaction;
}

async function submitTransaction(signedTransaction) {
  try {
    const server = new StellarSDK.Horizon.Server(getHorizonUrl());
    const result = await server.submitTransaction(signedTransaction);

    return {
      success: true,
      txHash: result.hash,
      ledger: result.ledger,
      timestamp: new Date(),
      result
    };
  } catch (error) {
    return {
      success: false,
      txHash: null,
      error: error.message,
      details: error.response?.data || null
    };
  }
}

async function createPendingRecord({ userId, idempotencyKey, prepared }) {
  const existing = await Transaction.findOne({
    from: prepared.senderPublicKey,
    idempotencyKey
  });

  if (existing) {
    return { record: existing, isReplay: true };
  }

  const senderName = await walletProfileService.resolveName(prepared.senderPublicKey);
  const receiverName = await walletProfileService.resolveName(prepared.receiverPublicKey);

  try {
    const record = await Transaction.create({
      userId,
      idempotencyKey,
      from: prepared.senderPublicKey,
      fromName: senderName,
      to: prepared.receiverPublicKey,
      toName: receiverName,
      amount: prepared.amount,
      fee: prepared.fee,
      feePercentage: prepared.feeReceiver ? feeService.getFeePercentage() : 0,
      asset: "XLM",
      type: "sent",
      status: "pending",
      network: (process.env.STELLAR_NETWORK || "testnet").toLowerCase(),
      metadata: {
        memo: prepared.memo,
        totalDeduction: prepared.totalDeduction,
        feeReceiver: prepared.feeReceiver
      }
    });

    return { record, isReplay: false };
  } catch (error) {
    if (error.code === 11000) {
      const record = await Transaction.findOne({
        from: prepared.senderPublicKey,
        idempotencyKey
      });
      if (record) return { record, isReplay: true };
    }

    throw error;
  }
}

async function executeTransaction(options) {
  const senderPublicKey = String(options.senderPublicKey || "").trim().toUpperCase();
  const receiverPublicKey = String(options.receiverPublicKey || "").trim().toUpperCase();
  const memo = normalizeMemo(options.memo);
  const amount = normalizeAmount(options.amount);
  const idempotencyKey = buildIdempotencyKey({
    ...options,
    senderPublicKey,
    receiverPublicKey,
    amount,
    memo
  });

  if (!idempotencyKey) {
    throw new Error("Idempotency key is required");
  }

  validateSecretForSender(options.senderSecretKey, senderPublicKey);

  const prepared = await prepareTransaction({
    senderPublicKey,
    receiverPublicKey,
    amount,
    memo
  });

  const { record, isReplay } = await createPendingRecord({
    userId: options.userId || null,
    idempotencyKey,
    prepared
  });

  if (isReplay) {
    return {
      success: record.status === "success",
      transaction: record.toObject(),
      idempotentReplay: true,
      submitDetails: {
        success: record.status === "success",
        error: record.errorMessage
      }
    };
  }

  try {
    const account = new StellarSDK.Account(senderPublicKey, prepared.sourceSequence);
    const builtTx = buildTransaction(prepared, account);
    const signedTx = signTransaction(builtTx, options.senderSecretKey);
    const submitResult = await submitTransaction(signedTx);

    record.status = submitResult.success ? "success" : "failed";
    record.txHash = submitResult.txHash;
    record.ledger = submitResult.ledger || null;
    record.errorMessage = submitResult.error || null;
    record.submittedAt = new Date();
    record.completedAt = new Date();
    await record.save();

    return {
      success: submitResult.success,
      transaction: record.toObject(),
      submitDetails: submitResult
    };
  } catch (error) {
    record.status = "failed";
    record.errorMessage = error.message;
    record.completedAt = new Date();
    await record.save();

    return {
      success: false,
      transaction: record.toObject(),
      submitDetails: {
        success: false,
        error: error.message
      }
    };
  }
}

async function getTransactionByHash(txHash) {
  return Transaction.findOne({ txHash });
}

async function getTransactionHistory(address, limit = 50, skip = 0) {
  const normalizedAddress = String(address || "").trim().toUpperCase();

  if (!isValidStellarAddress(normalizedAddress)) {
    throw new Error("Invalid address");
  }

  return Transaction.find({
    $or: [
      { from: normalizedAddress },
      { to: normalizedAddress }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 100))
    .skip(Math.max(Number(skip) || 0, 0));
}

module.exports = {
  getAccountDetails,
  getBalance,
  validateAddresses,
  prepareTransaction,
  buildTransaction,
  signTransaction,
  submitTransaction,
  executeTransaction,
  getTransactionByHash,
  getTransactionHistory
};
