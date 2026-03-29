const { Team, FeePayment } = require("../../models/index");
const AppError = require("../../utils/AppError");
const { isValidObjectId } = require("../../utils/validation");

/**
 * 이번 달 회비 현황 조회
 * - 팀 멤버 전체 + 납부 여부를 합쳐서 반환
 */
const getFeeStatus = async (teamId, requesterId, year, month) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    "members.user": requesterId,
  }).populate("members.user", "name email");

  if (!team) {
    throw AppError.notFound("팀을 찾을 수 없습니다.");
  }

  // 해당 월 납부 기록 전체
  const payments = await FeePayment.find({ teamId, year, month })
    .populate("userId", "name email")
    .lean();

  // 납부 맵 (userId → payment)
  const paymentMap: Record<string, any> = {};
  for (const p of payments) {
    paymentMap[p.userId._id.toString()] = p;
  }

  // 멤버 목록 + 납부 상태 조합
  const members = team.members.map((m: any) => {
    const user = m.user;
    const userId = user._id.toString();
    const payment = paymentMap[userId] || null;
    return {
      userId,
      name: user.name || "알 수 없음",
      email: user.email || "",
      role: m.role,
      payment: payment
        ? {
            id: payment._id.toString(),
            amount: payment.amount,
            paidAt: payment.paidAt,
            note: payment.note,
          }
        : null,
    };
  });

  // 납부 순서 정렬 (납부 완료자 위로)
  members.sort((a: any, b: any) => {
    if (a.payment && !b.payment) return -1;
    if (!a.payment && b.payment) return 1;
    return 0;
  });

  const paidCount = members.filter((m: any) => m.payment).length;

  return {
    feeAmount: team.feeAmount,
    feeDueDay: team.feeDueDay,
    year,
    month,
    members,
    paidCount,
    totalCount: members.length,
  };
};

/**
 * 납부 기록 추가 (팀장만 가능)
 */
const recordPayment = async (teamId, ownerId, { userId, amount, paidAt, note, year, month }) => {
  if (!isValidObjectId(teamId) || !isValidObjectId(userId)) {
    throw AppError.badRequest("올바른 ID가 아닙니다.");
  }

  const team = await Team.findOne({ _id: teamId, owner: ownerId });
  if (!team) {
    throw AppError.forbidden("납부 기록 권한이 없습니다.");
  }

  // 해당 멤버가 팀원인지 확인
  const isMember = team.members.some((m: any) => m.user.toString() === userId);
  if (!isMember) {
    throw AppError.badRequest("해당 사용자는 팀 멤버가 아닙니다.");
  }

  // upsert: 이미 있으면 덮어쓰기
  const payment = await FeePayment.findOneAndUpdate(
    { teamId, userId, year, month },
    {
      teamId,
      userId,
      year,
      month,
      amount: amount ?? team.feeAmount,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      confirmedBy: ownerId,
      note: note || "",
    },
    { upsert: true, new: true }
  );

  return payment;
};

/**
 * 납부 기록 삭제 (팀장만 가능)
 */
const deletePayment = async (teamId, ownerId, paymentId) => {
  if (!isValidObjectId(teamId) || !isValidObjectId(paymentId)) {
    throw AppError.badRequest("올바른 ID가 아닙니다.");
  }

  const team = await Team.findOne({ _id: teamId, owner: ownerId });
  if (!team) {
    throw AppError.forbidden("삭제 권한이 없습니다.");
  }

  const payment = await FeePayment.findOneAndDelete({ _id: paymentId, teamId });
  if (!payment) {
    throw AppError.notFound("납부 기록을 찾을 수 없습니다.");
  }
};

/**
 * 회비 규칙 설정 (팀장만 가능)
 */
const updateFeeRule = async (teamId, ownerId, { feeAmount, feeDueDay }) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({ _id: teamId, owner: ownerId });
  if (!team) {
    throw AppError.forbidden("회비 규칙 설정 권한이 없습니다.");
  }

  if (feeAmount !== undefined) team.feeAmount = feeAmount;
  if (feeDueDay !== undefined) team.feeDueDay = feeDueDay;
  await team.save();

  return { feeAmount: team.feeAmount, feeDueDay: team.feeDueDay };
};

module.exports = { getFeeStatus, recordPayment, deletePayment, updateFeeRule };
