const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexapay";

function connectDb() {
  mongoose.set("strictQuery", true);

  return mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("? MongoDB connected to", MONGO_URI);
    })
    .catch((error) => {
      console.error("? MongoDB connection error:", error);
      throw error;
    });
}

module.exports = { connectDb, MONGO_URI };
