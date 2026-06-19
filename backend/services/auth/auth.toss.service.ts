const tossProvider = require("./providers/toss.provider");
const { decryptTossPII } = require("../../utils/tossCrypto.util");
const { issueTokenPair } = require("../../utils/jwt.util");
const { User } = require("../../models/index");
const AppError = require("../../utils/AppError");

// 토스 로그인: appLogin 인가코드 → 토스 토큰 → userKey/PII → 자체 User 매핑 → 자체 JWT 발급.
// 회원 전략: 독립 (토스 사용자는 provider:"toss" + providerId:userKey 로 별도 User).
const loginToss = async (authorizationCode: string, referrer: string) => {
  const tossAccessToken = await tossProvider.getAccessToken(authorizationCode, referrer);
  const info = await tossProvider.getUserInfo(tossAccessToken);

  const userKey = info?.userKey;
  if (userKey === undefined || userKey === null) {
    throw AppError.internal("토스 사용자 식별자(userKey)를 가져오지 못했습니다.");
  }
  const providerId = String(userKey);

  // 이름 복호화 (scope=USER_NAME). 키 미설정/복호화 실패 시 기본값으로 로그인은 진행.
  let name = "토스 사용자";
  if (info.name) {
    try {
      name = decryptTossPII(info.name);
    } catch {
      // 비치명적 — 표시용 이름이므로 기본값 유지
    }
  }

  let user = await User.findOne({ provider: "toss", providerId });
  if (!user) {
    user = await User.create({
      // email은 모델상 required → userKey 기반 합성 이메일 (독립 회원 전략)
      email: `toss_${providerId}@toss.local`,
      name,
      nickname: name,
      provider: "toss",
      providerId,
    });
  }

  const tokens = issueTokenPair(user);
  return { user, ...tokens };
};

module.exports = { loginToss };
