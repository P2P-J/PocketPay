const mongoose = require("mongoose");

// OAuth 콜백 직후 모바일에 토큰을 직접 전달하는 대신, 일회용 exchange code만 전달.
// 모바일이 별도 endpoint로 (code, nonce)를 보내면 토큰을 받고 code는 즉시 삭제됨.
// 평문 토큰이 deep link URL / 브라우저 history / OS 로그에 남는 위험 제거 + CSRF nonce 검증.
const oauthExchangeCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  // PKCE-style challenge = SHA-256(verifier). state로 전달되어 OAuth 페이지에 노출되지만,
  // verifier 자체는 모바일 SecureStore에만 존재. exchange 요청 시 verifier를 받아서 hash 비교.
  challenge: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

// TTL 인덱스: expiresAt 경과 시 MongoDB가 자동 삭제 (만료 코드 영구 잔류 방지)
oauthExchangeCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OAuthExchangeCode", oauthExchangeCodeSchema);
