# 회원가입 이메일 인증 설계

**작성일**: 2026-05-08
**기능**: 이메일 가입 시 6자리 인증코드를 이메일로 전송 → 사용자 입력 → 검증 → 통과 후 나머지 정보 입력 + 가입.
**대상**: 작은 모임 (PocketPay) 모바일 + 백엔드
**전제**: 백엔드 인프라(send-code/verify-code) 이미 구축됨. 모바일 가입 화면 확장 + 백엔드 가입 시 검증 추가만 필요.

---

## 1. 배경 및 목표

### 1.1 사용자 요청

> "가입할때, 이메일 인증 기능 넣자 ... 인증번호 받게 하고 싶어. 실제 존재하는 이메일인지 확인하는거"

### 1.2 디자인 결정 (브레인스토밍 결과)

| 항목 | 결정 |
|---|---|
| UX 패턴 | 인라인 (한 화면), 한국 앱 표준 |
| 인증 전 다른 필드 | 비활성화 — 인증 단계 명확하게 노출 |
| 이메일 수정 시 | 인증 상태 자동 초기화 |
| 백엔드 | 기존 send-code / verify-code 재사용. purpose="회원가입" |
| OAuth | 인증 불필요 (provider가 이미 검증함) |

---

## 2. 현황 분석

### 2.1 백엔드 인프라

이미 존재:
- `POST /auth/send-code` — `emailLimiter` (1분 3회) 적용
- `POST /auth/verify-code` — `verifyLimiter` (1분 10회) 적용
- `services/auth/verification.service.ts`:
  - `sendCode(email, purpose)` — 6자리 코드 생성, 10분 유효, 1분 내 재요청 차단
  - `verifyCode(email, code, purpose)` — 5회 시도 제한, 검증 통과 시 코드 삭제 (단 "비밀번호 재설정"은 예외)
- `models/VerificationCode.model.ts` — 코드 저장 모델

### 2.2 기존 동작

`verifyCode` 함수는 검증 통과 시 코드를 즉시 삭제. 단 "비밀번호 재설정" purpose는 예외 — `reset-password` 엔드포인트에서 직접 삭제하기 때문.

이 패턴을 "회원가입" purpose에도 적용 → 인증 통과 후 코드를 유지하다가 signup 시 다시 검증 + 삭제.

---

## 3. 백엔드 변경

### 3.1 verification.service.ts

```ts
// 변경 전:
if (purpose !== "비밀번호 재설정") {
  await VerificationCode.deleteOne({ email, purpose });
}

// 변경 후:
if (purpose !== "비밀번호 재설정" && purpose !== "회원가입") {
  await VerificationCode.deleteOne({ email, purpose });
}
```

### 3.2 auth.local.service.ts

`signupLocal` 시작 부분에 검증 추가:

```ts
const signupLocal = async ({ email, password, name, nickname, handle }) => {
  // 이메일 인증 확인 (회원가입 purpose의 verifyCode가 통과되었는지)
  const verified = await VerificationCode.findOne({
    email,
    purpose: "회원가입",
    expiresAt: { $gt: new Date() },
  });
  if (!verified) {
    throw AppError.badRequest("이메일 인증을 먼저 완료해주세요.");
  }

  // ... 기존 가입 로직 ...

  // 가입 성공 후 인증 코드 삭제
  await VerificationCode.deleteOne({ email, purpose: "회원가입" });
  return user;
};
```

### 3.3 검증 로직

`signupLocal` 의 검증 순서:
1. **이메일 인증 코드 존재 + 미만료 체크** (신규)
2. 이메일 중복 체크 (기존)
3. handle 형식 + 중복 체크 (기존)
4. 비밀번호 해싱 + User 생성 (기존)
5. 인증 코드 삭제 (신규)

검증 코드 미존재 시 명확한 에러: "이메일 인증을 먼저 완료해주세요."

---

## 4. 모바일 변경

### 4.1 signup.tsx 신규 상태

```ts
const [verificationCode, setVerificationCode] = useState("");
const [codeSent, setCodeSent] = useState(false);
const [emailVerified, setEmailVerified] = useState(false);
const [sendingCode, setSendingCode] = useState(false);
const [verifyingCode, setVerifyingCode] = useState(false);
const [resendCountdown, setResendCountdown] = useState(0);
```

### 4.2 UI 구조

```
┌──────────────────────────────────────────┐
│ 회원가입                                   │
├──────────────────────────────────────────┤
│ 이메일                                    │
│ [example@email.com________]              │
│                          [인증코드 받기]  │
│                                          │
│ ─────── 인증 코드 받은 후 ───────         │
│ 인증 코드                                 │
│ [______]            [확인]               │
│ (60초 후 재발송 가능)                      │
│                                          │
│ ─────── 인증 통과 후 ───────              │
│ ✓ 이메일 인증 완료                        │
│                                          │
│ 실명     [_____________]                 │
│ 닉네임    [_____________]                 │
│ ID       [_____________]                 │
│ 비밀번호  [_____________]                 │
│ 비밀번호 확인 [__________]                │
│                                          │
│         [가입하기]                        │
└──────────────────────────────────────────┘
```

### 4.3 인터랙션 흐름

**Step 1 — 이메일 입력**:
- "인증코드 받기" 버튼: 이메일 형식 valid 시 활성화
- 누르면 → `authApi.sendCode({ email, purpose: "회원가입" })` 호출
- 성공 시: 토스트 "인증코드 발송 완료" + `codeSent=true` + 60초 재발송 카운트다운 시작
- 인증 코드 입력 필드 표시

**Step 2 — 코드 입력 + 확인**:
- 6자리 입력 → "확인" 버튼 활성화
- 누르면 → `authApi.verifyCode({ email, code, purpose: "회원가입" })`
- 성공 시: `emailVerified=true` + 토스트 "인증 완료" + ✓ 표시
- 실패 시: 에러 메시지 표시 (백엔드가 시도 횟수 안내)

**Step 3 — 나머지 필드 활성화**:
- `emailVerified=true`인 경우에만 실명/닉네임/ID/비밀번호 입력 가능
- (`disabled` 상태 prop을 Input에 전달, 또는 `editable={emailVerified}`)

**Step 4 — 가입**:
- "가입하기" 버튼: `emailVerified=true` + 모든 필드 valid 시 활성화
- 누르면 → 기존 `signup()` 호출 (백엔드가 인증 재검증)

### 4.4 이메일 수정 감지

```ts
const onEmailChange = (v: string) => {
  setEmail(v);
  if (emailVerified || codeSent) {
    setEmailVerified(false);
    setCodeSent(false);
    setVerificationCode("");
    setResendCountdown(0);
  }
  clearError("email");
};
```

### 4.5 60초 재발송 카운트다운

`useEffect` + `setInterval`로 1초마다 감소. 0이 되면 "인증코드 받기" 버튼 다시 활성화.

```ts
useEffect(() => {
  if (resendCountdown <= 0) return;
  const t = setInterval(() => {
    setResendCountdown((s) => Math.max(0, s - 1));
  }, 1000);
  return () => clearInterval(t);
}, [resendCountdown]);
```

`sendCode` 성공 시 `setResendCountdown(60)`.

---

## 5. 엣지 케이스

| 케이스 | 처리 |
|---|---|
| 인증 후 이메일 수정 | 자동으로 인증 상태 초기화 (re-verify 필요) |
| 인증 코드 만료 (10분) | verify-code 호출 시 백엔드가 만료 메시지 반환 → 토스트 → 재발송 안내 |
| 5회 오류 | 백엔드가 코드 삭제 + "재요청해주세요" 메시지 |
| 1분 내 재발송 시도 | 카운트다운 UI로 사전 차단 + 백엔드도 거절 |
| 가입 완료 전 10분 이상 지남 | 백엔드 signup이 "인증 만료" 거절 → 토스트 → 재인증 흐름 |
| 이미 가입된 이메일로 인증 시도 | 인증은 통과 가능 (이메일은 실재). signup 시 "이미 가입된 이메일" 에러 |
| 네트워크 에러 | 토스트 + 버튼 다시 활성화 |
| OAuth 사용자 | 이 화면 안 거침 (별도 setup-profile 흐름). 인증 불필요 |

---

## 6. 보안 / 프라이버시

- 이메일 존재 노출 회피: 인증 자체는 누구에게든 발송 가능. "이미 가입된 이메일" 정보는 가입 시점에만 노출 (스팸 정찰 방지 효과 일부)
- Rate limiting: 기존 `emailLimiter` (분당 3회) + `verifyLimiter` (분당 10회) 그대로 적용
- 코드 노출 방지: 이메일 본문에만 코드, 백엔드 로그에는 발송 사실만
- 인증 통과 후에도 10분 후 자동 만료 → 가입 화면 오래 켜놓고 떠나도 무한정 인증 상태 유지 X

---

## 7. 테스트 계획

### 7.1 백엔드

- [ ] `signupLocal`이 verified code 없이 가입 시도 → 400 "이메일 인증을 먼저 완료해주세요"
- [ ] verifyCode("회원가입") 통과 후 코드 유지 (조회 시 존재)
- [ ] verifyCode("비밀번호 재설정") 통과 후 코드 유지 (기존 동작 보존)
- [ ] verifyCode("이메일 인증") 통과 후 코드 삭제 (기존 동작 보존)
- [ ] signup 성공 시 회원가입 코드 삭제됨
- [ ] 인증 후 10분 이상 지나서 signup → 거절

### 7.2 모바일 (시뮬레이터)

- [ ] 가입 화면 진입 → 다른 필드 비활성화 상태
- [ ] 이메일 입력 → "인증코드 받기" 버튼 활성화
- [ ] 받기 누름 → 토스트 + 코드 입력 필드 표시 + 60초 카운트다운
- [ ] 카운트다운 중 받기 버튼 비활성
- [ ] 잘못된 코드 입력 → 에러 메시지 + 재시도 가능
- [ ] 정확한 코드 → ✓ + 다른 필드 활성화
- [ ] 인증 후 이메일 수정 → ✓ 사라짐 + 코드 입력 초기화 + 다른 필드 비활성화
- [ ] 5회 오류 → 코드 삭제 안내 + 재발송
- [ ] 가입 완료 후 토스트 + 로그인 화면

---

## 8. 파일 변경 범위

### 백엔드

| 경로 | 변경 |
|---|---|
| `backend/services/auth/verification.service.ts` | "회원가입" purpose 코드 유지 |
| `backend/services/auth/auth.local.service.ts` | signupLocal에 verified 코드 검증 + 통과 시 삭제 |

### 모바일

| 경로 | 변경 |
|---|---|
| `mobile/app/(auth)/signup.tsx` | 인증 UI + 상태 + 비활성화/활성화 로직 + 60초 카운트다운 |

---

## 9. 비범위

- OAuth 사용자 이메일 인증 (provider가 검증)
- 비밀번호 재설정 흐름 (이미 동작)
- SMS/카톡 인증 (v1.1+)
- captcha (v1.1+, 출시 후 모니터링 후 결정)

---

## 10. 위험 요소

| 위험 | 대응 |
|---|---|
| Gmail SMTP 일시 장애 | 토스트로 사용자에게 안내 + 재시도 가능 |
| 사용자가 이메일 받지 못함 (스팸함) | "스팸함도 확인해주세요" 안내 메시지 |
| 인증 통과 후 가입까지 너무 오래 걸리면 만료 | 백엔드가 명확한 에러 → 재인증 흐름 |
| Rate limit 걸려서 진짜 사용자가 못 받음 | 1분 3회는 충분. 부족하면 출시 후 모니터링 후 조정 |

---

## 11. 성공 기준

1. 가입 화면에서 이메일 인증 통과 전엔 다른 필드 비활성화
2. 인증 코드 60초 안에 1회만 발송 가능 (재발송 카운트다운 표시)
3. 잘못된 코드 5회 입력 시 코드 삭제 + 재발송 필요
4. 인증 통과 후 ✓ 표시 + 나머지 필드 활성화
5. 인증 후 이메일 수정 시 자동 재인증 필요
6. 가입 완료 후 코드 삭제됨 (재사용 차단)
7. 백엔드가 verified 코드 없이 가입 시 거절
