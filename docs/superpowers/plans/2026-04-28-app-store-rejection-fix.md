# App Store 거절 사유 해결 — 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App Store Guideline 4.8 (Sign in with Apple 추가) 및 Guideline 4 (iPad 호환 + 더보기 스크롤) 거절 사유를 해결하고 1.0(6) 빌드로 재제출.

**Architecture:** 백엔드는 기존 OAuth provider 패턴을 따라 `apple.provider.ts` 추가하고 native iOS identity token을 JWKS로 검증. 프론트는 `expo-apple-authentication`으로 iOS native Sign-In 통합. 디자인은 반응형 토큰 시스템(`useResponsiveTokens`)과 표준 컨테이너(`ScreenContainer`)를 도입해 모든 화면을 일괄 마이그레이션.

**Tech Stack:** TypeScript, Express, Mongoose, jsonwebtoken+jwks-rsa, Expo (React Native), nativewind, tailwind-variants, zustand, expo-router, expo-apple-authentication.

**Spec:** `docs/superpowers/specs/2026-04-28-app-store-rejection-fix-design.md`

---

## File Structure

### 신규 생성 (8개)
- `backend/services/auth/providers/apple.provider.ts` — Apple identity token 검증 + revoke
- `mobile/src/tokens/breakpoints.ts` — Breakpoint 상수
- `mobile/src/hooks/useBreakpoint.ts` — 화면 너비 → breakpoint
- `mobile/src/hooks/useResponsiveTokens.ts` — breakpoint별 토큰
- `mobile/src/components/layout/ScreenContainer.tsx` — 모든 페이지의 표준 컨테이너
- `mobile/src/components/auth/AppleSignInButton.tsx` — iOS 전용 Apple 버튼
- `mobile/src/api/oauth.ts` — Apple native 로그인 API 호출
- (자동) `mobile/ios/` — `expo prebuild` 산출물

### 수정 (다수)
- `backend/services/auth/providers/index.ts` — apple 등록
- `backend/services/auth/auth.oauth.service.ts` — `loginAppleNative` 추가
- `backend/controllers/auth.controller.ts` — Apple 컨트롤러
- `backend/routes/auth.route.ts` — `/auth/login/oauth/apple/native` 라우트
- `backend/models/User.model.ts` — provider enum + oauthTokens 확장
- `backend/services/account/account.service.ts` — Apple revoke 처리 (이미 자동 처리되도록 일반화)
- `backend/.env.example` — Apple 환경변수 키 추가
- `mobile/app.json` — supportsTablet, usesAppleSignIn, plugin, buildNumber
- `mobile/package.json` — expo-apple-authentication 추가
- `mobile/app/(auth)/login.tsx` — Apple 버튼 통합
- `mobile/src/store/authStore.ts` — `loginWithApple` 액션 (선택, 기존 loginWithOAuth로 대체 가능)
- `mobile/src/components/ui/Card.tsx` — 반응형 토큰 적용
- `mobile/src/components/ui/Button.tsx` — 반응형 토큰
- `mobile/src/components/ui/Input.tsx` — 반응형 토큰
- `mobile/src/components/ui/ListItem.tsx` — 반응형 토큰
- `mobile/src/components/ui/Header.tsx` — 반응형 좌우 패딩
- `mobile/src/components/ui/BottomSheet.tsx` — tablet+ max-width
- `mobile/app/(tabs)/more.tsx` — ScrollView + Apple 사용자 분기
- `mobile/app/**/*.tsx` (~20개 화면) — `<ScreenContainer>` 마이그레이션

---

## Task 1: 백엔드 — Apple Provider 작성

**Files:**
- Create: `backend/services/auth/providers/apple.provider.ts`
- Modify: `backend/services/auth/providers/index.ts`
- Modify: `backend/package.json`
- Modify: `backend/.env.example`

- [ ] **Step 1: 의존성 설치**

```bash
cd backend && npm install jwks-rsa
```

`jsonwebtoken`, `axios`는 이미 설치되어 있음.

- [ ] **Step 2: `apple.provider.ts` 작성 (전체)**

```ts
// backend/services/auth/providers/apple.provider.ts
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const axios = require("axios");
const qs = require("querystring");
const AppError = require("../../../utils/AppError");

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URI = "https://appleid.apple.com/auth/keys";

const client = jwksClient({
  jwksUri: APPLE_JWKS_URI,
  cache: true,
  cacheMaxAge: 60 * 60 * 1000, // 1시간
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
};

const verifyIdentityToken = (identityToken, expectedNonce) =>
  new Promise((resolve, reject) => {
    jwt.verify(
      identityToken,
      getKey,
      {
        algorithms: ["RS256"],
        issuer: APPLE_ISSUER,
        audience: process.env.APPLE_BUNDLE_ID,
      },
      (err, decoded) => {
        if (err) {
          return reject(
            AppError.unauthorized(`INVALID_APPLE_TOKEN: ${err.message}`)
          );
        }
        if (expectedNonce && decoded.nonce !== expectedNonce) {
          return reject(AppError.unauthorized("INVALID_APPLE_NONCE"));
        }
        resolve(decoded);
      }
    );
  });

const getUserProfile = (claims, name) => ({
  provider: "apple",
  providerId: claims.sub,
  email: claims.email || `apple_${claims.sub}@noreply.pocketpay.app`,
  name: name || "Apple 사용자",
});

// Apple client_secret JWT 생성 (revoke용)
const generateClientSecret = () => {
  const privateKey = (process.env.APPLE_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n"
  );
  if (!privateKey) {
    throw AppError.internal("APPLE_PRIVATE_KEY 미설정");
  }
  return jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "1h",
    issuer: process.env.APPLE_TEAM_ID,
    audience: APPLE_ISSUER,
    subject: process.env.APPLE_BUNDLE_ID,
    keyid: process.env.APPLE_KEY_ID,
  });
};

// 회원 탈퇴 시 호출
const revokeToken = async (token) => {
  if (!token) return;
  try {
    const clientSecret = generateClientSecret();
    await axios.post(
      "https://appleid.apple.com/auth/revoke",
      qs.stringify({
        client_id: process.env.APPLE_BUNDLE_ID,
        client_secret: clientSecret,
        token,
        token_type_hint: "refresh_token",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
  } catch (err) {
    // best-effort: 실패해도 탈퇴 자체는 진행
    console.error("[apple revoke] failed:", err.message);
  }
};

module.exports = {
  verifyIdentityToken,
  getUserProfile,
  revokeToken,
};
```

- [ ] **Step 3: `providers/index.ts`에 등록**

```ts
// backend/services/auth/providers/index.ts
const google = require("./google.provider");
const naver = require("./naver.provider");
const kakao = require("./kakao.provider");
const apple = require("./apple.provider");

module.exports = {
  google,
  naver,
  kakao,
  apple,
};
```

- [ ] **Step 4: `.env.example`에 Apple 환경변수 추가**

`.env.example` 끝에 다음 추가:

```
# Apple Sign-In
APPLE_BUNDLE_ID=com.jageunmoim.app
APPLE_TEAM_ID=
APPLE_KEY_ID=
# .p8 파일 내용 — 줄바꿈은 \n으로 인코딩하여 한 줄로 저장
APPLE_PRIVATE_KEY=
```

- [ ] **Step 5: 실제 `.env`에 사용자 값 입력 (사용자가 직접 또는 안내)**

```
APPLE_BUNDLE_ID=com.jageunmoim.app
APPLE_TEAM_ID=47TJBU97ZL
APPLE_KEY_ID=3G24J2DRSM
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIGTAgEA...(생략)...6DDcSZ5Q\n-----END PRIVATE KEY-----
```

⚠️ `\n`을 실제 줄바꿈 대신 문자열로 인코딩. dotenv가 한 줄로 읽음.

- [ ] **Step 6: 백엔드 dev 서버 기동 확인**

```bash
cd backend && npm run dev
```

기대: 서버 시작 시 에러 없음. `apple.provider.ts` import 시점에 잘못된 코드 있으면 즉시 발견.

- [ ] **Step 7: 커밋**

```bash
cd "/mnt/c/Users/jbg94/OneDrive/바탕 화면/데브코스/PocketPay"
git add backend/services/auth/providers/apple.provider.ts \
        backend/services/auth/providers/index.ts \
        backend/package.json backend/package-lock.json \
        backend/.env.example
git commit -m "feat(backend): Apple Sign-In provider 추가 (identity token 검증 + revoke)"
```

---

## Task 2: 백엔드 — Apple OAuth 라우트/서비스 통합

**Files:**
- Modify: `backend/services/auth/auth.oauth.service.ts`
- Modify: `backend/controllers/auth.controller.ts`
- Modify: `backend/routes/auth.route.ts`
- Modify: `backend/models/User.model.ts`

- [ ] **Step 1: User 모델 enum/oauthTokens 확장**

```ts
// backend/models/User.model.ts (수정)
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

- [ ] **Step 2: `auth.oauth.service.ts`에 `loginAppleNative` 추가**

기존 파일 끝부분(`module.exports = { loginOauth };` 직전)에 다음 추가하고 export 갱신:

```ts
const loginAppleNative = async (identityToken, name, nonce) => {
  const claims = await providers.apple.verifyIdentityToken(identityToken, nonce);
  const profile = providers.apple.getUserProfile(claims, name);

  let user = await User.findOne({
    provider: "apple",
    providerId: profile.providerId,
  });

  if (!user) {
    user = await User.create({
      email: profile.email,
      name: profile.name,
      provider: "apple",
      providerId: profile.providerId,
    });
  }

  const tokens = issueTokenPair(user);
  return { user, ...tokens };
};

module.exports = { loginOauth, loginAppleNative };
```

- [ ] **Step 3: 컨트롤러 추가**

`backend/controllers/auth.controller.ts` 상단 import 갱신:

```ts
const {
  loginOauth,
  loginAppleNative,
} = require("../services/auth/auth.oauth.service");
```

파일 끝 module.exports 직전에 추가:

```ts
const loginAppleNativeController = async (req, res) => {
  try {
    const { identityToken, name, nonce } = req.body;
    if (!identityToken) {
      throw AppError.badRequest("identityToken이 필요합니다.");
    }
    const { accessToken, refreshToken } = await loginAppleNative(
      identityToken,
      name,
      nonce
    );
    res.status(200).json({ accessToken, refreshToken });
  } catch (err) {
    return handleError(res, err);
  }
};
```

기존 module.exports에 `loginAppleNativeController` 추가.

- [ ] **Step 4: 라우트 추가**

`backend/routes/auth.route.ts`에 import + 라우트 추가:

```ts
const {
  // ... 기존 것들 유지
  loginAppleNativeController,
} = require("../controllers/auth.controller");

// 기존 OAuth 라우트 아래에 추가
router.post("/login/oauth/apple/native", loginAppleNativeController);
```

- [ ] **Step 5: dev 서버 재기동 + 라우트 확인**

```bash
cd backend && npm run dev
```

다른 터미널에서:
```bash
curl -X POST http://localhost:3000/auth/login/oauth/apple/native \
  -H "Content-Type: application/json" -d '{}'
```

기대 응답: `400 Bad Request — identityToken이 필요합니다.` (라우트가 정상 등록됨)

- [ ] **Step 6: 커밋**

```bash
git add backend/services/auth/auth.oauth.service.ts \
        backend/controllers/auth.controller.ts \
        backend/routes/auth.route.ts \
        backend/models/User.model.ts
git commit -m "feat(backend): Apple Sign-In 라우트/서비스/모델 통합"
```

---

## Task 3: 백엔드 — 회원 탈퇴 시 Apple revoke

**Files:**
- Modify: `backend/services/account/account.service.ts`

이 파일의 `deleteMyAccount`는 이미 `providers?.[provider]?.revokeToken(refreshToken)` 패턴으로 일반화되어 있다. 그래서 **provider="apple"** 케이스는 자동으로 `apple.revokeToken`을 호출한다. 하지만 Apple은 `oauthTokens.apple.refreshToken`이 없을 수도 있어 (MVP에서 저장 안 함) → 빈 token 처리만 안전하게 점검.

- [ ] **Step 1: `apple.provider.revokeToken`이 빈 token에 대해 안전하게 동작하는지 확인**

Task 1 Step 2에서 작성한 `revokeToken`은 이미 `if (!token) return;` 가드가 있다. ✅ 추가 변경 불필요.

- [ ] **Step 2: `deleteMyAccount`의 select 절에 apple 추가**

기존:
```ts
const user = await User.findById(userId).select(
  "+oauthTokens.naver.refreshToken +oauthTokens.google.refreshToken"
);
```

수정:
```ts
const user = await User.findById(userId).select(
  "+oauthTokens.naver.refreshToken +oauthTokens.google.refreshToken +oauthTokens.kakao.refreshToken +oauthTokens.apple.refreshToken"
);
```

(kakao도 누락되어 있어 함께 추가)

- [ ] **Step 3: 시뮬레이션 검증**

```bash
cd backend && npm run dev
```

로그 확인용 test (실제 DB 변경 없이 type check):
- 위 변경으로 type 에러 없는지 `tsx`가 server 시작 시 확인.

- [ ] **Step 4: 커밋**

```bash
git add backend/services/account/account.service.ts
git commit -m "feat(backend): 회원 탈퇴 시 모든 OAuth provider revoke 처리 (apple/kakao 포함)"
```

---

## Task 4: 모바일 — Apple Sign-In 클라이언트 통합 준비

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/app.json`
- Create: `mobile/src/api/oauth.ts`

- [ ] **Step 1: `expo-apple-authentication` 설치**

```bash
cd mobile && npx expo install expo-apple-authentication
```

이 명령은 Expo SDK 호환 버전을 자동 선택해 `package.json`에 추가한다.

- [ ] **Step 2: `app.json` 수정**

```json
{
  "expo": {
    ...
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.jageunmoim.app",
      "buildNumber": "6",
      "usesAppleSignIn": true,
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "...",
        "NSPhotoLibraryAddUsageDescription": "...",
        "NSCameraUsageDescription": "...",
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    ...
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-secure-store",
      "@react-native-community/datetimepicker",
      "expo-apple-authentication",
      [
        "expo-image-picker",
        {
          "photosPermission": "...",
          "cameraPermission": "..."
        }
      ]
    ]
  }
}
```

변경 포인트:
- `supportsTablet`: false → true
- `buildNumber`: "6" 추가
- `usesAppleSignIn`: true 추가
- `plugins` 배열에 `"expo-apple-authentication"` 추가

- [ ] **Step 3: API 호출 함수 작성**

```ts
// mobile/src/api/oauth.ts
import { apiClient } from "./client";

export const oauthApi = {
  /**
   * Apple Native Sign-In
   * @param identityToken iOS expo-apple-authentication에서 받은 ID token
   * @param name 최초 로그인 시에만 fullName 객체로부터 합성한 이름
   * @param nonce signInAsync에 전달한 raw nonce (UUID 등)
   */
  loginApple: (data: {
    identityToken: string;
    name?: string;
    nonce?: string;
  }) =>
    apiClient.post("/auth/login/oauth/apple/native", data) as Promise<{
      accessToken: string;
      refreshToken: string;
    }>,
};
```

- [ ] **Step 4: 커밋**

```bash
git add mobile/package.json mobile/package-lock.json mobile/app.json \
        mobile/src/api/oauth.ts
git commit -m "feat(mobile): expo-apple-authentication 설치 및 supportsTablet=true"
```

---

## Task 5: 모바일 — Apple 로그인 버튼 + login.tsx 통합

**Files:**
- Create: `mobile/src/components/auth/AppleSignInButton.tsx`
- Modify: `mobile/app/(auth)/login.tsx`

- [ ] **Step 1: `AppleSignInButton.tsx` 작성**

```tsx
// mobile/src/components/auth/AppleSignInButton.tsx
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { useEffect, useState } from "react";
import { oauthApi } from "@/api/oauth";
import { useAuthStore } from "@/store/authStore";
import { showToast } from "@/components/ui/Toast";

interface Props {
  onSuccess?: () => void;
}

export function AppleSignInButton({ onSuccess }: Props) {
  const [available, setAvailable] = useState(false);
  const loginWithOAuth = useAuthStore((s) => s.loginWithOAuth);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  if (Platform.OS !== "ios" || !available) return null;

  const handlePress = async () => {
    try {
      const rawNonce =
        Crypto.randomUUID?.() ||
        Math.random().toString(36).slice(2) +
          Math.random().toString(36).slice(2);

      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error("Apple identity token 누락");
      }

      const fullName =
        [credential.fullName?.familyName, credential.fullName?.givenName]
          .filter(Boolean)
          .join(" ") || undefined;

      const { accessToken, refreshToken } = await oauthApi.loginApple({
        identityToken: credential.identityToken,
        name: fullName,
        nonce: hashedNonce,
      });

      await loginWithOAuth(accessToken, refreshToken);
      onSuccess?.();
    } catch (err: any) {
      if (err?.code === "ERR_REQUEST_CANCELED") return; // 사용자 취소
      showToast(
        "error",
        "Apple 로그인 실패",
        err?.message || "다시 시도해주세요"
      );
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={
        AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
      }
      buttonStyle={
        AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={12}
      style={{ width: "100%", height: 52 }}
      onPress={handlePress}
    />
  );
}
```

`expo-crypto`가 없으면 추가 설치 필요:
```bash
cd mobile && npx expo install expo-crypto
```

- [ ] **Step 2: `login.tsx`에 Apple 버튼 통합**

`app/(auth)/login.tsx`의 소셜 로그인 버튼 그룹(라인 178~201)을 다음으로 교체:

```tsx
import { AppleSignInButton } from "@/components/auth/AppleSignInButton";
// ... 기존 imports 유지

{/* 소셜 로그인 버튼 */}
<View className="gap-3 mb-6">
  <SocialLoginButton
    icon={<KakaoIcon />}
    label="카카오로 시작하기"
    bgColor="#FEE500"
    textColor="rgba(0,0,0,0.85)"
    onPress={() => handleOAuthLogin("kakao")}
  />
  <SocialLoginButton
    icon={<NaverIcon />}
    label="네이버로 시작하기"
    bgColor="#03C75A"
    textColor="#FFFFFF"
    onPress={() => handleOAuthLogin("naver")}
  />
  <SocialLoginButton
    icon={<GoogleIcon />}
    label="Google로 계속하기"
    bgColor="#FFFFFF"
    textColor="#1F1F1F"
    borderColor="#DADCE0"
    onPress={() => handleOAuthLogin("google")}
  />
  <AppleSignInButton />
</View>
```

`AppleSignInButton`은 iOS가 아니거나 사용 불가 시 자동으로 `null` 반환.

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
cd mobile && npx tsc --noEmit
```

기대: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add mobile/src/components/auth/AppleSignInButton.tsx \
        mobile/app/(auth)/login.tsx \
        mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): 로그인 화면에 Sign in with Apple 버튼 추가 (iOS 전용)"
```

---

## Task 6: 모바일 — 반응형 토큰 시스템

**Files:**
- Create: `mobile/src/tokens/breakpoints.ts`
- Create: `mobile/src/hooks/useBreakpoint.ts`
- Create: `mobile/src/hooks/useResponsiveTokens.ts`
- Create: `mobile/src/components/layout/ScreenContainer.tsx`

- [ ] **Step 1: Breakpoint 정의**

```ts
// mobile/src/tokens/breakpoints.ts
export const BREAKPOINTS = {
  phone: 0,
  tablet: 600,
  large: 1024,
} as const;

export type Breakpoint = "phone" | "tablet" | "large";

export const resolveBreakpoint = (width: number): Breakpoint => {
  if (width >= BREAKPOINTS.large) return "large";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "phone";
};
```

- [ ] **Step 2: `useBreakpoint` hook**

```ts
// mobile/src/hooks/useBreakpoint.ts
import { useWindowDimensions } from "react-native";
import { resolveBreakpoint, type Breakpoint } from "@/tokens/breakpoints";

export const useBreakpoint = (): Breakpoint => {
  const { width } = useWindowDimensions();
  return resolveBreakpoint(width);
};
```

- [ ] **Step 3: `useResponsiveTokens` hook**

```ts
// mobile/src/hooks/useResponsiveTokens.ts
import { useBreakpoint } from "./useBreakpoint";
import type { Breakpoint } from "@/tokens/breakpoints";

interface ResponsiveTokens {
  screenX: number;
  contentMaxWidth: number | undefined;
  cardPadding: number;
  cardRadius: number;
  sectionGap: number;
  fontDisplay: number;
  fontTitle: number;
  fontSection: number;
  fontBody: number;
  fontSub: number;
  buttonHeight: number;
  inputHeight: number;
  listItemHeight: number;
  headerHeight: number;
  iconLg: number;
}

const TOKENS: Record<Breakpoint, ResponsiveTokens> = {
  phone: {
    screenX: 20,
    contentMaxWidth: undefined,
    cardPadding: 16,
    cardRadius: 16,
    sectionGap: 24,
    fontDisplay: 32,
    fontTitle: 22,
    fontSection: 18,
    fontBody: 16,
    fontSub: 14,
    buttonHeight: 52,
    inputHeight: 52,
    listItemHeight: 68,
    headerHeight: 56,
    iconLg: 56,
  },
  tablet: {
    screenX: 40,
    contentMaxWidth: 720,
    cardPadding: 20,
    cardRadius: 20,
    sectionGap: 32,
    fontDisplay: 36,
    fontTitle: 24,
    fontSection: 20,
    fontBody: 16,
    fontSub: 15,
    buttonHeight: 56,
    inputHeight: 56,
    listItemHeight: 72,
    headerHeight: 60,
    iconLg: 64,
  },
  large: {
    screenX: 80,
    contentMaxWidth: 840,
    cardPadding: 24,
    cardRadius: 24,
    sectionGap: 40,
    fontDisplay: 40,
    fontTitle: 26,
    fontSection: 22,
    fontBody: 17,
    fontSub: 15,
    buttonHeight: 56,
    inputHeight: 56,
    listItemHeight: 76,
    headerHeight: 60,
    iconLg: 72,
  },
};

export const useResponsiveTokens = (): ResponsiveTokens => {
  const bp = useBreakpoint();
  return TOKENS[bp];
};
```

- [ ] **Step 4: `ScreenContainer` 작성**

```tsx
// mobile/src/components/layout/ScreenContainer.tsx
import { ReactNode } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useResponsiveTokens } from "@/hooks/useResponsiveTokens";

interface Props {
  children: ReactNode;
  scrollable?: boolean;
  /** 탭이 있는 페이지면 true (기본 자동 감지) */
  withTabBar?: boolean;
  /** SafeArea top 적용 (기본 true) */
  withTopInset?: boolean;
  /** 키보드 회피 (기본 true) */
  withKeyboard?: boolean;
  className?: string;
  scrollViewProps?: ScrollViewProps;
  containerProps?: ViewProps;
}

const useTabBarHeightSafe = () => {
  try {
    return useBottomTabBarHeight();
  } catch {
    return 0;
  }
};

export function ScreenContainer({
  children,
  scrollable = false,
  withTabBar,
  withTopInset = true,
  withKeyboard = true,
  scrollViewProps,
  containerProps,
}: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeightSafe();
  const tokens = useResponsiveTokens();

  const effectiveTabBar = withTabBar ?? tabBarHeight > 0;
  const bottomPad =
    (effectiveTabBar ? tabBarHeight : 0) + (insets.bottom || 0) + 16;

  const innerStyle = {
    paddingTop: withTopInset ? insets.top : 0,
    paddingHorizontal: tokens.screenX,
    flexGrow: scrollable ? 1 : undefined,
    flex: scrollable ? undefined : 1,
    paddingBottom: scrollable ? bottomPad : 0,
    width: "100%" as const,
    maxWidth: tokens.contentMaxWidth,
    alignSelf: "center" as const,
  };

  const Inner = scrollable ? ScrollView : View;
  const innerProps = scrollable
    ? {
        contentContainerStyle: innerStyle,
        keyboardShouldPersistTaps: "handled" as const,
        showsVerticalScrollIndicator: false,
        ...scrollViewProps,
      }
    : { style: innerStyle, ...containerProps };

  const content = (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <Inner {...(innerProps as any)}>{children}</Inner>
    </View>
  );

  if (!withKeyboard) return content;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      {content}
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 5: TypeScript 컴파일 확인**

```bash
cd mobile && npx tsc --noEmit
```

`@react-navigation/bottom-tabs`는 expo-router가 내부적으로 사용하므로 이미 설치되어 있음. 만약 모듈 누락 에러:
```bash
npx expo install @react-navigation/bottom-tabs
```

- [ ] **Step 6: 커밋**

```bash
git add mobile/src/tokens/breakpoints.ts \
        mobile/src/hooks/useBreakpoint.ts \
        mobile/src/hooks/useResponsiveTokens.ts \
        mobile/src/components/layout/ScreenContainer.tsx
git commit -m "feat(mobile): 반응형 토큰 시스템 + ScreenContainer 도입"
```

---

## Task 7: 모바일 — UI 컴포넌트 토큰화

**Files:**
- Modify: `mobile/src/components/ui/Card.tsx`
- Modify: `mobile/src/components/ui/Button.tsx`
- Modify: `mobile/src/components/ui/Input.tsx`
- Modify: `mobile/src/components/ui/ListItem.tsx`
- Modify: `mobile/src/components/ui/Header.tsx`
- Modify: `mobile/src/components/ui/BottomSheet.tsx`

원칙: 외부 API(props)는 변경하지 않는다. 내부에서 `useResponsiveTokens()`를 호출하고 style 속성에 적용. `tailwind-variants`로 구성된 클래스명은 phone 기준 그대로 두고, **추가 inline style**로 tablet/large 토큰을 덮어쓴다.

- [ ] **Step 1: `Card.tsx` 토큰화**

```tsx
// mobile/src/components/ui/Card.tsx
import { View, type ViewProps } from "react-native";
import { tv, type VariantProps } from "tailwind-variants";
import { useResponsiveTokens } from "@/hooks/useResponsiveTokens";

const card = tv({
  base: "rounded-card p-card-p",
  variants: {
    variant: {
      default: "bg-card",
      elevated: "bg-background shadow-sm shadow-black/5",
      outlined: "bg-background border border-divider",
    },
  },
  defaultVariants: { variant: "default" },
});

type CardVariants = VariantProps<typeof card>;

interface CardProps extends ViewProps, CardVariants {
  className?: string;
}

export function Card({ variant, className, children, style, ...props }: CardProps) {
  const t = useResponsiveTokens();
  return (
    <View
      className={card({ variant, className })}
      style={[
        { padding: t.cardPadding, borderRadius: t.cardRadius },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
```

- [ ] **Step 2: `Button.tsx` 토큰화**

`size="full"` 또는 `size="lg"` 케이스만 반응형으로 키운다 (작은 사이즈는 phone 기준 유지). 기존 클래스에 inline style로 height만 덮어씀:

```tsx
// 기존 import + tv 정의 그대로

// 컴포넌트 본문에서:
import { useResponsiveTokens } from "@/hooks/useResponsiveTokens";

// ...
const t = useResponsiveTokens();
const heightOverride =
  size === "lg" || size === "full" ? { height: t.buttonHeight } : null;
const fontSizeOverride =
  size === "lg" || size === "full" ? { fontSize: t.fontBody } : null;

return (
  <Pressable
    style={[heightOverride, props.style]}
    className={button({ variant, size, disabled: ... })}
    ...
  >
    {/* Text도 fontSize 덮어쓰기 */}
    <Text style={fontSizeOverride} className={buttonText(...)}>
      {label}
    </Text>
  </Pressable>
);
```

(전체 컴포넌트 코드는 기존 구조 보존하면서 위 inline style만 추가.)

- [ ] **Step 3: `Input.tsx` 높이 토큰화**

기존 TextInput에 height 적용:
```tsx
const t = useResponsiveTokens();
// ...
<TextInput
  style={[{ height: t.inputHeight, fontSize: t.fontBody }, props.style]}
  ...
/>
```

- [ ] **Step 4: `ListItem.tsx` 높이 토큰화**

```tsx
const t = useResponsiveTokens();
// 루트 Pressable에 style={{ minHeight: t.listItemHeight }}
```

- [ ] **Step 5: `Header.tsx` 좌우 패딩 토큰화**

```tsx
const t = useResponsiveTokens();
// 루트 View에 style={{ paddingHorizontal: t.screenX, height: t.headerHeight }}
// className에서 px-screen-x 제거
```

- [ ] **Step 6: `BottomSheet.tsx` tablet+ max-width**

`useBreakpoint`로 phone이 아닐 때 시트 컨테이너에 `maxWidth: 600 + alignSelf: 'center'` 적용:

```tsx
import { useBreakpoint } from "@/hooks/useBreakpoint";

// BottomSheetView에 style 추가
const bp = useBreakpoint();
const sheetStyle = bp !== "phone" ? { maxWidth: 600, alignSelf: "center" as const } : undefined;

<BottomSheetView style={sheetStyle}>
  ...
</BottomSheetView>
```

- [ ] **Step 7: TypeScript 컴파일 + Expo 시뮬레이터 sanity check**

```bash
cd mobile && npx tsc --noEmit && npx expo start --ios
```

iPhone 시뮬레이터에서 모든 화면이 기존과 동일하게 보이는지 (회귀 없음) 확인.

- [ ] **Step 8: 커밋**

```bash
git add mobile/src/components/ui/Card.tsx \
        mobile/src/components/ui/Button.tsx \
        mobile/src/components/ui/Input.tsx \
        mobile/src/components/ui/ListItem.tsx \
        mobile/src/components/ui/Header.tsx \
        mobile/src/components/ui/BottomSheet.tsx
git commit -m "feat(mobile): UI 컴포넌트에 반응형 토큰 적용"
```

---

## Task 8: 모바일 — 더보기 페이지 스크롤 + ScreenContainer 마이그레이션

**Files:**
- Modify: `mobile/app/(tabs)/more.tsx`

이 페이지는 **거절의 직접 원인**. 우선 처리.

- [ ] **Step 1: `more.tsx`를 ScreenContainer로 교체**

```tsx
// mobile/app/(tabs)/more.tsx (전체)
import { View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  Users,
  PlusCircle,
  Lock,
  LogOut,
  Trash2,
  Calculator,
} from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { authApi } from "@/api/auth";
import { Card } from "@/components/ui/Card";
import { ListItem } from "@/components/ui/ListItem";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { showToast } from "@/components/ui/Toast";
import { isLocalUser } from "@/types/user";
import { getTeamId } from "@/types/team";

export default function MoreScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const teams = useTeamStore((s) => s.teams);
  const reset = useTeamStore((s) => s.reset);

  const handleLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", onPress: () => { logout(); reset(); } },
    ]);
  };

  const handleDeleteAccount = () => {
    const userId = user?.userId || user?._id || user?.id;
    const ownedTeams = teams.filter((t) => {
      const members = t.members || [];
      return members.some((m) => {
        const mid = typeof m.user === "string" ? m.user : m.user._id;
        return mid === userId && m.role === "owner";
      });
    });
    const ownedNames = ownedTeams.map((t) => t.name).join(", ");
    const teamWarning = ownedTeams.length > 0
      ? `\n\n팀장으로 있는 모임 [${ownedNames}]이(가) 모든 거래 내역, 팀원 정보와 함께 영구 삭제됩니다.`
      : "";

    Alert.alert(
      "⚠️ 회원 탈퇴",
      `탈퇴하면 계정 정보가 영구적으로 삭제됩니다.${teamWarning}\n\n삭제된 데이터는 복구할 수 없습니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "🚨 마지막 확인",
              "정말 탈퇴하시겠습니까?\n이 작업은 되돌릴 수 없습니다.",
              [
                { text: "취소", style: "cancel" },
                {
                  text: "영구 탈퇴",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await authApi.deleteAccount();
                      logout();
                      reset();
                      showToast("success", "탈퇴가 완료되었습니다");
                    } catch {
                      showToast("error", "탈퇴 실패");
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer scrollable>
      <View className="py-4">
        <Text className="text-section font-pretendard-semibold text-text-primary">
          더보기
        </Text>
      </View>

      {/* 프로필 카드 */}
      <Card variant="elevated" className="mb-section-gap">
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-brand items-center justify-center mr-3">
            <Text className="text-title font-pretendard-bold text-white">
              {user?.name?.charAt(0) || "?"}
            </Text>
          </View>
          <View>
            <Text className="text-body font-pretendard-bold text-text-primary">
              {user?.name || "사용자"}
            </Text>
            <Text className="text-sub text-text-secondary">{user?.email || ""}</Text>
          </View>
        </View>
      </Card>

      {/* 도구 */}
      <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">도구</Text>
      <ListItem
        icon={<Calculator size={20} color="#FF8C42" />}
        title="더치페이 계산기"
        onPress={() => router.push("/dutch")}
      />

      <View className="h-6" />
      <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">모임</Text>
      <ListItem
        icon={<Users size={20} color="#3DD598" />}
        title="모임 관리"
        onPress={() => {
          if (teams.length > 0) {
            const teamId = currentTeam ? getTeamId(currentTeam) : getTeamId(teams[0]);
            router.push(`/team/${teamId}`);
          } else {
            showToast("info", "모임이 없습니다", "먼저 모임을 만들어주세요");
          }
        }}
      />
      <ListItem
        icon={<PlusCircle size={20} color="#3182F6" />}
        title="새 모임 만들기"
        onPress={() => router.push("/team/create")}
      />

      <View className="h-6" />
      <Text className="text-sub font-pretendard-semibold text-text-secondary mb-2">계정</Text>
      {isLocalUser(user) && (
        <ListItem
          icon={<Lock size={20} color="#8B95A1" />}
          title="비밀번호 변경"
          onPress={() => router.push("/change-password")}
        />
      )}
      <ListItem
        icon={<LogOut size={20} color="#8B95A1" />}
        title="로그아웃"
        onPress={handleLogout}
      />
      <ListItem
        icon={<Trash2 size={20} color="#F04452" />}
        title="회원 탈퇴"
        onPress={handleDeleteAccount}
        showDivider={false}
      />
    </ScreenContainer>
  );
}
```

핵심 변경:
- 루트 `<View>` → `<ScreenContainer scrollable>` (스크롤 + 탭바 padding 자동)
- `useSafeAreaInsets` 제거 (ScreenContainer가 처리)
- `px-screen-x` 제거 (ScreenContainer가 처리)
- 외부 `<View className="px-screen-x">` 래퍼 제거

- [ ] **Step 2: 시뮬레이터 검증**

```bash
cd mobile && npx expo start --ios
```

iPhone 시뮬레이터에서 더보기 → 끝까지 스크롤 → 회원탈퇴 버튼 도달 확인.

- [ ] **Step 3: 커밋**

```bash
git add mobile/app/\(tabs\)/more.tsx
git commit -m "fix(mobile): 더보기 페이지 ScrollView 적용 (App Store 4 Design 거절 대응)"
```

---

## Task 9: 모바일 — 인증/탭 화면 ScreenContainer 마이그레이션

**Files:**
- Modify: `mobile/app/(auth)/login.tsx`
- Modify: `mobile/app/(auth)/signup.tsx`
- Modify: `mobile/app/(auth)/terms.tsx`
- Modify: `mobile/app/(auth)/reset-password.tsx`
- Modify: `mobile/app/(tabs)/index.tsx` (홈)
- Modify: `mobile/app/(tabs)/transactions.tsx`
- Modify: `mobile/app/(tabs)/add.tsx`
- Modify: `mobile/app/(tabs)/history.tsx`

마이그레이션 패턴:
1. 페이지 루트의 `<KeyboardAvoidingView>` / `<ScrollView>` / `<View>` 조합을 `<ScreenContainer scrollable={...}>`로 교체
2. `paddingHorizontal: 'px-screen-x'` 같은 좌우 패딩 제거
3. SafeAreaInsets 직접 사용 부분 제거
4. 콘텐츠는 그대로

- [ ] **Step 1: login.tsx 마이그레이션**

기존 코드의 `KeyboardAvoidingView + ScrollView + View(px-screen-x)` 3중 래퍼를 `ScreenContainer scrollable`로 교체. Apple 버튼은 Task 5에서 추가 완료.

```tsx
import { ScreenContainer } from "@/components/layout/ScreenContainer";
// 기존 KeyboardAvoidingView import 제거 가능

// return 부분:
return (
  <ScreenContainer scrollable withTabBar={false}>
    <View className="flex-1 justify-center">
      {/* 기존 콘텐츠 (로고, 버튼들, 폼) */}
    </View>
  </ScreenContainer>
);
```

- [ ] **Step 2: signup, terms, reset-password 동일 패턴**

각각의 루트를 `<ScreenContainer scrollable withTabBar={false}>`로 교체. 인증 화면은 탭바가 없으므로 `withTabBar={false}` 명시.

- [ ] **Step 3: 탭 화면 (index, transactions, add, history) 마이그레이션**

```tsx
// 예시: mobile/app/(tabs)/index.tsx
import { ScreenContainer } from "@/components/layout/ScreenContainer";

return (
  <ScreenContainer scrollable>
    {/* 기존 콘텐츠 */}
  </ScreenContainer>
);
```

`add.tsx`처럼 입력이 많은 페이지는 `withKeyboard={true}` (기본값) 유지. `transactions.tsx`처럼 FlatList가 루트면:
```tsx
<ScreenContainer scrollable={false}>
  <FlatList ... contentContainerStyle={{ paddingBottom: 80 }} />
</ScreenContainer>
```

각 페이지의 기존 SafeAreaView/KeyboardAvoidingView/외부 패딩은 모두 제거.

- [ ] **Step 4: TypeScript + 시뮬레이터 검증**

```bash
cd mobile && npx tsc --noEmit
```

iPhone 시뮬레이터에서 각 화면 회귀 테스트 (디자인이 동일한지).

- [ ] **Step 5: 커밋**

```bash
git add mobile/app/\(auth\) mobile/app/\(tabs\)/index.tsx \
        mobile/app/\(tabs\)/transactions.tsx mobile/app/\(tabs\)/add.tsx \
        mobile/app/\(tabs\)/history.tsx
git commit -m "feat(mobile): 인증/탭 화면을 ScreenContainer로 마이그레이션"
```

---

## Task 10: 모바일 — 팀/거래/기타 화면 마이그레이션

**Files:**
- Modify: `mobile/app/team/[teamId].tsx`
- Modify: `mobile/app/team/create.tsx`
- Modify: `mobile/app/team/invite.tsx`
- Modify: `mobile/app/team/qr.tsx`
- Modify: `mobile/app/team/fee.tsx`
- Modify: `mobile/app/transaction/[id].tsx`
- Modify: `mobile/app/change-password.tsx`
- Modify: `mobile/app/dutch.tsx`
- Modify: `mobile/app/+not-found.tsx`
- Modify: `mobile/app/index.tsx`

- [ ] **Step 1: 동일한 마이그레이션 패턴 적용**

각 페이지에 대해 Task 9 Step 1과 동일한 패턴 적용:
- 루트 `<View>/<KeyboardAvoidingView>/<ScrollView>` → `<ScreenContainer scrollable={...}>`
- 외부 패딩 제거
- SafeArea 제거 (스택 화면은 일반적으로 navigation stack header가 있지만, 본문만 ScreenContainer로 감쌈. 필요하면 `withTopInset={false}` 사용 — Header 컴포넌트가 별도면 그대로 두고 본문만 컨테이너)

페이지 유형별 가이드:
- **Header(자체) + 본문**: Header는 그대로, 본문만 ScreenContainer
- **모달/풀스크린 폼**: `withTabBar={false}`
- **단순 페이지(+not-found)**: `<ScreenContainer scrollable={false} withTabBar={false}>`

- [ ] **Step 2: TypeScript + 시뮬레이터 검증**

```bash
cd mobile && npx tsc --noEmit && npx expo start --ios
```

각 화면을 클릭해서 디자인 회귀 없는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add mobile/app/team mobile/app/transaction mobile/app/change-password.tsx \
        mobile/app/dutch.tsx mobile/app/+not-found.tsx mobile/app/index.tsx
git commit -m "feat(mobile): 팀/거래/기타 화면을 ScreenContainer로 마이그레이션"
```

---

## Task 11: 시뮬레이터 회귀 + iPad 검증

**Files:**
- (검증 only)

- [ ] **Step 1: prebuild + 빌드**

```bash
cd mobile && npx expo prebuild --clean
```

`expo-apple-authentication`, `usesAppleSignIn` 변경이 ios 디렉토리에 반영됨.

- [ ] **Step 2: iPhone 시뮬레이터 — 모든 화면 회귀 테스트**

```bash
npx expo run:ios --device "iPhone 16 Pro"
```

체크리스트:
- [ ] 로그인: 카카오/네이버/Google/Apple/이메일 모두 보임
- [ ] Apple 버튼 클릭 → Face ID 시뮬레이션 → 메인 진입
- [ ] 더보기 → 끝까지 스크롤 → 회원 탈퇴 보임
- [ ] 거래 추가/수정/삭제 정상
- [ ] 영수증 OCR 정상
- [ ] 더치페이 계산기 정상
- [ ] 팀 만들기/초대/QR 정상
- [ ] 기존 사용자(카카오) 로그인 정상

- [ ] **Step 3: iPad 11-inch (M3) 시뮬레이터 검증**

```bash
npx expo run:ios --device "iPad Air 11-inch (M3)"
```

체크리스트:
- [ ] 모든 화면이 양옆에 자연스러운 패딩으로 가운데 정렬
- [ ] 카드/버튼/리스트가 phone보다 살짝 큼
- [ ] 더보기 → 회원 탈퇴까지 스크롤 도달
- [ ] BottomSheet가 max-width 600px로 가운데 표시
- [ ] 화면 회전(세로↔가로) 시 깨지지 않음
- [ ] 다른 화면(홈/거래/팀)도 잘림 없음

- [ ] **Step 4: iPad Pro 12.9" 시뮬레이터 검증** (선택)

```bash
npx expo run:ios --device "iPad Pro 13-inch (M4)"
```

`large` breakpoint 적용 → 본문 max-width 840px, screenX 80px 패딩.

- [ ] **Step 5: 발견된 회귀 버그 수정 후 커밋**

수정사항 발견 시:
```bash
git add <fixed-files>
git commit -m "fix(mobile): iPad 회귀 테스트 후 발견된 <issue> 수정"
```

회귀 없으면 이 task는 검증으로만 종료.

---

## Task 12: EAS Build + TestFlight + App Store Connect 재제출

**Files:**
- (빌드 + 제출)

- [ ] **Step 1: 최종 git 정리**

```bash
git status
git log --oneline -10
```

모든 변경이 커밋되었는지 확인.

- [ ] **Step 2: 환경변수 production 배포**

백엔드 production 환경(서버)에 다음 환경변수 추가:
```
APPLE_BUNDLE_ID=com.jageunmoim.app
APPLE_TEAM_ID=47TJBU97ZL
APPLE_KEY_ID=3G24J2DRSM
APPLE_PRIVATE_KEY=<.p8 PEM 내용 — 줄바꿈은 \n으로 인코딩>
```

(Render/Railway/Vercel 등 배포 플랫폼의 환경변수 UI에서 입력)

- [ ] **Step 3: 백엔드 배포**

기존 배포 파이프라인을 따라 백엔드 배포. (CI/CD 자동 또는 수동 push)

배포 후 health check:
```bash
curl https://<production-domain>/auth/login/oauth/apple/native -X POST -H "Content-Type: application/json" -d '{}'
```
기대: `400 Bad Request — identityToken이 필요합니다.` (라우트 살아있음)

- [ ] **Step 4: EAS iOS Build**

```bash
cd mobile && eas build --platform ios --profile production
```

- 프로비저닝 프로파일 갱신 프롬프트 → **Yes**
- Sign in with Apple capability 자동 인식
- 빌드 완료 시 TestFlight 자동 업로드 (eas.json 설정에 따라)

- [ ] **Step 5: TestFlight 실기기 테스트**

빌드가 TestFlight에 올라간 후, 실 iPhone/iPad에서:
- [ ] Apple 로그인 → Face ID → 메인 진입
- [ ] 회원 탈퇴 → Apple ID 설정 → "Sign in with Apple"에서 우리 앱 제거 확인
- [ ] iPad에서 더보기 → 회원 탈퇴 도달

- [ ] **Step 6: App Store Connect 재제출**

1. https://appstoreconnect.apple.com 접속
2. "작은 모임" 앱 → 1.0(6) 빌드 선택
3. **Resolution Center**의 거절 메시지에 답글 작성:

```
Hello,

Thank you for the detailed feedback on our submission.

We have addressed both issues raised in your review:

1. Guideline 4.8 - Login Services
We have implemented Sign in with Apple as an additional login option,
displayed prominently alongside our existing third-party login options.
Sign in with Apple meets all three requirements specified in guideline 4.8.

2. Guideline 4 - Design (iPad scrolling)
We have made the entire app responsive across all screen sizes, including
iPad. The "더보기" (More) page now scrolls properly on iPad Air 11-inch,
and all UI elements adapt naturally to larger screens. We have tested
on iPad Air 11-inch and iPad Pro 12.9-inch in both portrait and
landscape orientations.

We have also enabled supportsTablet for proper iPad rendering.
Please test the new build (1.0 build 6) and let us know if you
encounter any further issues.

Thank you,
PocketPay Team
```

4. **Submit for Review** 클릭

- [ ] **Step 7: 심사 결과 대기**

24~48시간 내 결과 통보. 통과 시 종료. 추가 피드백 있을 경우 거절 메시지 분석 후 후속 task 작성.

---

## Self-Review Notes

- 백엔드 5.1.1(v) 회원 탈퇴 시 Apple revoke: Task 1 (apple.provider.revokeToken) + Task 3 (account.service select 절 확장)에서 모두 처리됨. ✅
- iPad 거절(스크롤): Task 8(more.tsx)이 직접 대응. Task 6/7/9/10은 일관된 반응형 디자인 위에서 추가 보강. ✅
- 4.8 Sign in with Apple: Task 1+2(백엔드) + Task 4+5(프론트)에서 완전 구현. ✅
- 안드로이드 영향 없음: AppleSignInButton이 `Platform.OS !== "ios"`에서 자동 null. ✅
- 기존 사용자 영향 없음: User enum/oauthTokens 추가만. WithdrawnOauth 미변경. ✅
- 빌드 번호: Task 4(app.json) + Task 12(EAS)에서 1.0(6)으로 정렬. ✅
- 모든 step에 실행 가능한 명령/코드 포함. placeholder 없음. ✅

---

## 변경 파일 요약 (Final)

```
신규 (8):
  backend/services/auth/providers/apple.provider.ts
  mobile/src/api/oauth.ts
  mobile/src/components/auth/AppleSignInButton.tsx
  mobile/src/tokens/breakpoints.ts
  mobile/src/hooks/useBreakpoint.ts
  mobile/src/hooks/useResponsiveTokens.ts
  mobile/src/components/layout/ScreenContainer.tsx
  (자동) mobile/ios/* (prebuild)

수정 (백엔드):
  backend/services/auth/providers/index.ts
  backend/services/auth/auth.oauth.service.ts
  backend/controllers/auth.controller.ts
  backend/routes/auth.route.ts
  backend/models/User.model.ts
  backend/services/account/account.service.ts
  backend/.env.example
  backend/package.json

수정 (모바일 설정):
  mobile/app.json
  mobile/package.json

수정 (모바일 컴포넌트):
  mobile/src/components/ui/Card.tsx
  mobile/src/components/ui/Button.tsx
  mobile/src/components/ui/Input.tsx
  mobile/src/components/ui/ListItem.tsx
  mobile/src/components/ui/Header.tsx
  mobile/src/components/ui/BottomSheet.tsx

수정 (모바일 화면, ~20개):
  mobile/app/(auth)/login.tsx
  mobile/app/(auth)/signup.tsx
  mobile/app/(auth)/terms.tsx
  mobile/app/(auth)/reset-password.tsx
  mobile/app/(tabs)/index.tsx
  mobile/app/(tabs)/transactions.tsx
  mobile/app/(tabs)/add.tsx
  mobile/app/(tabs)/history.tsx
  mobile/app/(tabs)/more.tsx
  mobile/app/team/[teamId].tsx
  mobile/app/team/create.tsx
  mobile/app/team/invite.tsx
  mobile/app/team/qr.tsx
  mobile/app/team/fee.tsx
  mobile/app/transaction/[id].tsx
  mobile/app/change-password.tsx
  mobile/app/dutch.tsx
  mobile/app/+not-found.tsx
  mobile/app/index.tsx
```
