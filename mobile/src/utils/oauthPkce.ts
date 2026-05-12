import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

// OAuth 시작 시 SecureStore에 보관하는 verifier 키 (deep link 콜백에서 1회 소비)
const VERIFIER_KEY = "oauth_verifier";

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * OAuth 시작 직전 호출. PKCE-style verifier/challenge 생성 + verifier SecureStore 저장.
 * 반환된 challenge를 state로 백엔드에 전달 (state=mobile_<challenge>).
 * 백엔드는 challenge만 보고 토큰을 일회용 code 뒤로 숨겨 deep link 전송.
 */
export async function createOAuthPkce(): Promise<{ challenge: string }> {
  const verifierBytes = await Crypto.getRandomBytesAsync(32);
  const verifier = bytesToHex(verifierBytes);
  const challenge = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  await SecureStore.setItemAsync(VERIFIER_KEY, verifier);
  return { challenge };
}

/**
 * Deep link 콜백에서 1회 소비. 호출 후 verifier는 SecureStore에서 즉시 제거.
 */
export async function consumeOAuthVerifier(): Promise<string | null> {
  const v = await SecureStore.getItemAsync(VERIFIER_KEY);
  if (v) await SecureStore.deleteItemAsync(VERIFIER_KEY);
  return v;
}

/**
 * 에러/취소 등 verifier가 더 이상 필요 없을 때 정리.
 */
export async function clearOAuthVerifier(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(VERIFIER_KEY);
  } catch {
    // 키 없음 등은 무시
  }
}
