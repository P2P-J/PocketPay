import { useRef, useState, useEffect } from "react";
import { View, Platform } from "react-native";
import { useRouter, useSegments } from "expo-router";
import PagerView from "react-native-pager-view";
import { useSharedValue } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import HomeScreen from "./index";
import TransactionsScreen from "./transactions";
import HistoryScreen from "./history";
import MoreScreen from "./more";

import { TabBar } from "@/components/navigation/TabBar";
import { useTeamStore } from "@/store/teamStore";
import { showToast } from "@/components/ui/Toast";

const TAB_ROUTES = ["index", "transactions", "history", "more"] as const;
type TabRoute = (typeof TAB_ROUTES)[number];

const HAPTIC_DEBOUNCE_MS = 400;

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const pagerRef = useRef<PagerView>(null);
  const progress = useSharedValue(0);
  // 방문한 적 있는 페이지만 마운트 (4개 동시 마운트로 인한 중복 API 호출 방지)
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const markVisited = (idx: number) =>
    setVisited((prev) => (prev.has(idx) ? prev : new Set(prev).add(idx)));

  // 햅틱 디바운스용
  const lastHapticAtRef = useRef(0);
  // 현재 페이지 추적 (외부 라우팅 동기화에서 사용)
  const currentPageRef = useRef(0);

  // 양 끝 경계에서 햅틱 진동 (iOS overdrag 트리거 시점)
  const triggerEdgeHaptic = (position: number, offset: number) => {
    const isLeftEdge = position === 0 && offset < -0.03;
    const isRightEdge =
      position === TAB_ROUTES.length - 1 && offset > 0.03;
    if (!isLeftEdge && !isRightEdge) return;

    const now = Date.now();
    if (now - lastHapticAtRef.current < HAPTIC_DEBOUNCE_MS) return;
    lastHapticAtRef.current = now;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  // 외부 라우팅 진입 시 페이저 인덱스 동기화 (예: 푸시 → /(tabs)/history 등)
  useEffect(() => {
    const last = segments[segments.length - 1] as TabRoute | undefined;
    const idx = last ? TAB_ROUTES.indexOf(last) : -1;
    if (idx >= 0 && idx !== currentPageRef.current) {
      currentPageRef.current = idx;
      markVisited(idx);
      pagerRef.current?.setPage(idx);
    }
  }, [segments]);

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
          // 양 끝 경계 햅틱
          triggerEdgeHaptic(position, offset);
        }}
        onPageSelected={(e) => {
          const idx = e.nativeEvent.position;
          currentPageRef.current = idx;
          markVisited(idx);
        }}
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
