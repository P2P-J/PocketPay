const { DutchRequest, Team, User } = require("../../models/index");
const AppError = require("../../utils/AppError");
const { isValidObjectId } = require("../../utils/validation");

const EXPIRY_DAYS = 7;
const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

const isAccountFilled = (account) =>
  !!(account && account.bank && account.number && account.holder);

const resolveAccount = (team, requester) => {
  const personal = requester.account;
  const teamAccount = team.account;
  const hasPersonal = isAccountFilled(personal);
  const hasTeam = isAccountFilled(teamAccount);

  if (team.accountMode === "personal") {
    if (hasPersonal) return personal;
    if (hasTeam) return teamAccount;
  } else {
    if (hasTeam) return teamAccount;
    if (hasPersonal) return personal;
  }
  return null;
};

const createDutchRequests = async (
  requesterId,
  { teamId, recipientIds, amount, totalAmount, participantCount, memo }
) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findById(teamId);
  if (!team) throw AppError.notFound("모임을 찾을 수 없습니다.");

  // 요청자가 모임 멤버인지
  const requesterStr = String(requesterId);
  const isMember = team.members.some((m) => m.user.toString() === requesterStr);
  if (!isMember) throw AppError.forbidden("모임 멤버가 아닙니다.");

  // 본인 자동 제외 + 중복 제거 (방어적)
  const filteredRecipients = Array.from(
    new Set(recipientIds.map((id) => String(id)))
  ).filter((id) => id !== requesterStr);
  if (filteredRecipients.length === 0) {
    throw AppError.badRequest("받는 사람이 없습니다.");
  }

  // 모든 recipientId가 모임 멤버인지 확인
  const memberIds = new Set(team.members.map((m) => m.user.toString()));
  for (const rid of filteredRecipients) {
    if (!memberIds.has(String(rid))) {
      throw AppError.badRequest(
        "받는 사람 중 모임 멤버가 아닌 사용자가 있습니다."
      );
    }
  }

  // 계좌 결정
  const requester = await User.findById(requesterId);
  if (!requester) throw AppError.notFound("사용자를 찾을 수 없습니다.");
  const account = resolveAccount(team, requester);
  if (!account) {
    throw AppError.badRequest(
      "계좌가 등록되지 않았습니다. 프로필 또는 모임 관리에서 계좌를 등록해주세요."
    );
  }

  const expiresAt = new Date(Date.now() + EXPIRY_MS);
  const docs = filteredRecipients.map((rid) => ({
    requester: requesterId,
    team: teamId,
    recipient: rid,
    amount,
    memo: memo || undefined,
    totalAmount,
    participantCount,
    accountSnapshot: {
      bank: account.bank,
      number: account.number,
      holder: account.holder,
    },
    status: "pending",
    expiresAt,
  }));

  await DutchRequest.insertMany(docs);

  return {
    count: docs.length,
    account: {
      bank: account.bank,
      number: account.number,
      holder: account.holder,
    },
  };
};

const listMyDutchRequests = async (userId) => {
  const now = new Date();
  const requests = await DutchRequest.find({
    recipient: userId,
    status: "pending",
    expiresAt: { $gt: now },
  })
    .populate("requester", "name nickname handle")
    .populate("team", "name displayMode")
    .sort({ createdAt: -1 })
    .lean();

  return requests.map((r) => {
    const requesterObj = r.requester || {};
    const teamObj = r.team || {};
    const displayMode = teamObj.displayMode || "nickname";
    const requesterDisplayName =
      displayMode === "realName"
        ? requesterObj.name || requesterObj.nickname || "알 수 없음"
        : requesterObj.nickname || requesterObj.name || "알 수 없음";

    return {
      _id: r._id,
      teamId: teamObj._id,
      teamName: teamObj.name || "",
      teamDisplayMode: displayMode,
      requesterId: requesterObj._id,
      requesterName: requesterObj.name,
      requesterNickname: requesterObj.nickname,
      requesterHandle: requesterObj.handle,
      requesterDisplayName,
      amount: r.amount,
      totalAmount: r.totalAmount,
      participantCount: r.participantCount,
      memo: r.memo,
      accountSnapshot: r.accountSnapshot,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    };
  });
};

const dismissDutchRequest = async (requestId, userId) => {
  if (!isValidObjectId(requestId)) {
    throw AppError.badRequest("올바른 요청 ID가 아닙니다.");
  }

  const request = await DutchRequest.findOne({
    _id: requestId,
    recipient: userId,
  });

  if (!request) {
    throw AppError.notFound("알림을 찾을 수 없습니다.");
  }

  request.status = "dismissed";
  await request.save();
  return { success: true };
};

module.exports = {
  createDutchRequests,
  listMyDutchRequests,
  dismissDutchRequest,
};
