const dealService = require("../services/deal/deal.service");
const AppError = require("../utils/AppError");
const { handleError } = require("../utils/errorHandler");

const registerDeal = async (req, res) => {
  try {
    const {
      storeInfo,
      division,
      description,
      category,
      price,
      businessNumber,
      date,
      teamId,
    } = req.body;

    const userId = req.user._id;

    await dealService.checkTeamMembership(teamId, userId);

    const newDeal = await dealService.createDeal({
      storeInfo,
      division,
      description,
      category,
      price,
      businessNumber,
      date,
      teamId,
    });

    return res.status(201).json({ message: "영수증 등록 성공", data: newDeal });
  } catch (error) {
    return handleError(res, error);
  }
};

const getDealDetail = async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user._id;

    const deal = await dealService.getDealById(dealId);
    await dealService.checkTeamMembership(deal.teamId, userId);

    return res.status(200).json({ data: deal });
  } catch (error) {
    return handleError(res, error);
  }
};

const getMonthlyDeals = async (req, res) => {
  try {
    const { year, month, teamId } = req.query;
    const userId = req.user._id;

    if (!year || !month || !teamId) {
      throw AppError.badRequest("teamId, 연도, 월을 입력해주세요.");
    }

    await dealService.checkTeamMembership(teamId, userId);

    const deals = await dealService.getMonthlyDeals(teamId, year, month);
    return res.status(200).json({ data: deals });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateDeal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const updateData = req.body;
    const userId = req.user._id;

    const deal = await dealService.getDealById(dealId);
    await dealService.checkTeamMembership(deal.teamId, userId);

    const updatedDeal = await dealService.updateDeal(dealId, updateData);
    return res.status(200).json({ message: "수정 성공", data: updatedDeal });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteDeal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user._id;

    const deal = await dealService.getDealById(dealId);
    await dealService.checkTeamMembership(deal.teamId, userId);

    await dealService.deleteDeal(dealId);
    return res.status(200).json({ message: "삭제 성공" });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  registerDeal,
  getDealDetail,
  getMonthlyDeals,
  updateDeal,
  deleteDeal,
};
