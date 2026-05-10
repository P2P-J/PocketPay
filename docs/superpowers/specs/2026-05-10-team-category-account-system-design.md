# 모임 카테고리 + 계좌 시스템 (Phase 1) 설계

**작성일**: 2026-05-10
**기능**: 모임 생성 시 카테고리(친구/동호회) + 표시 정책(닉네임/실명) + 계좌 모드(개인/모임) + 회비 사용 4가지를 사용자가 선택. User에 개인 계좌, Team에 모임 통장 등록 시스템.
**대상**: 작은 모임 (PocketPay) 모바일 + 백엔드
**Phase**: 1 / 2 (Phase 2 = 더치페이 알림 + 공유 시트, Phase 1 위에서 동작)

---

## 1. 배경 및 목표

### 1.1 사용자 요청

> "모임을 만들때, 그러면 어떤 모임인지 중요한 것 같애. 어떤 모임인지 그냥 친구들끼리의 모임인지, 동아리인지 동호회 같은 모임인지. ... 실명제인지, 비 실명제인지도 물어봐야하고, 개인 통장인지, 모임 통장인지도 중요하고, 모임을 만들때 카테고리를 만들어야 할 것 같애"

> "친구 모임이든 동호회 동아리 모임이든 닉네임으로 할 것인지, 실명으로 할 것 인지는 사용자들이 선택하게 해줘"

> "동호회 동아리 같은 모임도 교회 모임 같은 것이 있을 수 있는데, 같은 교회 사람들끼리는 회비 같은것이 없으니까 회비도 설정안해놔도 괜찮게 해줘"

### 1.2 디자인 결정 (브레인스토밍 결과)

| 항목 | 결정 |
|---|---|
| 카테고리 종류 | 친구 모임 / 동호회·동아리 (2종) |
| 카테고리 역할 | 모임 성격 라벨만, 정책 자동 결정 X |
| 표시 정책 | 닉네임 / 실명 (사용자 선택) |
| 계좌 모드 | 개인 통장 / 모임 통장 (사용자 선택) |
| 회비 사용 | on/off (사용자 선택) |
| 디폴트 조합 | 친구 모임 + 닉네임 + 개인 통장 + 회비 X (가장 가벼운 케이스) |
| 모임 카테고리 등 변경 가능 | 모임장이 모임 정보 수정에서 변경 가능 |
| 개인 계좌 | User에 1개 등록 (모든 모임에서 자동 사용) |
| 모임 통장 | Team에 1개 등록 (해당 모임 내에서 사용) |

---

## 2. 현황 분석

### 2.1 기존 Team 모델

`backend/models/Team.model.ts`:
- `name`, `description`, `owner`, `members`, `pendingInvites`
- `inviteToken`, `inviteTokenExpiry` (QR 초대용)
- `feeAmount`, `feeDueDay` (회비 시스템 — 현재 모든 모임에 자동 활성화)

### 2.2 기존 User 모델

`backend/models/User.model.ts`:
- `email`, `password`, `name` (실명), `nickname`, `handle`
- `provider`, `providerId`, `oauthTokens`

### 2.3 기존 모임 생성 화면

`mobile/app/team/create.tsx`: 이름 + 설명 (선택) 2개 입력.

### 2.4 기존 멤버 표시

대부분의 화면에서 `nickname || name` 우선 사용 (handle 시스템 도입 시점에 변경됨). 모임별 분기 없음.

---

## 3. 데이터 모델

### 3.1 Team 모델 확장

```ts
interface ITeamAccount {
  bank: string;
  number: string;
  holder: string;
}

interface ITeam extends Document {
  // 기존
  name: string;
  description: string;
  owner: Types.ObjectId;
  members: ITeamMember[];
  pendingInvites: ITeamPendingInvite[];
  inviteToken?: string;
  inviteTokenExpiry?: Date;

  // 신규 — 모임 정책
  category: "friend" | "club";
  displayMode: "nickname" | "realName";
  accountMode: "personal" | "team";
  feeEnabled: boolean;
  account?: ITeamAccount;

  // 기존 (회비 — feeEnabled=true일 때만 의미 있음)
  feeAmount: number;
  feeDueDay: number;

  createdAt: Date;
  updatedAt: Date;
}
```

**Mongoose 스키마**:
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

`account` 자체는 옵셔널 객체. 등록 안 됐을 때 undefined.

### 3.2 User 모델 확장

```ts
interface IUserAccount {
  bank: string;
  number: string;
  holder: string;
}

interface IUser extends Document {
  // 기존 (email, password, name, nickname, handle, ...)

  // 신규
  account?: IUserAccount;
}
```

스키마:
```ts
account: {
  bank: { type: String, trim: true },
  number: { type: String, trim: true },
  holder: { type: String, trim: true },
},
```

### 3.3 마이그레이션

DB 초기화 예정이라 별도 마이그레이션 X. 신규 필드는 모두 디폴트값 적용.

---

## 4. 모임 생성 화면 (`team/create.tsx`)

### 4.1 UI 확장

기존: 이름 + 설명만.
신규: 다음 4개 토글/선택 추가.

```
┌──────────────────────────────────────┐
│ ← 새 모임 만들기                       │
├──────────────────────────────────────┤
│ 모임 이름                             │
│ [_______________]                    │
│                                      │
│ 설명 (선택)                           │
│ [_______________]                    │
│                                      │
│ ────── 모임 성격 ──────               │
│ 카테고리                              │
│ [● 친구 모임] [○ 동호회·동아리]        │
│                                      │
│ 멤버 표시 방식                        │
│ [● 닉네임] [○ 실명]                   │
│ "모임원 목록과 거래 작성자에 보일 이름" │
│                                      │
│ 더치페이 받을 계좌                    │
│ [● 개인 통장] [○ 모임 통장]            │
│ "송금받을 계좌 (변경 가능)"            │
│                                      │
│ 회비 사용                             │
│ [● 사용 안 함] [○ 사용]                │
│                                      │
│      [모임 만들기]                    │
└──────────────────────────────────────┘
```

### 4.2 디폴트값

가장 일반적 시나리오 (친구 모임):
- 카테고리: `friend`
- 표시: `nickname`
- 계좌: `personal`
- 회비: `false`

→ 사용자가 토글 안 만지고 만들면 위 조합으로 생성.

### 4.3 모임 통장 입력

이 화면에서는 모임 통장 입력란 X. 만든 후 모임 관리 페이지에서 등록.
(이유: 만들 때 너무 많은 정보 요구하면 부담 + 계좌 모드를 모임으로 했어도 통장은 나중에 등록 가능)

---

## 5. 정책별 동작

### 5.1 표시 정책 (`displayMode`)

`"nickname"`: 멤버·작성자 표시에 `user.nickname` 사용
`"realName"`: 동일 위치에 `user.name` (실명) 사용

**적용 위치**:
- 모임 관리 멤버 목록 (`team/[teamId].tsx`)
- 거래 작성자 표시 (현재 미구현 — 추가 시 일관 적용)
- 알림 카드 (초대자 이름 등)

같은 사용자가 모임 A에서는 닉네임, 모임 B에서는 실명으로 보일 수 있음 (모임별 정책).

백엔드는 `members.user`에 `name + nickname + handle` 모두 응답. 클라이언트가 `team.displayMode`에 따라 골라 표시.

### 5.2 계좌 우선순위 (`accountMode`)

| accountMode | 더치페이 시 받을 계좌 | 둘 다 없으면 |
|---|---|---|
| `"personal"` | 1순위: 요청자 `user.account` / 2순위: `team.account` | 토스트 + 프로필로 안내 |
| `"team"` | 1순위: `team.account` / 2순위: 요청자 `user.account` | 토스트 + 모임 관리로 안내 |

(Phase 2의 더치페이 알림 구현 시 활용. Phase 1에서는 모델/UI만 준비.)

### 5.3 회비 시스템 (`feeEnabled`)

- `true`: 회비 페이지 노출 + 회비 설정 가능 (기존 동작)
- `false`:
  - 회비 페이지 진입 시 빈 상태 + "회비를 사용하지 않는 모임이에요" 안내
  - 더보기/모임 관리에서 회비 메뉴 숨김 (선택 사항 — 또는 비활성화)
- 백엔드 회비 엔드포인트 그대로 유지 (그냥 클라이언트가 안 부름)

전환:
- false → true: 즉시 회비 메뉴 노출 + 설정 가능
- true → false: 기존 회비 데이터 유지 (DB), 페이지만 숨김. 다시 true로 켜면 데이터 그대로 다시 보임.

---

## 6. 모임 정보 수정 (`team/[teamId].tsx`)

### 6.1 기존 인라인 편집 폼 확장

기존: 이름 + 설명 2개.
신규: 카테고리/표시/계좌 모드/회비 사용 + 모임 통장 입력 추가.

```
┌──────────────────────────────────┐
│ 모임 정보 수정                    │
├──────────────────────────────────┤
│ 이름      [______________]        │
│ 설명      [______________]        │
│ 카테고리  [친구 모임 ▼]            │
│ 표시      [닉네임 ▼]              │
│ 계좌 모드 [개인 통장 ▼]           │
│ 회비 사용 [○ 사용 안 함]           │
│                                  │
│ ── 모임 통장 (계좌 모드=모임일 때) ──│
│   은행    [______________]        │
│   계좌    [______________]        │
│   예금주  [______________]        │
│                                  │
│  [취소]   [저장]                  │
└──────────────────────────────────┘
```

모임 통장 섹션은 `accountMode === "team"`일 때만 노출 (조건부 렌더).
모임장만 수정 가능 (`isOwner` 체크 그대로).

### 6.2 저장 동작

`PUT /teams/:teamId` 한 번에 모든 변경 전송. 백엔드에서 owner 검증 + 업데이트.

---

## 7. 프로필 화면 (`profile.tsx`)

### 7.1 "내 계좌" 섹션 추가

기존 프로필 화면(실명/닉네임/ID/이메일/비번/로그아웃/탈퇴)에 다음 섹션 추가:

```
┌──────────────────────────────┐
│ ─── 내 계좌 (선택) ─────       │
│ 은행          국민      ✎    │
│ 계좌번호     123-456    ✎    │
│ 예금주        홍길동    ✎    │
│ [계좌 삭제]                  │
└──────────────────────────────┘
```

미등록 시: "계좌가 없습니다. 등록해 더치페이를 받아보세요." + [등록하기] 버튼

### 7.2 계좌 입력 컴포넌트 재사용

`AccountForm.tsx`라는 신규 재사용 컴포넌트:
- props: `initial: { bank, number, holder } | null`, `onSave`, `onCancel`, `onDelete?`
- 모임 통장 (모임 정보 수정)과 개인 계좌 (프로필) 양쪽에서 재사용

---

## 8. API 엔드포인트

### 신규/변경

| 엔드포인트 | 변경 |
|---|---|
| `POST /teams` | body에 category/displayMode/accountMode/feeEnabled 추가 (모임 통장은 X — 만든 후 별도 등록) |
| `PUT /teams/:teamId` | body에 위 필드들 + account 객체 추가 |
| `PATCH /account/account` | 신규 — `{ account: { bank, number, holder } }` 또는 `null`(삭제) |
| `GET /account/me` | 응답에 `account` 추가 |

기타 (회비 등)는 그대로.

---

## 9. 모바일 변경 사항 (요약)

| 경로 | 변경 |
|---|---|
| `mobile/src/types/team.ts` | Team 타입에 새 필드 |
| `mobile/src/types/user.ts` | User 타입에 account |
| `mobile/src/api/team.ts` | create/update 시그니처 |
| `mobile/src/api/account.ts` | `updateMyAccount` 신규 |
| `mobile/src/store/teamStore.ts` | createTeam 시그니처 |
| `mobile/app/team/create.tsx` | 4개 토글 추가 |
| `mobile/app/team/[teamId].tsx` | 모임 정보 수정 폼 확장 + 모임 통장 섹션 + 멤버 표시 displayMode 분기 |
| `mobile/app/profile.tsx` | 내 계좌 섹션 추가 |
| `mobile/src/components/account/AccountForm.tsx` | 신규 — 재사용 |
| `mobile/app/team/fee.tsx` | feeEnabled=false면 빈 상태 + 안내 |
| `mobile/app/(tabs)/index.tsx` | 멤버/거래 표시 displayMode 분기 (필요 시) |

---

## 10. 엣지 케이스

| 케이스 | 처리 |
|---|---|
| 카테고리 친구 + 계좌 모드 모임 통장 | 자유 — 사용자 의도대로 |
| 모임 통장 모드인데 모임 통장 미등록 | 더치페이 시 fallback (요청자 개인 계좌) → 둘 다 없으면 차단 (Phase 2에서 처리) |
| 회비 사용 X로 만든 후 사용으로 전환 | 가능. 변경 즉시 회비 메뉴 노출 |
| 회비 사용 → 사용 안 함 | 기존 회비 데이터 유지, 페이지만 숨김. 다시 켜면 복구 |
| 표시 정책 변경 (실명 ↔ 닉네임) | 즉시 반영 (다음 화면 진입 시 새 표시) |
| 개인 계좌 미등록 사용자가 모임 만들기 | 가입은 됨. 더치페이 시도 시 안내 |
| 모임 통장 미등록 + 모임 통장 모드 | 모임은 생성됨. 나중에 등록 가능 |
| 동일 사용자, 모임별 다른 표시 | 모임 A에서는 닉네임, 모임 B에서는 실명 모두 가능 |
| 계좌 정보에 특수문자/공백 | trim + sanitize. 형식 검증은 비교적 느슨 (사용자가 보기 좋게 입력하도록) |
| 모임 통장 삭제 + 계좌 모드 모임 | 통장만 비고 모드는 그대로. 다음 등록 시 다시 사용 |

---

## 11. 보안 / 검증

- `PUT /teams/:teamId` — owner 검증 (기존)
- `PATCH /account/account` — 본인만 (인증 미들웨어)
- 카테고리/표시/계좌 모드 enum 검증 (zod)
- 계좌 정보 — 형식 검증은 최소화 (은행마다 형식 다름. 사용자 입력 신뢰)
- 계좌번호는 백엔드 로그에 남기지 않음 (현재도 일반 필드는 안 남음)

---

## 12. 테스트 계획

### 12.1 백엔드 (수동 / curl)

- [ ] `POST /teams` 새 필드 모두 받아 저장
- [ ] 디폴트값 검증 (필드 빠뜨려도 디폴트 적용)
- [ ] `PUT /teams/:teamId` 새 필드 변경
- [ ] `PUT /teams/:teamId` owner 아닌 사용자 → 403
- [ ] `PATCH /account/account` 등록/수정/삭제(null)
- [ ] `GET /teams/:teamId` 응답에 새 필드 + members.user에 name/nickname 둘 다 포함
- [ ] `GET /account/me` 응답에 account 포함

### 12.2 모바일 (시뮬레이터)

- [ ] 모임 생성 화면: 4개 토글 노출 + 디폴트 값 정상
- [ ] 토글 후 만들기 → 새 모임이 정확한 정책으로 생성됨
- [ ] 모임 정보 수정: 새 필드 모두 편집 가능
- [ ] 계좌 모드 모임 → 모임 통장 입력 섹션 노출
- [ ] 계좌 모드 개인 → 모임 통장 입력 섹션 숨김
- [ ] 프로필 → 내 계좌 등록/수정/삭제
- [ ] displayMode 닉네임 모임 → 멤버 목록 닉네임 표시
- [ ] displayMode 실명 모임 → 멤버 목록 실명 표시
- [ ] 회비 사용 안 함 → 회비 페이지 진입 시 안내
- [ ] 회비 사용으로 전환 → 회비 페이지 정상 동작

---

## 13. 비범위 (Phase 2)

- 더치페이 인앱 알림 발송
- 더치페이 공유 시트 디자인 개선
- DutchRequest 모델/엔드포인트
- 알림 카드에 더치페이 타입 추가

→ Phase 1 완료 + 검증 후 Phase 2 spec 작성.

---

## 14. 위험 요소

| 위험 | 대응 |
|---|---|
| 모임 생성 화면이 길어져 사용자 부담 | 디폴트값으로 토글 안 만져도 정상 진행. 친절한 설명 텍스트. |
| 표시 정책 변경 시 일부 화면 미반영 | displayMode 일관 적용 위해 모든 표시 위치 점검 (검증 단계에서) |
| 회비 사용 안 함 모임에서 회비 데이터가 남음 | 정상. UI만 숨김. 다시 켜면 복구. 데이터 손실 없음. |
| 계좌 정보 형식 다양 (-/공백/숫자만 등) | 검증 느슨하게 + UI에서 placeholder로 가이드 |
| Phase 2가 Phase 1 디자인에 영향 | spec 작성 시 더치페이 시나리오 미리 고려해서 모델 설계 (이미 반영됨) |

---

## 15. 성공 기준 (Phase 1)

1. 모임 생성 시 카테고리 / 표시 / 계좌 모드 / 회비 사용 4개 선택 가능 + 디폴트로 빠른 생성
2. 모임 정보 수정에서 위 항목 변경 가능 (모임장만)
3. 모임 통장 등록/수정/삭제 (계좌 모드=모임 + 모임장)
4. 프로필에서 내 계좌 등록/수정/삭제
5. 멤버·거래 작성자 표시가 displayMode에 따라 분기
6. 회비 사용 안 함 모임은 회비 페이지에서 안내 + 차단
7. 디폴트 조합(친구 + 닉네임 + 개인 통장 + 회비 X)으로 모임 만들면 가장 가벼운 흐름
