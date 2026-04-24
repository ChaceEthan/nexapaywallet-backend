const express = require("express");
const router = express.Router();
const{ asyncHandler } = require("../utils/asyncHandler");const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse"); 
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
 
/**
 * @description User Signup
 * @route POST /api/v1/auth/signup
 */
const signup = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User with this email already exists");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    email,
    password: hashedPassword,
  });

  const token = jwt.sign(
    { id: user._id, walletAddress: user.walletAddress },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "1d" }
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        token,
        user: {
          id: user._id,
          email: user.email,
          walletAddress: user.walletAddress,
        },
      },
      "User registered successfully"
    )
  );
});

/**
 * @description User Signin
 * @route POST /api/v1/auth/signin
 */
const signin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = jwt.sign(
    { id: user._id, walletAddress: user.walletAddress },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "1d" }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        token,
        user: {
          id: user._id,
          email: user.email,
          walletAddress: user.walletAddress,
        },
      },
      "Logged in successfully"
    )
  );
});

module.exports = {
  signup,
  signin,
}; 