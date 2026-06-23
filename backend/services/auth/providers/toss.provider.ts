const axios = require("axios");
const https = require("https");
const AppError = require("../../../utils/AppError");

const TOSS_API_BASE = process.env.TOSS_API_BASE || "https://apps-in-toss-api.toss.im";

// 앱인토스 API 공통 응답 언래핑: { resultType, success | error }
const unwrap = (data: any) => {
  if (data?.resultType === "FAIL") {
    const reason = data?.error?.reason || data?.error?.errorCode || "알 수 없는 오류";
    throw AppError.internal(`토스 API 오류: ${reason}`);
  }
  return data?.success ?? data;
};

// PEM 문자열(env)에서 \n 이스케이프를 실제 개행으로 복원 (Railway 등에서 한 줄 저장 대비)
const normalizePem = (pem?: string): string | undefined =>
  pem ? pem.replace(/\\n/g, "\n") : undefined;

// 토큰 발급 API는 mTLS(상호 TLS) 서버간 통신.
// 인증서/키는 콘솔 → mTLS 인증서 → 발급받기로 받은 .pem 파일 내용을 env로 주입.
let httpsAgent: typeof https.Agent | null = null;
const getHttpsAgent = () => {
  if (httpsAgent) return httpsAgent;
  const cert = normalizePem(process.env.TOSS_MTLS_CERT);
  const key = normalizePem(process.env.TOSS_MTLS_KEY);
  if (!cert || !key) {
    throw AppError.internal("토스 로그인 mTLS 인증서(TOSS_MTLS_CERT/KEY)가 설정되지 않았습니다.");
  }
  httpsAgent = new https.Agent({
    cert,
    key,
    ca: normalizePem(process.env.TOSS_MTLS_CA),
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
  return unwrap(data).accessToken;
};

// 토스 accessToken → 사용자 정보 (userKey + 암호화된 PII)
const getUserInfo = async (accessToken: string) => {
  const { data } = await axios.get(
    `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/login-me`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return unwrap(data); // { userKey, scope, name(암호화), ... }
};

module.exports = { getAccessToken, getUserInfo };
