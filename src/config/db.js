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
}

module.exports = { connectDb };
