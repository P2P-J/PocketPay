const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createTeamSchema = {
  body: z.object({
    name: z
      .string()
      .min(1, "팀 이름은 필수입니다.")
      .max(50, "팀 이름은 50자를 초과할 수 없습니다.")
      .trim(),
    description: z.string().max(200, "설명은 200자를 초과할 수 없습니다.").optional().default(""),
  }),
};

const updateTeamSchema = {
  body: z.object({
    name: z.string().min(1).max(50).trim().optional(),
    description: z.string().max(200).optional(),
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
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
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

module.exports = {
  createTeamSchema,
  updateTeamSchema,
  teamIdParamSchema,
  inviteMemberSchema,
  removeMemberSchema,
  inviteTokenParamSchema,
};
