import type { Request, Response, NextFunction } from "express";
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../utils/jwt.util");
const { User } = require("../models/index");

const loginUserVerify = async (req: Request, res: Response, next: NextFunction) => {
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

        (req as any).user = decoded;
        next();
    } catch (err) {
        // 토큰 만료 vs 변조 구분
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: "TOKEN_EXPIRED" });
        }
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: "INVALID_TOKEN" });
        }
        return res.status(401).json({ message: "UNAUTHORIZED" });
    }
};

module.exports = {
    loginUserVerify,
};
