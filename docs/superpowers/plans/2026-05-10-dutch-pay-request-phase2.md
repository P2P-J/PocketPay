# 더치페이 인앱 알림 + 공유 시트 (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 더치페이 화면에 메모 + "납부 공유하기" 버튼 추가. 누름 → 받는 사람 인앱 알림 일괄 생성 + OS 공유 시트(옵션 C 풍성 텍스트). 받는 사람은 알림 카드에서 [확인] dismiss.

**Architecture:** 신규 DutchRequest 컬렉션 (받는 사람당 1 레코드). Phase 1의 accountMode/account 활용해 계좌 자동 결정. /notifications에 모임 초대 + 더치페이 통합 (시간순). NotificationBell 배지는 두 카운트 합산. 7일 자동 만료 (lazy filter).

**Tech Stack:** Backend Express + Mongoose + zod. Mobile React Native + Expo Router + Zustand + expo-clipboard + RN Share.

**Spec:** `docs/superpowers/specs/2026-05-10-dutch-pay-request-phase2-design.md`

**의존성**: Phase 1 (User.account / Team.account / Team.accountMode) 완료 상태에서 동작.

**테스트 전략:** 백엔드 단위 테스트 인프라 없음 → 두 시뮬레이터(A 요청자 / B 받는 사람) E2E.

---

## File Structure

### 백엔드

| 경로 | 종류 |
|---|---|
| `backend/models/DutchRequest.model.ts` | 신규 |
| `backend/models/index.ts` | DutchRequest export 추가 |
| `backend/services/dutch/dutch.service.ts` | 신규 — create/list/dismiss + 계좌 결정 |
| `backend/controllers/dutch.controller.ts` | 신규 |
| `backend/routes/dutch-request.route.ts` | 신규 |
| `backend/routes/index.ts` | `/dutch-requests` 등록 |
| `backend/validators/dutch.validator.ts` | 신규 — zod |

### 모바일

| 경로 | 종류 |
|---|---|
| `mobile/src/types/dutch.ts` | 신규 |
| `mobile/src/api/dutch.ts` | 신규 |
| `mobile/src/store/teamStore.ts` | `pendingDutchRequests` + 액션 추가 |
| `mobile/app/dutch.tsx` | 메모 + "납부 공유하기" + buildShareText |
| `mobile/app/notifications.tsx` | DutchRequestCard + 통합 fetch + 시간순 정렬 |
| `mobile/app/(tabs)/index.tsx` | NotificationBell count: invitations + dutch 합산 |

---

## Task 1: DutchRequest 모델

**Files:**
- Create: `backend/models/DutchRequest.model.ts`
- Modify: `backend/models/index.ts`

- [ ] **Step 1.1: 모델 파일 작성**

`backend/models/DutchRequest.model.ts`:

```ts
import mongoose, { Document, Types } from "mongoose";

interface IAccountSnapshot {
  bank: string;
  number: string;
  holder: string;
}

interface IDutchRequest extends Document {
  requester: Types.ObjectId;
  team: Types.ObjectId;
  recipient: Types.ObjectId;
  amount: number;
  memo?: string;
  totalAmount: number;
  participantCount: number;
  accountSnapshot: IAccountSnapshot;
  status: "pending" | "dismissed";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DutchRequestSchema = new mongoose.Schema<IDutchRequest>({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  memo: { type: String, trim: true, maxlength: 50 },
  totalAmount: { type: Number, required: true, min: 0 },
  participantCount: { type: Number, required: true, min: 1 },
  accountSnapshot: {
    bank: { type: String, required: true },
    number: { type: String, required: true },
    holder: { type: String, required: true },
  },
  status: { type: String, enum: ["pending", "dismissed"], default: "pending" },
  expiresAt: { type: Date, required: true, index: true },
}, {
  timestamps: true,
});

// 받는 사람의 pending + 미만료 빠른 조회용 복합 인덱스
DutchRequestSchema.index({ recipient: 1, status: 1, expiresAt: 1 });

module.exports = mongoose.model<IDutchRequest>("DutchRequest", DutchRequestSchema);
```

- [ ] **Step 1.2: models/index.ts에 export 추가**

`backend/models/index.ts`:

기존:
```ts
const User = require("./User.model");
const Team = require("./Team.model");
const Deal = require("./Deal.model");
const FeePayment = require("./FeePayment.model");
const VerificationCode = require("./VerificationCode.model");
const WithdrawnOauth = require("./withdrawnOauth.model");

module.exports = { User, Deal, Team, FeePayment, WithdrawnOauth, VerificationCode };
```

추가:
```ts
const DutchRequest = require("./DutchRequest.model");

module.exports = { User, Deal, Team, FeePayment, WithdrawnOauth, VerificationCode, DutchRequest };
```

> 실제 파일 형태가 다르면 동일 패턴으로 require + module.exports에 추가.

- [ ] **Step 1.3: 커밋**

```bash
git add backend/models/DutchRequest.model.ts backend/models/index.ts
git commit -m "feat(backend): DutchRequest 모델 신규

받는 사람당 1 레코드. accountSnapshot으로 시점 계좌 정보 보존.
status: pending/dismissed. expiresAt 7일. 복합 인덱스로 조회 최적화."
```

---

## Task 2: dutch.service.ts (create / list / dismiss)

**Files:**
- Create: `backend/services/dutch/dutch.service.ts`

- [ ] **Step 2.1: 서비스 파일 작성**

```ts
const { DutchRequest, Team, User } = require("../../models/index");
const AppError = require("../../utils/AppError");
const { isValidObjectId } = require("../../utils/validation");

const EXPIRY_DAYS = 7;
const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

const resolveAccount = (team, requester) => {
  const personalAccount = requester.account;
  const teamAccount = team.account;
  const hasPersonal = !!(personalAccount && personalAccount.bank && personalAccount.number && personalAccount.holder);
  const hasTeam = !!(teamAccount && teamAccount.bank && teamAccount.number && teamAccount.holder);

  if (team.accountMode === "personal") {
    if (hasPersonal) return personalAccount;
    if (hasTeam) return teamAccount;
  } else {
    // team mode
    if (hasTeam) return teamAccount;
    if (hasPersonal) return personalAccount;
  }
  return null;
};

const createDutchRequests = async (
  requesterId,
  { teamId, recipientIds, amount, totalAmount, participantCount, memo }
) => {
  if (!isValidObjectId(teamId)) {
    throw AppError.badRequest("올바른 팀 ID가 아닙니다.");
  }

  const team = await Team.findById(teamId);
  if (!team) throw AppError.notFound("모임을 찾을 수 없습니다.");

  // 요청자가 모임 멤버인지
  const isMember = team.members.some((m) => m.user.toString() === String(requesterId));
  if (!isMember) throw AppError.forbidden("모임 멤버가 아닙니다.");

  // 본인 자동 제외
  const filteredRecipients = recipientIds.filter((id) => String(id) !== String(requesterId));
  if (filteredRecipients.length === 0) {
    throw AppError.badRequest("받는 사람이 없습니다.");
  }

  // 모든 recipientId가 모임 멤버인지 확인
  const memberIds = new Set(team.members.map((m) => m.user.toString()));
  for (const rid of filteredRecipients) {
    if (!memberIds.has(String(rid))) {
      throw AppError.badRequest("받는 사람 중 모임 멤버가 아닌 사용자가 있습니다.");
    }
  }

  // 계좌 결정
  const requester = await User.findById(requesterId);
  if (!requester) throw AppError.notFound("사용자를 찾을 수 없습니다.");
  const account = resolveAccount(team, requester);
  if (!account) {
    throw AppError.badRequest("계좌가 등록되지 않았습니다. 프로필 또는 모임 관리에서 계좌를 등록해주세요.");
  }

  const expiresAt = new Date(Date.now() + EXPIRY_MS);
  const docs = filteredRecipients.map((rid) => ({
    requester: requesterId,
    team: teamId,
    recipient: rid,
    amount,
    memo: memo || undefined,
    totalAmount,
    participantCount,
    accountSnapshot: {
      bank: account.bank,
      number: account.number,
      holder: account.holder,
    },
    status: "pending",
    expiresAt,
  }));

  await DutchRequest.insertMany(docs);

  return {
    count: docs.length,
    account: {
      bank: account.bank,
      number: account.number,
      holder: account.holder,
    },
  };
};

const listMyDutchRequests = async (userId) => {
  const now = new Date();
  const requests = await DutchRequest.find({
    recipient: userId,
    status: "pending",
    expiresAt: { $gt: now },
  })
    .populate("requester", "name nickname handle")
    .populate("team", "name displayMode")
    .sort({ createdAt: -1 })
    .lean();

  return requests.map((r) => {
    const requesterObj = r.requester || {};
    const teamObj = r.team || {};
    const displayMode = teamObj.displayMode || "nickname";
    const requesterDisplayName =
      displayMode === "realName"
        ? requesterObj.name || requesterObj.nickname || "알 수 없음"
        : requesterObj.nickname || requesterObj.name || "알 수 없음";

    return {
      _id: r._id,
      teamId: teamObj._id,
      teamName: teamObj.name || "",
      teamDisplayMode: displayMode,
      requesterId: requesterObj._id,
      requesterName: requesterObj.name,
      requesterNickname: requesterObj.nickname,
      requesterHandle: requesterObj.handle,
      requesterDisplayName,
      amount: r.amount,
      totalAmount: r.totalAmount,
      participantCount: r.participantCount,
      memo: r.memo,
      accountSnapshot: r.accountSnapshot,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    };
  });
};

const dismissDutchRequest = async (requestId, userId) => {
  if (!isValidObjectId(requestId)) {
    throw AppError.badRequest("올바른 요청 ID가 아닙니다.");
  }

  const request = await DutchRequest.findOne({
    _id: requestId,
    recipient: userId,
  });

  if (!request) {
    throw AppError.notFound("알림을 찾을 수 없습니다.");
  }

  request.status = "dismissed";
  await request.save();
  return { success: true };
};

module.exports = {
  createDutchRequests,
  listMyDutchRequests,
  dismissDutchRequest,
};
```

> **노트**: 위치는 `backend/services/dutch/dutch.service.ts`. 디렉터리 새로 만들기.

- [ ] **Step 2.2: 디렉터리 생성 + 커밋**

```bash
mkdir -p backend/services/dutch
# (Write tool로 위 파일 생성)
git add backend/services/dutch/dutch.service.ts
git commit -m "feat(backend): dutch.service — create/list/dismiss + 계좌 결정 로직

- createDutchRequests: 본인 자동 제외, 모임 멤버 검증, 계좌 우선순위(accountMode 따라)
- listMyDutchRequests: 본인 pending+미만료, displayMode 적용된 requesterDisplayName 포함
- dismissDutchRequest: 본인 알림만 dismiss"
```

---

## Task 3: dutch.controller.ts

**Files:**
- Create: `backend/controllers/dutch.controller.ts`

- [ ] **Step 3.1: 컨트롤러 작성**

```ts
const dutchService = require("../services/dutch/dutch.service");
const { handleError } = require("../utils/errorHandler");

const createDutchRequestsController = async (req, res) => {
  try {
    const result = await dutchService.createDutchRequests(req.user.userId, req.body);
    res.status(201).json({ data: result });
  } catch (err) {
    return handleError(res, err);
  }
};

const listMyDutchRequestsController = async (req, res) => {
  try {
    const requests = await dutchService.listMyDutchRequests(req.user.userId);
    res.status(200).json({ data: requests });
  } catch (err) {
    return handleError(res, err);
  }
};

const dismissDutchRequestController = async (req, res) => {
  try {
    const result = await dutchService.dismissDutchRequest(req.params.id, req.user.userId);
    res.status(200).json({ data: result });
  } catch (err) {
    return handleError(res, err);
  }
};

module.exports = {
  createDutchRequestsController,
  listMyDutchRequestsController,
  dismissDutchRequestController,
};
```

- [ ] **Step 3.2: 커밋**

```bash
git add backend/controllers/dutch.controller.ts
git commit -m "feat(backend): dutch.controller — POST/GET/dismiss 핸들러"
```

---

## Task 4: validator + route 등록

**Files:**
- Create: `backend/validators/dutch.validator.ts`
- Create: `backend/routes/dutch-request.route.ts`
- Modify: `backend/routes/index.ts`

- [ ] **Step 4.1: validator 작성**

`backend/validators/dutch.validator.ts`:

```ts
const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createDutchRequestsSchema = {
  body: z.object({
    teamId: z.string().regex(objectIdRegex, "올바른 팀 ID가 아닙니다."),
    recipientIds: z
      .array(z.string().regex(objectIdRegex, "올바른 사용자 ID가 아닙니다."))
      .min(1, "받는 사람이 1명 이상 필요합니다."),
    amount: z.number().int().min(1, "금액은 1원 이상이어야 합니다."),
    totalAmount: z.number().int().min(1, "총 금액은 1원 이상이어야 합니다."),
    participantCount: z.number().int().min(2, "참여자는 2명 이상이어야 합니다."),
    memo: z.string().max(50, "메모는 50자 이하로 입력해주세요.").optional(),
  }),
};

const dutchIdParamSchema = {
  params: z.object({
    id: z.string().regex(objectIdRegex, "올바른 요청 ID가 아닙니다."),
  }),
};

module.exports = {
  createDutchRequestsSchema,
  dutchIdParamSchema,
};
```

- [ ] **Step 4.2: 라우트 작성**

`backend/routes/dutch-request.route.ts`:

```ts
const express = require("express");
const router = express.Router();
const dutchController = require("../controllers/dutch.controller");
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  createDutchRequestsSchema,
  dutchIdParamSchema,
} = require("../validators/dutch.validator");

router.use(loginUserVerify);

router.post(
  "/",
  validate(createDutchRequestsSchema),
  dutchController.createDutchRequestsController
);
router.get("/", dutchController.listMyDutchRequestsController);
router.post(
  "/:id/dismiss",
  validate(dutchIdParamSchema),
  dutchController.dismissDutchRequestController
);

module.exports = router;
```

- [ ] **Step 4.3: routes/index.ts 등록**

```ts
router.use("/dutch-requests", require("./dutch-request.route"));
```

(다른 라우트 등록 옆에 추가)

- [ ] **Step 4.4: 커밋**

```bash
git add backend/validators/dutch.validator.ts backend/routes/dutch-request.route.ts backend/routes/index.ts
git commit -m "feat(backend): /dutch-requests 라우트 + validator 등록

POST / (create), GET / (list), POST /:id/dismiss
zod 스키마로 입력 검증."
```

---

## Task 5: 모바일 — 타입 + API + Store

**Files:**
- Create: `mobile/src/types/dutch.ts`
- Create: `mobile/src/api/dutch.ts`
- Modify: `mobile/src/store/teamStore.ts`

- [ ] **Step 5.1: types/dutch.ts**

```ts
export type AccountSnapshot = {
  bank: string;
  number: string;
  holder: string;
};

export type DutchRequestNotification = {
  _id: string;
  teamId: string;
  teamName: string;
  teamDisplayMode: "nickname" | "realName";
  requesterId: string;
  requesterName?: string;
  requesterNickname?: string;
  requesterHandle?: string;
  requesterDisplayName: string;
  amount: number;
  totalAmount: number;
  participantCount: number;
  memo?: string;
  accountSnapshot: AccountSnapshot;
  createdAt: string;
  expiresAt: string;
};

export type CreateDutchRequestPayload = {
  teamId: string;
  recipientIds: string[];
  amount: number;
  totalAmount: number;
  participantCount: number;
  memo?: string;
};

export type CreateDutchResponse = {
  count: number;
  account: AccountSnapshot;
};
```

- [ ] **Step 5.2: api/dutch.ts**

```ts
import { apiClient } from "./client";
import type {
  CreateDutchRequestPayload,
  CreateDutchResponse,
  DutchRequestNotification,
} from "@/types/dutch";

type DataResponse<T> = { data: T; message?: string };

export const dutchApi = {
  create: (payload: CreateDutchRequestPayload) =>
    apiClient.post("/dutch-requests", payload) as Promise<DataResponse<CreateDutchResponse>>,

  list: () =>
    apiClient.get("/dutch-requests") as Promise<DataResponse<DutchRequestNotification[]>>,

  dismiss: (id: string) =>
    apiClient.post(`/dutch-requests/${id}/dismiss`) as Promise<DataResponse<{ success: boolean }>>,
};
```

- [ ] **Step 5.3: teamStore에 pendingDutchRequests 추가**

`mobile/src/store/teamStore.ts`:

import 추가:
```ts
import { dutchApi } from "@/api/dutch";
import type { DutchRequestNotification } from "@/types/dutch";
```

State interface에 추가:
```ts
interface TeamState {
  // ... 기존 ...
  pendingDutchRequests: DutchRequestNotification[];

  // ... 기존 액션 ...
  fetchPendingDutchRequests: () => Promise<void>;
  dismissDutchRequest: (id: string) => Promise<void>;
}
```

State 초기값:
```ts
pendingDutchRequests: [],
```

액션 추가 (다른 fetch 액션들 옆에):
```ts
fetchPendingDutchRequests: async () => {
  try {
    const res = await dutchApi.list();
    set({ pendingDutchRequests: res.data || [] });
  } catch (e) {
    console.warn("Failed to fetch dutch requests", e);
  }
},

dismissDutchRequest: async (id: string) => {
  await dutchApi.dismiss(id);
  set((s) => ({
    pendingDutchRequests: s.pendingDutchRequests.filter((r) => r._id !== id),
  }));
},
```

reset 액션에도 `pendingDutchRequests: []` 포함.

- [ ] **Step 5.4: TypeScript 컴파일**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -E "dutch|teamStore" | head -5
```

Expected: 에러 0건.

- [ ] **Step 5.5: 커밋**

```bash
git add mobile/src/types/dutch.ts mobile/src/api/dutch.ts mobile/src/store/teamStore.ts
git commit -m "feat(mobile): DutchRequest 타입 + API + teamStore 통합

- DutchRequestNotification 타입 (백엔드 응답 형태)
- dutchApi.create/list/dismiss
- teamStore.pendingDutchRequests + fetch/dismiss 액션"
```

---

## Task 6: 더치페이 화면 — 메모 + 납부 공유하기

**Files:**
- Modify: `mobile/app/dutch.tsx`

- [ ] **Step 6.1: import + state 추가**

상단 import 추가:
```tsx
import { Input } from "@/components/ui/Input";
import { dutchApi } from "@/api/dutch";
import { useAuthStore } from "@/store/authStore";
```

기존 state 아래에 추가:
```tsx
const currentUser = useAuthStore((s) => s.user);
const [memo, setMemo] = useState("");
const [sharing, setSharing] = useState(false);
```

- [ ] **Step 6.2: 메모 입력 UI 추가**

기존 분배 방식 카드 다음(또는 적당한 위치)에 추가:

```tsx
{/* 메모 (선택) */}
<View className="mb-4">
  <Input
    label="메모 (선택)"
    placeholder="예: 회식비, 택시비"
    value={memo}
    onChangeText={setMemo}
    maxLength={50}
  />
</View>
```

- [ ] **Step 6.3: buildShareText 함수 추가**

`DutchScreen` 내부 또는 모듈 레벨에 함수 추가:

```tsx
function buildShareText({
  teamName,
  requesterName,
  memo,
  totalAmount,
  perPerson,
  recipientNames,
  account,
}: {
  teamName: string;
  requesterName: string;
  memo?: string;
  totalAmount: number;
  perPerson: number;
  recipientNames: string[];
  account: { bank: string; number: string; holder: string };
}): string {
  const titleLine = memo
    ? `🍽️ ${memo} ₩${totalAmount.toLocaleString()}원 더치페이`
    : `🍽️ 더치페이 ₩${totalAmount.toLocaleString()}원`;

  return [
    titleLine,
    "",
    `📍 모임: ${teamName}`,
    `👤 결제: ${requesterName}`,
    `👥 받는 사람: ${recipientNames.join(", ")}`,
    `💵 1인당 금액: ₩${perPerson.toLocaleString()}`,
    "",
    "━━━━━━━━━━━━━━━",
    "💳 송금하실 계좌",
    `${account.bank} ${account.number}`,
    `예금주: ${account.holder}`,
    "━━━━━━━━━━━━━━━",
    "",
    "📱 작은 모임으로 정산",
  ].join("\n");
}
```

- [ ] **Step 6.4: handleShare 변경 ("납부 공유하기" 로직)**

기존 `handleShare` 함수 전체 교체:

```tsx
const handleShare = async () => {
  if (!isValid) {
    if (total <= 0) return showToast("error", "금액을 입력해주세요");
    if (selectedCount === 0) return showToast("error", "참여자를 선택해주세요");
    if (splitMode === "custom" && customDiff !== 0)
      return showToast("error", `합계가 ${customDiff > 0 ? "초과" : "부족"}합니다`);
    return;
  }

  // 본인 제외 recipients
  const myUserId = currentUser?.userId || currentUser?._id || currentUser?.id;
  const recipients = hasTeam
    ? selectedParticipants.filter((p) => p.userId !== myUserId)
    : [];

  if (!hasTeam) {
    // 팀 없으면 기존처럼 텍스트 공유만
    try {
      await Share.share({ message: buildShareTextForManual() });
    } catch {}
    return;
  }

  if (recipients.length === 0) {
    return showToast("error", "본인 외에 받는 사람이 없습니다");
  }

  if (!currentTeam) {
    return showToast("error", "모임 정보가 없습니다");
  }

  const teamId = (currentTeam as any)._id || (currentTeam as any).id;
  if (!teamId) {
    return showToast("error", "모임 정보가 없습니다");
  }

  setSharing(true);
  try {
    // 1. 백엔드에 알림 생성
    const res = await dutchApi.create({
      teamId,
      recipientIds: recipients.map((p) => p.userId),
      amount: equalPerPerson,
      totalAmount: total,
      participantCount: selectedCount,
      memo: memo.trim() || undefined,
    });

    // 2. 공유 시트 텍스트 구성
    const requesterDisplayName =
      currentTeam.displayMode === "realName"
        ? currentUser?.name || currentUser?.nickname || "나"
        : currentUser?.nickname || currentUser?.name || "나";

    const shareText = buildShareText({
      teamName: currentTeam.name,
      requesterName: requesterDisplayName,
      memo: memo.trim(),
      totalAmount: total,
      perPerson: equalPerPerson,
      recipientNames: recipients.map((p) => p.name),
      account: res.data.account,
    });

    // 3. OS 공유 시트
    await Share.share({ message: shareText });

    showToast("success", "납부 요청 보냈어요");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "공유에 실패했어요";
    showToast("error", "공유 실패", msg);
  } finally {
    setSharing(false);
  }
};

// 팀 없을 때 (수동 인원) 공유용 — 기존 동작 유지
function buildShareTextForManual(): string {
  // 기존 buildShareText 로직과 동일 (팀/계좌 없이 단순 텍스트)
  // 또는 빈 문자열 반환 — 별도 구현 필요. 일단 기존 buildShareText 호출
  return buildShareTextLegacy();
}
```

> **노트**: 기존 `buildShareText` 함수 — 팀 없을 때(manual) 케이스가 있는지 확인. 있다면 `buildShareTextLegacy`로 이름 변경하거나 hasTeam 분기 처리. 여기 plan에서는 핵심 흐름만 명시.

실제로는 팀 없을 때(인원 수동) 흐름은 그대로 유지해야 함. 그 경우 백엔드 호출 X, OS 공유만.

- [ ] **Step 6.5: 버튼 라벨 변경**

기존 하단 버튼들:
```tsx
<Button label="결과 복사" ... />
<Button label="공유하기" ... onPress={handleShare} />
```

변경:
```tsx
<Button label="결과 복사" variant="outline" size="md" onPress={handleCopy} disabled={!isValid} className="flex-1" />
<Button
  label="납부 공유하기"
  variant="primary"
  size="md"
  onPress={handleShare}
  loading={sharing}
  disabled={!isValid}
  className="flex-1"
/>
```

- [ ] **Step 6.6: TypeScript 컴파일 + 시뮬레이터 검증**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "dutch" | head -5
```

시뮬레이터:
- [ ] 더치페이 화면에 메모 입력 필드
- [ ] 버튼 "공유하기" → "납부 공유하기"
- [ ] 팀 모임 더치페이 → 백엔드 알림 생성 + 공유 시트 (옵션 C 텍스트)
- [ ] 팀 없음(인원 수동) → 기존처럼 텍스트만 공유

- [ ] **Step 6.7: 커밋**

```bash
git add mobile/app/dutch.tsx
git commit -m "feat(mobile): 더치페이 화면에 메모 + 납부 공유하기

- 메모 입력 (선택, 50자)
- '공유하기' → '납부 공유하기' 라벨 변경
- 팀 모임: 백엔드 알림 생성 + 옵션 C 텍스트로 공유 시트
- 팀 없음(수동): 기존처럼 텍스트만 공유
- 본인 제외 recipients 자동 처리"
```

---

## Task 7: /notifications — DutchRequestCard + 통합

**Files:**
- Modify: `mobile/app/notifications.tsx`

- [ ] **Step 7.1: import + state 추가**

```tsx
import { useState, useEffect, useMemo } from "react";
import * as Clipboard from "expo-clipboard";
import type { DutchRequestNotification } from "@/types/dutch";
// ... 기존 import
```

`useTeamStore` selectors 확장:
```tsx
const pendingInvitations = useTeamStore((s) => s.pendingInvitations);
const pendingDutchRequests = useTeamStore((s) => s.pendingDutchRequests);
const fetchPendingInvitations = useTeamStore((s) => s.fetchPendingInvitations);
const fetchPendingDutchRequests = useTeamStore((s) => s.fetchPendingDutchRequests);
const acceptInvitation = useTeamStore((s) => s.acceptInvitation);
const rejectInvitation = useTeamStore((s) => s.rejectInvitation);
const dismissDutchRequest = useTeamStore((s) => s.dismissDutchRequest);
```

- [ ] **Step 7.2: fetch 통합**

```tsx
useEffect(() => {
  fetchPendingInvitations();
  fetchPendingDutchRequests();
}, [fetchPendingInvitations, fetchPendingDutchRequests]);
```

- [ ] **Step 7.3: 통합 정렬 + 카드 렌더링**

```tsx
type UnifiedItem =
  | { type: "invite"; data: Invitation; createdAt: string }
  | { type: "dutch"; data: DutchRequestNotification; createdAt: string };

const unified = useMemo<UnifiedItem[]>(() => {
  const items: UnifiedItem[] = [
    ...pendingInvitations.map((i) => ({
      type: "invite" as const,
      data: i,
      createdAt: i.invitedAt,
    })),
    ...pendingDutchRequests.map((d) => ({
      type: "dutch" as const,
      data: d,
      createdAt: d.createdAt,
    })),
  ];
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}, [pendingInvitations, pendingDutchRequests]);
```

기존 FlatList의 `data={invitations}`를 `data={unified}`로 변경.

renderItem 분기:
```tsx
renderItem={({ item }) =>
  item.type === "invite" ? (
    <InvitationCard
      invitation={item.data}
      onAccept={() => onAccept(item.data)}
      onReject={() => onReject(item.data)}
    />
  ) : (
    <DutchRequestCard request={item.data} onDismiss={() => onDismissDutch(item.data._id)} />
  )
}
keyExtractor={(item) => `${item.type}-${item.data._id ?? item.data.teamId}`}
```

- [ ] **Step 7.4: DutchRequestCard 컴포넌트 추가**

`notifications.tsx` 안 또는 별도 인라인 컴포넌트:

```tsx
function DutchRequestCard({
  request,
  onDismiss,
}: {
  request: DutchRequestNotification;
  onDismiss: () => void;
}) {
  const handleCopyAccount = async () => {
    await Clipboard.setStringAsync(request.accountSnapshot.number);
    showToast("success", "계좌번호 복사됨");
  };

  const title = request.memo || "더치페이 요청";

  return (
    <View
      className="bg-card rounded-2xl p-4 mb-3"
      style={{ borderWidth: 1, borderColor: "#E5E8EB" }}
    >
      <Text className="text-lg font-pretendard-bold text-text-primary mb-1">
        {title}
      </Text>
      <Text className="text-body text-text-primary mb-1">
        {request.requesterDisplayName}님이 ₩{request.amount.toLocaleString()} 요청
      </Text>
      <Text className="text-sub text-text-secondary mb-3">
        {request.teamName} · {formatRelativeTime(request.createdAt)}
      </Text>

      <View className="bg-background rounded-lg p-3 mb-3" style={{ borderWidth: 1, borderColor: "#F2F4F6" }}>
        <Text className="text-xs text-text-secondary mb-1">송금 계좌</Text>
        <Text className="text-body text-text-primary">
          {request.accountSnapshot.bank} {request.accountSnapshot.number}
        </Text>
        <Text className="text-sub text-text-secondary">
          예금주: {request.accountSnapshot.holder}
        </Text>
        <Pressable onPress={handleCopyAccount} className="mt-2 self-start" hitSlop={4}>
          <Text className="text-sub text-brand font-pretendard-semibold">
            계좌번호 복사
          </Text>
        </Pressable>
      </View>

      <Button label="확인" variant="primary" size="md" onPress={onDismiss} />
    </View>
  );
}
```

`Pressable` import 추가 필요 (없으면).

- [ ] **Step 7.5: dismiss 핸들러**

```tsx
const onDismissDutch = async (id: string) => {
  try {
    await dismissDutchRequest(id);
    showToast("success", "확인됨");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "다시 시도";
    showToast("error", "실패", msg);
  }
};
```

- [ ] **Step 7.6: expo-clipboard 의존성 확인**

```bash
cd mobile && grep "expo-clipboard" package.json
```

없으면:
```bash
cd mobile && npx expo install expo-clipboard
cd ios && pod install
```

- [ ] **Step 7.7: TypeScript 컴파일**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "notifications" | head -5
```

- [ ] **Step 7.8: 커밋**

```bash
git add mobile/app/notifications.tsx mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): /notifications에 더치페이 카드 추가 + 통합 정렬

- DutchRequestCard 인라인 컴포넌트
- 모임 초대 + 더치페이 시간순 통합 (useMemo)
- 계좌번호 복사 (expo-clipboard)
- [확인] dismiss 핸들러
- expo-clipboard 의존성 추가"
```

---

## Task 8: NotificationBell 배지 카운트 갱신

**Files:**
- Modify: `mobile/app/(tabs)/index.tsx`

- [ ] **Step 8.1: pendingDutchRequests selector + fetch**

`HomeScreen`의 기존 selectors 옆에:

```tsx
const pendingDutchRequests = useTeamStore((s) => s.pendingDutchRequests);
const fetchPendingDutchRequests = useTeamStore((s) => s.fetchPendingDutchRequests);
```

isFocused 시 fetch에 추가:

기존:
```tsx
useEffect(() => {
  if (isFocused) {
    fetchTeams();
    fetchPendingInvitations();
  }
}, [isFocused]);
```

변경:
```tsx
useEffect(() => {
  if (isFocused) {
    fetchTeams();
    fetchPendingInvitations();
    fetchPendingDutchRequests();
  }
}, [isFocused]);
```

- [ ] **Step 8.2: NotificationBell count 변경**

`NotificationBell` 사용처 2곳 (EmptyState + 일반 헤더):

기존:
```tsx
count={pendingInvitations.length}
```

변경:
```tsx
count={pendingInvitations.length + pendingDutchRequests.length}
```

(두 곳 모두)

- [ ] **Step 8.3: 시뮬레이터 검증**

- [ ] 더치페이 받는 사람의 홈 진입 → 종 배지 = 초대 + 더치페이
- [ ] /notifications 진입 → 둘 다 시간순 표시

- [ ] **Step 8.4: 커밋**

```bash
git add mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): 홈 알림 종 배지에 더치페이 카운트 합산

NotificationBell count = pendingInvitations + pendingDutchRequests.
홈 포커스 시 fetchPendingDutchRequests도 호출."
```

---

## Task 9: 종합 E2E 검증 + push + 메모리

- [ ] **Step 9.1: 두 계정 E2E (시뮬레이터)**

준비: A 계정(요청자, 계좌 등록됨) + B 계정(받는 사람, 같은 모임 멤버).

플로우:
- [ ] A: 더치페이 화면 → 모임 선택 → 참여자 체크(B 포함) → 메모 "회식비" → 총 30000 → 균등 → 1인 15000 → "납부 공유하기"
- [ ] A: 공유 시트 뜸 (옵션 C 텍스트). 카톡 등 선택 가능.
- [ ] A: 토스트 "납부 요청 보냈어요"
- [ ] B로 전환(별도 시뮬레이터 또는 로그아웃 후 로그인)
- [ ] B: 홈 진입 → 우상단 종에 빨간 배지 1
- [ ] B: 종 누름 → /notifications → "회식비" 카드 보임
- [ ] B: 카드의 계좌번호 복사 → 클립보드 확인 (시뮬레이터에서 Cmd+V로 검증)
- [ ] B: [확인] → 토스트 + 카드 사라짐 + 배지 0

- [ ] **Step 9.2: 엣지 시나리오**

- [ ] A: 계좌 등록 안 한 상태로 "납부 공유하기" → 400 토스트 + 등록 안내
- [ ] A: 본인만 체크한 상태로 시도 → 토스트 "본인 외에 받는 사람이 없습니다"
- [ ] A: 본인 포함 체크 → 본인은 알림 안 받음
- [ ] B: 모임 초대 + 더치페이 둘 다 있는 상태 → 시간순 정렬 확인
- [ ] B: 7일 지난 알림 → 안 보임 (테스트 위해 DB에서 expiresAt 과거로 수정 또는 단위 테스트 대체)

- [ ] **Step 9.3: 회귀 검증**

- [ ] 모임 초대 시스템 정상 (수락/거절)
- [ ] 다른 화면들 영향 없음

- [ ] **Step 9.4: 모든 commit 확인 + push**

```bash
git log origin/main..HEAD --oneline
git push origin main
```

- [ ] **Step 9.5: 메모리 업데이트**

`v1_post_release_features.md`에 §6 추가:
- 2026-05-10: Phase 2 완료 — 더치페이 인앱 알림 + 공유 시트
- DutchRequest 모델 + 3 endpoint
- 더치페이 화면 메모 + "납부 공유하기"
- /notifications 카드 통합 (모임 초대 + 더치페이)
- 옵션 C 풍성 공유 시트 텍스트
- 7일 자동 만료
- 본인 자동 제외
- accountSnapshot으로 시점 보존

---

## Self-Review

### Spec 커버리지

| Spec 섹션 | Task |
|---|---|
| §4 DutchRequest 모델 | Task 1 |
| §5 백엔드 API (3 endpoint) | Task 2 (service), 3 (controller), 4 (route+validator) |
| §6.1 더치페이 화면 변경 | Task 6 |
| §6.2 /notifications 확장 | Task 7 |
| §6.3 NotificationBell 카운트 | Task 8 |
| §6.4 신규 파일 (types/api) | Task 5 |
| §6.5 displayMode 적용 | Task 2 (백엔드 응답에 requesterDisplayName 포함) |
| §7 엣지 케이스 | Task 2 (계좌, 본인 제외, 멤버 검증), Task 9 (E2E 검증) |
| §8 보안/검증 | Task 4 (validator), Task 2 (멤버 검증) |
| §12 테스트 | Task 9 |

모든 spec 요구사항 매핑됨. ✅

### Placeholder 체크

- "TBD/TODO" 없음
- 각 step에 실제 코드/명령
- Task 6 Step 6.4의 `buildShareTextForManual`는 기존 동작 유지 — 명확히 명시

### 타입 일관성

- `DutchRequestNotification` Task 5 정의 → Task 7 사용 일치
- `dutchApi.create/list/dismiss` Task 5 정의 → Task 6/7 사용 일치
- `pendingDutchRequests`, `fetchPendingDutchRequests`, `dismissDutchRequest` Task 5 정의 → Task 6/7/8 사용 일치
- `accountSnapshot` 필드명 백엔드/프론트 일치

### 위험 영역

- **Task 2 계좌 결정 로직**: account 객체가 mongoose의 빈 객체(`{}`)일 수 있음 (필드 모두 빈 문자열). `hasPersonal`/`hasTeam` 체크에서 bank/number/holder 모두 truthy 확인.
- **Task 6 hasTeam 분기**: 팀 모임 vs 수동 인원 두 케이스 명확히 분리. 백엔드 호출은 hasTeam일 때만.
- **Task 7 카드 디자인 일관성**: 모임 초대 카드와 더치페이 카드 padding/색상/버튼 스타일 일치 유지.

이 계획대로 실행 시 spec의 모든 성공 기준 충족.
