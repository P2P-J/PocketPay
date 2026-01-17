const jwt = require("jsonwebtoken");
const AppError = require("./AppError");

const issueToken = (user) => {
    return jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        throw AppError.unauthorized("유효하지 않은 인증 토큰입니다.");
    }
};

module.exports = {
    issueToken,
    verifyToken,
};