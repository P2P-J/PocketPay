const { z } = require("zod");

// 비밀번호 복잡도: 영문/숫자/특수문자 중 2가지 이상 포함
// 단순 숫자만(예: "12345678")이나 단순 영문만으로 가입 차단
const PASSWORD_COMPLEXITY_MESSAGE = "영문, 숫자, 특수문자 중 2가지 이상을 조합해주세요.";
const hasMinComplexity = (v) => {
  let count = 0;
  if (/[a-zA-Z]/.test(v)) count++;
  if (/[0-9]/.test(v)) count++;
  if (/[^a-zA-Z0-9]/.test(v)) count++;
  return count >= 2;
};
const passwordSchema = z
  .string()
  .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
  .max(20, "비밀번호는 20자를 초과할 수 없습니다.")
  .refine(hasMinComplexity, { message: PASSWORD_COMPLEXITY_MESSAGE });

const signupSchema = {
  body: z.object({
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
    password: passwordSchema,
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

const updateMyAccountSchema = {
  body: z.object({
    account: z
      .object({
        bank: z.string().trim().min(1).max(30),
        number: z.string().trim().min(1).max(50),
        holder: z.string().trim().min(1).max(30),
      })
      .nullable(),
  }),
};

const pushTokenSchema = {
  body: z.object({
    token: z.string().min(1).max(200),
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
    newPassword: passwordSchema,
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

// 토스 로그인 (앱인토스 appLogin 인가코드 교환)
const tossLoginSchema = {
  body: z.object({
    authorizationCode: z.string().min(1, "authorizationCode는 필수입니다."),
    referrer: z.string().min(1, "referrer는 필수입니다."),
  }),
};

module.exports = {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  appleNativeSchema,
  tossLoginSchema,
  completeOAuthProfileSchema,
  updateProfileSchema,
  updateHandleSchema,
  updateMyAccountSchema,
  pushTokenSchema,
  passwordSchema,
};
