# 회원가입 이메일 인증 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이메일 가입 시 6자리 인증 코드 검증을 통과해야 가입 진행되도록 추가. 인라인 단일 화면, 인증 전 다른 필드 비활성화.

**Architecture:** 백엔드 기존 send-code/verify-code 인프라 재사용. `purpose="회원가입"`을 verifyCode 코드 보존 예외 목록에 추가. signupLocal에서 verified 코드 존재 검증 + 가입 후 삭제. 모바일은 signup.tsx에 인증 UI + 60초 카운트다운.

**Tech Stack:** Backend Express + Mongoose. Mobile React Native + Expo Router.

**Spec:** `docs/superpowers/specs/2026-05-08-signup-email-verification-design.md`

**테스트 전략:** 백엔드는 단위 테스트 인프라 없음 → 모바일 시뮬레이터 + 실제 이메일 수신 검증.

---

## File Structure

| 경로 | 변경 |
|---|---|
| `backend/services/auth/verification.service.ts` | "회원가입" purpose 코드 유지 (deleteOne 예외 추가) |
| `backend/services/auth/auth.local.service.ts` | signupLocal에 verified 코드 검증 + 가입 후 삭제 |
| `mobile/app/(auth)/signup.tsx` | 인증 UI + 상태 + 비활성화 + 60초 카운트다운 |

---

## Task 1: 백엔드 — verifyCode 회원가입 purpose 보존 + signupLocal 검증

**Files:**
- Modify: `backend/services/auth/verification.service.ts:58`
- Modify: `backend/services/auth/auth.local.service.ts:6` (signupLocal 시작 부분)

- [ ] **Step 1.1: verifyCode 함수 수정**

`backend/services/auth/verification.service.ts` 변경:

```ts
// 기존 (line 57-60)
// 비밀번호 재설정은 reset-password에서 직접 삭제, 그 외 즉시 삭제
if (purpose !== "비밀번호 재설정") {
  await VerificationCode.deleteOne({ email, purpose });
}
```

으로 변경:

```ts
// 비밀번호 재설정 + 회원가입은 본 엔드포인트에서 직접 삭제, 그 외 즉시 삭제
if (purpose !== "비밀번호 재설정" && purpose !== "회원가입") {
  await VerificationCode.deleteOne({ email, purpose });
}
```

- [ ] **Step 1.2: signupLocal에 verified 코드 검증**

`backend/services/auth/auth.local.service.ts`:

기존:
```ts
const { hashPassword, comparePassword } = require("../../utils/bcrypt.util");
const { User } = require("../../models/index");
const { issueTokenPair } = require("../../utils/jwt.util");
const AppError = require("../../utils/AppError");
const { validateHandleFormat } = require("../../utils/handle.util");

const signupLocal = async ({ email, password, name, nickname, handle }) => {
  const exists = await User.findOne({ email, provider: "local" });
  if (exists) {
    throw AppError.badRequest("이미 가입된 이메일입니다.");
  }
  // ... 기존 로직 ...
};
```

변경:
```ts
const { hashPassword, comparePassword } = require("../../utils/bcrypt.util");
const { User, VerificationCode } = require("../../models/index");
const { issueTokenPair } = require("../../utils/jwt.util");
const AppError = require("../../utils/AppError");
const { validateHandleFormat } = require("../../utils/handle.util");

const signupLocal = async ({ email, password, name, nickname, handle }) => {
  // 이메일 인증 확인
  const verified = await VerificationCode.findOne({
    email,
    purpose: "회원가입",
    expiresAt: { $gt: new Date() },
  });
  if (!verified) {
    throw AppError.badRequest("이메일 인증을 먼저 완료해주세요.");
  }

  const exists = await User.findOne({ email, provider: "local" });
  if (exists) {
    throw AppError.badRequest("이미 가입된 이메일입니다.");
  }

  // ... 기존 handle 검증 + User.create 로직 ...
};
```

그리고 `User.create({...})` 직후 (return 직전 또는 직후)에 추가:

```ts
const user = await User.create({
  email,
  password: hashedPassword,
  name,
  nickname,
  handle: loweredHandle,
  handleChangedAt: new Date(),
  provider: "local",
});

// 가입 성공 후 인증 코드 삭제
await VerificationCode.deleteOne({ email, purpose: "회원가입" });

return user;
```

(현재 `signupLocal`은 `return User.create({...})` 형태이므로 한번 변수에 담아 user.save 후 deleteOne, return으로 변경 필요)

- [ ] **Step 1.3: 커밋**

```bash
git add backend/services/auth/verification.service.ts backend/services/auth/auth.local.service.ts
git commit -m "feat(backend): 회원가입 이메일 인증 검증 추가

- verifyCode: '회원가입' purpose도 통과 후 코드 보존 (signup에서 재검증)
- signupLocal: VerificationCode 존재 + 미만료 체크 후에만 가입 허용
- 가입 성공 시 코드 자동 삭제"
```

---

## Task 2: 모바일 — signup.tsx에 인증 UI 추가

**Files:**
- Modify: `mobile/app/(auth)/signup.tsx`

- [ ] **Step 2.1: import 추가 + 신규 state**

상단 import에 추가:
```tsx
import { useEffect } from "react";
import { authApi } from "@/api/auth";
```

`SignupScreen` 컴포넌트 안 기존 state 선언부 아래에 추가:

```tsx
const [verificationCode, setVerificationCode] = useState("");
const [codeSent, setCodeSent] = useState(false);
const [emailVerified, setEmailVerified] = useState(false);
const [sendingCode, setSendingCode] = useState(false);
const [verifyingCode, setVerifyingCode] = useState(false);
const [resendCountdown, setResendCountdown] = useState(0);
```

- [ ] **Step 2.2: 60초 카운트다운 useEffect**

state 선언부 아래에 추가:

```tsx
useEffect(() => {
  if (resendCountdown <= 0) return;
  const t = setInterval(() => {
    setResendCountdown((s) => Math.max(0, s - 1));
  }, 1000);
  return () => clearInterval(t);
}, [resendCountdown]);
```

- [ ] **Step 2.3: 핸들러 함수 추가**

기존 `handleSignup` 함수 위에 추가:

```tsx
const handleSendCode = async () => {
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    setErrors((prev) => ({ ...prev, email: "올바른 이메일을 입력해주세요" }));
    return;
  }
  setSendingCode(true);
  try {
    await authApi.sendCode({ email: email.trim(), purpose: "회원가입" });
    setCodeSent(true);
    setResendCountdown(60);
    showToast("success", "인증코드 발송", "이메일을 확인해주세요");
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "인증코드 발송 실패";
    showToast("error", "발송 실패", message);
  } finally {
    setSendingCode(false);
  }
};

const handleVerifyCode = async () => {
  if (verificationCode.length !== 6) {
    showToast("error", "인증코드 6자리를 입력해주세요");
    return;
  }
  setVerifyingCode(true);
  try {
    await authApi.verifyCode({
      email: email.trim(),
      code: verificationCode,
      purpose: "회원가입",
    });
    setEmailVerified(true);
    showToast("success", "인증 완료");
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "인증 실패";
    showToast("error", "인증 실패", message);
  } finally {
    setVerifyingCode(false);
  }
};
```

- [ ] **Step 2.4: 이메일 onChange 변경 — 인증 상태 초기화**

기존:
```tsx
<Input
  label="이메일"
  ...
  value={email}
  onChangeText={(v) => {
    setEmail(v);
    clearError("email");
  }}
  ...
/>
```

이메일 입력 부분을 다음 새 블록으로 교체 (인증 UI 통합):

```tsx
{/* 이메일 + 인증 */}
<View>
  <View className="flex-row" style={{ gap: 8 }}>
    <View style={{ flex: 1 }}>
      <Input
        label="이메일"
        placeholder="example@email.com"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          clearError("email");
          // 인증 상태 초기화
          if (emailVerified || codeSent) {
            setEmailVerified(false);
            setCodeSent(false);
            setVerificationCode("");
            setResendCountdown(0);
          }
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!emailVerified}
        error={errors.email}
      />
    </View>
    <View style={{ width: 110, justifyContent: "flex-end" }}>
      <Button
        label={
          resendCountdown > 0
            ? `${resendCountdown}초`
            : codeSent
              ? "재발송"
              : "인증코드"
        }
        variant="outline"
        size="md"
        onPress={handleSendCode}
        loading={sendingCode}
        disabled={resendCountdown > 0 || emailVerified}
      />
    </View>
  </View>
  {codeSent && !emailVerified && (
    <View className="flex-row mt-2" style={{ gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Input
          label="인증코드"
          placeholder="6자리 숫자"
          value={verificationCode}
          onChangeText={(v) => setVerificationCode(v.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
        />
      </View>
      <View style={{ width: 80, justifyContent: "flex-end" }}>
        <Button
          label="확인"
          variant="primary"
          size="md"
          onPress={handleVerifyCode}
          loading={verifyingCode}
          disabled={verificationCode.length !== 6}
        />
      </View>
    </View>
  )}
  {emailVerified && (
    <Text className="text-sub text-brand mt-1 font-pretendard-semibold">
      ✓ 이메일 인증 완료
    </Text>
  )}
</View>
```

- [ ] **Step 2.5: 다른 필드들 emailVerified로 비활성화**

기존 실명/닉네임/HandleInput/비밀번호/비밀번호확인 Input들에 `editable={emailVerified}` 추가:

```tsx
<Input
  label="실명"
  ...
  editable={emailVerified}
  ...
/>
<Input
  label="닉네임"
  ...
  editable={emailVerified}
  ...
/>
{/* HandleInput은 자체 컴포넌트 — 비활성화 prop 추가 필요 */}
<View style={{ opacity: emailVerified ? 1 : 0.4 }} pointerEvents={emailVerified ? "auto" : "none"}>
  <HandleInput
    value={handle}
    onChange={(v) => {
      setHandle(v);
      clearError("handle");
    }}
  />
  {errors.handle && (
    <Text className="text-sub text-expense mt-1">{errors.handle}</Text>
  )}
</View>
<Input
  label="비밀번호"
  ...
  editable={emailVerified}
  ...
/>
<Input
  label="비밀번호 확인"
  ...
  editable={emailVerified}
  ...
/>
```

> **노트**: `editable` prop은 RN TextInput 표준. Input 컴포넌트가 이걸 그대로 통과시키는지 확인. 만약 안 통과하면 wrapper로 감싸 opacity + pointerEvents 처리.

- [ ] **Step 2.6: 가입하기 버튼 emailVerified 체크**

```tsx
<Button
  label="가입하기"
  variant="primary"
  size="full"
  onPress={handleSignup}
  loading={loading}
  disabled={!emailVerified}
/>
```

- [ ] **Step 2.7: TypeScript 컴파일 확인**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "signup\.tsx" | head -5
```

Expected: 에러 0건.

- [ ] **Step 2.8: 시뮬레이터 검증**

- [ ] 진입 → 이메일/인증코드 외 다른 필드 비활성화 (회색)
- [ ] 이메일 입력 → "인증코드" 버튼 활성
- [ ] 받기 → 토스트 + 코드 입력 필드 표시 + 카운트다운 시작
- [ ] 카운트다운 동안 받기 버튼에 "59초", "58초" 등 표시
- [ ] 코드 6자리 입력 + 확인 → ✓ + 토스트
- [ ] 다른 필드 활성화됨
- [ ] 이메일 수정 시 → ✓ 사라짐 + 인증 초기화 + 다른 필드 비활성화
- [ ] 가입 성공 시 토스트 + 로그인 화면

- [ ] **Step 2.9: 커밋**

```bash
git add mobile/app/\(auth\)/signup.tsx
git commit -m "feat(mobile): 회원가입 이메일 인증 UI 추가

- 인증코드 받기 버튼 + 60초 카운트다운
- 6자리 코드 입력 + 확인 버튼
- 인증 통과 전엔 다른 필드 비활성화
- 이메일 수정 시 인증 상태 자동 초기화"
```

---

## Task 3: 종합 검증 + push + 메모리

- [ ] **Step 3.1: 모든 commit 확인 + push**

```bash
git log origin/main..HEAD --oneline
git push origin main
```

- [ ] **Step 3.2: 메모리 업데이트**

`v1_post_release_features.md` 또는 적절한 위치에 다음 추가:
- 2026-05-08: 회원가입 이메일 인증 추가
- verification.service "회원가입" purpose 코드 보존 패턴
- signupLocal verified 코드 체크 + 가입 후 삭제
- 모바일 signup.tsx 인라인 인증 UI

---

## Self-Review

### Spec 커버리지

| Spec 섹션 | Task |
|---|---|
| §3 백엔드 변경 (verification + signupLocal) | Task 1 |
| §4 모바일 변경 (signup.tsx) | Task 2 |
| §5 엣지 케이스 (이메일 수정, 만료, 5회 오류 등) | Task 2.4 (재초기화), Task 1 (백엔드 만료 검증) |
| §6 보안 (rate limit) | 기존 emailLimiter/verifyLimiter 그대로 |
| §7 테스트 | Task 2.8 |

모든 spec 요구사항 매핑됨. ✅

### Placeholder 체크

- "TBD/TODO" 없음
- 각 step에 실제 코드 포함

### 타입 일관성

- `purpose: "회원가입"` 백엔드/프론트 일치
- authApi.sendCode/verifyCode 시그니처 기존 그대로 활용

### 위험 영역

- **Step 2.5 editable prop 통과 여부**: Input 컴포넌트가 editable prop을 TextInput에 forwarding하는지 확인. 안 되면 opacity wrapper 사용 (Step 2.5 노트 참조).
- **Task 1 verification model export**: `models/index.ts`가 VerificationCode 도 export 하는지 확인. 없으면 추가.
