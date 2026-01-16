const express = require("express");
const router = express.Router();
const dealController = require("../controllers/deal.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");

router.use(loginUserVerify);

router.post("/", dealController.registerDeal);
router.get("/", dealController.getMonthlyDeals);
router.get("/:dealId", dealController.getDealDetail);
router.put("/:dealId", dealController.updateDeal);
router.delete("/:dealId", dealController.deleteDeal);

module.exports = router;
