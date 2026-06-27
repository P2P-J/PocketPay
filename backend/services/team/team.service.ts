const { Team, User, Deal } = require("../../models/index");
const AppError = require("../../utils/AppError");
const { isValidObjectId } = require("../../utils/validation");
const pushService = require("../push/push.service");

const createTeam = async (userId, payload) => {
  const {
    name,
    description,
    category,
    displayMode,
    accountMode,
    feeEnabled,
  } = payload || {};

  const team = await Team.create({
    name,
    description: description || "",
    owner: userId,
    members: [{ user: userId, role: "owner" }],
    category: category || "friend",
    displayMode: displayMode || "nickname",
    accountMode: accountMode || "personal",
    feeEnabled: feeEnabled === true,
  });
  return team;
};

const getMyTeams = async (userId) => {
  // aggregate로 N+1 제거: Team + 각 팀의 최신 Deal.createdAt 단일 쿼리로 조회 후 정렬
  // (이전: 팀 N개에 대해 Team.find 1회 + Deal.findOne N회)
  const teams = await Team.aggregate([
    { $match: { "members.user": userId } },
    {
      $lookup: {
        from: "deals",
        let: { tid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$teamId", "$$tid"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          { $project: { createdAt: 1 } },
        ],
        as: "latestDeal",
      },
    },
    {
      $addFields: {
        latestActivity: {
          $ifNull: [{ $arrayElemAt: ["$latestDeal.createdAt", 0] }, "$createdAt"],
        },
      },
    },
    { $project: { latestDeal: 0 } },
    { $sort: { latestActivity: -1 } },
  ]);

  return teams;
};

const getTeam = async (teamId, userId) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    "members.user": userId,
  }).populate("members.user", "name nickname handle email");

  if (!team) {
    throw AppError.notFound("팀을 찾을 수 없습니다.");
  }

  // 멤버를 가입 순서(joinedAt)로 정렬 (owner가 가장 먼저)
  team.members.sort((a: any, b: any) =>
    new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  );

  return team;
};

const updateTeam = async (teamId, userId, data) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    owner: userId,
  });

  if (!team) {
    throw AppError.forbidden("팀 수정 권한이 없습니다.");
  }

  // Mass Assignment 방지: 허용 필드만 추출
  const ALLOWED_FIELDS = [
    "name",
    "description",
    "category",
    "displayMode",
    "accountMode",
    "feeEnabled",
    "feeAmount",
    "feeDueDay",
  ];
  for (const key of ALLOWED_FIELDS) {
    if (data[key] !== undefined) team[key] = data[key];
  }
  // account는 객체 또는 null 허용
  if (data.account !== undefined) {
    if (data.account === null) {
      team.set("account", undefined);
    } else {
      team.account = {
        bank: String(data.account.bank || "").trim(),
        number: String(data.account.number || "").trim(),
        holder: String(data.account.holder || "").trim(),
      };
    }
  }
  await team.save();
  return team;
};

const deleteTeam = async (teamId, userId) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({ _id: teamId, owner: userId });
  if (!team) {
    throw AppError.forbidden("팀 삭제 권한이 없습니다.");
  }

  // 트랜잭션으로 원자적 삭제 (Deal + Team)
  const mongoose = require("mongoose");
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Deal.deleteMany({ teamId }, { session });
      await Team.findByIdAndDelete(teamId, { session });
    });
  } finally {
    session.endSession();
  }
};

const inviteMember = async (teamId, ownerId, handle) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    owner: ownerId,
  });

  if (!team) {
    throw AppError.forbidden("팀원 초대 권한이 없습니다.");
  }

  const loweredHandle = (handle || "").toLowerCase().trim();
  const user = await User.findOne({ handle: loweredHandle });

  if (!user) {
    throw AppError.notFound("해당 ID의 사용자를 찾을 수 없습니다.");
  }

  const alreadyMember = team.members.some(
    (member) => member.user.toString() === user._id.toString()
  );

  if (alreadyMember) {
    throw AppError.badRequest("이미 팀원으로 등록된 사용자입니다.");
  }

  const alreadyInvited = team.pendingInvites.some(
    (invite) => invite.user.toString() === user._id.toString()
  );

  if (alreadyInvited) {
    throw AppError.badRequest("이미 초대한 사용자입니다.");
  }

  team.pendingInvites.push({
    user: user._id,
    invitedBy: ownerId,
    invitedAt: new Date(),
  });
  await team.save();

  // 푸시 알림 발송 (실패해도 invite는 성공 — fire-and-forget)
  try {
    const inviter = await User.findById(ownerId).select("name nickname");
    const displayMode = team.displayMode || "nickname";
    const inviterName =
      displayMode === "realName"
        ? inviter?.name || inviter?.nickname || "누군가"
        : inviter?.nickname || inviter?.name || "누군가";

    pushService
      .sendPushToUser(user._id, {
        title: `${team.name} 모임 초대`,
        body: `${inviterName}님이 초대했어요`,
        data: {
          type: "invite",
          notificationId: String(team._id),
        },
      })
      .catch((err) => {
        console.warn("Push send failed (invite)", err);
      });
  } catch (e) {
    console.warn("Push setup failed (invite)", e);
  }

  return team;
};

const removeMember = async (teamId, ownerId, targetUserId) => {
  if (!isValidObjectId(teamId) || !isValidObjectId(targetUserId)) {
    throw AppError.badRequest("올바른 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    owner: ownerId,
  });

  if (!team) {
    throw AppError.forbidden("팀원 방출 권한이 없습니다.");
  }

  if (team.owner.toString() === targetUserId) {
    throw AppError.badRequest("owner는 방출할 수 없습니다.");
  }

  const memberIndex = team.members.findIndex(
    (m) => m.user.toString() === targetUserId
  );

  if (memberIndex === -1) {
    throw AppError.notFound("해당 유저는 팀 멤버가 아닙니다.");
  }

  team.members.splice(memberIndex, 1);
  await team.save();
};

const transferOwner = async (teamId, ownerId, targetUserId) => {
  if (!isValidObjectId(teamId) || !isValidObjectId(targetUserId)) {
    throw AppError.badRequest("올바른 ID가 아닙니다.");
  }

  const team = await Team.findOne({ _id: teamId, owner: ownerId });
  if (!team) {
    throw AppError.forbidden("권한 위임 권한이 없습니다.");
  }
  if (team.owner.toString() === targetUserId) {
    throw AppError.badRequest("이미 방장입니다.");
  }

  const target = team.members.find((m) => m.user.toString() === targetUserId);
  if (!target) {
    throw AppError.notFound("해당 유저는 팀 멤버가 아닙니다.");
  }

  // 소유권 이전 + members 역할 갱신
  team.owner = targetUserId;
  team.members.forEach((m) => {
    if (m.user.toString() === targetUserId) m.role = "owner";
    else if (m.user.toString() === ownerId) m.role = "member";
  });
  await team.save();
  return team;
};

const generateInviteToken = async (teamId, ownerId) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({ _id: teamId, owner: ownerId });
  if (!team) {
    throw AppError.forbidden("초대 링크 생성 권한이 없습니다.");
  }

  // 기존 토큰이 유효하면 재사용
  if (team.inviteToken && team.inviteTokenExpiry && team.inviteTokenExpiry > new Date()) {
    return { token: team.inviteToken, expiry: team.inviteTokenExpiry };
  }

  // 새 토큰 생성 (10자 랜덤 base32, 24시간 유효)
  const crypto = require("crypto");
  const token = crypto
    .randomBytes(8)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .substring(0, 10)
    .toUpperCase();
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  team.inviteToken = token;
  team.inviteTokenExpiry = expiry;
  await team.save();

  return { token, expiry };
};

const joinByToken = async (token, userId) => {
  const team = await Team.findOne({
    inviteToken: token,
    inviteTokenExpiry: { $gt: new Date() },
  });

  if (!team) {
    throw AppError.notFound("유효하지 않거나 만료된 초대 링크입니다.");
  }

  const alreadyMember = team.members.some(
    (m) => m.user.toString() === userId
  );

  if (alreadyMember) {
    return { team, alreadyMember: true };
  }

  team.members.push({ user: userId, role: "member" });
  await team.save();

  return { team, alreadyMember: false };
};

const leaveTeam = async (teamId, userId) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    "members.user": userId,
  });

  if (!team) {
    throw AppError.notFound("팀을 찾을 수 없거나 멤버가 아닙니다.");
  }

  if (team.owner.toString() === userId) {
    throw AppError.forbidden("owner는 탈퇴할 수 없습니다. 팀을 삭제하거나 소유권을 이전하세요.");
  }

  team.members = team.members.filter(
    (m) => m.user.toString() !== userId
  );
  await team.save();
};

const getPendingInvitations = async (userId) => {
  if (!isValidObjectId(userId)) {
    throw AppError.badRequest("올바른 사용자 ID가 아닙니다.");
  }

  const teams = await Team.find({
    "pendingInvites.user": userId,
  })
    .populate("pendingInvites.invitedBy", "name nickname handle email")
    .lean();

  const invitations = teams.flatMap((team) =>
    team.pendingInvites
      .filter((p) => p.user.toString() === userId.toString())
      .map((p) => ({
        teamId: team._id,
        teamName: team.name,
        invitedBy: p.invitedBy,
        invitedAt: p.invitedAt,
      }))
  );

  return invitations;
};

const acceptInvitation = async (teamId, userId) => {
  if (!isValidObjectId(teamId) || !isValidObjectId(userId)) {
    throw AppError.badRequest("올바른 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    "pendingInvites.user": userId,
  });

  if (!team) {
    throw AppError.notFound("초대를 찾을 수 없습니다.");
  }

  team.pendingInvites = team.pendingInvites.filter(
    (p) => p.user.toString() !== userId.toString()
  );

  team.members.push({
    user: userId,
    role: "member",
    joinedAt: new Date(),
  });

  await team.save();
  return team;
};

const rejectInvitation = async (teamId, userId) => {
  if (!isValidObjectId(teamId) || !isValidObjectId(userId)) {
    throw AppError.badRequest("올바른 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    "pendingInvites.user": userId,
  });

  if (!team) {
    throw AppError.notFound("초대를 찾을 수 없습니다.");
  }

  team.pendingInvites = team.pendingInvites.filter(
    (p) => p.user.toString() !== userId.toString()
  );

  await team.save();
  return { success: true };
};

module.exports = {
  createTeam,
  getMyTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
  removeMember,
  transferOwner,
  leaveTeam,
  generateInviteToken,
  joinByToken,
  getPendingInvitations,
  acceptInvitation,
  rejectInvitation,
};
