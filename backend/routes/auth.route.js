const express = require("express");
const router = express.Router();
const {
    signupLocalController,
    loginLocalController,
    loginOauthController,
} = require("../controllers/auth.controller");

// =====================LOCAL AUTH ROUTES===================== //
// local : http://localhost:3000/auth/login/local
router.post("/signup/local", signupLocalController);
router.post("/login/local", loginLocalController);

const providers = require('../services/auth/providers');
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");

// =====================OAUTH ROUTES===================== //
// OAuth 시작 (redirect 보내기)
// google : http://localhost:3000/auth/login/oauth/google
// naver : http://localhost:3000/auth/login/oauth/naver
router.get('/login/oauth/:provider', (req, res) => {
    const { provider } = req.params;

    const oauthProvider = providers[provider];
    if (!oauthProvider) {
        return res.status(400).json({ message: 'INVALID_PROVIDER' });
    }

    const authUrl = oauthProvider.getAuthUrl();
    res.redirect(authUrl);
});

// OAuth callback 보내기
router.get('/login/oauth/:provider/callback', loginOauthController);

// =====================USER INFO ROUTE===================== //
const { getMeController } = require("../controllers/auth.controller");
router.get('/me', loginUserVerify, getMeController);

module.exports = router;