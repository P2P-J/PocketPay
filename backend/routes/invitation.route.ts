const express = require("express");
const router = express.Router();
const invitationController = require("../controllers/invitation.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");
const { validate } = require("../middleware/validate.middleware");
const { teamIdParamSchema } = require("../validators/team.validator");

router.use(loginUserVerify);

router.get("/", invitationController.getInvitations);
router.post(
  "/:teamId/accept",
  validate(teamIdParamSchema),
  invitationController.acceptInvitation
);
router.post(
  "/:teamId/reject",
  validate(teamIdParamSchema),
  invitationController.rejectInvitation
);

module.exports = router;
