const express = require("express");
const router = express.Router();
const feeController = require("../controllers/fee.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  feeStatusQuerySchema,
  recordPaymentSchema,
  deletePaymentSchema,
  feeRuleSchema,
} = require("../validators/fee.validator");

router.use(loginUserVerify);

// 회비 현황 조회
router.get("/:teamId", validate(feeStatusQuerySchema), feeController.getFeeStatus);

// 납부 기록 추가/수정 (upsert)
router.post("/:teamId", validate(recordPaymentSchema), feeController.recordPayment);

// 납부 기록 삭제
router.delete("/:teamId/:paymentId", validate(deletePaymentSchema), feeController.deletePayment);

// 회비 규칙 설정
router.patch("/:teamId/rule", validate(feeRuleSchema), feeController.updateFeeRule);

module.exports = router;
