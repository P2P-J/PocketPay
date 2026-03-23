const { z } = require("zod");

const signupSchema = {
  body: z.object({
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
    password: z
      .string()
      .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
      .max(20, "비밀번호는 20자를 초과할 수 없습니다."),
    name: z
      .string()
      .min(2, "닉네임은 최소 2자 이상이어야 합니다.")
      .max(20, "닉네임은 20자를 초과할 수 없습니다.")
      .trim()
      .regex(/^[가-힣a-zA-Z0-9]+$/, "닉네임은 한글, 영문, 숫자만 사용 가능합니다."),
  }),
};

const loginSchema = {
  body: z.object({
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
    password: z.string().min(1, "비밀번호는 필수입니다."),
  }),
};

const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, "현재 비밀번호는 필수입니다."),
    newPassword: z
      .string()
      .min(8, "새 비밀번호는 최소 8자 이상이어야 합니다.")
      .max(20, "새 비밀번호는 20자를 초과할 수 없습니다."),
  }),
};

module.exports = { signupSchema, loginSchema, changePasswordSchema };
