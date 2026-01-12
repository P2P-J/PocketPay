const { verifyToken } = require("../utils/jwt.util");
const { User } = require("../models/index");

const loginUserVerify = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "NO_TOKEN" });
        }

        const [type, token] = authHeader.split(" ");
        if (type !== "Bearer" || !token) {
            return res.status(401).json({ message: "INVALID_TOKEN_FORMAT" });
        }

        const decoded = verifyToken(token);

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: "USER_NOT_FOUND" });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "UNAUTHORIZED" });
    }
};

module.exports = {
    loginUserVerify,
};