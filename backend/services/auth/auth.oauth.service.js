const providers = require("./providers");
const { User } = require("../../models");
const { issueToken } = require("./auth.common");

const oauthLogin = async ({ provider, accessToken }) => {
  const providerFn = providers[provider];
  if (!providerFn) throw new Error("Unsupported provider");

  const profile = await providerFn(accessToken);

  let user = await User.findOne({
    provider: profile.provider,
    providerId: profile.providerId,
  });

  if (!user) {
    user = await User.create(profile);
  }

  const token = issueToken(user);
  return { user, token };
};

module.exports = { oauthLogin };