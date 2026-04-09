// db.js
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

async function connectDb() {
  try {
    if (!MONGO_URI) {
      throw new Error("❌ MONGO_URI is not defined in .env");
    }

    await mongoose.connect(MONGO_URI);

    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
}

module.exports = { connectDb };
