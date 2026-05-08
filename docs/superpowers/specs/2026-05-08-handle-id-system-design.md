# Handle ID 시스템 + 프로필 통합 설계

**작성일**: 2026-05-08
**기능**: 사용자에게 고유 handle (ID) 부여, 가입 시 실명 + 닉네임 + handle 모두 받음. 모임 초대를 이메일 → handle로 전환. 프로필 화면 신규 + 비밀번호 변경/로그아웃/회원 탈퇴 통합.
**대상**: 작은 모임 (PocketPay) 모바일 + 백엔드
**전제**: 이번 작업 + 잔여 기능 완료 후 DB 초기화 예정 → 마이그레이션 부담 없음

---

## 1. 배경 및 목표

### 1.1 사용자 요청

> "각 계정별로 아이디? 같은걸 부여해서 그걸로 (초대) 하는건 어떻게 생각해? ... 가입할때 조차도 실명과 닉네임 전부 받고, id를 정해서 초대를 이메일로 하는 것이 아닌, 그 id로 하는거"

→ 이메일 노출 회피 + 한국 소모임 문화에 친숙한 ID 기반 인터랙션.

### 1.2 디자인 결정 (브레인스토밍 결과)

| 항목 | 결정 |
|---|---|
| Handle 형식 | 영문 소문자 + 숫자 + 언더스코어, 3~20자, unique |
| Handle 정하는 방식 | 사용자 직접 입력 + 실시간 사용 가능 체크 (디바운스 500ms) |
| Handle 변경 | 30일에 1회 가능 |
| 초대 방식 | handle로만 (이메일 입력란 제거). QR/코드 초대는 유지 |
| 가입 시 받는 정보 | 실명 + 닉네임 + handle (모두 필수) |
| OAuth 처리 | provider 실명 있으면 닉네임/핸들만, 없으면 3개 모두 입력 |
| 프로필 화면 | 신규. 편집 + 비밀번호 변경 + 로그아웃 + 회원 탈퇴 통합 |
| 비밀번호 변경 | 프로필 화면 안에. local provider 가입자만 노출 |
| 더보기 탭 | 비밀번호 변경 / 로그아웃 / 회원 탈퇴 모두 제거 |
| Step B 비범위 | 모임별 표시 정책 (displayMode), 멤버 표시 분기 |

### 1.3 마이그레이션 정책

**없음**. 사용자가 모든 기능 완료 후 DB 초기화 + 새 시작 예정. 기존 사용자 보호 고려 X.

---

## 2. 현황 분석

### 2.1 백엔드

- `backend/models/User.model.ts` — User 스키마 (현재 `email`, `name`, `password?`, `provider` 등)
- `backend/services/auth.service.ts` 또는 유사 — 가입/로그인 로직
- `backend/services/team/team.service.ts:107-...` — `inviteMember(teamId, ownerId, email)` 현재 이메일 기반
- `backend/services/account/...` — 계정 관리 (비밀번호 변경 등)

### 2.2 모바일

- 가입 화면: `app/(auth)/signup.tsx`
- OAuth 처리: 각 provider 콜백 + `mobile/src/api/auth.ts`
- 비밀번호 변경: `app/change-password.tsx` (별도 화면)
- 더보기: `app/(tabs)/more.tsx` (비밀번호 변경 / 로그아웃 / 회원 탈퇴 메뉴 항목 포함)
- 팀 초대: `app/team/invite.tsx` (이메일 입력)
- 사용자 타입: `mobile/src/types/user.ts`
- 인증 스토어: `mobile/src/store/authStore.ts`

---

## 3. 데이터 모델

### 3.1 User 모델 변경

```ts
interface IUser {
  email: string;           // 기존
  password?: string;       // 기존 (provider==="local"일 때만)
  provider: "local" | "google" | "naver" | "kakao" | "apple";  // 기존
  name: string;            // 기존, 의미 명확화: 실명 (1~30자)

  nickname: string;        // 신규, 1~20자, 한글/영문/숫자, 중복 허용
  handle: string;          // 신규, 3~20자, [a-z0-9_], lowercase, UNIQUE
  handleChangedAt?: Date;  // 신규, 30일 제한 추적

  createdAt: Date;         // 기존
  updatedAt: Date;         // 기존
}
```

**Mongoose 스키마**:
```ts
nickname: { type: String, required: true, trim: true, minLength: 1, maxLength: 20 },
handle: {
  type: String,
  required: true,
  unique: true,
  lowercase: true,
  trim: true,
  match: /^[a-z0-9_]{3,20}$/
},
handleChangedAt: { type: Date },
```

### 3.2 Team 모델

**변경 없음**. `pendingInvites.user`는 ObjectId 그대로 (handle은 User 조회 시점에 활용).

---

## 4. 가입 흐름

### 4.1 이메일 가입

```
[이메일] → [비밀번호] → [실명 + 닉네임 + handle] → 가입 완료
```

기존 `signup.tsx` 흐름에서 마지막 단계를 확장: 실명 + 닉네임 + handle 입력 + 사용 가능 체크.

### 4.2 OAuth 가입

```
[OAuth 로그인 버튼]
  ↓
[provider 콜백] (백엔드)
  ↓
신규 가입자인가?
  ├─ NO  → 기존 사용자, 토큰 발급 + 홈
  └─ YES → 추가 정보 필요 응답 (provider 이름 정보 포함)
              ↓
              [추가 정보 입력 화면 (신규)]
              실명: provider 줬으면 자동 채움 (수정 가능), 못 받았으면 빈칸 + 필수 입력
              닉네임: 빈칸 + 필수 입력
              핸들: 빈칸 + 필수 입력 + 사용 가능 체크
              ↓
              [완료] → 가입 완료 + 토큰 발급 + 홈
```

**OAuth 콜백 흐름의 변화**:
- 기존: 콜백 시 자동으로 User 생성 + 토큰 발급
- 신규: 콜백 시 임시 토큰 발급 (handle 없이) + 신규 가입 플래그
  - 클라이언트가 임시 토큰으로 `/auth/oauth/complete-profile` 호출 (실명/닉네임/handle 포함)
  - 백엔드가 User 완성 + 정식 토큰 발급
- **OR 더 단순한 방식**: User를 생성하되 `handle: null` 허용 → AuthGuard가 handle 없는 user면 setup-profile 화면으로 강제 이동
  - 이 방식이 더 단순. handle은 임시로 null 허용 → setup 완료 시 update.

→ **임시 null 허용 + AuthGuard 강제 이동 방식 채택** (구현 단순)

### 4.3 Handle 사용 가능 체크

가입/변경 화면에서:
- 사용자가 입력 → 500ms 디바운스 → `GET /account/check-handle?handle=xxx` 호출
- 응답: `{ available: boolean, reason?: "format" | "taken" }`
- UI 피드백:
  - 형식 오류: ✗ "영문 소문자, 숫자, 언더스코어만 가능 (3-20자)"
  - 이미 사용 중: ✗ "이미 사용 중이에요"
  - 사용 가능: ✓ "사용 가능해요"
- 가입/저장 버튼은 ✓ 일 때만 활성화

---

## 5. 초대 흐름 변경

### 5.1 기존

`POST /teams/:teamId/members` body: `{ email: string }`

### 5.2 신규

`POST /teams/:teamId/members` body: `{ handle: string }`

backend `inviteMember(teamId, ownerId, handle)`:
1. handle 형식 검증
2. `User.findOne({ handle })` 으로 사용자 검색
3. 못 찾으면 404 "사용자를 찾을 수 없습니다."
4. 이미 멤버/이미 초대 검증 (기존 로직 그대로)
5. `pendingInvites.push({ user, invitedBy, invitedAt })`

### 5.3 초대 UI 변경

`app/team/invite.tsx`:
- 입력 필드 1개: "ID" (placeholder: `@example`)
- 입력 시 자동 lowercase 변환
- "초대" 버튼 → handle로 invite API 호출
- 사용자 못 찾으면 토스트 "ID를 다시 확인해주세요"

---

## 6. 프로필 화면 (신규)

### 6.1 라우트

`app/profile.tsx` — 루트 Stack 등록

### 6.2 구조

```
┌──────────────────────────┐
│ ← 프로필                  │
├──────────────────────────┤
│      [큰 아바타]          │
│       닉네임             │
│       @handle           │
├──────────────────────────┤
│ 실명         김지훈    ✎  │ ← 인라인 편집
│ 닉네임        아엔      ✎  │ ← 인라인 편집
│ ID          @aen      ✎  │ ← 30일 제한
│ 이메일      a@b.com   🔒  │ ← 수정 불가
├──────────────────────────┤
│ 비밀번호 변경         →   │ ← provider==="local"만
├──────────────────────────┤
│ 로그아웃             →   │
│ 회원 탈퇴 (빨강)      →   │
└──────────────────────────┘
```

### 6.3 인라인 편집 UX

탭하면 해당 행이 입력 필드로 전환 + 저장/취소 버튼 (PUT 호출 후 즉시 갱신).

또는 모달/시트로 통일 — UX 결정:

→ **인라인 편집 채택** (단순함, 화면 전환 없음).

### 6.4 ID 변경 30일 제한 처리

`User.handleChangedAt` 기준:
- 미변경 (null) 또는 30일 경과: ✎ 활성, 탭하면 편집 모드
- 30일 미만:
  - ✎ 흐림 (opacity 0.4) 또는 자물쇠 표시
  - 탭하면 토스트 "○○월 ○○일 이후 변경 가능"
- 변경 시 백엔드 검증도 추가 (UI만 의존 X)

---

## 7. API 엔드포인트

### 7.1 인증/가입

| 엔드포인트 | 변경 |
|---|---|
| `POST /auth/signup` | body: `{ email, password, name, nickname, handle }` (3개 추가) |
| `POST /auth/oauth/{provider}/callback` | 신규 가입자면 User 생성하되 handle null로 → setup 필요 응답 |
| `POST /auth/oauth/complete-profile` | 신규 — body: `{ name?, nickname, handle }`. handle 없는 User에 채워줌 |
| `GET /auth/me` (또는 `/account/me`) | 응답에 `nickname, handle, handleChangedAt, provider` 포함 |

### 7.2 핸들 / 프로필

| 엔드포인트 | 신규/변경 |
|---|---|
| `GET /account/check-handle?handle=xxx` | 신규 — `{ available, reason? }` |
| `PATCH /account/profile` | 신규 — `{ name?, nickname? }` 수정 |
| `PATCH /account/handle` | 신규 — `{ handle }` 수정. 30일 제한 + 형식 + 중복 검증 |

### 7.3 팀 초대

| 엔드포인트 | 변경 |
|---|---|
| `POST /teams/:teamId/members` | body: `{ email }` → `{ handle }` |

기타 endpoint (비밀번호 변경, 회원 탈퇴, 로그아웃)는 기존 유지.

---

## 8. 모바일 변경 사항

### 8.1 신규/변경 화면

| 경로 | 종류 | 책임 |
|---|---|---|
| `app/(auth)/signup.tsx` | 수정 | 마지막 단계에 실명/닉네임/handle 추가 |
| `app/setup-profile.tsx` | **신규** | OAuth 후 추가 정보 입력 (provider 실명 유무 따라 가변) |
| `app/profile.tsx` | **신규** | 내 프로필 보기/편집 + 비밀번호 변경 진입 + 로그아웃/회원 탈퇴 |
| `app/team/invite.tsx` | 수정 | 이메일 → handle 입력 |
| `app/(tabs)/more.tsx` | 수정 | 비밀번호 변경/로그아웃/회원 탈퇴 항목 제거. 프로필 카드 탭 시 `/profile` |

### 8.2 AuthGuard 보강

`app/_layout.tsx`의 AuthGuard:
- 기존: 로그인 안 된 상태면 `(auth)/login`
- 신규 추가: 로그인은 됐지만 `user.handle` 없으면 `setup-profile`로 강제 이동
- 이게 OAuth 후 setup 흐름의 핵심

### 8.3 신규 컴포넌트

| 경로 | 책임 |
|---|---|
| `src/components/profile/HandleInput.tsx` | handle 입력 + 실시간 사용 가능 체크 (디바운스 + 아이콘 표시). 가입/setup-profile/handle 변경 모두에서 재사용 |

### 8.4 API 클라이언트

| 경로 | 변경 |
|---|---|
| `src/api/auth.ts` | signup body 확장, oauth complete-profile 신규 |
| `src/api/account.ts` | check-handle, updateProfile, updateHandle 신규 |
| `src/api/team.ts` | inviteMember 시그니처 `email` → `handle` |

### 8.5 스토어

| 경로 | 변경 |
|---|---|
| `src/store/authStore.ts` | user 객체에 nickname, handle, handleChangedAt 포함 |

### 8.6 타입

| 경로 | 변경 |
|---|---|
| `src/types/user.ts` | User 타입에 nickname, handle, handleChangedAt 추가 |

---

## 9. 표시 규칙 (Step A 한정)

Step B의 displayMode 도입 전이라, 모든 표시는 다음 규칙을 따름:

- **멤버 목록 (팀 관리, 멤버 카드)**: 닉네임 표시 (실명 X)
- **알림 카드 (NotificationCard)**: "{초대자 닉네임}님이 초대했어요"
- **거래 작성자 표시 (있다면)**: 닉네임
- **프로필 헤더**: 닉네임 + @handle

→ 일관되게 닉네임 사용. 실명은 프로필에서만.

Step B에서 모임별 displayMode 도입 시 이 규칙이 모임 단위로 분기됨.

---

## 10. 엣지 케이스

| 케이스 | 처리 |
|---|---|
| OAuth 콜백 후 handle 없는 상태로 앱 종료/재시작 | AuthGuard가 handle 체크 → setup-profile 강제 이동 |
| Handle 형식 오류 | 클라이언트 정규식 + 서버 검증 (이중) |
| Handle 동시 등록 (두 사용자가 동시에 같은 handle) | MongoDB unique index 원자성으로 한 쪽만 성공 |
| 30일 미만 handle 변경 시도 | 백엔드 거절 ("○월 ○일 이후 변경 가능") |
| 이메일/OAuth 가입 도중 화면 종료 | 가입 미완료 상태 (handle 없음) → 다시 들어오면 AuthGuard가 setup-profile로 |
| 친구가 ID 모를 때 | "QR 초대" 또는 "초대 코드" 사용 (이미 있음) |
| 회원 탈퇴 후 같은 handle 재사용 가능? | 일반적으로 X (악용 방지). 단, MVP에선 단순화 → 탈퇴 시 user 삭제 + handle 즉시 해제 (다른 사람이 재사용 가능). 추후 정책 강화 시 검토 |
| 비밀번호 변경 — OAuth 사용자 시도 | UI에서 항목 자체 안 보임. 직접 라우트 이동 시도 시 백엔드 거절 |

---

## 11. 보안 / 검증

- 모든 PATCH/POST 인증 미들웨어 통과
- handle 형식: 클라이언트 + 서버 정규식 일치 (`^[a-z0-9_]{3,20}$`)
- handle 변경: 백엔드에서 `handleChangedAt + 30일 < now` 검증 (UI 의존 X)
- Profile 수정: 본인 user만 수정 가능 (`req.userId === user._id`)
- Handle 검색 (사용 가능 체크): rate limit 권장 (스팸 방지). MVP는 미적용, 출시 후 모니터링.

---

## 12. 테스트 계획

### 12.1 백엔드 (수동 / curl)

- [ ] handle 검증 통과/실패 케이스
- [ ] 이메일 가입 → User에 nickname/handle 저장됨
- [ ] OAuth 가입 → User 생성, handle null. complete-profile 호출 시 채움
- [ ] check-handle: 형식 오류 / 사용 중 / 사용 가능
- [ ] PATCH /account/handle 30일 미만 시도 → 거절
- [ ] PATCH /account/handle 30일 경과 시도 → 성공, handleChangedAt 갱신
- [ ] PATCH /account/profile 실명/닉네임 수정
- [ ] POST /teams/:teamId/members 새 시그니처 (handle) 동작

### 12.2 프론트엔드 (시뮬레이터)

- [ ] 이메일 가입 마지막 단계 → 실명/닉네임/handle 입력 후 가입
- [ ] handle 입력 시 실시간 ✓/✗ 표시
- [ ] OAuth 가입 → setup-profile 자동 이동 → 입력 후 홈
- [ ] AuthGuard: handle 없는 user 앱 진입 시 setup-profile 강제
- [ ] 더보기 → 프로필 카드 탭 → /profile 이동
- [ ] 프로필 화면: 실명/닉네임 인라인 편집 동작
- [ ] handle 30일 미만 → ✎ 흐림 + 토스트
- [ ] handle 30일 경과 → 변경 가능
- [ ] 비밀번호 변경 항목: provider==="local"만 표시
- [ ] 로그아웃 / 회원 탈퇴 동작 (이전과 동일)
- [ ] 더보기 탭에서 비밀번호 변경/로그아웃/회원 탈퇴 항목 사라짐
- [ ] 모임 초대 UI: handle 입력 + 잘못된 handle 시 에러
- [ ] 멤버 목록/알림에서 닉네임 표시

---

## 13. 파일 변경 범위

### 백엔드

| 경로 | 변경 |
|---|---|
| `backend/models/User.model.ts` | nickname/handle/handleChangedAt 필드 추가 + unique index |
| `backend/services/auth/auth.service.ts` (위치 확인 필요) | signup body 확장, oauth complete-profile 신규 |
| `backend/services/account/account.service.ts` | check-handle, updateProfile, updateHandle 신규 |
| `backend/services/team/team.service.ts` | inviteMember email → handle |
| `backend/controllers/auth.controller.ts` | 위 변경 반영 |
| `backend/controllers/account.controller.ts` | 위 변경 반영 |
| `backend/controllers/team.controller.ts` | inviteMember 변경 |
| `backend/routes/account.route.ts` | check-handle, profile, handle 라우트 추가 |
| `backend/validators/auth.validator.ts` | signup 스키마에 nickname/handle |
| `backend/validators/account.validator.ts` | handle/profile 검증 추가 |
| `backend/validators/team.validator.ts` | inviteMember 스키마 email → handle |

### 모바일

| 경로 | 변경 |
|---|---|
| `mobile/app/(auth)/signup.tsx` | 마지막 단계 확장 |
| `mobile/app/setup-profile.tsx` | 신규 |
| `mobile/app/profile.tsx` | 신규 |
| `mobile/app/_layout.tsx` | Stack.Screen "profile", "setup-profile" + AuthGuard 보강 |
| `mobile/app/(tabs)/more.tsx` | 비번/로그아웃/탈퇴 항목 제거. 프로필 카드 탭 핸들러 |
| `mobile/app/team/invite.tsx` | email → handle |
| `mobile/src/components/profile/HandleInput.tsx` | 신규 (재사용) |
| `mobile/src/api/auth.ts` | signup, oauth-complete-profile 시그니처 |
| `mobile/src/api/account.ts` | check-handle, updateProfile, updateHandle |
| `mobile/src/api/team.ts` | inviteMember |
| `mobile/src/types/user.ts` | User 타입 확장 |
| `mobile/src/store/authStore.ts` | user 객체 변경 반영 |

---

## 14. 비범위 (Step B로 미룸)

- Team 모델 `displayMode: "realName" | "nickname"`
- 모임 생성 시 displayMode 선택 UI
- 멤버 목록/거래/알림 표시에서 displayMode에 따른 분기
- Provider별 rate limiting (출시 후 모니터링 후 결정)
- 회원 탈퇴 시 handle 영구 잠금 (악용 방지)
- 미가입자에게 "{handle}님께서 가입하면 자동 초대" 같은 보류형 초대 (Step B의 일부 또는 별 작업)

---

## 15. 위험 요소 및 대응

| 위험 | 대응 |
|---|---|
| OAuth provider가 이메일 미반환 | 일단 발생 시 에러 (현재 거의 없음). 발생 시 setup-profile에 이메일 입력 추가 |
| AuthGuard 무한 루프 (handle 없음 → setup → handle 채움 → AuthGuard 재실행) | useEffect 의존성 정확히 관리 + setup-profile 자체는 AuthGuard 분기에서 제외 |
| Inline 편집 중 다른 화면 진입 | 편집 미저장 상태 경고 또는 자동 폐기 (선택 — 일단 자동 폐기 + 토스트) |
| handle 사용 가능 체크 부담 (모든 키스트로크 호출) | 500ms 디바운스 + 마지막 입력만 체크 |
| 동시성: handle 사용 가능 체크와 가입 사이에 다른 사용자가 같은 handle 등록 | 가입 시 unique index가 잡아냄 → 에러 토스트 후 다시 입력 유도 |
| 베타 테스터 중 옛 앱 사용자가 새 백엔드 호출 | 옛 앱이 보내는 inviteMember body는 `{ email }` → 새 백엔드는 거부 → 옛 앱 invite 실패 (사용자가 새 앱 받기 전까진 invite 무용. DB 초기화 전제이므로 수용) |

---

## 16. 성공 기준

1. 이메일 가입 시 실명 + 닉네임 + handle 모두 입력 후 완료 가능
2. OAuth 가입 시 setup-profile 자동 이동 + 필요 정보 입력 후 완료 가능
3. handle 입력 화면에서 실시간 사용 가능 ✓/✗ 표시
4. 더보기 → 프로필 카드 탭 시 /profile 이동
5. 프로필에서 실명/닉네임 인라인 편집 가능
6. handle 30일 제한 동작 (UI + 백엔드 양쪽)
7. 비밀번호 변경 항목 provider==="local"만 노출
8. 로그아웃/회원 탈퇴 모두 프로필 안에서 가능
9. 모임 초대 UI에서 handle 입력으로 변경 + 잘못된 handle 에러 표시
10. 멤버 목록/알림 카드에서 닉네임 표시 (실명 X)
