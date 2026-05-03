const express = require("express");
const router = express.Router();
const { getUserCount } = require("../controllers/userController");

// ================= USER TRACKING ROUTES =================
router.get("/count", getUserCount);

module.exports = router;
