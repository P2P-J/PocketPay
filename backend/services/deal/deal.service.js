const mongoose = require("mongoose");
const Deal = require("../../models/Deal.model");
const Team = require("../../models/Team.model");
const AppError = require("../../utils/AppError");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const checkTeamMembership = async (teamId, userId) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    "members.user": userId,
  });

  if (!team) {
    throw AppError.forbidden("해당 팀에 접근 권한이 없습니다.");
  }

  return team;
};

const getDealById = async (dealId) => {
  if (!isValidObjectId(dealId)) {
    throw AppError.badRequest("올바른 영수증 ID가 아닙니다.");
  }

  const deal = await Deal.findById(dealId);

  if (!deal) {
    throw AppError.notFound("영수증을 찾을 수 없습니다.");
  }

  return deal;
};

const createDeal = async (dealData) => {
  const deal = new Deal(dealData);
  await deal.save();
  return deal;
};

const getMonthlyDeals = async (teamId, year, month) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const deals = await Deal.find({
    teamId: teamId,
    date: { $gte: startDate, $lt: endDate },
  }).sort({ date: -1 });

  return deals;
};

const updateDeal = async (dealId, updateData) => {
  const updatedDeal = await Deal.findByIdAndUpdate(dealId, updateData, { new: true });
  return updatedDeal;
};

const deleteDeal = async (dealId) => {
  const deletedDeal = await Deal.findByIdAndDelete(dealId);
  return deletedDeal;
};

module.exports = {
  checkTeamMembership,
  getDealById,
  createDeal,
  getMonthlyDeals,
  updateDeal,
  deleteDeal,
};
