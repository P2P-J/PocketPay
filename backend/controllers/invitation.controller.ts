const teamService = require("../services/team/team.service");
const { handleError } = require("../utils/errorHandler");

const getInvitations = async (req, res) => {
  try {
    const invitations = await teamService.getPendingInvitations(req.user.userId);
    res.status(200).json({ data: invitations });
  } catch (err) {
    handleError(res, err);
  }
};

const acceptInvitation = async (req, res) => {
  try {
    const team = await teamService.acceptInvitation(
      req.params.teamId,
      req.user.userId
    );
    res.status(200).json({ data: { success: true, team } });
  } catch (err) {
    handleError(res, err);
  }
};

const rejectInvitation = async (req, res) => {
  try {
    const result = await teamService.rejectInvitation(
      req.params.teamId,
      req.user.userId
    );
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = {
  getInvitations,
  acceptInvitation,
  rejectInvitation,
};
