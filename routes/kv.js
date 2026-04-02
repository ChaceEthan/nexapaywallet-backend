const express = require("express");
const router = express.Router();
const { getValue, setValue } = require("../controllers/kvController");

router.get("/get_value/:key", getValue);
router.post("/set_value", setValue);

module.exports = router;
