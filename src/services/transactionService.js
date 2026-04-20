/**
 * Transaction Service
 * Core engine for sending transactions securely on Stellar network
 * Handles signing, validation, and submission
 */

const axios = require("axios");
const StellarSDK = require("@stellar/stellar-sdk");
const Transaction = require("../models/Transaction");
const feeService = require("./feeService");
const walletProfileService = require("./walletProfileService");
const { getHorizonUrl, getNetwork, isValidStellarAddress } = require("../config/network");

/**
 * Get account details from Stellar network
 * 
 * @param {string} publicKey - Stellar public key
 * @returns {object} Account details
 */
async function getAccountDetails(publicKey) {
  if (!isValidStellarAddress(publicKey)) {
    throw new Error("Invalid Stellar address");
  }

  try {
    const horizonUrl = getHorizonUrl();
    const response = await axios.get(`${horizonUrl}/accounts/${publicKey}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Account not found on network. Please fund account first.");
    }
    throw new Error(`Failed to fetch account: ${error.message}`);
  }
}

/**
 * Get account balance
 * 
 * @param {string} publicKey - Stellar public key
 * @returns {string} Balance in XLM
 */
async function getBalance(publicKey) {
  const account = await getAccountDetails(publicKey);
  const nativeBalance = account.balances.find(b => b.asset_type === "native");
  return nativeBalance ? nativeBalance.balance : "0";
}

/**
 * Validate sender and receiver addresses
 * 
 * @param {string} senderPublicKey - Sender's public key
 * @param {string} receiverPublicKey - Receiver's public key
 * @throws {Error} If addresses are invalid
 */
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

/**
 * Prepare transaction for sending
 * Validates balance, calculates fee, builds Stellar transaction
 * 
 * @param {object} options - Transaction options
 *   - senderPublicKey: Sender's Stellar address
 *   - receiverPublicKey: Receiver's Stellar address
 *   - amount: Amount to send in XLM
 *   - memo: Optional transaction memo
 * @returns {object} Prepared transaction with details
 */
async function prepareTransaction(options) {
  const { senderPublicKey, receiverPublicKey, amount, memo = null } = options;

  // Validate addresses
  validateAddresses(senderPublicKey, receiverPublicKey);

  // Validate amount
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error("Amount must be a positive number");
  }

  // Get sender account details
  const senderAccount = await getAccountDetails(senderPublicKey);
  const senderBalance = await getBalance(senderPublicKey);

  // Calculate fee
  const fee = feeService.calculateFee(amount);
  const deduction = feeService.calculateTotalDeduction(amount, fee);

  // Validate sufficient funds
  const fundCheck = feeService.validateSufficientFunds(senderBalance, amount, fee);
  if (!fundCheck.isValid) {
    throw new Error(fundCheck.reason);
  }

  // Receiver must exist on network
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
    isValid: true,
    memo
  };
}

/**
 * Build unsigned Stellar transaction
 * Ready for backend signing
 * 
 * @param {object} options - Transaction options (from prepareTransaction)
 * @param {object} sourceAccount - Source account from Stellar network
 * @returns {object} Built transaction envelope
 */
function buildTransaction(options, sourceAccount) {
  const { senderPublicKey, receiverPublicKey, amount, memo } = options;

  const network = getNetwork();
  const builder = new StellarSDK.TransactionBuilder(sourceAccount, {
    fee: 100, // Base fee in stroops (1 XLM = 10,000,000 stroops)
    networkPassphrase: network.networkPassphrase
  });

  // Add payment operation
  builder.addOperation(
    StellarSDK.Operation.payment({
      destination: receiverPublicKey,
      asset: StellarSDK.Asset.native(),
      amount: amount
    })
  );

  // Add memo if provided
  if (memo) {
    if (memo.length > 28) {
      throw new Error("Memo too long (max 28 bytes)");
    }
    builder.addMemo(StellarSDK.Memo.text(memo));
  }

  // Set timeout
  builder.setTimeout(300); // 5 minutes

  return builder.build();
}

/**
 * Sign transaction with secret key (SERVER-SIDE ONLY)
 * CRITICAL: Never expose secret key to frontend
 * 
 * @param {object} transaction - Unsigned transaction envelope
 * @param {string} secretKey - Sender's secret key (from secure server config only)
 * @returns {object} Signed transaction envelope
 */
function signTransaction(transaction, secretKey) {
  if (!secretKey || !secretKey.startsWith("S")) {
    throw new Error("Invalid secret key");
  }

  try {
    const keypair = StellarSDK.Keypair.fromSecret(secretKey);
    transaction.sign(keypair);
    return transaction;
  } catch (error) {
    throw new Error(`Failed to sign transaction: ${error.message}`);
  }
}

/**
 * Submit signed transaction to Stellar network
 * 
 * @param {object} signedTransaction - Signed transaction envelope
 * @returns {object} Transaction result with hash
 */
async function submitTransaction(signedTransaction) {
  try {
    const horizonUrl = getHorizonUrl();
    const server = new StellarSDK.Server(horizonUrl);
    
    const result = await server.submitTransaction(signedTransaction);
    
    return {
      success: true,
      txHash: result.hash,
      ledger: result.ledger,
      timestamp: new Date(),
      result
    };
  } catch (error) {
    console.error("Stellar submission error:", error);
    
    return {
      success: false,
      txHash: null,
      error: error.message,
      details: error.response?.data || null
    };
  }
}

/**
 * Complete transaction flow: prepare → build → sign → submit → record
 * CRITICAL: This is the ONLY place where secret key should be handled
 * 
 * @param {object} options - Transaction options
 *   - senderPublicKey: Stellar address
 *   - receiverPublicKey: Stellar address
 *   - amount: Amount in XLM
 *   - senderSecretKey: Secret key (from secure server only)
 *   - memo: Optional memo
 * @returns {object} Transaction result
 */
async function executeTransaction(options) {
  const { senderPublicKey, receiverPublicKey, amount, senderSecretKey, memo } = options;

  if (!senderSecretKey) {
    throw new Error("Secret key required for transaction execution");
  }

  // Step 1: Prepare
  const prepared = await prepareTransaction({
    senderPublicKey,
    receiverPublicKey,
    amount,
    memo
  });

  // Step 2: Get source account from network
  const sourceAccount = await getAccountDetails(senderPublicKey);
  const account = new StellarSDK.Account(senderPublicKey, sourceAccount.sequence);

  // Step 3: Build transaction
  const builtTx = buildTransaction(prepared, account);

  // Step 4: Sign transaction (server-side)
  const signedTx = signTransaction(builtTx, senderSecretKey);

  // Step 5: Submit to network
  const submitResult = await submitTransaction(signedTx);

  // Step 6: Record in database
  const senderName = await walletProfileService.resolveName(senderPublicKey);
  const receiverName = await walletProfileService.resolveName(receiverPublicKey);

  const transactionRecord = new Transaction({
    from: senderPublicKey,
    fromName: senderName,
    to: receiverPublicKey,
    toName: receiverName,
    amount: prepared.amount,
    fee: prepared.fee,
    feePercentage: feeService.getFeePercentage(),
    asset: "XLM",
    type: "sent",
    status: submitResult.success ? "success" : "failed",
    txHash: submitResult.txHash,
    ledger: submitResult.ledger || null,
    errorMessage: submitResult.error || null,
    metadata: { memo }
  });

  await transactionRecord.save();

  return {
    success: submitResult.success,
    transaction: transactionRecord.toObject(),
    submitDetails: submitResult
  };
}

/**
 * Get transaction by hash
 * 
 * @param {string} txHash - Transaction hash
 * @returns {object|null} Transaction or null
 */
async function getTransactionByHash(txHash) {
  return await Transaction.findOne({ txHash });
}

/**
 * Get transaction history for an address
 * 
 * @param {string} address - Wallet address
 * @param {number} limit - Number of records (default 50)
 * @param {number} skip - Number of records to skip
 * @returns {array} Transaction history
 */
async function getTransactionHistory(address, limit = 50, skip = 0) {
  if (!isValidStellarAddress(address)) {
    throw new Error("Invalid address");
  }

  const query = {
    $or: [
      { from: address },
      { to: address }
    ]
  };

  const transactions = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  return transactions;
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
