const {
  signupLocal,
  loginLocal,
} = require("../services/auth/auth.local.service");
const { loginOauth } = require("../services/auth/auth.oauth.service");
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

    const options = {};
    if (provider === "google") {
      options.forceConsent = req.query.forceConsent === "1";
      options.state = req.query.state;
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

    // HTTP-only 쿠키로 토큰 전달 (URL에 노출하지 않음)
    res.cookie("oauth_access_token", accessToken, COOKIE_OPTIONS);
    res.cookie("oauth_refresh_token", refreshToken, COOKIE_OPTIONS);
    res.redirect(`${process.env.FRONTEND_URL}/oauth/callback`);
  } catch (err) {
    if (err.message === "REJOIN_REQUIRED" && req.params.provider === "google") {
      return res.redirect("/auth/login/oauth/google?forceConsent=1&state=rejoin");
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

module.exports = {
  signupLocalController,
  loginLocalController,
  refreshTokenController,
  redirectToOAuthProvider,
  loginOauthController,
  getOAuthTokensController,
};
