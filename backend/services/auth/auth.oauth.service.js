const providers = require('./providers');
const { issueToken } = require("../../utils/jwt.util");
const { User, WithdrawnOauth } = require("../../models/index");
const AppError = require("../../utils/AppError");

const loginOauth = async (providerName, code, state) => {
  const provider = providers[providerName];
  if (!provider) {
    throw AppError.badRequest("제공되지 않는 provider입니다.");
  }
  // provider별 accessToken, refreshToken 발급
  const tokenObj = provider.getAccessToken.length === 2 // naver는 인자가 2개
    ? await provider.getAccessToken(code, state)   // naver
    : await provider.getAccessToken(code);         // google

  const { accessToken, refreshToken } = tokenObj;

  const profile = await provider.getUserProfile(accessToken);

  // 탈퇴 이력 확인용
  const isRejoin = state === "rejoin";

  // 구글 oauth 탈퇴 이력 확인
  if (profile.provider === "google") {
    const withdrawn = await WithdrawnOauth.findOne({
      provider: "google",
      providerId: profile.providerId,
    });

    if (withdrawn) {
      if (!isRejoin) { // withdrawn이 있는데 rejoin이 아니면 에러
        const err = new Error("REJOIN_REQUIRED");
        err.code = "REJOIN_REQUIRED";
        throw err;
      }
      // rejoin이면 탈퇴 이력 삭제
      await WithdrawnOauth.deleteOne({
        provider: "google",
        providerId: profile.providerId
      });
    }
  }

  let user = await User.findOne({
    provider: profile.provider,
    providerId: profile.providerId,
  });

  if (!user) {
    user = await User.create({
      email: profile.email,
      name: profile.name,
      provider: profile.provider,
      providerId: profile.providerId,
      oauthTokens: { [profile.provider]: { refreshToken } },
    });
  } else {
    // refreshToken이 있으면 갱신 저장
    if (refreshToken) {
      user.oauthTokens = user.oauthTokens || {};
      user.oauthTokens[profile.provider] = user.oauthTokens[profile.provider] || {};
      user.oauthTokens[profile.provider].refreshToken = refreshToken;
      await user.save();
    }
  }

  const token = issueToken(user);
  return { user, token };
};

module.exports = { loginOauth };