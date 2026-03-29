const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const feeStatusQuerySchema = {
  params: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
  }),
  query: z.object({
    year: z.string().optional(),
    month: z.string().optional(),
  }),
};

const recordPaymentSchema = {
  params: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
  }),
  body: z.object({
    userId: z.string().regex(objectIdRegex, "올바른 사용자 ID가 아닙니다."),
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    amount: z.number().min(0).optional(),
    paidAt: z.string().optional(),
    note: z.string().max(200).optional(),
  }),
};

const deletePaymentSchema = {
  params: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
    paymentId: z.string().regex(objectIdRegex, "올바른 납부 ID가 아닙니다."),
  }),
};

const feeRuleSchema = {
  params: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
  }),
  body: z.object({
    feeAmount: z.number().int().min(0).optional(),
    feeDueDay: z.number().int().min(1).max(31).optional(),
  }),
};

module.exports = { feeStatusQuerySchema, recordPaymentSchema, deletePaymentSchema, feeRuleSchema };
