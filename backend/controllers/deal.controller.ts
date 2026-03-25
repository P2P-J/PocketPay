const dealService = require("../services/deal/deal.service");
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

    const userId = req.user.userId;

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
      createdBy: userId,
    });

    return res.status(201).json({ message: "영수증 등록 성공", data: newDeal });
  } catch (error) {
    return handleError(res, error);
  }
};

const getDealDetail = async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.userId;

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
    const userId = req.user.userId;

    await dealService.checkTeamMembership(teamId, userId);

    const deals = await dealService.getMonthlyDeals(teamId, Number(year), Number(month));
    return res.status(200).json({ data: deals });
  } catch (error: any) {
    console.error("[getMonthlyDeals ERROR]", error?.message, error?.stack?.split("\n")[1]);
    return handleError(res, error);
  }
};

const updateDeal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.userId;

    // Mass Assignment 방지: 허용된 필드만 추출
    const { storeInfo, division, description, category, price, date, businessNumber } = req.body;
    const safeUpdate = Object.fromEntries(
      Object.entries({ storeInfo, division, description, category, price, date, businessNumber })
        .filter(([, v]) => v !== undefined)
    );

    const deal = await dealService.getDealById(dealId);
    await dealService.checkTeamMembership(deal.teamId, userId);

    const updatedDeal = await dealService.updateDeal(dealId, safeUpdate);
    return res.status(200).json({ message: "수정 성공", data: updatedDeal });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteDeal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.userId;

    const deal = await dealService.getDealById(dealId);
    await dealService.checkTeamMembership(deal.teamId, userId);

    await dealService.deleteDeal(dealId);
    return res.status(204).end();
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllDeals = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;

    await dealService.checkTeamMembership(teamId, userId);
    const result = await dealService.getAllDeals(teamId, page, limit);
    return res.status(200).json({ data: result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getTeamSummary = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.userId;

    await dealService.checkTeamMembership(teamId, userId);
    const summary = await dealService.getTeamSummary(teamId);
    return res.status(200).json({ data: summary });
  } catch (error) {
    return handleError(res, error);
  }
};

const getMonthlyStatsCtrl = async (req, res) => {
  try {
    const { teamId } = req.params;
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const userId = req.user.userId;

    await dealService.checkTeamMembership(teamId, userId);
    const stats = await dealService.getMonthlyStats(teamId, year, month);
    return res.status(200).json({ data: stats });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  registerDeal,
  getDealDetail,
  getMonthlyDeals,
  getAllDeals,
  getTeamSummary,
  getMonthlyStatsCtrl,
  updateDeal,
  deleteDeal,
};
