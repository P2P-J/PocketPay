const crypto = require("crypto");
const { OAuthExchangeCode } = require("../../models");
const AppError = require("../../utils/AppError");

const EXCHANGE_CODE_TTL_MS = 5 * 60 * 1000; // 5분

// OAuth 콜백 직후 호출. (accessToken, refreshToken)을 일회용 code 뒤로 숨겨 모바일에 전달.
// 모바일은 deep link로 code만 받고, 별도 endpoint로 (code, nonce) 보내면 토큰 받음.
const createExchangeCode = async (accessToken, refreshToken, nonce) => {
  if (!nonce || typeof nonce !== "string" || nonce.length < 16) {
    throw AppError.badRequest("유효하지 않은 OAuth nonce입니다.");
  }
  const code = crypto.randomBytes(32).toString("hex");
  await OAuthExchangeCode.create({
    code,
    accessToken,
    refreshToken,
    nonce,
    expiresAt: new Date(Date.now() + EXCHANGE_CODE_TTL_MS),
  });
  return code;
};

// 모바일이 deep link 받은 직후 호출. nonce 검증 + code 1회 소비 후 즉시 삭제.
const consumeExchangeCode = async (code, nonce) => {
  if (!code || !nonce) {
    throw AppError.badRequest("code와 nonce가 모두 필요합니다.");
  }
  // findOneAndDelete: race condition 없이 원자적으로 1회 소비
  const record = await OAuthExchangeCode.findOneAndDelete({ code });
  if (!record) {
    throw AppError.unauthorized("유효하지 않거나 이미 사용된 OAuth code입니다.");
  }
  if (record.expiresAt < new Date()) {
    throw AppError.unauthorized("만료된 OAuth code입니다.");
  }
  // 상수 시간 비교로 timing attack 방어
  const a = Buffer.from(record.nonce);
  const b = Buffer.from(nonce);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw AppError.unauthorized("OAuth nonce가 일치하지 않습니다.");
  }
  return {
    accessToken: record.accessToken,
    refreshToken: record.refreshToken,
  };
};

module.exports = { createExchangeCode, consumeExchangeCode };
