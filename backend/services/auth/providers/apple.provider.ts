const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const axios = require("axios");
const qs = require("querystring");
const AppError = require("../../../utils/AppError");

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URI = "https://appleid.apple.com/auth/keys";

const client = jwksClient({
  jwksUri: APPLE_JWKS_URI,
  cache: true,
  cacheMaxAge: 60 * 60 * 1000, // 1시간
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
};

const verifyIdentityToken = (identityToken, expectedNonce) =>
  new Promise((resolve, reject) => {
    jwt.verify(
      identityToken,
      getKey,
      {
        algorithms: ["RS256"],
        issuer: APPLE_ISSUER,
        audience: process.env.APPLE_BUNDLE_ID,
      },
      (err, decoded) => {
        if (err) {
          return reject(
            AppError.unauthorized(`INVALID_APPLE_TOKEN: ${err.message}`)
          );
        }
        if (expectedNonce && decoded.nonce !== expectedNonce) {
          return reject(AppError.unauthorized("INVALID_APPLE_NONCE"));
        }
        resolve(decoded);
      }
    );
  });

const getUserProfile = (claims, name) => ({
  provider: "apple",
  providerId: claims.sub,
  email: claims.email || `apple_${claims.sub}@noreply.pocketpay.app`,
  name: name || "Apple 사용자",
});

// Apple client_secret JWT 생성 (revoke용)
const generateClientSecret = () => {
  const privateKey = (process.env.APPLE_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n"
  );
  if (!privateKey) {
    throw AppError.internal("APPLE_PRIVATE_KEY 미설정");
  }
  return jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "1h",
    issuer: process.env.APPLE_TEAM_ID,
    audience: APPLE_ISSUER,
    subject: process.env.APPLE_BUNDLE_ID,
    keyid: process.env.APPLE_KEY_ID,
  });
};

// 회원 탈퇴 시 호출
const revokeToken = async (token) => {
  if (!token) return;
  try {
    const clientSecret = generateClientSecret();
    await axios.post(
      "https://appleid.apple.com/auth/revoke",
      qs.stringify({
        client_id: process.env.APPLE_BUNDLE_ID,
        client_secret: clientSecret,
        token,
        token_type_hint: "refresh_token",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
  } catch (err) {
    // best-effort: 실패해도 탈퇴 자체는 진행
    console.error("[apple revoke] failed:", err.message);
  }
};

module.exports = {
  verifyIdentityToken,
  getUserProfile,
  revokeToken,
};
