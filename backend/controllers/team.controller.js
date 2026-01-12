const teamService = require("../services/team/team.service");

// 팀 생성 POST /team
const createTeam = async (req, res) => {
  try {
    const team = await teamService.createTeam(req.user._id, req.body);

    res.status(201).json(team);
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

// 로그인 유저 팀 목록 조회 GET /team
const getMyTeams = async (req, res) => {
  try {
    const teams = await teamService.getMyTeams(req.user._id);

    res.status(200).json(teams);
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

// 팀 개별 조회 GET /team/:id
const getTeam = async (req, res) => {
  try {
    const team = await teamService.getTeam(req.params.id, req.user._id);

    res.status(200).json(team);
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

// 팀 수정 PUT /team/:id
const updateTeam = async (req, res) => {
  try {
    const team = await teamService.updateTeam(
      req.params.id,
      req.user._id,
      req.body
    );

    res.status(200).json(team);
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

// 팀 삭제 DELETE /team/:id
const deleteTeam = async (req, res) => {
  try {
    await teamService.deleteTeam(req.params.id, req.user._id);

    res.status(204).send();
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

// 팀원 초대 POST /team/:id/invite
const inviteMember = async (req, res) => {
  try {
    await teamService.inviteMember(req.params.id, req.user._id, req.body.email);
    res.status(204).send();
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};

module.exports = {
  createTeam,
  getMyTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
};
