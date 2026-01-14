const { User, Team, WithdrawnOauth } = require("../../models/index");
const providers = require("../auth/providers");
const { comparePassword, hashPassword } = require("../../utils/bcrypt.util");
const { default: mongoose } = require("mongoose");

// 계정 정보 조회 GET /account/me
const getMyAccount = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("사용자를 찾을 수 없습니다.");
  }

  return user;
};

// 계정 탈퇴 DELETE /account/me
const deleteMyAccount = async (userId) => {
  const user = await User.findById(userId).select(
    "+oauthTokens.naver.refreshToken +oauthTokens.google.refreshToken"
  );

  if (!user) {
    throw new Error("사용자를 찾을 수 없습니다.");
  }

  // 내가 소유한 팀들을 찾음 (같이 삭제하기 위함)
  const ownedTeams = await Team.find({ owner: userId });

  const provider = user.provider;
  const providerId = user.providerId;

  try {
    switch (provider) {
      case "naver":
      case "google": {
        const userRevokeToken = user.oauthTokens?.[provider]?.refresh;
        const revokeFunc = providers?.[provider]?.revokeToken;

        await revokeFunc(userRevokeToken);
        break;
      }

      case "local":
        // 로컬 회원가입 사용자는 별도 처리 없음
        break;

      default:
        console.warn("UNKNOWN_PROVIDER:", provider);
        break;
    }
  } catch (e) {
    // revoke 실패해도 탈퇴는 진행됨
    // 외부 장애로 revoke 실패했을 때만 동의 페이지가 안 뜰 수도 있음
    console.error(
      "OAUTH_REVOKE_FAILED:",
      provider,
      e.response?.data || e.message
    );
  }

  // mongoose transaction으로 팀에서 사용자 제거 + 탈퇴 기록 남기기 + 사용자 삭제 동시 처리
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const uid = new mongoose.Types.ObjectId(userId);

      await Team.updateMany(
        { "members.user": uid },
        { $pull: { members: { user: uid } } },
        { session }
      );

      // 소유한 팀 삭제
      if (ownedTeams.length > 0) {
        const teamIds = ownedTeams.map((t) => t._id);
        await Team.deleteMany({ _id: { $in: teamIds } }, { session });
      }

      // google/oauth의 경우 탈퇴 기록 남기기
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

// 비밀번호 변경 PUT /account/me/password
const changeMyPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new Error("사용자를 찾을 수 없습니다.");
  }
  if (user.provider !== "local") {
    throw new Error("소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.");
  }

  const match = await comparePassword(currentPassword, user.password);
  if (!match) {
    throw new Error("현재 비밀번호가 올바르지 않습니다.");
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
