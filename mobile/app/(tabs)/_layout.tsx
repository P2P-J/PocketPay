import { useRef } from "react";
import { View, Platform } from "react-native";
import { useRouter } from "expo-router";
import PagerView from "react-native-pager-view";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import HomeScreen from "./index";
import TransactionsScreen from "./transactions";
import HistoryScreen from "./history";
import MoreScreen from "./more";

import { TabBar } from "@/components/navigation/TabBar";
import { useTeamStore } from "@/store/teamStore";
import { showToast } from "@/components/ui/Toast";

export default function TabLayout() {
  const router = useRouter();
  const pagerRef = useRef<PagerView>(null);
  const progress = useSharedValue(0);

  const onTabPress = (index: number) => {
    pagerRef.current?.setPage(index);
  };

  const onAddPress = () => {
    const teams = useTeamStore.getState().teams;
    if (teams.length === 0) {
      showToast("error", "모임이 없어요", "모임을 먼저 만들어주세요!");
      router.push("/team/create");
      return;
    }
    router.push("/(tabs)/add");
  };

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        overdrag={Platform.OS === "ios"}
        offscreenPageLimit={1}
        onPageScroll={(e) => {
          const { position, offset } = e.nativeEvent;
          progress.value = position + offset;
        }}
      >
        <View key="0" collapsable={false} style={{ flex: 1 }}>
          <HomeScreen />
        </View>
        <View key="1" collapsable={false} style={{ flex: 1 }}>
          <TransactionsScreen />
        </View>
        <View key="2" collapsable={false} style={{ flex: 1 }}>
          <HistoryScreen />
        </View>
        <View key="3" collapsable={false} style={{ flex: 1 }}>
          <MoreScreen />
        </View>
      </PagerView>
      <TabBar
        progress={progress}
        onTabPress={onTabPress}
        onAddPress={onAddPress}
      />
    </SafeAreaView>
  );
}
