const providers = require('./providers');
const { issueToken } = require("../../utils/jwt.util");
const { User } = require("../../models/index");

const loginOauth = async (providerName, code, state) => {
  const provider = providers[providerName];
  if (!provider) throw new Error('INVALID_PROVIDER');

  // provider별 access token 발급
  const accessToken = provider.getAccessToken.length === 2 // naver는 인자가 2개
    ? await provider.getAccessToken(code, state)   // naver
    : await provider.getAccessToken(code);         // google

  const profile = await provider.getUserProfile(accessToken);

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
    });
  }

  const token = issueToken(user);

  return { user, token };
};

module.exports = { loginOauth };