const jwt = require("jsonwebtoken");

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    const error = new Error("JWT_SECRET is not configured");
    error.statusCode = 500;
    throw error;
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      walletAddress: user.walletAddress || null,
      sessionVersion: user.sessionVersion || 0
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

function serializeUser(user) {
  return {
    id: user._id,
    email: user.email,
    walletAddress: user.walletAddress || null,
    walletUnlockedUntil: user.walletUnlockedUntil || null,
    sessionVersion: user.sessionVersion || 0
  };
}

module.exports = {
  createToken,
  serializeUser
};
