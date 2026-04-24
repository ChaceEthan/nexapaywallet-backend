<<<<<<< HEAD
=======
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/apiError");
const { ApiResponse } = require("../utils/apiResponse");
>>>>>>> 81195e5 (Fix backend: Binance service + MongoDB + market cleanup)
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

<<<<<<< HEAD
// ================= SIGNUP =================
exports.signup = async (req, res) => {
  const { email, password } = req.body;

   try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });
 
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
 
    user = new User({
      email,
      password: hashedPassword
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, walletAddress: user.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        walletAddress: user.walletAddress
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Signup error", error: err.message });
  }
};

// ================= SIGNIN =================
exports.signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, walletAddress: user.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Signin successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        walletAddress: user.walletAddress
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Signin error", error: err.message });
  }
=======
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
>>>>>>> 81195e5 (Fix backend: Binance service + MongoDB + market cleanup)
};