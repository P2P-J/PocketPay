const express = require("express");
const router = express.Router();
const {
  signupLocalController,
  loginLocalController,
  refreshTokenController,
  redirectToOAuthProvider,
  loginOauthController,
  getOAuthTokensController,
} = require("../controllers/auth.controller");
const { validate } = require("../middleware/validate.middleware");
const { signupSchema, loginSchema } = require("../validators/auth.validator");

// Local Auth
router.post("/signup/local", validate(signupSchema), signupLocalController);
router.post("/login/local", validate(loginSchema), loginLocalController);

// Token Refresh
router.post("/refresh", refreshTokenController);

// OAuth
router.get("/login/oauth/:provider", redirectToOAuthProvider);
router.get("/login/oauth/:provider/callback", loginOauthController);
router.get("/oauth-tokens", getOAuthTokensController);

module.exports = router;
