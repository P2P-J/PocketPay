const axios = require("axios");
const https = require("https");
const AppError = require("../../../utils/AppError");

const TOSS_API_BASE = process.env.TOSS_API_BASE || "https://apps-in-toss-api.toss.im";

// 토큰 발급 API는 mTLS(상호 TLS) 서버간 통신.
// 인증서/키는 토스에서 발급받아 env(PEM 문자열)로 주입한다.
// ※ 인증서 발급 절차/형식은 토스 확정값으로 검증 필요 (문서 미명시).
let httpsAgent: typeof https.Agent | null = null;
const getHttpsAgent = () => {
  if (httpsAgent) return httpsAgent;
  const cert = process.env.TOSS_MTLS_CERT;
  const key = process.env.TOSS_MTLS_KEY;
  if (!cert || !key) {
    throw AppError.internal("토스 로그인 mTLS 인증서(TOSS_MTLS_CERT/KEY)가 설정되지 않았습니다.");
  }
  httpsAgent = new https.Agent({
    cert,
    key,
    ca: process.env.TOSS_MTLS_CA || undefined,
    passphrase: process.env.TOSS_MTLS_PASSPHRASE || undefined,
  });
  return httpsAgent;
};

// 인가 코드(appLogin) → 토스 accessToken (mTLS)
const getAccessToken = async (authorizationCode: string, referrer: string): Promise<string> => {
  const { data } = await axios.post(
    `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`,
    { authorizationCode, referrer },
    { headers: { "Content-Type": "application/json" }, httpsAgent: getHttpsAgent() }
  );
  return data.accessToken;
};

// 토스 accessToken → 사용자 정보 (userKey + 암호화된 PII)
const getUserInfo = async (accessToken: string) => {
  const { data } = await axios.get(
    `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/login-me`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return data; // { userKey, scope, name(암호화), phone(암호화), ... }
};

module.exports = { getAccessToken, getUserInfo };
