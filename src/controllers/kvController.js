// @ts-nocheck
const KVStore = require("../models/KVStore");

async function getValue(req, res) {
  try {
    const { key } = req.params;

    const record = await KVStore.findOne({ key });
    if (!record) {
      return res.status(404).json({ message: "Key not found" });
    }

    return res.json({ key, value: record.value });
  } catch (error) {
    console.error("GetValue error:", error);
    return res.status(500).json({ message: "Error retrieving value", error: error.message });
  }
}

async function setValue(req, res) {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ message: "Key is required" });
    }

    const record = await KVStore.findOneAndUpdate(
      { key },
      { key, value, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return res.json({ message: "Value set successfully", key: record.key, value: record.value });
  } catch (error) {
    console.error("SetValue error:", error);
    return res.status(500).json({ message: "Error setting value", error: error.message });
  }
}

module.exports = { getValue, setValue };
