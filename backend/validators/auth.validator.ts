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
      .min(1, "실명을 입력해주세요.")
      .max(30, "실명은 30자를 초과할 수 없습니다.")
      .trim(),
    nickname: z
      .string()
      .min(1, "닉네임을 입력해주세요.")
      .max(20, "닉네임은 20자를 초과할 수 없습니다.")
      .trim(),
    handle: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,20}$/, "ID는 영문 소문자, 숫자, 언더스코어 3~20자로 입력해주세요."),
  }),
};

const completeOAuthProfileSchema = {
  body: z.object({
    name: z
      .string()
      .min(1, "실명을 입력해주세요.")
      .max(30, "실명은 30자를 초과할 수 없습니다.")
      .trim()
      .optional(),
    nickname: z
      .string()
      .min(1, "닉네임을 입력해주세요.")
      .max(20, "닉네임은 20자를 초과할 수 없습니다.")
      .trim(),
    handle: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,20}$/, "ID는 영문 소문자, 숫자, 언더스코어 3~20자로 입력해주세요."),
  }),
};

const updateProfileSchema = {
  body: z
    .object({
      name: z.string().min(1).max(30).trim().optional(),
      nickname: z.string().min(1).max(20).trim().optional(),
    })
    .refine((d) => d.name !== undefined || d.nickname !== undefined, {
      message: "수정할 항목이 없습니다.",
    }),
};

const updateHandleSchema = {
  body: z.object({
    handle: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,20}$/, "ID는 영문 소문자, 숫자, 언더스코어 3~20자로 입력해주세요."),
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

// Apple Native Sign-In
const appleNativeSchema = {
  body: z.object({
    identityToken: z.string().min(1, "identityToken은 필수입니다."),
    name: z.string().max(50).optional(),
    nonce: z.string().min(1, "nonce는 필수입니다."),
  }),
};

module.exports = {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  appleNativeSchema,
  completeOAuthProfileSchema,
  updateProfileSchema,
  updateHandleSchema,
};
