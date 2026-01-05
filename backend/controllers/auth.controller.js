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

        const { user, token } = await loginLocal({ email, password });

        res.status(200).json({
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            provider: user.provider,
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
        
    } catch (err) {
        res.status(400).json({
            message: err.message,
        });
    }
};

module.exports = {
    signupLocalController,
    loginLocalController,
    loginOauthController,
};