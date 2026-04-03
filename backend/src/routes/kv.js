const express = require("express");
const router = express.Router();
const { getValue, setValue } = require("../controllers/kvController");

router.get("/kv/get/:key", getValue);
router.post("/kv/set", setValue);

module.exports = router;
