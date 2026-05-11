# 더치페이 인앱 알림 + 공유 시트 (Phase 2) 설계

**작성일**: 2026-05-10
**기능**: 더치페이 화면에서 "납부 공유하기" 누르면 (1) 받는 사람에게 인앱 알림 발송 + (2) OS 공유 시트로 풍성한 텍스트 전송. 받는 사람은 알림 종에서 카드로 확인하고 [확인] dismiss.
**대상**: 작은 모임 (PocketPay) 모바일 + 백엔드
**Phase**: 2 / 2 (Phase 1 = 모임 카테고리 + 계좌 시스템, 이미 완료. Phase 2가 이를 활용)
**의존성**: Phase 1 계좌 시스템 (User.account / Team.account + Team.accountMode)

---

## 1. 배경 및 목표

### 1.1 사용자 요청

> "납부하기 버튼을 납부 공유하기 버튼으로 바꾸고, 그걸 공유하면 작은 모임 알림으로 납부 부탁한다는 알림도 가고, 공유된 시트에도 예쁘게 꾸며서 누구누구 납부해달라는 공유 시트를 만들어줘"

### 1.2 디자인 결정 (브레인스토밍 결과)

| 항목 | 결정 |
|---|---|
| 버튼 라벨 | "공유하기" → "납부 공유하기" |
| 동작 | 인앱 알림 + OS 공유 시트 동시 발생 |
| 알림 만료 | 7일 자동 |
| 본인 알림 | 자동 제외 (요청자 본인은 본인에게 알림 X) |
| 받은 사람 액션 | [확인] dismiss만 (단순 확인) |
| 메모 필드 | 선택 입력, 예: "회식비" |
| 리마인드 | 안 함 (단방향 1회) |
| 공유 시트 형식 | 풍성한 옵션 C (이모지 + 구분선 + 모든 정보) |
| 계좌 우선순위 | Phase 1의 accountMode 따라 |

---

## 2. 현황 분석

### 2.1 기존 더치페이 화면

`mobile/app/dutch.tsx`:
- 총 금액 / 참여자 체크박스 / 균등 분할·직접 입력 / 결과 표시
- 하단 버튼: "결과 복사" / "공유하기" — 둘 다 OS 공유 시트 (Share.share)
- 인앱 알림 X

### 2.2 기존 알림 시스템

- `Team.pendingInvites` (임베디드) — 모임 초대 알림
- `/invitations` 엔드포인트 — 본인의 pending 초대 조회/수락/거절
- `app/notifications.tsx` — 알림 카드 리스트 (현재 모임 초대만)
- `NotificationBell` 컴포넌트 (홈 헤더 우상단) — 빨간 배지

### 2.3 Phase 1 인프라 (이미 구축)

- `User.account` (개인 계좌)
- `Team.account` (모임 통장)
- `Team.accountMode`: personal / team
- `Team.displayMode`: nickname / realName

---

## 3. 아키텍처

### 3.1 전체 흐름

```
[더치페이 화면]
  ├ 기존 UI 유지
  ├ 신규: 메모 입력란
  ├ 버튼: "납부 공유하기"
  ↓
[버튼 누름]
  ├ 1. 본인 제외 recipientIds 추출
  ├ 2. 백엔드 POST /dutch-requests
  │     - 계좌 결정 (accountMode 따라)
  │     - 계좌 없으면 400 에러
  │     - DutchRequest 도큐먼트 N개 생성 (받는 사람당 1개)
  ├ 3. OS 공유 시트 띄움 (옵션 C 텍스트)
  └ 4. 토스트

[받는 사람의 앱]
  ├ 홈 진입 → fetchDutchRequests + fetchPendingInvitations
  ├ 종 배지 = 두 카운트 합산
  ├ 종 누름 → /notifications
  │   └ 모임 초대 + 더치페이 카드 통합 (시간순)
  └ 더치페이 카드 [확인] → dismiss
```

---

## 4. 데이터 모델

### 4.1 DutchRequest (신규 컬렉션)

```ts
interface IDutchRequest extends Document {
  requester: Types.ObjectId;        // ref: User — 요청 보낸 사람
  team: Types.ObjectId;             // ref: Team — 어느 모임에서
  recipient: Types.ObjectId;        // ref: User — 받는 사람 (= 송금해야 함)
  amount: number;                   // 1인당 금액
  memo?: string;                    // 선택, 최대 50자
  totalAmount: number;              // 총 금액 (표시용)
  participantCount: number;         // 참여자 수 (본인 포함, 표시용)
  // 계좌 스냅샷: 시점 정보 보존 (나중에 계좌 바뀌어도 알림은 원본)
  accountSnapshot: {
    bank: string;
    number: string;
    holder: string;
  };
  status: "pending" | "dismissed";
  expiresAt: Date;                  // createdAt + 7일
  createdAt: Date;
  updatedAt: Date;
}
```

**Mongoose 스키마**:
```ts
{
  requester: { type: ObjectId, ref: "User", required: true, index: true },
  team: { type: ObjectId, ref: "Team", required: true, index: true },
  recipient: { type: ObjectId, ref: "User", required: true, index: true },
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
}
```

**복합 인덱스**: `{ recipient: 1, status: 1, expiresAt: 1 }` — 받는 사람의 pending + 미만료 빠른 조회

### 4.2 마이그레이션

신규 컬렉션이라 기존 데이터 영향 X. DB 초기화 예정 + 신규라 마이그레이션 불필요.

---

## 5. 백엔드 API

### 5.1 POST /dutch-requests

**인증 필요** (loginUserVerify).

**Body**:
```ts
{
  teamId: string;          // ObjectId
  recipientIds: string[];  // 본인 제외된 받는 사람 ID 배열, 최소 1명
  amount: number;          // 1인당 금액 (> 0)
  totalAmount: number;     // 총 금액
  participantCount: number; // 참여자 수 (본인 포함, ≥ 2)
  memo?: string;           // 최대 50자
}
```

**서버 동작**:
1. teamId → Team 조회 + 요청자가 멤버인지 확인
2. recipientIds 모두 해당 모임 멤버인지 확인 (악용 방지)
3. 본인이 recipientIds에 포함됐다면 자동 제외
4. recipientIds 빈 배열이면 400 "받는 사람이 없습니다"
5. 계좌 결정:
   - team.accountMode === "personal":
     1순위: 요청자 user.account
     2순위: team.account
   - team.accountMode === "team":
     1순위: team.account
     2순위: 요청자 user.account
   - 둘 다 없으면 400 "계좌가 등록되지 않았습니다"
6. expiresAt = now + 7일
7. recipientIds 각각에 대해 DutchRequest 생성 (Mongoose insertMany 사용)
8. 응답: `{ data: { count: number, account: {...} } }` (계좌 정보는 클라이언트가 공유 시트에 사용)

### 5.2 GET /dutch-requests

**인증 필요**.

**서버 동작**:
1. `DutchRequest.find({ recipient: userId, status: "pending", expiresAt: { $gt: now } })`
2. populate:
   - `requester` → name, nickname, handle
   - `team` → name, displayMode
3. createdAt 내림차순 정렬
4. 응답:
```ts
{
  data: [{
    _id, teamId, teamName, teamDisplayMode,
    requesterName, requesterNickname, requesterHandle,
    amount, totalAmount, participantCount, memo,
    accountSnapshot, createdAt, expiresAt,
  }, ...]
}
```

### 5.3 POST /dutch-requests/:id/dismiss

**인증 필요**.

**서버 동작**:
1. DutchRequest 조회 (id + recipient === me)
2. 못 찾으면 404
3. status → "dismissed", save
4. 응답: `{ data: { success: true } }`

### 5.4 라우트 등록

`backend/routes/dutch-request.route.ts` 신규 + `routes/index.ts`에 `router.use("/dutch-requests", ...)`

---

## 6. 모바일 변경

### 6.1 더치페이 화면 (`app/dutch.tsx`)

#### 신규 state
```ts
const [memo, setMemo] = useState("");
```

#### UI 변경
- 참여자 섹션 아래 또는 분배 방식 아래에 메모 입력:
```tsx
<Input
  label="메모 (선택)"
  placeholder="예: 회식비, 택시비"
  value={memo}
  onChangeText={setMemo}
  maxLength={50}
/>
```

#### 하단 버튼 변경
기존: "결과 복사" / "공유하기"
변경: "결과 복사" / **"납부 공유하기"**

#### handleShare 변경
```ts
const handleShare = async () => {
  if (!isValid) return showToast(...);

  // 본인 제외 recipientIds
  const myUserId = currentUser?._id;
  const recipients = selectedParticipants.filter(p => p.userId !== myUserId);
  if (recipients.length === 0) {
    return showToast("error", "본인 외에 받는 사람이 없습니다");
  }

  setSharing(true);
  try {
    // 1. 백엔드에 알림 생성
    const res = await dutchApi.create({
      teamId,
      recipientIds: recipients.map(p => p.userId),
      amount: equalPerPerson,
      totalAmount: total,
      participantCount: selectedCount,
      memo: memo.trim() || undefined,
    });

    // 2. 응답에서 받은 계좌 정보로 공유 시트 텍스트 구성
    const shareText = buildShareText({
      teamName: currentTeam.name,
      requesterName: getDisplayName(currentUser, currentTeam.displayMode),
      memo: memo.trim(),
      totalAmount: total,
      perPerson: equalPerPerson,
      recipientNames: recipients.map(p => p.name),
      account: res.data.account,
    });

    await Share.share({ message: shareText });
    showToast("success", "납부 요청 보냈어요");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "공유에 실패했어요";
    showToast("error", "공유 실패", msg);
  } finally {
    setSharing(false);
  }
};
```

#### buildShareText (옵션 C 템플릿)
```ts
function buildShareText({ teamName, requesterName, memo, totalAmount, perPerson, recipientNames, account }): string {
  const titleLine = memo
    ? `🍽️ ${memo} ₩${totalAmount.toLocaleString()}원 더치페이`
    : `🍽️ 더치페이 ₩${totalAmount.toLocaleString()}원`;

  return [
    titleLine,
    '',
    `📍 모임: ${teamName}`,
    `👤 결제: ${requesterName}`,
    `👥 받는 사람: ${recipientNames.join(', ')}`,
    `💵 1인당 금액: ₩${perPerson.toLocaleString()}`,
    '',
    '━━━━━━━━━━━━━━━',
    '💳 송금하실 계좌',
    `${account.bank} ${account.number}`,
    `예금주: ${account.holder}`,
    '━━━━━━━━━━━━━━━',
    '',
    '📱 작은 모임으로 정산',
  ].join('\n');
}
```

### 6.2 /notifications 화면 확장

#### state 추가
```ts
const [dutchRequests, setDutchRequests] = useState<DutchRequestNotification[]>([]);
```

#### fetch 통합
```ts
useEffect(() => {
  fetchPendingInvitations();
  fetchDutchRequests();
}, []);

const fetchDutchRequests = async () => {
  try {
    const res = await dutchApi.list();
    setDutchRequests(res.data || []);
  } catch {
    // 비치명적
  }
};
```

#### 카드 통합 (시간순)
```ts
type UnifiedItem =
  | { type: "invite"; data: Invitation; createdAt: string }
  | { type: "dutch"; data: DutchRequest; createdAt: string };

const unified: UnifiedItem[] = [
  ...invitations.map(i => ({ type: "invite" as const, data: i, createdAt: i.invitedAt })),
  ...dutchRequests.map(d => ({ type: "dutch" as const, data: d, createdAt: d.createdAt })),
].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
```

#### 더치페이 카드 컴포넌트 (인라인)
```tsx
function DutchRequestCard({ request, onDismiss }) {
  const handleCopyAccount = async () => {
    await Clipboard.setStringAsync(request.accountSnapshot.number);
    showToast("success", "계좌번호 복사됨");
  };

  return (
    <View className="bg-card rounded-2xl p-4 mb-3" style={{ borderWidth: 1, borderColor: "#E5E8EB" }}>
      <Text className="text-lg font-pretendard-bold mb-1">
        {request.memo || "더치페이 요청"}
      </Text>
      <Text className="text-sub text-text-secondary mb-3">
        {request.requesterDisplayName}님이 ₩{request.amount.toLocaleString()} 요청
      </Text>
      <Text className="text-sub text-text-secondary mb-3">
        {request.teamName} · {formatRelativeTime(request.createdAt)}
      </Text>

      <View className="bg-background rounded-lg p-3 mb-3">
        <Text className="text-xs text-text-secondary mb-1">송금 계좌</Text>
        <Text className="text-body text-text-primary">
          {request.accountSnapshot.bank} {request.accountSnapshot.number}
        </Text>
        <Text className="text-sub text-text-secondary">예금주: {request.accountSnapshot.holder}</Text>
        <Pressable onPress={handleCopyAccount} className="mt-2">
          <Text className="text-sub text-brand font-pretendard-semibold">계좌번호 복사</Text>
        </Pressable>
      </View>

      <Button label="확인" variant="primary" size="md" onPress={onDismiss} />
    </View>
  );
}
```

### 6.3 NotificationBell 배지 카운트

홈 헤더의 NotificationBell — count 계산 변경:

기존 (홈 index.tsx):
```ts
count={pendingInvitations.length}
```

변경:
```ts
count={pendingInvitations.length + pendingDutchRequests.length}
```

→ teamStore에 `pendingDutchRequests` state + `fetchPendingDutchRequests` 액션 추가 (또는 별도 store)

### 6.4 신규 모바일 파일

| 경로 | 종류 |
|---|---|
| `mobile/src/types/dutch.ts` | DutchRequest 타입 |
| `mobile/src/api/dutch.ts` | dutchApi (create/list/dismiss) |

### 6.5 displayMode 적용

- 공유 시트의 `requesterName`: 모임의 displayMode 따라 (닉네임/실명)
- 더치페이 카드의 `requesterDisplayName`: 백엔드 응답에서 displayMode 적용된 값 전달

---

## 7. 엣지 케이스

| 케이스 | 처리 |
|---|---|
| 계좌 미등록 | 백엔드 400 → 토스트 + 안내 ("프로필에서 내 계좌 등록" 또는 "모임 통장 등록") |
| 본인만 체크된 더치페이 | 백엔드 400 "받는 사람이 없습니다" |
| 받는 사람 모임 탈퇴 후 알림 잔존 | populate 실패 가능. accountSnapshot은 자체 데이터라 표시 OK. team.name 등은 populate 안 되면 빈 값 — 클라이언트 fallback |
| 만료된 알림 (7일+ 경과) | GET에서 자동 필터링. DB 정리는 lazy. UI에는 안 보임 |
| 한 사람에게 여러 더치페이 진행 중 | 각각 별 카드로 표시. createdAt 순 정렬 |
| 계좌 정보 변경 후 옛 알림 | accountSnapshot 사용 → 변경 전 정보 그대로 |
| 더치페이 카드 [확인] 후 새로고침 | dismissed 상태라 GET에서 제외 → 안 보임 |
| 공유 시트 텍스트 길이 (메모 + 받는 사람 많음) | 카톡은 메시지 길이 제한 거의 없음. 문자는 짧으니 OS가 분할. 일반적 사용은 OK |
| 네트워크 에러 (POST /dutch-requests 실패) | 토스트 + 공유 시트 띄우지 않음 (인앱 알림과 공유 일관성 유지) |
| OS 공유 시트 취소 | 백엔드 알림은 이미 생성됨 (롤백 X). 사용자가 알림은 잘 봤지만 카톡 공유 안 한 상태. 정상 동작으로 간주 |

---

## 8. 보안 / 검증

- 모든 엔드포인트 인증 미들웨어 통과
- POST /dutch-requests:
  - 요청자가 해당 모임 멤버인지 확인
  - recipientIds 모두 해당 모임 멤버인지 확인
- GET /dutch-requests: `recipient === me` 필터로 본인 것만 조회
- POST /dutch-requests/:id/dismiss: 본인 알림만 dismiss 가능 (recipient 검증)
- 입력 validation: zod로 ObjectId, 숫자 범위, 문자열 길이 등

---

## 9. 비범위

- 푸시 알림 (v1.1)
- "납부 완료" 응답 (양방향 추적)
- 더치페이 히스토리 페이지
- 더치페이 통계 (월별/모임별)
- 만료 레코드 DB 정리 (cron) — lazy 필터로 충분
- 더치페이 재전송/리마인드
- 미가입자에게 보내기

---

## 10. 파일 변경 범위

### 백엔드

| 경로 | 종류 |
|---|---|
| `backend/models/DutchRequest.model.ts` | 신규 |
| `backend/models/index.ts` | DutchRequest export 추가 |
| `backend/services/dutch/dutch.service.ts` | 신규 — create/list/dismiss |
| `backend/controllers/dutch.controller.ts` | 신규 |
| `backend/routes/dutch-request.route.ts` | 신규 |
| `backend/routes/index.ts` | `/dutch-requests` 라우트 등록 |
| `backend/validators/dutch.validator.ts` | 신규 — zod 스키마 |

### 모바일

| 경로 | 종류 |
|---|---|
| `mobile/src/types/dutch.ts` | 신규 — DutchRequestNotification 타입 |
| `mobile/src/api/dutch.ts` | 신규 — dutchApi |
| `mobile/src/store/teamStore.ts` | pendingDutchRequests 추가 또는 별도 store |
| `mobile/app/dutch.tsx` | 메모 필드 + "납부 공유하기" + buildShareText |
| `mobile/app/notifications.tsx` | DutchRequestCard 추가 + fetch 통합 |
| `mobile/app/(tabs)/index.tsx` | NotificationBell count 갱신 (initiations + dutch) |

---

## 11. 위험 요소

| 위험 | 대응 |
|---|---|
| 공유 시트 텍스트가 OS별로 렌더 다름 | 옵션 C는 텍스트만 사용 (마크다운/HTML X). 안전 |
| 백엔드 알림 생성 성공 + 공유 시트 사용자가 취소 | 백엔드는 그대로 유지 (받는 사람에겐 인앱 알림 있음). 정상 |
| 계좌 정보가 너무 길어 카톡에서 어색 | 일반 한국 계좌 형식이라 짧음 (13자 정도). 문제 없음 |
| recipientIds 검증에 모임 멤버 모두 순회 | 멤버 수가 수십 명 이하 가정. 성능 OK |
| 더치페이 카드와 모임 초대 카드 UI 차이 | 디자인 일관성 유지: 같은 카드 구조 + 같은 패딩 + 같은 버튼 스타일 |

---

## 12. 테스트 계획

### 12.1 백엔드 (수동 / curl)

- [ ] POST /dutch-requests 정상 (모임 멤버 + 계좌 있음) → DutchRequest N개 생성
- [ ] POST 계좌 미등록 → 400 "계좌가 등록되지 않았습니다"
- [ ] POST 본인만 recipientIds → 400 "받는 사람이 없습니다"
- [ ] POST 비-멤버 recipientId 포함 → 검증 에러
- [ ] GET /dutch-requests → 본인의 pending + 미만료만
- [ ] GET 만료 7일 지난 것 → 안 나옴
- [ ] POST /dutch-requests/:id/dismiss → status dismissed
- [ ] 다른 사람의 알림을 dismiss 시도 → 404

### 12.2 모바일 (시뮬레이터)

- [ ] 더치페이 화면에 메모 필드
- [ ] "납부 공유하기" 버튼
- [ ] 누름 → 계좌 등록되어 있으면 인앱 알림 + 공유 시트
- [ ] 누름 → 계좌 미등록 토스트 + 안내
- [ ] 두 계정 시나리오 (A 요청, B/C 받음):
  - A: 공유 시트에 옵션 C 텍스트
  - B: 알림 종에 배지 + /notifications에 더치페이 카드
  - B: 카드의 [계좌 복사] → 클립보드
  - B: [확인] → 카드 사라짐 + 배지 -1
- [ ] 본인 포함된 더치페이 → 본인은 알림 받지 않음
- [ ] 모임 초대 + 더치페이 동시 알림 → /notifications에 시간순 표시
- [ ] 종 배지 = 모임 초대 + 더치페이 합산

---

## 13. 성공 기준

1. 더치페이 화면에 메모 입력 + "납부 공유하기" 버튼 추가
2. 누름 → 본인 제외 recipientIds로 백엔드 DutchRequest 일괄 생성
3. 동시에 OS 공유 시트로 옵션 C 텍스트 전송
4. 계좌 미등록 시 차단 + 안내
5. 받는 사람 알림 종에 배지 (기존 모임 초대 + 더치페이 합산)
6. /notifications 카드 리스트에 두 종류 통합 (시간순)
7. 더치페이 카드: 메모/요청자/금액/모임명/계좌 + [계좌 복사] + [확인]
8. [확인] 누르면 status dismissed + 카드 사라짐
9. 7일 후 자동 사라짐 (GET 필터)
