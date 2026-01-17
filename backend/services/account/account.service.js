const { User, Team, WithdrawnOauth } = require("../../models/index");
const providers = require("../auth/providers");
const { comparePassword, hashPassword } = require("../../utils/bcrypt.util");
const { default: mongoose } = require("mongoose");
const AppError = require("../../utils/AppError");

const getMyAccount = async (userId) => {
  const user = await User.findById(userId);

  if (!user) { throw AppError.notFound("사용자를 찾을 수 없습니다."); }

  return user;
};

const deleteMyAccount = async (userId) => {
  const user = await User.findById(userId).select(
    "+oauthTokens.naver.refreshToken +oauthTokens.google.refreshToken"
  );

  if (!user) { throw AppError.notFound("사용자를 찾을 수 없습니다."); }

  // 소유한 팀들 조회(삭제 위해)
  const ownedTeams = await Team.find({ owner: userId });

  const provider = user.provider;
  const providerId = user.providerId;

  try {
    switch (provider) {
      case "naver":
      case "google": {
        const userRevokeToken = user.oauthTokens?.[provider]?.refreshToken;
        const revokeFunc = providers?.[provider]?.revokeToken;

        await revokeFunc(userRevokeToken);
        break;
      }

      case "local":
        break;

      default:
        console.warn("UNKNOWN_PROVIDER:", provider);
        break;
    }
  } catch (e) {
    // 외부 장애로 revoke 실패했을 때 동의 페이지가 안 뜰 수도 있음
    console.error("OAUTH_REVOKE_FAILED:", provider, e.response?.data || e.message);
    throw AppError.internal("서버 에러가 발생했습니다.");
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
        await Team.deleteMany({ _id: { $in: teamIds } }, { session });
      }

      // google/oauth 탈퇴 기록 남기기
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

  if (!user) { throw AppError.notFound("사용자를 찾을 수 없습니다."); }

  if (user.provider !== "local") {
    throw AppError.badRequest("소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.");
  }

  const match = await comparePassword(currentPassword, user.password);
  if (!match) {
    throw AppError.badRequest("현재 비밀번호가 올바르지 않습니다.");
  }

  user.password = await hashPassword(newPassword);
  await user.save();
  return;
};

module.exports = {
  getMyAccount,
  deleteMyAccount,
  changeMyPassword,
};
