const { hashPassword, comparePassword } = require("../../utils/bcrypt.util");
const { User } = require("../../models/index");
const { issueTokenPair } = require("../../utils/jwt.util");
const AppError = require("../../utils/AppError");
const { validateHandleFormat } = require("../../utils/handle.util");

const signupLocal = async ({ email, password, name, nickname, handle }) => {
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
  return User.create({
    email,
    password: hashedPassword,
    name,
    nickname,
    handle: loweredHandle,
    handleChangedAt: new Date(),
    provider: "local",
  });
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
