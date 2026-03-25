const Deal = require("../../models/Deal.model");
const Team = require("../../models/Team.model");
const AppError = require("../../utils/AppError");
const { isValidObjectId } = require("../../utils/validation");

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
  const y = Number(year);
  const m = Number(month);
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 1);

  const deals = await Deal.find({
    teamId: teamId,
    date: { $gte: startDate, $lt: endDate },
  }).sort({ date: -1 });

  return deals;
};

const getTeamSummary = async (teamId) => {
  const result = await Deal.aggregate([
    { $match: { teamId: new (require("mongoose").Types.ObjectId)(teamId) } },
    { $group: { _id: "$division", total: { $sum: "$price" } } },
  ]);

  let income = 0;
  let expense = 0;
  for (const r of result) {
    if (r._id === "수입") income = r.total;
    else expense = r.total;
  }
  return { income, expense, balance: income - expense };
};

const getMonthlyStats = async (teamId, year, month) => {
  const y = Number(year);
  const m = Number(month);

  // 이번 달
  const curStart = new Date(y, m - 1, 1);
  const curEnd = new Date(y, m, 1);
  const curDeals = await Deal.find({
    teamId,
    date: { $gte: curStart, $lt: curEnd },
  });

  // 전월
  const prevStart = new Date(y, m - 2, 1);
  const prevEnd = new Date(y, m - 1, 1);
  const prevDeals = await Deal.find({
    teamId,
    date: { $gte: prevStart, $lt: prevEnd },
  });

  // 이번 달 합계
  let curIncome = 0, curExpense = 0;
  const categoryMap: Record<string, number> = {};
  for (const d of curDeals) {
    if (d.division === "수입") curIncome += d.price;
    else {
      curExpense += d.price;
      const cat = d.category || "기타";
      categoryMap[cat] = (categoryMap[cat] || 0) + d.price;
    }
  }

  // 전월 합계
  let prevIncome = 0, prevExpense = 0;
  for (const d of prevDeals) {
    if (d.division === "수입") prevIncome += d.price;
    else prevExpense += d.price;
  }

  // 증감률 계산
  const incomeChange = prevIncome > 0
    ? Math.round(((curIncome - prevIncome) / prevIncome) * 100)
    : curIncome > 0 ? 100 : 0;
  const expenseChange = prevExpense > 0
    ? Math.round(((curExpense - prevExpense) / prevExpense) * 100)
    : curExpense > 0 ? 100 : 0;

  // 카테고리별 지출 (금액 내림차순)
  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return {
    current: { income: curIncome, expense: curExpense },
    previous: { income: prevIncome, expense: prevExpense },
    incomeChange,
    expenseChange,
    categoryBreakdown,
    topCategory: categoryBreakdown[0] || null,
  };
};

// 전체 거래 조회 (페이지네이션, 날짜 내림차순)
const getAllDeals = async (teamId, page = 1, limit = 30) => {
  const skip = (page - 1) * limit;
  const deals = await Deal.find({ teamId })
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);
  const total = await Deal.countDocuments({ teamId });
  return { deals, total, hasMore: skip + deals.length < total };
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
  getAllDeals,
  getTeamSummary,
  getMonthlyStats,
  updateDeal,
  deleteDeal,
};
