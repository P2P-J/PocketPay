# 작은 모임(PocketPay) — App Store 거절 사유 해결 설계서

- 작성일: 2026-04-28
- 버전: 1.0 (5) 거절 → 1.0 (6) 재제출 대상
- 거절 Submission ID: `836c0a38-53af-4337-a811-516718ef0dc0`
- Apple 리뷰 일자: April 28, 2026
- 리뷰 디바이스: iPad Air 11-inch (M3)

## 1. 배경 및 목표

App Store 1차 제출 결과 두 가지 가이드라인 위반으로 거절되었다.

### 1.1 거절 사유

**Guideline 4.8 — Login Services**
- 카카오/네이버/구글 OAuth만 제공.
- 4.8이 요구하는 "동등한 로그인 옵션"(이름·이메일만 수집 / 이메일 비공개 / 광고 추적 비동의) 미충족.
- 이메일 로그인은 "이메일 비공개" 조건을 충족하지 못함.

**Guideline 4 — Design (iPad)**
- iPad Air 11-inch(M3) 기준 더보기 페이지 스크롤 불가.
- "비밀번호 변경" 아래의 로그아웃·회원탈퇴 항목이 화면 밖으로 잘림.
- 근본 원인: `app/(tabs)/more.tsx`가 `<View>`로만 감싸져 있어 콘텐츠가 화면을 넘으면 잘림. 추가로 `supportsTablet: false`라 iPad에서 iPhone 호환 모드(2x 확대)로 실행되어 콘텐츠가 더 길게 표시됨.

### 1.2 목표

1. Apple App Store 거절 사유 두 건 모두 해결.
2. 모든 페이지를 iPad에 자연스럽게 적응하는 반응형 디자인으로 개편.
3. 기존 사용자(카카오·네이버·구글·이메일)에게 영향 없이 추가 기능으로 통합.
4. 1.0(6) 빌드로 재제출하여 심사 통과.

## 2. 변경 범위 한눈에

| 영역 | 파일 수 | 리스크 |
|---|---|---|
| 백엔드: Apple OAuth provider 추가 | 3 | 낮음 |
| 백엔드: User 모델 enum/oauthTokens 확장 | 1 | 낮음 |
| 프론트: 로그인 화면 Apple 버튼 추가 | 1 | 낮음 |
| 프론트: 더보기 페이지 스크롤 수정 | 1 | 매우 낮음 |
| 프론트: 반응형 디자인 시스템 도입 | ~25 | 중간 |
| iOS: app.json supportsTablet/capabilities | 1 | 낮음 |
| Apple Developer Console 설정 | 수동 | 사용자 수행 완료 |

## 3. 백엔드 설계

### 3.1 Apple Sign-In 흐름 (Native iOS)

```
[iOS 앱]
  ├─ expo-apple-authentication.signInAsync(nonce)
  │   ↓ Face ID/Touch ID
  ├─ identityToken (JWT) + authorizationCode
  │  + (최초 1회) email, fullName
  └─ POST /auth/login/oauth/apple/native { identityToken, name?, nonce }

[백엔드]
  ├─ Apple JWKS (https://appleid.apple.com/auth/keys) 캐시 조회
  ├─ JWT RS256 검증
  │   ├─ iss === "https://appleid.apple.com"
  │   ├─ aud === BUNDLE_ID ("com.jageunmoim.app")
  │   ├─ exp > now
  │   └─ nonce 매칭 (있을 경우)
  ├─ sub (Apple 영구 유저 ID), email 추출
  ├─ User upsert (provider="apple")
  └─ JWT 토큰 페어 발급 → 응답
```

### 3.2 신규 파일

#### `backend/services/auth/providers/apple.provider.ts`

기존 google/kakao/naver provider와 동일한 인터페이스 유지.

```ts
{
  verifyIdentityToken(identityToken, expectedNonce?) → {
    sub: string,
    email: string,
    email_verified: boolean,
    is_private_email: boolean,
  },
  getUserProfile(verifiedClaims, name?) → {
    provider: 'apple',
    providerId: string,    // sub
    email: string,
    name: string,          // 클라이언트 fullName 또는 'Apple 사용자'
  },
  revokeToken(token) → void,   // 회원 탈퇴 시 사용
}
```

검증 로직:
1. `https://appleid.apple.com/auth/keys`에서 JWKS 조회 (1시간 메모리 캐시)
2. `kid` 헤더로 매칭되는 public key 선택
3. RS256 서명 검증
4. iss/aud/exp/nonce 검증
5. 검증 실패 시 `AppError.unauthorized("INVALID_APPLE_TOKEN")`

라이브러리: `jsonwebtoken` + `jwks-rsa` (CommonJS 환경 안정성).

### 3.3 수정 파일

#### `backend/services/auth/providers/index.ts`
- `apple` provider 등록.

#### `backend/models/User.model.ts`
- `provider` enum에 `"apple"` 추가.
- `oauthTokens` 인터페이스에 `apple` 키 추가 (refresh token, MVP 미사용).
- TypeScript 인터페이스도 동일 갱신.

#### `backend/models/withdrawnOauth.model.ts`
- 변경 없음.
- Apple은 자유 재가입 정책 → WithdrawnOauth enum에 추가하지 않음.

#### `backend/services/auth/auth.oauth.service.ts`
- 새 함수 `loginAppleNative(identityToken, name)` 추가.
- 기존 `loginOauth`는 web redirect 방식(카카오/네이버/구글)에만 사용, 변경 없음.

```ts
loginAppleNative(identityToken, name) {
  const claims = await providers.apple.verifyIdentityToken(identityToken);
  const profile = providers.apple.getUserProfile(claims, name);
  let user = await User.findOne({ provider:'apple', providerId: profile.providerId });
  if (!user) {
    user = await User.create({ ...profile });
  }
  return { user, ...issueTokenPair(user) };
}
```

#### `backend/routes/auth.route.ts`
- 신규: `POST /login/oauth/apple/native` (body: `{ identityToken, name?, nonce? }`)
- 기존 `GET /login/oauth/:provider` 유지.

#### `backend/controllers/auth.controller.ts`
- `loginAppleNativeController` 추가.

### 3.4 환경변수

`.env`에 다음 추가 (사용자 보유 값 사용):

```
APPLE_BUNDLE_ID=com.jageunmoim.app
APPLE_TEAM_ID=47TJBU97ZL
APPLE_KEY_ID=3G24J2DRSM
APPLE_PRIVATE_KEY=<.p8 PEM 전체 내용 — 줄바꿈은 \n으로 인코딩>
```

`APPLE_BUNDLE_ID`는 토큰 검증(aud 비교)에 사용. 나머지 3개는 회원 탈퇴 시 Apple revoke 호출에 사용.

`.env`는 `.gitignore`에 등록되어 있어야 함. `.env.example`에는 키만 추가하고 값은 비워둠.

### 3.5 회원 탈퇴 시 Apple 연결 해제

가이드라인 5.1.1(v) 안전 마진. Apple로 가입한 사용자가 탈퇴 시:

1. Apple revoke endpoint(`https://appleid.apple.com/auth/revoke`) 호출
2. 요청 body: `client_id`, `client_secret`(JWT), `token`, `token_type_hint`
3. `client_secret`은 `APPLE_TEAM_ID + APPLE_KEY_ID + APPLE_PRIVATE_KEY`로 ES256 서명 JWT 생성
4. revoke 실패해도 사용자 탈퇴 자체는 진행(best-effort)

## 4. 프론트엔드 설계

### 4.1 Apple 로그인 버튼 (`app/(auth)/login.tsx`)

배치 순서: 카카오 / 네이버 / Google / **Apple** / 이메일

플랫폼 분기:
- iOS: Apple 버튼 노출
- Android: 자동 숨김 (`Platform.OS === 'ios'` 가드 또는 `expo-apple-authentication`의 `isAvailableAsync()` 사용)

흐름:
1. 사용자가 Apple 버튼 누름
2. `AppleAuthentication.signInAsync({ requestedScopes: [FULL_NAME, EMAIL], nonce })` 호출
3. 성공 시 받은 `identityToken`, `fullName`, `nonce`를 백엔드에 POST
4. 백엔드 응답의 accessToken을 SecureStore에 저장 → `useAuthStore.login()` → 메인 화면 진입

UI:
- Apple HIG의 "Sign in with Apple" 버튼 가이드 준수
- 검은색 배경(#000) + 흰 글씨 "Apple로 계속하기"
- 버튼 높이 52px, radius 12px (기존 SocialLoginButton 컴포넌트와 일치)

### 4.2 더보기 스크롤 수정 (`app/(tabs)/more.tsx`)

- 페이지 루트를 `<View>` → `<ScrollView>`(또는 신규 `ScreenContainer scrollable`)로 변환
- `contentContainerStyle.paddingBottom`에 탭바 높이 + safe area inset 추가
- 키보드/회전 상황 모두 대응

### 4.3 반응형 디자인 시스템

#### 4.3.1 Breakpoint 정의 (`src/tokens/breakpoints.ts`)

```ts
export const BREAKPOINTS = {
  phone: 0,      // 0  ~ 599
  tablet: 600,   // 600 ~ 1023
  large: 1024,   // 1024+
};

export type Breakpoint = 'phone' | 'tablet' | 'large';
```

#### 4.3.2 반응형 hook (`src/hooks/useBreakpoint.ts`, `useResponsiveTokens.ts`)

```ts
useBreakpoint(): Breakpoint
  → 화면 너비를 useWindowDimensions로 측정해 즉시 반환
  → 회전·분할 화면 모두 즉시 재계산

useResponsiveTokens(): {
  screenX: 20 | 40 | 80,
  contentMaxWidth: undefined | 720 | 840,
  cardPadding: 16 | 20 | 24,
  cardRadius: 16 | 20 | 24,
  sectionGap: 24 | 32 | 40,
  fontDisplay: 32 | 36 | 40,
  fontTitle: 22 | 24 | 26,
  fontBody: 16 | 16 | 17,
  buttonHeight: 52 | 56 | 56,
  inputHeight: 52 | 56 | 56,
}
```

본문 폰트(body)는 가독성 우선으로 거의 동일 유지.

#### 4.3.3 ScreenContainer (`src/components/layout/ScreenContainer.tsx` 신규)

모든 페이지가 일괄 사용할 표준 컨테이너.

```tsx
<ScreenContainer scrollable>
  ...content...
</ScreenContainer>
```

내부 동작:
- `useResponsiveTokens()` 호출
- SafeAreaInsets 자동 처리 (top/bottom)
- 좌우 padding: `screenX` 토큰
- 최대 너비: `contentMaxWidth` 적용 후 가운데 정렬
- `scrollable` prop 시 `ScrollView`로 래핑 + `paddingBottom: tabBarHeight + insets.bottom`
- KeyboardAvoidingView (iOS padding) 옵션

#### 4.3.4 컴포넌트 단위 변경

| 컴포넌트 | 변경 |
|---|---|
| `Card.tsx` | padding/radius를 토큰으로 |
| `Button.tsx` | 높이/폰트 토큰화 |
| `Input.tsx` | 높이/폰트 토큰화 |
| `ListItem.tsx` | 높이/패딩 토큰화 |
| `Header.tsx` | 좌우 padding 토큰화 (높이 56 고정) |
| `BottomSheet.tsx` | tablet/large에서 max-width 600 + 가운데 정렬 |
| `ScreenContainer.tsx` | 신규 |

API 시그니처는 변경하지 않음 → 호출부 수정 최소화.

#### 4.3.5 모든 화면 마이그레이션 대상

```
auth/login, auth/signup, auth/reset-password, auth/terms
(tabs)/index (홈), (tabs)/transactions (거래내역),
(tabs)/add (거래추가), (tabs)/history (내역), (tabs)/more (더보기)
team/[teamId], team/create, team/invite, team/qr, team/fee
transaction/[id]
change-password, dutch, +not-found, index
```

각 페이지 루트의 `<View>` 또는 `<ScrollView>`를 `<ScreenContainer>`로 교체.

### 4.4 디자인 토큰 일관성

다음은 변경하지 않음:
- 브랜드 컬러 `#3DD598`, 수입/지출 컬러
- Pretendard 폰트 패밀리·굵기
- 모서리·그림자 스타일 가이드
- 컴포넌트 외형(시각 스타일)

큰 화면에서는 토큰이 자동 확대될 뿐, 디자인 정체성은 100% 유지.

### 4.5 안 하는 것 (YAGNI)

- 거래내역 2열 그리드(가독성 저하)
- 사이드바·분할 화면 등 iPad 전용 레이아웃(차기 버전 검토)
- 가로 모드 전용 디자인(작동만 보장)
- 다크모드(별도 작업)
- 폰트 크기 대폭 확대(가독성)
- Apple Sign-In refresh token 관리(MVP 미사용)
- 카카오/네이버/구글 코드 리팩토링

## 5. iOS 구성 변경 (`mobile/app.json`)

```diff
"ios": {
-  "supportsTablet": false,
+  "supportsTablet": true,
   "bundleIdentifier": "com.jageunmoim.app",
   "infoPlist": {
     "NSPhotoLibraryUsageDescription": "...",
     "NSPhotoLibraryAddUsageDescription": "...",
     "NSCameraUsageDescription": "...",
     "ITSAppUsesNonExemptEncryption": false
   },
+  "usesAppleSignIn": true,
+  "buildNumber": "6"
}
```

`expo-apple-authentication` 플러그인을 `plugins` 배열에 추가.

## 6. Apple Developer Console 설정 (사용자 수행 완료)

- ✅ App ID `com.jageunmoim.app`에 Sign In with Apple capability 활성화
- ✅ Sign-In Key (.p8) 생성
  - Team ID: `47TJBU97ZL`
  - Key ID: `3G24J2DRSM`
  - Private Key: 사용자 보유 (백엔드 .env에만 저장)
- ⏭️ Service ID: 미생성 (Native Sign-In만 사용하므로 불필요)
- ⏭️ Provisioning Profile: EAS Build 시 자동 갱신

## 7. 보안 고려사항

| 위협 | 대응 |
|---|---|
| 위조 identityToken | JWKS public key로 RS256 서명 검증 |
| 다른 앱 토큰 재사용 | aud === BUNDLE_ID 검증 |
| 만료 토큰 | exp > now 검증 |
| issuer 사칭 | iss === "https://appleid.apple.com" 검증 |
| Replay attack | 클라이언트 nonce 생성·검증 |
| .p8 키 유출 | .env 보관 + .gitignore 등록 + 의심 시 즉시 revoke |
| MITM | HTTPS 전구간 강제 |

## 8. 테스트 계획

### 8.1 Apple 로그인 회귀
- iPhone 시뮬레이터에서 Apple 버튼으로 로그인 → 메인 진입
- 동일 Apple ID 재로그인 → 같은 사용자 매핑
- 회원 탈퇴 → Apple ID 설정의 "Apps Using Apple ID"에서 우리 앱 제거 확인
- Android 빌드: Apple 버튼 자동 미노출

### 8.2 iPad 호환성
- iPad Air 11" (M3), iPad Pro 12.9" 시뮬레이터 양쪽 검증
- 더보기 페이지: 회원탈퇴 버튼까지 모두 도달 가능
- 모든 화면이 양옆에 자연스러운 패딩으로 콘텐츠 가운데 정렬
- 세로↔가로 회전 시 깨지지 않음
- 카드/버튼/리스트가 화면 비율에 맞게 자연스럽게 확대

### 8.3 기존 기능 회귀
- 카카오/네이버/구글/이메일 로그인 모두 정상
- 거래 추가/수정/삭제, 영수증 OCR
- 더치페이 계산기, PDF 출력
- 팀 만들기/초대/QR
- 기존 사용자 로그인 시 데이터 정상 표시

### 8.4 보안 회귀
- 위조 identityToken 거부 확인
- 만료 토큰 거부 확인
- 다른 앱 aud 토큰 거부 확인

## 9. 빌드 및 재제출

### 9.1 버전 정책
- App Version: `1.0` 유지
- Build Number: `5` → `6`

### 9.2 EAS Build
```
eas build --platform ios --profile production
```
- 프로비저닝 프로파일 갱신 프롬프트는 모두 Yes
- 빌드 완료 후 TestFlight 자동 업로드(설정에 따라)

### 9.3 TestFlight 실기기 검증
- 실 iPhone, iPad에서 Apple 로그인·iPad 스크롤 모두 확인

### 9.4 App Store Connect 재제출
- 빌드 1.0(6) 선택
- Resolution Center에 영문 답변 메시지 업로드 (4.8 + 4 Design 두 건 해결 명시)
- "Submit for Review"

## 10. 마일스톤 및 일정

| 마일스톤 | 책임 | 예상 |
|---|---|---|
| 백엔드 Apple OAuth 구현 | Claude | 0.5일 |
| 반응형 토큰/ScreenContainer | Claude | 0.5일 |
| 컴포넌트 마이그레이션 | Claude | 1일 |
| 모든 화면 ScreenContainer 적용 | Claude | 0.5일 |
| 로컬 시뮬레이터 테스트 | 사용자+Claude | 0.5일 |
| EAS Build + TestFlight | 사용자 | 0.5일 |
| 실기기 회귀 테스트 | 사용자 | 0.5일 |
| 재제출 및 심사 대기 | Apple | 1~2일 |
| **합계** | | **5~7일** |

## 11. 롤백 전략

- Apple OAuth는 신규 라우트/신규 enum 값만 사용 → 기존 사용자에 영향 0
- 반응형 디자인은 토큰 추가 + ScreenContainer 도입 → 기존 컴포넌트 API 동일
- 문제 발생 시 git revert로 즉시 이전 상태 복구 가능
- DB 마이그레이션 없음(User 모델은 추가 enum 값만)

## 12. 참고 문서

- [Apple Sign-In REST API](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api)
- [App Store Review Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/#4.8)
- [App Store Review Guideline 4](https://developer.apple.com/app-store/review/guidelines/#design)
- [App Store Review Guideline 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/#5.1.1)
- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
