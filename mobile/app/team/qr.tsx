import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Share, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { showToast } from "@/components/ui/Toast";
import { teamApi } from "@/api/team";
import { Clock, Copy, Share2 } from "lucide-react-native";

export default function TeamQRScreen() {
  const { teamId, teamName } = useLocalSearchParams<{ teamId: string; teamName: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [token, setToken] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const deepLink = token ? `pocketpay://join?token=${token}` : "";

  useEffect(() => {
    loadToken();
  }, [teamId]);

  const loadToken = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await teamApi.generateInviteToken(teamId);
      setToken(res.data.token);
      setExpiry(new Date(res.data.expiry));
    } catch {
      showToast("error", "초대 링크 생성 실패", "다시 시도해주세요");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `[작은 모임] "${teamName}" 모임에 초대합니다!\n\n앱에서 아래 링크를 탭하세요:\n${deepLink}`,
        title: `${teamName} 모임 초대`,
      });
    } catch {
      // 사용자가 취소한 경우
    }
  };

  const handleCopyCode = async () => {
    if (!token) return;
    try {
      await Share.share({ message: token });
    } catch {
      // 취소
    }
  };

  const formatExpiry = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}시간 ${minutes}분 후 만료`;
    return `${minutes}분 후 만료`;
  };

  return (
    <ScreenContainer scrollable={false} withKeyboard={false}>
      <Header title="QR 초대" showBack />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3DD598" />
          <Text className="text-sub text-text-secondary mt-3">초대 코드 생성 중...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* 안내 텍스트 */}
          <View className="items-center mt-6 mb-8">
            <Text className="text-section font-pretendard-bold text-text-primary mb-2">
              {teamName}
            </Text>
            <Text className="text-sub text-text-secondary text-center">
              QR 코드를 스캔하거나 초대 코드를 공유하면{"\n"}바로 모임에 참가할 수 있어요
            </Text>
          </View>

          {/* QR 코드 카드 */}
          <Card variant="elevated" className="items-center py-8 mb-6">
            {deepLink ? (
              <QRCode
                value={deepLink}
                size={200}
                color="#191F28"
                backgroundColor="#FFFFFF"
                logo={require("../../assets/icon.png")}
                logoSize={36}
                logoBackgroundColor="#FFFFFF"
                logoBorderRadius={8}
              />
            ) : null}

            {/* 만료 시간 */}
            {expiry && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 16,
                  gap: 4,
                }}
              >
                <Clock size={12} color="#8B95A1" />
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Pretendard",
                    color: "#8B95A1",
                  }}
                >
                  {formatExpiry(expiry)}
                </Text>
              </View>
            )}
          </Card>

          {/* 초대 코드 표시 */}
          <Card variant="default" className="mb-4">
            <Text className="text-caption text-text-secondary mb-2">초대 코드</Text>
            <View className="flex-row items-center justify-between">
              <Text
                selectable
                style={{
                  fontSize: 28,
                  fontFamily: "Pretendard-Bold",
                  color: "#3DD598",
                  letterSpacing: 4,
                }}
              >
                {token}
              </Text>
              <Pressable
                onPress={handleCopyCode}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: "#F2F4F6",
                }}
              >
                <Copy size={18} color="#8B95A1" />
              </Pressable>
            </View>
          </Card>

          {/* 공유 버튼 */}
          <Pressable
            onPress={handleShareLink}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: "#3DD598",
              marginBottom: 12,
            }}
          >
            <Share2 size={18} color="#FFFFFF" />
            <Text
              style={{
                fontSize: 15,
                fontFamily: "Pretendard-SemiBold",
                color: "#FFFFFF",
              }}
            >
              초대 링크 공유하기
            </Text>
          </Pressable>

          {/* 새 코드 생성 */}
          <Pressable
            onPress={loadToken}
            style={{
              alignItems: "center",
              paddingVertical: 12,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Pretendard",
                color: "#8B95A1",
              }}
            >
              새 코드 생성하기
            </Text>
          </Pressable>

          {/* 참가 방법 안내 */}
          <Card variant="default" className="mt-4 mb-8">
            <Text className="text-caption text-text-secondary mb-2 font-pretendard-semibold">
              참가 방법
            </Text>
            <Text className="text-sub text-text-secondary leading-5">
              1. iPhone 기본 카메라로 QR 코드를 스캔하거나{"\n"}
              2. 초대 링크를 탭하면 앱이 열리며 자동 가입됩니다
            </Text>
          </Card>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
