const express = require("express");
const router = express.Router();
const teamController = require("../controllers/team.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  createTeamSchema,
  updateTeamSchema,
  teamIdParamSchema,
  inviteMemberSchema,
  removeMemberSchema,
} = require("../validators/team.validator");

router.use(loginUserVerify);

router.post("/", validate(createTeamSchema), teamController.createTeam);
router.get("/", teamController.getMyTeams);
router.get("/:teamId", validate(teamIdParamSchema), teamController.getTeam);
router.put("/:teamId", validate(updateTeamSchema), teamController.updateTeam);
router.delete("/:teamId", validate(teamIdParamSchema), teamController.deleteTeam);
router.post("/:teamId/members", validate(inviteMemberSchema), teamController.inviteMember);
router.delete("/:teamId/members/me", validate(teamIdParamSchema), teamController.leaveTeam);
router.delete("/:teamId/members/:userId", validate(removeMemberSchema), teamController.removeMember);

module.exports = router;
