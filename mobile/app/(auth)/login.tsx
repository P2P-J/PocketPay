import { useState } from "react";
import {
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/store/authStore";
import { API_BASE_URL } from "@/constants/config";

// 카카오 말풍선 심볼
function KakaoIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path
        d="M10 2C5.029 2 1 5.216 1 9.15c0 2.538 1.69 4.77 4.232 6.037l-1.07 3.927c-.094.345.302.618.597.411l4.688-3.124c.18.012.363.02.553.02 4.971 0 9-3.217 9-7.15C19 5.215 14.971 2 10 2z"
        fill="#000000"
      />
    </Svg>
  );
}

// 네이버 N 로고
function NaverIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Path
        d="M10.866 8.52L4.966 0H0v16h5.134V7.48L11.034 16H16V0h-5.134v8.52z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

// 구글 G 로고
function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107" />
      <Path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00" />
      <Path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50" />
      <Path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2" />
    </Svg>
  );
}

// 소셜 로그인 버튼 컴포넌트
function SocialLoginButton({
  icon,
  label,
  bgColor,
  textColor,
  borderColor,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: bgColor,
        borderWidth: borderColor ? 1 : 0,
        borderColor: borderColor || "transparent",
        borderRadius: 12,
        height: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {icon}
      <Text
        style={{
          color: textColor,
          fontSize: 16,
          fontFamily: "Pretendard-SemiBold",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = "이메일을 입력해주세요";
    else if (!/\S+@\S+\.\S+/.test(email))
      newErrors.email = "올바른 이메일 형식이 아닙니다";
    if (!password) newErrors.password = "비밀번호를 입력해주세요";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field: "email" | "password") => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "로그인에 실패했습니다.";
      if (message.includes("이메일") || message.includes("사용자"))
        setErrors({ email: message });
      else if (message.includes("비밀번호"))
        setErrors({ password: message });
      else showToast("error", "로그인 실패", message);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    // state=mobile로 백엔드에 모바일 요청임을 알림
    // callback에서 딥링크(pocketpay://auth/callback)로 토큰 전달
    const url = `${API_BASE_URL}/auth/login/oauth/${provider}?state=mobile`;
    Linking.openURL(url);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="flex-1 justify-center px-screen-x"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          {/* 로고 */}
          <View className="items-center mb-10">
            <Image
              source={require("../../assets/icon.png")}
              className="w-20 h-20 rounded-2xl mb-4"
              resizeMode="contain"
            />
            <Text className="text-title font-pretendard-bold text-text-primary">
              작은 모임
            </Text>
            <Text className="text-sub text-text-secondary mt-1">
              모임 회계, 이제 간편하게.
            </Text>
          </View>

          {/* 소셜 로그인 버튼 */}
          <View className="gap-3 mb-6">
            <SocialLoginButton
              icon={<KakaoIcon />}
              label="카카오로 시작하기"
              bgColor="#FEE500"
              textColor="rgba(0,0,0,0.85)"
              onPress={() => handleOAuthLogin("kakao")}
            />
            <SocialLoginButton
              icon={<NaverIcon />}
              label="네이버로 시작하기"
              bgColor="#03C75A"
              textColor="#FFFFFF"
              onPress={() => handleOAuthLogin("naver")}
            />
            <SocialLoginButton
              icon={<GoogleIcon />}
              label="Google로 계속하기"
              bgColor="#FFFFFF"
              textColor="#1F1F1F"
              borderColor="#DADCE0"
              onPress={() => handleOAuthLogin("google")}
            />
          </View>

          {/* 구분선 */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-divider" />
            <Text className="text-caption text-text-disabled mx-4 font-pretendard">
              또는
            </Text>
            <View className="flex-1 h-px bg-divider" />
          </View>

          {showEmailLogin ? (
            <>
              {/* 이메일 로그인 폼 */}
              <View className="gap-3 mb-6">
                <Input
                  label="이메일"
                  placeholder="example@email.com"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    clearError("email");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                />
                <Input
                  label="비밀번호"
                  placeholder="비밀번호를 입력해주세요"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    clearError("password");
                  }}
                  secureTextEntry
                  error={errors.password}
                />
              </View>

              <Button
                label="로그인"
                variant="primary"
                size="full"
                onPress={handleLogin}
                loading={loading}
              />

              <Pressable
                onPress={() => router.push("/(auth)/reset-password")}
                className="mt-3 items-center py-2"
              >
                <Text className="text-sub text-text-disabled font-pretendard">
                  비밀번호를 잊으셨나요?
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/(auth)/terms")}
                className="mt-2 items-center py-3"
              >
                <Text className="text-sub text-text-secondary">
                  계정이 없으신가요?{" "}
                  <Text className="text-brand font-pretendard-semibold">
                    회원가입
                  </Text>
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* 이메일 로그인 / 회원가입 링크 */}
              <Pressable
                onPress={() => setShowEmailLogin(true)}
                className="items-center py-3"
              >
                <Text className="text-sub text-text-secondary font-pretendard">
                  이메일로 로그인
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/(auth)/terms")}
                className="items-center py-2"
              >
                <Text className="text-sub text-text-secondary">
                  계정이 없으신가요?{" "}
                  <Text className="text-brand font-pretendard-semibold">
                    회원가입
                  </Text>
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
