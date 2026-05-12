// mobile/src/components/auth/AppleSignInButton.tsx
import { Platform, Pressable, Text } from "react-native";
import Svg, { Path } from "react-native-svg";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { useEffect, useState } from "react";
import { oauthApi } from "@/api/oauth";
import { useAuthStore } from "@/store/authStore";
import { showToast } from "@/components/ui/Toast";

interface Props {
  onSuccess?: () => void;
}

// Apple 공식 로고 (Apple Identifier Branding Guidelines 준수)
function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

export function AppleSignInButton({ onSuccess }: Props) {
  const [available, setAvailable] = useState(false);
  const loginWithOAuth = useAuthStore((s) => s.loginWithOAuth);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  if (Platform.OS !== "ios" || !available) return null;

  const handlePress = async () => {
    try {
      const rawNonce =
        Crypto.randomUUID?.() ||
        Math.random().toString(36).slice(2) +
          Math.random().toString(36).slice(2);

      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error("Apple identity token 누락");
      }

      // 한국식 이름 합성: 성+이름 (공백 없음). 예: 홍길동
      const fullName = (() => {
        const family = credential.fullName?.familyName?.trim() || "";
        const given = credential.fullName?.givenName?.trim() || "";
        const composed = `${family}${given}`;
        return composed.length > 0 ? composed : undefined;
      })();

      const { accessToken, refreshToken } = await oauthApi.loginApple({
        identityToken: credential.identityToken,
        name: fullName,
        nonce: hashedNonce,
      });

      await loginWithOAuth(accessToken, refreshToken);
      onSuccess?.();
    } catch (err: any) {
      if (err?.code === "ERR_REQUEST_CANCELED") return; // 사용자 취소
      if (__DEV__) console.error("[Apple Sign-In] failed:", err);
      showToast(
        "error",
        "Apple 로그인 실패",
        "잠시 후 다시 시도해주세요"
      );
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{
        backgroundColor: "#000000",
        borderRadius: 12,
        height: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <AppleIcon />
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "600",
        }}
      >
        Apple로 시작하기
      </Text>
    </Pressable>
  );
}
