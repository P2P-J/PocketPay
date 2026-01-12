const express = require("express");
const router = express.Router();
const teamController = require("../controllers/team.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");

router.use(loginUserVerify);

router.post("/", teamController.createTeam);
router.get("/", teamController.getMyTeams);
router.get("/:teamId", teamController.getTeam);
router.put("/:teamId", teamController.updateTeam);
router.delete("/:teamId", teamController.deleteTeam);
router.post("/:teamId/members", teamController.inviteMember);

module.exports = router;