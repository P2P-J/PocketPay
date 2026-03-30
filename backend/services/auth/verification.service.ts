const crypto = require("crypto");
const { sendVerificationCode } = require("../../utils/email");
const AppError = require("../../utils/AppError");
const { VerificationCode } = require("../../models/index");

const generateCode = (): string => {
  return String(crypto.randomInt(100000, 999999));
};

// 인증코드 발송
const sendCode = async (email: string, purpose: string = "이메일 인증") => {
  const existing = await VerificationCode.findOne({ email, purpose });

  // 1분 내 재요청 방지
  if (existing && existing.expiresAt.getTime() - Date.now() > 9 * 60 * 1000) {
    throw AppError.badRequest("잠시 후 다시 시도해주세요. (1분 대기)");
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 유효

  // upsert: 기존 코드 덮어쓰기
  await VerificationCode.findOneAndUpdate(
    { email, purpose },
    { code, expiresAt, attempts: 0 },
    { upsert: true }
  );

  await sendVerificationCode(email, code, purpose);

  return { message: "인증코드가 발송되었습니다." };
};

// 인증코드 검증
const verifyCode = async (email: string, code: string, purpose: string = "이메일 인증") => {
  const stored = await VerificationCode.findOne({ email, purpose });

  if (!stored) {
    throw AppError.badRequest("인증코드가 만료되었거나 요청되지 않았습니다.");
  }

  if (Date.now() > stored.expiresAt.getTime()) {
    await VerificationCode.deleteOne({ email, purpose });
    throw AppError.badRequest("인증코드가 만료되었습니다. 다시 요청해주세요.");
  }

  if (stored.code !== code) {
    stored.attempts += 1;
    if (stored.attempts >= 5) {
      await VerificationCode.deleteOne({ email, purpose });
      throw AppError.badRequest("인증코드 입력 횟수를 초과했습니다. 다시 요청해주세요.");
    }
    await stored.save();
    throw AppError.badRequest(`인증코드가 일치하지 않습니다. (${stored.attempts}/5회)`);
  }

  // 비밀번호 재설정은 reset-password에서 직접 삭제, 그 외 즉시 삭제
  if (purpose !== "비밀번호 재설정") {
    await VerificationCode.deleteOne({ email, purpose });
  }

  return { verified: true };
};

const deleteCode = async (email: string, purpose: string) => {
  await VerificationCode.deleteOne({ email, purpose });
};

module.exports = { sendCode, verifyCode, deleteCode };
