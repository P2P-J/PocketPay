# Handle ID 시스템 + 프로필 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자에게 고유 handle 부여 + 가입 시 실명/닉네임/handle 모두 받음. 모임 초대를 이메일에서 handle 기반으로 전환. 프로필 화면 신규 + 비번 변경/로그아웃/탈퇴 통합.

**Architecture:** 백엔드 User 모델에 `nickname`, `handle`, `handleChangedAt` 추가. handle은 a-z 0-9 _, 3~20자, lowercase, unique. OAuth는 handle null 허용해서 가입 후 setup-profile 강제. 프로필 화면이 모든 계정 관련 기능 통합.

**Tech Stack:** Backend Mongoose + Express + TS (CommonJS). Mobile React Native + Expo Router + Zustand + NativeWind.

**Spec:** `docs/superpowers/specs/2026-05-08-handle-id-system-design.md`

**전제:** DB 초기화 예정 → 마이그레이션 비고려.

**테스트 전략:** 백엔드 단위 테스트 없음 → curl/시뮬레이터 수동 검증. 각 task 끝에 검증 체크리스트.

---

## File Structure

### 백엔드

| 경로 | 종류 | 책임 |
|---|---|---|
| `backend/models/User.model.ts` | 수정 | nickname, handle, handleChangedAt 필드 추가 |
| `backend/utils/handle.util.ts` | 신규 | handle 정규식 검증 (`^[a-z0-9_]{3,20}$`) |
| `backend/services/auth/auth.local.service.ts` | 수정 | signup body에 nickname/handle 추가 |
| `backend/services/auth/auth.oauth.service.ts` | 수정 | OAuth 가입 시 handle null 허용 + completeOAuthProfile 신규 |
| `backend/services/account/account.service.ts` | 수정 | checkHandleAvailable, updateProfile, updateHandle 신규 |
| `backend/services/team/team.service.ts` | 수정 | inviteMember email → handle |
| `backend/controllers/auth.controller.ts` | 수정 | complete-profile 핸들러 추가 |
| `backend/controllers/account.controller.ts` | 수정 | check-handle, profile, handle 핸들러 추가 |
| `backend/controllers/team.controller.ts` | 수정 | inviteMember body 변경 |
| `backend/routes/account.route.ts` | 수정 | check-handle, profile, handle 라우트 |
| `backend/routes/auth.route.ts` | 수정 | oauth complete-profile 라우트 |
| `backend/validators/auth.validator.ts` | 수정 | signup 스키마 확장, complete-profile 스키마 신규 |
| `backend/validators/account.validator.ts` | 수정 | profile, handle 스키마 |
| `backend/validators/team.validator.ts` | 수정 | inviteMember 스키마 email → handle |

### 모바일

| 경로 | 종류 | 책임 |
|---|---|---|
| `mobile/src/types/user.ts` | 수정 | User 타입에 nickname/handle/handleChangedAt 추가 |
| `mobile/src/api/auth.ts` | 수정 | signup body 확장 + completeOAuthProfile |
| `mobile/src/api/account.ts` | 수정 | checkHandle, updateProfile, updateHandle |
| `mobile/src/api/team.ts` | 수정 | inviteMember 시그니처 |
| `mobile/src/store/authStore.ts` | 수정 | user 객체 확장 |
| `mobile/src/components/profile/HandleInput.tsx` | 신규 | handle 입력 + 실시간 사용 가능 체크 |
| `mobile/app/(auth)/signup.tsx` | 수정 | 마지막 단계 확장 (실명/닉네임/handle) |
| `mobile/app/setup-profile.tsx` | 신규 | OAuth 후 추가 정보 입력 화면 |
| `mobile/app/profile.tsx` | 신규 | 내 프로필 화면 (보기/편집/비번/로그아웃/탈퇴) |
| `mobile/app/_layout.tsx` | 수정 | Stack.Screen 등록 + AuthGuard 보강 |
| `mobile/app/(tabs)/more.tsx` | 수정 | 비번/로그아웃/탈퇴 항목 제거 + 프로필 카드 탭 핸들러 |
| `mobile/app/team/invite.tsx` | 수정 | email → handle |

---

## Task 1: User 모델 확장

**Files:**
- Modify: `backend/models/User.model.ts`

- [ ] **Step 1.1: 인터페이스 + 스키마 필드 추가**

`backend/models/User.model.ts`:

```ts
import mongoose, { Document } from "mongoose";

interface IOauthTokens {
  naver?: { refreshToken?: string };
  google?: { refreshToken?: string };
  kakao?: { refreshToken?: string };
  apple?: { refreshToken?: string };
}

interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  nickname: string;
  handle?: string;
  handleChangedAt?: Date;
  provider: "local" | "google" | "naver" | "kakao" | "apple";
  providerId?: string;
  oauthTokens?: IOauthTokens;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>({
    email: { type: String, required: true, index: true },
    password: { type: String },
    name: { type: String, required: true },
    nickname: { type: String, required: true, trim: true, minlength: 1, maxlength: 20 },
    handle: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
        match: /^[a-z0-9_]{3,20}$/,
    },
    handleChangedAt: { type: Date },
    provider: { type: String, enum: ["local", "google", "naver", "kakao", "apple"], required: true },
    providerId: { type: String },
    oauthTokens: {
        naver: { refreshToken: { type: String, select: false } },
        google: { refreshToken: { type: String, select: false } },
        kakao: { refreshToken: { type: String, select: false } },
        apple: { refreshToken: { type: String, select: false } },
    }
}, {
    timestamps: true
});

UserSchema.index({ email: 1, provider: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model<IUser>("User", UserSchema);
```

> **노트**: handle은 `sparse: true`로 unique index 적용 — null 값은 unique 제약 안 받음 (OAuth 가입 직후 handle 없는 상태 허용).

- [ ] **Step 1.2: 커밋**

```bash
git add backend/models/User.model.ts
git commit -m "feat(backend): User 모델에 nickname/handle/handleChangedAt 추가

- nickname: required, 1~20자
- handle: unique sparse index, [a-z0-9_]{3,20}
- handleChangedAt: 30일 제한 추적"
```

---

## Task 2: handle 검증 유틸 + check-handle 엔드포인트

**Files:**
- Create: `backend/utils/handle.util.ts`
- Modify: `backend/services/account/account.service.ts`
- Modify: `backend/controllers/account.controller.ts`
- Modify: `backend/routes/account.route.ts`

- [ ] **Step 2.1: handle 검증 유틸 신규**

`backend/utils/handle.util.ts`:

```ts
const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

const validateHandleFormat = (handle: string): boolean => {
  return HANDLE_REGEX.test(handle);
};

module.exports = { validateHandleFormat, HANDLE_REGEX };
```

- [ ] **Step 2.2: account service에 checkHandleAvailable 추가**

기존 `account.service.ts` 끝부분, module.exports 직전에 추가:

```ts
const { validateHandleFormat } = require("../../utils/handle.util");
const { User } = require("../../models/index");

const checkHandleAvailable = async (handle: string) => {
  const lowered = (handle || "").toLowerCase().trim();

  if (!validateHandleFormat(lowered)) {
    return { available: false, reason: "format" as const };
  }

  const exists = await User.findOne({ handle: lowered }).lean();
  if (exists) {
    return { available: false, reason: "taken" as const };
  }

  return { available: true };
};
```

`module.exports`에 `checkHandleAvailable` 추가.

> **노트**: 만약 `account.service.ts` 상단에 이미 `User` import 있으면 중복 import 안 추가. 첫 함수 추가하는 거면 상단에 import + 함수 본체에서는 제외.

- [ ] **Step 2.3: controller 핸들러 추가**

`backend/controllers/account.controller.ts` 끝부분 또는 적절한 위치에 추가:

```ts
const checkHandle = async (req, res) => {
  try {
    const result = await accountService.checkHandleAvailable(req.query.handle);
    res.status(200).json({ data: result });
  } catch (err) {
    handleError(res, err);
  }
};
```

`module.exports`에 `checkHandle` 추가.

- [ ] **Step 2.4: 라우트 등록**

`backend/routes/account.route.ts`:

```ts
router.get("/check-handle", accountController.checkHandle);
```

(다른 인증된 라우트 옆에. 인증 미들웨어 통과 — 비로그인 시도 차단).

- [ ] **Step 2.5: 검증**

```bash
# 백엔드 dev 실행 중 가정
TOKEN="<로그인 후 받은 토큰>"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/account/check-handle?handle=AB" | jq
# Expected: { "data": { "available": false, "reason": "format" } }

curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/account/check-handle?handle=test_user" | jq
# Expected: { "data": { "available": true } }
```

- [ ] **Step 2.6: 커밋**

```bash
git add backend/utils/handle.util.ts backend/services/account/account.service.ts backend/controllers/account.controller.ts backend/routes/account.route.ts
git commit -m "feat(backend): handle 사용 가능 여부 체크 — GET /account/check-handle

- handle.util: 정규식 검증 (^[a-z0-9_]{3,20}$)
- service: checkHandleAvailable (format/taken 구분)
- controller + route 등록"
```

---

## Task 3: 이메일 가입(local) 흐름에 nickname/handle 추가

**Files:**
- Modify: `backend/services/auth/auth.local.service.ts`
- Modify: `backend/validators/auth.validator.ts`

- [ ] **Step 3.1: signupLocal 함수 수정**

기존 `signupLocal({ email, password, name })` →

```ts
const signupLocal = async ({ email, password, name, nickname, handle }) => {
  const exists = await User.findOne({ email, provider: "local" });
  if (exists) {
    throw AppError.badRequest("이미 가입된 이메일입니다.");
  }

  const loweredHandle = (handle || "").toLowerCase().trim();
  // handle 형식은 validator에서 보장하지만 safety 검증
  const { validateHandleFormat } = require("../../utils/handle.util");
  if (!validateHandleFormat(loweredHandle)) {
    throw AppError.badRequest("올바르지 않은 ID 형식입니다.");
  }

  const handleExists = await User.findOne({ handle: loweredHandle });
  if (handleExists) {
    throw AppError.badRequest("이미 사용 중인 ID입니다.");
  }

  const hashedPassword = await hashPassword(password);
  return User.create({
    email,
    password: hashedPassword,
    name,
    nickname,
    handle: loweredHandle,
    handleChangedAt: new Date(),
    provider: "local",
  });
};
```

- [ ] **Step 3.2: validator 스키마 확장**

`backend/validators/auth.validator.ts`의 `signupLocalSchema` 또는 유사 스키마에 추가:

```ts
// 기존 스키마에 다음 필드 추가
nickname: Joi.string().trim().min(1).max(20).required(),
handle: Joi.string().lowercase().trim().pattern(/^[a-z0-9_]{3,20}$/).required(),
```

(정확한 라이브러리/문법은 기존 코드 따라 — Joi/zod/yup 등)

- [ ] **Step 3.3: 검증**

```bash
# 새 사용자 가입 시도
curl -s -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@a.com","password":"password123","name":"홍길동","nickname":"길동이","handle":"hong123"}' | jq
# Expected: 201, user 생성

# handle 누락
curl -s -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@a.com","password":"password123","name":"테스트"}' | jq
# Expected: 400, validation error
```

- [ ] **Step 3.4: 커밋**

```bash
git add backend/services/auth/auth.local.service.ts backend/validators/auth.validator.ts
git commit -m "feat(backend): 이메일 가입에 nickname/handle 필수 입력

- signupLocal: nickname + handle 받음, 형식/중복 검증
- validator: nickname/handle 스키마 추가"
```

---

## Task 4: OAuth 가입 시 handle null 허용 + complete-profile 엔드포인트

**Files:**
- Modify: `backend/services/auth/auth.oauth.service.ts`
- Modify: `backend/controllers/auth.controller.ts`
- Modify: `backend/routes/auth.route.ts`
- Modify: `backend/validators/auth.validator.ts`

- [ ] **Step 4.1: OAuth service 검사 — User.create 호출 부분에 nickname 임시 처리**

`auth.oauth.service.ts`에서 신규 User 생성하는 부분 찾기 (`User.create({ ... })`). 기존엔 `name` 들어감. 이제 `nickname`도 필수가 됐으니 임시값 넣어야 함:

```ts
// User.create({ ... }) 호출 시 nickname 추가:
return User.create({
  email,
  name,
  nickname: name,  // 임시 — 사용자가 setup-profile에서 변경
  // handle 은 제외 (null 허용 sparse)
  provider,
  providerId,
});
```

> **노트**: nickname을 일단 name과 같게 저장. 사용자가 setup-profile에서 닉네임 따로 입력하면 update.

- [ ] **Step 4.2: completeOAuthProfile service 함수 신규**

`auth.oauth.service.ts` 안에 추가:

```ts
const completeOAuthProfile = async (userId, { name, nickname, handle }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound("사용자를 찾을 수 없습니다.");
  }
  if (user.handle) {
    throw AppError.badRequest("이미 프로필이 설정되었습니다.");
  }

  const { validateHandleFormat } = require("../../utils/handle.util");
  const loweredHandle = (handle || "").toLowerCase().trim();
  if (!validateHandleFormat(loweredHandle)) {
    throw AppError.badRequest("올바르지 않은 ID 형식입니다.");
  }

  const handleExists = await User.findOne({ handle: loweredHandle });
  if (handleExists) {
    throw AppError.badRequest("이미 사용 중인 ID입니다.");
  }

  if (name) user.name = name;
  if (nickname) user.nickname = nickname;
  user.handle = loweredHandle;
  user.handleChangedAt = new Date();
  await user.save();

  return user;
};
```

`module.exports`에 추가.

- [ ] **Step 4.3: controller 핸들러 추가**

`auth.controller.ts`:

```ts
const completeOAuthProfileController = async (req, res) => {
  try {
    const user = await completeOAuthProfile(req.user.userId, req.body);
    res.status(200).json({ data: user });
  } catch (err) {
    handleError(res, err);
  }
};
```

`module.exports`에 추가.

- [ ] **Step 4.4: 라우트 등록**

`auth.route.ts`:

```ts
const { loginUserVerify } = require("../middleware/loginUserVerify.middleware");

router.post(
  "/oauth/complete-profile",
  loginUserVerify,
  validate(completeOAuthProfileSchema),
  authController.completeOAuthProfileController
);
```

- [ ] **Step 4.5: validator 스키마 신규**

`auth.validator.ts`에 추가:

```ts
const completeOAuthProfileSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(30).optional(),
    nickname: Joi.string().trim().min(1).max(20).required(),
    handle: Joi.string().lowercase().trim().pattern(/^[a-z0-9_]{3,20}$/).required(),
  }),
};

module.exports = {
  // ... 기존 스키마
  completeOAuthProfileSchema,
};
```

- [ ] **Step 4.6: GET /auth/me (또는 /account/me) 응답에 nickname/handle 포함 확인**

기존 응답에 이미 `user` 전체를 보내는 패턴이면 자동 포함됨. 만약 select로 일부만 보내면 nickname/handle/handleChangedAt 추가:

```ts
// 예시: User.findById(...).select("email name provider")
// →
User.findById(...).select("email name nickname handle handleChangedAt provider")
```

- [ ] **Step 4.7: 커밋**

```bash
git add backend/services/auth/auth.oauth.service.ts backend/controllers/auth.controller.ts backend/routes/auth.route.ts backend/validators/auth.validator.ts
git commit -m "feat(backend): OAuth 후 프로필 완성 엔드포인트

- OAuth 콜백 시 nickname=name으로 임시 저장, handle은 null
- POST /auth/oauth/complete-profile: name/nickname/handle 채움
- 한 번 채워진 후 재호출 차단"
```

---

## Task 5: 프로필 수정 + handle 변경 엔드포인트 (30일 제한)

**Files:**
- Modify: `backend/services/account/account.service.ts`
- Modify: `backend/controllers/account.controller.ts`
- Modify: `backend/routes/account.route.ts`
- Modify: `backend/validators/account.validator.ts`

- [ ] **Step 5.1: updateProfile service 함수 신규**

`account.service.ts`:

```ts
const updateProfile = async (userId, { name, nickname }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound("사용자를 찾을 수 없습니다.");
  }
  if (name !== undefined) user.name = name.trim();
  if (nickname !== undefined) user.nickname = nickname.trim();
  await user.save();
  return user;
};
```

- [ ] **Step 5.2: updateHandle service 함수 신규 (30일 제한)**

```ts
const HANDLE_CHANGE_COOLDOWN_DAYS = 30;
const HANDLE_CHANGE_COOLDOWN_MS = HANDLE_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

const updateHandle = async (userId, { handle }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound("사용자를 찾을 수 없습니다.");
  }

  // 30일 제한 체크
  if (user.handleChangedAt) {
    const elapsed = Date.now() - user.handleChangedAt.getTime();
    if (elapsed < HANDLE_CHANGE_COOLDOWN_MS) {
      const remaining = Math.ceil(
        (HANDLE_CHANGE_COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000)
      );
      throw AppError.badRequest(`${remaining}일 후에 변경 가능합니다.`);
    }
  }

  const { validateHandleFormat } = require("../../utils/handle.util");
  const loweredHandle = (handle || "").toLowerCase().trim();
  if (!validateHandleFormat(loweredHandle)) {
    throw AppError.badRequest("올바르지 않은 ID 형식입니다.");
  }

  // 본인 handle 동일하면 패스
  if (user.handle === loweredHandle) {
    return user;
  }

  const handleExists = await User.findOne({ handle: loweredHandle });
  if (handleExists) {
    throw AppError.badRequest("이미 사용 중인 ID입니다.");
  }

  user.handle = loweredHandle;
  user.handleChangedAt = new Date();
  await user.save();
  return user;
};
```

`module.exports`에 `updateProfile`, `updateHandle` 추가.

- [ ] **Step 5.3: controller 핸들러**

`account.controller.ts`:

```ts
const updateProfileController = async (req, res) => {
  try {
    const user = await accountService.updateProfile(req.user.userId, req.body);
    res.status(200).json({ data: user });
  } catch (err) {
    handleError(res, err);
  }
};

const updateHandleController = async (req, res) => {
  try {
    const user = await accountService.updateHandle(req.user.userId, req.body);
    res.status(200).json({ data: user });
  } catch (err) {
    handleError(res, err);
  }
};
```

`module.exports`에 추가.

- [ ] **Step 5.4: 라우트**

`account.route.ts`:

```ts
router.patch("/profile", validate(updateProfileSchema), accountController.updateProfileController);
router.patch("/handle", validate(updateHandleSchema), accountController.updateHandleController);
```

- [ ] **Step 5.5: validator**

`account.validator.ts`에 신규 스키마 추가:

```ts
const updateProfileSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(30).optional(),
    nickname: Joi.string().trim().min(1).max(20).optional(),
  }).min(1),
};

const updateHandleSchema = {
  body: Joi.object({
    handle: Joi.string().lowercase().trim().pattern(/^[a-z0-9_]{3,20}$/).required(),
  }),
};

module.exports = {
  // ... 기존
  updateProfileSchema,
  updateHandleSchema,
};
```

- [ ] **Step 5.6: 커밋**

```bash
git add backend/services/account/account.service.ts backend/controllers/account.controller.ts backend/routes/account.route.ts backend/validators/account.validator.ts
git commit -m "feat(backend): 프로필/handle 수정 엔드포인트

- PATCH /account/profile: name/nickname 수정
- PATCH /account/handle: handle 수정 + 30일 제한 검증
- 본인 handle 그대로면 통과 (no-op)"
```

---

## Task 6: 팀 초대를 handle 기반으로 변경

**Files:**
- Modify: `backend/services/team/team.service.ts:107` (inviteMember 함수)
- Modify: `backend/controllers/team.controller.ts:49` (inviteMember 컨트롤러)
- Modify: `backend/validators/team.validator.ts` (inviteMemberSchema)

- [ ] **Step 6.1: inviteMember service 변경**

기존:
```ts
const inviteMember = async (teamId, ownerId, email) => {
  // ...
  const user = await User.findOne({ email, provider: { $in: ["local", "google", "naver", "kakao"] } });
  // ...
};
```

변경:
```ts
const inviteMember = async (teamId, ownerId, handle) => {
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

  const loweredHandle = (handle || "").toLowerCase().trim();
  const user = await User.findOne({ handle: loweredHandle });

  if (!user) {
    throw AppError.notFound("해당 ID의 사용자를 찾을 수 없습니다.");
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

- [ ] **Step 6.2: controller 변경**

`team.controller.ts`의 `inviteMember`:

```ts
const inviteMember = async (req, res) => {
  try {
    const team = await teamService.inviteMember(
      req.params.teamId,
      req.user.userId,
      req.body.handle  // email → handle
    );
    res.status(200).json({ data: team });
  } catch (err) {
    handleError(res, err);
  }
};
```

- [ ] **Step 6.3: validator 변경**

`team.validator.ts`의 `inviteMemberSchema`:

기존 `email` 필드를 `handle`로 교체:

```ts
const inviteMemberSchema = {
  params: Joi.object({
    teamId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    handle: Joi.string().lowercase().trim().pattern(/^[a-z0-9_]{3,20}$/).required(),
  }),
};
```

- [ ] **Step 6.4: 커밋**

```bash
git add backend/services/team/team.service.ts backend/controllers/team.controller.ts backend/validators/team.validator.ts
git commit -m "feat(backend): 팀 초대를 email → handle 기반으로 변경

- inviteMember(teamId, ownerId, handle): User.findOne({ handle })
- '해당 ID의 사용자를 찾을 수 없습니다' 에러 추가
- validator: body.email → body.handle"
```

---

## Task 7: 모바일 — User 타입 + API 클라이언트 + Store

**Files:**
- Modify: `mobile/src/types/user.ts`
- Modify: `mobile/src/api/auth.ts`
- Modify: `mobile/src/api/account.ts`
- Modify: `mobile/src/api/team.ts`
- Modify: `mobile/src/store/authStore.ts`

- [ ] **Step 7.1: User 타입 확장**

`mobile/src/types/user.ts`:

```ts
export type User = {
  _id?: string;
  id?: string;
  email: string;
  name: string;
  nickname: string;
  handle?: string;
  handleChangedAt?: string;
  provider: "local" | "google" | "naver" | "kakao" | "apple";
  // ... 기타 기존 필드
};
```

(기존 타입 구조 따라 — 정확한 export 방식 유지).

- [ ] **Step 7.2: auth API 클라이언트 확장**

`mobile/src/api/auth.ts` — signup 시그니처 변경 + completeOAuthProfile 추가:

```ts
export const authApi = {
  // 기존
  signupLocal: (data: {
    email: string;
    password: string;
    name: string;
    nickname: string;
    handle: string;
  }) => apiClient.post("/auth/signup", data),

  // 신규
  completeOAuthProfile: (data: {
    name?: string;
    nickname: string;
    handle: string;
  }) => apiClient.post("/auth/oauth/complete-profile", data),

  // ... 기타 기존
};
```

(기존 `signupLocal` 또는 `signup` 함수 시그니처 정확히 따르고 nickname/handle 필드 추가)

- [ ] **Step 7.3: account API 클라이언트 신규/확장**

`mobile/src/api/account.ts`:

```ts
import { apiClient } from "./client";

type DataResponse<T> = { data: T; message?: string };

export const accountApi = {
  // 기존 ...

  checkHandle: (handle: string) =>
    apiClient.get(`/account/check-handle?handle=${encodeURIComponent(handle)}`) as Promise<
      DataResponse<{ available: boolean; reason?: "format" | "taken" }>
    >,

  updateProfile: (data: { name?: string; nickname?: string }) =>
    apiClient.patch("/account/profile", data) as Promise<DataResponse<unknown>>,

  updateHandle: (handle: string) =>
    apiClient.patch("/account/handle", { handle }) as Promise<DataResponse<unknown>>,
};
```

- [ ] **Step 7.4: team API 클라이언트 변경**

`mobile/src/api/team.ts`의 `inviteMember`:

기존:
```ts
inviteMember: (teamId: string, email: string) =>
  apiClient.post(`/teams/${teamId}/members`, { email }),
```

변경:
```ts
inviteMember: (teamId: string, handle: string) =>
  apiClient.post(`/teams/${teamId}/members`, { handle }),
```

- [ ] **Step 7.5: authStore 확장**

`mobile/src/store/authStore.ts`의 user 객체에 nickname/handle 자연스럽게 들어감 (User 타입 확장이라). signup 액션 시그니처 변경:

```ts
signup: async (
  email: string,
  password: string,
  name: string,
  nickname: string,
  handle: string
) => {
  await authApi.signupLocal({ email, password, name, nickname, handle });
  // ... 기존
};
```

- [ ] **Step 7.6: TypeScript 컴파일**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -E "user\.ts|auth\.ts|account\.ts|team\.ts|authStore" | head -10
```

Expected: 에러 0건.

- [ ] **Step 7.7: 커밋**

```bash
git add mobile/src/types/user.ts mobile/src/api/auth.ts mobile/src/api/account.ts mobile/src/api/team.ts mobile/src/store/authStore.ts
git commit -m "feat(mobile): User 타입 + API 클라이언트 + store 확장

- User 타입에 nickname, handle, handleChangedAt 추가
- accountApi: checkHandle, updateProfile, updateHandle 신규
- authApi: signupLocal nickname/handle 필드, completeOAuthProfile 신규
- teamApi.inviteMember: email → handle"
```

---

## Task 8: HandleInput 재사용 컴포넌트

**Files:**
- Create: `mobile/src/components/profile/HandleInput.tsx`

- [ ] **Step 8.1: 파일 작성**

```tsx
import { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Check, X } from "lucide-react-native";
import { Input } from "@/components/ui/Input";
import { accountApi } from "@/api/account";

type Status = "idle" | "checking" | "available" | "format" | "taken";

type Props = {
  value: string;
  onChange: (handle: string) => void;
  /** 변경 안 한 본인 handle은 사용 가능으로 간주 */
  ownHandle?: string;
};

export function HandleInput({ value, onChange, ownHandle }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value) {
      setStatus("idle");
      return;
    }

    if (ownHandle && value.toLowerCase() === ownHandle.toLowerCase()) {
      setStatus("available");
      return;
    }

    setStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await accountApi.checkHandle(value);
        if (res.data.available) {
          setStatus("available");
        } else if (res.data.reason === "format") {
          setStatus("format");
        } else {
          setStatus("taken");
        }
      } catch {
        setStatus("idle");
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, ownHandle]);

  const message = (() => {
    switch (status) {
      case "checking":
        return null;
      case "available":
        return { text: "사용 가능해요", color: "#3DD598" };
      case "format":
        return {
          text: "영문 소문자, 숫자, 언더스코어만 가능 (3~20자)",
          color: "#EF4444",
        };
      case "taken":
        return { text: "이미 사용 중이에요", color: "#EF4444" };
      default:
        return null;
    }
  })();

  return (
    <View>
      <Input
        label="ID"
        value={value}
        onChangeText={(t) => onChange(t.toLowerCase())}
        placeholder="예: aen_kim"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
      />
      <View className="flex-row items-center mt-1" style={{ minHeight: 18 }}>
        {status === "checking" && <ActivityIndicator size="small" color="#8B95A1" />}
        {status === "available" && <Check size={14} color="#3DD598" />}
        {(status === "format" || status === "taken") && (
          <X size={14} color="#EF4444" />
        )}
        {message && (
          <Text
            className="text-sub ml-1"
            style={{ color: message.color, fontSize: 12 }}
          >
            {message.text}
          </Text>
        )}
      </View>
    </View>
  );
}

export type HandleStatus = Status;
export const isHandleValid = (status: Status) => status === "available";
```

- [ ] **Step 8.2: TypeScript 컴파일 확인**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "HandleInput" | head -3
```

Expected: 에러 0건.

- [ ] **Step 8.3: 커밋**

```bash
git add mobile/src/components/profile/HandleInput.tsx
git commit -m "feat(mobile): HandleInput 재사용 컴포넌트 신규

- 500ms 디바운스 + accountApi.checkHandle
- 상태별 아이콘/메시지 (사용가능/형식 오류/이미 사용중/체크중)
- 본인 handle은 자동 사용가능 처리 (ownHandle prop)"
```

---

## Task 9: 이메일 가입 화면 — 실명/닉네임/handle 추가

**Files:**
- Modify: `mobile/app/(auth)/signup.tsx`

- [ ] **Step 9.1: 새 입력 필드 + state**

기존 signup.tsx 구조 유지하되 입력 필드 추가. 변경 부분:

```tsx
// state 추가:
const [realName, setRealName] = useState("");  // = name (실명)
const [nickname, setNickname] = useState("");
const [handle, setHandle] = useState("");

// 기존 name state는 nickname으로 의미 변경 — 변수명 변경 또는 매핑.
// 실명용 state 신규.
```

> **노트**: 기존 `name` state가 닉네임 의미였으면 그대로 nickname state로 바꾸고, 신규로 realName state 추가.

- [ ] **Step 9.2: validate 함수 확장**

```tsx
const validate = () => {
  const e: Record<string, string> = {};
  const trimmedRealName = realName.trim();
  const trimmedNickname = nickname.trim();
  const trimmedHandle = handle.trim().toLowerCase();

  if (!trimmedRealName) e.realName = "실명을 입력해주세요";
  else if (trimmedRealName.length > 30) e.realName = "실명은 30자 이하";

  if (!trimmedNickname) e.nickname = "닉네임을 입력해주세요";
  else if (trimmedNickname.length > 20) e.nickname = "닉네임은 20자 이하";

  if (!trimmedHandle) e.handle = "ID를 입력해주세요";
  else if (!/^[a-z0-9_]{3,20}$/.test(trimmedHandle))
    e.handle = "영문 소문자/숫자/언더스코어 3~20자";

  if (!email) e.email = "이메일을 입력해주세요";
  else if (!/\S+@\S+\.\S+/.test(email)) e.email = "올바른 이메일 형식이 아닙니다";

  if (!password) e.password = "비밀번호를 입력해주세요";
  else if (password.length < 8 || password.length > 20)
    e.password = "비밀번호는 8~20자 사이여야 합니다";

  if (!confirmPassword) e.confirmPassword = "비밀번호 확인을 입력해주세요";
  else if (password !== confirmPassword)
    e.confirmPassword = "비밀번호가 일치하지 않습니다";

  setErrors(e);
  return Object.keys(e).length === 0;
};
```

- [ ] **Step 9.3: handleSignup 변경**

```tsx
const handleSignup = async () => {
  if (!validate()) return;
  try {
    await signup(
      email.trim(),
      password,
      realName.trim(),
      nickname.trim(),
      handle.trim().toLowerCase()
    );
    showToast("success", "가입 완료", "로그인해주세요!");
    router.replace("/(auth)/login");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "회원가입에 실패했습니다.";
    if (message.includes("ID") || message.includes("handle"))
      setErrors((prev) => ({ ...prev, handle: message }));
    else if (message.includes("이메일") || message.includes("email"))
      setErrors((prev) => ({ ...prev, email: message }));
    else if (message.includes("비밀번호") || message.includes("password"))
      setErrors((prev) => ({ ...prev, password: message }));
    else showToast("error", "가입 실패", message);
  }
};
```

- [ ] **Step 9.4: JSX에 필드 렌더링**

기존 Input 들 아래(또는 위)에 추가. 다음 구조:

```tsx
<Input
  label="실명"
  value={realName}
  onChangeText={(v) => { setRealName(v); clearError("realName"); }}
  error={errors.realName}
  maxLength={30}
/>
<Input
  label="닉네임"
  value={nickname}
  onChangeText={(v) => { setNickname(v); clearError("nickname"); }}
  error={errors.nickname}
  maxLength={20}
/>
<HandleInput value={handle} onChange={(v) => { setHandle(v); clearError("handle"); }} />
{errors.handle && (
  <Text className="text-sub text-expense mt-1">{errors.handle}</Text>
)}
<Input
  label="이메일"
  // ... 기존
/>
// ... 비밀번호 등
```

`HandleInput` import 추가: `import { HandleInput } from "@/components/profile/HandleInput";`

- [ ] **Step 9.5: TypeScript 컴파일**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "signup" | head -5
```

Expected: 에러 0건.

- [ ] **Step 9.6: 시뮬레이터 검증**

- [ ] 가입 화면에 실명 / 닉네임 / 이메일 / ID / 비밀번호 / 비밀번호 확인 6개 필드
- [ ] ID 입력 시 ✓/✗ 실시간 표시
- [ ] 가입 성공 시 로그인 화면으로

- [ ] **Step 9.7: 커밋**

```bash
git add mobile/app/\(auth\)/signup.tsx
git commit -m "feat(mobile): 이메일 가입 화면에 실명/닉네임/handle 추가

- 6개 필드 (실명/닉네임/이메일/ID/비번/비번확인)
- HandleInput 컴포넌트로 실시간 ID 사용 가능 체크
- validate 확장 + handleSignup 시그니처 매칭"
```

---

## Task 10: setup-profile 화면 + AuthGuard 보강

**Files:**
- Create: `mobile/app/setup-profile.tsx`
- Modify: `mobile/app/_layout.tsx`

- [ ] **Step 10.1: setup-profile 화면**

`mobile/app/setup-profile.tsx`:

```tsx
import { useState, useEffect } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { HandleInput } from "@/components/profile/HandleInput";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/api/auth";

export default function SetupProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [realName, setRealName] = useState(user?.name ?? "");
  const [nickname, setNickname] = useState("");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);

  // provider가 실명을 줬으면 자동 채움 (수정 가능)
  // 못 받았으면 빈칸 (필수 입력)
  const realNameAlreadyProvided = !!user?.name;

  const handleSave = async () => {
    const trimmedName = realName.trim();
    const trimmedNickname = nickname.trim();
    const trimmedHandle = handle.trim().toLowerCase();

    if (!trimmedName) {
      showToast("error", "실명을 입력해주세요");
      return;
    }
    if (!trimmedNickname) {
      showToast("error", "닉네임을 입력해주세요");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(trimmedHandle)) {
      showToast("error", "ID 형식이 올바르지 않습니다");
      return;
    }

    setSaving(true);
    try {
      await authApi.completeOAuthProfile({
        name: trimmedName,
        nickname: trimmedNickname,
        handle: trimmedHandle,
      });
      await refreshUser();
      showToast("success", "프로필 완성", "환영합니다!");
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "다시 시도해주세요";
      showToast("error", "저장 실패", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="프로필 설정" />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>
        <Text className="text-body text-text-secondary mb-6">
          작은 모임을 사용하기 전에{"\n"}프로필 정보를 입력해주세요.
        </Text>
        <View style={{ gap: 16 }}>
          <Input
            label={realNameAlreadyProvided ? "실명 (수정 가능)" : "실명"}
            value={realName}
            onChangeText={setRealName}
            maxLength={30}
            placeholder="실명을 입력해주세요"
          />
          <Input
            label="닉네임"
            value={nickname}
            onChangeText={setNickname}
            maxLength={20}
            placeholder="모임에서 보일 이름"
          />
          <HandleInput value={handle} onChange={setHandle} />
          <Button
            label="시작하기"
            variant="primary"
            size="full"
            loading={saving}
            onPress={handleSave}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
```

> **노트**: `refreshUser` 액션이 authStore에 없으면 추가 — 현재 user 다시 fetch하는 함수 (예: `GET /account/me` 호출 후 set).

- [ ] **Step 10.2: authStore에 refreshUser 추가 (없을 경우)**

`mobile/src/store/authStore.ts`의 actions에 추가:

```ts
refreshUser: async () => {
  try {
    const res = await accountApi.me();  // 또는 authApi.me()
    set({ user: res.data });
  } catch {
    // ignore
  }
},
```

(정확한 me 호출 함수명은 기존 코드 따라)

- [ ] **Step 10.3: AuthGuard 보강**

`mobile/app/_layout.tsx`의 AuthGuard 안:

```tsx
useEffect(() => {
  if (!isReady) return;

  const inAuthGroup = segments[0] === "(auth)";
  const inSetup = segments[0] === "setup-profile";

  if (!user && !inAuthGroup) {
    router.replace("/(auth)/login");
  } else if (user && inAuthGroup) {
    router.replace("/(tabs)");
  } else if (user && !user.handle && !inSetup) {
    // 로그인 됐지만 handle 없으면 setup으로 강제
    router.replace("/setup-profile");
  } else if (user && user.handle && inSetup) {
    // 이미 handle 있는 사용자가 setup으로 들어왔으면 홈으로
    router.replace("/(tabs)");
  }
}, [user, segments, isReady]);
```

- [ ] **Step 10.4: Stack.Screen 등록**

`mobile/app/_layout.tsx`의 RootStack에 추가:

```tsx
<Stack.Screen name="setup-profile" options={{ gestureEnabled: false }} />
```

(`gestureEnabled: false`로 swipe back 차단 — 강제 setup 흐름)

- [ ] **Step 10.5: TypeScript 컴파일**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep -E "setup-profile|_layout" | head -5
```

Expected: 에러 0건.

- [ ] **Step 10.6: 검증**

- [ ] 새 OAuth 사용자 가입 → setup-profile 자동 진입
- [ ] 실명/닉네임/handle 입력 후 "시작하기" → 홈으로
- [ ] handle 없는 채로 앱 종료 후 재진입 → setup-profile 강제

- [ ] **Step 10.7: 커밋**

```bash
git add mobile/app/setup-profile.tsx mobile/app/_layout.tsx mobile/src/store/authStore.ts
git commit -m "feat(mobile): setup-profile 화면 + AuthGuard 강제 이동

- OAuth 후 handle 없는 user를 setup-profile로 강제
- provider 실명 자동 채움 (수정 가능), 못 받았으면 빈칸
- 닉네임 + handle 입력 후 completeOAuthProfile 호출"
```

---

## Task 11: profile 화면 신규 + 라우트 등록

**Files:**
- Create: `mobile/app/profile.tsx`
- Modify: `mobile/app/_layout.tsx`

- [ ] **Step 11.1: profile.tsx 작성**

```tsx
import { useState } from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Lock, Pencil } from "lucide-react-native";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { showToast } from "@/components/ui/Toast";
import { HandleInput } from "@/components/profile/HandleInput";
import { useAuthStore } from "@/store/authStore";
import { accountApi } from "@/api/account";

const HANDLE_COOLDOWN_DAYS = 30;

function getDaysUntilHandleChangeable(changedAt?: string): number {
  if (!changedAt) return 0;
  const elapsed = Date.now() - new Date(changedAt).getTime();
  const remaining = HANDLE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000 - elapsed;
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const logout = useAuthStore((s) => s.logout);

  const [editingField, setEditingField] = useState<"name" | "nickname" | "handle" | null>(null);
  const [draftName, setDraftName] = useState(user?.name ?? "");
  const [draftNickname, setDraftNickname] = useState(user?.nickname ?? "");
  const [draftHandle, setDraftHandle] = useState(user?.handle ?? "");
  const [saving, setSaving] = useState(false);

  const handleDaysLeft = getDaysUntilHandleChangeable(user?.handleChangedAt);
  const canChangeHandle = handleDaysLeft === 0;

  const startEdit = (field: "name" | "nickname" | "handle") => {
    if (field === "handle" && !canChangeHandle) {
      showToast(
        "info",
        `${handleDaysLeft}일 후에 변경 가능합니다`,
        "ID는 30일에 1회 변경할 수 있어요"
      );
      return;
    }
    setDraftName(user?.name ?? "");
    setDraftNickname(user?.nickname ?? "");
    setDraftHandle(user?.handle ?? "");
    setEditingField(field);
  };

  const cancelEdit = () => setEditingField(null);

  const saveEdit = async () => {
    setSaving(true);
    try {
      if (editingField === "name") {
        await accountApi.updateProfile({ name: draftName.trim() });
      } else if (editingField === "nickname") {
        await accountApi.updateProfile({ nickname: draftNickname.trim() });
      } else if (editingField === "handle") {
        await accountApi.updateHandle(draftHandle.trim().toLowerCase());
      }
      await refreshUser();
      showToast("success", "수정 완료");
      setEditingField(null);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "다시 시도해주세요";
      showToast("error", "수정 실패", msg);
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const onWithdraw = () => {
    Alert.alert(
      "회원 탈퇴",
      "정말 탈퇴하시겠어요? 모든 데이터가 삭제됩니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴",
          style: "destructive",
          onPress: async () => {
            try {
              await accountApi.withdraw();
              await logout();
              router.replace("/(auth)/login");
            } catch (e: unknown) {
              const msg =
                e && typeof e === "object" && "message" in e
                  ? String((e as { message: unknown }).message)
                  : "다시 시도해주세요";
              showToast("error", "탈퇴 실패", msg);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer scrollable={false}>
      <Header title="프로필" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* 프로필 헤더 */}
        <View className="items-center py-6">
          <View
            className="w-24 h-24 rounded-full bg-brand items-center justify-center mb-4"
          >
            <Text className="text-white text-xl font-pretendard-bold">
              {user?.nickname?.charAt(0) ?? "?"}
            </Text>
          </View>
          <Text className="text-title font-pretendard-bold text-text-primary">
            {user?.nickname ?? "닉네임"}
          </Text>
          <Text className="text-sub text-text-secondary mt-1">
            @{user?.handle ?? "—"}
          </Text>
        </View>

        {/* 정보 행들 */}
        <ProfileRow
          label="실명"
          value={user?.name ?? ""}
          editing={editingField === "name"}
          onStartEdit={() => startEdit("name")}
          onSave={saveEdit}
          onCancel={cancelEdit}
          editor={
            <Input
              label="실명"
              value={draftName}
              onChangeText={setDraftName}
              maxLength={30}
            />
          }
          saving={saving && editingField === "name"}
        />

        <ProfileRow
          label="닉네임"
          value={user?.nickname ?? ""}
          editing={editingField === "nickname"}
          onStartEdit={() => startEdit("nickname")}
          onSave={saveEdit}
          onCancel={cancelEdit}
          editor={
            <Input
              label="닉네임"
              value={draftNickname}
              onChangeText={setDraftNickname}
              maxLength={20}
            />
          }
          saving={saving && editingField === "nickname"}
        />

        <ProfileRow
          label="ID"
          value={user?.handle ? `@${user.handle}` : ""}
          editing={editingField === "handle"}
          onStartEdit={() => startEdit("handle")}
          onSave={saveEdit}
          onCancel={cancelEdit}
          editor={
            <HandleInput
              value={draftHandle}
              onChange={setDraftHandle}
              ownHandle={user?.handle}
            />
          }
          saving={saving && editingField === "handle"}
          locked={!canChangeHandle}
          lockedHint={`${handleDaysLeft}일 후 변경 가능`}
        />

        <View className="px-4 py-3 border-b border-divider flex-row items-center justify-between">
          <Text className="text-body text-text-secondary">이메일</Text>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text className="text-body text-text-primary">{user?.email}</Text>
            <Lock size={14} color="#B0B8C1" />
          </View>
        </View>

        {/* 비밀번호 변경 (local 가입자만) */}
        {user?.provider === "local" && (
          <Pressable
            onPress={() => router.push("/change-password")}
            className="px-4 py-4 border-b border-divider flex-row items-center justify-between"
          >
            <Text className="text-body text-text-primary">비밀번호 변경</Text>
            <ChevronRight size={20} color="#B0B8C1" />
          </Pressable>
        )}

        {/* 로그아웃 / 탈퇴 */}
        <View className="mt-section-gap">
          <Pressable
            onPress={onLogout}
            className="px-4 py-4 border-b border-divider"
          >
            <Text className="text-body text-text-primary">로그아웃</Text>
          </Pressable>
          <Pressable onPress={onWithdraw} className="px-4 py-4">
            <Text className="text-body text-expense">회원 탈퇴</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function ProfileRow({
  label,
  value,
  editing,
  onStartEdit,
  onSave,
  onCancel,
  editor,
  saving,
  locked,
  lockedHint,
}: {
  label: string;
  value: string;
  editing: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  editor: React.ReactNode;
  saving: boolean;
  locked?: boolean;
  lockedHint?: string;
}) {
  if (editing) {
    return (
      <View className="px-4 py-4 border-b border-divider">
        {editor}
        <View className="flex-row mt-3" style={{ gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label="취소" variant="outline" size="md" onPress={onCancel} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="저장"
              variant="primary"
              size="md"
              loading={saving}
              onPress={onSave}
            />
          </View>
        </View>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onStartEdit}
      className="px-4 py-4 border-b border-divider flex-row items-center justify-between"
    >
      <Text className="text-body text-text-secondary">{label}</Text>
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <Text className="text-body text-text-primary">{value}</Text>
        {locked ? (
          <Lock size={14} color="#B0B8C1" />
        ) : (
          <Pencil size={14} color="#B0B8C1" />
        )}
      </View>
      {locked && lockedHint && (
        <Text className="text-xs text-text-secondary ml-2">{lockedHint}</Text>
      )}
    </Pressable>
  );
}
```

> **노트**: `accountApi.withdraw()`가 기존에 없으면 추가 필요. 현재 더보기 탭의 회원 탈퇴 로직 참조.

- [ ] **Step 11.2: 라우트 등록**

`mobile/app/_layout.tsx`:

```tsx
<Stack.Screen name="profile" />
```

- [ ] **Step 11.3: TypeScript 컴파일**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "profile" | head -5
```

Expected: 에러 0건.

- [ ] **Step 11.4: 검증 (시뮬레이터)**

- [ ] /profile 직접 진입 (router.push로) 시 화면 정상
- [ ] 실명 행 탭 → 편집 모드 → 수정/저장 동작
- [ ] 닉네임 행 탭 → 편집 모드 → 수정/저장 동작
- [ ] ID 행 — 30일 미만이면 자물쇠 + 토스트, 30일 경과면 편집 가능
- [ ] 비밀번호 변경 항목 — local 사용자만 보임
- [ ] 로그아웃 → 로그인 화면
- [ ] 회원 탈퇴 → 확인 후 탈퇴

- [ ] **Step 11.5: 커밋**

```bash
git add mobile/app/profile.tsx mobile/app/_layout.tsx
git commit -m "feat(mobile): 프로필 화면 신규

- 아바타 + 닉네임 + @handle 헤더
- 실명/닉네임/ID/이메일 인라인 편집
- ID 30일 제한 (자물쇠 + 토스트)
- 비밀번호 변경 (local만), 로그아웃, 회원 탈퇴 통합"
```

---

## Task 12: 더보기 탭 정리

**Files:**
- Modify: `mobile/app/(tabs)/more.tsx`

- [ ] **Step 12.1: 비번 변경/로그아웃/탈퇴 항목 제거 + 프로필 카드 탭 핸들러**

`more.tsx`의 해당 메뉴 항목 3개 제거. 그리고 상단 프로필 카드(이름/이메일 보이는 부분)에 onPress 추가:

```tsx
<Pressable
  onPress={() => router.push("/profile")}
  className="bg-card rounded-2xl p-4 mb-section-gap"
>
  {/* 기존 아바타 + 이름 + 이메일 표시 그대로 */}
</Pressable>
```

기존 카드가 Pressable이 아니면 Pressable로 감싸기. 이미 Pressable이면 onPress만 추가.

- [ ] **Step 12.2: 검증**

- [ ] 더보기 탭에서 비밀번호 변경/로그아웃/회원 탈퇴 항목 모두 사라짐
- [ ] 프로필 카드 탭 → /profile 이동

- [ ] **Step 12.3: 커밋**

```bash
git add mobile/app/\(tabs\)/more.tsx
git commit -m "feat(mobile): 더보기 탭 정리 — 프로필 항목 제거 + 프로필 카드 탭 핸들러

- 비밀번호 변경/로그아웃/회원 탈퇴 메뉴 항목 제거 (프로필 화면으로 통합됨)
- 상단 프로필 카드 탭하면 /profile 이동"
```

---

## Task 13: team/invite.tsx — handle 입력으로 변경

**Files:**
- Modify: `mobile/app/team/invite.tsx`

- [ ] **Step 13.1: 입력 필드 + 검증 + API 호출 변경**

기존 email 관련 모두 handle로 교체:

```tsx
const [handle, setHandle] = useState("");
const [error, setError] = useState("");

const handleInvite = async () => {
  const trimmed = handle.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
    setError("ID 형식이 올바르지 않아요");
    return;
  }
  setError("");
  try {
    await teamApi.inviteMember(teamId!, trimmed);
    showToast("success", "초대 완료", `@${trimmed} 님께 초대를 보냈어요`);
    router.back();
  } catch (e: unknown) {
    const msg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message: unknown }).message)
        : "초대에 실패했어요";
    setError(msg);
  }
};
```

JSX의 Input:
```tsx
<Input
  label="ID"
  placeholder="@aen_kim"
  value={handle}
  onChangeText={(v) => { setHandle(v.toLowerCase()); setError(""); }}
  autoCapitalize="none"
  autoCorrect={false}
  maxLength={20}
  error={error}
/>
```

(헤더 제목 등 "이메일 초대" → "ID로 초대" 변경 등 라벨도 같이 수정)

- [ ] **Step 13.2: 검증**

- [ ] 모임 관리 → 이메일 초대 메뉴 → 화면 진입
- [ ] handle 입력 → 초대 성공
- [ ] 잘못된 handle → "사용자 찾을 수 없습니다" 에러
- [ ] 형식 오류 → 클라이언트 검증 에러

- [ ] **Step 13.3: 커밋**

```bash
git add mobile/app/team/invite.tsx
git commit -m "feat(mobile): 모임 초대 UI를 ID(handle) 기반으로 변경

이메일 입력란 제거, ID 입력으로 통일.
형식 검증 클라/서버 양쪽."
```

---

## Task 14: 멤버 목록 표시를 닉네임으로 변경

**Files:**
- Modify: `mobile/app/team/[teamId].tsx`
- Modify: `mobile/app/notifications.tsx` (필요 시)
- Modify: `mobile/app/(tabs)/more.tsx` 또는 다른 멤버 표시 위치

- [ ] **Step 14.1: 멤버 표시 부분 찾아 nickname 사용**

`team/[teamId].tsx`의 멤버 카드:

기존 (대략):
```tsx
title={memberUser.name || "알 수 없음"}
subtitle={member.role === "owner" ? "팀장" : memberUser.email}
```

변경:
```tsx
title={memberUser.nickname || memberUser.name || "알 수 없음"}
subtitle={member.role === "owner" ? "팀장" : `@${memberUser.handle ?? ""}`}
```

(이메일 노출 회피 + 닉네임 표시)

- [ ] **Step 14.2: notifications.tsx 초대자 표시 변경**

`InvitationCard`의 `invitation.invitedBy?.name` 부분을 `invitation.invitedBy?.nickname` 으로 (백엔드도 nickname 포함 응답하는지 확인 필요 — populate에 nickname 추가).

백엔드 service에서 populate 변경:
```ts
.populate("pendingInvites.invitedBy", "name nickname email")
```

- [ ] **Step 14.3: 검증**

- [ ] 모임 멤버 목록에 닉네임 + @handle 표시 (이메일 X)
- [ ] 알림 카드에 "{nickname}님이 초대했어요"

- [ ] **Step 14.4: 커밋**

```bash
git add backend/services/team/team.service.ts mobile/app/team/\[teamId\].tsx mobile/app/notifications.tsx
git commit -m "feat(mobile+backend): 멤버 표시를 닉네임 + @handle로 변경

- 팀 관리: 닉네임 + @handle (이메일 노출 회피)
- 알림 카드: 초대자 닉네임
- 백엔드 populate에 nickname 추가"
```

---

## Task 15: 종합 E2E 검증

**Files:** 검증만

- [ ] **Step 15.1: 두 사용자 가입 플로우**

새 시뮬레이터/실기기에서:
- [ ] 사용자 A 이메일 가입 → 실명/닉네임/handle 입력 → 가입 성공
- [ ] 사용자 B OAuth 가입 (구글/카카오) → setup-profile 자동 이동 → 입력 → 홈

- [ ] **Step 15.2: 모임 + 초대 플로우 (handle 기반)**

- [ ] A가 모임 만들기
- [ ] A가 모임 관리 → "ID로 초대" → B의 handle 입력 → 성공
- [ ] B가 홈에서 종 → /notifications → 초대 카드 (닉네임 표시) → [수락]
- [ ] A의 모임 멤버 목록에 B 표시 (닉네임 + @handle)

- [ ] **Step 15.3: 프로필 편집 플로우**

- [ ] 프로필 화면 진입
- [ ] 실명 / 닉네임 인라인 편집 → 저장 → 즉시 반영
- [ ] handle 변경 시도 → 30일 미만이면 자물쇠 + 토스트
- [ ] (테스트 위해 DB에서 handleChangedAt을 30일 전으로 수정 후) handle 변경 가능 → 저장
- [ ] 비밀번호 변경 (local 사용자만) → 작동 확인
- [ ] 로그아웃 → 로그인 화면
- [ ] 회원 탈퇴 → 확인

- [ ] **Step 15.4: 더보기 탭 정리 확인**

- [ ] 더보기 탭에서 비번/로그아웃/탈퇴 항목 사라짐
- [ ] 프로필 카드 탭 → /profile

- [ ] **Step 15.5: 회귀 검증**

- [ ] 4탭 스와이프 정상
- [ ] EmptyState (모임 없을 때) 메시 그라디언트 정상
- [ ] 알림 종 우측 상단
- [ ] 모임 정보 수정 (모임장만) 정상

이슈 발견 시 즉시 수정 + 별도 commit.

---

## Task 16: push + 메모리 업데이트

- [ ] **Step 16.1: 모든 commit 확인**

```bash
git log origin/main..HEAD --oneline
```

- [ ] **Step 16.2: push**

```bash
git push origin main
```

- [ ] **Step 16.3: 메모리 업데이트**

`~/.claude/projects/-Users-jobogeun-aen-project-PocketPay/memory/v1_post_release_features.md` 또는 신규 메모리에 다음 추가:

- 2026-05-08: handle ID 시스템 + 프로필 통합 완료
- User 모델: nickname/handle/handleChangedAt 추가
- 가입: 실명/닉네임/handle 모두 받음 (OAuth는 setup-profile)
- 초대: handle 기반 (이메일 제거)
- 프로필 화면 신규 (편집/비번/로그아웃/탈퇴 통합)
- DB 초기화 후 새 시작 예정
- 다음: Step B (모임별 displayMode) 또는 다른 미완 작업

---

## Self-Review

### Spec 커버리지

| Spec 섹션 | 구현 Task |
|---|---|
| §3.1 User 모델 변경 | Task 1 |
| §4.1 이메일 가입 흐름 | Task 3 (백엔드), Task 9 (모바일) |
| §4.2 OAuth 가입 흐름 | Task 4 (백엔드), Task 10 (모바일 setup-profile + AuthGuard) |
| §4.3 handle 사용 가능 체크 | Task 2 (백엔드), Task 8 (HandleInput) |
| §5 초대 흐름 변경 | Task 6 (백엔드), Task 13 (모바일) |
| §6 프로필 화면 | Task 11 |
| §6.4 30일 제한 | Task 5 (백엔드), Task 11 (UI) |
| §7 API 엔드포인트 | Task 2, 4, 5, 6 |
| §8 모바일 변경 | Task 7~14 |
| §9 표시 규칙 (닉네임) | Task 14 |
| §10 엣지 케이스 | Task 4 (handle null + AuthGuard), Task 5 (30일), Task 6 (사용자 못 찾음) |
| §11 보안 | 각 Task의 검증 + 라우트 인증 미들웨어 |
| §12 테스트 | Task 15 |

모든 spec 요구사항이 task로 매핑됨. ✅

### Placeholder 체크

- "TBD/TODO" 없음
- 각 step에 실제 코드/명령 포함
- "기존 패턴 따라 조정" 명시한 곳은 Step 안에 정확한 가이드 포함

### 타입 일관성

- `handle` 필드명 일관됨 (백엔드 + 프론트)
- `Invitation` 타입의 `invitedBy.nickname` Task 14에서 추가 — populate도 같이 변경
- `accountApi.checkHandle / updateProfile / updateHandle` 시그니처: Task 7에서 정의, Task 8/11에서 사용 일치
- `authApi.completeOAuthProfile`: Task 7에서 정의, Task 10에서 사용 일치

### 위험 영역

- **Task 1 unique sparse**: 기존 데이터 중 handle 없는 사용자 여러 명 존재 가능 → null 충돌 회피 위해 sparse 필요. 명시됨.
- **Task 4 OAuth 콜백 nickname 임시값**: name으로 채움 → 사용자 setup에서 수정. 명시됨.
- **Task 10 AuthGuard**: handle 없는 user를 setup-profile 강제. 무한 루프 방지 위해 inSetup 체크 추가. 명시됨.
- **Task 14 populate**: 백엔드도 같이 변경 필요 (단순 모바일 변경 X). 명시됨.

이 계획대로 실행 시 spec의 모든 성공 기준 충족.
