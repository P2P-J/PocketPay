const axios = require('axios');
const qs = require('querystring');

const getAuthUrl = () => {
    const params = qs.stringify({
        response_type: 'code',
        client_id: process.env.NAVER_CLIENT_ID,
        redirect_uri: process.env.NAVER_REDIRECT_URI,
        state: process.env.NAVER_STATE,
    });

    return `https://nid.naver.com/oauth2.0/authorize?${params}`;
};

const getAccessToken = async (code, state) => {
    const { data } = await axios.get(
        'https://nid.naver.com/oauth2.0/token',
        {
            params: {
                grant_type: 'authorization_code',
                client_id: process.env.NAVER_CLIENT_ID,
                client_secret: process.env.NAVER_CLIENT_SECRET,
                code,
                state,
            },
        }
    );

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
    };
};

const getUserProfile = async (accessToken) => {
    const { data } = await axios.get(
        'https://openapi.naver.com/v1/nid/me',
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // 네이버는 사용자 정보 json res 안에 
    const profile = data.response;

    return {
        provider: 'naver',
        providerId: profile.id,
        email: profile.email,
        name: profile.name,
    };
};

const revokeToken = async (refreshToken) => {
    // refresh_token으로 access_token 재발급
    const refreshRes = await axios.get("https://nid.naver.com/oauth2.0/token", {
        params: {
            grant_type: "refresh_token",
            client_id: process.env.NAVER_CLIENT_ID,
            client_secret: process.env.NAVER_CLIENT_SECRET,
            refresh_token: refreshToken,
        },
    });

    const accessToken = refreshRes.data.access_token;

    // Naver oauth 연동 해제
    await axios.get("https://nid.naver.com/oauth2.0/token", {
        params: {
            grant_type: "delete",
            client_id: process.env.NAVER_CLIENT_ID,
            client_secret: process.env.NAVER_CLIENT_SECRET,
            access_token: accessToken,
            service_provider: "NAVER",
        },
    });
};

module.exports = {
    getAuthUrl,
    getAccessToken,
    getUserProfile,
    revokeToken,
};