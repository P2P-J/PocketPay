const { Team, User, Deal } = require("../../models/index");
const AppError = require("../../utils/AppError");
const { isValidObjectId } = require("../../utils/validation");

const createTeam = async (userId, { name, description }) => {
  const team = await Team.create({
    name,
    description,
    owner: userId,
    members: [{ user: userId, role: "owner" }],
  });
  return team;
};

const getMyTeams = async (userId) => {
  const teams = await Team.find({ "members.user": userId });

  // 각 팀의 최신 거래 날짜를 가져와서 정렬
  const teamsWithLatest = await Promise.all(
    teams.map(async (team) => {
      const latestDeal = await Deal.findOne({ teamId: team._id })
        .sort({ createdAt: -1 })
        .select("createdAt")
        .lean();
      return {
        team,
        latestActivity: latestDeal?.createdAt || team.createdAt,
      };
    })
  );

  teamsWithLatest.sort((a, b) =>
    new Date(b.latestActivity).getTime() - new Date(a.latestActivity).getTime()
  );

  return teamsWithLatest.map((t) => t.team);
};

const getTeam = async (teamId, userId) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    "members.user": userId,
  }).populate("members.user", "name email");

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
  const ALLOWED_FIELDS = ["name", "description"];
  for (const key of ALLOWED_FIELDS) {
    if (data[key] !== undefined) team[key] = data[key];
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

const inviteMember = async (teamId, ownerId, email) => {
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

    const user = await User.findOne({ email, provider: { $in: ["local", "google", "naver", "kakao"] } });

  if (!user) {
    throw AppError.notFound("초대할 사용자를 찾을 수 없습니다.");
  }

  const alreadyMember = team.members.some(
    (member) => member.user.toString() === user._id.toString()
  );

  if (alreadyMember) {
    throw AppError.badRequest("이미 팀원으로 등록된 사용자입니다.");
  }

  team.members.push({ user: user._id, role: "member" });
  await team.save();
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

module.exports = {
  createTeam,
  getMyTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
  removeMember,
  leaveTeam,
  generateInviteToken,
  joinByToken,
};
