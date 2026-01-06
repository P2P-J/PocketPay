const express = require("express");
const router = express.Router();
const { 
    signupLocalController, 
    loginLocalController,
    loginOauthController,
} = require("../controllers/auth.controller");

router.post("/signup/local", signupLocalController);
router.post("/login/local", loginLocalController);
router.post("/login/oauth", loginOauthController);


module.exports = router;