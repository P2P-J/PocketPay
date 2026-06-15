<div align="center">

<img src="mobile/assets/icon.png" alt="PocketPay 앱 아이콘" width="120" height="120" style="border-radius:24px;" />
&nbsp;&nbsp;&nbsp;
<img src="mobile/assets/splash-icon.png" alt="PocketPay 스플래시" width="120" height="120" style="border-radius:24px;" />

# 💸 PocketPay <span style="font-size:18px;">(작은 모임)</span>

### **소모임 공금, 이제 투명하게.**

영수증 사진 한 장이면 거래가 자동 입력되고, 팀원 모두가 실시간으로 확인하는 **소모임 공금 관리 서비스**
<br/>웹사이트로 시작해 **iOS 앱으로 App Store 출시**까지 완료한 풀스택 프로젝트입니다.

<br/>

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-61DAFB?style=flat-square&logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![App Store](https://img.shields.io/badge/App_Store-출시-0D96F6?style=flat-square&logo=appstore&logoColor=white)

</div>

---

## 📌 한눈에 보기

| | |
| --- | --- |
| **서비스** | 동아리·스터디·회식 모임의 공금을 한 곳에서 관리하는 앱 |
| **플랫폼** | 📱 iOS 앱 (React Native) · 🖥️ 웹 (React) · ⚙️ 백엔드 API (Express) |
| **기간** | 2025.12 ~ 2026.05 (약 6개월) |
| **형태** | 웹 = 팀 프로젝트 · **모바일 앱 = 단독 개발** |
| **성과** | **App Store 정식 출시** ✅ |

---

## 💡 왜 PocketPay인가요?

모임 총무가 되면 시작되는 고민들 — 엑셀 정리, 카톡 공지, 영수증 보관.
PocketPay는 이 모든 과정을 하나의 서비스로 해결합니다.

| 기능 | 설명 |
| --- | --- |
| 🧾 **영수증 OCR** | 사진만 찍으면 거래처·금액·날짜가 자동 입력 |
| 👥 **팀 공유** | 팀원을 초대하면 모든 거래가 실시간 공유 |
| 📊 **대시보드** | 잔액·수입·지출을 한눈에 파악 |
| 🧮 **더치페이** | 정산 금액 계산 + 요청·공유 |
| 🔔 **푸시 알림** | 초대·더치페이·납부 알림 |
| 🔐 **소셜 로그인** | 구글·네이버·카카오·**Apple** 로그인 |

---

## 🛠️ 기술 스택

### 📱 Mobile (단독 개발)
| 기술 | 역할 |
| --- | --- |
| React Native 0.81 + Expo SDK 54 | 크로스플랫폼 앱 |
| expo-router | 파일 기반 라우팅 |
| Zustand | 전역 상태 관리 |
| NativeWind (Tailwind) | 스타일링 + 반응형 토큰 |
| Reanimated v4 + PagerView | 탭 스와이프·애니메이션 |
| Expo Notifications | 푸시 알림 |
| EAS Build | 빌드 & App Store 배포 |

### 🖥️ Web Frontend (팀)
| 기술 | 역할 |
| --- | --- |
| React 18 + Vite | UI + 빌드 |
| React Router v7 | 라우팅 (lazy loading) |
| Zustand | 상태 관리 |
| Tailwind CSS + shadcn/ui | 디자인 시스템 |

### ⚙️ Backend
| 기술 | 역할 |
| --- | --- |
| Express 5 | API 서버 |
| MongoDB + Mongoose | 데이터베이스 |
| JWT + bcrypt | 인증 + 암호화 |
| Zod | 입력 검증 |
| CLOVA OCR | 영수증 인식 |
| Cloudinary · Sentry · Railway | 이미지·모니터링·배포 |

---

## 🏗️ 아키텍처

<table>
<tr><th>Web Frontend — Feature-Sliced Design</th><th>Backend — 계층형 MVC</th></tr>
<tr><td valign="top">

```
src/
├── app/        # 라우터·프로바이더·초기화
├── entities/   # 비즈니스 엔티티
├── features/   # 기능 모듈
├── pages/      # 페이지 조합
├── shared/     # 공용 UI·API·유틸
└── widgets/    # 독립 UI 블록
```

</td><td valign="top">

```
backend/
├── controllers/ # 요청/응답 처리
├── services/    # 비즈니스 로직
├── models/      # MongoDB 스키마
├── middleware/  # JWT·Zod 검증
├── validators/  # 입력 스키마
└── routes/      # API 라우트
```

</td></tr>
</table>

---

## ⚡ 성능 최적화 (정량 성과)

> 모든 수치는 실제 커밋·코드에 근거합니다.

| 항목 | Before | After | 개선 |
| --- | --- | --- | --- |
| 팀 목록 조회 (N+1) | 11 쿼리 | **1 쿼리** (`$lookup`) | **91% ↓** |
| OCR 업로드 용량 | 5–8MB | **~300KB** | **약 95% ↓** |
| API 응답 크기 | 비압축 | **gzip 압축** | **70~80% ↓** |
| 중복 API 요청 | 7 회 | **1 회** | **86% ↓** |
| 월 재방문 렌더 | 매번 재요청 | **캐시 즉시 표시** | **네트워크 0회** |

---

## ✨ 주요 기능

### 🧾 영수증 OCR 자동 입력
CLOVA Document OCR + General OCR을 **병렬 호출**해 거래처명·금액·날짜·사업자번호를 추출. 업로드 전 클라이언트에서 이미지를 리사이즈해 전송 용량을 약 95% 절감.

### 👥 팀 기반 공금 관리
팀 생성 → 멤버 초대 → 거래 등록 흐름. Owner/Member 역할 구분, **handle(@아이디) 기반 초대 + 수락/거절 큐**, QR 코드 가입 지원.

### 🧮 더치페이 정산
정산 금액 계산기 + 요청(DutchRequest) 발송·정산·메모·공유. 계좌 자동 결정 로직 포함.

### 🔐 인증 / 보안
- 소셜 로그인: 구글 · 네이버 · 카카오 · **Apple Sign-In** (identity token 검증 + revoke)
- **OAuth 딥링크 PKCE 교환** 흐름 자체 구현
- Helmet · Rate Limiting · bcrypt · JWT · **Zod 입력 검증**
- Mass Assignment 방지(화이트리스트) · 파일 magic-byte 검증

---

## 👨‍💻 개발 기여 (커밋 분석 기반)

> PocketPay는 **웹사이트를 팀으로 시작**했고, 이후 **모바일 앱은 처음부터 끝까지 단독**으로 개발했습니다.
> 아래는 실제 git 커밋 이력을 분석해 영역별 기여를 정리한 것입니다.

| 영역 | 나의 기여 | 주요 협업 팀원 |
| --- | --- | --- |
| 📱 **iOS 모바일 앱** | **100% (단독)** · 커밋 95/95 | — |
| ⚙️ 백엔드 API | 약 66% (최다) · 커밋 61/92 | 인증/OAuth, OCR |
| 🖥️ 웹 프론트엔드 | 약 55% · 커밋 38/69 | UI 컴포넌트, 프로필 |

### 🙋 내가 한 것

**📱 모바일 앱 — 단독 개발** (화면 28개 + 컴포넌트 56개, +25,700줄)
> 홈 대시보드 · 거래/OCR 입력 · 팀 관리 · 더치페이 · 회비 · 푸시 알림 · Apple 로그인 · 4탭 스와이프 네비게이션 · 반응형 디자인 토큰 · 성능 최적화 · **EAS Build & App Store 출시** — 기획부터 배포까지 전 과정

**⚙️ 백엔드 — 주도**
> REST API 설계 · MongoDB **aggregate 성능 최적화(N+1 제거)** · 인덱스 설계 · Zod 입력 검증 · 보안 강화(helmet·rate limit·Mass Assignment 방어) · 더치페이/초대/푸시 API · Apple Sign-In & OAuth PKCE · JavaScript→TypeScript 전환

**🖥️ 웹 — 핵심 페이지 & 연동**
> 팀 메인 페이지 · 홈/랜딩 페이지 · 인증 모달 · `authStore`·`teamStore`(Zustand) 상태관리 설계 · 백엔드 API 연동(`api/client`) · 공통 컴포넌트화 · **FSD 아키텍처 & TypeScript 전환**

### 👥 팀원이 한 것

| 팀원 | 영역 | 담당 |
| --- | --- | --- |
| **nicephj95-crypto** | 🖥️ 웹 | 팀원 관리 모달 · 사이드바 통합 · 로그인 UI · SNS 로그인 화면 |
| **KimJeongChul** | ⚙️ 백엔드 | 인증/OAuth 서비스 · JWT 유틸 · 네이버 재가입 · 회원 탈퇴 |
| **tmakdrl** | ⚙️ 백엔드 | **OCR 모듈 구현** · deal 기능 · 일부 UI 컴포넌트 |
| **jaewooKim** | 🖥️ 웹 | 프로필 페이지 · 거래/팀 생성 모달 |
| **JeongChul** | 📄 문서 | Account/Auth API 문서화 |
| **lovejg** | 🔀 협업 | 브랜치 병합 · develop 관리 |

---

## 🚀 시작하기

### 요구사항
- Node.js 20+
- MongoDB

### 설치

```bash
git clone https://github.com/P2P-J/PocketPay.git
cd PocketPay
```

**백엔드**
```bash
cd backend
npm install
cp .env.example .env   # 환경변수 설정
npm start
```

**웹 프론트엔드**
```bash
cd frontend/Pocket-Pay
npm install
npm run dev
```

**모바일 앱**
```bash
cd mobile
npm install
npx expo start
```

> 환경변수는 각 디렉터리의 `.env.example`을 참고하세요.

---

## 📡 API

| 영역 | 엔드포인트 | 설명 |
| --- | --- | --- |
| 인증 | `POST /auth/signup/local` | 회원가입 |
| | `POST /auth/login/local` | 로그인 |
| | `GET /auth/login/oauth/:provider` | OAuth |
| 팀 | `POST /teams` | 팀 생성 |
| | `GET /teams` | 내 팀 목록 |
| | `POST /teams/:id/members` | 멤버 초대 |
| 거래 | `POST /deals` | 거래 등록 |
| | `GET /deals?teamId&year&month` | 월별 조회 |
| 더치페이 | `POST /dutch-requests` | 더치페이 요청 |
| OCR | `POST /ocr/analyze` | 영수증 분석 |

전체 API 명세는 `backend/routes/` 디렉터리를 참고하세요.

---

## 👥 팀 — Pocket-Pay

웹·백엔드는 팀으로 협업했고, **모바일 앱은 단독 개발**했습니다. 영역별 상세 기여는 위 [개발 기여](#-개발-기여-커밋-분석-기반) 섹션을 참고하세요.

| 팀원 | 주요 기여 영역 |
| --- | --- |
| **Aen** (본인) | 📱 모바일 앱 단독 · ⚙️ 백엔드 주도 · 🖥️ 웹 핵심 페이지 |
| **nicephj95-crypto** | 🖥️ 웹 UI (팀원 관리·사이드바·로그인) |
| **KimJeongChul** | ⚙️ 백엔드 인증/OAuth |
| **tmakdrl** | ⚙️ 백엔드 OCR·deal |
| **jaewooKim** | 🖥️ 웹 프로필·모달 |
| **JeongChul** | 📄 API 문서화 |
| **lovejg** | 🔀 브랜치 병합·협업 관리 |

## 📄 라이선스

ISC
