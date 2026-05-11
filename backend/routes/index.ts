const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth.route"));
router.use("/deals", require("./deal.route"));
router.use("/teams", require("./team.route"));
router.use("/fees", require("./fee.route"));
router.use("/ocr", require("./ocr.route"));
router.use("/account", require("./account.route"));
router.use("/invitations", require("./invitation.route"));
router.use("/dutch-requests", require("./dutch-request.route"));

module.exports = router;
