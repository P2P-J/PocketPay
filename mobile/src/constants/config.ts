// 개발 환경: ngrok으로 백엔드 HTTPS 터널링
// 터미널에서 `npx ngrok http 3000` 실행 후 URL 입력
// 프로덕션: 실제 서버 URL로 변경
const DEV_API_URL = "https://marielle-superangelic-nerissa.ngrok-free.dev";

function getApiBaseUrl(): string {
  if (__DEV__) {
    return DEV_API_URL;
  }
  return "https://api.pocketpay.app";
}

export const API_BASE_URL = getApiBaseUrl();
export const REQUEST_TIMEOUT = 30000;
