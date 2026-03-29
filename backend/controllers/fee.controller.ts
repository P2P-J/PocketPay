const feeService = require("../services/fee/fee.service");
const { handleError } = require("../utils/errorHandler");

const getFeeStatus = async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const result = await feeService.getFeeStatus(req.params.teamId, req.user.userId, year, month);
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
};

const recordPayment = async (req, res) => {
  try {
    const payment = await feeService.recordPayment(
      req.params.teamId,
      req.user.userId,
      req.body
    );
    res.status(201).json({ data: payment });
  } catch (err) {
    handleError(res, err);
  }
};

const deletePayment = async (req, res) => {
  try {
    await feeService.deletePayment(req.params.teamId, req.user.userId, req.params.paymentId);
    res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
};

const updateFeeRule = async (req, res) => {
  try {
    const result = await feeService.updateFeeRule(req.params.teamId, req.user.userId, req.body);
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
};

module.exports = { getFeeStatus, recordPayment, deletePayment, updateFeeRule };
