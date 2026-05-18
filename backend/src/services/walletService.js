const StellarSDK = require("@stellar/stellar-sdk");
const User = require("../models/User");
const { isValidStellarAddress, isValidStellarSecret } = require("../utils/network");
const { normalizeAndValidatePhrase } = require("../utils/mnemonicValidator");

function makeError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeAddress(address) {
  const normalized = String(address || "").trim().toUpperCase();
  if (!isValidStellarAddress(normalized)) {
    throw makeError(400, "Valid Stellar wallet address required");
  }
  return normalized;
}

function deriveAddressFromSecret(secretKey) {
  const normalizedSecret = String(secretKey || "").trim().toUpperCase();
  if (!isValidStellarSecret(normalizedSecret)) {
    throw makeError(400, "Valid Stellar secret key required");
  }

  return {
    secretKey: normalizedSecret,
    walletAddress: StellarSDK.Keypair.fromSecret(normalizedSecret).publicKey()
  };
}

function assertRecoveryConfirmed(recoveryConfirmed) {
  if (recoveryConfirmed !== true) {
    throw makeError(409, "Recovery confirmation is required before this wallet action");
  }
}

function getProvidedRecoveryPhrase(payload = {}) {
  for (const key of ["recoveryPhrase", "mnemonic", "seedPhrase"]) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      return {
        provided: true,
        value: payload[key]
      };
    }
  }

  return {
    provided: false,
    value: null
  };
}

function validateProvidedRecoveryPhrase(payload = {}) {
  const phrase = getProvidedRecoveryPhrase(payload);
  if (!phrase.provided) return null;

  try {
    return normalizeAndValidatePhrase(phrase.value);
  } catch (error) {
    throw makeError(400, `Invalid recovery phrase: ${error.message}`);
  }
}

function getWalletIdentity(payload = {}) {
  const hasSecret = typeof payload.secretKey === "string" && payload.secretKey.trim().length > 0;
  const hasAddress = typeof payload.walletAddress === "string" && payload.walletAddress.trim().length > 0;

  if (!hasSecret && !hasAddress) {
    throw makeError(400, "walletAddress or secretKey is required");
  }

  if (hasSecret) {
    const derived = deriveAddressFromSecret(payload.secretKey);
    if (hasAddress && normalizeAddress(payload.walletAddress) !== derived.walletAddress) {
      throw makeError(400, "walletAddress does not match the supplied secretKey");
    }
    return { ...derived, importedFromSecret: true };
  }

  return {
    walletAddress: normalizeAddress(payload.walletAddress),
    secretKey: null,
    importedFromSecret: false
  };
}

async function assertWalletAvailable(userId, walletAddress) {
  const existingUser = await User.findOne({ walletAddress }).select("_id email");
  if (existingUser && existingUser._id.toString() !== userId) {
    throw makeError(409, "Wallet address is already linked to another account");
  }
}

async function setActiveWallet(userId, walletAddress) {
  await assertWalletAvailable(userId, walletAddress);

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          walletAddress,
          walletUnlockedUntil: null
        },
        $inc: {
          sessionVersion: 1
        }
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      throw makeError(404, "User not found");
    }

    return user;
  } catch (error) {
    if (error.code === 11000) {
      throw makeError(409, "Wallet address is already linked to another account");
    }
    throw error;
  }
}

async function createWallet(userId, payload = {}) {
  assertRecoveryConfirmed(payload.recoveryConfirmed);
  validateProvidedRecoveryPhrase(payload);

  const keypair = StellarSDK.Keypair.random();
  const walletAddress = keypair.publicKey();
  const secretKey = keypair.secret();
  const user = await setActiveWallet(userId, walletAddress);

  return {
    user,
    wallet: {
      walletAddress,
      secretKey,
      secretReturnedOnce: true,
      recoveryConfirmed: true
    }
  };
}

async function importWallet(userId, payload = {}) {
  assertRecoveryConfirmed(payload.recoveryConfirmed);
  validateProvidedRecoveryPhrase(payload);

  const identity = getWalletIdentity(payload);
  const user = await setActiveWallet(userId, identity.walletAddress);

  return {
    user,
    wallet: {
      walletAddress: identity.walletAddress,
      importedFromSecret: identity.importedFromSecret,
      recoveryConfirmed: true
    }
  };
}

async function switchWallet(userId, payload = {}) {
  return importWallet(userId, payload);
}

async function disconnectWallet(userId, payload = {}) {
  if (payload.confirmDisconnect !== true) {
    throw makeError(400, "confirmDisconnect must be true");
  }
  assertRecoveryConfirmed(payload.recoveryConfirmed);

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $unset: {
        walletAddress: ""
      },
      $set: {
        walletUnlockedUntil: null
      },
      $inc: {
        sessionVersion: 1
      }
    },
    { new: true, runValidators: true }
  ).select("-password");

  if (!user) {
    throw makeError(404, "User not found");
  }

  return user;
}

async function fundTestnetAccount(publicKey) {
  try {
    const normalizedPublicKey = normalizeAddress(publicKey);
    const res = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(normalizedPublicKey)}`
    );

    if (res.status === 429) {
      throw new Error("Friendbot rate limited");
    }

    if (!res.ok) {
      throw new Error("Friendbot unavailable");
    }

    return await res.json();
  } catch (error) {
    console.error("Friendbot error:", error);
    throw new Error("Could not connect to Friendbot");
  }
}

module.exports = {
  normalizeAddress,
  deriveAddressFromSecret,
  createWallet,
  importWallet,
  switchWallet,
  disconnectWallet,
  fundTestnetAccount
};
