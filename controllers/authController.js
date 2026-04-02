const User = require("../models/User");

function generateToken(userId, email) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ userId, email, iat: Math.floor(Date.now() / 1000) })).toString("base64url");
  return `${header}.${payload}.signature`;
}

function generateRandomWalletAddress() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let address = "G";
  for (let i = 1; i < 56; i += 1) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
}

async function signup(req, res) {
  try {
    const { firstName, lastName, email, password, country, phoneNumber } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const walletAddress = req.body.walletAddress || generateRandomWalletAddress();

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      country,
      phoneNumber,
      walletAddress,
    });

    await user.save();

    const token = generateToken(user._id, user.email);

    return res.status(201).json({
      message: "User created successfully",
      email: user.email,
      walletAddress: user.walletAddress,
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Error creating user", error: error.message });
  }
}

async function signin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id, user.email);

    return res.json({
      message: "Sign in successful",
      email: user.email,
      walletAddress: user.walletAddress,
      token,
      userId: user._id,
    });
  } catch (error) {
    console.error("Signin error:", error);
    return res.status(500).json({ message: "Error signing in", error: error.message });
  }
}

module.exports = { signup, signin };
