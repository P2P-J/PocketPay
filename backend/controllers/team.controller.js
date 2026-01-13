const teamService = require("../services/team/team.service");
const { handleError } = require("../utils/errorHandler");

const createTeam = async (req, res) => {
  try {
    const team = await teamService.createTeam(req.user.userId, req.body);
    res.status(201).json({ data: team });
  } catch (err) {
    handleError(res, err);
  }
};

const getMyTeams = async (req, res) => {
  try {
    const teams = await teamService.getMyTeams(req.user.userId);
    res.status(200).json({ data: teams });
  } catch (err) {
    handleError(res, err);
  }
};

const getTeam = async (req, res) => {
  try {
    const team = await teamService.getTeam(req.params.teamId, req.user.userId);
    res.status(200).json({ data: team });
  } catch (err) {
    handleError(res, err);
  }
};

const updateTeam = async (req, res) => {
  try {
    const team = await teamService.updateTeam(req.params.teamId, req.user.userId, req.body);
    res.status(200).json({ data: team });
  } catch (err) {
    handleError(res, err);
  }
};

const deleteTeam = async (req, res) => {
  try {
    await teamService.deleteTeam(req.params.teamId, req.user.userId);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
};

const inviteMember = async (req, res) => {
  try {
    const team = await teamService.inviteMember(req.params.teamId, req.user.userId, req.body.email);
    res.status(201).json({ data: team });
  } catch (err) {
    handleError(res, err);
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
