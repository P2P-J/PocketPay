const axios = require("axios");
const qs = require("querystring");

// 카카오 OAuth 인증 URL 생성
const getAuthUrl = ({ forceConsent = false, state } = {}) => {
  const params = {
    client_id: process.env.KAKAO_CLIENT_ID,
    redirect_uri: process.env.KAKAO_REDIRECT_URI,
    response_type: "code",
    scope: "profile_nickname",
  };

  if (forceConsent) params.prompt = "login";
  if (state) params.state = state;

  return `https://kauth.kakao.com/oauth/authorize?${qs.stringify(params)}`;
};

// 카카오 OAuth access token 발급
const getAccessToken = async (code) => {
  const { data } = await axios.post(
    "https://kauth.kakao.com/oauth/token",
    qs.stringify({
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_CLIENT_ID,
      client_secret: process.env.KAKAO_CLIENT_SECRET,
      redirect_uri: process.env.KAKAO_REDIRECT_URI,
      code,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
};

// 카카오 사용자 프로필 정보 가져오기
const getUserProfile = async (accessToken) => {
  const { data } = await axios.get("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return {
    provider: "kakao",
    providerId: String(data.id),
    email: data.kakao_account?.email || `kakao_${data.id}@noreply.pocketpay.app`,
    name: data.kakao_account?.profile?.nickname || `카카오유저${data.id}`,
  };
};

// 카카오 OAuth 연동 해제
const revokeToken = async (accessToken) => {
  await axios.post("https://kapi.kakao.com/v1/user/unlink", null, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
};

module.exports = {
  getAuthUrl,
  getAccessToken,
  getUserProfile,
  revokeToken,
};
