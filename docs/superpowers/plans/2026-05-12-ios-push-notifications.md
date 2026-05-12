# iOS 푸시 알림 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모임 초대 / 더치페이 요청 시 iOS 푸시 알림 발송. 탭 → /notifications 자동 스크롤 + 하이라이트. 미확인 배지는 백엔드 `notificationsLastViewedAt` 기준.

**Architecture:** 백엔드는 Expo Push API 활용해 푸시 발송. User에 `pushTokens` 배열 + `notificationsLastViewedAt` 추가. 모바일은 expo-notifications로 권한/토큰 처리. 권한은 지연 요청 (가치 인지 후 안내 모달).

**Tech Stack:** Backend Express + Mongoose + axios. Mobile React Native + expo-notifications + AsyncStorage.

**Spec:** `docs/superpowers/specs/2026-05-12-ios-push-notifications-design.md`

**의존성**: Phase 2 (DutchRequest) 완료 상태. Apple Developer 계정 + APNs key 이미 등록됨.

**테스트 전략**: 실기기 필수 (시뮬레이터는 푸시 받지 않음). 단계별 commit 후 마지막 종합 E2E.

---

## File Structure

### 백엔드

| 경로 | 변경 |
|---|---|
| `backend/models/User.model.ts` | `pushTokens` + `notificationsLastViewedAt` 추가 |
| `backend/services/push/push.service.ts` | **신규** — Expo Push API 호출 + invalid token cleanup |
| `backend/services/account/account.service.ts` | registerPushToken / removePushToken / markNotificationsViewed / getUnreadCount 추가 |
| `backend/services/team/team.service.ts` | `inviteMember` 끝부분에 push 통합 |
| `backend/services/dutch/dutch.service.ts` | `createDutchRequests` 끝부분에 push 통합 |
| `backend/controllers/account.controller.ts` | 4개 핸들러 추가 (+ serializeUser에 새 필드 포함) |
| `backend/routes/account.route.ts` | 4개 라우트 추가 |
| `backend/validators/auth.validator.ts` | `pushTokenSchema` 신규 |

### 모바일

| 경로 | 변경 |
|---|---|
| `mobile/src/lib/push.ts` | **신규** — 권한/토큰/리스너 헬퍼 |
| `mobile/src/hooks/usePushPermission.ts` | **신규** |
| `mobile/src/components/PushPermissionModal.tsx` | **신규** |
| `mobile/src/api/account.ts` | 4개 push API |
| `mobile/src/types/user.ts` | pushTokens / notificationsLastViewedAt |
| `mobile/src/store/authStore.ts` | refreshUser에 새 필드 + logout 시 토큰 제거 |
| `mobile/app/_layout.tsx` | 알림 탭 리스너 + 권한 모달 렌더 |
| `mobile/app/notifications.tsx` | mount 시 markViewed + highlight 처리 |
| `mobile/app/(tabs)/index.tsx` | NotificationBell count → unread, 권한 모달 트리거 |
| `mobile/app/dutch.tsx` | "납부 공유하기" 직전 권한 모달 트리거 |
| `mobile/app.json` | expo-notifications 플러그인 + iOS infoPlist |
| `mobile/package.json` | expo-notifications 추가 |

---

## Task 1: User 모델 확장 (pushTokens + notificationsLastViewedAt)

**Files:**
- Modify: `backend/models/User.model.ts`

- [ ] **Step 1.1: 인터페이스 + 스키마 필드 추가**

기존 IUser:
```ts
interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  nickname: string;
  handle?: string;
  handleChangedAt?: Date;
  account?: IUserAccount;
  provider: "local" | "google" | "naver" | "kakao" | "apple";
  providerId?: string;
  oauthTokens?: IOauthTokens;
  createdAt: Date;
  updatedAt: Date;
}
```

추가:
```ts
interface IUser extends Document {
  // 기존 ...
  pushTokens?: string[];
  notificationsLastViewedAt?: Date;
  // 기존 ...
}
```

스키마 (account 다음, provider 이전):
```ts
pushTokens: { type: [String], default: [] },
notificationsLastViewedAt: { type: Date },
```

- [ ] **Step 1.2: 커밋**

```bash
git add backend/models/User.model.ts
git commit -m "feat(backend): User 모델에 pushTokens + notificationsLastViewedAt 추가

pushTokens: Expo Push Token 배열 (다중 기기 지원)
notificationsLastViewedAt: 마지막 /notifications 진입 시각 — 미확인 배지 계산용"
```

---

## Task 2: push.service.ts (Expo Push API)

**Files:**
- Create: `backend/services/push/push.service.ts`

- [ ] **Step 2.1: 디렉터리 + 파일 생성**

`backend/services/push/push.service.ts`:

```ts
const { User } = require("../../models/index");
const fetch = require("node-fetch");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

const sendPushToUser = async (userId, payload: PushPayload) => {
  const user = await User.findById(userId).select("pushTokens");
  if (!user || !user.pushTokens || user.pushTokens.length === 0) {
    return;
  }

  const messages = user.pushTokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    sound: "default",
  }));

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.warn("Expo push HTTP error", res.status);
      return;
    }

    const json: any = await res.json();
    const tickets = json.data || [];

    // invalid 토큰 자동 제거
    const invalidTokens: string[] = [];
    tickets.forEach((ticket: any, i: number) => {
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
      ) {
        invalidTokens.push(user.pushTokens[i]);
      }
    });

    if (invalidTokens.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { pushTokens: { $in: invalidTokens } },
      });
    }
  } catch (err) {
    console.warn("Expo push failed", err);
  }
};

module.exports = { sendPushToUser };
```

- [ ] **Step 2.2: node-fetch 의존성 확인**

```bash
grep node-fetch backend/package.json
```

없으면:
```bash
cd backend && npm install node-fetch@2
```

> **노트**: Node.js 18+ 환경이면 글로벌 `fetch` 사용 가능. `node-fetch` 불필요. `package.json`의 engines 또는 실행 환경 확인 후 선택.

- [ ] **Step 2.3: 커밋**

```bash
git add backend/services/push/push.service.ts backend/package.json backend/package-lock.json
git commit -m "feat(backend): push.service — Expo Push API 호출 + invalid token cleanup

sendPushToUser(userId, payload): User.pushTokens 모두에 발송
DeviceNotRegistered 응답 시 해당 토큰 자동 제거
실패 시 warn 로그만 (인앱 알림은 정상 생성)"
```

---

## Task 3: account service — push token + notifications viewed

**Files:**
- Modify: `backend/services/account/account.service.ts`

- [ ] **Step 3.1: 신규 함수들 추가**

`account.service.ts`의 `updateMyAccount` 함수 다음에 추가:

```ts
const registerPushToken = async (userId, token) => {
  if (!token || typeof token !== "string") {
    throw AppError.badRequest("올바른 토큰이 아닙니다.");
  }
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("사용자를 찾을 수 없습니다.");

  if (!user.pushTokens) user.pushTokens = [];
  if (!user.pushTokens.includes(token)) {
    user.pushTokens.push(token);
    await user.save();
  }
  return user;
};

const removePushToken = async (userId, token) => {
  if (!token) {
    throw AppError.badRequest("올바른 토큰이 아닙니다.");
  }
  await User.findByIdAndUpdate(userId, {
    $pull: { pushTokens: token },
  });
  return { success: true };
};

const markNotificationsViewed = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { notificationsLastViewedAt: new Date() },
    { new: true }
  );
  return user;
};

const getUnreadCount = async (userId) => {
  const { Team, DutchRequest } = require("../../models/index");
  const user = await User.findById(userId).select("notificationsLastViewedAt");
  const since = user?.notificationsLastViewedAt || new Date(0);

  // 모임 초대 — pendingInvites 임베디드
  const teams = await Team.find({ "pendingInvites.user": userId }).lean();
  let inviteUnread = 0;
  for (const team of teams) {
    for (const invite of team.pendingInvites || []) {
      if (
        invite.user.toString() === String(userId) &&
        new Date(invite.invitedAt).getTime() > since.getTime()
      ) {
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

  return { count: inviteUnread + dutchUnread };
};
```

`module.exports`에 4개 함수 추가:

```ts
module.exports = {
  getMyAccount,
  deleteMyAccount,
  changeMyPassword,
  checkHandleAvailable,
  updateProfile,
  updateHandle,
  updateMyAccount,
  registerPushToken,
  removePushToken,
  markNotificationsViewed,
  getUnreadCount,
};
```

- [ ] **Step 3.2: 커밋**

```bash
git add backend/services/account/account.service.ts
git commit -m "feat(backend): account.service — push token + notifications viewed + unread count

registerPushToken / removePushToken / markNotificationsViewed / getUnreadCount.
unreadCount: 모임 초대 + 더치페이 합산, notificationsLastViewedAt 기준."
```

---

## Task 4: account controller + route + validator

**Files:**
- Modify: `backend/controllers/account.controller.ts`
- Modify: `backend/routes/account.route.ts`
- Modify: `backend/validators/auth.validator.ts`

- [ ] **Step 4.1: controller 핸들러 추가**

기존 `serializeUser`에 새 필드 포함:

```ts
const serializeUser = (user) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  nickname: user.nickname,
  handle: user.handle,
  handleChangedAt: user.handleChangedAt,
  account: user.account,
  pushTokens: user.pushTokens,
  notificationsLastViewedAt: user.notificationsLastViewedAt,
  provider: user.provider,
});
```

`module.exports` 직전에 4개 핸들러 추가:

```ts
const registerPushTokenController = async (req, res) => {
  try {
    const user = await AccountService.registerPushToken(req.user.userId, req.body.token);
    res.status(200).json({ data: serializeUser(user) });
  } catch (err) {
    return handleError(res, err);
  }
};

const removePushTokenController = async (req, res) => {
  try {
    const result = await AccountService.removePushToken(req.user.userId, req.body.token);
    res.status(200).json({ data: result });
  } catch (err) {
    return handleError(res, err);
  }
};

const markNotificationsViewedController = async (req, res) => {
  try {
    const user = await AccountService.markNotificationsViewed(req.user.userId);
    res.status(200).json({ data: serializeUser(user) });
  } catch (err) {
    return handleError(res, err);
  }
};

const getUnreadCountController = async (req, res) => {
  try {
    const result = await AccountService.getUnreadCount(req.user.userId);
    res.status(200).json({ data: result });
  } catch (err) {
    return handleError(res, err);
  }
};
```

`module.exports`에 추가:
```ts
module.exports = {
  // ... 기존 ...
  registerPushTokenController,
  removePushTokenController,
  markNotificationsViewedController,
  getUnreadCountController,
};
```

- [ ] **Step 4.2: validator 신규**

`auth.validator.ts`에 추가:

```ts
const pushTokenSchema = {
  body: z.object({
    token: z.string().min(1).max(200),
  }),
};
```

`module.exports`에 `pushTokenSchema` 추가.

- [ ] **Step 4.3: 라우트 등록**

`account.route.ts`:

기존 import에 `pushTokenSchema` 추가:
```ts
const {
  changePasswordSchema,
  updateProfileSchema,
  updateHandleSchema,
  updateMyAccountSchema,
  pushTokenSchema,
} = require("../validators/auth.validator");
```

기존 라우트 등록 뒤에 추가:
```ts
// 푸시 토큰 등록/제거
router.post(
  "/push-token",
  validate(pushTokenSchema),
  AccountController.registerPushTokenController
);
router.delete(
  "/push-token",
  validate(pushTokenSchema),
  AccountController.removePushTokenController
);

// 알림 화면 진입 시 — 미확인 카운트 리셋
router.post(
  "/notifications-viewed",
  AccountController.markNotificationsViewedController
);

// 미확인 카운트 조회
router.get(
  "/notifications-unread-count",
  AccountController.getUnreadCountController
);
```

- [ ] **Step 4.4: 커밋**

```bash
git add backend/controllers/account.controller.ts backend/routes/account.route.ts backend/validators/auth.validator.ts
git commit -m "feat(backend): /account push-token / notifications-viewed / unread-count 라우트

- POST/DELETE /account/push-token
- POST /account/notifications-viewed
- GET /account/notifications-unread-count
- serializeUser에 pushTokens, notificationsLastViewedAt 포함"
```

---

## Task 5: team.service.inviteMember에 push 통합

**Files:**
- Modify: `backend/services/team/team.service.ts`

- [ ] **Step 5.1: pushService import + inviteMember 끝부분에 발송**

`team.service.ts` 상단 import 추가:
```ts
const pushService = require("../push/push.service");
```

`inviteMember` 함수의 `await team.save();` 다음, `return team;` 이전에 추가:

```ts
  await team.save();

  // 푸시 알림 발송 (실패해도 invite는 성공)
  try {
    // 초대자 표시명 결정 (모임 displayMode 따라)
    const inviter = await User.findById(ownerId).select("name nickname");
    const displayMode = team.displayMode || "nickname";
    const inviterName =
      displayMode === "realName"
        ? inviter?.name || inviter?.nickname || "누군가"
        : inviter?.nickname || inviter?.name || "누군가";

    pushService.sendPushToUser(user._id, {
      title: `${team.name} 모임 초대`,
      body: `${inviterName}님이 초대했어요`,
      data: {
        type: "invite",
        notificationId: String(team._id),
      },
    }).catch((err) => {
      console.warn("Push send failed (invite)", err);
    });
  } catch (e) {
    console.warn("Push setup failed (invite)", e);
  }

  return team;
};
```

- [ ] **Step 5.2: 커밋**

```bash
git add backend/services/team/team.service.ts
git commit -m "feat(backend): 모임 초대 시 푸시 알림 발송

inviteMember 끝에 pushService.sendPushToUser 통합.
초대자 이름은 모임 displayMode 따라 분기.
발송 실패해도 invite는 성공 (fire-and-forget)."
```

---

## Task 6: dutch.service에 push 통합

**Files:**
- Modify: `backend/services/dutch/dutch.service.ts`

- [ ] **Step 6.1: pushService import + createDutchRequests 끝에 발송**

`dutch.service.ts` 상단 import 추가:
```ts
const pushService = require("../push/push.service");
```

`createDutchRequests` 함수의 `await DutchRequest.insertMany(docs);` 다음에 추가 (return 이전):

```ts
  await DutchRequest.insertMany(docs);

  // 푸시 알림 발송 (실패해도 알림은 성공)
  try {
    const displayMode = team.displayMode || "nickname";
    const requesterDisplayName =
      displayMode === "realName"
        ? requester.name || requester.nickname || "누군가"
        : requester.nickname || requester.name || "누군가";

    const title = memo
      ? `${memo} 더치페이 요청`
      : "더치페이 요청";

    for (const recipientId of filteredRecipients) {
      pushService.sendPushToUser(recipientId, {
        title,
        body: `${requesterDisplayName}님이 ₩${amount.toLocaleString()} 요청`,
        data: {
          type: "dutch",
          // _id는 insertMany 후 docs에 자동 채워지지 않으므로
          // 받는 사람 + 팀 + createdAt 조합으로 client가 찾도록
          recipient: String(recipientId),
        },
      }).catch((err) => {
        console.warn("Push send failed (dutch)", err);
      });
    }
  } catch (e) {
    console.warn("Push setup failed (dutch)", e);
  }

  return { ... };
```

> **노트**: `insertMany` 후 각 doc의 _id가 필요한 경우 `await DutchRequest.insertMany(docs)`의 반환값(`created`)을 받아 사용. spec에서는 notificationId로 _id를 사용한다고 했으니 다음과 같이 수정:

수정:
```ts
const created = await DutchRequest.insertMany(docs);

// 푸시 발송 — 각 created._id를 notificationId로
try {
  const displayMode = team.displayMode || "nickname";
  const requesterDisplayName =
    displayMode === "realName"
      ? requester.name || requester.nickname || "누군가"
      : requester.nickname || requester.name || "누군가";

  const title = memo ? `${memo} 더치페이 요청` : "더치페이 요청";

  for (const doc of created) {
    pushService.sendPushToUser(doc.recipient, {
      title,
      body: `${requesterDisplayName}님이 ₩${amount.toLocaleString()} 요청`,
      data: {
        type: "dutch",
        notificationId: String(doc._id),
      },
    }).catch((err) => {
      console.warn("Push send failed (dutch)", err);
    });
  }
} catch (e) {
  console.warn("Push setup failed (dutch)", e);
}

return { ... };
```

- [ ] **Step 6.2: 커밋**

```bash
git add backend/services/dutch/dutch.service.ts
git commit -m "feat(backend): 더치페이 요청 시 푸시 알림 발송

createDutchRequests 끝에 각 recipient마다 푸시 발송.
제목: 메모 있으면 'XXX 더치페이 요청', 없으면 '더치페이 요청'.
notificationId에 DutchRequest._id 포함 — 클라이언트 deep link용."
```

---

## Task 7: 모바일 — 의존성 설치 + types/API/store

**Files:**
- Modify: `mobile/package.json` (expo-notifications 추가)
- Modify: `mobile/app.json` (플러그인 설정)
- Modify: `mobile/src/types/user.ts`
- Modify: `mobile/src/api/account.ts`
- Modify: `mobile/src/store/authStore.ts`
- Modify: `mobile/src/api/auth.ts` (MeResponse 확장)

- [ ] **Step 7.1: expo-notifications 설치**

```bash
cd mobile && npx expo install expo-notifications
```

- [ ] **Step 7.2: app.json 플러그인 + iOS infoPlist**

`mobile/app.json`의 `expo` 안에 추가 (또는 기존 plugins 배열에 추가):

```json
{
  "expo": {
    "plugins": [
      // ... 기존 ...
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3DD598"
        }
      ]
    ],
    "ios": {
      // ... 기존 ...
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

> **노트**: notification-icon.png는 별도 준비 또는 기존 icon 사용. 일단 기존 assets/icon.png 사용 또는 색만 지정.

수정안 (아이콘 없으면):
```json
[
  "expo-notifications",
  {
    "color": "#3DD598"
  }
]
```

- [ ] **Step 7.3: types/user.ts 확장**

```ts
export interface User {
  // ... 기존 ...
  pushTokens?: string[];
  notificationsLastViewedAt?: string;
}
```

- [ ] **Step 7.4: api/account.ts 확장**

```ts
// accountApi 안에 추가:
registerPushToken: (token: string) =>
  apiClient.post("/account/push-token", { token }) as Promise<
    DataResponse<unknown>
  >,

removePushToken: (token: string) =>
  apiClient.delete("/account/push-token", { token }) as Promise<
    DataResponse<{ success: boolean }>
  >,

markNotificationsViewed: () =>
  apiClient.post("/account/notifications-viewed", {}) as Promise<
    DataResponse<unknown>
  >,

getUnreadCount: () =>
  apiClient.get("/account/notifications-unread-count") as Promise<
    DataResponse<{ count: number }>
  >,
```

> **노트**: `apiClient.delete`가 body를 받는지 확인. 안 받으면 별도 처리 필요 (URL query로 보내거나 method 변경).

- [ ] **Step 7.5: api/auth.ts MeResponse 확장**

```ts
type MeResponse = {
  // ... 기존 ...
  pushTokens?: string[];
  notificationsLastViewedAt?: string;
};
```

- [ ] **Step 7.6: authStore.refreshUser에 새 필드 매핑**

```ts
refreshUser: async () => {
  try {
    const me = await authApi.me();
    const id = me.id || me._id;
    set({
      user: {
        // ... 기존 ...
        pushTokens: me.pushTokens,
        notificationsLastViewedAt: me.notificationsLastViewedAt,
      },
    });
  } catch { /* ... */ }
},
```

- [ ] **Step 7.7: 커밋**

```bash
git add mobile/package.json mobile/package-lock.json mobile/app.json mobile/src/types/user.ts mobile/src/api/account.ts mobile/src/api/auth.ts mobile/src/store/authStore.ts
git commit -m "feat(mobile): expo-notifications 설치 + types/API/store 확장

- expo-notifications 의존성 + app.json 플러그인
- User 타입에 pushTokens, notificationsLastViewedAt
- accountApi: registerPushToken / removePushToken / markNotificationsViewed / getUnreadCount
- authStore.refreshUser에 새 필드 매핑"
```

---

## Task 8: push.ts 헬퍼 + usePushPermission 훅 + 권한 모달

**Files:**
- Create: `mobile/src/lib/push.ts`
- Create: `mobile/src/hooks/usePushPermission.ts`
- Create: `mobile/src/components/PushPermissionModal.tsx`

- [ ] **Step 8.1: push.ts**

```ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { accountApi } from "@/api/account";

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
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

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data;
  } catch (e) {
    console.warn("getExpoPushTokenAsync failed", e);
    return null;
  }
}

export async function registerAndUploadToken(): Promise<string | null> {
  const token = await registerForPushNotifications();
  if (!token) return null;
  try {
    await accountApi.registerPushToken(token);
    return token;
  } catch (e) {
    console.warn("registerPushToken upload failed", e);
    return null;
  }
}
```

> **expo-device, expo-constants 확인**: 둘 다 Expo SDK 기본 의존성. `npx expo install expo-device expo-constants` 필요 시 수행.

- [ ] **Step 8.2: usePushPermission.ts**

```ts
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { registerAndUploadToken } from "@/lib/push";

const ASKED_KEY = "pushPermissionAsked";

export function usePushPermission() {
  const [shouldShowModal, setShouldShowModal] = useState(false);

  const checkAndPromptIfNeeded = useCallback(async () => {
    const asked = await AsyncStorage.getItem(ASKED_KEY);
    if (asked === "true") return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") {
      // 이미 허용된 상태 — 토큰만 등록 + asked 마킹
      await registerAndUploadToken();
      await AsyncStorage.setItem(ASKED_KEY, "true");
      return;
    }

    if (status === "denied") {
      // iOS는 한 번 거절하면 다시 못 물음. asked만 마킹
      await AsyncStorage.setItem(ASKED_KEY, "true");
      return;
    }

    // status === "undetermined" — 안내 모달 띄움
    setShouldShowModal(true);
  }, []);

  const handleAllow = useCallback(async () => {
    setShouldShowModal(false);
    await AsyncStorage.setItem(ASKED_KEY, "true");
    await registerAndUploadToken();
  }, []);

  const handleSkip = useCallback(async () => {
    setShouldShowModal(false);
    await AsyncStorage.setItem(ASKED_KEY, "true");
  }, []);

  return { shouldShowModal, checkAndPromptIfNeeded, handleAllow, handleSkip };
}
```

> **AsyncStorage 의존성 확인**: `@react-native-async-storage/async-storage` — 이미 다른 코드에서 쓰는지 확인:
> ```bash
> grep -r "@react-native-async-storage" mobile/src mobile/app
> ```
> 안 쓰고 있으면 `npx expo install @react-native-async-storage/async-storage` 필요.

- [ ] **Step 8.3: PushPermissionModal.tsx**

```tsx
import { View, Text, Modal, Pressable } from "react-native";
import { Bell } from "lucide-react-native";
import { Button } from "@/components/ui/Button";

type Props = {
  visible: boolean;
  onAllow: () => void;
  onSkip: () => void;
};

export function PushPermissionModal({ visible, onAllow, onSkip }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
        onPress={onSkip}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 24,
            width: "100%",
            maxWidth: 360,
            alignItems: "center",
          }}
        >
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: "#E8FAF2" }}
          >
            <Bell size={28} color="#3DD598" strokeWidth={2} />
          </View>
          <Text className="text-title font-pretendard-bold text-text-primary mb-2 text-center">
            알림 받기
          </Text>
          <Text className="text-body text-text-secondary text-center mb-6">
            모임 초대나 더치페이 요청을{"\n"}바로 알 수 있게 알림을 보내드릴까요?
          </Text>
          <View className="flex-row w-full" style={{ gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button label="나중에" variant="outline" size="md" onPress={onSkip} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="허용하기" variant="primary" size="md" onPress={onAllow} />
            </View>
          </View>
          <Text className="text-caption text-text-secondary mt-3 text-center">
            나중에 iOS 설정에서 변경할 수 있어요
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
```

- [ ] **Step 8.4: TypeScript 컴파일**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -E "push|usePushPermission|PushPermissionModal" | head -5
```

Expected: 에러 0건.

- [ ] **Step 8.5: 커밋**

```bash
git add mobile/src/lib/push.ts mobile/src/hooks/usePushPermission.ts mobile/src/components/PushPermissionModal.tsx
git commit -m "feat(mobile): push.ts 헬퍼 + usePushPermission 훅 + 안내 모달

- registerForPushNotifications: 권한 요청 + 토큰 발급 (시뮬레이터는 skip)
- registerAndUploadToken: 토큰 → 백엔드 등록
- usePushPermission: asked 상태 + 권한 status 따른 분기 로직
- PushPermissionModal: 안내 모달 (지연 요청 UX)"
```

---

## Task 9: _layout.tsx 알림 탭 리스너 + 권한 모달 마운트

**Files:**
- Modify: `mobile/app/_layout.tsx`

- [ ] **Step 9.1: import + 리스너 설정**

`mobile/app/_layout.tsx` 상단:
```tsx
import * as Notifications from "expo-notifications";
import { useRef } from "react";
import { usePushPermission } from "@/hooks/usePushPermission";
import { PushPermissionModal } from "@/components/PushPermissionModal";
```

알림 표시 동작 설정 (포그라운드도 배너 표시):

`SplashScreen.preventAutoHideAsync();` 다음에:
```ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

`AuthGuard` 컴포넌트 안에서, useEffect 추가:

```tsx
const { shouldShowModal, handleAllow, handleSkip } = usePushPermission();

useEffect(() => {
  if (!user) return;
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as {
        type?: string;
        notificationId?: string;
      };
      if (data?.notificationId) {
        router.push({
          pathname: "/notifications",
          params: { highlight: String(data.notificationId) },
        });
      } else {
        router.push("/notifications");
      }
    }
  );
  return () => subscription.remove();
}, [user, router]);
```

`AuthGuard`의 return JSX에 모달 추가:
```tsx
return (
  <>
    {children}
    <PushPermissionModal
      visible={shouldShowModal}
      onAllow={handleAllow}
      onSkip={handleSkip}
    />
  </>
);
```

> **노트**: 기존 AuthGuard 구조에 맞게 조정. fragment 또는 View로 감싸기.

- [ ] **Step 9.2: 로그아웃 시 토큰 제거**

`authStore.ts`의 `logout` 함수 수정:

기존:
```ts
logout: async () => {
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshToken");
  set({
    user: null,
    accessToken: null,
    refreshToken: null,
    error: null,
  });
},
```

변경:
```ts
logout: async () => {
  // 현재 디바이스의 push token을 백엔드에서 제거 (다른 사람이 같은 기기로 로그인 후
  // 이전 사용자 알림 받는 것 방지)
  try {
    const { registerForPushNotifications } = await import("@/lib/push");
    const token = await registerForPushNotifications();
    if (token) {
      const { accountApi } = await import("@/api/account");
      await accountApi.removePushToken(token).catch(() => {});
    }
  } catch {
    // 비치명적 — logout은 계속 진행
  }

  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshToken");
  set({
    user: null,
    accessToken: null,
    refreshToken: null,
    error: null,
  });
},
```

> **노트**: `registerForPushNotifications`은 이미 등록된 권한 상태에서 토큰을 다시 받음 (재호출 안전). 동적 import는 순환 의존성 방지용. 또는 상단에서 직접 import해도 OK.

- [ ] **Step 9.3: TypeScript 컴파일**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -E "_layout|authStore" | head -5
```

- [ ] **Step 9.4: 커밋**

```bash
git add mobile/app/_layout.tsx mobile/src/store/authStore.ts
git commit -m "feat(mobile): 알림 탭 리스너 + 권한 모달 마운트 + logout 토큰 제거

- _layout: Notifications.setNotificationHandler (포그라운드 배너)
- AuthGuard: addNotificationResponseReceivedListener — 탭 시 /notifications?highlight=ID
- PushPermissionModal AuthGuard에서 렌더
- logout: 백엔드에서 현재 토큰 제거 (다른 사용자 알림 방지)"
```

---

## Task 10: /notifications mount markViewed + highlight 자동 스크롤

**Files:**
- Modify: `mobile/app/notifications.tsx`

- [ ] **Step 10.1: import + useLocalSearchParams + ref**

상단 import 추가:
```tsx
import { useRef } from "react";
import { useLocalSearchParams } from "expo-router";
import { accountApi } from "@/api/account";
import type { FlatList as FlatListType } from "react-native";
```

`NotificationsScreen` 안:
```tsx
const { highlight } = useLocalSearchParams<{ highlight?: string }>();
const flatListRef = useRef<FlatListType<UnifiedItem>>(null);
```

- [ ] **Step 10.2: mount 시 markViewed**

기존 useEffect:
```tsx
useEffect(() => {
  fetchPendingInvitations();
  fetchPendingDutchRequests();
}, [fetchPendingInvitations, fetchPendingDutchRequests]);
```

변경:
```tsx
useEffect(() => {
  fetchPendingInvitations();
  fetchPendingDutchRequests();
  // 알림 화면 진입 — 미확인 카운트 리셋
  accountApi.markNotificationsViewed().catch(() => {});
  // user 객체에도 즉시 반영 (UI 즉시 갱신용)
  refreshUser();
}, [fetchPendingInvitations, fetchPendingDutchRequests]);
```

`refreshUser` selector 추가:
```tsx
const refreshUser = useAuthStore((s) => s.refreshUser);
```

`useAuthStore` import도 추가 필요.

- [ ] **Step 10.3: highlight 자동 스크롤**

unified useMemo 다음에 추가:
```tsx
useEffect(() => {
  if (!highlight || unified.length === 0) return;
  const index = unified.findIndex((item) => {
    const id =
      item.type === "invite" ? item.data.teamId : item.data._id;
    return String(id) === String(highlight);
  });
  if (index >= 0) {
    const t = setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.3,
      });
    }, 300);
    return () => clearTimeout(t);
  }
}, [highlight, unified]);
```

- [ ] **Step 10.4: FlatList에 ref + highlight prop 전달**

FlatList에 `ref={flatListRef}` 추가 + 카드 컴포넌트에 isHighlighted prop:

```tsx
<FlatList
  ref={flatListRef}
  // ... 기존 ...
  renderItem={({ item }) => {
    const itemId =
      item.type === "invite" ? item.data.teamId : item.data._id;
    const isHighlighted = String(itemId) === String(highlight);
    return item.type === "invite" ? (
      <InvitationCard
        invitation={item.data}
        isHighlighted={isHighlighted}
        onAccept={() => onAccept(item.data)}
        onReject={() => onReject(item.data)}
      />
    ) : (
      <DutchRequestCard
        request={item.data}
        isHighlighted={isHighlighted}
        onDismiss={() => onDismissDutch(item.data._id)}
      />
    );
  }}
  onScrollToIndexFailed={(info) => {
    // FlatList 짧을 때 scrollToIndex 실패할 수 있음
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: true,
      });
    }, 100);
  }}
/>
```

- [ ] **Step 10.5: InvitationCard / DutchRequestCard에 isHighlighted prop**

두 카드 컴포넌트 props 확장:

```tsx
function InvitationCard({
  invitation,
  isHighlighted,
  onAccept,
  onReject,
}: {
  invitation: Invitation;
  isHighlighted?: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [glow, setGlow] = useState(false);
  useEffect(() => {
    if (isHighlighted) {
      setGlow(true);
      const t = setTimeout(() => setGlow(false), 1500);
      return () => clearTimeout(t);
    }
  }, [isHighlighted]);

  return (
    <View
      className="rounded-2xl p-4 mb-3"
      style={{
        backgroundColor: glow ? "#E8FAF2" : "#FFFFFF",
        borderWidth: 1,
        borderColor: glow ? "#3DD598" : "#E5E8EB",
      }}
    >
      {/* ... 기존 내용 ... */}
    </View>
  );
}
```

같은 패턴 `DutchRequestCard`에도 적용.

> **Note**: `useState` import 누락되지 않게 확인. 기존 import에 `useState` 추가.

- [ ] **Step 10.6: 커밋**

```bash
git add mobile/app/notifications.tsx
git commit -m "feat(mobile): /notifications mount markViewed + highlight 자동 스크롤

- mount 시 accountApi.markNotificationsViewed + refreshUser
- highlight param 받아 해당 카드까지 scrollToIndex
- 카드에 isHighlighted prop — 1.5초 글로우 (배경 + 테두리)
- onScrollToIndexFailed 폴백"
```

---

## Task 11: NotificationBell count → unread + 권한 모달 트리거 (홈)

**Files:**
- Modify: `mobile/app/(tabs)/index.tsx`

- [ ] **Step 11.1: import + 훅 사용**

상단 import 추가:
```tsx
import { useMemo } from "react";
import { usePushPermission } from "@/hooks/usePushPermission";
```

`HomeScreen` 안:
```tsx
const { checkAndPromptIfNeeded } = usePushPermission();

// 새 알림 있을 때 권한 요청 시도
useEffect(() => {
  if (pendingInvitations.length > 0 || pendingDutchRequests.length > 0) {
    checkAndPromptIfNeeded();
  }
}, [pendingInvitations.length, pendingDutchRequests.length, checkAndPromptIfNeeded]);
```

- [ ] **Step 11.2: unread count 계산**

기존:
```tsx
count={pendingInvitations.length + pendingDutchRequests.length}
```

변경 — useMemo로 unread 계산:
```tsx
const unreadCount = useMemo(() => {
  const lastViewedRaw = user?.notificationsLastViewedAt;
  if (!lastViewedRaw) {
    return pendingInvitations.length + pendingDutchRequests.length;
  }
  const since = new Date(lastViewedRaw).getTime();
  const invCount = pendingInvitations.filter(
    (i) => new Date(i.invitedAt).getTime() > since
  ).length;
  const dutchCount = pendingDutchRequests.filter(
    (d) => new Date(d.createdAt).getTime() > since
  ).length;
  return invCount + dutchCount;
}, [pendingInvitations, pendingDutchRequests, user?.notificationsLastViewedAt]);
```

NotificationBell 두 곳:
```tsx
count={unreadCount}
```

- [ ] **Step 11.3: 커밋**

```bash
git add mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): 홈 NotificationBell count → unread 기준 + 권한 모달 트리거

- unreadCount = user.notificationsLastViewedAt 이후 생성된 알림만 카운트
- 새 알림 있을 때 usePushPermission.checkAndPromptIfNeeded 호출
  → 첫 가치 인지 시점에 권한 안내 모달 노출"
```

---

## Task 12: 더치페이 화면에서 권한 모달 트리거

**Files:**
- Modify: `mobile/app/dutch.tsx`

- [ ] **Step 12.1: 훅 import + handleShare에서 호출**

상단 import:
```tsx
import { usePushPermission } from "@/hooks/usePushPermission";
```

`DutchScreen` 안 state 옆:
```tsx
const { checkAndPromptIfNeeded } = usePushPermission();
```

`handleShare` 함수 시작 부분 (validation 통과 후, 백엔드 호출 직전)에 추가:

```tsx
const handleShare = async () => {
  if (!isValid) {
    // ... 기존 validation ...
    return;
  }

  // 팀 없을 때(수동 인원) — 기존처럼 단순 공유만
  if (!hasTeam || !currentTeam) {
    // ... 기존 ...
    return;
  }

  // ... recipients 계산 ...

  // 신규: 권한 모달 트리거 (요청 보내기 직전 = 가치 인지 시점)
  checkAndPromptIfNeeded();

  setSharing(true);
  try {
    // ... 기존 백엔드 호출 ...
  }
};
```

- [ ] **Step 12.2: 커밋**

```bash
git add mobile/app/dutch.tsx
git commit -m "feat(mobile): 납부 공유하기 직전 권한 모달 트리거

dutch.tsx의 handleShare에서 백엔드 호출 직전 usePushPermission 호출.
사용자가 더치페이 보내기 = 푸시 가치 인지 시점."
```

---

## Task 13: iOS dev build 재빌드 + expo-clipboard도 같이 적용

**Files:** (수정 없음, 빌드)

- [ ] **Step 13.1: iOS prebuild (선택, app.json 변경 반영용)**

```bash
cd /Users/jobogeun/aen-project/PocketPay/mobile
npx expo prebuild --platform ios
```

> **노트**: 만약 ios/ 디렉터리에 수동 수정 있으면 backup 후 재생성. 현재 프로젝트 패턴은 prebuild로 ios/ 재생성.

- [ ] **Step 13.2: pod install**

```bash
cd /Users/jobogeun/aen-project/PocketPay/mobile/ios && pod install
```

Expected: ExpoNotifications, ExpoClipboard 등이 Podfile.lock에 포함됨.

- [ ] **Step 13.3: 시뮬레이터 빌드 (또는 실기기)**

시뮬레이터:
```bash
cd /Users/jobogeun/aen-project/PocketPay/mobile/ios
xcodebuild -workspace app.xcworkspace -scheme app -configuration Debug \
  -destination "platform=iOS Simulator,id=<iPhone17 Pro UDID>" \
  -derivedDataPath build build
```

실기기 (실제 푸시 테스트):
```bash
cd /Users/jobogeun/aen-project/PocketPay/mobile
eas build --platform ios --profile development
```

> **노트**: 시뮬레이터는 푸시 못 받음. 실제 푸시 알림 검증은 실기기 필요. 단, 권한 요청 모달 UI / 토큰 발급 로직 등은 시뮬레이터에서도 부분 검증 가능.

- [ ] **Step 13.4: 설치**

```bash
xcrun simctl install booted mobile/ios/build/Build/Products/Debug-iphonesimulator/app.app
xcrun simctl launch booted com.jageunmoim.app
```

- [ ] **Step 13.5: 검증**

시뮬레이터:
- [ ] 앱 크래시 없이 부팅
- [ ] 더보기 → 프로필 → 내 계좌 [등록] → 정상
- [ ] /notifications 진입 시 [계좌번호 복사] 동작 (ExpoClipboard 포함됨)
- [ ] 첫 알림(받은 모임 초대 또는 더치페이) 받으면 PushPermissionModal 뜸
- [ ] [허용하기] → 시뮬레이터에선 시스템 모달은 뜨지만 토큰 발급 X (Device.isDevice 체크로 skip)

---

## Task 14: 종합 E2E (실기기 필수) + push + 메모리

- [ ] **Step 14.1: EAS Build for iOS (개발 빌드)**

```bash
cd mobile && eas build --platform ios --profile development
```

빌드 완료 후 TestFlight 또는 직접 .ipa 설치.

- [ ] **Step 14.2: 실기기 E2E**

A 계정 (요청자, 실기기 1) + B 계정 (받는 사람, 실기기 2 또는 같은 기기 토글):

- [ ] A: 모임 만들기 + B 초대 → B 기기에 잠금 화면 푸시 (작은 모임 모임 초대 + 초대자 이름)
- [ ] B: 푸시 탭 → 앱 열림 → /notifications 진입 + 해당 카드 자동 스크롤 + 글로우
- [ ] B: 종 누름 → 배지 0 (방금 진입했으니 미확인 0)
- [ ] A: 더치페이 메모 "회식비" + B에게 ₩10000 → B 기기에 푸시 ("회식비 더치페이 요청" + 금액)
- [ ] B: 푸시 탭 → /notifications → 해당 더치페이 카드 스크롤 + 글로우
- [ ] B: [계좌번호 복사] 동작
- [ ] B: [확인] dismiss
- [ ] B: 로그아웃 → A 계정으로 로그인 → 같은 기기에 A의 알림만 (B의 알림 안 받음)
- [ ] B: 권한 거절 케이스 — iOS 설정 > 작은 모임 > 알림 끔 → 새 알림 받아도 푸시 없음 (인앱은 정상)
- [ ] 다중 기기 (B의 iPhone + iPad 둘 다 로그인 가정) → 둘 다 푸시 받음

- [ ] **Step 14.3: 회귀 검증**

- [ ] 기존 모임 초대 수락/거절 정상
- [ ] 기존 더치페이 [확인] 정상
- [ ] 4탭 스와이프, 모임 생성, 프로필 편집 등 정상

- [ ] **Step 14.4: push**

```bash
cd /Users/jobogeun/aen-project/PocketPay
git push origin main
```

- [ ] **Step 14.5: 메모리 업데이트**

`v1_post_release_features.md`에 §7 추가:
- 2026-05-12: iOS 푸시 알림 완료
- User.pushTokens + notificationsLastViewedAt
- Expo Push API 통합
- 모임 초대 + 더치페이 발송
- 권한 지연 요청 + 안내 모달
- 푸시 탭 deep link + 자동 스크롤 + 글로우
- 미확인 배지 (lastViewedAt 기준)
- 다음: Android FCM (메모리 `android_release_plan.md`)

---

## Self-Review

### Spec 커버리지

| Spec 섹션 | Task |
|---|---|
| §4 User 모델 확장 | Task 1 |
| §5.1 신규 엔드포인트 4개 | Task 4 |
| §5.2 push.service | Task 2 |
| §5.3 기존 service에 통합 | Task 5 (team), 6 (dutch) |
| §5.4 미확인 카운트 계산 | Task 3 (getUnreadCount) |
| §6.1 expo-notifications 의존성 | Task 7 |
| §6.4 push.ts | Task 8 |
| §6.5 _layout 리스너 | Task 9 |
| §6.6 /notifications markViewed + highlight | Task 10 |
| §6.7 권한 요청 트리거 | Task 11 (홈), 12 (더치페이) |
| §6.8 unread count | Task 11 |
| §8 엣지 케이스 | 각 task 내 처리 (시뮬레이터 skip, invalid token cleanup, 권한 거절, 다중 기기) |
| §10 테스트 | Task 13, 14 |

모든 spec 요구사항이 task로 매핑됨. ✅

### Placeholder 체크

- "TBD/TODO" 없음
- 각 step에 실제 코드/명령
- 주석으로 명시한 "Note" 부분은 명확한 분기 가이드 (예: node-fetch vs global fetch, AsyncStorage 의존성 등)

### 타입 일관성

- `pushTokens: string[]`, `notificationsLastViewedAt: Date` — 백엔드/프론트 일치
- `accountApi.registerPushToken / removePushToken / markNotificationsViewed / getUnreadCount` — Task 7 정의, Task 8-11 사용 일치
- 푸시 payload data: `{ type, notificationId }` — Task 5/6 백엔드와 Task 9 모바일 리스너 일치
- `usePushPermission()` 훅 API: `{ shouldShowModal, checkAndPromptIfNeeded, handleAllow, handleSkip }` — Task 8 정의, Task 9/11/12 사용 일치

### 위험 영역

- **Task 7 app.json 플러그인**: notification-icon 없을 가능성. color만 설정으로 대체 가능. 빌드 실패 시 icon path 검증.
- **Task 9 logout 토큰 제거 — 동적 import**: 순환 의존성 회피용. 정적 import도 시도 가능, 안 되면 동적.
- **Task 10 scrollToIndex 실패**: FlatList 짧을 때 발생 가능. `onScrollToIndexFailed` 폴백 명시.
- **Task 13 prebuild**: ios/ 재생성. 수동 수정 있으면 손실 가능. 현재 프로젝트 패턴은 prebuild — 문제 없을 가능성 높음.
- **Task 14 실기기**: 푸시 받으려면 실기기 필수. 시뮬레이터는 부분 검증만.

이 계획대로 실행 시 spec의 모든 성공 기준 충족.
