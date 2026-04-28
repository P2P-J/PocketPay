import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { authApi } from "@/api/auth";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!currentPassword) e.currentPassword = "현재 비밀번호를 입력해주세요";
    if (!newPassword) e.newPassword = "새 비밀번호를 입력해주세요";
    else if (newPassword.length < 8 || newPassword.length > 20)
      e.newPassword = "비밀번호는 8~20자 사이여야 합니다";
    if (!confirmPassword) e.confirmPassword = "비밀번호 확인을 입력해주세요";
    else if (newPassword !== confirmPassword)
      e.confirmPassword = "새 비밀번호가 일치하지 않습니다";
    if (currentPassword && newPassword && currentPassword === newPassword)
      e.newPassword = "현재 비밀번호와 다른 비밀번호를 입력해주세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      showToast("success", "비밀번호가 변경되었습니다");
      router.back();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다.";
      if (message.includes("현재") || message.includes("비밀번호"))
        setErrors({ currentPassword: message });
      else showToast("error", "변경 실패", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: "#FFFFFF" }}>
      <Header title="비밀번호 변경" showBack />
      <ScreenContainer scrollable withTopInset={false}>
        <View className="gap-3 mt-6 mb-6">
          <Input
            label="현재 비밀번호"
            placeholder="현재 비밀번호를 입력해주세요"
            value={currentPassword}
            onChangeText={(v) => {
              setCurrentPassword(v);
              clearError("currentPassword");
            }}
            secureTextEntry
            error={errors.currentPassword}
          />
          <Input
            label="새 비밀번호"
            placeholder="8~20자"
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              clearError("newPassword");
            }}
            secureTextEntry
            error={errors.newPassword}
          />
          <Input
            label="새 비밀번호 확인"
            placeholder="새 비밀번호를 다시 입력해주세요"
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
          label="비밀번호 변경"
          variant="primary"
          size="full"
          onPress={handleChange}
          loading={loading}
        />
      </ScreenContainer>
    </View>
  );
}
