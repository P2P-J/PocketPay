const express = require("express");
const router = express.Router();
const {
    signupLocalController,
    loginLocalController,
    loginOauthController,
    loginOauthCallbackController,
} = require("../controllers/auth.controller");

// =====================LOCAL AUTH ROUTES===================== //
// local : http://localhost:3000/auth/login
router.post("/signup", signupLocalController);
router.post("/login", loginLocalController);
// =====================OAUTH ROUTES===================== //
// google : http://localhost:3000/auth/oauth/google
// naver : http://localhost:3000/auth/oauth/naver
router.get('/oauth/:provider', loginOauthController);
router.get('/oauth/:provider/callback', loginOauthCallbackController);

module.exports = router;