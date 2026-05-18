const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { createToken, serializeUser } = require("../utils/authToken");

exports.signup = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const email = String(body.email || "").trim().toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Valid email is required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters" });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({ success: false, error: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({
      email,
      password: hashedPassword
    });

    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      token,
      user: serializeUser(user)
    });
  } catch (err) {
    console.error("Register/signup error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
};

exports.signin = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const email = String(body.email || "").trim().toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ success: false, error: "Invalid credentials" });
    }

    const token = createToken(user);

    return res.json({
      success: true,
      message: "Signin successful",
      token,
      user: serializeUser(user)
    });
  } catch (err) {
    console.error("Signin error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
};
