const axios = require('axios');
const qs = require('querystring');

// 네이버 OAuth 인증 URL 생성
const getAuthUrl = () => {
    const params = qs.stringify({
        response_type: 'code',
        client_id: process.env.NAVER_CLIENT_ID,
        redirect_uri: process.env.NAVER_REDIRECT_URI,
        state: process.env.NAVER_STATE,
    });

    return `https://nid.naver.com/oauth2.0/authorize?${params}`;
};

// 네이버 OAuth access token 발급
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

    return data.access_token;
};

// 네이버 사용자 프로필 정보 가져오기
const getUserProfile = async (accessToken) => {
    const { data } = await axios.get(
        'https://openapi.naver.com/v1/nid/me',
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // 구글과 달리 네이버는 json 응답 안 response 안에 사용자 정보가 있음
    const profile = data.response;

    return {
        provider: 'naver',
        providerId: profile.id,
        email: profile.email,
        name: profile.name,
    };
};

module.exports = {
    getAuthUrl,
    getAccessToken,
    getUserProfile,
};