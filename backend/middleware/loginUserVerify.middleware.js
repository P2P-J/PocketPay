const { verifyToken } = require("../utils/jwt.util");

const loginUserVerify = (req, res, next) => {
    const token = req.headers.authorization;
    const user = verifyToken(token);

    if (!user) {
        return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    req.user = user;
    next();
};

module.exports = {
    loginUserVerify,
};