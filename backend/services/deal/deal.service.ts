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

  const curStart = new Date(y, m - 1, 1);
  const curEnd = new Date(y, m, 1);
  const prevStart = new Date(y, m - 2, 1);
  const prevEnd = new Date(y, m - 1, 1);

  // aggregate로 division/category 집계를 DB에서 처리 (in-memory 루프 제거)
  // (teamId, date, division) 및 (teamId, category) 인덱스 활용
  const teamObjId = new (require("mongoose").Types.ObjectId)(String(teamId));
  const [curStats, prevStats, catStats] = await Promise.all([
    Deal.aggregate([
      { $match: { teamId: teamObjId, date: { $gte: curStart, $lt: curEnd } } },
      { $group: { _id: "$division", total: { $sum: "$price" } } },
    ]),
    Deal.aggregate([
      { $match: { teamId: teamObjId, date: { $gte: prevStart, $lt: prevEnd } } },
      { $group: { _id: "$division", total: { $sum: "$price" } } },
    ]),
    Deal.aggregate([
      {
        $match: {
          teamId: teamObjId,
          date: { $gte: curStart, $lt: curEnd },
          $or: [{ division: "지출" }, { division: { $exists: false } }],
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$category", "기타"] },
          total: { $sum: "$price" },
        },
      },
      { $sort: { total: -1 } },
    ]),
  ]);

  const pickDivision = (rows, key: string): number => {
    for (const r of rows) if (r._id === key) return r.total;
    return 0;
  };
  const curIncome = pickDivision(curStats, "수입");
  const curExpense = pickDivision(curStats, "지출");
  const prevIncome = pickDivision(prevStats, "수입");
  const prevExpense = pickDivision(prevStats, "지출");

  const incomeChange = prevIncome > 0
    ? Math.round(((curIncome - prevIncome) / prevIncome) * 100)
    : curIncome > 0 ? 100 : 0;
  const expenseChange = prevExpense > 0
    ? Math.round(((curExpense - prevExpense) / prevExpense) * 100)
    : curExpense > 0 ? 100 : 0;

  const categoryBreakdown = catStats.map((c) => ({ category: c._id, total: c.total }));

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
