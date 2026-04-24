const mongoose = require("mongoose");
 
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  walletAddress: {
    type: String,
    unique: true, // Ensures no two users have the same wallet address
    sparse: true, // Allows multiple documents to have a null or undefined walletAddress
  },
});
 
module.exports = mongoose.model("User", UserSchema);