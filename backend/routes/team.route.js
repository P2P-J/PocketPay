const express = require("express");
const router = express.Router();
const teamController = require("../controllers/team.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");

router.use(loginUserVerify);

router.post("/", teamController.createTeam);
router.get("/", teamController.getMyTeams);
router.get("/:id", teamController.getTeam);
router.put("/:id", teamController.updateTeam);
router.delete("/:id", teamController.deleteTeam);
router.post("/:id/invite", teamController.inviteMember);

module.exports = router;