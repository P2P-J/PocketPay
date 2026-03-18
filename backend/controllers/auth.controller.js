const {
  signupLocal,
  loginLocal,
} = require("../services/auth/auth.local.service");
const { loginOauth } = require("../services/auth/auth.oauth.service");
const { handleError } = require("../utils/errorHandler");

const signupLocalController = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const user = await signupLocal({ email, password, name });

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
    const { email, password } = req.body;

    const { token } = await loginLocal({ email, password });

    res.status(200).json({ token });
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
    // 탈퇴 이력 계정이면 rejoin으로 1회 리다이렉트
    if (err.code === "REJOIN_REQUIRED" && req.params.provider === "google") {
      return res.redirect(
        "/auth/login/oauth/google?forceConsent=1&state=rejoin"
      );
    }
    return handleError(res, err);
  }
};

module.exports = {
  signupLocalController,
  loginLocalController,
  loginOauthController,
};
