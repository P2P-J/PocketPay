const dealService = require("../services/deal/deal.service");

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

    // 로그인한 사용자 ID인데 그 Auth middleware가 req.user에 정보를 담아준다고 가정
    const userId = req.user ? req.user.userId : null;

    if (!userId) {
      return res.status(401).json({ message: "로그인 필요" });
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
    const deal = await dealService.getDealDetail(dealId);

    if (!deal) {
      return res.status(404).json({ message: "영수증을 찾을 수 없습니다." });
    }

    return res.status(200).json({ data: deal });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "서버 에러 발생" });
  }
};

const getMonthlyDeals = async (req, res) => {
  try {
    const { year, month } = req.query; // 대충 뭐 GET /deal/monthly?year=2024&month=1 이런식?
    const userId = req.user ? req.user.userId : null;

    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }

    if (!year || !month) {
      return res.status(400).json({ message: "연도와 월을 입력해주세요." });
    }

    const deals = await dealService.getMonthlyDeals(userId, year, month);
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

    const deal = await dealService.getDealDetail(dealId);
    if (!deal) {
      return res.status(404).json({ message: "영수증을 찾을 수 없습니다." });
    }

    // 권한 관련 검사 필요할듯(teamId 이용해서 해당 팀 멤버인지 등)?

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

    const deal = await dealService.getDealDetail(dealId);
    if (!deal) {
      return res.status(404).json({ message: "영수증을 찾을 수 없습니다." });
    }

    // 권한 관련 검사 필요할듯(teamId 이용해서 해당 팀 멤버인지 등)?

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
