# 모임 초대 수락/거절 + 알림 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이메일 초대 시 즉시 멤버 추가하지 않고 pending 상태로 저장 후 초대받은 사람이 수락/거절을 선택할 수 있도록 변경. 홈 헤더 좌측에 알림 종 + 배지 추가, `/notifications` 화면에서 모든 알림 모음.

**Architecture:** 백엔드 Team 모델에 `pendingInvites` 임베디드 배열 추가. 기존 `inviteMember()` 가 즉시 추가하던 것을 pendingInvites push로 변경. 새 엔드포인트 3개 (목록/수락/거절). 모바일은 `notificationStore` 대신 `teamStore`에 pendingInvitations 통합 (수락 시 팀 목록도 같이 갱신해야 하므로).

**Tech Stack:** Backend Express + Mongoose + TypeScript (CommonJS). Mobile React Native + Expo Router + Zustand + NativeWind.

**Spec:** `docs/superpowers/specs/2026-05-08-invitation-accept-reject-design.md`

**테스트 전략:** 백엔드는 단위 테스트 프레임워크 없음(`package.json`의 test 스크립트는 placeholder) → curl 또는 시뮬레이터에서 실제 동작 검증. 프론트엔드는 시뮬레이터 수동 검증.

---

## File Structure

| 경로 | 종류 | 책임 |
|---|---|---|
| `backend/models/Team.model.ts` | 수정 | `pendingInvites` 임베디드 배열 추가 |
| `backend/services/team/team.service.ts` | 수정 | `inviteMember` 동작 변경 + 3개 신규 함수 |
| `backend/controllers/invitation.controller.ts` | 신규 | invitation 엔드포인트 핸들러 |
| `backend/routes/invitation.route.ts` | 신규 | invitation 라우팅 |
| `backend/routes/index.ts` | 수정 | invitation route 등록 |
| `mobile/src/types/invitation.ts` | 신규 | Invitation 타입 정의 |
| `mobile/src/api/invitation.ts` | 신규 | invitation API 클라이언트 |
| `mobile/src/store/teamStore.ts` | 수정 | `pendingInvitations` + 3 액션 추가 |
| `mobile/src/components/ui/NotificationBell.tsx` | 신규 | 종 아이콘 + 배지 |
| `mobile/app/notifications.tsx` | 신규 | 알림 모음 화면 |
| `mobile/app/_layout.tsx` | 수정 | `Stack.Screen name="notifications"` 추가 |
| `mobile/app/(tabs)/index.tsx` | 수정 | 홈 헤더 좌측에 종 표시 (empty + 일반 둘 다) |

---

## Task 1: Team 모델에 pendingInvites 필드 추가

**Files:**
- Modify: `backend/models/Team.model.ts`

- [ ] **Step 1.1: ITeamPendingInvite 인터페이스 추가 + ITeam에 필드 추가**

`backend/models/Team.model.ts`:

```ts
import mongoose, { Document, Types } from "mongoose";

interface ITeamMember {
  user: Types.ObjectId;
  role: "owner" | "member";
  joinedAt: Date;
}

interface ITeamPendingInvite {
  user: Types.ObjectId;
  invitedBy: Types.ObjectId;
  invitedAt: Date;
}

interface ITeam extends Document {
  name: string;
  description: string;
  owner: Types.ObjectId;
  members: ITeamMember[];
  pendingInvites: ITeamPendingInvite[];
  inviteToken?: string;
  inviteTokenExpiry?: Date;
  feeAmount: number;
  feeDueDay: number;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new mongoose.Schema<ITeam>({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["owner", "member"], default: "member" },
        joinedAt: { type: Date, default: Date.now },
    }],
    pendingInvites: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        invitedAt: { type: Date, default: Date.now },
    }],
    inviteToken: { type: String, index: true, sparse: true },
    inviteTokenExpiry: { type: Date },
    feeAmount: { type: Number, default: 0 },
    feeDueDay: { type: Number, default: 1, min: 1, max: 31 },
}, {
    timestamps: true
});

module.exports = mongoose.model<ITeam>("Team", TeamSchema);
```

- [ ] **Step 1.2: TypeScript 컴파일 확인**

```bash
cd backend && npx tsc --noEmit 2>&1 | grep "Team.model" | head -5
```

Expected: Team.model.ts 관련 에러 0건.

- [ ] **Step 1.3: 커밋**

```bash
git add backend/models/Team.model.ts
git commit -m "feat(backend): Team 모델에 pendingInvites 임베디드 배열 추가

수락/거절 절차를 위한 사전 작업. user/invitedBy/invitedAt 3개 필드.
기존 팀 도큐먼트는 빈 배열로 자동 처리, 마이그레이션 불필요."
```

---

## Task 2: inviteMember 동작 변경 (pendingInvites로 push)

**Files:**
- Modify: `backend/services/team/team.service.ts:107-138`

- [ ] **Step 2.1: inviteMember 함수 수정**

기존 코드:
```ts
const inviteMember = async (teamId, ownerId, email) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    owner: ownerId,
  });

  if (!team) {
    throw AppError.forbidden("팀원 초대 권한이 없습니다.");
  }

    const user = await User.findOne({ email, provider: { $in: ["local", "google", "naver", "kakao"] } });

  if (!user) {
    throw AppError.notFound("초대할 사용자를 찾을 수 없습니다.");
  }

  const alreadyMember = team.members.some(
    (member) => member.user.toString() === user._id.toString()
  );

  if (alreadyMember) {
    throw AppError.badRequest("이미 팀원으로 등록된 사용자입니다.");
  }

  team.members.push({ user: user._id, role: "member" });
  await team.save();
  return team;
};
```

변경:
```ts
const inviteMember = async (teamId, ownerId, email) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    owner: ownerId,
  });

  if (!team) {
    throw AppError.forbidden("팀원 초대 권한이 없습니다.");
  }

  const user = await User.findOne({ email, provider: { $in: ["local", "google", "naver", "kakao"] } });

  if (!user) {
    throw AppError.notFound("초대할 사용자를 찾을 수 없습니다.");
  }

  const alreadyMember = team.members.some(
    (member) => member.user.toString() === user._id.toString()
  );

  if (alreadyMember) {
    throw AppError.badRequest("이미 팀원으로 등록된 사용자입니다.");
  }

  const alreadyInvited = team.pendingInvites.some(
    (invite) => invite.user.toString() === user._id.toString()
  );

  if (alreadyInvited) {
    throw AppError.badRequest("이미 초대한 사용자입니다.");
  }

  team.pendingInvites.push({
    user: user._id,
    invitedBy: ownerId,
    invitedAt: new Date(),
  });
  await team.save();
  return team;
};
```

- [ ] **Step 2.2: TypeScript 컴파일 확인**

```bash
cd backend && npx tsc --noEmit 2>&1 | grep "team.service" | head -5
```

Expected: 에러 0건.

- [ ] **Step 2.3: 커밋**

```bash
git add backend/services/team/team.service.ts
git commit -m "feat(backend): inviteMember 동작 변경 — 즉시 추가 → pending 큐로

team.members.push() → team.pendingInvites.push().
중복 초대 검증 추가 ('이미 초대한 사용자입니다').
초대받은 사람의 수락 절차는 다음 커밋에서 추가."
```

---

## Task 3: 초대 관련 service 함수 3개 추가

**Files:**
- Modify: `backend/services/team/team.service.ts` (export에 새 함수 3개 추가)

- [ ] **Step 3.1: getPendingInvitations 함수 추가**

`team.service.ts`의 `removeMember` 또는 적절한 위치 다음에 추가:

```ts
const getPendingInvitations = async (userId) => {
  if (!isValidObjectId(userId)) {
    throw AppError.badRequest("올바른 사용자 ID가 아닙니다.");
  }

  const teams = await Team.find({
    "pendingInvites.user": userId,
  })
    .populate("pendingInvites.invitedBy", "name email")
    .lean();

  // 본인의 pending invite만 추출하여 평탄화
  const invitations = teams.flatMap((team) =>
    team.pendingInvites
      .filter((p) => p.user.toString() === userId.toString())
      .map((p) => ({
        teamId: team._id,
        teamName: team.name,
        invitedBy: p.invitedBy,
        invitedAt: p.invitedAt,
      }))
  );

  return invitations;
};
```

- [ ] **Step 3.2: acceptInvitation 함수 추가**

```ts
const acceptInvitation = async (teamId, userId) => {
  if (!isValidObjectId(teamId) || !isValidObjectId(userId)) {
    throw AppError.badRequest("올바른 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    "pendingInvites.user": userId,
  });

  if (!team) {
    throw AppError.notFound("초대를 찾을 수 없습니다.");
  }

  // pendingInvites에서 본인 항목 제거
  team.pendingInvites = team.pendingInvites.filter(
    (p) => p.user.toString() !== userId.toString()
  );

  // members에 추가
  team.members.push({
    user: userId,
    role: "member",
    joinedAt: new Date(),
  });

  await team.save();
  return team;
};
```

- [ ] **Step 3.3: rejectInvitation 함수 추가**

```ts
const rejectInvitation = async (teamId, userId) => {
  if (!isValidObjectId(teamId) || !isValidObjectId(userId)) {
    throw AppError.badRequest("올바른 ID가 아닙니다.");
  }

  const team = await Team.findOne({
    _id: teamId,
    "pendingInvites.user": userId,
  });

  if (!team) {
    throw AppError.notFound("초대를 찾을 수 없습니다.");
  }

  team.pendingInvites = team.pendingInvites.filter(
    (p) => p.user.toString() !== userId.toString()
  );

  await team.save();
  return { success: true };
};
```

- [ ] **Step 3.4: module.exports 업데이트**

기존 `module.exports = { ... }` 블록에 3개 함수 추가:

```ts
module.exports = {
  // ... 기존 함수들 ...
  inviteMember,
  removeMember,
  // 새로 추가:
  getPendingInvitations,
  acceptInvitation,
  rejectInvitation,
};
```

(정확한 기존 export 목록은 파일을 열어서 확인)

- [ ] **Step 3.5: TypeScript 컴파일 확인**

```bash
cd backend && npx tsc --noEmit 2>&1 | grep "team.service" | head -5
```

Expected: 에러 0건.

- [ ] **Step 3.6: 커밋**

```bash
git add backend/services/team/team.service.ts
git commit -m "feat(backend): 초대 service 함수 3개 추가

- getPendingInvitations(userId): 본인이 받은 pending 초대 목록
- acceptInvitation(teamId, userId): pending → members로 이동
- rejectInvitation(teamId, userId): pending에서 제거"
```

---

## Task 4: invitation controller + route 신규

**Files:**
- Create: `backend/controllers/invitation.controller.ts`
- Create: `backend/routes/invitation.route.ts`
- Modify: `backend/routes/index.ts`

- [ ] **Step 4.1: invitation.controller.ts 신규 작성**

`backend/controllers/invitation.controller.ts`:

```ts
const teamService = require("../services/team/team.service");
const { asyncHandler } = require("../middleware/asyncHandler");

const getInvitations = asyncHandler(async (req, res) => {
  const invitations = await teamService.getPendingInvitations(req.user.userId);
  res.json(invitations);
});

const acceptInvitation = asyncHandler(async (req, res) => {
  const team = await teamService.acceptInvitation(
    req.params.teamId,
    req.user.userId
  );
  res.json({ success: true, team });
});

const rejectInvitation = asyncHandler(async (req, res) => {
  const result = await teamService.rejectInvitation(
    req.params.teamId,
    req.user.userId
  );
  res.json(result);
});

module.exports = {
  getInvitations,
  acceptInvitation,
  rejectInvitation,
};
```

> **참고**: `asyncHandler`가 없으면 다른 컨트롤러처럼 `try/catch`로 직접 처리. `backend/controllers/team.controller.ts`의 패턴을 따를 것.

- [ ] **Step 4.2: 다른 컨트롤러 패턴 확인**

```bash
head -20 backend/controllers/team.controller.ts
```

만약 try/catch 패턴이면 위 코드를 다음으로 변경:

```ts
const teamService = require("../services/team/team.service");

const getInvitations = async (req, res) => {
  try {
    const invitations = await teamService.getPendingInvitations(req.user.userId);
    res.json(invitations);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const acceptInvitation = async (req, res) => {
  try {
    const team = await teamService.acceptInvitation(
      req.params.teamId,
      req.user.userId
    );
    res.json({ success: true, team });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

const rejectInvitation = async (req, res) => {
  try {
    const result = await teamService.rejectInvitation(
      req.params.teamId,
      req.user.userId
    );
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

module.exports = {
  getInvitations,
  acceptInvitation,
  rejectInvitation,
};
```

기존 controller가 사용하는 패턴 그대로 매칭할 것.

- [ ] **Step 4.3: invitation.route.ts 신규 작성**

`backend/routes/invitation.route.ts`:

```ts
const express = require("express");
const router = express.Router();
const invitationController = require("../controllers/invitation.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");
const { validate } = require("../middleware/validate.middleware");
const { teamIdParamSchema } = require("../validators/team.validator");

router.use(loginUserVerify);

router.get("/", invitationController.getInvitations);
router.post(
  "/:teamId/accept",
  validate(teamIdParamSchema),
  invitationController.acceptInvitation
);
router.post(
  "/:teamId/reject",
  validate(teamIdParamSchema),
  invitationController.rejectInvitation
);

module.exports = router;
```

- [ ] **Step 4.4: routes/index.ts에 등록**

`backend/routes/index.ts` 수정:

```ts
const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth.route"));
router.use("/deals", require("./deal.route"));
router.use("/teams", require("./team.route"));
router.use("/fees", require("./fee.route"));
router.use("/ocr", require("./ocr.route"));
router.use("/account", require("./account.route"));
router.use("/invitations", require("./invitation.route"));

module.exports = router;
```

- [ ] **Step 4.5: TypeScript 컴파일 확인**

```bash
cd backend && npx tsc --noEmit 2>&1 | head -10
```

Expected: 에러 0건.

- [ ] **Step 4.6: 백엔드 dev 서버 시작 후 라우트 등록 확인**

```bash
cd backend && npm run dev
# 다른 터미널에서:
curl -s http://localhost:3000/health 2>/dev/null && echo "server up"
```

- [ ] **Step 4.7: 커밋**

```bash
git add backend/controllers/invitation.controller.ts backend/routes/invitation.route.ts backend/routes/index.ts
git commit -m "feat(backend): /invitations 엔드포인트 3개 신규

- GET /invitations: 본인의 pending 초대 목록
- POST /invitations/:teamId/accept
- POST /invitations/:teamId/reject

모두 인증 미들웨어 통과 필수."
```

---

## Task 5: 백엔드 수동 테스트 (curl 또는 시뮬레이터 통한 로컬 검증)

**Files:** (수정 없음, 검증만)

- [ ] **Step 5.1: 로컬 백엔드 + ngrok 구성 확인**

메모리에 따르면 사용자는 `npm run dev` + ngrok 사용. dev 서버가 떠있는 상태로 진행.

- [ ] **Step 5.2: 모바일 앱에서 invite 시도**

시뮬레이터에서:
1. 팀장 계정 로그인
2. 팀 상세 → "이메일 초대" → 다른 가입자 이메일 입력
3. 백엔드 로그 확인: `members` 변화 없고, MongoDB의 해당 팀에 `pendingInvites` 추가됨

검증 (MongoDB Compass 또는 mongo shell):
```js
db.teams.findOne({ _id: ObjectId("...") })
// 결과에 pendingInvites: [{ user, invitedBy, invitedAt }] 들어있어야 함
```

- [ ] **Step 5.3: GET /invitations 호출 확인**

다른 계정(초대받은 쪽)으로 로그인 후 시뮬레이터에서 (아직 UI 없으니 curl로):

```bash
TOKEN="<로그인 응답에서 받은 access token>"
curl -s -H "Authorization: Bearer $TOKEN" \
  https://<ngrok-url>/invitations | jq
```

Expected: pending 초대 1건 반환됨.

- [ ] **Step 5.4: POST /invitations/:teamId/accept 시도**

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  https://<ngrok-url>/invitations/<teamId>/accept | jq
```

Expected: `{ success: true, team: { ... members 에 추가됨 ... } }`.

DB 확인: pendingInvites에서 제거, members에 추가.

- [ ] **Step 5.5: POST /invitations/:teamId/reject 시도**

다른 초대 만들어서:

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  https://<ngrok-url>/invitations/<teamId>/reject | jq
```

Expected: `{ success: true }`. DB에서 pendingInvites 제거 확인.

- [ ] **Step 5.6: 엣지 케이스 검증**

- [ ] 같은 사람 두 번 초대 → 두 번째 시도 400 에러 ("이미 초대한 사용자입니다")
- [ ] 이미 멤버 초대 → 400 에러
- [ ] 미가입 이메일 초대 → 404 에러
- [ ] 본인이 받지 않은 초대를 accept 시도 → 404 에러

이슈 발견되면 즉시 수정 + 별도 커밋. 모두 통과 시 다음 단계.

---

## Task 6: 모바일 — Invitation 타입 + API 클라이언트

**Files:**
- Create: `mobile/src/types/invitation.ts`
- Create: `mobile/src/api/invitation.ts`

- [ ] **Step 6.1: types/invitation.ts 작성**

`mobile/src/types/invitation.ts`:

```ts
export type Invitation = {
  teamId: string;
  teamName: string;
  invitedBy: {
    _id: string;
    name: string;
    email?: string;
  };
  invitedAt: string;  // ISO string
};
```

- [ ] **Step 6.2: api/invitation.ts 작성**

`mobile/src/api/invitation.ts`:

```ts
import { apiClient } from "./client";
import type { Invitation } from "@/types/invitation";

export const invitationApi = {
  list: () => apiClient.get("/invitations") as Promise<Invitation[]>,
  accept: (teamId: string) =>
    apiClient.post(`/invitations/${teamId}/accept`) as Promise<{
      success: boolean;
      team: any;
    }>,
  reject: (teamId: string) =>
    apiClient.post(`/invitations/${teamId}/reject`) as Promise<{
      success: boolean;
    }>,
};
```

> **참고**: 다른 api 파일(`mobile/src/api/team.ts`)이 사용하는 정확한 패턴을 먼저 확인. apiClient 메서드 시그니처와 일치시킬 것.

- [ ] **Step 6.3: 다른 api 파일 패턴 확인**

```bash
head -30 mobile/src/api/team.ts
```

만약 다른 패턴이면 그 패턴에 맞게 invitation.ts 조정.

- [ ] **Step 6.4: TypeScript 컴파일 확인**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -E "invitation" | head -5
```

Expected: 에러 0건.

- [ ] **Step 6.5: 커밋**

```bash
git add mobile/src/types/invitation.ts mobile/src/api/invitation.ts
git commit -m "feat(mobile): Invitation 타입 + API 클라이언트 신규"
```

---

## Task 7: teamStore에 pendingInvitations 통합

**Files:**
- Modify: `mobile/src/store/teamStore.ts`

- [ ] **Step 7.1: store에 필드 + 액션 추가**

기존 teamStore의 state interface와 actions에 다음 추가:

```ts
import { invitationApi } from "@/api/invitation";
import type { Invitation } from "@/types/invitation";

// state interface 확장
interface TeamStoreState {
  // ... 기존 ...
  pendingInvitations: Invitation[];

  // 액션
  fetchPendingInvitations: () => Promise<void>;
  acceptInvitation: (teamId: string) => Promise<void>;
  rejectInvitation: (teamId: string) => Promise<void>;
}

// store 구현 안에 추가
pendingInvitations: [],

fetchPendingInvitations: async () => {
  try {
    const list = await invitationApi.list();
    set({ pendingInvitations: list });
  } catch (e) {
    // 비치명적, 조용히 실패
    console.warn("Failed to fetch pending invitations", e);
  }
},

acceptInvitation: async (teamId) => {
  await invitationApi.accept(teamId);
  // 로컬 상태 갱신 + 팀 목록 재페치
  set((s) => ({
    pendingInvitations: s.pendingInvitations.filter((p) => p.teamId !== teamId),
  }));
  await get().fetchTeams();
},

rejectInvitation: async (teamId) => {
  await invitationApi.reject(teamId);
  set((s) => ({
    pendingInvitations: s.pendingInvitations.filter((p) => p.teamId !== teamId),
  }));
},
```

> **참고**: `set((s) => ...)` 와 `get()` 사용 패턴은 기존 zustand store 형태에 맞춰 조정.

- [ ] **Step 7.2: 정확한 store 시그니처 확인**

```bash
head -50 mobile/src/store/teamStore.ts
```

기존 `interface` 이름과 set/get 사용 패턴에 맞게 위 코드 조정.

- [ ] **Step 7.3: TypeScript 컴파일 확인**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "teamStore" | head -5
```

Expected: 에러 0건.

- [ ] **Step 7.4: 커밋**

```bash
git add mobile/src/store/teamStore.ts
git commit -m "feat(mobile): teamStore에 pendingInvitations + 3 액션 추가

fetchPendingInvitations / acceptInvitation / rejectInvitation.
accept 시 fetchTeams 자동 호출로 새 팀 목록 갱신."
```

---

## Task 8: NotificationBell 컴포넌트

**Files:**
- Create: `mobile/src/components/ui/NotificationBell.tsx`

- [ ] **Step 8.1: 컴포넌트 작성**

`mobile/src/components/ui/NotificationBell.tsx`:

```tsx
import { Pressable, View, Text } from "react-native";
import { Bell } from "lucide-react-native";

type Props = {
  count: number;
  onPress: () => void;
};

export function NotificationBell({ count, onPress }: Props) {
  const display = count > 99 ? "99+" : String(count);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
    >
      <Bell size={24} color="#191F28" strokeWidth={2} />
      {count > 0 && (
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: "#EF4444",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 10,
              fontFamily: "Pretendard-Bold",
              lineHeight: 14,
            }}
          >
            {display}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 8.2: TypeScript 컴파일 확인**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "NotificationBell" | head -3
```

Expected: 에러 0건.

- [ ] **Step 8.3: 커밋**

```bash
git add mobile/src/components/ui/NotificationBell.tsx
git commit -m "feat(mobile): NotificationBell 컴포넌트 신규

종 아이콘 + 빨간 배지 (count ≥1일 때만). 99 초과 '99+'."
```

---

## Task 9: /notifications 화면 신규

**Files:**
- Create: `mobile/app/notifications.tsx`
- Modify: `mobile/app/_layout.tsx`

- [ ] **Step 9.1: notifications.tsx 화면 작성**

`mobile/app/notifications.tsx`:

```tsx
import { useEffect } from "react";
import { View, Text, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import { useTeamStore } from "@/store/teamStore";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import type { Invitation } from "@/types/invitation";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function InvitationCard({
  invitation,
  onAccept,
  onReject,
}: {
  invitation: Invitation;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <View
      className="bg-card rounded-2xl p-4 mb-3"
      style={{ borderWidth: 1, borderColor: "#E5E8EB" }}
    >
      <Text className="text-lg font-pretendard-bold text-text-primary mb-1">
        {invitation.teamName}
      </Text>
      <Text className="text-sub text-text-secondary mb-4">
        {invitation.invitedBy.name}님이 초대했어요 · {formatRelativeTime(invitation.invitedAt)}
      </Text>
      <View className="flex-row gap-2">
        <View style={{ flex: 1 }}>
          <Button label="거절" variant="outline" size="md" onPress={onReject} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="수락" variant="primary" size="md" onPress={onAccept} />
        </View>
      </View>
    </View>
  );
}

function EmptyView() {
  return (
    <View className="flex-1 items-center justify-center py-24">
      <View className="w-16 h-16 rounded-full bg-card items-center justify-center mb-4">
        <Bell size={28} color="#B0B8C1" strokeWidth={2} />
      </View>
      <Text className="text-section font-pretendard-semibold text-text-primary">
        새 알림이 없어요
      </Text>
      <Text className="text-sub text-text-secondary mt-1">
        모임 초대를 받으면 여기에 표시돼요
      </Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const invitations = useTeamStore((s) => s.pendingInvitations);
  const fetchPendingInvitations = useTeamStore((s) => s.fetchPendingInvitations);
  const acceptInvitation = useTeamStore((s) => s.acceptInvitation);
  const rejectInvitation = useTeamStore((s) => s.rejectInvitation);

  useEffect(() => {
    fetchPendingInvitations();
  }, [fetchPendingInvitations]);

  const onAccept = async (inv: Invitation) => {
    try {
      await acceptInvitation(inv.teamId);
      showToast("success", "초대 수락", `${inv.teamName}에 참가했어요`);
    } catch (e: any) {
      showToast("error", "수락 실패", e?.message ?? "다시 시도해주세요");
    }
  };

  const onReject = async (inv: Invitation) => {
    try {
      await rejectInvitation(inv.teamId);
      showToast("info", "초대 거절");
    } catch (e: any) {
      showToast("error", "거절 실패", e?.message ?? "다시 시도해주세요");
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="알림" onBack={() => router.back()} />
      {invitations.length === 0 ? (
        <EmptyView />
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.teamId}
          renderItem={({ item }) => (
            <InvitationCard
              invitation={item}
              onAccept={() => onAccept(item)}
              onReject={() => onReject(item)}
            />
          )}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        />
      )}
    </ScreenContainer>
  );
}
```

> **참고**: `Header`/`ScreenContainer`/`Button`/`showToast`의 정확한 props는 기존 사용처 확인 후 맞출 것.

- [ ] **Step 9.2: _layout.tsx에 라우트 등록**

`mobile/app/_layout.tsx`의 root Stack 부분 수정 — 기존 stack 항목들 사이에 추가:

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="(auth)" />
  <Stack.Screen name="add" />
  <Stack.Screen name="notifications" />  {/* 신규 */}
  <Stack.Screen name="team" />
  <Stack.Screen name="transaction" />
  <Stack.Screen name="change-password" />
  <Stack.Screen name="dutch" />
  <Stack.Screen name="+not-found" />
</Stack>
```

- [ ] **Step 9.3: TypeScript 컴파일 확인**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -E "notifications|invitation" | head -10
```

Expected: 에러 0건.

- [ ] **Step 9.4: 커밋**

```bash
git add mobile/app/notifications.tsx mobile/app/_layout.tsx
git commit -m "feat(mobile): /notifications 화면 신규 + 라우트 등록

빈 상태/카드 리스트/수락 거절 처리. teamStore의 pendingInvitations
구독해서 즉각 갱신. relative time 포매팅."
```

---

## Task 10: 홈 헤더 좌측에 NotificationBell 추가

**Files:**
- Modify: `mobile/app/(tabs)/index.tsx`

- [ ] **Step 10.1: import + count 계산**

`index.tsx` 상단 import 추가:

```tsx
import { NotificationBell } from "@/components/ui/NotificationBell";
```

`HomeScreen` 함수 안에 다음 hooks 추가 (기존 useTeamStore 호출 근처):

```tsx
const pendingInvitations = useTeamStore((s) => s.pendingInvitations);
const fetchPendingInvitations = useTeamStore((s) => s.fetchPendingInvitations);
```

기존 `useEffect` 또는 새 useEffect로 fetch 트리거. 기존 `isFocused` 의존성 useEffect가 있으면 거기 추가:

```tsx
useEffect(() => {
  if (isFocused) {
    fetchPendingInvitations();
  }
}, [isFocused, fetchPendingInvitations]);
```

- [ ] **Step 10.2: EmptyState 헤더(팀 없을 때)에 종 추가**

기존 코드 (`teams.length === 0` 분기):
```tsx
<View className="py-4">
  <Text className="text-section font-pretendard-semibold text-text-primary">
    작은 모임
  </Text>
</View>
```

변경:
```tsx
<View className="flex-row items-center justify-between py-4">
  <View className="flex-row items-center gap-3">
    <NotificationBell
      count={pendingInvitations.length}
      onPress={() => router.push("/notifications")}
    />
    <Text className="text-section font-pretendard-semibold text-text-primary">
      작은 모임
    </Text>
  </View>
</View>
```

- [ ] **Step 10.3: 일반 헤더(팀 있을 때)에 종 추가**

기존 코드 (`return ( <ScreenContainer scrollable={false}> ` 다음):
```tsx
<View className="flex-row items-center justify-between py-4">
  <Pressable
    onPress={() => sheetRef.current?.snapToIndex(0)}
    className="flex-row items-center gap-1"
  >
    <Text className="text-section font-pretendard-semibold text-text-primary">
      {currentTeam?.name || "팀 선택"}
    </Text>
    <ChevronDown size={20} color="#191F28" />
  </Pressable>
  ... 우측 팀원 관리 ...
</View>
```

변경 (좌측에 종 + 팀명 묶기):
```tsx
<View className="flex-row items-center justify-between py-4">
  <View className="flex-row items-center gap-3">
    <NotificationBell
      count={pendingInvitations.length}
      onPress={() => router.push("/notifications")}
    />
    <Pressable
      onPress={() => sheetRef.current?.snapToIndex(0)}
      className="flex-row items-center gap-1"
      style={{ flexShrink: 1 }}
    >
      <Text
        numberOfLines={1}
        className="text-section font-pretendard-semibold text-text-primary"
      >
        {currentTeam?.name || "팀 선택"}
      </Text>
      <ChevronDown size={20} color="#191F28" />
    </Pressable>
  </View>
  ... 우측 팀원 관리 (그대로) ...
</View>
```

`flexShrink: 1` + `numberOfLines={1}` 로 긴 팀명이 종을 가리지 않게 함.

- [ ] **Step 10.4: 시뮬레이터 검증 — Hot reload로 확인**

시뮬레이터(이미 떠있음)에서 변경 자동 적용. 확인:
- [ ] EmptyState(팀 없음) 헤더 좌측에 종 표시
- [ ] 종 옆에 "작은 모임" 텍스트
- [ ] 종 누르면 /notifications 화면 진입
- [ ] 팀이 있는 상태로 전환 시(다른 계정) 헤더 좌측에 종 + 팀명 + 우측에 팀원 아이콘
- [ ] pendingInvitations 0 → 종 옆에 빨간 배지 안 뜸
- [ ] pendingInvitations N → 종 옆에 빨간 배지 N

- [ ] **Step 10.5: 커밋**

```bash
git add mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): 홈 헤더 좌측에 알림 종 + 배지

EmptyState(팀 없음) / 일반(팀 있음) 양쪽에 추가.
isFocused 시 fetchPendingInvitations 호출.
긴 팀명 truncate 처리."
```

---

## Task 11: 종합 시뮬레이터 회귀 검증

**Files:** (수정 없음, 검증만)

- [ ] **Step 11.1: 풀 플로우 E2E 검증 (시뮬레이터 + ngrok 백엔드)**

준비:
- 시뮬레이터: 사용자 A(팀장), 별도 계정 B(초대받는 사람) — 사용자 B 계정이 가입돼 있어야 함

플로우:
- [ ] A로 로그인 → 팀 만들기 → 팀 상세 → 이메일 초대 → B의 이메일 입력
- [ ] 토스트 "초대 완료" 또는 유사 메시지
- [ ] A 화면에서 팀원 목록에 B는 **없음** (pendingInvites에만 있음)
- [ ] 로그아웃 후 B로 로그인
- [ ] 홈 진입 → 좌측 종에 빨간 "1" 배지
- [ ] 종 누름 → /notifications 화면
- [ ] 카드 1개: A의 모임 + 초대자 이름 + 시간
- [ ] [수락] 누름 → 토스트 "초대 수락" + 카드 사라짐 + 홈으로 돌아가면 A의 팀이 팀 목록에 보임
- [ ] 또 다른 초대 만들어서 [거절] 누름 → 토스트 "초대 거절" + 카드 사라짐 + 팀 목록 변화 X

- [ ] **Step 11.2: 엣지 케이스 검증 (시뮬레이터)**

- [ ] 종 카운트 100+ 일 때 "99+" 표시
- [ ] 팀명 긴 경우 종에 안 가림
- [ ] iPad Air 11" 시뮬레이터 검증 (반응형)

- [ ] **Step 11.3: 종합 회귀 검증 (다른 기능 깨지지 않았는지)**

- [ ] 4탭 스와이프 정상 (이전 작업 유지)
- [ ] 메시 그라디언트 EmptyState 정상
- [ ] + 버튼 → 거래 추가 정상
- [ ] 거래 탭 / 내역 탭 / 더보기 탭 정상

이슈 발견 시 즉시 수정 + 별도 commit.

---

## Task 12: 메모리 업데이트 + push

**Files:**
- Modify: `~/.claude/projects/-Users-jobogeun-aen-project-PocketPay/memory/project_status.md`

- [ ] **Step 12.1: 모든 commit 확인**

```bash
git log origin/main..HEAD --oneline
```

Expected: Task 1~10 정도 commit 보임.

- [ ] **Step 12.2: origin/main에 push**

```bash
git push origin main
```

- [ ] **Step 12.3: 메모리 업데이트**

`project_status.md` 또는 새 메모리에 다음 기록:
- 2026-05-08: 초대 수락/거절 + 알림 시스템 구현 완료
- 영향: Team 모델 pendingInvites 추가, /invitations 엔드포인트 3개, 홈 헤더 종 + /notifications 화면
- 다음: 남은 스와이프 파둘닝 (Task 4-8: 아이콘 색상 보간 / 햅틱 / 라우팅 동기화 / Android 백) 또는 사용자 보고 추가 오류

---

## Self-Review

### Spec 커버리지

| Spec 섹션 | 구현 Task |
|---|---|
| §3.2 백엔드 데이터 모델 (pendingInvites) | Task 1 |
| §3.2 inviteMember 수정 | Task 2 |
| §3.2 새 service 함수 3개 | Task 3 |
| §3.2 새 엔드포인트 3개 | Task 4 |
| §3.3 NotificationBell 컴포넌트 | Task 8 |
| §3.3 홈 헤더 수정 | Task 10 |
| §3.3 /notifications 화면 | Task 9 |
| §3.3 라우트 등록 | Task 9 |
| §3.3 API 클라이언트 | Task 6 |
| §3.3 스토어 통합 | Task 7 |
| §3.3 업데이트 시점 (focus) | Task 10 |
| §4 인터랙션 디테일 (시간/배지/카드) | Task 8, 9 |
| §5 엣지 케이스 (이미 초대/이미 멤버 등) | Task 2, 3 |
| §6 보안/검증 | Task 4 (인증 미들웨어) |
| §7 테스트 (백엔드/프론트) | Task 5, 11 |

모든 spec 요구사항이 task로 매핑됨. ✅

### Placeholder 체크

- "TBD/TODO" 없음
- 각 step에 실제 코드/명령 포함
- `> 참고` 형태로 명시한 곳은 "기존 패턴 따라 조정" 이라는 명확한 가이드 포함 (placeholder 아님)

### 타입 일관성

- `Invitation` 타입: Task 6에서 정의, Task 7/9에서 사용 — 일치
- `pendingInvitations` 필드명: Task 7/10에서 일치
- `fetchPendingInvitations`/`acceptInvitation`/`rejectInvitation` 액션명: Task 7/9/10에서 일치
- 백엔드 함수명: `getPendingInvitations`/`acceptInvitation`/`rejectInvitation` — Task 3에서 정의, Task 4에서 사용

### 위험 영역

- **Task 4 controller 패턴**: 기존 코드의 try/catch vs asyncHandler 패턴이 다를 수 있음. Step 4.2에서 명시적으로 확인하고 매칭하도록 가이드 포함.
- **Task 7 store 시그니처**: Zustand store의 정확한 set/get 패턴 확인 필요. Step 7.2에서 명시.
- **Task 9 컴포넌트 props**: Header/ScreenContainer/showToast의 정확한 시그니처 확인 필요. 코드에 `> 참고` 명시.

이 계획대로 실행 시 spec의 모든 성공 기준 충족.
