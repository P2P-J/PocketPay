const express = require("express");
const router = express.Router();
const dealController = require("../controllers/deal.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  createDealSchema,
  updateDealSchema,
  getMonthlyDealsSchema,
  dealIdParamSchema,
} = require("../validators/deal.validator");

router.use(loginUserVerify);

router.post("/", validate(createDealSchema), dealController.registerDeal);
router.get("/", validate(getMonthlyDealsSchema), dealController.getMonthlyDeals);
router.get("/summary/:teamId", dealController.getTeamSummary);
router.get("/stats/:teamId", dealController.getMonthlyStatsCtrl);
router.get("/:dealId", validate(dealIdParamSchema), dealController.getDealDetail);
router.put("/:dealId", validate(updateDealSchema), dealController.updateDeal);
router.delete("/:dealId", validate(dealIdParamSchema), dealController.deleteDeal);

module.exports = router;
