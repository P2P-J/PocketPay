const { verifyToken } = require("../utils/jwt.util");
const { User } = require("../models/index");
const AppError = require("../utils/AppError");
const { handleError } = require("../utils/errorHandler");

const loginUserVerify = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw AppError.unauthorized("인증이 필요합니다.");
        }

        const [type, token] = authHeader.split(" ");
        if (type !== "Bearer" || !token) {
            throw AppError.unauthorized("유효하지 않은 인증 토큰입니다.");
        }

        const decoded = verifyToken(token);

        const user = await User.findById(decoded.userId);
        if (!user) {
            throw AppError.unauthorized("유효하지 않은 인증 정보입니다.");
        }

        req.user = decoded;
        next();
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    loginUserVerify,
};