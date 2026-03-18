const express = require("express");
const router = express.Router();
const {
    signupLocalController,
    loginLocalController,
    loginOauthController,
} = require("../controllers/auth.controller");
const { validate } = require("../middleware/validate.middleware");
const { signupSchema, loginSchema } = require("../validators/auth.validator");

// =====================LOCAL AUTH ROUTES===================== //
router.post("/signup/local", validate(signupSchema), signupLocalController);
router.post("/login/local", validate(loginSchema), loginLocalController);

const providers = require('../services/auth/providers');

// =====================OAUTH ROUTES===================== //
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

// OAuth callback
router.get('/login/oauth/:provider/callback', loginOauthController);

module.exports = router;
