const Deal = require("../../models/Deal.model");

// 영수증 등록 POST /deal/register
const createDeal = async (dealData) => {
  try {
    const deal = new Deal(dealData);
    await deal.save();
    return deal;
  } catch (error) {
    throw error;
  }
};

// 영수증 조회 GET /deal/:id
const getDealDetail = async (dealId) => {
  try {
    const deal = await Deal.findById(dealId);
    return deal;
  } catch (error) {
    throw error;
  }
};

// 영수증 월별조회 GET /deal/monthly?year=&month=&teamId=
const getMonthlyDeals = async (teamId, year, month) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const deals = await Deal.find({
      teamId: teamId,
      date: {
        $gte: startDate,
        $lt: endDate,
      },
    }).sort({ date: -1 });

    return deals;
  } catch (error) {
    throw error;
  }
};

// 영수증 수정 PUT /deal/:id
const updateDeal = async (dealId, updateData) => {
  try {
    const updatedDeal = await Deal.findByIdAndUpdate(dealId, updateData, {
      new: true,
    });
    return updatedDeal;
  } catch (error) {
    throw error;
  }
};

// 영수증 삭제 DELETE /deal/:id
const deleteDeal = async (dealId) => {
  try {
    const deletedDeal = await Deal.findByIdAndDelete(dealId);
    return deletedDeal;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createDeal,
  getDealDetail,
  getMonthlyDeals,
  updateDeal,
  deleteDeal,
};
