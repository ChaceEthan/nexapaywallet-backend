const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: "No authorization header" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ success: false, message: "JWT_SECRET is not configured" });
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid session" });
    }

    if ((decoded.sessionVersion ?? -1) !== (user.sessionVersion || 0)) {
      return res.status(401).json({ success: false, message: "Session expired" });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      walletAddress: user.walletAddress || null,
      sessionVersion: user.sessionVersion || 0
    };
    req.authUser = user;
    return next();
  } catch (error) {
    const databaseUnavailable = [
      "MongoServerSelectionError",
      "MongooseServerSelectionError"
    ].includes(error.name) || /buffering timed out|not connected|topology/i.test(error.message || "");

    if (databaseUnavailable) {
      return res.status(503).json({
        success: false,
        message: "Authentication temporarily unavailable"
      });
    }

    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

function requireUnlockedWallet(req, res, next) {
  const user = req.authUser;

  if (!user?.walletAddress) {
    return res.status(400).json({ success: false, message: "User wallet not connected" });
  }

  if (!user.walletUnlockedUntil || user.walletUnlockedUntil.getTime() <= Date.now()) {
    return res.status(423).json({
      success: false,
      message: "Wallet is locked. Unlock wallet before sending."
    });
  }

  return next();
}

module.exports = {
  verifyToken,
  requireUnlockedWallet
};
