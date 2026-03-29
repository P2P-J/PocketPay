import "../global.css";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { View, Image, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments } from "expo-router";
import Toast from "react-native-toast-message";
import { toastConfig, showToast } from "../src/components/ui/Toast";
import { useAppInit } from "../src/hooks/useAppInit";
import { useAuthStore } from "../src/store/authStore";
import { teamApi } from "../src/api/team";
import { useTeamStore } from "../src/store/teamStore";

SplashScreen.preventAutoHideAsync();

function LoadingScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Image
        source={require("../assets/icon.png")}
        className="w-24 h-24 rounded-2xl mb-4"
        resizeMode="contain"
      />
      <Text className="text-title font-pretendard-bold text-text-primary">
        작은 모임
      </Text>
      <Text className="text-sub text-text-secondary mt-1">
        모임 회계, 이제 간편하게.
      </Text>
    </View>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const loginWithOAuth = useAuthStore((s) => s.loginWithOAuth);
  const segments = useSegments();
  const router = useRouter();
  const { isReady } = useAppInit();

  // 딥링크 수신 처리
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;

      // OAuth 콜백: pocketpay://auth/callback?accessToken=...
      if (url.includes("auth/callback")) {
        const params = new URLSearchParams(url.split("?")[1] || "");
        const accessToken = params.get("accessToken");
        const refreshToken = params.get("refreshToken");
        const error = params.get("error");

        if (error) {
          showToast("error", "로그인 실패", decodeURIComponent(error));
          return;
        }

        if (accessToken && refreshToken) {
          try {
            await loginWithOAuth(accessToken, refreshToken);
            showToast("success", "로그인 성공");
          } catch {
            showToast("error", "로그인 실패", "다시 시도해주세요");
          }
        }
        return;
      }

      // QR 초대 링크: pocketpay://join?token=XXXXXX
      if (url.includes("join")) {
        const params = new URLSearchParams(url.split("?")[1] || "");
        const token = params.get("token");
        if (!token) return;

        // 로그인 상태 확인
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          showToast("info", "로그인이 필요해요", "로그인 후 다시 시도해주세요");
          return;
        }

        try {
          const res = await teamApi.joinByToken(token);
          if (res.message === "이미 팀원입니다.") {
            showToast("info", "이미 참가중인 모임이에요");
          } else {
            showToast("success", "모임 참가 완료!", "홈에서 확인해보세요");
            // 팀 목록 새로고침
            await useTeamStore.getState().fetchTeams();
          }
        } catch {
          showToast("error", "참가 실패", "유효하지 않거나 만료된 초대 코드예요");
        }
      }
    };

    // 앱이 열려있을 때 딥링크 수신
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // 앱이 딥링크로 처음 열렸을 때
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  // 인증 상태에 따라 라우팅
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, segments, isReady]);

  if (!isReady) return <LoadingScreen />;
  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Pretendard: require("../assets/fonts/Pretendard-Regular.otf"),
    "Pretendard-Medium": require("../assets/fonts/Pretendard-Medium.otf"),
    "Pretendard-SemiBold": require("../assets/fonts/Pretendard-SemiBold.otf"),
    "Pretendard-Bold": require("../assets/fonts/Pretendard-Bold.otf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return <LoadingScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="team" />
          <Stack.Screen name="transaction" />
          <Stack.Screen name="change-password" />
          <Stack.Screen name="dutch" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </AuthGuard>
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
}
