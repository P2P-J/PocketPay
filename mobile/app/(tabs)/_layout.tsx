import { useRef, useState } from "react";
import { View, Platform } from "react-native";
import { useRouter } from "expo-router";
import PagerView from "react-native-pager-view";
import { useSharedValue } from "react-native-reanimated";

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
  // 방문한 적 있는 페이지만 마운트 (4개 동시 마운트로 인한 중복 API 호출 방지)
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const markVisited = (idx: number) =>
    setVisited((prev) => (prev.has(idx) ? prev : new Set(prev).add(idx)));

  const onTabPress = (index: number) => {
    markVisited(index);
    pagerRef.current?.setPage(index);
  };

  const onAddPress = () => {
    const teams = useTeamStore.getState().teams;
    if (teams.length === 0) {
      showToast("error", "모임이 없어요", "모임을 먼저 만들어주세요!");
      router.push("/team/create");
      return;
    }
    router.push("/add");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        overdrag={Platform.OS === "ios"}
        offscreenPageLimit={1}
        onPageScroll={(e) => {
          const { position, offset } = e.nativeEvent;
          progress.value = position + offset;
          // 스와이프가 시작되면 인접 페이지를 미리 마운트해 깜빡임 방지
          if (offset > 0.05) markVisited(position + 1);
          if (offset < -0.05) markVisited(position - 1);
        }}
        onPageSelected={(e) => markVisited(e.nativeEvent.position)}
      >
        <View key="0" collapsable={false} style={{ flex: 1 }}>
          {visited.has(0) ? <HomeScreen /> : null}
        </View>
        <View key="1" collapsable={false} style={{ flex: 1 }}>
          {visited.has(1) ? <TransactionsScreen /> : null}
        </View>
        <View key="2" collapsable={false} style={{ flex: 1 }}>
          {visited.has(2) ? <HistoryScreen /> : null}
        </View>
        <View key="3" collapsable={false} style={{ flex: 1 }}>
          {visited.has(3) ? <MoreScreen /> : null}
        </View>
      </PagerView>
      <TabBar
        progress={progress}
        onTabPress={onTabPress}
        onAddPress={onAddPress}
      />
    </View>
  );
}
