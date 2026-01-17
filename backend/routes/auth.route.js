const express = require("express");
const router = express.Router();
const {
    signupLocalController,
    loginLocalController,
    loginOauthController,
    loginOauthCallbackController,
} = require("../controllers/auth.controller");

// =====================LOCAL AUTH ROUTES===================== //
// local : http://localhost:3000/auth/login/local
router.post("/signup/local", signupLocalController);
router.post("/login/local", loginLocalController);
// =====================OAUTH ROUTES===================== //
// google : http://localhost:3000/auth/login/oauth/google
// naver : http://localhost:3000/auth/login/oauth/naver
router.get('/login/oauth/:provider', loginOauthController);
router.get('/login/oauth/:provider/callback', loginOauthCallbackController);

module.exports = router;