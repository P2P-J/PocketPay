const crypto = require("crypto");
const { OAuthExchangeCode } = require("../../models");
const AppError = require("../../utils/AppError");

const EXCHANGE_CODE_TTL_MS = 5 * 60 * 1000; // 5분
// challenge = SHA-256(verifier) hex → 64자
const CHALLENGE_REGEX = /^[a-f0-9]{64}$/;

// OAuth 콜백 직후 호출. (accessToken, refreshToken)을 일회용 code 뒤로 숨겨 모바일에 전달.
// challenge는 PKCE-style: state로 평문 노출돼도 verifier(SecureStore에만 존재) 없으면 무용지물.
const createExchangeCode = async (accessToken, refreshToken, challenge) => {
  if (!challenge || typeof challenge !== "string" || !CHALLENGE_REGEX.test(challenge)) {
    throw AppError.badRequest("유효하지 않은 OAuth challenge입니다.");
  }
  const code = crypto.randomBytes(32).toString("hex");
  await OAuthExchangeCode.create({
    code,
    accessToken,
    refreshToken,
    challenge,
    expiresAt: new Date(Date.now() + EXCHANGE_CODE_TTL_MS),
  });
  return code;
};

// 모바일이 deep link 받은 직후 호출. verifier 검증 + code 1회 소비 후 즉시 삭제.
const consumeExchangeCode = async (code, verifier) => {
  if (!code || !verifier) {
    throw AppError.badRequest("code와 verifier가 모두 필요합니다.");
  }
  // findOneAndDelete: race condition 없이 원자적으로 1회 소비
  const record = await OAuthExchangeCode.findOneAndDelete({ code });
  if (!record) {
    throw AppError.unauthorized("유효하지 않거나 이미 사용된 OAuth code입니다.");
  }
  if (record.expiresAt < new Date()) {
    throw AppError.unauthorized("만료된 OAuth code입니다.");
  }
  // SHA-256(verifier) === stored challenge — PKCE-style verifier 검증 (timing-safe)
  const expected = crypto.createHash("sha256").update(String(verifier)).digest("hex");
  const a = Buffer.from(record.challenge);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw AppError.unauthorized("OAuth verifier가 일치하지 않습니다.");
  }
  return {
    accessToken: record.accessToken,
    refreshToken: record.refreshToken,
  };
};

module.exports = { createExchangeCode, consumeExchangeCode };
