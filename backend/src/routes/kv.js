// src/routes/kv.js

const express = require("express");
const { getValue, setValue } = require("../controllers/kvController");

const router = express.Router();

// Endpoints
router.get("/kv/get/:key", getValue);
router.post("/kv/set", setValue);

module.exports = router;
