const crypto = require("crypto");
const { sendVerificationCode } = require("../../utils/email");
const AppError = require("../../utils/AppError");

// 메모리 기반 인증코드 저장 (프로덕션에서는 Redis 사용 권장)
const verificationCodes = new Map<string, { code: string; expiresAt: number; purpose: string; attempts: number }>();

// 6자리 인증코드 생성 (암호학적으로 안전한 랜덤)
const generateCode = (): string => {
  return String(crypto.randomInt(100000, 999999));
};

// 인증코드 발송
const sendCode = async (email: string, purpose: string = "이메일 인증") => {
  // 1분 내 재요청 방지
  const existing = verificationCodes.get(`${email}_${purpose}`);
  if (existing && existing.expiresAt - Date.now() > 9 * 60 * 1000) {
    throw AppError.badRequest("잠시 후 다시 시도해주세요. (1분 대기)");
  }

  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10분 유효

  verificationCodes.set(`${email}_${purpose}`, { code, expiresAt, purpose, attempts: 0 });

  await sendVerificationCode(email, code, purpose);

  // 10분 후 자동 삭제
  setTimeout(() => {
    verificationCodes.delete(`${email}_${purpose}`);
  }, 10 * 60 * 1000);

  return { message: "인증코드가 발송되었습니다." };
};

// 인증코드 검증
const verifyCode = (email: string, code: string, purpose: string = "이메일 인증") => {
  const stored = verificationCodes.get(`${email}_${purpose}`);

  if (!stored) {
    throw AppError.badRequest("인증코드가 만료되었거나 요청되지 않았습니다.");
  }

  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(`${email}_${purpose}`);
    throw AppError.badRequest("인증코드가 만료되었습니다. 다시 요청해주세요.");
  }

  if (stored.code !== code) {
    stored.attempts += 1;
    if (stored.attempts >= 5) {
      verificationCodes.delete(`${email}_${purpose}`);
      throw AppError.badRequest("인증코드 입력 횟수를 초과했습니다. 다시 요청해주세요.");
    }
    throw AppError.badRequest(`인증코드가 일치하지 않습니다. (${stored.attempts}/5회)`);
  }

  // 검증 성공 (비밀번호 재설정은 reset-password에서 삭제, 그 외 즉시 삭제)
  if (purpose !== "비밀번호 재설정") {
    verificationCodes.delete(`${email}_${purpose}`);
  }
  return { verified: true };
};

const deleteCode = (email: string, purpose: string) => {
  verificationCodes.delete(`${email}_${purpose}`);
};

module.exports = { sendCode, verifyCode, deleteCode };
