const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { createToken, serializeUser } = require("../utils/authToken");

exports.signup = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    let user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({
      email: email.trim().toLowerCase(),
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
    return res.status(500).json({ success: false, message: "Signup error", error: err.message });
  }
};

exports.signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const token = createToken(user);

    return res.json({
      success: true,
      message: "Signin successful",
      token,
      user: serializeUser(user)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Signin error", error: err.message });
  }
};
