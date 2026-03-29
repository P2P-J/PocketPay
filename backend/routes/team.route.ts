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
  inviteTokenParamSchema,
} = require("../validators/team.validator");

router.use(loginUserVerify);

router.post("/", validate(createTeamSchema), teamController.createTeam);
router.get("/", teamController.getMyTeams);
// QR 초대 토큰으로 팀 가입 (특정 경로 먼저 등록)
router.post("/join/:token", validate(inviteTokenParamSchema), teamController.joinByToken);
router.get("/:teamId", validate(teamIdParamSchema), teamController.getTeam);
router.put("/:teamId", validate(updateTeamSchema), teamController.updateTeam);
router.delete("/:teamId", validate(teamIdParamSchema), teamController.deleteTeam);
router.post("/:teamId/invite-token", validate(teamIdParamSchema), teamController.generateInviteToken);
router.post("/:teamId/members", validate(inviteMemberSchema), teamController.inviteMember);
router.delete("/:teamId/members/me", validate(teamIdParamSchema), teamController.leaveTeam);
router.delete("/:teamId/members/:userId", validate(removeMemberSchema), teamController.removeMember);

module.exports = router;
