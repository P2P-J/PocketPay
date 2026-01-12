const { signupLocal, loginLocal } = require("../services/auth/auth.local.service");
const { loginOauth } = require("../services/auth/auth.oauth.service");

const signupLocalController = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                message: "email, password, name은 필수입니다.",
            });
        }

        const user = await signupLocal({ email, password, name });

        res.status(201).json({
            id: user._id,
            email: user.email,
            name: user.name,
            provider: user.provider,
        });
    } catch (err) {
        res.status(400).json({
            message: err.message,
        });
    }
};

const loginLocalController = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "email, password는 필수입니다.",
            });
        }

        const { token } = await loginLocal({ email, password });

        res.status(200).json({
            token,
        });
    } catch (err) {
        res.status(400).json({
            message: err.message,
        });
    }
};

const loginOauthController = async (req, res) => {
    try {
        const { provider } = req.params;
        const { code, state } = req.query;

        const { token } = await loginOauth(provider, code, state);
        
        res.redirect(
            `${process.env.FRONTEND_URL}/oauth/callback?token=${token}`
        );
    } catch (err) {
        // 탈퇴 이력 계정이면 rejoin으로 1회 리다이렉트
        if (err.code === "REJOIN_REQUIRED" && req.params.provider === "google") {
            return res.redirect("/auth/login/oauth/google?forceConsent=1&state=rejoin");
        }
        return res.status(400).json({ message: err.message });
    }
};

module.exports = {
    signupLocalController,
    loginLocalController,
    loginOauthController,
};