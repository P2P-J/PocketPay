// 백엔드 API 서버 URL
// - 개발: 로컬 + ngrok 또는 Railway production 사용
// - 프로덕션: Railway
const RAILWAY_URL = "https://pocketpay-backend-production.up.railway.app";

function getApiBaseUrl(): string {
  // 개발 빌드에서도 Railway 백엔드 사용 (ngrok URL 스위칭 불필요)
  return RAILWAY_URL;
}

export const API_BASE_URL = getApiBaseUrl();
export const REQUEST_TIMEOUT = 30000;
