<<<<<<< HEAD
// db.js
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI?.trim() || "mongodb://127.0.0.1:27017/nexapay";

async function connectDb() {
  try {
    if (!process.env.MONGO_URI) {
      console.warn(
        "⚠️ MONGO_URI is not defined in .env. Using fallback local MongoDB URL: mongodb://127.0.0.1:27017/nexapay"
      );
    }

    await mongoose.connect(MONGO_URI);

    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
=======
const mongoose = require("mongoose");

/**
 * @description Connects to MongoDB with a retry mechanism
 * @returns {Promise<boolean>} Success status
 */
async function connectDb() {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000; // 5 seconds

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempting MongoDB connection... (${attempt}/${MAX_RETRIES})`);
      await mongoose.connect(process.env.MONGO_URI);
      console.log("✅ MongoDB connected successfully");
      return true;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error.message);
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  return false;
>>>>>>> 81195e5 (Fix backend: Binance service + MongoDB + market cleanup)
}

module.exports = { connectDb };
