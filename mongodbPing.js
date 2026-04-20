// @ts-nocheck
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGO_URI;

// 🔥 CHECK IF MONGO_URI EXISTS
if (!uri) {
  console.error("❌ MONGO_URI is missing in .env file");
  process.exit(1); // Exit gracefully with error code to prevent silent crash
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
let isConnected = false;

async function connectDB() {
  try {
    if (isConnected && db) return db;

    console.log("🔄 Connecting to MongoDB...");

    await client.connect();

    db = client.db("nexapay");
    isConnected = true;

    console.log("✅ MongoDB Connected Successfully");

    return db;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);

    // 🔥 DO NOT CRASH NODE
    console.warn("⚠️ Backend will continue running without DB connection");

    return null;
  }
}

module.exports = connectDB;