const providers = require("./providers");
const { issueTokenPair } = require("../../utils/jwt.util");
const { User, WithdrawnOauth } = require("../../models/index");
const AppError = require("../../utils/AppError");
const { validateHandleFormat } = require("../../utils/handle.util");

const loginOauth = async (providerName, code, state) => {
  const provider = providers[providerName];
  if (!provider) throw AppError.badRequest("지원하지 않는 OAuth 제공자입니다.");

  const tokenObj =
    provider.getAccessToken.length === 2
      ? await provider.getAccessToken(code, state)
      : await provider.getAccessToken(code);

  const { accessToken, refreshToken } = tokenObj;
  const profile = await provider.getUserProfile(accessToken);

  const isRejoin = state === "rejoin";

  if (profile.provider === "google") {
    const withdrawn = await WithdrawnOauth.findOne({
      provider: "google",
      providerId: profile.providerId,
    });

    if (withdrawn && !isRejoin) {
      throw AppError.forbidden("REJOIN_REQUIRED");
    }

    if (withdrawn && isRejoin) {
      await WithdrawnOauth.deleteOne({
        provider: "google",
        providerId: profile.providerId,
      });
    }
  }

  let user = await User.findOne({
    provider: profile.provider,
    providerId: profile.providerId,
  });

  if (!user) {
    // 신규 OAuth 가입자: nickname을 임시로 name과 동일하게 저장.
    // handle은 null 허용 (sparse index) — setup-profile에서 채움.
    user = await User.create({
      email: profile.email,
      name: profile.name,
      nickname: profile.name,
      provider: profile.provider,
      providerId: profile.providerId,
      oauthTokens: { [profile.provider]: { refreshToken } },
    });
  } else if (refreshToken) {
    user.oauthTokens = user.oauthTokens || {};
    user.oauthTokens[profile.provider] =
      user.oauthTokens[profile.provider] || {};
    user.oauthTokens[profile.provider].refreshToken = refreshToken;
    await user.save();
  }

  const tokens = issueTokenPair(user);
  return { user, ...tokens };
};

const loginAppleNative = async (identityToken, name, nonce) => {
  const claims = await providers.apple.verifyIdentityToken(identityToken, nonce);
  const profile = providers.apple.getUserProfile(claims, name);

  let user = await User.findOne({
    provider: "apple",
    providerId: profile.providerId,
  });

  if (!user) {
    user = await User.create({
      email: profile.email,
      name: profile.name,
      nickname: profile.name,
      provider: "apple",
      providerId: profile.providerId,
    });
  }

  const tokens = issueTokenPair(user);
  return { user, ...tokens };
};

const completeOAuthProfile = async (userId, { name, nickname, handle }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound("사용자를 찾을 수 없습니다.");
  }
  if (user.handle) {
    throw AppError.badRequest("이미 프로필이 설정되었습니다.");
  }

  const loweredHandle = (handle || "").toLowerCase().trim();
  if (!validateHandleFormat(loweredHandle)) {
    throw AppError.badRequest("올바르지 않은 ID 형식입니다.");
  }

  const handleExists = await User.findOne({ handle: loweredHandle });
  if (handleExists) {
    throw AppError.badRequest("이미 사용 중인 ID입니다.");
  }

  if (name) user.name = String(name).trim();
  if (nickname) user.nickname = String(nickname).trim();
  user.handle = loweredHandle;
  user.handleChangedAt = new Date();
  await user.save();

  return user;
};

module.exports = { loginOauth, loginAppleNative, completeOAuthProfile };
