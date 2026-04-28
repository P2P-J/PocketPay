const providers = require("./providers");
const { issueTokenPair } = require("../../utils/jwt.util");
const { User, WithdrawnOauth } = require("../../models/index");
const AppError = require("../../utils/AppError");

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
    user = await User.create({
      email: profile.email,
      name: profile.name,
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
      provider: "apple",
      providerId: profile.providerId,
    });
  }

  const tokens = issueTokenPair(user);
  return { user, ...tokens };
};

module.exports = { loginOauth, loginAppleNative };
