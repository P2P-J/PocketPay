const express = require("express");
const router = express.Router();
const { signupLocalController, loginLocalController } = require("../controllers/auth.controller");

router.post("/signup/local", signupLocalController);
router.post("/login/local", loginLocalController);

module.exports = router;