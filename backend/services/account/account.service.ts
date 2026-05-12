const { User, Team, WithdrawnOauth } = require("../../models/index");
const providers = require("../auth/providers");
const { comparePassword, hashPassword } = require("../../utils/bcrypt.util");
const { validateHandleFormat } = require("../../utils/handle.util");
const { default: mongoose } = require("mongoose");
const AppError = require("../../utils/AppError");

const HANDLE_CHANGE_COOLDOWN_DAYS = 30;
const HANDLE_CHANGE_COOLDOWN_MS = HANDLE_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

const getMyAccount = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("사용자를 찾을 수 없습니다.");
  return user;
};

const deleteMyAccount = async (userId) => {
  const user = await User.findById(userId).select(
    "+oauthTokens.naver.refreshToken +oauthTokens.google.refreshToken +oauthTokens.kakao.refreshToken +oauthTokens.apple.refreshToken"
  );
  if (!user) throw AppError.notFound("사용자를 찾을 수 없습니다.");

  const ownedTeams = await Team.find({ owner: userId });
  const { provider, providerId } = user;

  // OAuth 토큰 해지 (실패해도 탈퇴는 진행)
  if (provider !== "local") {
    try {
      const revokeToken = user.oauthTokens?.[provider]?.refreshToken;
      await providers?.[provider]?.revokeToken(revokeToken);
    } catch {
      // revoke 실패 시 탈퇴는 계속 진행
    }
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const uid = new mongoose.Types.ObjectId(userId);

      await Team.updateMany(
        { "members.user": uid },
        { $pull: { members: { user: uid } } },
        { session }
      );

      if (ownedTeams.length > 0) {
        const teamIds = ownedTeams.map((t) => t._id);
        // 소유 팀의 거래 내역도 함께 삭제
        const Deal = require("../../models/Deal.model");
        await Deal.deleteMany({ teamId: { $in: teamIds } }, { session });
        await Team.deleteMany({ _id: { $in: teamIds } }, { session });
      }

      if (provider === "google" && providerId) {
        await WithdrawnOauth.updateOne(
          { provider: "google", providerId },
          { $set: { provider: "google", providerId, withdrawnAt: new Date() } },
          { upsert: true, session }
        );
      }

      await User.deleteOne({ _id: uid }, { session });
    });

    return { provider };
  } finally {
    session.endSession();
  }
};

const changeMyPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw AppError.notFound("사용자를 찾을 수 없습니다.");
  if (user.provider !== "local") {
    throw AppError.badRequest("소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.");
  }

  const match = await comparePassword(currentPassword, user.password);
  if (!match) throw AppError.unauthorized("현재 비밀번호가 올바르지 않습니다.");

  user.password = await hashPassword(newPassword);
  await user.save();
};

const checkHandleAvailable = async (handle) => {
  const lowered = (handle || "").toLowerCase().trim();

  if (!validateHandleFormat(lowered)) {
    return { available: false, reason: "format" };
  }

  const exists = await User.findOne({ handle: lowered }).lean();
  if (exists) {
    return { available: false, reason: "taken" };
  }

  return { available: true };
};

const updateProfile = async (userId, { name, nickname }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound("사용자를 찾을 수 없습니다.");
  }
  if (name !== undefined) user.name = String(name).trim();
  if (nickname !== undefined) user.nickname = String(nickname).trim();
  await user.save();
  return user;
};

const updateHandle = async (userId, { handle }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound("사용자를 찾을 수 없습니다.");
  }

  // 30일 제한 체크
  if (user.handleChangedAt) {
    const elapsed = Date.now() - user.handleChangedAt.getTime();
    if (elapsed < HANDLE_CHANGE_COOLDOWN_MS) {
      const remaining = Math.ceil(
        (HANDLE_CHANGE_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000)
      );
      throw AppError.badRequest(`${remaining}일 후에 변경 가능합니다.`);
    }
  }

  const loweredHandle = (handle || "").toLowerCase().trim();
  if (!validateHandleFormat(loweredHandle)) {
    throw AppError.badRequest("올바르지 않은 ID 형식입니다.");
  }

  // 본인 handle 동일하면 패스
  if (user.handle === loweredHandle) {
    return user;
  }

  const handleExists = await User.findOne({ handle: loweredHandle });
  if (handleExists) {
    throw AppError.badRequest("이미 사용 중인 ID입니다.");
  }

  user.handle = loweredHandle;
  user.handleChangedAt = new Date();
  await user.save();
  return user;
};

const updateMyAccount = async (userId, account) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound("사용자를 찾을 수 없습니다.");
  }

  if (account === null) {
    // mongoose에서 임베디드 객체 안전하게 unset
    user.set("account", undefined);
  } else {
    user.account = {
      bank: String(account.bank || "").trim(),
      number: String(account.number || "").trim(),
      holder: String(account.holder || "").trim(),
    };
  }
  await user.save();
  return user;
};

const registerPushToken = async (userId, token) => {
  if (!token || typeof token !== "string") {
    throw AppError.badRequest("올바른 토큰이 아닙니다.");
  }
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("사용자를 찾을 수 없습니다.");

  if (!user.pushTokens) user.pushTokens = [];
  if (!user.pushTokens.includes(token)) {
    user.pushTokens.push(token);
    await user.save();
  }
  return user;
};

const removePushToken = async (userId, token) => {
  if (!token) {
    throw AppError.badRequest("올바른 토큰이 아닙니다.");
  }
  await User.findByIdAndUpdate(userId, {
    $pull: { pushTokens: token },
  });
  return { success: true };
};

const markNotificationsViewed = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { notificationsLastViewedAt: new Date() },
    { new: true }
  );
  return user;
};

const getUnreadCount = async (userId) => {
  const { DutchRequest } = require("../../models/index");
  const user = await User.findById(userId).select("notificationsLastViewedAt");
  const since = user?.notificationsLastViewedAt || new Date(0);

  // 모임 초대 — pendingInvites 임베디드
  const teams = await Team.find({ "pendingInvites.user": userId }).lean();
  let inviteUnread = 0;
  for (const team of teams) {
    for (const invite of team.pendingInvites || []) {
      if (
        invite.user.toString() === String(userId) &&
        new Date(invite.invitedAt).getTime() > since.getTime()
      ) {
        inviteUnread++;
      }
    }
  }

  // 더치페이
  const dutchUnread = await DutchRequest.countDocuments({
    recipient: userId,
    status: "pending",
    expiresAt: { $gt: new Date() },
    createdAt: { $gt: since },
  });

  return { count: inviteUnread + dutchUnread };
};

module.exports = {
  getMyAccount,
  deleteMyAccount,
  changeMyPassword,
  checkHandleAvailable,
  updateProfile,
  updateHandle,
  updateMyAccount,
  registerPushToken,
  removePushToken,
  markNotificationsViewed,
  getUnreadCount,
};
