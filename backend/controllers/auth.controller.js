const {
  signupLocal,
  loginLocal,
} = require("../services/auth/auth.local.service");
const { loginOauth } = require("../services/auth/auth.oauth.service");
const providers = require("../services/auth/providers");
const { handleError } = require("../utils/errorHandler");
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
    const { token } = await loginLocal(req.body);
    res.status(200).json({ token });
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

const loginOauthController = async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query;

    const { token } = await loginOauth(provider, code, state);
    res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?token=${token}`);
  } catch (err) {
    if (err.message === "REJOIN_REQUIRED" && req.params.provider === "google") {
      return res.redirect("/auth/login/oauth/google?forceConsent=1&state=rejoin");
    }
    return handleError(res, err);
  }
};

module.exports = {
  signupLocalController,
  loginLocalController,
  redirectToOAuthProvider,
  loginOauthController,
};
