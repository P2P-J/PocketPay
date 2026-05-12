import { apiClient } from "./client";

export const oauthApi = {
  /**
   * Apple Native Sign-In
   * @param identityToken iOS expo-apple-authentication에서 받은 ID token
   * @param name 최초 로그인 시에만 fullName 객체로부터 합성한 이름
   * @param nonce signInAsync에 전달한 hashed nonce
   */
  loginApple: (data: {
    identityToken: string;
    name?: string;
    nonce: string;
  }) =>
    apiClient.post("/auth/login/oauth/apple/native", data) as Promise<{
      accessToken: string;
      refreshToken: string;
    }>,

  /**
   * Deep link 콜백에서 받은 code를 verifier와 함께 보내 토큰 받기 (PKCE-style 1회용 교환)
   */
  exchange: (data: { code: string; verifier: string }) =>
    apiClient.post("/auth/oauth/exchange", data) as Promise<{
      accessToken: string;
      refreshToken: string;
    }>,
};
