const express = require("express");
const router = express.Router();
const dealController = require("../controllers/deal.controller");

router.post("/register", dealController.registerDeal);

router.get("/monthly", dealController.getMonthlyDeals);

router.get("/:dealId", dealController.getDealDetail);

router.put("/:dealId", dealController.updateDeal);

router.delete("/:dealId", dealController.deleteDeal);

module.exports = router;
