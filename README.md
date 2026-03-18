# PocketPay

**소모임 공금, 이제 투명하게.**

동아리, 스터디, 회식 모임의 공금을 한 곳에서 관리하세요.
영수증 사진 한 장이면 거래가 자동 입력되고, 팀원 모두가 실시간으로 확인할 수 있습니다.

---

## 왜 PocketPay인가요?

모임 총무가 되면 시작되는 고민들 — 엑셀 정리, 카톡 공지, 영수증 보관.
PocketPay는 이 모든 과정을 하나의 서비스로 해결합니다.

- **영수증 OCR** — 사진만 찍으면 거래처, 금액, 날짜가 자동 입력됩니다
- **팀 공유** — 팀원을 초대하면 모든 거래 내역이 실시간으로 공유됩니다
- **대시보드** — 잔액, 수입, 지출을 한눈에 파악합니다
- **소셜 로그인** — 구글, 네이버 계정으로 바로 시작할 수 있습니다

---

## 기술 스택

### Frontend

| 기술 | 역할 |
|------|------|
| React 18 + Vite | UI + 빌드 |
| React Router v7 | 라우팅 (lazy loading) |
| Zustand | 상태 관리 |
| Tailwind CSS + shadcn/ui | 디자인 시스템 |

### Backend

| 기술 | 역할 |
|------|------|
| Express 5 | API 서버 |
| MongoDB + Mongoose | 데이터베이스 |
| JWT + bcrypt | 인증 + 암호화 |
| Zod | 입력 검증 |
| CLOVA OCR | 영수증 인식 |

---

## 아키텍처

### Frontend — Feature-Sliced Design (FSD)

```
src/
├── app/          # 라우터, 프로바이더, 앱 초기화
├── entities/     # 비즈니스 엔티티 (팀, 거래, 유저)
├── features/     # 기능 모듈 (인증, 팀, 거래, 프로필)
├── pages/        # 페이지 조합
├── shared/       # 공용 UI, API 클라이언트, 유틸
└── widgets/      # 독립 UI 블록 (네비게이션, 사이드바)
```

### Backend — 계층형 MVC

```
backend/
├── controllers/  # 요청/응답 처리
├── services/     # 비즈니스 로직
├── models/       # MongoDB 스키마
├── middleware/    # JWT 검증, Zod 유효성 검사
├── validators/   # 입력 스키마
└── routes/       # API 라우트
```

---

## 주요 기능

### 영수증 OCR 자동 입력
CLOVA Document OCR + General OCR을 병렬로 호출하여 영수증에서 거래처명, 결제금액, 날짜, 사업자번호를 추출합니다.

### 팀 기반 공금 관리
팀 생성 → 멤버 초대 → 거래 등록의 흐름으로 운영됩니다. Owner/Member 역할 구분, 멤버 추방, 팀 탈퇴를 지원합니다.

### OAuth 소셜 로그인
구글, 네이버 OAuth 2.0을 지원합니다. 탈퇴 후 재가입 시 구글은 동의 재확인 플로우를 거칩니다.

### 보안
- Helmet 보안 헤더
- Rate Limiting (글로벌 + 인증 엔드포인트)
- bcrypt 비밀번호 해싱
- JWT 토큰 인증
- Zod 입력 검증
- Multer 파일 업로드 제한 (5MB, 이미지만)

---

## 시작하기

### 요구사항
- Node.js 18+
- MongoDB

### 설치

```bash
git clone https://github.com/P2P-J/PocketPay.git
cd PocketPay
```

**백엔드:**
```bash
cd backend
npm install
cp .env.example .env   # 환경변수 설정
npm start
```

**프론트엔드:**
```bash
cd frontend/Pocket-Pay
npm install
npm run dev
```

> 환경변수 설정은 `.env.example` 파일을 참고하세요.

---

## API

| 영역 | 엔드포인트 | 설명 |
|------|-----------|------|
| 인증 | `POST /auth/signup/local` | 회원가입 |
| | `POST /auth/login/local` | 로그인 |
| | `GET /auth/login/oauth/:provider` | OAuth |
| 팀 | `POST /teams` | 팀 생성 |
| | `GET /teams` | 내 팀 목록 |
| | `POST /teams/:id/members` | 멤버 초대 |
| 거래 | `POST /deals` | 거래 등록 |
| | `GET /deals?teamId&year&month` | 월별 조회 |
| OCR | `POST /ocr/analyze` | 영수증 분석 |

전체 API 명세는 소스 코드의 `routes/` 디렉토리를 참고하세요.

---

## 팀

**P2P-J** 팀이 개발하고 있습니다.

## 라이선스

ISC
