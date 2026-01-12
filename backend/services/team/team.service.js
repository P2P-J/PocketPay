const mongoose = require("mongoose");
const { Team, User, Deal } = require("../../models/index");
const AppError = require("../../utils/AppError");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

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
  return teams;
};

const getTeam = async (teamId, userId) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    "members.user": userId,
  });

  if (!team) {
    throw AppError.notFound("팀을 찾을 수 없습니다.");
  }

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

  Object.assign(team, data);
  await team.save();
  return team;
};

// 트랜잭션 참고!
const deleteTeam = async (teamId, userId) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  // 1. 먼저 권한 확인 (삭제 전에 체크)
  const team = await Team.findOne({
    _id: teamId,
    owner: userId,
  });

  if (!team) {
    throw AppError.forbidden("팀 삭제 권한이 없습니다.");
  }

  // 2. 연관 데이터(Deal) 먼저 삭제
  await Deal.deleteMany({ teamId: teamId });

  // 3. 팀 삭제
  await Team.findByIdAndDelete(teamId);
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

    const user = await User.findOne({ email, provider: { $in: ["local", "google", "naver"] } });

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

module.exports = {
  createTeam,
  getMyTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
};