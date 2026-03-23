const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const {
  signupLocalController,
  loginLocalController,
  refreshTokenController,
  redirectToOAuthProvider,
  loginOauthController,
  getOAuthTokensController,
  sendVerificationCodeController,
  verifyCodeController,
  resetPasswordController,
} = require("../controllers/auth.controller");
const { validate } = require("../middleware/validate.middleware");
const { signupSchema, loginSchema } = require("../validators/auth.validator");

// 이메일 발송 rate limit (IP당 분당 3회)
const emailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { message: "너무 많은 요청입니다. 1분 후 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});

// 인증코드 검증 rate limit (IP당 분당 10회)
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "너무 많은 시도입니다. 잠시 후 다시 시도해주세요." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Local Auth
router.post("/signup/local", validate(signupSchema), signupLocalController);
router.post("/login/local", validate(loginSchema), loginLocalController);

// Token Refresh
router.post("/refresh", refreshTokenController);

// OAuth
router.get("/login/oauth/:provider", redirectToOAuthProvider);
router.get("/login/oauth/:provider/callback", loginOauthController);
router.get("/oauth-tokens", getOAuthTokensController);

// Email Verification (rate limited)
router.post("/send-code", emailLimiter, sendVerificationCodeController);
router.post("/verify-code", verifyLimiter, verifyCodeController);
router.post("/reset-password", verifyLimiter, resetPasswordController);

module.exports = router;
