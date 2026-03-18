const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

interface UserLike {
  _id: string;
}

interface TokenPayload {
  userId: string;
  type?: string;
}

const issueAccessToken = (user: UserLike): string => {
  return jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const issueRefreshToken = (user: UserLike): string => {
  return jwt.sign(
    { userId: user._id, type: "refresh" },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

const issueTokenPair = (user: UserLike): { accessToken: string; refreshToken: string } => ({
  accessToken: issueAccessToken(user),
  refreshToken: issueRefreshToken(user),
});

const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
};

// 하위 호환: 기존 issueToken은 accessToken으로 동작
const issueToken = issueAccessToken;

module.exports = {
  issueToken,
  issueAccessToken,
  issueRefreshToken,
  issueTokenPair,
  verifyToken,
};
