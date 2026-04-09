const express = require("express");
const router = express.Router();
const { signup, signin } = require("../controllers/authController");

router.post("/auth/signup", signup);
router.post("/auth/signin", signin);

module.exports = router;
