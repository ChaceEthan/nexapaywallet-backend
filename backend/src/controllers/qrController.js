const WalletProfile = require("../models/WalletProfile");
const { validateAddressString } = require("../utils/addressValidator");

const STELLAR_ADDRESS_PATTERN = /G[A-Z2-7]{55}/i;

function normalizeAmount(amount) {
  if (amount === undefined || amount === null || amount === "") return null;

  const amountString = String(amount).trim();
  const amountNumber = Number(amountString);

  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    throw new Error("Invalid QR amount");
  }

  const [, decimals = ""] = amountString.split(".");
  if (decimals.length > 7) {
    throw new Error("QR amount supports up to 7 decimal places");
  }

  return amountNumber.toFixed(7).replace(/\.?0+$/, "");
}

function findAddress(value) {
  const match = String(value || "").match(STELLAR_ADDRESS_PATTERN);
  return match ? match[0].toUpperCase() : null;
}

function getAmountFromSearch(searchParams) {
  return (
    searchParams.get("amount") ||
    searchParams.get("value") ||
    searchParams.get("xlm") ||
    null
  );
}

function parseJsonPayload(payload) {
  try {
    const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    return {
      address: parsed.address || parsed.destination || parsed.to || parsed.publicKey || null,
      amount: parsed.amount ?? parsed.value ?? null
    };
  } catch (error) {
    return null;
  }
}

function parseUrlPayload(payload) {
  try {
    const url = new URL(String(payload));
    return {
      address:
        url.searchParams.get("destination") ||
        url.searchParams.get("address") ||
        url.searchParams.get("to") ||
        findAddress(url.pathname),
      amount: getAmountFromSearch(url.searchParams)
    };
  } catch (error) {
    return null;
  }
}

function parseQueryPayload(payload) {
  const value = String(payload || "");
  if (!value.includes("=")) return null;

  const query = value.includes("?") ? value.slice(value.indexOf("?") + 1) : value;
  const params = new URLSearchParams(query);

  return {
    address:
      params.get("destination") ||
      params.get("address") ||
      params.get("to") ||
      findAddress(value),
    amount: getAmountFromSearch(params)
  };
}

function parseLooseAmount(payload) {
  const match = String(payload || "").match(/(?:amount|value|xlm)\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i);
  return match ? match[1] : null;
}

function parseQrPayload(payload) {
  if (!payload) {
    throw new Error("QR payload is required");
  }

  const parsedJson = parseJsonPayload(payload);
  const parsedUrl = parseUrlPayload(payload);
  const parsedQuery = parseQueryPayload(payload);
  const source = parsedJson || parsedUrl || parsedQuery || {};

  const address = findAddress(source.address || payload);
  if (!address) {
    throw new Error("Invalid QR address");
  }

  const validation = validateAddressString(address);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid address format");
  }

  return {
    address,
    amount: normalizeAmount(source.amount ?? parseLooseAmount(payload))
  };
}

async function resolveAddress(req, res) {
  try {
    const parsed = parseQrPayload(req.params.address);
    const profile = await WalletProfile.findOne({
      address: parsed.address
    });

    const response = {
      isValid: true,
      address: parsed.address,
      amount: parsed.amount
    };

    if (profile) {
      response.name = profile.name;
      response.type = profile.type;
      response.accountStatus = profile.accountStatus;
    } else {
      response.name = null;
    }

    return res.json(response);
  } catch (error) {
    return res.status(400).json({
      isValid: false,
      message: error.message || "Invalid QR payload"
    });
  }
}

async function parseQr(req, res) {
  try {
    const payload = req.body.payload || req.body.qr || req.body;
    const parsed = parseQrPayload(payload);

    return res.json(parsed);
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Invalid QR payload"
    });
  }
}

module.exports = {
  resolveAddress,
  parseQr,
  parseQrPayload
};
