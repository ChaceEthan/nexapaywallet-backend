require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
const corsOptions = {
  origin: [
    process.env.CORS_ORIGIN || 'https://nexapay-wallet.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexapay';

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    // Don't exit, allow server to start even if MongoDB is unavailable
  });

// ==================== USER MODEL ====================
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  phoneNumber: String,
  country: String,
  walletAddress: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// ==================== KV STORE MODEL ====================
const kvSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now },
});

const KVStore = mongoose.model('KVStore', kvSchema);

// ==================== HELPER FUNCTIONS ====================

// Generate a simple wallet address (Stellar format: starts with G, 56 chars)
function generateWalletAddress() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let address = 'G';
  for (let i = 1; i < 56; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
}

// Simple JWT token generation (without external lib for simplicity)
function generateToken(userId, email) {
  // For production, use jsonwebtoken library
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, email, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
  return `${header}.${payload}.signature`;
}

// ==================== ROUTES ====================

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// User Sign Up
app.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password, country, phoneNumber } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Generate wallet address
    const walletAddress = generateWalletAddress();

    // Create user (in production, hash the password!)
    const user = new User({
      firstName,
      lastName,
      email,
      password, // ⚠️ In production, use bcrypt!
      country,
      phoneNumber,
      walletAddress,
    });

    await user.save();

    const token = generateToken(user._id, user.email);

    res.status(201).json({
      message: 'User created successfully',
      email: user.email,
      walletAddress: user.walletAddress,
      token,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// User Sign In
app.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      // ⚠️ In production, use bcrypt for password comparison!
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id, user.email);

    res.json({
      message: 'Sign in successful',
      email: user.email,
      walletAddress: user.walletAddress,
      token,
      userId: user._id,
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ message: 'Error signing in', error: error.message });
  }
});

// Deposit Funds (mock endpoint)
app.post('/deposit', async (req, res) => {
  try {
    const { walletAddress, amount, currency } = req.body;

    if (!walletAddress || !amount) {
      return res.status(400).json({ message: 'Wallet address and amount are required' });
    }

    // In production, this would interact with blockchain/payment processor
    res.json({
      message: 'Deposit initiated successfully',
      transactionId: `TXN_${Date.now()}`,
      walletAddress,
      amount,
      currency,
      status: 'pending',
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ message: 'Error processing deposit', error: error.message });
  }
});

// Get Value (KV Store)
app.get('/get_value/:key', async (req, res) => {
  try {
    const { key } = req.params;

    const record = await KVStore.findOne({ key });
    if (!record) {
      return res.status(404).json({ message: 'Key not found' });
    }

    res.json({ key, value: record.value });
  } catch (error) {
    console.error('GetValue error:', error);
    res.status(500).json({ message: 'Error retrieving value', error: error.message });
  }
});

// Set Value (KV Store)
app.post('/set_value', async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ message: 'Key is required' });
    }

    // Upsert (update or insert)
    const record = await KVStore.findOneAndUpdate(
      { key },
      { key, value, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ message: 'Value set successfully', key, value: record.value });
  } catch (error) {
    console.error('SetValue error:', error);
    res.status(500).json({ message: 'Error setting value', error: error.message });
  }
});

// ==================== ERROR HANDLERS ====================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', path: req.path });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ==================== SERVER START ====================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     NexaPay Backend Server Started     ║
╠════════════════════════════════════════╣
║ Port: ${PORT}
║ Env: ${process.env.NODE_ENV || 'development'}
║ CORS Origins: ${process.env.CORS_ORIGIN || 'localhost:5173'}
║ MongoDB: ${MONGO_URI ? 'Connected' : 'Not configured'}
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
