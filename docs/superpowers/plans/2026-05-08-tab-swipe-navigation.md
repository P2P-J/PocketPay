# 탭 스와이프 네비게이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작은 모임 앱의 4개 탭(홈/거래/내역/더보기)을 좌우 스와이프로 전환하고, 양 끝에서 고무줄(iOS) + 햅틱 진동 피드백을 주며, 탭바 활성 색상이 스와이프 진행률에 따라 실시간 보간되도록 구현.

**Architecture:** Expo Router의 `<Tabs>` 컴포넌트를 버리고 `(tabs)/_layout.tsx`를 PagerView + 커스텀 바텀바로 재작성. 4개 화면 컴포넌트를 직접 import해서 PagerView 자식으로 렌더. + 버튼은 PagerView 시퀀스에 포함 안 됨.

**Tech Stack:** React Native + Expo SDK 54, expo-router 6.0.23, react-native-reanimated 4.1.1 (worklet 색상 보간), 신규: `react-native-pager-view` (스와이프 + iOS overdrag), `expo-haptics` (경계 진동).

**Spec:** `docs/superpowers/specs/2026-05-08-tab-swipe-navigation-design.md`

**테스트 전략:** UI 인터랙션이라 자동화 단위 테스트는 부적합. 각 Task 끝에 시뮬레이터 수동 검증 체크리스트로 대체.

---

## File Structure

| 경로 | 종류 | 책임 |
|---|---|---|
| `mobile/app/(tabs)/_layout.tsx` | 재작성 | PagerView + TabBar 오케스트레이션, + 버튼 핸들러, 라우트 동기화 |
| `mobile/src/components/navigation/TabBar.tsx` | 신규 | 커스텀 바텀바 (4 탭 슬롯 + 가운데 + 버튼). Reanimated sharedValue로 색상 실시간 보간 |
| `mobile/package.json` | 수정 | 의존성 2개 추가 |
| `mobile/ios/*` | 자동생성 | prebuild 후 native 모듈 링크 |

화면 파일들(`index.tsx`, `transactions.tsx`, `history.tsx`, `more.tsx`, `add.tsx`)은 변경 없음.

---

## Task 1: 의존성 설치 + prebuild

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/ios/*` (prebuild 결과물)

- [ ] **Step 1.1: 패키지 설치**

```bash
cd /Users/jobogeun/aen-project/PocketPay/mobile
npx expo install react-native-pager-view expo-haptics
```

Expected: `package.json`에 두 패키지가 SDK 54 호환 버전으로 추가됨. 설치 로그 끝에 "added X packages" 출력.

- [ ] **Step 1.2: 설치 결과 확인**

```bash
grep -E "react-native-pager-view|expo-haptics" mobile/package.json
```

Expected: 두 줄 모두 출력됨.

- [ ] **Step 1.3: iOS prebuild (네이티브 모듈 링크)**

```bash
cd /Users/jobogeun/aen-project/PocketPay/mobile
npx expo prebuild --platform ios --clean
```

Expected: `ios/` 디렉토리 재생성, `Podfile.lock`에 `RNCPagerView`, `EXHaptics` 등이 포함됨. 마지막에 "✔ Finished prebuild" 또는 유사 메시지.

- [ ] **Step 1.4: 의존성 commit**

```bash
cd /Users/jobogeun/aen-project/PocketPay
git add mobile/package.json mobile/package-lock.json mobile/ios/
git status  # 추가된 파일 확인 후
git commit -m "chore(mobile): 탭 스와이프용 pager-view + haptics 추가

react-native-pager-view: 4개 탭 좌우 스와이프 + iOS overdrag(고무줄)
expo-haptics: 양 끝 도달 시 진동 피드백"
```

Expected: 커밋 성공.

---

## Task 2: TabBar 컴포넌트 (정적, 색상 동기화 전)

탭바 UI를 먼저 구현. 이 시점엔 아직 PagerView와 연결 안 됨. 활성 인덱스를 prop으로 받는 형태.

**Files:**
- Create: `mobile/src/components/navigation/TabBar.tsx`

- [ ] **Step 2.1: 파일 생성**

```bash
mkdir -p mobile/src/components/navigation
```

- [ ] **Step 2.2: TabBar 컴포넌트 작성**

`mobile/src/components/navigation/TabBar.tsx`:

```tsx
import { memo } from "react";
import { View, Pressable, Platform, Text } from "react-native";
import {
  Home,
  ArrowLeftRight,
  Plus,
  Clock,
  MoreHorizontal,
} from "lucide-react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolateColor,
} from "react-native-reanimated";

const ACTIVE_COLOR = "#3DD598";
const INACTIVE_COLOR = "#B0B8C1";

type TabItem = {
  index: number;
  label: string;
  Icon: typeof Home;
};

const TABS: TabItem[] = [
  { index: 0, label: "홈", Icon: Home },
  { index: 1, label: "거래", Icon: ArrowLeftRight },
  { index: 2, label: "내역", Icon: Clock },
  { index: 3, label: "더보기", Icon: MoreHorizontal },
];

type Props = {
  progress: SharedValue<number>;
  onTabPress: (index: number) => void;
  onAddPress: () => void;
};

function TabBarInner({ progress, onTabPress, onAddPress }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        height: Platform.OS === "ios" ? 83 : 64,
        paddingBottom: Platform.OS === "ios" ? 34 : 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#E5E8EB",
        backgroundColor: "#FFFFFF",
      }}
    >
      <TabSlot tab={TABS[0]} progress={progress} onPress={onTabPress} />
      <TabSlot tab={TABS[1]} progress={progress} onPress={onTabPress} />
      <AddSlot onPress={onAddPress} />
      <TabSlot tab={TABS[2]} progress={progress} onPress={onTabPress} />
      <TabSlot tab={TABS[3]} progress={progress} onPress={onTabPress} />
    </View>
  );
}

type TabSlotProps = {
  tab: TabItem;
  progress: SharedValue<number>;
  onPress: (index: number) => void;
};

function TabSlot({ tab, progress, onPress }: TabSlotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.min(Math.abs(progress.value - tab.index), 1);
    const color = interpolateColor(
      distance,
      [0, 1],
      [ACTIVE_COLOR, INACTIVE_COLOR]
    );
    return { color };
  });

  return (
    <Pressable
      onPress={() => onPress(tab.index)}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <AnimatedIcon Icon={tab.Icon} style={animatedStyle} />
      <AnimatedLabel label={tab.label} style={animatedStyle} />
    </Pressable>
  );
}

const AnimatedIcon = ({
  Icon,
  style,
}: {
  Icon: typeof Home;
  style: ReturnType<typeof useAnimatedStyle>;
}) => {
  const colorStyle = useAnimatedStyle(() => ({ color: (style as any).value?.color ?? INACTIVE_COLOR }));
  // Reanimated으로 lucide 아이콘 색을 직접 보간하기는 까다로움 → 임시 wrapper
  return (
    <Animated.View style={{ marginTop: 2 }}>
      <Icon size={24} color={INACTIVE_COLOR} strokeWidth={2} />
    </Animated.View>
  );
};

const AnimatedLabel = ({
  label,
  style,
}: {
  label: string;
  style: ReturnType<typeof useAnimatedStyle>;
}) => (
  <Animated.Text
    style={[
      {
        fontSize: 10,
        fontFamily: "Pretendard-Medium",
        marginTop: -2,
      },
      style,
    ]}
  >
    {label}
  </Animated.Text>
);

function AddSlot({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Pressable
        onPress={onPress}
        style={{
          top: -16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: ACTIVE_COLOR,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: ACTIVE_COLOR,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

export const TabBar = memo(TabBarInner);
```

> **노트:** lucide-react-native의 `Icon` 컴포넌트는 `color` prop을 일반 string으로 받는다. Reanimated worklet에서 직접 색을 주입하려면 SVG 내부 props를 애니메이션해야 하는데, 이건 까다롭다. **Step 4.4에서 방식을 변경할 예정** (라벨 색은 Animated.Text로 직접 보간 가능, 아이콘 색은 Reanimated의 `useDerivedValue` + `runOnJS`로 React state에 반영하는 방식 또는 SVG path를 직접 그리기). 이 Task는 우선 **라벨만 색 보간하고 아이콘은 inactive 고정**으로 첫 동작 확인.

- [ ] **Step 2.3: TypeScript 컴파일 확인**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "TabBar"
```

Expected: TabBar.tsx 관련 타입 에러 0건.

- [ ] **Step 2.4: 커밋**

```bash
git add mobile/src/components/navigation/TabBar.tsx
git commit -m "feat(mobile): 커스텀 탭바 컴포넌트 신규 (스와이프 진행률 prop 수신)"
```

---

## Task 3: _layout.tsx 재작성 (PagerView + TabBar 연결)

**Files:**
- Modify: `mobile/app/(tabs)/_layout.tsx` (전면 재작성)

- [ ] **Step 3.1: 기존 _layout.tsx 백업 (참조용)**

```bash
cp mobile/app/\(tabs\)/_layout.tsx /tmp/_layout.tsx.backup
```

- [ ] **Step 3.2: _layout.tsx 전면 재작성**

`mobile/app/(tabs)/_layout.tsx`:

```tsx
import { useRef } from "react";
import { View, Platform } from "react-native";
import { useRouter } from "expo-router";
import PagerView from "react-native-pager-view";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import HomeScreen from "./index";
import TransactionsScreen from "./transactions";
import HistoryScreen from "./history";
import MoreScreen from "./more";

import { TabBar } from "@/components/navigation/TabBar";
import { useTeamStore } from "@/store/teamStore";
import { showToast } from "@/components/ui/Toast";

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

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
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
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
        <View key="0" collapsable={false}>
          <HomeScreen />
        </View>
        <View key="1" collapsable={false}>
          <TransactionsScreen />
        </View>
        <View key="2" collapsable={false}>
          <HistoryScreen />
        </View>
        <View key="3" collapsable={false}>
          <MoreScreen />
        </View>
      </PagerView>
      <TabBar progress={progress} onTabPress={onTabPress} onAddPress={onAddPress} />
    </SafeAreaView>
  );
}
```

- [ ] **Step 3.3: TypeScript 컴파일 확인**

```bash
cd mobile && npx tsc --noEmit
```

Expected: 에러 0건. (만약 SafeAreaView import 경로 다르면 `react-native-safe-area-context`로 수정.)

- [ ] **Step 3.4: 시뮬레이터 첫 검증**

```bash
cd mobile && npx expo start --ios --clear
```

검증 항목:
- [ ] 앱이 크래시 없이 부팅
- [ ] 홈 화면이 첫 페이지로 표시
- [ ] 좌우 스와이프로 4개 탭 이동 가능 (홈 ↔ 거래 ↔ 내역 ↔ 더보기)
- [ ] + 버튼 누르면 거래 추가 화면 푸시 (또는 모임 없으면 토스트)
- [ ] 탭 직접 누르면 해당 페이지로 이동
- [ ] 양 끝(홈 왼쪽, 더보기 오른쪽)에서 더 스와이프 시도 시 "찾을 수 없는 페이지" 안 뜸
- [ ] 라벨 색이 진행률 따라 부드럽게 변함 (아이콘은 아직 회색 고정 — Task 4에서 처리)

만약 검증 실패 시: 즉시 중단하고 원인 진단. 백업 파일로 롤백 가능: `cp /tmp/_layout.tsx.backup mobile/app/\(tabs\)/_layout.tsx`

- [ ] **Step 3.5: 검증 통과 시 커밋**

```bash
git add mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat(mobile): 4개 탭 좌우 스와이프 — PagerView + 커스텀 바텀바

- expo-router Tabs 제거, PagerView 직접 렌더
- + 버튼은 PagerView 외부, 기존 라우팅 로직 보존
- 라벨 색상 진행률 보간 (아이콘 색은 다음 커밋)"
```

---

## Task 4: 아이콘 색상 실시간 보간

라벨은 Reanimated의 `Animated.Text` 스타일 보간으로 동작하지만, lucide 아이콘 색은 string prop이라 Reanimated worklet과 호환 안 됨. SVG 컴포넌트의 stroke를 Reanimated로 직접 애니메이션하는 방식으로 전환.

**Files:**
- Modify: `mobile/src/components/navigation/TabBar.tsx`

- [ ] **Step 4.1: lucide 아이콘 호환성 확인**

```bash
grep -r "createAnimatedComponent\|AnimatedSvg" mobile/node_modules/lucide-react-native/ 2>/dev/null | head -3
```

> 메모: lucide-react-native는 react-native-svg 기반. `react-native-svg`의 `Path`, `Circle` 등은 Reanimated와 호환됨 (`useAnimatedProps`로 stroke 애니메이션 가능). 다만 lucide 아이콘 한 개가 여러 SVG 요소를 가질 수 있음.

- [ ] **Step 4.2: 가장 단순한 접근 — useDerivedValue + runOnJS로 React state 갱신**

`TabBar.tsx`에서 `TabSlot` 컴포넌트 수정:

```tsx
import { useState } from "react";
import {
  SharedValue,
  useDerivedValue,
  runOnJS,
  interpolateColor,
} from "react-native-reanimated";

function TabSlot({ tab, progress, onPress }: TabSlotProps) {
  const [iconColor, setIconColor] = useState(
    tab.index === 0 ? ACTIVE_COLOR : INACTIVE_COLOR
  );

  useDerivedValue(() => {
    const distance = Math.min(Math.abs(progress.value - tab.index), 1);
    const color = interpolateColor(
      distance,
      [0, 1],
      [ACTIVE_COLOR, INACTIVE_COLOR]
    );
    runOnJS(setIconColor)(color);
  }, [progress, tab.index]);

  const animatedLabelStyle = useAnimatedStyle(() => {
    const distance = Math.min(Math.abs(progress.value - tab.index), 1);
    const color = interpolateColor(
      distance,
      [0, 1],
      [ACTIVE_COLOR, INACTIVE_COLOR]
    );
    return { color };
  });

  return (
    <Pressable
      onPress={() => onPress(tab.index)}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <View style={{ marginTop: 2 }}>
        <tab.Icon size={24} color={iconColor} strokeWidth={2} />
      </View>
      <Animated.Text
        style={[
          {
            fontSize: 10,
            fontFamily: "Pretendard-Medium",
            marginTop: -2,
          },
          animatedLabelStyle,
        ]}
      >
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}
```

> **트레이드오프:** `runOnJS(setIconColor)`는 매 프레임 JS 스레드로 색상을 보내므로 60fps 환경에선 초당 60회 setState. 4개 탭 × 60fps = 240회/초 setState. 성능 우려가 있을 수 있음. 우선 동작 확인 후, 만약 끊김 발생하면 Step 4.5에서 react-native-svg 직접 애니메이션으로 전환.

기존 `AnimatedIcon`/`AnimatedLabel` 헬퍼는 삭제.

- [ ] **Step 4.3: 시뮬레이터 검증**

```bash
cd mobile && npx expo start --ios --clear
```

검증 항목:
- [ ] 4탭 좌우 스와이프 시 아이콘+라벨 색상이 동시에 부드럽게 변함
- [ ] 끊김/지연 없음 (체감 60fps)
- [ ] 빠른 스와이프에서도 색상 추적 정상

- [ ] **Step 4.4: 성능 이슈 발생 시에만 — react-native-svg 직접 애니메이션으로 전환**

만약 Step 4.3에서 끊김이 체감되면, 다음으로 교체:

```tsx
// 다른 파일: mobile/src/components/navigation/TabIcons.tsx
// lucide 대신 직접 SVG path 사용 + Animated stroke
// (구현 시점에 lucide 소스에서 path를 추출해 복제)
```

> 이 단계는 체감 끊김이 없으면 **건너뜀**. 메모: 4개 탭의 단순 색상 보간은 대부분 환경에서 문제 없음.

- [ ] **Step 4.5: 검증 통과 시 커밋**

```bash
git add mobile/src/components/navigation/TabBar.tsx
git commit -m "feat(mobile): 탭 아이콘 색상 실시간 보간 — 스와이프 진행률 동기화"
```

---

## Task 5: 햅틱 진동 (양 끝 경계)

**Files:**
- Modify: `mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 5.1: import 추가 및 햅틱 핸들러 작성**

`_layout.tsx` 상단에 추가:

```tsx
import * as Haptics from "expo-haptics";
```

`TabLayout` 컴포넌트 안에 추가:

```tsx
const lastHapticAtRef = useRef(0);

const handleEdgeHaptic = (position: number, offset: number) => {
  const isLeftEdge = position === 0 && offset < -0.03;
  const isRightEdge = position === 3 && offset > 0.03;
  if (!isLeftEdge && !isRightEdge) return;

  const now = Date.now();
  if (now - lastHapticAtRef.current < 400) return;
  lastHapticAtRef.current = now;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};
```

`onPageScroll` 콜백 수정:

```tsx
onPageScroll={(e) => {
  const { position, offset } = e.nativeEvent;
  progress.value = position + offset;
  handleEdgeHaptic(position, offset);
}}
```

- [ ] **Step 5.2: 시뮬레이터 검증**

> 시뮬레이터는 햅틱이 안 울림. Mac 트랙패드 햅틱은 시뮬레이터에 전달 안 됨. **실기기 검증 필요.**

시뮬레이터 검증 (가능한 부분만):
- [ ] 양 끝 스와이프 시도 시 크래시 없음
- [ ] 콘솔에 `Haptics` 관련 에러 없음

실기기 검증 (TestFlight 또는 development build):
- [ ] 홈에서 왼쪽으로 더 스와이프 시 진동 한 번
- [ ] 더보기에서 오른쪽으로 더 스와이프 시 진동 한 번
- [ ] 같은 스와이프 동작 안에서 진동 1회만 (디바운스)
- [ ] 강도가 적절 (너무 약하지도 강하지도 않음)

- [ ] **Step 5.3: 검증 통과 시 커밋**

```bash
git add mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat(mobile): 탭 양 끝 도달 시 햅틱 진동 (Medium, 400ms 디바운스)"
```

---

## Task 6: 외부 라우팅 동기화 (useSegments + setPage)

`router.push("/(tabs)/transactions")`처럼 외부에서 특정 탭으로 진입할 때 PagerView 인덱스가 따라가야 함.

**Files:**
- Modify: `mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 6.1: import 추가**

```tsx
import { useEffect } from "react";
import { useSegments } from "expo-router";
```

- [ ] **Step 6.2: 라우트 → 인덱스 매핑 + useEffect 동기화**

`TabLayout` 컴포넌트 안에 추가:

```tsx
const TAB_ROUTES = ["index", "transactions", "history", "more"] as const;

const segments = useSegments();
const currentPageRef = useRef(0);

useEffect(() => {
  const last = segments[segments.length - 1];
  const idx = TAB_ROUTES.indexOf(last as (typeof TAB_ROUTES)[number]);
  if (idx >= 0 && idx !== currentPageRef.current) {
    pagerRef.current?.setPage(idx);
    currentPageRef.current = idx;
  }
}, [segments]);
```

`PagerView`에 `onPageSelected` 추가:

```tsx
onPageSelected={(e) => {
  currentPageRef.current = e.nativeEvent.position;
}}
```

> **노트:** `segments`는 expo-router가 URL 바뀔 때 갱신. 직접 `pagerRef.setPage` 호출(탭 누름/스와이프) 시에도 URL을 바꿔야 일관성 유지되는데, 이는 이번 범위 밖이라 **PagerView가 단방향(외부 → 페이저)으로만 동기화**. 사용자가 스와이프 후 홈 버튼으로 앱 복귀 시 URL과 페이저 인덱스 mismatch 가능 — 다만 다음 외부 진입 때 Re-sync 됨.

- [ ] **Step 6.3: 시뮬레이터 검증**

```bash
cd mobile && npx expo start --ios --clear
```

검증 항목:
- [ ] 거래 탭에서 + 버튼 → add 화면 → 뒤로가기 시 거래 탭에 정상 복귀
- [ ] (가능하면) 푸시 알림 또는 딥링크 시뮬레이션으로 특정 탭 진입 시 페이저 인덱스 동기화
- [ ] 일반 스와이프/탭 누름은 기존처럼 정상 동작

- [ ] **Step 6.4: 검증 통과 시 커밋**

```bash
git add mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat(mobile): 외부 라우트 진입 시 페이저 인덱스 동기화 (useSegments)"
```

---

## Task 7: Android 하드웨어 뒤로가기

Android에서 페이저 인덱스가 0이 아니면 홈으로 이동, 0이면 앱 종료(기본 동작).

**Files:**
- Modify: `mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 7.1: BackHandler 추가**

`_layout.tsx` 상단:

```tsx
import { BackHandler } from "react-native";
```

`TabLayout` 컴포넌트 안에 추가:

```tsx
useEffect(() => {
  if (Platform.OS !== "android") return;
  const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
    if (currentPageRef.current !== 0) {
      pagerRef.current?.setPage(0);
      return true;
    }
    return false;
  });
  return () => subscription.remove();
}, []);
```

- [ ] **Step 7.2: Android 시뮬레이터 검증 (선택)**

> 우선순위 낮음. Android 빌드 환경 미준비 시 **Task 8까지 진행 후 일괄 검증**.

만약 Android 환경 가능하면:
- [ ] 거래 탭에서 백 버튼 누름 → 홈으로 이동
- [ ] 홈에서 백 버튼 누름 → 앱 종료 또는 시스템 핸들

- [ ] **Step 7.3: 커밋**

```bash
git add mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat(mobile): Android 하드웨어 뒤로가기 — 비-홈 탭에서 홈으로 이동"
```

---

## Task 8: 종합 회귀 검증 + 푸시

**Files:** (수정 없음, 검증만)

- [ ] **Step 8.1: 시뮬레이터 종합 검증 (iPhone 17, iPad Air 11" M4)**

```bash
cd mobile && npx expo start --clear
# iOS 시뮬레이터에서 a 키 눌러 iPhone 17 실행
# 별도 시뮬레이터 띄우고 iPad Air 11" M4 실행
```

검증 체크리스트:

**기본 동작:**
- [ ] 4탭 좌우 스와이프 정상 (홈 ↔ 거래 ↔ 내역 ↔ 더보기)
- [ ] 빠른 좌우 플링 자연스러움
- [ ] 탭 직접 누름 정상

**경계 피드백:**
- [ ] 홈 왼쪽 / 더보기 오른쪽에서 iOS 고무줄 동작 (살짝 끌렸다가 원위치)
- [ ] **"찾을 수 없는 페이지" 절대 미노출** ⭐ (사용자 핵심 요구)

**색상 보간:**
- [ ] 스와이프 진행률에 따라 4개 탭 라벨+아이콘 색상이 동시에 부드럽게 변함
- [ ] 끊김/지연 없음

**+ 버튼:**
- [ ] + 버튼 위치 기존과 동일 (가운데, top: -16, 초록 원형)
- [ ] 모임 있을 때: + 누르면 거래 추가 화면 푸시
- [ ] 모임 없을 때: + 누르면 토스트 + 모임 생성 화면

**스크롤 충돌:**
- [ ] 홈 화면 안 세로 스크롤 정상
- [ ] 거래/내역 탭의 FlatList 스크롤 정상
- [ ] 더보기 탭 ScrollView 정상

**라우팅:**
- [ ] 거래 탭에서 거래 카드 탭 → 거래 상세로 이동, 뒤로가기 시 거래 탭 복귀
- [ ] 더보기 탭에서 메뉴 → 해당 화면 이동, 뒤로가기 시 더보기 복귀

**iPad:**
- [ ] iPad Air 11" 시뮬레이터에서 4탭 스와이프 정상
- [ ] 회전(세로 ↔ 가로) 시 페이지 폭 자동 갱신

- [ ] **Step 8.2: 발견된 이슈 수정**

만약 검증 중 이슈 발견:
1. 이슈 기록
2. 가장 단순한 원인부터 진단
3. 수정 후 재검증
4. 별도 commit

이슈 없이 모두 통과 시 다음 단계로.

- [ ] **Step 8.3: 실기기 검증 (햅틱 확인)**

```bash
cd mobile && npx expo start --tunnel
# iPhone 실기기에서 Expo Go 또는 development build로 접속
```

- [ ] 햅틱 진동 동작 확인 (Task 5)
- [ ] 스와이프 체감 부드러움 (60fps)

- [ ] **Step 8.4: origin/main에 push**

```bash
cd /Users/jobogeun/aen-project/PocketPay
git log origin/main..HEAD --oneline  # push할 commit 확인
git push origin main
```

Expected: 7~8개 commit이 origin/main으로 push됨.

- [ ] **Step 8.5: 메모리 업데이트**

`/Users/jobogeun/.claude/projects/-Users-jobogeun-aen-project-PocketPay/memory/project_status.md` 또는 별도 메모리에 다음 기록:

- 2026-05-08: 탭 스와이프 네비게이션 구현 완료
- 영향: `(tabs)/_layout.tsx` 재작성, TabBar 신규
- 다음: 사용자가 새로 보고하는 오류 수정 라운드 재개

---

## Self-Review

### Spec 커버리지

| Spec 섹션 | 구현 Task |
|---|---|
| §3 아키텍처 | Task 3 |
| §3.2 TabBar 컴포넌트 | Task 2 |
| §3.3 외부 라우팅 동기화 | Task 6 |
| §3.4 Add 버튼 | Task 3 (handler), Task 2 (UI) |
| §4.1 진행률 추적 | Task 3 |
| §4.2 고무줄 (iOS) | Task 3 (`overdrag={Platform.OS === 'ios'}`) |
| §4.3 햅틱 | Task 5 |
| §4.4 색상 보간 | Task 4 (아이콘), Task 2 (라벨) |
| §4.5 탭바 직접 누름 | Task 3 (`onTabPress`) |
| §5 엣지 케이스 — Android 뒤로가기 | Task 7 |
| §5 엣지 케이스 — 외부 진입 | Task 6 |
| §6 성능 최적화 | Task 2 (memo), Task 3 (offscreenPageLimit), Task 5 (디바운스) |
| §7 테스트 | Task 8 |
| §8 의존성 | Task 1 |

모든 spec 요구사항이 task로 매핑됨. ✅

### Placeholder 체크

- "TBD/TODO" 없음
- 각 step에 실제 코드/명령 포함
- Task 4.4(react-native-svg 직접 애니메이션)는 조건부 단계이며, 트리거 조건과 우회 방법이 명시됨

### 타입 일관성

- `TAB_ROUTES`는 Task 6에서만 사용 (`_layout.tsx` 내부)
- `progress: SharedValue<number>` Task 2/3 일치
- `onTabPress: (index: number) => void` Task 2/3 일치
- `onAddPress: () => void` Task 2/3 일치

### 위험 영역

- **Task 4 색상 보간 성능**: `runOnJS(setIconColor)`가 60fps × 4 = 240회/초 setState. 만약 끊김 시 SVG 직접 애니메이션으로 전환 옵션 명시.
- **Task 6 라우팅 동기화**: 단방향(외부 → 페이저)만 처리. 양방향 동기화는 범위 밖. 메모리/딥링크 시 mismatch는 다음 외부 진입에서 자동 해소.

이 계획대로 실행 시 spec의 모든 성공 기준 충족.
