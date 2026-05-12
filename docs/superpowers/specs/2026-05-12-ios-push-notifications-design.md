# iOS 푸시 알림 (v1.1) 설계

**작성일**: 2026-05-12
**기능**: 모임 초대 / 더치페이 요청 시 받는 사람에게 iOS 푸시 알림 발송. 탭하면 `/notifications` 진입 + 해당 카드 자동 스크롤 + 하이라이트. 미확인 배지 카운트는 백엔드 `notificationsLastViewedAt` 기준.
**대상**: 작은 모임 (PocketPay) 모바일 (iOS) + 백엔드
**비범위**: Android FCM (메모리 `android_release_plan.md`에 별도 작업 계획됨)

---

## 1. 배경 및 목표

### 1.1 사용자 요청

> "앱이 안켜져도 폰에 알림이 갈 수 있게 하는 푸쉬 알림도 설정하자"

### 1.2 디자인 결정 (브레인스토밍 결과)

| 항목 | 결정 |
|---|---|
| 플랫폼 | iOS만 (Android는 메모리 따로 저장됨, 다음 작업) |
| 푸시 보낼 이벤트 | 모임 초대 + 더치페이 요청 둘 다 |
| 권한 요청 시점 | 지연 (가치 인지 후 안내 모달) |
| 푸시 탭 동작 | `/notifications` 이동 + 해당 카드 자동 스크롤 + 1초 하이라이트 |
| 미확인 배지 | 백엔드 저장 (`notificationsLastViewedAt`) |
| 토큰 관리 | 다중 기기 (배열) |
| 발송 인프라 | Expo Push API (Expo가 APNs 중계) |

---

## 2. 현황 분석

### 2.1 기존 알림 인프라

- 인앱 알림 시스템: 모임 초대 (`Team.pendingInvites`) + 더치페이 (`DutchRequest`)
- `/notifications` 화면 — 카드 통합 표시 (FlatList)
- NotificationBell (홈 헤더 우상단) — 빨간 배지 (현재는 pending 카운트)
- Expo SDK 54 사용 중

### 2.2 Apple 인프라 (Phase 1 출시 시 구축)

- Apple Developer 계정 가입 완료
- APNs Auth Key (.p8) 발급 완료 (Key ID `3G24J2DRSM`, Team ID `47TJBU97ZL`)
- Bundle ID: `com.jageunmoim.app`
- Sign in with Apple capability 이미 활성

→ APNs 추가 설정 거의 없음. Expo Push Service에 등록만 하면 됨.

### 2.3 알림 권한 현 상태

- iOS는 사용자가 명시적으로 "허용" 눌러야 푸시 받음
- 한 번 거절하면 자동 재요청 불가 (설정에서 직접)
- 현재 앱은 권한 요청 안 함

---

## 3. 아키텍처

### 3.1 전체 흐름

```
[알림 생성 (백엔드)]
모임 초대 또는 더치페이 발송
  ↓ 기존 로직 (Team.pendingInvites push 또는 DutchRequest insertMany)
  ↓ 신규 통합
push.service.sendPushToUser(recipientId, payload)
  ↓
User.pushTokens 배열 모두에 Expo Push API 호출
  ↓
Expo Push Service → APNs → iPhone

[받는 사용자]
잠금 화면에 푸시 표시
  ↓ 탭
앱 열림 (이미 열려있으면 포그라운드)
  ↓
Notifications.addNotificationResponseReceivedListener 트리거
  ↓
router.push("/notifications?highlight=<notificationId>")
  ↓
/notifications 진입:
  1. mount 시 markNotificationsViewed() 호출 → 배지 0
  2. highlight 파라미터 보고 해당 카드 위치 찾음
  3. scrollToIndex로 스크롤 + 1초 펄스 애니메이션

[미확인 배지]
새 알림 생성 (백엔드) → 푸시 발송 (위)
사용자가 종 누르면서 /notifications 진입 → markViewed 호출
배지 = pending 알림 중 createdAt > user.notificationsLastViewedAt 개수
```

---

## 4. 데이터 모델

### 4.1 User 모델 확장

```ts
interface IUser {
  // 기존 (email, name, nickname, handle, account, ...)

  pushTokens?: string[];              // 신규: Expo Push Token 배열
  notificationsLastViewedAt?: Date;   // 신규: 마지막 /notifications 진입 시각
}
```

**Mongoose 스키마**:
```ts
pushTokens: { type: [String], default: [] },
notificationsLastViewedAt: { type: Date },
```

`pushTokens`는 배열 — 다중 기기 지원. 토큰은 expo 형식 (`ExponentPushToken[xxx]`).

---

## 5. 백엔드 API

### 5.1 신규 엔드포인트

| 엔드포인트 | 설명 |
|---|---|
| `POST /account/push-token` | body `{ token }` — 현재 디바이스 토큰 등록 (배열에 push, 중복 dedupe) |
| `DELETE /account/push-token` | body `{ token }` — 로그아웃 시 토큰 제거 |
| `POST /account/notifications-viewed` | 알림 화면 진입 시 — `notificationsLastViewedAt = now` |
| `GET /account/notifications-unread-count` | 응답 `{ count: number }` — pending 중 createdAt > lastViewedAt |

### 5.2 push.service.ts (신규)

```ts
// 단일 사용자에게 푸시 발송
sendPushToUser(userId, { title, body, data }): Promise<void>
```

동작:
1. `User.findById(userId)` 로 pushTokens 조회
2. 토큰 0개면 return (오류 X)
3. 각 토큰에 Expo Push API 호출 (병렬, `Promise.allSettled`)
4. 응답에서 status="error" + details.error="DeviceNotRegistered" → 해당 토큰을 User.pushTokens에서 제거

**Expo Push API 호출**:
```ts
POST https://exp.host/--/api/v2/push/send
Content-Type: application/json
{
  "to": "ExponentPushToken[xxx]",
  "title": "회식비 더치페이",
  "body": "홍길동님이 ₩10,000 요청",
  "data": { "type": "dutch", "notificationId": "654abc..." },
  "sound": "default"
}
```

### 5.3 기존 service에 통합

**team.service.inviteMember** (마지막 부분):
```ts
team.pendingInvites.push({ ... });
await team.save();

// 신규: 푸시 발송 (비동기, 실패해도 invite는 성공)
const inviterName = await getDisplayName(ownerId, team);
pushService.sendPushToUser(user._id, {
  title: `${team.name} 초대`,
  body: `${inviterName}님이 초대했어요`,
  data: {
    type: "invite",
    notificationId: String(team._id), // /notifications에서 teamId로 식별
  },
}).catch(err => console.warn("Push failed", err));

return team;
```

**dutch.service.createDutchRequests** (insertMany 후):
```ts
const created = await DutchRequest.insertMany(docs);

// 각 알림에 푸시 발송
const requesterDisplayName = await getDisplayName(requesterId, team);
for (const doc of created) {
  const title = doc.memo
    ? `${doc.memo} 더치페이`
    : "더치페이 요청";
  pushService.sendPushToUser(doc.recipient, {
    title,
    body: `${requesterDisplayName}님이 ₩${amount.toLocaleString()} 요청`,
    data: {
      type: "dutch",
      notificationId: String(doc._id),
    },
  }).catch(err => console.warn("Push failed", err));
}
```

### 5.4 미확인 카운트 계산

`getUnreadCount(userId)`:
```ts
const user = await User.findById(userId).lean();
const since = user.notificationsLastViewedAt || new Date(0);

// 모임 초대 (pendingInvites는 Team 임베디드)
const teams = await Team.find({ "pendingInvites.user": userId }).lean();
let inviteUnread = 0;
for (const team of teams) {
  for (const invite of team.pendingInvites) {
    if (invite.user.toString() === String(userId) && invite.invitedAt > since) {
      inviteUnread++;
    }
  }
}

// 더치페이
const dutchUnread = await DutchRequest.countDocuments({
  recipient: userId,
  status: "pending",
  expiresAt: { $gt: new Date() },
  createdAt: { $gt: since },
});

return inviteUnread + dutchUnread;
```

---

## 6. 모바일 구조

### 6.1 신규 의존성

- `expo-notifications` — 권한 요청 + 토큰 발급 + 리스너
- iOS prebuild 후 `pod install` 또는 EAS Build 필요

### 6.2 권한 요청 UX (지연)

상태:
- `AsyncStorage["pushPermissionAsked"]`: 사용자에게 안내 모달 이미 보였는지

흐름:
```
첫 모임 초대 받음 (홈 fetch 결과 pendingInvitations 새로 생긴 것 감지)
  OR
첫 더치페이 발송 시도
  ↓
AsyncStorage["pushPermissionAsked"] 체크
  - true: skip
  - false: 인앱 안내 모달 띄움
    ┌──────────────────────────┐
    │  🔔 알림 받기              │
    │                            │
    │  모임 초대나 더치페이를      │
    │  바로 알 수 있게               │
    │  알림을 보내드릴까요?         │
    │                            │
    │  [나중에]    [허용하기]     │
    └──────────────────────────┘
  ↓ 허용하기
AsyncStorage["pushPermissionAsked"] = true
Notifications.requestPermissionsAsync() (iOS 시스템 모달)
  ↓ 시스템 허용
Notifications.getExpoPushTokenAsync() → token
POST /account/push-token { token }
```

### 6.3 신규/변경 파일

| 경로 | 종류 |
|---|---|
| `mobile/src/lib/push.ts` | 신규 — 권한/토큰/리스너 헬퍼 |
| `mobile/src/hooks/usePushPermission.ts` | 신규 — 권한 요청 모달 트리거 |
| `mobile/src/components/PushPermissionModal.tsx` | 신규 — 안내 모달 |
| `mobile/app/_layout.tsx` | 알림 탭 리스너 + deep link 처리 |
| `mobile/app/notifications.tsx` | mount 시 markViewed + highlight 처리 |
| `mobile/app/(tabs)/index.tsx` | NotificationBell count → unread 카운트로 |
| `mobile/src/api/account.ts` | pushToken / notifications-viewed / unread-count |
| `mobile/src/types/user.ts` | pushTokens / notificationsLastViewedAt |
| `mobile/src/store/authStore.ts` | logout 시 토큰 제거 |
| `mobile/app.json` | expo-notifications 플러그인 설정 |

### 6.4 push.ts 핵심 함수

```ts
// 권한 요청 + 토큰 발급
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null; // 시뮬레이터는 푸시 안 됨
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

// 알림 탭 리스너 등록
export function setupNotificationListener(router: Router): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      if (data?.notificationId) {
        router.push({
          pathname: "/notifications",
          params: { highlight: String(data.notificationId) },
        });
      }
    }
  );
  return () => subscription.remove();
}
```

### 6.5 _layout.tsx에서 리스너 설정

`AuthGuard` 안 또는 RootLayout에 useEffect:
```tsx
useEffect(() => {
  if (!user) return;
  const cleanup = setupNotificationListener(router);
  return cleanup;
}, [user, router]);
```

### 6.6 /notifications mount 시 markViewed + highlight

```tsx
const { highlight } = useLocalSearchParams<{ highlight?: string }>();
const flatListRef = useRef<FlatList>(null);

useEffect(() => {
  fetchPendingInvitations();
  fetchPendingDutchRequests();
  accountApi.markNotificationsViewed().catch(() => {});
}, []);

useEffect(() => {
  if (!highlight || unified.length === 0) return;
  const index = unified.findIndex((item) => {
    const id = item.type === "invite" ? item.data.teamId : item.data._id;
    return id === highlight;
  });
  if (index >= 0) {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
    }, 300);
  }
}, [highlight, unified]);
```

### 6.7 카드 하이라이트 효과

각 카드에 `isHighlighted` prop:
```tsx
const [highlighted, setHighlighted] = useState(isHighlighted);
useEffect(() => {
  if (isHighlighted) {
    setHighlighted(true);
    const t = setTimeout(() => setHighlighted(false), 1000);
    return () => clearTimeout(t);
  }
}, [isHighlighted]);

<View style={{
  ...,
  borderColor: highlighted ? "#3DD598" : "#E5E8EB",
  backgroundColor: highlighted ? "#E8FAF2" : "#FFFFFF",
  transform: [{ scale: highlighted ? 1.02 : 1 }],
}}>
```

(또는 Animated API로 부드럽게)

### 6.8 NotificationBell unread count

기존:
```tsx
count={pendingInvitations.length + pendingDutchRequests.length}
```

변경: fetchPendingInvitations/fetchPendingDutchRequests + 별도 `unreadCount` state 사용. 또는 클라이언트가 직접 계산:

```ts
const unreadCount = useMemo(() => {
  if (!user?.notificationsLastViewedAt) {
    return pendingInvitations.length + pendingDutchRequests.length;
  }
  const since = new Date(user.notificationsLastViewedAt).getTime();
  const invCount = pendingInvitations.filter((i) => new Date(i.invitedAt).getTime() > since).length;
  const dutchCount = pendingDutchRequests.filter((d) => new Date(d.createdAt).getTime() > since).length;
  return invCount + dutchCount;
}, [pendingInvitations, pendingDutchRequests, user?.notificationsLastViewedAt]);
```

→ 백엔드 endpoint 없이도 클라이언트 계산 가능 (이미 user.notificationsLastViewedAt를 user 객체에 포함하므로). `notifications-unread-count` 엔드포인트는 사실상 fallback용.

---

## 7. 권한 요청 트리거 위치

### 7.1 트리거 조건

다음 중 하나 발생 시 `usePushPermission` 훅이 모달 띄움:

1. **홈 진입 시 새 모임 초대 감지** (pendingInvitations.length > 0 + 아직 안 물음)
2. **더치페이 "납부 공유하기" 누르기 직전**

### 7.2 훅 구현

```ts
export function usePushPermission() {
  const [shouldShowModal, setShouldShowModal] = useState(false);

  const checkAndPromptIfNeeded = async () => {
    const asked = await AsyncStorage.getItem("pushPermissionAsked");
    if (asked === "true") return; // 이미 물어봤음 (허용/거절 무관)

    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") {
      // 이미 허용 (다른 경로로) — 토큰만 등록
      await registerAndUploadToken();
      await AsyncStorage.setItem("pushPermissionAsked", "true");
      return;
    }

    setShouldShowModal(true);
  };

  const handleAllow = async () => {
    setShouldShowModal(false);
    await AsyncStorage.setItem("pushPermissionAsked", "true");
    const token = await registerForPushNotifications();
    if (token) {
      await accountApi.registerPushToken(token);
    }
  };

  const handleSkip = async () => {
    setShouldShowModal(false);
    await AsyncStorage.setItem("pushPermissionAsked", "true");
  };

  return { shouldShowModal, checkAndPromptIfNeeded, handleAllow, handleSkip };
}
```

홈 화면 useEffect:
```tsx
const { checkAndPromptIfNeeded, ...} = usePushPermission();
useEffect(() => {
  if (pendingInvitations.length > 0 || pendingDutchRequests.length > 0) {
    checkAndPromptIfNeeded();
  }
}, [pendingInvitations.length, pendingDutchRequests.length]);
```

---

## 8. 엣지 케이스

| 케이스 | 처리 |
|---|---|
| 권한 거절 후 다시 켜고 싶음 | iOS 설정 앱에서 직접 켜야 함. 안내 모달에 "설정에서 변경 가능" 문구 |
| 시뮬레이터 | `Device.isDevice` 체크로 skip. 토큰 발급 안 함 |
| 토큰 invalid (앱 삭제 후 재설치) | Expo Push 응답에서 자동 감지 → User.pushTokens에서 제거 |
| 다중 기기 | pushTokens 배열로 모두에 발송 |
| 백그라운드 vs 포그라운드 | 백그라운드/잠금: 시스템 알림 + 탭 시 deep link. 포그라운드: 인앱 UI 갱신 (배지) + 시스템 배너(option) |
| 푸시 탭 시 로그아웃 상태 | _layout 리스너에서 user 체크 → 미로그인 시 무시 + AuthGuard가 로그인 화면으로 |
| Expo Push API 무료 한도 | iOS 사용자 적은 베타 단계는 충분. 모니터링 후 결정 |
| 알림 받았는데 만료된 더치페이 | /notifications에서 expired 필터되어 안 보임. 푸시는 이미 발송됨 (사용자 혼란 X) |
| 같은 사람 같은 알림 중복 푸시 방지 | 알림 생성 1회당 푸시 1회. 백엔드 자체 dedupe 없음 (불필요) |

---

## 9. 보안 / 프라이버시

- Push token은 인증된 사용자 본인만 등록/제거 (인증 미들웨어)
- Expo Push API는 인증 없음 (open) — token이 secret 역할
- 토큰 유출 시 다른 사람이 그 디바이스에 푸시 보낼 수 있음 (악용 가능). 단, 우리 백엔드만 알면 외부에서 접근 불가
- 알림 내용에 민감 정보 X (금액은 포함, 계좌번호는 본문에서 제외 — /notifications 카드에서만 표시)
- 로그아웃 시 토큰 제거 (다른 사용자가 같은 기기로 로그인 후 푸시 받는 거 방지)

---

## 10. 테스트 계획

### 10.1 백엔드

- [ ] `POST /account/push-token` 등록 + 중복 dedupe
- [ ] `DELETE /account/push-token` 제거
- [ ] `POST /account/notifications-viewed` `notificationsLastViewedAt` 갱신
- [ ] `GET /account/notifications-unread-count` 계산 정확
- [ ] 모임 초대 시 push 발송 (Expo Push API 콜 로그 확인)
- [ ] 더치페이 시 push 발송 (recipient 마다)
- [ ] 토큰 0개 사용자 → 알림 생성 정상 (push만 skip)
- [ ] 토큰 invalid → User.pushTokens에서 자동 제거

### 10.2 모바일 (실기기 필수)

- [ ] 가입 직후: 권한 요청 모달 안 뜸
- [ ] 첫 모임 초대 받음: 홈 진입 시 권한 요청 모달
- [ ] 모달 [나중에] → 모달 닫힘, 권한 요청 안 함
- [ ] 모달 [허용하기] → iOS 시스템 모달 → 허용 → 토큰 백엔드 등록 확인
- [ ] 권한 받은 후: 새 모임 초대 받으면 잠금 화면 푸시
- [ ] 새 더치페이 받으면 잠금 화면 푸시 (메모 포함 제목)
- [ ] 푸시 탭 → 앱 열림 → /notifications 진입 → 해당 카드 자동 스크롤 + 하이라이트
- [ ] /notifications 진입 후 빠져나옴 → 종 배지 0
- [ ] 새 알림 도착 → 배지 +1
- [ ] 로그아웃 → 토큰 백엔드에서 제거 확인

---

## 11. 비범위 (이번 작업 안 함)

- Android FCM (별도 작업 — 메모리 `android_release_plan.md`)
- 알림 종류별 on/off 토글 (v1.2+)
- 알림 소리 커스터마이즈
- iOS Critical Alerts
- 방해 금지 시간
- 푸시 통계 분석
- 푸시 클릭률 트래킹

---

## 12. 파일 변경 범위

### 백엔드 (8개)

| 경로 | 종류 |
|---|---|
| `backend/models/User.model.ts` | pushTokens + notificationsLastViewedAt 추가 |
| `backend/services/push/push.service.ts` | 신규 — Expo Push API 호출 + 토큰 cleanup |
| `backend/services/account/account.service.ts` | registerPushToken / removePushToken / markNotificationsViewed / getUnreadCount |
| `backend/services/team/team.service.ts` | inviteMember 끝에 push 통합 |
| `backend/services/dutch/dutch.service.ts` | createDutchRequests 끝에 push 통합 |
| `backend/controllers/account.controller.ts` | 4개 핸들러 추가 |
| `backend/routes/account.route.ts` | 4개 라우트 추가 |
| `backend/validators/auth.validator.ts` | pushTokenSchema 신규 |

### 모바일 (10개)

| 경로 | 종류 |
|---|---|
| `mobile/src/lib/push.ts` | 신규 — 권한/토큰/리스너 |
| `mobile/src/hooks/usePushPermission.ts` | 신규 |
| `mobile/src/components/PushPermissionModal.tsx` | 신규 |
| `mobile/app/_layout.tsx` | 리스너 설정 |
| `mobile/app/notifications.tsx` | markViewed + highlight 처리 |
| `mobile/app/(tabs)/index.tsx` | NotificationBell count → unread, 권한 모달 트리거 |
| `mobile/app/dutch.tsx` | "납부 공유하기" 누르기 전 권한 모달 트리거 |
| `mobile/src/api/account.ts` | 4개 API |
| `mobile/src/types/user.ts` | pushTokens / notificationsLastViewedAt |
| `mobile/src/store/authStore.ts` | logout 시 토큰 제거 |
| `mobile/app.json` | expo-notifications 플러그인 |
| `mobile/package.json` | expo-notifications 추가 |

---

## 13. 위험 요소

| 위험 | 대응 |
|---|---|
| Expo Push API 장애 | 백엔드 push는 비동기 fire-and-forget. 실패해도 인앱 알림은 정상 생성 |
| APNs 일시 장애 | Expo Push가 재시도 처리. 우리는 모니터링만 |
| iOS 권한 한 번 거절 시 재요청 불가 | 안내 모달에 "허용 안 한 채로 진행 가능, 나중에 설정에서 변경" 명시 |
| 새 dev build 필요 (expo-notifications 네이티브) | EAS Build 또는 `npx expo run:ios` 재실행. 기존 dev build 사용 시 권한 요청 모듈 미포함 |
| Expo project ID 누락 시 토큰 발급 실패 | `app.json`의 `extra.eas.projectId` 또는 EAS 빌드 시 자동 주입. 누락 감지 시 토스트로 알림 |
| 백엔드에서 사용자 displayName 가져오기 (push 본문) | populate 또는 별도 함수. 모임의 displayMode 따라 분기 |
| 푸시 도착 → 사용자 앱 열기 → 토큰 변경 가능 | refresh 시 push.ts에서 다시 토큰 가져와서 백엔드 등록 (idempotent) |

---

## 14. 성공 기준

1. 첫 모임 초대 받거나 첫 더치페이 발송 시 인앱 안내 모달
2. 허용 시 iOS 권한 요청 → 토큰 백엔드 등록
3. 모임 초대 받으면 잠금 화면 푸시 ("○○ 초대" + 초대자 이름)
4. 더치페이 받으면 잠금 화면 푸시 (메모 + 금액)
5. 푸시 탭 → /notifications + 해당 카드 자동 스크롤 + 하이라이트
6. /notifications 진입 시 미확인 카운트 0 리셋
7. 새 알림 도착 시 종 배지 +1
8. 로그아웃 시 토큰 제거
9. 다중 기기 (iPhone + iPad)에 모두 푸시 도착
10. 시뮬레이터는 정상 작동 (토큰 발급만 skip)
