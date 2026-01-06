const dealService = require("../services/deal/deal.service");
const Team = require("../models/Team.model");

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

    const team = await Team.findOne({
      _id: teamId,
      "members.user": userId,
    });

    if (!team) {
      return res
        .status(403)
        .json({ message: "해당 팀에 접근 권한이 없습니다." });
    }

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
    console.log(error);
    return res.status(500).json({ message: "서버 에러 발생" });
  }
};

const getDealDetail = async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.userId;

    const deal = await dealService.getDealDetail(dealId);

    if (!deal) {
      return res.status(404).json({ message: "영수증을 찾을 수 없습니다." });
    }

    const team = await Team.findOne({
      _id: deal.teamId,
      "members.user": userId,
    });

    if (!team) {
      return res
        .status(403)
        .json({ message: "해당 팀에 접근 권한이 없습니다." });
    }

    return res.status(200).json({ data: deal });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "서버 에러 발생" });
  }
};

const getMonthlyDeals = async (req, res) => {
  try {
    const { year, month, teamId } = req.query;
    const userId = req.user.userId;

    if (!year || !month || !teamId) {
      return res
        .status(400)
        .json({ message: "teamId, 연도, 월을 입력해주세요." });
    }

    const team = await Team.findOne({
      _id: teamId,
      "members.user": userId,
    });

    if (!team) {
      return res
        .status(403)
        .json({ message: "해당 팀에 접근 권한이 없습니다." });
    }

    const deals = await dealService.getMonthlyDeals(teamId, year, month);
    return res.status(200).json({ data: deals });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "서버 에러 발생" });
  }
};

const updateDeal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const updateData = req.body;
    const userId = req.user.userId;

    const deal = await dealService.getDealDetail(dealId);
    if (!deal) {
      return res.status(404).json({ message: "영수증을 찾을 수 없습니다." });
    }

    const team = await Team.findOne({
      _id: deal.teamId,
      "members.user": userId,
    });

    if (!team) {
      return res
        .status(403)
        .json({ message: "해당 팀에 접근 권한이 없습니다." });
    }

    const updatedDeal = await dealService.updateDeal(dealId, updateData);
    return res.status(200).json({ message: "수정 성공", data: updatedDeal });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "서버 에러 발생" });
  }
};

const deleteDeal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user.userId;

    const deal = await dealService.getDealDetail(dealId);
    if (!deal) {
      return res.status(404).json({ message: "영수증을 찾을 수 없습니다." });
    }

    const team = await Team.findOne({
      _id: deal.teamId,
      "members.user": userId,
    });

    if (!team) {
      return res
        .status(403)
        .json({ message: "해당 팀에 접근 권한이 없습니다." });
    }

    await dealService.deleteDeal(dealId);
    return res.status(200).json({ message: "삭제 성공" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "서버 에러 발생" });
  }
};

module.exports = {
  registerDeal,
  getDealDetail,
  getMonthlyDeals,
  updateDeal,
  deleteDeal,
};
