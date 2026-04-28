import { useState } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { apiClient } from "@/api/client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";

type Step = "email" | "code" | "password";

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 1단계: 이메일로 인증코드 발송
  const handleSendCode = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("올바른 이메일을 입력해주세요");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/auth/send-code", {
        email: email.trim(),
        purpose: "비밀번호 재설정",
      });
      showToast("success", "인증코드 발송", "이메일을 확인해주세요");
      setStep("code");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "발송에 실패했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 인증코드 확인
  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      setError("6자리 인증코드를 입력해주세요");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/auth/verify-code", {
        email: email.trim(),
        code,
        purpose: "비밀번호 재설정",
      });
      setStep("password");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "인증에 실패했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 3단계: 새 비밀번호 설정
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8 || newPassword.length > 20) {
      setError("비밀번호는 8~20자 사이여야 합니다");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/auth/reset-password", {
        email: email.trim(),
        code,
        newPassword,
      });
      showToast("success", "비밀번호가 재설정되었습니다", "새 비밀번호로 로그인해주세요");
      router.replace("/(auth)/login");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "재설정에 실패했습니다.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable={false} withTabBar={false}>
      <Header title="비밀번호 찾기" showBack />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
      >
        {step === "email" && (
          <View className="mt-6">
            <Input
              label="가입한 이메일"
              placeholder="example@email.com"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={error}
            />
            <Button
              label="인증코드 발송"
              variant="primary"
              size="full"
              onPress={handleSendCode}
              loading={loading}
              className="mt-4"
            />
          </View>
        )}

        {step === "code" && (
          <View className="mt-6">
            <Input
              label="인증코드 (6자리)"
              placeholder="000000"
              value={code}
              onChangeText={(v) => { setCode(v.replace(/[^0-9]/g, "").slice(0, 6)); setError(""); }}
              keyboardType="number-pad"
              error={error}
            />
            <Button
              label="인증코드 확인"
              variant="primary"
              size="full"
              onPress={handleVerifyCode}
              loading={loading}
              className="mt-4"
            />
            <Button
              label="인증코드 재발송"
              variant="ghost"
              size="full"
              onPress={handleSendCode}
              className="mt-2"
            />
          </View>
        )}

        {step === "password" && (
          <View className="mt-6 gap-3">
            <Input
              label="새 비밀번호"
              placeholder="8~20자"
              value={newPassword}
              onChangeText={(v) => { setNewPassword(v); setError(""); }}
              secureTextEntry
              error={error && error.includes("비밀번호") ? error : undefined}
            />
            <Input
              label="새 비밀번호 확인"
              placeholder="새 비밀번호를 다시 입력해주세요"
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setError(""); }}
              secureTextEntry
              error={error && error.includes("일치") ? error : undefined}
            />
            <Button
              label="비밀번호 재설정"
              variant="primary"
              size="full"
              onPress={handleResetPassword}
              loading={loading}
              className="mt-2"
            />
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
