const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth.route"));
router.use("/deals", require("./deal.route"));
router.use("/teams", require("./team.route"));
router.use("/ocr", require("./ocr.route"));
router.use("/account", require("./account.route"));

module.exports = router;
