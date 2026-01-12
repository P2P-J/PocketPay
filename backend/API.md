# PocketPay API 명세서

> **Base URL**: `http://localhost:3000`  
> **인증**: Bearer Token (JWT)

---

## Teams API

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| POST | `/teams` | 팀 생성 | 로그인 |
| GET | `/teams` | 내 팀 목록 조회 | 로그인 |
| GET | `/teams/:teamId` | 팀 상세 조회 | 팀 멤버 |
| PUT | `/teams/:teamId` | 팀 수정 | 팀 소유자 |
| DELETE | `/teams/:teamId` | 팀 삭제 | 팀 소유자 |
| POST | `/teams/:teamId/members` | 팀원 초대 | 팀 소유자 |

### Request Body

**POST /teams** (팀 생성)
```json
{ "name": "팀 이름", "description": "팀 설명" }
```

**PUT /teams/:teamId** (팀 수정)
```json
{ "name": "새 팀 이름", "description": "새 팀 설명" }
```

**POST /teams/:teamId/members** (팀원 초대)
```json
{ "email": "user@example.com" }
```

### Response

**GET /teams** (내 팀 목록 조회)
```json
{
  "teams": [
    {
      "id": "팀ID",
      "name": "팀 이름",
      "description": "팀 설명",
      "role": "owner"
    }
  ]
}
```

**GET /teams/:teamId** (팀 상세 조회)
```json
{
  "id": "팀ID",
  "name": "팀 이름",
  "description": "팀 설명",
  "members": [
    { "id": "유저ID", "email": "user@example.com", "role": "owner" }
  ]
}
```

---

## Deals API

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| POST | `/deals` | 거래내역 등록 | 팀 멤버 |
| GET | `/deals?teamId=&year=&month=` | 월별 조회 | 팀 멤버 |
| GET | `/deals/:dealId` | 상세 조회 | 팀 멤버 |
| PUT | `/deals/:dealId` | 수정 | 팀 멤버 |
| DELETE | `/deals/:dealId` | 삭제 | 팀 멤버 |

### Query Parameters (GET /deals)

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| teamId | 필수 | 조회할 팀 ID |
| year | 필수 | 조회 연도 (예: 2026) |
| month | 필수 | 조회 월 (1-12) |

### Request Body

**POST /deals** (거래내역 등록)
```json
{
  "storeInfo": "스타벅스",
  "division": "expense",
  "description": "커피",
  "category": "식비",
  "price": 5500,
  "businessNumber": "1234567890",
  "date": "2026-01-08",
  "teamId": "팀ID"
}
```

**PUT /deals/:dealId** (거래내역 수정) - 모든 필드 선택적
```json
{
  "storeInfo": "스타벅스 강남점",
  "division": "expense",
  "description": "아메리카노",
  "category": "식비",
  "price": 4500,
  "businessNumber": "1234567890",
  "date": "2026-01-08"
}
```

### Response

**GET /deals** (월별 조회)
```json
{
  "deals": [
    {
      "id": "거래ID",
      "storeInfo": "스타벅스",
      "division": "expense",
      "description": "커피",
      "category": "식비",
      "price": 5500,
      "date": "2026-01-08"
    }
  ]
}
```

**GET /deals/:dealId** (상세 조회)
```json
{
  "id": "거래ID",
  "storeInfo": "스타벅스",
  "division": "expense",
  "description": "커피",
  "category": "식비",
  "price": 5500,
  "businessNumber": "1234567890",
  "date": "2026-01-08",
  "createdBy": "유저ID",
  "createdAt": "2026-01-08T10:00:00Z"
}
```

---

## OCR API

| Method | Endpoint | 설명 | Content-Type |
|--------|----------|------|--------------|
| POST | `/ocr/analyze` | 영수증 분석 | multipart/form-data |

### Request

- **file**: 영수증 이미지 파일(일단 형식은 .jpg로)

### Response
```json
{
  "message": "분석 성공",
  "data": {
    "storeInfo": "스타벅스",
    "price": 5500,
    "date": "2026-01-08",
    "businessNumber": "1234567890"
  }
}
```

---

## 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 에러 |

### 에러 응답 형식

```json
{
  "error": "에러 메시지",
  "statusCode": 400
}
```
