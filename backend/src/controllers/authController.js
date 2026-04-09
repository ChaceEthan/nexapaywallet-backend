 const jwt = require("jsonwebtoken");
const User = require("../models/User");
const bcrypt = require("bcrypt");
 
exports.signup = async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed });
    res.status(201).json({ message: "Signup successful", user: { id: user._id, email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // ✅ Set cookie for cross-domain
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,        // HTTPS only
      sameSite: "none",    // cross-site cookie
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ message: "Signin successful", user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};