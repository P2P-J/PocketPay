import { Tabs, useRouter } from "expo-router";
import { View, Pressable, Platform } from "react-native";
import {
  Home,
  ArrowLeftRight,
  Plus,
  Clock,
  MoreHorizontal,
} from "lucide-react-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useTeamStore } from "@/store/teamStore";
import { showToast } from "@/components/ui/Toast";

function AddButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="items-center justify-center"
      style={{
        top: -16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#3DD598",
        shadowColor: "#3DD598",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
    </Pressable>
  );
}

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3DD598",
        tabBarInactiveTintColor: "#B0B8C1",
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Pretendard-Medium",
          marginTop: -2,
        },
        tabBarStyle: {
          height: Platform.OS === "ios" ? 83 : 64,
          paddingBottom: Platform.OS === "ios" ? 34 : 10,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: "#E5E8EB",
          backgroundColor: "#FFFFFF",
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "거래",
          tabBarIcon: ({ color, size }) => (
            <ArrowLeftRight size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarButton: (props: BottomTabBarButtonProps) => (
            <View className="items-center justify-center flex-1">
              <AddButton onPress={props.onPress as () => void} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            const teams = useTeamStore.getState().teams;
            if (teams.length === 0) {
              showToast("error", "모임이 없어요", "모임을 먼저 만들어주세요!");
              router.push("/team/create");
              return;
            }
            router.push("/(tabs)/add");
          },
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "내역",
          tabBarIcon: ({ color, size }) => (
            <Clock size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "더보기",
          tabBarIcon: ({ color, size }) => (
            <MoreHorizontal size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
