# 모임 초대 수락/거절 + 알림 시스템 설계

**작성일**: 2026-05-08
**기능**: 이메일로 모임에 초대된 사람이 자동으로 팀에 추가되지 않고, 수락/거절을 선택할 수 있도록 변경. 홈 헤더에 알림 벨(배지 포함) 추가.
**대상**: 작은 모임 (PocketPay) 모바일 + 백엔드

---

## 1. 배경 및 목표

### 1.1 사용자 요청

> "혹시 모임장이 이메일을 잘못쳐서 다른 사람을 초대했는데, 그 사람이 그 모임에 갑자기 들어와지면 당황할 것 같애. 그래서 초대 수락 및 거절 하는 거 있어야 할 것 같애"

### 1.2 현재 동작 (문제점)

`backend/services/team/team.service.ts:107-138`의 `inviteMember()`:
1. 팀장이 이메일 입력
2. 서버가 `User.findOne({ email })` 으로 가입자 검색
3. 존재하면 **즉시** `team.members.push({ user, role: 'member' })`
4. 초대받은 사람은 별도 알림 없이 팀이 새로 생긴 채로 발견

→ **잘못 초대된 사람을 차단할 수단이 없음**.

### 1.3 디자인 결정 (브레인스토밍 결과)

| 항목 | 결정 |
|---|---|
| 미가입자 초대 | **불가** — 가입자만 초대 (현재 동작 유지). 미가입자 자동 연결은 v1.1+ |
| 알림 위치 | 홈 헤더 **좌측**에 종 아이콘 + 빨간 배지 카운트 |
| 알림 화면 | 단일 `/notifications` 라우트가 모든 알림 타입 모음. 지금은 "모임 초대"만 |
| 거절 후 재초대 | 정상 동작 (다시 pending으로 들어감) |
| 푸시/이메일 알림 | 비범위 (v1.1+) |

---

## 2. 현황 분석

### 2.1 백엔드 모듈 구조

- `backend/services/team/team.service.ts` — 팀 비즈니스 로직 (10개 함수, ~260줄)
- `backend/controllers/team.controller.ts` — HTTP 핸들러
- `backend/routes/team.route.ts` — 라우팅
- `backend/validators/team.validator.ts` — 입력 검증
- 모델: `backend/models/team.model.ts` (Team), `backend/models/user.model.ts` (User)

### 2.2 모바일 모듈 구조

- 화면: `mobile/app/team/{invite,join,qr,create,fee,[teamId]}.tsx`
- API: `mobile/src/api/team.ts`
- 스토어: `mobile/src/store/teamStore.ts`
- 홈 헤더: `mobile/app/(tabs)/index.tsx:308-334` (팀명 드롭다운 + 팀원 관리 아이콘)

### 2.3 디자인 시스템

NativeWind + 기존 컴포넌트:
- `Header`, `ScreenContainer`, `Button`, `Card`, `ListItem`
- 알림 배지를 위한 신규 컴포넌트 필요 (재사용 가능하게 설계)

---

## 3. 아키텍처

### 3.1 전체 흐름

```
[팀장]                          [초대받은 사람]
   │                                  │
   │ POST /teams/:id/invite           │
   │ { email }                        │
   ▼                                  │
┌──────────────────┐                  │
│ inviteMember()   │                  │
│ User 검색        │                  │
│ pendingInvites   │                  │
│ 에 push          │                  │
└──────────────────┘                  │
                                      │
                                      │ 앱 진입
                                      ▼
                              ┌──────────────────────┐
                              │ 홈 진입 시           │
                              │ GET /invitations     │
                              │ count 받음           │
                              └──────────────────────┘
                                      │
                                      │ 종 아이콘 배지(N)
                                      │ 누름
                                      ▼
                              ┌──────────────────────┐
                              │ /notifications 화면  │
                              │ 초대 목록 + [수락][거절]│
                              └──────────────────────┘
                                      │
                  ┌───────────────────┴────────────────┐
                  │                                    │
            POST /invitations/:teamId/accept    POST /invitations/:teamId/reject
                  │                                    │
                  ▼                                    ▼
            pendingInvites 제거               pendingInvites 제거
            members 에 push                   (그대로 끝)
```

### 3.2 백엔드 변경

#### 데이터 모델 (Team 모델)

기존 `members: [{ user, role }]`에 새 필드 추가:

```ts
pendingInvites: [{
  user: { type: ObjectId, ref: 'User', required: true },
  invitedBy: { type: ObjectId, ref: 'User', required: true },
  invitedAt: { type: Date, default: Date.now },
}]
```

스키마 마이그레이션: 기존 팀 문서는 `pendingInvites` 미정의 → MongoDB는 빈 배열로 처리. 별도 마이그레이션 스크립트 불필요.

#### 기존 함수 수정

`inviteMember(teamId, ownerId, email)`:

기존:
```ts
team.members.push({ user: user._id, role: "member" });
await team.save();
return team;
```

변경:
```ts
// 이미 멤버인지 확인
if (team.members.some(m => m.user.equals(user._id))) {
  throw AppError.badRequest("이미 팀원으로 등록된 사용자입니다.");
}
// 이미 초대 중인지 확인
if (team.pendingInvites.some(p => p.user.equals(user._id))) {
  throw AppError.badRequest("이미 초대한 사용자입니다.");
}
team.pendingInvites.push({
  user: user._id,
  invitedBy: ownerId,
  invitedAt: new Date(),
});
await team.save();
return team;
```

#### 새 엔드포인트

**GET `/invitations`** (인증 필요)
- 현재 유저가 받은 모든 pending 초대 반환
- 응답:
  ```json
  [{
    "teamId": "...",
    "teamName": "주말 동호회",
    "invitedBy": { "_id": "...", "name": "김아엔" },
    "invitedAt": "2026-05-08T10:00:00Z"
  }, ...]
  ```
- 구현: `Team.find({ "pendingInvites.user": req.userId }).populate("pendingInvites.invitedBy", "name")`

**POST `/invitations/:teamId/accept`** (인증 필요)
- 현재 유저의 pending 초대를 수락
- 동작:
  1. `Team.findOne({ _id: teamId, "pendingInvites.user": userId })`
  2. 못 찾으면 `404 초대를 찾을 수 없습니다`
  3. pendingInvites에서 본인 항목 제거 + members에 추가
  4. `team.save()`
- 응답: `{ success: true, team: <updated> }`

**POST `/invitations/:teamId/reject`** (인증 필요)
- pending 초대를 거절
- 동작:
  1. `Team.findOne({ _id: teamId, "pendingInvites.user": userId })`
  2. 못 찾으면 `404`
  3. pendingInvites에서 본인 항목 제거
  4. `team.save()`
- 응답: `{ success: true }`

#### 라우팅 (`backend/routes/`)

새 라우트 파일: `backend/routes/invitation.route.ts`
- `GET /` → 목록
- `POST /:teamId/accept`
- `POST /:teamId/reject`

`backend/server.ts` 또는 라우트 등록 위치에 `app.use('/invitations', invitationRoute)` 추가.

### 3.3 모바일 변경

#### 신규 컴포넌트

**`mobile/src/components/ui/NotificationBell.tsx`** — 알림 벨 + 배지

```tsx
type Props = {
  count: number;
  onPress: () => void;
};

export function NotificationBell({ count, onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      <Bell size={24} color="#191F28" strokeWidth={2} />
      {count > 0 && (
        <View style={{ /* absolute top-right red dot with number */ }}>
          <Text>{count > 99 ? "99+" : count}</Text>
        </View>
      )}
    </Pressable>
  );
}
```

#### 홈 헤더 수정 (`mobile/app/(tabs)/index.tsx`)

기존 (팀 있을 때):
```tsx
<View className="flex-row items-center justify-between py-4">
  <Pressable>...팀명...</Pressable>
  <Pressable>...팀원 관리...</Pressable>
</View>
```

변경:
```tsx
<View className="flex-row items-center justify-between py-4">
  <View className="flex-row items-center gap-3">
    <NotificationBell count={pendingCount} onPress={...} />
    <Pressable>...팀명...</Pressable>
  </View>
  <Pressable>...팀원 관리...</Pressable>
</View>
```

EmptyState 헤더(팀 없을 때)도 동일하게 종 표시.

#### 신규 화면 `mobile/app/notifications.tsx`

```tsx
export default function NotificationsScreen() {
  const [invites, setInvites] = useState<Invitation[]>([]);
  // GET /invitations on mount + on focus
  // accept/reject handlers call API + remove from local state
  return (
    <ScreenContainer>
      <Header title="알림" showBack />
      {invites.length === 0 ? (
        <EmptyState>새 알림이 없어요</EmptyState>
      ) : (
        <FlatList
          data={invites}
          renderItem={({ item }) => (
            <InvitationCard
              invitation={item}
              onAccept={...}
              onReject={...}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
}
```

`InvitationCard` 컴포넌트(인라인 또는 별 파일):
- 모임명 (큰 글씨)
- 초대한 사람 + 시간
- [수락] (primary) [거절] (outline) 버튼

#### 라우트 등록

`mobile/app/_layout.tsx`의 root Stack에 추가:
```tsx
<Stack.Screen name="notifications" />
```

#### API 클라이언트 (`mobile/src/api/`)

새 파일: `mobile/src/api/invitation.ts`
- `getInvitations()` → `GET /invitations`
- `acceptInvitation(teamId)` → `POST /invitations/:teamId/accept`
- `rejectInvitation(teamId)` → `POST /invitations/:teamId/reject`

#### 스토어

`mobile/src/store/teamStore.ts` 확장 OR 신규 `notificationStore`.

권장: **`teamStore`에 `pendingInvitations: Invitation[]` 추가** — 수락 시 팀 목록도 갱신해야 하므로 같은 스토어가 자연스러움.

추가 액션:
- `fetchPendingInvitations()` — GET 호출 후 `pendingInvitations` 갱신
- `acceptInvitation(teamId)` — accept API 호출 후 `pendingInvitations` 갱신 + `fetchTeams()` 호출
- `rejectInvitation(teamId)` — reject API 호출 후 `pendingInvitations` 갱신

#### 업데이트 시점

- 홈 탭 포커스 시 (`useIsFocused` + useEffect)
- 알림 화면 진입 시
- accept/reject 직후

---

## 4. 인터랙션 디테일

### 4.1 빈 상태 UI

`/notifications` 화면, 초대 0개:
- 가운데에 메시지 "새 알림이 없어요"
- 부제 "모임 초대를 받으면 여기에 표시돼요"
- 작은 종 아이콘 (회색)

### 4.2 카드 디자인

```
┌─────────────────────────────────────┐
│ 주말 동호회                          │
│ 김아엔님이 초대했어요 · 5분 전        │
│                                      │
│       [거절]            [수락]       │
└─────────────────────────────────────┘
```

- 모임명: `text-lg font-pretendard-bold`
- 메타: `text-sub text-text-secondary`
- 버튼: 좌측 outline, 우측 primary

### 4.3 시간 표시

- < 1분: "방금"
- < 60분: "N분 전"
- < 24시간: "N시간 전"
- < 7일: "N일 전"
- ≥ 7일: 날짜 (예: "5/2")

### 4.4 배지 디자인

- 빨간 원 (배경 `#EF4444`), 흰 글씨, 작은 사이즈
- 위치: 종 아이콘 우상단, 살짝 겹침
- 카운트 0 → 표시 안 함
- 카운트 99 초과 → "99+" 표시

---

## 5. 엣지 케이스

| 케이스 | 처리 |
|---|---|
| 같은 사람 두 번 초대 | 두 번째 시도에서 "이미 초대한 사용자입니다" 에러 |
| 이미 팀원인 사람 초대 | "이미 팀원입니다" 에러 (기존 동작 유지) |
| 미가입 이메일 초대 | "가입한 사용자가 없습니다" 에러 (Q1 결정대로) |
| 거절 후 재초대 | 정상 — pendingInvites에 다시 push |
| 팀이 삭제됐는데 pending 남아있음 | Team 도큐먼트 삭제 시 자동 소멸 (embedded 배열) |
| 초대받은 사용자가 탈퇴 | GET /invitations 시 본인 ID 없으니 자연스럽게 안 보임 |
| 동시에 두 기기에서 수락 시도 | MongoDB single-doc 원자성으로 한 쪽만 성공, 다른 쪽 404 |
| 초대 후 팀장이 마음 바뀌어 취소하려면? | 비범위 — 일단 못 함. v1.1+에서 관리자 페이지에 |

---

## 6. 보안 / 검증

- 모든 새 엔드포인트는 인증 미들웨어 통과 필요
- accept/reject는 본인의 pendingInvites 항목만 처리 (`pendingInvites.user === req.userId` 매칭)
- `inviteMember`는 기존처럼 owner만 가능 (`team.owner === ownerId` 체크)
- teamId는 ObjectId 검증

---

## 7. 테스트 계획

### 7.1 백엔드 (수동 / Postman)

- [ ] 가입자 이메일로 invite → pendingInvites에 추가됨, members 변화 X
- [ ] 미가입 이메일 invite → 404 에러
- [ ] 같은 사람 두 번 invite → 두 번째 400 에러
- [ ] 이미 팀원인 사람 invite → 400 에러
- [ ] GET /invitations → 본인의 pending만 (다른 유저 X)
- [ ] POST /invitations/:teamId/accept → members에 추가, pendingInvites에서 제거
- [ ] POST /invitations/:teamId/reject → pendingInvites에서 제거 (members 변화 X)
- [ ] 거절 후 재초대 → 다시 pending에 추가됨

### 7.2 프론트엔드 (시뮬레이터 / 실기기)

- [ ] 홈 헤더 좌측에 종 아이콘 표시
- [ ] 초대 0개 → 배지 안 보임
- [ ] 초대 N개 → 빨간 배지 N
- [ ] 종 누름 → /notifications 진입
- [ ] 초대 카드 [수락] → 카드 사라짐 + 팀 목록에 새 팀 추가됨
- [ ] 초대 카드 [거절] → 카드 사라짐 + 팀 목록 변화 X
- [ ] 초대 0개일 때 빈 상태 디자인 정상
- [ ] 홈 다시 가면 배지 카운트 갱신
- [ ] iPhone + iPad 시뮬레이터 양쪽 검증

---

## 8. 의존성 변경

추가 패키지 없음. 기존 `lucide-react-native`의 `Bell` 아이콘 사용.

---

## 9. 파일 변경 범위

### 백엔드

| 경로 | 변경 |
|---|---|
| `backend/models/team.model.ts` | `pendingInvites` 필드 추가 |
| `backend/services/team/team.service.ts` | `inviteMember` 수정 + 신규 3 함수(get/accept/reject) |
| `backend/controllers/invitation.controller.ts` | 신규 |
| `backend/routes/invitation.route.ts` | 신규 |
| `backend/server.ts` | 라우트 등록 |
| `backend/validators/team.validator.ts` | 필요 시 유효성 |

### 모바일

| 경로 | 변경 |
|---|---|
| `mobile/src/components/ui/NotificationBell.tsx` | 신규 |
| `mobile/app/notifications.tsx` | 신규 |
| `mobile/app/_layout.tsx` | Stack.Screen 추가 |
| `mobile/app/(tabs)/index.tsx` | 헤더 좌측 종 추가 (2곳: empty + 일반) |
| `mobile/src/api/invitation.ts` | 신규 |
| `mobile/src/store/teamStore.ts` | pendingInvitations 필드/액션 추가 |
| `mobile/src/types/invitation.ts` | 타입 정의 (신규) |

---

## 10. 비범위 (v1.1+)

- 푸시 알림 (메모리 `feature_roadmap_v1_1.md` 참조)
- 이메일 발송 (Gmail SMTP 활용 가능하지만 일단 인앱만)
- 알림 read/unread 분리 (지금은 pending 자체가 unread 역할)
- 미가입자 초대 후 가입 시 자동 연결
- 다른 알림 타입(거래 추가, 멤버 가입 등) — 같은 화면에 추가하기 쉬운 구조로 만들지만 구현은 v1.1
- 팀장이 보낸 초대 취소 기능

---

## 11. 위험 요소 및 대응

| 위험 | 대응 |
|---|---|
| 기존 사용자가 이미 자동 추가된 멤버를 가지고 있음 | 마이그레이션 X (한번 멤버 된 건 그대로 둠). 새 초대만 pending 거침 |
| 알림 화면 진입 시 데이터가 stale | useIsFocused + 진입 시 다시 fetch |
| 종 아이콘이 좁은 헤더에서 팀명 가림 | 팀명을 truncate(`numberOfLines={1}`) + maxWidth |
| accept 직후 팀 목록이 갱신 안 됨 | accept 응답 후 `fetchTeams()` 자동 호출 |
| pending이 많을 때 GET 응답 느림 | 페이지네이션 비범위. MVP에선 모임 초대 N개 ≤ 수십개 가정 |

---

## 12. 성공 기준

1. 팀장이 가입자를 이메일로 초대 → **즉시 멤버 추가 X**, pendingInvites에 들어감
2. 초대받은 사람이 앱 열고 홈 진입 → 좌측 종에 빨간 배지(개수)
3. 종 누름 → /notifications 화면 → 초대 목록 표시
4. [수락] → 정식 멤버 + 알림 사라짐 + 팀 목록에 새 팀 표시
5. [거절] → 알림만 사라지고 팀 합류 X
6. 잘못 초대된 사람이 [거절]로 안전하게 빠져나갈 수 있음
