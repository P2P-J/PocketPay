# 탭 스와이프 네비게이션 설계

**작성일**: 2026-05-08
**기능**: 하단 4개 탭(홈/거래/내역/더보기)을 좌우 스와이프로 전환, 끝에서 고무줄(rubber-band) + 햅틱 피드백
**대상**: 작은 모임 (PocketPay) 모바일 앱

---

## 1. 배경 및 목표

### 1.1 사용자 요청

홈 탭, 내역 탭, 더보기 탭 등 하단 탭을 좌우 슬라이드로 전환하고, 끝에 도달했을 때 "찾을 수 없는 페이지"가 뜨는 게 아니라 더 이상 슬라이드되지 않는 시각적 피드백을 주는 것.

### 1.2 디자인 결정 (브레인스토밍 결과)

| 항목 | 결정 |
|---|---|
| 스와이프 시퀀스 | 4개 탭만 (`+` 버튼 제외): 홈 ↔ 거래 ↔ 내역 ↔ 더보기 |
| 경계 피드백 | iOS 고무줄(rubber-band) + 햅틱 진동 |
| 탭바 활성 표시 | 스와이프 진행률에 따라 실시간 색상 보간 |
| 구현 접근법 | `react-native-pager-view` + 커스텀 바텀바 |

### 1.3 사용자 핵심 요구

> "끝까지 와서 없는 페이지라면, 찾을 수 없는 페이지입니다 라고 보여주는 게 아니고, 슬라이드 되지 않게 액션을 주면 좋겠어."

→ **"찾을 수 없는 페이지" 절대 노출 금지**가 검수 핵심.

---

## 2. 현황 분석

### 2.1 현재 탭 구조

`mobile/app/(tabs)/_layout.tsx`:

- Expo Router 6.0.23의 `<Tabs>` 컴포넌트 (= `@react-navigation/bottom-tabs` 래퍼)
- 5개 `Tabs.Screen`: `index`(홈) / `transactions`(거래) / `add`(+) / `history`(내역) / `more`(더보기)
- 가운데 `add`는 진짜 탭이 아님:
  - `tabBarButton`을 커스텀 `<AddButton>`으로 교체 (초록 원형 + 버튼)
  - `listeners.tabPress`에서 `e.preventDefault()` → `router.push("/(tabs)/add")`
  - 즉, **스택 푸시로 동작하는 모달 성격** → PagerView 시퀀스에서 자연스럽게 빠짐

### 2.2 의존성 현황

| 패키지 | 버전 | 비고 |
|---|---|---|
| expo | ^54.0.33 | SDK 54 |
| expo-router | ~6.0.23 | file-based 라우팅 |
| react-native-reanimated | ~4.1.1 | ✅ 설치됨, worklet 처리에 사용 |
| react-native-gesture-handler | ~2.28.0 | ✅ 설치됨 |
| **react-native-pager-view** | — | ❌ **신규 설치 필요** |
| **expo-haptics** | — | ❌ **신규 설치 필요** |

### 2.3 화면 규모

| 화면 | 줄 수 | 스크롤 |
|---|---|---|
| index.tsx (홈) | 489 | ScrollView |
| history.tsx (내역) | 378 | FlatList |
| add.tsx | 258 | ScrollView (PagerView 외부) |
| transactions.tsx (거래) | 202 | ScrollView |
| more.tsx (더보기) | 174 | ScrollView |

→ 4개 페이저 페이지의 동시 마운트 부담은 `offscreenPageLimit={1}`로 양쪽 1개만 미리 로드해 완화.

### 2.4 디자인 시스템 컨텍스트

- NativeWind + 3-tier breakpoint(`phone`/`tablet`/`large`)
- `ScreenContainer` 패턴: 모든 화면이 `<ScreenContainer><Header>본문</ScreenContainer>` 구조
- `headerShown: false` (각 화면이 자체 헤더 보유) → PagerView 안에 그대로 렌더 가능

---

## 3. 아키텍처

### 3.1 컴포넌트 구조

```
app/(tabs)/_layout.tsx (전면 재작성)
└── <SafeAreaView edges={['bottom']}>
    ├── <PagerView
    │     ref={pagerRef}
    │     style={{ flex: 1 }}
    │     initialPage={0}
    │     overdrag={Platform.OS === 'ios'}
    │     offscreenPageLimit={1}
    │     onPageScroll={animatedScrollHandler}
    │     onPageSelected={handlePageSelected}
    │   >
    │     <View key="0" collapsable={false}><HomeScreen /></View>
    │     <View key="1" collapsable={false}><TransactionsScreen /></View>
    │     <View key="2" collapsable={false}><HistoryScreen /></View>
    │     <View key="3" collapsable={false}><MoreScreen /></View>
    │ </PagerView>
    └── <CustomBottomBar progress={progressShared} onTabPress={...} />
```

- `(tabs)` 그룹 내 5개 화면 파일은 **그대로 유지**, `_layout.tsx`만 재작성.
- `add.tsx`는 PagerView에 포함되지 않음. `(tabs)/_layout.tsx`에는 PagerView만 있고, `(tabs)/add`는 별도 라우트로 stack push 됨.

### 3.2 새 컴포넌트

#### `CustomBottomBar` (신규)

위치: `mobile/src/components/navigation/TabBar.tsx`

```tsx
type Props = {
  progress: SharedValue<number>;  // 0~3 연속값
  onTabPress: (index: number) => void;
  onAddPress: () => void;
};
```

- 5개 슬롯 렌더 (홈 / 거래 / + / 내역 / 더보기)
- 각 탭별로 `useAnimatedStyle`로 색상 보간 (active: `#3DD598`, inactive: `#B0B8C1`)
- + 버튼은 기존 `AddButton` 디자인 그대로 (초록 원형, top: -16)
- 인덱스 매핑: 홈=0, 거래=1, 내역=2, 더보기=3 (+ 는 인덱스 없음)

#### 라우트 → PagerView 인덱스 매핑

```ts
const TAB_ROUTES = ['index', 'transactions', 'history', 'more'] as const;
type TabRoute = typeof TAB_ROUTES[number];
const routeToIndex = (r: TabRoute) => TAB_ROUTES.indexOf(r);
```

### 3.3 외부 라우팅 동기화

외부에서 `router.push("/(tabs)/history")` 같은 호출이 들어왔을 때 PagerView 인덱스가 따라가야 함.

```tsx
const segments = useSegments();
useEffect(() => {
  const last = segments[segments.length - 1] as TabRoute;
  const idx = routeToIndex(last);
  if (idx >= 0 && idx !== currentPage) {
    pagerRef.current?.setPage(idx);
  }
}, [segments]);
```

### 3.4 Add 버튼 동작 (기존 유지)

```tsx
const handleAddPress = () => {
  const teams = useTeamStore.getState().teams;
  if (teams.length === 0) {
    showToast("error", "모임이 없어요", "모임을 먼저 만들어주세요!");
    router.push("/team/create");
    return;
  }
  router.push("/(tabs)/add");
};
```

기존 `_layout.tsx`의 `tabPress` 리스너 로직 그대로 이식.

---

## 4. 인터랙션 디테일

### 4.1 진행률 추적

PagerView의 `onPageScroll(event)`는 다음을 제공:
- `event.nativeEvent.position`: 현재 페이지 인덱스 (정수, 0~3)
- `event.nativeEvent.offset`: 다음 페이지로의 진행률 (0~1)

진행률 합성:
```ts
const progress = useSharedValue(0);
const handlePageScroll = useAnimatedScrollHandler({
  // PagerView는 onPageScroll worklet 지원 (Reanimated 통합)
  onScroll: (e) => {
    'worklet';
    progress.value = e.position + e.offset;  // 0~3
  },
});
```

### 4.2 고무줄 (Rubber-band)

- **iOS**: `<PagerView overdrag={true}>` 명시 → 양 끝에서 손가락 따라 살짝 끌려갔다가 놓으면 원위치 (네이티브 동작)
- **Android**: PagerView에 overdrag 옵션 없음. 출시 우선순위상 baseline(끝에서 정지) 동작으로 시작. v1.1+ 후순위.

### 4.3 햅틱 진동

경계 검출 + 디바운스:

```ts
const lastHapticAtRef = useRef(0);

const handlePageScrollJS = (position: number, offset: number) => {
  const isLeftEdge = position === 0 && offset < -0.03;
  const isRightEdge = position === TAB_ROUTES.length - 1 && offset > 0.03;
  if (!isLeftEdge && !isRightEdge) return;

  const now = Date.now();
  if (now - lastHapticAtRef.current < 400) return;  // 같은 스와이프 동작 안에서 한 번만
  lastHapticAtRef.current = now;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};
```

- 경계 검출 임계값 `0.03`은 손가락이 살짝만 끌려도 트리거되도록 한 보수값. 실기기 테스트 후 조정.
- `position`/`offset` 값의 정확한 의미는 PagerView 라이브러리 구현에 의존. 위 검출 식이 동작하지 않으면 `onPageScrollStateChanged`(idle/dragging/settling) + `onPageSelected` 조합으로 폴백.
- iOS overdrag 시에만 트리거되는 게 정상. Android는 baseline 동작이라 햅틱 거의 안 울림.

### 4.4 탭바 색상 실시간 보간

```tsx
function TabIcon({ index, progress, label, Icon }: ...) {
  const animatedColorStyle = useAnimatedStyle(() => {
    const colorProgress = Math.min(Math.abs(progress.value - index), 1);
    return {
      // 0이면 active, 1이상이면 inactive
    };
  });
  // 또는 interpolateColor 사용
}
```

`interpolateColor(progress.value, [0,1,2,3], [active,inactive,inactive,inactive], ...)` 형태로 각 탭별 4-점 보간.

### 4.5 탭바 직접 탭(누름)

스와이프 외에 사용자가 탭바를 직접 누를 수도 있음:
```tsx
const onTabPress = (idx: number) => pagerRef.current?.setPage(idx);
```

기본 애니메이션으로 부드럽게 전환됨.

---

## 5. 엣지 케이스

| 케이스 | 처리 |
|---|---|
| + 버튼 누름 | PagerView 인덱스 변경 X. `router.push("/(tabs)/add")` 그대로 |
| 외부 진입 (딥링크/푸시) | `useSegments` watch → `pagerRef.setPage(idx, false)` |
| Android 하드웨어 뒤로가기 | 현재 인덱스 != 0이면 홈(0)으로, 0이면 앱 종료 (`BackHandler` 사용) |
| 빠른 플링 | PagerView 기본 동작 (다음 페이지) |
| 모달 위 스와이프 | 모달이 페이저 위에 띄워져 사용자가 페이저 못 만짐, 처리 불필요 |
| iPad 회전 | PagerView가 화면 너비 자동 추적 (기본 동작) |
| 빠른 양방향 연속 스와이프 | 햅틱 디바운스(400ms)로 중복 진동 방지 |

---

## 6. 성능 최적화

1. **Lazy 마운트**: `offscreenPageLimit={1}` — 양쪽 1개만 미리 마운트. 동시 메모리 최대 3개 페이지.
2. **onPageScroll worklet**: PagerView v6+의 Reanimated 통합 사용. UI 스레드에서 진행률 계산.
3. **interpolateColor worklet**: 색상 보간 전부 UI 스레드.
4. **햅틱 디바운스**: useRef 기반 시간 가드 400ms.
5. **BottomBar memoization**: `React.memo`로 부모 리렌더와 분리. progress는 sharedValue prop으로 prop drilling 없이 전달.
6. **+ 버튼 핸들러**: `useCallback`으로 안정화.

---

## 7. 테스트 계획

UI 인터랙션이라 자동화 테스트 부적합. 시뮬레이터 + 실기기 수동 검증.

### 7.1 시뮬레이터 (Mac)

- [ ] iPhone 17 (iOS 26.4): 4탭 좌우 스와이프 정상
- [ ] iPad Air 11" M4: 4탭 좌우 스와이프 정상, 가로 모드 전환
- [ ] 양 끝(홈 왼쪽 / 더보기 오른쪽)에서 고무줄 + 햅틱
- [ ] **"찾을 수 없는 페이지" 절대 미노출** ⭐
- [ ] + 버튼이 기존처럼 add 화면 푸시 (스와이프와 무관)
- [ ] 탭바 색상이 스와이프 진행률에 따라 부드럽게 변화
- [ ] 각 탭 내부 ScrollView/FlatList 세로 스크롤 정상
- [ ] 빠른 좌우 플링 자연스러움
- [ ] 모달(거래 추가) 열린 상태에서 페이저 영향 없음

### 7.2 실기기 (TestFlight 베타)

- [ ] iPhone 실기기 햅틱 강도 적절
- [ ] 60fps 유지, 끊김 없음

### 7.3 회귀 검증

- [ ] 외부 진입(예: + 버튼 누른 후 add 화면에서 뒤로가기) 시 인덱스 정상 복귀
- [ ] Android 하드웨어 뒤로가기 동작 (홈으로 이동 / 앱 종료)
- [ ] 기존 5개 탭 화면의 헤더/콘텐츠 표시 정상

---

## 8. 의존성 변경

신규 패키지 2개. 버전은 `expo install`이 SDK 54 호환 버전으로 자동 결정.

```bash
cd mobile && npx expo install react-native-pager-view expo-haptics
```

iOS prebuild 결과물 사용 시 `cd ios && pod install` 또는 `npx expo prebuild --clean` 필요.

---

## 9. 파일 변경 범위

| 파일 | 변경 |
|---|---|
| `mobile/app/(tabs)/_layout.tsx` | **전면 재작성** (Tabs → PagerView + CustomBottomBar) |
| `mobile/src/components/navigation/TabBar.tsx` | **신규** |
| `mobile/package.json` | 의존성 2개 추가 |
| `mobile/ios/Podfile.lock` | prebuild 후 자동 갱신 |
| `mobile/app/(tabs)/{index,transactions,add,history,more}.tsx` | **변경 없음** |

---

## 10. 비범위 (Out of Scope)

- Android overdrag(고무줄) 커스텀 구현 — v1.1+ 후순위
- 탭 페이지 안에 또 다른 가로 스크롤 영역 추가 시의 제스처 우선순위 정밀 튜닝 — 현재 그런 영역 없음
- 페이지 전환 애니메이션 커스텀 (속도/이징) — PagerView 기본값 유지
- 탭 재진입 시 스크롤 위치 복원 — 기존 expo-router Tabs도 자동 복원 안 함, 동일 동작 유지

---

## 11. 위험 요소 및 대응

| 위험 | 대응 |
|---|---|
| `expo-router` Tabs를 버린 후 deep link 동작 변경 가능성 | `useSegments` 동기화로 커버. 검증 항목에 포함. |
| PagerView와 ScrollView 제스처 충돌 | PagerView가 directional disambiguation 자동 처리. iOS/Android 양쪽 검증. |
| 햅틱이 너무 자주 울림 | 400ms 디바운스. 사용자 피드백 보고 강도/주기 조정. |
| Android에서 양 끝 피드백 없음 | UX상 끝에서 정지하는 것만으로도 "찾을 수 없는 페이지" 회피 목표는 달성. |
| 페이저 인덱스와 router segment 불일치 | useEffect 동기화 + onPageSelected 콜백으로 양방향 추적. |

---

## 12. 성공 기준

1. 사용자가 어떤 탭에서든 좌우로 스와이프해 인접 탭으로 이동 가능.
2. 양 끝에서 더 스와이프해도 "찾을 수 없는 페이지" 절대 안 뜸.
3. iOS에서 양 끝에서 고무줄 + 햅틱 피드백 발생.
4. 탭바 활성 표시가 스와이프 진행에 맞춰 자연스럽게 변화.
5. + 버튼 동작 기존과 동일.
6. 60fps 유지, 끊김/지연 체감 없음.
