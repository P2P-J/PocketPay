const express = require("express");
const router = express.Router();
const {
  signupLocalController,
  loginLocalController,
  redirectToOAuthProvider,
  loginOauthController,
} = require("../controllers/auth.controller");
const { validate } = require("../middleware/validate.middleware");
const { signupSchema, loginSchema } = require("../validators/auth.validator");

// Local Auth
router.post("/signup/local", validate(signupSchema), signupLocalController);
router.post("/login/local", validate(loginSchema), loginLocalController);

// OAuth
router.get("/login/oauth/:provider", redirectToOAuthProvider);
router.get("/login/oauth/:provider/callback", loginOauthController);

module.exports = router;
