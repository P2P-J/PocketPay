const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createDealSchema = {
  body: z.object({
    storeInfo: z.string().max(200).optional(),
    division: z.enum(["수입", "지출"]).optional(),
    description: z.string().max(500).optional(),
    category: z.string().max(50).optional(),
    price: z.number().min(0, "가격은 0 이상이어야 합니다."),
    businessNumber: z.string().max(20).optional(),
    date: z.string().optional(),
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
  }),
};

const updateDealSchema = {
  body: z.object({
    storeInfo: z.string().max(200).optional(),
    division: z.enum(["수입", "지출"]).optional(),
    description: z.string().max(500).optional(),
    category: z.string().max(50).optional(),
    price: z.number().min(0, "가격은 0 이상이어야 합니다.").optional(),
    businessNumber: z.string().max(20).optional(),
    date: z.string().optional(),
  }),
  params: z.object({
    dealId: z.string().regex(objectIdRegex, "올바른 영수증 ID가 아닙니다."),
  }),
};

const getMonthlyDealsSchema = {
  query: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
    year: z.string().regex(/^\d{4}$/, "연도는 4자리 숫자여야 합니다."),
    month: z.string().regex(/^([1-9]|1[0-2])$/, "월은 1~12 사이여야 합니다."),
  }),
};

const dealIdParamSchema = {
  params: z.object({
    dealId: z.string().regex(objectIdRegex, "올바른 영수증 ID가 아닙니다."),
  }),
};

const teamIdParamSchema = {
  params: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
  }),
};

module.exports = {
  createDealSchema,
  updateDealSchema,
  getMonthlyDealsSchema,
  dealIdParamSchema,
  teamIdParamSchema,
};
