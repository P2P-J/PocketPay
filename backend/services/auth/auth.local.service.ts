const { hashPassword, comparePassword } = require("../../utils/bcrypt.util");
const { User, VerificationCode } = require("../../models/index");
const { issueTokenPair } = require("../../utils/jwt.util");
const AppError = require("../../utils/AppError");
const { validateHandleFormat } = require("../../utils/handle.util");

const signupLocal = async ({ email, password, name, nickname, handle }) => {
  // 이메일 인증 확인 (회원가입 purpose의 verifyCode가 통과되어 코드가 남아있어야 함)
  const verified = await VerificationCode.findOne({
    email,
    purpose: "회원가입",
    expiresAt: { $gt: new Date() },
  });
  if (!verified) {
    throw AppError.badRequest("이메일 인증을 먼저 완료해주세요.");
  }

  const exists = await User.findOne({ email, provider: "local" });
  if (exists) {
    throw AppError.badRequest("이미 가입된 이메일입니다.");
  }

  const loweredHandle = (handle || "").toLowerCase().trim();
  if (!validateHandleFormat(loweredHandle)) {
    throw AppError.badRequest("올바르지 않은 ID 형식입니다.");
  }

  const handleExists = await User.findOne({ handle: loweredHandle });
  if (handleExists) {
    throw AppError.badRequest("이미 사용 중인 ID입니다.");
  }

  const hashedPassword = await hashPassword(password);
  const user = await User.create({
    email,
    password: hashedPassword,
    name,
    nickname,
    handle: loweredHandle,
    handleChangedAt: new Date(),
    provider: "local",
  });

  // 가입 성공 후 인증 코드 삭제 (재사용 방지)
  await VerificationCode.deleteOne({ email, purpose: "회원가입" });

  return user;
};

const loginLocal = async ({ email, password }) => {
  const user = await User.findOne({ email, provider: "local" });
  if (!user) {
    throw AppError.unauthorized("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  const match = await comparePassword(password, user.password);
  if (!match) {
    throw AppError.unauthorized("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  const tokens = issueTokenPair(user);
  return { ...tokens, user };
};

module.exports = { signupLocal, loginLocal };
