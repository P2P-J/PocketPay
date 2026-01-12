const axios = require('axios');
const qs = require('querystring');

// 구글 OAuth 인증 URL 생성
const getAuthUrl = ({ forceConsent = false, state } = {}) => {
    const params = {
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: "code", // 보안상 access token을 브라우저로 직접 보내면 위험
        scope: "openid email profile", // 구글 사용자 정보 접근 권한
        access_type: "offline",              // refresh_token 받기 위해 필요
        include_granted_scopes: "true",  // 이미 허용한 scope이면 다시 허용하는 화면 안 보이게
        prompt: forceConsent ? "select_account consent" : "select_account", // forceConsent면 동의화면까지 강제로 보여주기
    };

    if (state) params.state = state;

    return `https://accounts.google.com/o/oauth2/v2/auth?${qs.stringify(params)}`;
}

// 구글 OAuth access token 발급
const getAccessToken = async (code) => {
    const { data } = await axios.post(
        'https://oauth2.googleapis.com/token',
        qs.stringify({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
    };
};

// 구글 사용자 프로필 정보 가져오기
const getUserProfile = async (accessToken) => {
    const { data } = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return {
        provider: 'google',
        providerId: data.id,
        email: data.email,
        name: data.name,
    };
};

// 구글 OAuth 연동 해제(revoke)
const revokeToken = async (token) => {
    await axios.post(
        "https://oauth2.googleapis.com/revoke",
        qs.stringify({ token }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
};

module.exports = {
    getAuthUrl,
    getAccessToken,
    getUserProfile,
    revokeToken,
};