import { useState } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/store/authStore";
import { ScreenContainer } from "@/components/layout/ScreenContainer";

export default function SignupScreen() {
  const router = useRouter();
  const signup = useAuthStore((s) => s.signup);
  const loading = useAuthStore((s) => s.loading);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    const trimmedName = name.trim();

    // 닉네임: 2~20자, 한글/영문/숫자만
    if (!trimmedName) e.name = "닉네임을 입력해주세요";
    else if (trimmedName.length < 2 || trimmedName.length > 20)
      e.name = "닉네임은 2~20자 사이여야 합니다";
    else if (!/^[가-힣a-zA-Z0-9]+$/.test(trimmedName))
      e.name = "닉네임은 한글, 영문, 숫자만 사용 가능합니다";

    // 이메일
    if (!email) e.email = "이메일을 입력해주세요";
    else if (!/\S+@\S+\.\S+/.test(email))
      e.email = "올바른 이메일 형식이 아닙니다";

    // 비밀번호: 8~20자
    if (!password) e.password = "비밀번호를 입력해주세요";
    else if (password.length < 8 || password.length > 20)
      e.password = "비밀번호는 8~20자 사이여야 합니다";

    // 비밀번호 확인
    if (!confirmPassword) e.confirmPassword = "비밀번호 확인을 입력해주세요";
    else if (password !== confirmPassword)
      e.confirmPassword = "비밀번호가 일치하지 않습니다";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // 입력 시 해당 필드 에러 즉시 클리어
  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSignup = async () => {
    if (!validate()) return;
    try {
      await signup(name.trim(), email.trim(), password);
      showToast("success", "가입 완료", "로그인해주세요!");
      router.replace("/(auth)/login");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "회원가입에 실패했습니다.";
      // 백엔드 에러 메시지에 따라 필드별 에러 표시
      if (
        message.includes("이메일") ||
        message.includes("email") ||
        message.includes("이미 존재")
      )
        setErrors((prev) => ({ ...prev, email: message }));
      else if (message.includes("비밀번호") || message.includes("password"))
        setErrors((prev) => ({ ...prev, password: message }));
      else showToast("error", "가입 실패", message);
    }
  };

  return (
    <ScreenContainer scrollable={false} withTabBar={false}>
      <Header title="회원가입" showBack />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3 mt-6 mb-6">
          <Input
            label="닉네임"
            placeholder="한글, 영문, 숫자 (2~20자)"
            value={name}
            onChangeText={(v) => {
              setName(v);
              clearError("name");
            }}
            error={errors.name}
          />
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
            placeholder="8~20자"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              clearError("password");
            }}
            secureTextEntry
            error={errors.password}
          />
          <Input
            label="비밀번호 확인"
            placeholder="비밀번호를 다시 입력해주세요"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              clearError("confirmPassword");
            }}
            secureTextEntry
            error={errors.confirmPassword}
          />
        </View>

        <Button
          label="가입하기"
          variant="primary"
          size="full"
          onPress={handleSignup}
          loading={loading}
        />
      </ScrollView>
    </ScreenContainer>
  );
}
