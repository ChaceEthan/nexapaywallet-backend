// src/config/db.js
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

async function connectDb() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
}

module.exports = { connectDb };
