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

    if (provider === 'naver') {
        const authUrl = oauthProvider.getAuthUrl();

        return res.redirect(authUrl);
    } else if (provider === 'google') {
        const forceConsent =
            req.query.forceConsent === "1" ||
            req.cookies?.force_google_consent === "1";

        const state = req.query.state;

        const authUrl = oauthProvider.getAuthUrl({ forceConsent, state });
        
        return res.redirect(authUrl);
    }
});

// OAuth callback 보내기
router.get('/login/oauth/:provider/callback', loginOauthController);

module.exports = router;