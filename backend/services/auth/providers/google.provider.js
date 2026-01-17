const axios = require('axios');
const qs = require('querystring');

const getAuthUrl = ({ forceConsent = false, state } = {}) => {
    const params = {
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: "code", // access token을 브라우저로 직접 보내면 보안 위험
        scope: "openid email profile",
        access_type: "offline", // refresh_token 받기
        include_granted_scopes: "true",  // 이미 허용한 scope 다시 허용 안 보이게
        prompt: forceConsent ? "select_account consent" : "select_account", // forceConsent면 동의화면 강제
    };

    if (state) params.state = state;

    return `https://accounts.google.com/o/oauth2/v2/auth?${qs.stringify(params)}`;
}

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