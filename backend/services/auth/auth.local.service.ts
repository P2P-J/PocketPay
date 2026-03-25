const { hashPassword, comparePassword } = require("../../utils/bcrypt.util");
const { User } = require("../../models/index");
const { issueTokenPair } = require("../../utils/jwt.util");
const AppError = require("../../utils/AppError");

const signupLocal = async ({ email, password, name }) => {
  const exists = await User.findOne({ email, provider: "local" });
  if (exists) {
    throw AppError.badRequest("이미 가입된 이메일입니다.");
  }

  const hashedPassword = await hashPassword(password);
  return User.create({
    email,
    password: hashedPassword,
    name,
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
