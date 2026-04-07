// @ts-nocheck
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Generate JWT
function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// SIGNUP
async function signup(req, res) {
  try {
    const { firstName, lastName, email, password, country, phoneNumber } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashed,
      country,
      phoneNumber
    });

    const token = generateToken(user);

    res.status(201).json({
      message: "User created",
      email: user.email,
      token
    });

  } catch (err) {
    res.status(500).json({ message: "Signup error", error: err.message });
  }
}

// SIGNIN
async function signin(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);

    res.json({
      message: "Login successful",
      token,
      email: user.email,
      walletAddress: user.walletAddress
    });

  } catch (err) {
    res.status(500).json({ message: "Signin error", error: err.message });
  }
}

module.exports = { signup, signin };
