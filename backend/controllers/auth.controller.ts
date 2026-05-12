const {
  signupLocal,
  loginLocal,
} = require("../services/auth/auth.local.service");
const {
  loginOauth,
  loginAppleNative,
  completeOAuthProfile,
} = require("../services/auth/auth.oauth.service");
const providers = require("../services/auth/providers");
const { handleError } = require("../utils/errorHandler");
const { verifyToken, issueAccessToken } = require("../utils/jwt.util");
const { User } = require("../models/index");
const AppError = require("../utils/AppError");
const {
  createExchangeCode,
  consumeExchangeCode,
} = require("../services/auth/oauth-exchange.service");

// state 파싱: "mobile_<challenge64hex>" → { isMobile, challenge }
// 옛 포맷 "mobile" 단독은 거절 (nonce 없는 평문 토큰 전달 차단)
const parseOAuthState = (raw) => {
  const s = String(raw || "");
  if (s.startsWith("mobile_")) {
    const challenge = s.slice("mobile_".length);
    if (/^[a-f0-9]{64}$/.test(challenge)) {
      return { isMobile: true, challenge, rejoin: false };
    }
    return { isMobile: true, challenge: null, rejoin: false }; // 형식 깨짐 → 거절
  }
  if (s === "mobile" || s.includes("_mobile")) {
    return { isMobile: true, challenge: null, rejoin: false }; // 옛 포맷 → 거절
  }
  return { isMobile: false, challenge: null, rejoin: s === "rejoin" };
};

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
    const parsed = parseOAuthState(state);

    const { accessToken, refreshToken } = await loginOauth(provider, code, state);

    if (parsed.isMobile) {
      // 옛 포맷(challenge 없음)은 보안 정책상 거절 — 평문 토큰 전달 차단
      if (!parsed.challenge) {
        return res.redirect(
          `pocketpay://auth/callback?error=${encodeURIComponent("앱을 최신 버전으로 업데이트해주세요.")}`
        );
      }
      // 일회용 exchange code 생성 → deep link에 토큰 대신 code만 노출
      const exchangeCode = await createExchangeCode(accessToken, refreshToken, parsed.challenge);
      return res.redirect(`pocketpay://auth/callback?code=${exchangeCode}`);
    }

    // 웹: HTTP-only 쿠키로 토큰 전달 (기존 흐름 유지)
    res.cookie("oauth_access_token", accessToken, COOKIE_OPTIONS);
    res.cookie("oauth_refresh_token", refreshToken, COOKIE_OPTIONS);
    res.redirect(`${process.env.FRONTEND_URL}/oauth/callback`);
  } catch (err) {
    if (err.message === "REJOIN_REQUIRED" && req.params.provider === "google") {
      return res.redirect("/auth/login/oauth/google?forceConsent=1&state=rejoin");
    }
    const parsed = parseOAuthState(req.query.state);
    if (parsed.isMobile) {
      return res.redirect(
        `pocketpay://auth/callback?error=${encodeURIComponent(err.message || "로그인 실패")}`
      );
    }
    return handleError(res, err);
  }
};

// 모바일 deep link에서 받은 code + verifier로 토큰 교환 (1회용)
const exchangeOAuthCodeController = async (req, res) => {
  try {
    const { code, verifier } = req.body;
    const tokens = await consumeExchangeCode(code, verifier);
    return res.status(200).json(tokens);
  } catch (err) {
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
    // identityToken/nonce는 zod validate가 보장하지만 방어적 가드 유지
    if (!identityToken || !nonce) {
      throw AppError.badRequest("identityToken과 nonce가 필요합니다.");
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

const completeOAuthProfileController = async (req, res) => {
  try {
    const user = await completeOAuthProfile(req.user.userId, req.body);
    res.status(200).json({
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        handle: user.handle,
        handleChangedAt: user.handleChangedAt,
        provider: user.provider,
      },
    });
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
  exchangeOAuthCodeController,
  getOAuthTokensController,
  sendVerificationCodeController,
  verifyCodeController,
  resetPasswordController,
  loginAppleNativeController,
  completeOAuthProfileController,
};
