# 모임 카테고리 + 계좌 시스템 (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모임 생성 시 카테고리/표시/계좌모드/회비 사용 4가지를 사용자가 선택. User에 개인 계좌, Team에 모임 통장 시스템. displayMode에 따른 멤버 표시 분기.

**Architecture:** Team 모델에 5개 필드(category/displayMode/accountMode/feeEnabled/account) 추가, User에 account 추가. AccountForm 재사용 컴포넌트로 모임 통장과 개인 계좌 양쪽 처리. 디폴트 조합(친구/닉네임/개인/회비X)으로 토글 안 만져도 빠른 생성.

**Tech Stack:** Backend Express + Mongoose. Mobile React Native + Expo Router + Zustand + NativeWind.

**Spec:** `docs/superpowers/specs/2026-05-10-team-category-account-system-design.md`

**테스트 전략:** 백엔드 단위 테스트 인프라 없음 → 시뮬레이터 + curl 수동 검증.

---

## File Structure

### 백엔드

| 경로 | 변경 |
|---|---|
| `backend/models/Team.model.ts` | category/displayMode/accountMode/feeEnabled/account 필드 추가 |
| `backend/models/User.model.ts` | account 필드 추가 |
| `backend/services/team/team.service.ts` | createTeam/updateTeam에 새 필드 받기, populate에 name 보장 |
| `backend/services/account/account.service.ts` | updateMyAccount 신규 |
| `backend/controllers/team.controller.ts` | body에서 새 필드 수용 |
| `backend/controllers/account.controller.ts` | updateMyAccountController + getMyAccount 응답에 account 포함 |
| `backend/routes/account.route.ts` | PATCH /account/account 신규 |
| `backend/validators/team.validator.ts` | createTeamSchema/updateTeamSchema 확장 |
| `backend/validators/auth.validator.ts` | updateMyAccountSchema 신규 |

### 모바일

| 경로 | 변경 |
|---|---|
| `mobile/src/types/team.ts` | Team 타입 + 새 필드 |
| `mobile/src/types/user.ts` | User 타입 + account |
| `mobile/src/api/team.ts` | create/update 시그니처 |
| `mobile/src/api/account.ts` | updateMyAccount 추가 |
| `mobile/src/store/teamStore.ts` | createTeam 시그니처 |
| `mobile/src/components/account/AccountForm.tsx` | **신규** — 재사용 |
| `mobile/app/team/create.tsx` | 4개 토글 추가 |
| `mobile/app/team/[teamId].tsx` | 모임 정보 수정 폼 확장 + 모임 통장 + 멤버 displayMode 분기 |
| `mobile/app/profile.tsx` | 내 계좌 섹션 추가 |
| `mobile/app/team/fee.tsx` | feeEnabled=false 처리 |

---

## Task 1: Team 모델 확장

**Files:**
- Modify: `backend/models/Team.model.ts`

- [ ] **Step 1.1: 인터페이스 + 스키마 필드 추가**

`backend/models/Team.model.ts`에서 ITeam 인터페이스 + UserSchema 둘 다 수정:

기존:
```ts
interface ITeamMember { ... }
interface ITeamPendingInvite { ... }

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
```

신규 추가 (인터페이스에):
```ts
interface ITeamAccount {
  bank: string;
  number: string;
  holder: string;
}

interface ITeam extends Document {
  // 기존 ...

  // Phase 1 신규
  category: "friend" | "club";
  displayMode: "nickname" | "realName";
  accountMode: "personal" | "team";
  feeEnabled: boolean;
  account?: ITeamAccount;

  // 기존 (회비)
  feeAmount: number;
  feeDueDay: number;
}
```

스키마에 필드 추가 (UserSchema 정의 안에):
```ts
category: { type: String, enum: ["friend", "club"], default: "friend" },
displayMode: { type: String, enum: ["nickname", "realName"], default: "nickname" },
accountMode: { type: String, enum: ["personal", "team"], default: "personal" },
feeEnabled: { type: Boolean, default: false },
account: {
    bank: { type: String, trim: true },
    number: { type: String, trim: true },
    holder: { type: String, trim: true },
},
```

위치: 기존 `inviteTokenExpiry` 다음, `feeAmount` 이전.

- [ ] **Step 1.2: 커밋**

```bash
git add backend/models/Team.model.ts
git commit -m "feat(backend): Team 모델에 카테고리/표시/계좌/회비 필드 추가

- category: friend / club
- displayMode: nickname / realName
- accountMode: personal / team
- feeEnabled: boolean
- account?: { bank, number, holder } (모임 통장)
- 디폴트값 (친구/닉네임/개인/회비X) 적용"
```

---

## Task 2: User 모델 확장 (개인 계좌)

**Files:**
- Modify: `backend/models/User.model.ts`

- [ ] **Step 2.1: 인터페이스 + 스키마 추가**

`backend/models/User.model.ts`:

인터페이스 추가:
```ts
interface IUserAccount {
  bank: string;
  number: string;
  holder: string;
}

interface IUser extends Document {
  // 기존 (email, password, name, nickname, handle, ...)

  account?: IUserAccount;  // 신규
}
```

스키마 추가 (handleChangedAt 다음 위치):
```ts
account: {
    bank: { type: String, trim: true },
    number: { type: String, trim: true },
    holder: { type: String, trim: true },
},
```

- [ ] **Step 2.2: 커밋**

```bash
git add backend/models/User.model.ts
git commit -m "feat(backend): User 모델에 개인 계좌(account) 필드 추가

더치페이 시 받을 개인 통장. accountMode='personal' 모임에서 활용."
```

---

## Task 3: 백엔드 — team service/controller/validator 확장

**Files:**
- Modify: `backend/services/team/team.service.ts` (createTeam/updateTeam)
- Modify: `backend/controllers/team.controller.ts` (body 수용)
- Modify: `backend/validators/team.validator.ts` (createTeamSchema/updateTeamSchema)

- [ ] **Step 3.1: team.service.ts createTeam 확장**

기존 createTeam 시그니처:
```ts
const createTeam = async (userId, { name, description }) => { ... }
```

변경:
```ts
const createTeam = async (userId, payload) => {
  const {
    name, description,
    category, displayMode, accountMode, feeEnabled,
  } = payload;

  const team = await Team.create({
    name,
    description: description || "",
    owner: userId,
    members: [{ user: userId, role: "owner" }],
    category: category || "friend",
    displayMode: displayMode || "nickname",
    accountMode: accountMode || "personal",
    feeEnabled: feeEnabled === true,
  });

  return team;
};
```

(현재 createTeam의 정확한 구현 형태에 맞춰 조정. members.push는 기존대로.)

- [ ] **Step 3.2: team.service.ts updateTeam 확장**

기존 updateTeam이 받는 필드에 추가:

```ts
const updateTeam = async (teamId, userId, data) => {
  // ... 기존 검증 (owner) ...

  const ALLOWED = [
    "name", "description",
    "category", "displayMode", "accountMode", "feeEnabled",
    "feeAmount", "feeDueDay",
    "account",  // 모임 통장
  ];
  for (const key of ALLOWED) {
    if (data[key] !== undefined) team[key] = data[key];
  }
  await team.save();
  return team;
};
```

(현재 updateTeam이 어떻게 되어있는지 보고 ALLOWED 패턴 또는 직접 할당으로 적용)

- [ ] **Step 3.3: team.validator.ts 스키마 확장**

`createTeamSchema` body에 다음 추가:
```ts
category: z.enum(["friend", "club"]).optional(),
displayMode: z.enum(["nickname", "realName"]).optional(),
accountMode: z.enum(["personal", "team"]).optional(),
feeEnabled: z.boolean().optional(),
```

`updateTeamSchema` body에 추가:
```ts
category: z.enum(["friend", "club"]).optional(),
displayMode: z.enum(["nickname", "realName"]).optional(),
accountMode: z.enum(["personal", "team"]).optional(),
feeEnabled: z.boolean().optional(),
account: z.object({
  bank: z.string().trim().min(1).max(30),
  number: z.string().trim().min(1).max(50),
  holder: z.string().trim().min(1).max(30),
}).nullable().optional(),
```

(account: null로 보내면 삭제, 객체면 수정)

- [ ] **Step 3.4: team.controller.ts 변경 (필요한 경우)**

createTeam 컨트롤러가 `req.body` 통째로 service에 넘기면 변경 불필요. 만약 일부 필드만 picking 했으면 새 필드 picking 추가.

- [ ] **Step 3.5: 커밋**

```bash
git add backend/services/team/team.service.ts backend/controllers/team.controller.ts backend/validators/team.validator.ts
git commit -m "feat(backend): createTeam/updateTeam에 카테고리/표시/계좌모드/회비/통장 수용

- createTeam: 신규 필드들 받음, 디폴트 적용
- updateTeam: 모든 정책 + 모임 통장 수정 가능
- validator: zod 스키마 확장 (account는 nullable)"
```

---

## Task 4: 백엔드 — account service: 개인 계좌 + me 응답 확장

**Files:**
- Modify: `backend/services/account/account.service.ts`
- Modify: `backend/controllers/account.controller.ts`
- Modify: `backend/routes/account.route.ts`
- Modify: `backend/validators/auth.validator.ts`

- [ ] **Step 4.1: service 함수 신규**

`account.service.ts` module.exports 직전에 추가:
```ts
const updateMyAccount = async (userId, account) => {
  const user = await User.findById(userId);
  if (!user) throw AppError.notFound("사용자를 찾을 수 없습니다.");

  if (account === null) {
    user.account = undefined;  // 삭제
  } else {
    user.account = {
      bank: String(account.bank || "").trim(),
      number: String(account.number || "").trim(),
      holder: String(account.holder || "").trim(),
    };
  }
  await user.save();
  return user;
};
```

`module.exports`에 `updateMyAccount` 추가.

- [ ] **Step 4.2: controller 핸들러**

`account.controller.ts`의 `getMyAccount` 응답에 account 포함:

기존:
```ts
res.status(200).json({
  id: user._id,
  email: user.email,
  name: user.name,
  nickname: user.nickname,
  handle: user.handle,
  handleChangedAt: user.handleChangedAt,
  provider: user.provider,
});
```

변경:
```ts
res.status(200).json({
  id: user._id,
  email: user.email,
  name: user.name,
  nickname: user.nickname,
  handle: user.handle,
  handleChangedAt: user.handleChangedAt,
  account: user.account,
  provider: user.provider,
});
```

신규 핸들러:
```ts
const updateMyAccountController = async (req, res) => {
  try {
    const user = await AccountService.updateMyAccount(req.user.userId, req.body.account);
    res.status(200).json({
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        handle: user.handle,
        handleChangedAt: user.handleChangedAt,
        account: user.account,
        provider: user.provider,
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
};
```

`module.exports`에 추가.

- [ ] **Step 4.3: validator**

`auth.validator.ts`에 추가:
```ts
const updateMyAccountSchema = {
  body: z.object({
    account: z.object({
      bank: z.string().trim().min(1).max(30),
      number: z.string().trim().min(1).max(50),
      holder: z.string().trim().min(1).max(30),
    }).nullable(),
  }),
};
```

`module.exports`에 `updateMyAccountSchema` 추가.

- [ ] **Step 4.4: route 등록**

`account.route.ts`에 추가:
```ts
const { updateMyAccountSchema } = require("../validators/auth.validator");

router.patch(
  "/account",
  validate(updateMyAccountSchema),
  AccountController.updateMyAccountController
);
```

- [ ] **Step 4.5: 커밋**

```bash
git add backend/services/account/account.service.ts backend/controllers/account.controller.ts backend/routes/account.route.ts backend/validators/auth.validator.ts
git commit -m "feat(backend): 개인 계좌 등록/수정 + GET me 응답에 account 포함

- updateMyAccount: account 객체 또는 null(삭제)
- PATCH /account/account 라우트
- 모든 me 응답에 account 필드 포함"
```

---

## Task 5: 모바일 — 타입 + API + Store 확장

**Files:**
- Modify: `mobile/src/types/team.ts`
- Modify: `mobile/src/types/user.ts`
- Modify: `mobile/src/api/team.ts`
- Modify: `mobile/src/api/account.ts`
- Modify: `mobile/src/api/auth.ts` (me 응답 타입)
- Modify: `mobile/src/store/teamStore.ts`

- [ ] **Step 5.1: Team 타입 확장**

`mobile/src/types/team.ts`:

```ts
export type Account = {
  bank: string;
  number: string;
  holder: string;
};

export interface Team {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  members?: Member[];

  // Phase 1
  category?: "friend" | "club";
  displayMode?: "nickname" | "realName";
  accountMode?: "personal" | "team";
  feeEnabled?: boolean;
  account?: Account;
}
```

- [ ] **Step 5.2: User 타입 확장**

`mobile/src/types/user.ts`의 User interface에 추가:
```ts
import type { Account } from "./team";

export interface User {
  // 기존 ...
  account?: Account;
}
```

(또는 Account 타입을 별도 위치로 옮겨도 OK)

- [ ] **Step 5.3: team API**

`mobile/src/api/team.ts`의 create/update 시그니처:

```ts
create: (data: {
  name: string;
  description?: string;
  category?: "friend" | "club";
  displayMode?: "nickname" | "realName";
  accountMode?: "personal" | "team";
  feeEnabled?: boolean;
}) => apiClient.post("/teams", data) as Promise<DataResponse<Team>>,

update: (
  teamId: string,
  data: {
    name?: string;
    description?: string;
    category?: "friend" | "club";
    displayMode?: "nickname" | "realName";
    accountMode?: "personal" | "team";
    feeEnabled?: boolean;
    feeAmount?: number;
    feeDueDay?: number;
    account?: { bank: string; number: string; holder: string } | null;
  }
) => apiClient.put(`/teams/${teamId}`, data) as Promise<DataResponse<Team>>,
```

- [ ] **Step 5.4: account API**

`mobile/src/api/account.ts`에 추가:
```ts
import type { Account } from "@/types/team";

// accountApi 안에 추가:
updateMyAccount: (account: Account | null) =>
  apiClient.patch("/account/account", { account }) as Promise<
    DataResponse<unknown>
  >,
```

- [ ] **Step 5.5: auth.ts MeResponse 확장**

```ts
type MeResponse = {
  id?: string;
  _id?: string;
  email: string;
  name: string;
  nickname: string;
  handle?: string;
  handleChangedAt?: string;
  account?: { bank: string; number: string; holder: string };
  provider: string;
};
```

- [ ] **Step 5.6: teamStore createTeam 시그니처**

`mobile/src/store/teamStore.ts`의 createTeam:

기존:
```ts
createTeam: (name: string, description?: string) => Promise<void>;
```

변경:
```ts
createTeam: (data: {
  name: string;
  description?: string;
  category?: "friend" | "club";
  displayMode?: "nickname" | "realName";
  accountMode?: "personal" | "team";
  feeEnabled?: boolean;
}) => Promise<void>;
```

구현부:
```ts
createTeam: async (data) => {
  const res = await teamApi.create(data);
  const newTeam = res.data;
  // 기존 fetchTeams + setCurrentTeam 로직 유지
  await get().fetchTeams();
  if (newTeam) {
    const tid = getTeamId(newTeam);
    if (tid) await get().setCurrentTeam(tid);
  }
},
```

- [ ] **Step 5.7: TypeScript 컴파일**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -E "team\.ts|user\.ts|teamStore" | head -10
```

Expected: 에러 0건. (단 기존 createTeam 호출처 — `team/create.tsx` — 가 새 시그니처 안 맞을 수 있음. Task 7에서 수정 예정.)

- [ ] **Step 5.8: 커밋**

```bash
git add mobile/src/types/team.ts mobile/src/types/user.ts mobile/src/api/team.ts mobile/src/api/account.ts mobile/src/api/auth.ts mobile/src/store/teamStore.ts
git commit -m "feat(mobile): 타입/API/store에 카테고리/표시/계좌/회비 필드 확장

- Team/User 타입에 새 필드들
- teamApi.create/update 시그니처 확장
- accountApi.updateMyAccount 신규
- MeResponse에 account 포함
- teamStore.createTeam 객체 시그니처"
```

---

## Task 6: AccountForm 재사용 컴포넌트

**Files:**
- Create: `mobile/src/components/account/AccountForm.tsx`

- [ ] **Step 6.1: 컴포넌트 작성**

`mobile/src/components/account/AccountForm.tsx`:

```tsx
import { useState } from "react";
import { View } from "react-native";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type AccountValue = { bank: string; number: string; holder: string };

type Props = {
  initial?: AccountValue;
  saving?: boolean;
  onSave: (account: AccountValue) => void | Promise<void>;
  onCancel?: () => void;
};

export function AccountForm({ initial, saving, onSave, onCancel }: Props) {
  const [bank, setBank] = useState(initial?.bank ?? "");
  const [number, setNumber] = useState(initial?.number ?? "");
  const [holder, setHolder] = useState(initial?.holder ?? "");

  const isValid = bank.trim() && number.trim() && holder.trim();

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      bank: bank.trim(),
      number: number.trim(),
      holder: holder.trim(),
    });
  };

  return (
    <View style={{ gap: 12 }}>
      <Input
        label="은행"
        placeholder="예: 국민, 신한, 토스뱅크"
        value={bank}
        onChangeText={setBank}
        maxLength={30}
      />
      <Input
        label="계좌번호"
        placeholder="예: 123-456-789012"
        value={number}
        onChangeText={setNumber}
        maxLength={50}
        keyboardType="number-pad"
      />
      <Input
        label="예금주"
        placeholder="홍길동"
        value={holder}
        onChangeText={setHolder}
        maxLength={30}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {onCancel && (
          <View style={{ flex: 1 }}>
            <Button label="취소" variant="outline" size="md" onPress={onCancel} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Button
            label="저장"
            variant="primary"
            size="md"
            loading={saving}
            onPress={handleSave}
            disabled={!isValid}
          />
        </View>
      </View>
    </View>
  );
}

export type { AccountValue };
```

- [ ] **Step 6.2: TypeScript 컴파일**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "AccountForm" | head -3
```

Expected: 에러 0건.

- [ ] **Step 6.3: 커밋**

```bash
git add mobile/src/components/account/AccountForm.tsx
git commit -m "feat(mobile): AccountForm 재사용 컴포넌트 신규

은행/계좌번호/예금주 3개 필드. 모임 통장과 개인 계좌 양쪽에서 재사용."
```

---

## Task 7: team/create.tsx — 4개 토글 추가

**Files:**
- Modify: `mobile/app/team/create.tsx`

- [ ] **Step 7.1: 기존 파일 구조 확인**

```bash
cat mobile/app/team/create.tsx | head -50
```

기존 폼 구조 파악 후, 이름/설명 아래에 4개 토글 그룹 추가.

- [ ] **Step 7.2: 신규 state**

```tsx
import { useState } from "react";
// ... 기존 ...

const [name, setName] = useState("");
const [description, setDescription] = useState("");

// 신규
const [category, setCategory] = useState<"friend" | "club">("friend");
const [displayMode, setDisplayMode] = useState<"nickname" | "realName">("nickname");
const [accountMode, setAccountMode] = useState<"personal" | "team">("personal");
const [feeEnabled, setFeeEnabled] = useState(false);
```

- [ ] **Step 7.3: handleSubmit/handleCreate에서 새 필드 전송**

기존 `await createTeam(name, description)` →
```ts
await createTeam({
  name: name.trim(),
  description: description.trim() || undefined,
  category,
  displayMode,
  accountMode,
  feeEnabled,
});
```

- [ ] **Step 7.4: JSX에 토글 그룹 추가**

이름/설명 Input 아래에 다음 추가 (기존 구조에 맞춰 className 조정):

```tsx
{/* 모임 성격 섹션 */}
<View className="mt-section-gap">
  <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">
    카테고리
  </Text>
  <View className="flex-row" style={{ gap: 8 }}>
    <ToggleChip
      label="친구 모임"
      selected={category === "friend"}
      onPress={() => setCategory("friend")}
    />
    <ToggleChip
      label="동호회·동아리"
      selected={category === "club"}
      onPress={() => setCategory("club")}
    />
  </View>
</View>

<View className="mt-3">
  <Text className="text-sub font-pretendard-semibold text-text-secondary mb-1">
    멤버 표시 방식
  </Text>
  <Text className="text-xs text-text-secondary mb-2">
    모임원 목록과 거래 작성자에 보일 이름
  </Text>
  <View className="flex-row" style={{ gap: 8 }}>
    <ToggleChip
      label="닉네임"
      selected={displayMode === "nickname"}
      onPress={() => setDisplayMode("nickname")}
    />
    <ToggleChip
      label="실명"
      selected={displayMode === "realName"}
      onPress={() => setDisplayMode("realName")}
    />
  </View>
</View>

<View className="mt-3">
  <Text className="text-sub font-pretendard-semibold text-text-secondary mb-1">
    더치페이 받을 계좌
  </Text>
  <Text className="text-xs text-text-secondary mb-2">
    송금받을 계좌 (변경 가능)
  </Text>
  <View className="flex-row" style={{ gap: 8 }}>
    <ToggleChip
      label="개인 통장"
      selected={accountMode === "personal"}
      onPress={() => setAccountMode("personal")}
    />
    <ToggleChip
      label="모임 통장"
      selected={accountMode === "team"}
      onPress={() => setAccountMode("team")}
    />
  </View>
</View>

<View className="mt-3 mb-section-gap">
  <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">
    회비 사용
  </Text>
  <View className="flex-row" style={{ gap: 8 }}>
    <ToggleChip
      label="사용 안 함"
      selected={!feeEnabled}
      onPress={() => setFeeEnabled(false)}
    />
    <ToggleChip
      label="사용"
      selected={feeEnabled}
      onPress={() => setFeeEnabled(true)}
    />
  </View>
</View>
```

`ToggleChip`은 이 파일 안에 인라인 컴포넌트로 정의:
```tsx
function ToggleChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: selected ? "#3DD598" : "#E5E8EB",
        backgroundColor: selected ? "#E8FAF2" : "#FFFFFF",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontFamily: "Pretendard-SemiBold",
          color: selected ? "#3DD598" : "#8B95A1",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
```

(`Pressable`, `Text` import 추가 필요 시)

- [ ] **Step 7.5: TypeScript 컴파일 + 시뮬레이터 검증**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "create\.tsx" | head -5
```

시뮬레이터:
- [ ] 새 모임 만들기 화면 진입
- [ ] 4개 토글 노출 + 디폴트 선택 (친구/닉네임/개인/사용 안 함)
- [ ] 토글 변경 → 색상 반영
- [ ] 모임 만들기 버튼 → 모임 생성 + 홈 진입
- [ ] DB에서 새 모임 도큐먼트 확인 — 새 필드들 정확히 저장됨

- [ ] **Step 7.6: 커밋**

```bash
git add mobile/app/team/create.tsx
git commit -m "feat(mobile): 모임 생성 화면에 카테고리/표시/계좌/회비 토글

- 4개 토글 그룹 (각 2개 옵션)
- 디폴트: 친구 + 닉네임 + 개인 + 회비 X
- ToggleChip 인라인 컴포넌트
- createTeam 객체 시그니처로 호출"
```

---

## Task 8: team/[teamId].tsx — 모임 정보 수정 폼 확장 + 모임 통장

**Files:**
- Modify: `mobile/app/team/[teamId].tsx`

- [ ] **Step 8.1: 기존 인라인 편집 폼 위치 찾기**

```bash
grep -n "모임 정보 수정\|isEditingInfo\|handleSaveInfo" mobile/app/team/\[teamId\].tsx | head -10
```

기존 폼은 이름/설명 2개. 여기에 카테고리/표시/계좌모드/회비/모임 통장 추가.

- [ ] **Step 8.2: state 추가**

기존 state:
```tsx
const [editName, setEditName] = useState("");
const [editDescription, setEditDescription] = useState("");
```

추가:
```tsx
const [editCategory, setEditCategory] = useState<"friend" | "club">("friend");
const [editDisplayMode, setEditDisplayMode] = useState<"nickname" | "realName">("nickname");
const [editAccountMode, setEditAccountMode] = useState<"personal" | "team">("personal");
const [editFeeEnabled, setEditFeeEnabled] = useState(false);
const [editAccount, setEditAccount] = useState<{ bank: string; number: string; holder: string } | null>(null);
```

- [ ] **Step 8.3: useEffect에서 team 로드 시 초기화**

기존 useEffect (team 변경 시 폼 초기화) 확장:
```tsx
useEffect(() => {
  if (team) {
    setEditName(team.name);
    setEditDescription(team.description || "");
    setEditCategory((team as any).category || "friend");
    setEditDisplayMode((team as any).displayMode || "nickname");
    setEditAccountMode((team as any).accountMode || "personal");
    setEditFeeEnabled(!!(team as any).feeEnabled);
    setEditAccount((team as any).account || null);
    setIsEditingInfo(false);
  }
}, [team?._id ?? team?.id, team?.name, team?.description]);
```

(Team 타입에 새 필드 이미 추가했으니 `as any` 불필요. 실제 코드는 클린)

- [ ] **Step 8.4: handleSaveInfo 확장**

기존 호출:
```ts
await teamApi.update(selectedTeamId, {
  name: trimmedName,
  description: editDescription.trim(),
});
```

변경:
```ts
await teamApi.update(selectedTeamId, {
  name: trimmedName,
  description: editDescription.trim(),
  category: editCategory,
  displayMode: editDisplayMode,
  accountMode: editAccountMode,
  feeEnabled: editFeeEnabled,
  account: editAccountMode === "team" ? editAccount : undefined,
});
```

(account는 모임 통장 모드일 때만 보냄. undefined면 백엔드에서 변경 안 함)

- [ ] **Step 8.5: JSX 폼 확장**

기존 폼(이름/설명 + 취소/저장 버튼) 사이에 토글 그룹 + 모임 통장 섹션 추가.

기존 `Input label="모임 이름"` 다음:
```tsx
<Input
  label="설명"
  value={editDescription}
  onChangeText={setEditDescription}
  placeholder="모임에 대한 간단한 설명"
  maxLength={100}
/>

{/* 카테고리 */}
<View>
  <Text className="text-sub text-text-secondary mb-2">카테고리</Text>
  <View className="flex-row" style={{ gap: 8 }}>
    <ToggleChip label="친구 모임" selected={editCategory === "friend"} onPress={() => setEditCategory("friend")} />
    <ToggleChip label="동호회·동아리" selected={editCategory === "club"} onPress={() => setEditCategory("club")} />
  </View>
</View>

{/* 표시 */}
<View>
  <Text className="text-sub text-text-secondary mb-2">멤버 표시</Text>
  <View className="flex-row" style={{ gap: 8 }}>
    <ToggleChip label="닉네임" selected={editDisplayMode === "nickname"} onPress={() => setEditDisplayMode("nickname")} />
    <ToggleChip label="실명" selected={editDisplayMode === "realName"} onPress={() => setEditDisplayMode("realName")} />
  </View>
</View>

{/* 계좌 모드 */}
<View>
  <Text className="text-sub text-text-secondary mb-2">더치페이 계좌</Text>
  <View className="flex-row" style={{ gap: 8 }}>
    <ToggleChip label="개인 통장" selected={editAccountMode === "personal"} onPress={() => setEditAccountMode("personal")} />
    <ToggleChip label="모임 통장" selected={editAccountMode === "team"} onPress={() => setEditAccountMode("team")} />
  </View>
</View>

{/* 회비 사용 */}
<View>
  <Text className="text-sub text-text-secondary mb-2">회비 사용</Text>
  <View className="flex-row" style={{ gap: 8 }}>
    <ToggleChip label="사용 안 함" selected={!editFeeEnabled} onPress={() => setEditFeeEnabled(false)} />
    <ToggleChip label="사용" selected={editFeeEnabled} onPress={() => setEditFeeEnabled(true)} />
  </View>
</View>

{/* 모임 통장 — accountMode=team일 때만 */}
{editAccountMode === "team" && (
  <View style={{ borderTopWidth: 1, borderTopColor: "#F2F4F6", paddingTop: 12, marginTop: 4 }}>
    <Text className="text-sub font-pretendard-semibold text-text-primary mb-2">모임 통장</Text>
    <View style={{ gap: 8 }}>
      <Input
        label="은행"
        value={editAccount?.bank || ""}
        onChangeText={(v) => setEditAccount({ bank: v, number: editAccount?.number || "", holder: editAccount?.holder || "" })}
        placeholder="예: 국민, 신한, 토스뱅크"
        maxLength={30}
      />
      <Input
        label="계좌번호"
        value={editAccount?.number || ""}
        onChangeText={(v) => setEditAccount({ bank: editAccount?.bank || "", number: v, holder: editAccount?.holder || "" })}
        placeholder="123-456-789012"
        maxLength={50}
        keyboardType="number-pad"
      />
      <Input
        label="예금주"
        value={editAccount?.holder || ""}
        onChangeText={(v) => setEditAccount({ bank: editAccount?.bank || "", number: editAccount?.number || "", holder: v })}
        placeholder="홍길동"
        maxLength={30}
      />
    </View>
  </View>
)}
```

ToggleChip을 이 파일에도 인라인 정의 (Task 7과 동일 코드 복붙).

또는 더 깔끔하게: `mobile/src/components/ui/ToggleChip.tsx` 신규로 만들어서 양쪽 import.

> **추천**: ToggleChip을 별도 파일로 분리하면 Task 7과 Task 8 모두 깔끔. 만약 시간 짧으면 인라인 복붙도 OK.

- [ ] **Step 8.6: 검증**

시뮬레이터:
- [ ] 모임 관리 → 모임 정보 수정 → 폼 펼쳐짐
- [ ] 카테고리/표시/계좌 모드/회비 토글 모두 노출 + 현재 값 반영
- [ ] 계좌 모드 "모임 통장"으로 변경 → 모임 통장 입력 섹션 노출
- [ ] 저장 → 토스트 + 즉시 반영

- [ ] **Step 8.7: 커밋**

```bash
git add mobile/app/team/\[teamId\].tsx
git commit -m "feat(mobile): 모임 정보 수정에 카테고리/표시/계좌/회비/통장 추가

- 토글 4개 + 모임 통장 입력 섹션 (조건부)
- 저장 시 모든 변경 한 번에 PUT
- 모임장만 (isOwner)"
```

---

## Task 9: profile.tsx — "내 계좌" 섹션 추가

**Files:**
- Modify: `mobile/app/profile.tsx`

- [ ] **Step 9.1: state + 핸들러 추가**

`profile.tsx`의 기존 state 옆에:
```tsx
const [isEditingAccount, setIsEditingAccount] = useState(false);
const [savingAccount, setSavingAccount] = useState(false);
```

저장 핸들러:
```tsx
const handleSaveAccount = async (account: { bank: string; number: string; holder: string }) => {
  setSavingAccount(true);
  try {
    await accountApi.updateMyAccount(account);
    await refreshUser();
    showToast("success", "계좌 등록 완료");
    setIsEditingAccount(false);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "다시 시도해주세요";
    showToast("error", "저장 실패", msg);
  } finally {
    setSavingAccount(false);
  }
};

const handleDeleteAccount = () => {
  Alert.alert("내 계좌 삭제", "등록된 계좌 정보를 삭제하시겠어요?", [
    { text: "취소", style: "cancel" },
    {
      text: "삭제",
      style: "destructive",
      onPress: async () => {
        try {
          await accountApi.updateMyAccount(null);
          await refreshUser();
          showToast("success", "삭제됨");
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "다시 시도";
          showToast("error", "삭제 실패", msg);
        }
      },
    },
  ]);
};
```

- [ ] **Step 9.2: JSX에 섹션 추가**

기존 "이메일" 행 아래, "비밀번호 변경" 위에 새 섹션:

```tsx
{/* 내 계좌 섹션 */}
<View className="mt-section-gap px-4">
  <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">
    내 계좌 (선택)
  </Text>
  {isEditingAccount ? (
    <AccountForm
      initial={user?.account}
      saving={savingAccount}
      onSave={handleSaveAccount}
      onCancel={() => setIsEditingAccount(false)}
    />
  ) : user?.account ? (
    <View>
      <View className="py-2 flex-row justify-between">
        <Text className="text-body text-text-secondary">은행</Text>
        <Text className="text-body text-text-primary">{user.account.bank}</Text>
      </View>
      <View className="py-2 flex-row justify-between">
        <Text className="text-body text-text-secondary">계좌번호</Text>
        <Text className="text-body text-text-primary">{user.account.number}</Text>
      </View>
      <View className="py-2 flex-row justify-between">
        <Text className="text-body text-text-secondary">예금주</Text>
        <Text className="text-body text-text-primary">{user.account.holder}</Text>
      </View>
      <View className="flex-row mt-2" style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label="수정" variant="outline" size="md" onPress={() => setIsEditingAccount(true)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="삭제" variant="outline" size="md" onPress={handleDeleteAccount} />
        </View>
      </View>
    </View>
  ) : (
    <View>
      <Text className="text-sub text-text-secondary mb-2">
        계좌가 없습니다. 등록하면 더치페이를 받을 수 있어요.
      </Text>
      <Button label="계좌 등록하기" variant="primary" size="md" onPress={() => setIsEditingAccount(true)} />
    </View>
  )}
</View>
```

`AccountForm` import 추가:
```tsx
import { AccountForm } from "@/components/account/AccountForm";
```

- [ ] **Step 9.3: 검증**

시뮬레이터:
- [ ] 프로필 화면 → "내 계좌" 섹션 노출
- [ ] 미등록 시 "계좌 등록하기" 버튼
- [ ] 등록 → 폼 → 입력 → 저장 → 즉시 반영
- [ ] 등록된 후 수정/삭제 버튼 동작

- [ ] **Step 9.4: 커밋**

```bash
git add mobile/app/profile.tsx
git commit -m "feat(mobile): 프로필에 내 계좌 섹션 추가

미등록 시 등록 버튼, 등록 후 수정/삭제. AccountForm 재사용."
```

---

## Task 10: 멤버 표시 displayMode 분기

**Files:**
- Modify: `mobile/app/team/[teamId].tsx` (멤버 목록 표시 부분)

- [ ] **Step 10.1: 멤버 표시 로직에 displayMode 분기**

기존 displayName 로직:
```tsx
const displayName = memberUser.nickname || memberUser.name || "알 수 없음";
```

변경:
```tsx
const displayMode = team?.displayMode ?? "nickname";
const displayName =
  displayMode === "realName"
    ? memberUser.name || memberUser.nickname || "알 수 없음"
    : memberUser.nickname || memberUser.name || "알 수 없음";
```

- [ ] **Step 10.2: 검증**

시뮬레이터:
- [ ] 모임 정보 수정에서 표시를 "실명"으로 변경 → 저장 → 멤버 목록에 실명 표시
- [ ] 다시 "닉네임"으로 → 닉네임 표시
- [ ] 두 번째 모임을 다른 표시 정책으로 만들고 멤버 목록 비교

- [ ] **Step 10.3: 커밋**

```bash
git add mobile/app/team/\[teamId\].tsx
git commit -m "feat(mobile): 멤버 목록 displayMode 분기 (닉네임/실명)

team.displayMode 따라 멤버 표시 분기. 같은 사용자도 모임마다 다르게 보임."
```

---

## Task 11: fee.tsx — feeEnabled=false 처리

**Files:**
- Modify: `mobile/app/team/fee.tsx`

- [ ] **Step 11.1: feeEnabled 체크 + 안내**

`FeeScreen` 컴포넌트 시작 부분 (loadData 호출 전):

```tsx
const isFeeEnabled = currentTeam?.feeEnabled ?? false;
```

기존 `loading` 조건문 위에 (또는 화면 렌더 시작 시) 추가:

```tsx
if (currentTeam && !isFeeEnabled) {
  return (
    <ScreenContainer scrollable={false}>
      <Header title="회비 현황" showBack />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-section font-pretendard-semibold text-text-primary mb-2">
          회비를 사용하지 않는 모임이에요
        </Text>
        <Text className="text-body text-text-secondary text-center">
          회비를 사용하려면 모임 관리에서{"\n"}회비 사용을 켜주세요.
        </Text>
      </View>
    </ScreenContainer>
  );
}
```

(currentTeam이 아직 안 로드됐을 때는 기존 loading 처리 유지)

- [ ] **Step 11.2: 검증**

시뮬레이터:
- [ ] 회비 사용 X 모임에서 회비 페이지 진입 → "회비를 사용하지 않는 모임이에요" 안내
- [ ] 회비 사용으로 변경 → 페이지 정상 동작

- [ ] **Step 11.3: 커밋**

```bash
git add mobile/app/team/fee.tsx
git commit -m "feat(mobile): feeEnabled=false 모임은 회비 페이지 차단 + 안내

회비를 사용하지 않는 모임에서 회비 페이지 진입 시 안내 텍스트만 표시.
모임 관리에서 회비 사용 켜는 안내 포함."
```

---

## Task 12: 종합 E2E 검증 + push + 메모리

- [ ] **Step 12.1: 모든 commit 확인**

```bash
git log origin/main..HEAD --oneline | head -20
```

Expected: Task 1~11 커밋 11개.

- [ ] **Step 12.2: 종합 시뮬레이터 검증**

다음 시나리오 모두 시뮬레이터에서:

**시나리오 A. 친구 모임 (디폴트)**:
- [ ] 모임 만들기 → 토글 안 만지고 "만들기" → 모임 생성됨
- [ ] 멤버 목록에 닉네임 표시
- [ ] 회비 페이지 진입 시 "회비 사용하지 않음" 안내
- [ ] 모임 정보 수정에 4개 토글 + 모임 통장 X (계좌 모드=개인이라)

**시나리오 B. 동호회 모임**:
- [ ] 모임 만들기 → 동호회 + 실명 + 모임 통장 + 회비 사용
- [ ] 멤버 목록에 실명 표시
- [ ] 회비 페이지 정상 동작
- [ ] 모임 정보 수정에 모임 통장 입력 섹션 노출 → 등록 → 저장 → 반영

**시나리오 C. 개인 계좌**:
- [ ] 프로필 → 내 계좌 섹션 → 등록 → 저장
- [ ] 등록 후 수정 가능 / 삭제 가능

**시나리오 D. 정책 변경**:
- [ ] 친구 모임 → 동호회로 변경 (카테고리만)
- [ ] 닉네임 → 실명으로 변경 → 멤버 목록 즉시 변화
- [ ] 회비 X → 회비 사용 → 회비 페이지 진입 가능

- [ ] **Step 12.3: push**

```bash
git push origin main
```

- [ ] **Step 12.4: 메모리 업데이트**

`v1_post_release_features.md`에 §5로 추가:

- 2026-05-10: Phase 1 완료 — 모임 카테고리 + 계좌 시스템
- Team 모델: category/displayMode/accountMode/feeEnabled/account 추가
- User 모델: account 추가
- 모임 생성/수정 화면에 4개 토글
- 프로필에 내 계좌 섹션
- AccountForm 재사용 컴포넌트
- displayMode에 따른 멤버 표시 분기
- 회비 사용 안 함 모임 페이지 차단
- **다음**: Phase 2 (더치페이 알림 + 공유 시트) brainstorming

---

## Self-Review

### Spec 커버리지

| Spec 섹션 | Task |
|---|---|
| §3.1 Team 모델 확장 | Task 1 |
| §3.2 User 모델 확장 | Task 2 |
| §4 모임 생성 화면 | Task 7 |
| §5 정책별 동작 (계좌 모드, 회비) | Task 8 (수정), Task 11 (회비 차단) |
| §5.1 표시 정책 분기 | Task 10 |
| §6 모임 정보 수정 | Task 8 |
| §7 프로필 내 계좌 | Task 9 (AccountForm은 Task 6) |
| §8 API 엔드포인트 | Task 3 (team), Task 4 (account) |
| §9 모바일 변경 | Task 5~11 |
| §10 엣지 케이스 | 각 task 내 처리 |
| §11 보안 | 백엔드 owner/auth 미들웨어 (기존) |
| §12 테스트 | Task 12 |

모든 spec 요구사항이 task로 매핑됨. ✅

### Placeholder 체크

- "TBD/TODO" 없음
- 각 step에 실제 코드/명령

### 타입 일관성

- `category: "friend" | "club"`, `displayMode: "nickname" | "realName"`, `accountMode: "personal" | "team"`, `feeEnabled: boolean`, `account?: { bank, number, holder }` — Task 1, 5에서 정의, Task 7~11에서 사용 일치
- `accountApi.updateMyAccount(account | null)` — Task 5 정의, Task 9 사용
- `AccountForm` props — Task 6 정의, Task 9 사용

### 위험 영역

- **Task 5 createTeam 시그니처 변경**: 기존 호출처(create.tsx)는 Task 7에서 수정. 컴파일 에러는 일시적.
- **Task 8 ToggleChip 중복**: Task 7과 Task 8에서 동일 코드. 별도 파일 분리 추천 (Step 8.5 노트).
- **Task 11 feeEnabled false 시 회비 페이지**: currentTeam 로드 안 됐을 때 무한 안내 표시 안 되도록 `currentTeam &&` 조건 명확.

이 계획대로 실행 시 spec의 모든 성공 기준 충족.
