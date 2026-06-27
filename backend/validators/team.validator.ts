const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const accountSchema = z.object({
  bank: z.string().trim().min(1).max(30),
  number: z.string().trim().min(1).max(50),
  holder: z.string().trim().min(1).max(30),
});

const createTeamSchema = {
  body: z.object({
    name: z
      .string()
      .min(1, "팀 이름은 필수입니다.")
      .max(50, "팀 이름은 50자를 초과할 수 없습니다.")
      .trim(),
    description: z.string().max(200, "설명은 200자를 초과할 수 없습니다.").optional().default(""),
    category: z.enum(["friend", "club"]).optional(),
    displayMode: z.enum(["nickname", "realName"]).optional(),
    accountMode: z.enum(["personal", "team"]).optional(),
    feeEnabled: z.boolean().optional(),
  }),
};

const updateTeamSchema = {
  body: z.object({
    name: z.string().min(1).max(50).trim().optional(),
    description: z.string().max(200).optional(),
    category: z.enum(["friend", "club"]).optional(),
    displayMode: z.enum(["nickname", "realName"]).optional(),
    accountMode: z.enum(["personal", "team"]).optional(),
    feeEnabled: z.boolean().optional(),
    feeAmount: z.number().nonnegative().optional(),
    feeDueDay: z.number().int().min(1).max(31).optional(),
    account: accountSchema.nullable().optional(),
  }),
  params: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
  }),
};

const teamIdParamSchema = {
  params: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
  }),
};

const inviteMemberSchema = {
  body: z.object({
    handle: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]{3,20}$/, "ID는 영문 소문자, 숫자, 언더스코어 3~20자로 입력해주세요."),
  }),
  params: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
  }),
};

const removeMemberSchema = {
  params: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
    userId: z.string().regex(objectIdRegex, "올바른 사용자 ID가 아닙니다."),
  }),
};

const inviteTokenParamSchema = {
  params: z.object({
    token: z.string().min(1, "토큰이 필요합니다."),
  }),
};

const transferOwnerSchema = {
  body: z.object({
    userId: z.string().regex(objectIdRegex, "올바른 사용자 ID가 아닙니다."),
  }),
  params: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
  }),
};

module.exports = {
  createTeamSchema,
  updateTeamSchema,
  teamIdParamSchema,
  inviteMemberSchema,
  removeMemberSchema,
  inviteTokenParamSchema,
  transferOwnerSchema,
};
