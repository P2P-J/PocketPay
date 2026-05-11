const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createDutchRequestsSchema = {
  body: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
    recipientIds: z
      .array(z.string().regex(objectIdRegex, "올바른 사용자 ID가 아닙니다."))
      .min(1, "받는 사람이 1명 이상 필요합니다."),
    amount: z.number().int().min(1, "금액은 1원 이상이어야 합니다."),
    totalAmount: z.number().int().min(1, "총 금액은 1원 이상이어야 합니다."),
    participantCount: z.number().int().min(2, "참여자는 2명 이상이어야 합니다."),
    memo: z.string().max(50, "메모는 50자 이하로 입력해주세요.").optional(),
  }),
};

const dutchIdParamSchema = {
  params: z.object({
    id: z.string().regex(objectIdRegex, "올바른 요청 ID가 아닙니다."),
  }),
};

module.exports = {
  createDutchRequestsSchema,
  dutchIdParamSchema,
};
