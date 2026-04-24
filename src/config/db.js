// ================= IMPORT =================
const mongoose = require("mongoose");

// ================= CONFIG =================
const MONGO_URI =
  process.env.MONGO_URI?.trim() ||
  "mongodb://127.0.0.1:27017/nexapay";

/**
 * @description Connect to MongoDB with retry + fallback support
 * @returns {Promise<boolean>} connection status
 */
async function connectDb() {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 5000; // 5 seconds

  if (!process.env.MONGO_URI) {
    console.warn(
      "⚠️ MONGO_URI not found in .env, using local fallback MongoDB"
    );
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `🔄 Attempting MongoDB connection... (${attempt}/${MAX_RETRIES})`
      );

      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      console.log("✅ MongoDB connected successfully");
      return true;
    } catch (error) {
      console.error(
        `❌ MongoDB connection attempt ${attempt} failed:`,
        error.message
      );

      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Retrying in ${RETRY_DELAY / 1000}s...`);
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY)
        );
      }
    }
  }

  console.warn("⚠️ All MongoDB connection attempts failed.");
  return false;
} 

module.exports = { connectDb };
