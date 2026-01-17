const { signupLocal, loginLocal } = require("../services/auth/auth.local.service");
const { loginOauth } = require("../services/auth/auth.oauth.service");
const providers = require('../services/auth/providers');
const AppError = require("../utils/AppError");
const { handleError } = require("../utils/errorHandler");

const signupLocalController = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      throw AppError.badRequest("email, password, name은 필수입니다.");
    }

    const user = await signupLocal({ email, password, name });

    return res.status(201).json({
      id: user._id,
      email: user.email,
      name: user.name,
      provider: user.provider,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const loginLocalController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw AppError.badRequest("email, password는 필수입니다.");
    }

    const { token } = await loginLocal({ email, password });

    return res.status(200).json({ token });
  } catch (error) {
    return handleError(res, error);
  }
};

const loginOauthController = async (req, res) => {
  try {
    const { provider } = req.params;

    const oauthProvider = providers[provider];
    if (!oauthProvider) {
      throw AppError.badRequest("제공되지 않는 provider입니다.");
    }

    if (provider === 'naver') {
      const authUrl = oauthProvider.getAuthUrl();

      return res.status(200).redirect(authUrl);
    } else if (provider === 'google') {
      const forceConsent =
        req.query.forceConsent === "1" ||
        req.cookies?.force_google_consent === "1";

      const state = req.query.state;

      const authUrl = oauthProvider.getAuthUrl({ forceConsent, state });

      return res.status(200).redirect(authUrl);
    }
  } catch (error) {
    return handleError(res, error);
  }
};

const loginOauthCallbackController = async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query;

    const { token } = await loginOauth(provider, code, state);

    return res.status(200).redirect(`${process.env.FRONTEND_URL}/oauth/callback?token=${token}`);
  } catch (error) {
    // 탈퇴 이력 계정이면 rejoin으로 리다이렉트
    if (error.code === "REJOIN_REQUIRED" && req.params.provider === "google") {
      return res.status(200).redirect(
        "/auth/login/oauth/google?forceConsent=1&state=rejoin"
      );
    }
    return handleError(res, error);
  }
};

module.exports = {
  signupLocalController,
  loginLocalController,
  loginOauthController,
  loginOauthCallbackController,
};
