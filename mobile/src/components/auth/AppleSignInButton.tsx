// mobile/src/components/auth/AppleSignInButton.tsx
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { useEffect, useState } from "react";
import { oauthApi } from "@/api/oauth";
import { useAuthStore } from "@/store/authStore";
import { showToast } from "@/components/ui/Toast";

interface Props {
  onSuccess?: () => void;
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

      const fullName =
        [credential.fullName?.familyName, credential.fullName?.givenName]
          .filter(Boolean)
          .join(" ") || undefined;

      const { accessToken, refreshToken } = await oauthApi.loginApple({
        identityToken: credential.identityToken,
        name: fullName,
        nonce: hashedNonce,
      });

      await loginWithOAuth(accessToken, refreshToken);
      onSuccess?.();
    } catch (err: any) {
      if (err?.code === "ERR_REQUEST_CANCELED") return; // 사용자 취소
      showToast(
        "error",
        "Apple 로그인 실패",
        err?.message || "다시 시도해주세요"
      );
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={
        AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
      }
      buttonStyle={
        AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={12}
      style={{ width: "100%", height: 52 }}
      onPress={handlePress}
    />
  );
}
