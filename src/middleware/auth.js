 const jwt = require("jsonwebtoken");
const { ApiError } = require("../utils/apiError");
const { asyncHandler } = require("../utils/asyncHandler");

/**
 * @description Middleware to verify JWT token
 */
const verifyToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "No authorization token provided");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    req.user = decoded;
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }
}); 
module.exports = { verifyToken };
