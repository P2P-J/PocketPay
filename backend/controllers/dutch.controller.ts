const dutchService = require("../services/dutch/dutch.service");
const { handleError } = require("../utils/errorHandler");

const createDutchRequestsController = async (req, res) => {
  try {
    const result = await dutchService.createDutchRequests(
      req.user.userId,
      req.body
    );
    res.status(201).json({ data: result });
  } catch (err) {
    return handleError(res, err);
  }
};

const listMyDutchRequestsController = async (req, res) => {
  try {
    const requests = await dutchService.listMyDutchRequests(req.user.userId);
    res.status(200).json({ data: requests });
  } catch (err) {
    return handleError(res, err);
  }
};

const dismissDutchRequestController = async (req, res) => {
  try {
    const result = await dutchService.dismissDutchRequest(
      req.params.id,
      req.user.userId
    );
    res.status(200).json({ data: result });
  } catch (err) {
    return handleError(res, err);
  }
};

module.exports = {
  createDutchRequestsController,
  listMyDutchRequestsController,
  dismissDutchRequestController,
};
