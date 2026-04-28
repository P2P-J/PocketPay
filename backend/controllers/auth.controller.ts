const {
  signupLocal,
  loginLocal,
} = require("../services/auth/auth.local.service");
const {
  loginOauth,
  loginAppleNative,
} = require("../services/auth/auth.oauth.service");
const providers = require("../services/auth/providers");
const { handleError } = require("../utils/errorHandler");
const { verifyToken, issueAccessToken } = require("../utils/jwt.util");
const { User } = require("../models/index");
const AppError = require("../utils/AppError");

const signupLocalController = async (req, res) => {
  try {
    const user = await signupLocal(req.body);
    res.status(201).json({
      id: user._id,
      email: user.email,
      name: user.name,
      provider: user.provider,
    });
  } catch (err) {
    return handleError(res, err);
  }
};

const loginLocalController = async (req, res) => {
  try {
    const { accessToken, refreshToken } = await loginLocal(req.body);
    res.status(200).json({ accessToken, refreshToken });
  } catch (err) {
    return handleError(res, err);
  }
};

const refreshTokenController = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw AppError.badRequest("refreshToken이 필요합니다.");

    const decoded = verifyToken(refreshToken);
    if (decoded.type !== "refresh") {
      throw AppError.unauthorized("유효하지 않은 refresh token입니다.");
    }

    const user = await User.findById(decoded.userId);
    if (!user) throw AppError.unauthorized("사용자를 찾을 수 없습니다.");

    const newAccessToken = issueAccessToken(user);
    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    return handleError(res, err);
  }
};

const redirectToOAuthProvider = (req, res) => {
  try {
    const { provider } = req.params;
    const oauthProvider = providers[provider];
    if (!oauthProvider) throw AppError.badRequest("지원하지 않는 OAuth 제공자입니다.");

    const options: any = {
      state: req.query.state,
    };
    if (provider === "google") {
      options.forceConsent = req.query.forceConsent === "1";
    }

    const authUrl = oauthProvider.getAuthUrl(options);
    return res.redirect(authUrl);
  } catch (err) {
    return handleError(res, err);
  }
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 30 * 1000, // 30초 (일회용 - 프론트가 바로 읽고 삭제)
};

const loginOauthController = async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query;

    const { accessToken, refreshToken } = await loginOauth(provider, code, state);

    // 모바일 앱에서 온 요청인지 확인 (state에 "mobile" 포함)
    const stateStr = String(state || "");
    const isMobile = stateStr === "mobile" || stateStr.includes("_mobile") || req.query.platform === "mobile";

    if (isMobile) {
      // 딥링크로 앱에 토큰 전달
      const params = new URLSearchParams({
        accessToken,
        refreshToken,
      });
      return res.redirect(`pocketpay://auth/callback?${params.toString()}`);
    }

    // 웹: HTTP-only 쿠키로 토큰 전달
    res.cookie("oauth_access_token", accessToken, COOKIE_OPTIONS);
    res.cookie("oauth_refresh_token", refreshToken, COOKIE_OPTIONS);
    res.redirect(`${process.env.FRONTEND_URL}/oauth/callback`);
  } catch (err) {
    if (err.message === "REJOIN_REQUIRED" && req.params.provider === "google") {
      return res.redirect("/auth/login/oauth/google?forceConsent=1&state=rejoin");
    }

    const errState = String(req.query.state || "");
    const isMobile = errState === "mobile" || errState.includes("_mobile") || req.query.platform === "mobile";
    if (isMobile) {
      return res.redirect(`pocketpay://auth/callback?error=${encodeURIComponent(err.message || "로그인 실패")}`);
    }
    return handleError(res, err);
  }
};

// OAuth 쿠키에서 토큰을 읽어 JSON으로 반환 후 쿠키 삭제
const getOAuthTokensController = async (req, res) => {
  const accessToken = req.cookies?.oauth_access_token;
  const refreshToken = req.cookies?.oauth_refresh_token;

  // 쿠키 즉시 삭제
  res.clearCookie("oauth_access_token", { path: "/" });
  res.clearCookie("oauth_refresh_token", { path: "/" });

  if (!accessToken) {
    return res.status(400).json({ message: "OAuth 토큰이 없습니다." });
  }

  return res.status(200).json({ accessToken, refreshToken });
};

// 인증코드 발송
const sendVerificationCodeController = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email) throw AppError.badRequest("이메일을 입력해주세요.");

    const verificationService = require("../services/auth/verification.service");
    const result = await verificationService.sendCode(email, purpose || "이메일 인증");
    res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// 인증코드 검증
const verifyCodeController = async (req, res) => {
  try {
    const { email, code, purpose } = req.body;
    if (!email || !code) throw AppError.badRequest("이메일과 인증코드를 입력해주세요.");

    const verificationService = require("../services/auth/verification.service");
    const result = await verificationService.verifyCode(email, code, purpose || "이메일 인증");
    res.status(200).json(result);
  } catch (err) {
    return handleError(res, err);
  }
};

// 비밀번호 재설정 (인증코드 검증 후)
const resetPasswordController = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      throw AppError.badRequest("이메일, 인증코드, 새 비밀번호를 모두 입력해주세요.");
    }
    if (newPassword.length < 8 || newPassword.length > 20) {
      throw AppError.badRequest("비밀번호는 8~20자 사이여야 합니다.");
    }

    // 인증코드 검증
    const verificationService = require("../services/auth/verification.service");
    await verificationService.verifyCode(email, code, "비밀번호 재설정");

    // 사용자 찾기
    const user = await User.findOne({ email, provider: "local" });
    if (!user) throw AppError.notFound("해당 이메일로 가입된 계정이 없습니다.");

    // 비밀번호 변경
    const { hashPassword } = require("../utils/bcrypt.util");
    user.password = await hashPassword(newPassword);
    await user.save();

    // 인증코드 삭제 (재사용 방지)
    await verificationService.deleteCode(email, "비밀번호 재설정");

    res.status(200).json({ message: "비밀번호가 재설정되었습니다." });
  } catch (err) {
    return handleError(res, err);
  }
};

const loginAppleNativeController = async (req, res) => {
  try {
    const { identityToken, name, nonce } = req.body;
    if (!identityToken) {
      throw AppError.badRequest("identityToken이 필요합니다.");
    }
    const { accessToken, refreshToken } = await loginAppleNative(
      identityToken,
      name,
      nonce
    );
    res.status(200).json({ accessToken, refreshToken });
  } catch (err) {
    return handleError(res, err);
  }
};

module.exports = {
  signupLocalController,
  loginLocalController,
  refreshTokenController,
  redirectToOAuthProvider,
  loginOauthController,
  getOAuthTokensController,
  sendVerificationCodeController,
  verifyCodeController,
  resetPasswordController,
  loginAppleNativeController,
};
