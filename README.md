# 마녀의 리뷰 — 사주 리딩 서비스

생년월일로 **사주(四柱八字)** 를 계산해 무료 맛보기를 보여주고, 결제 후 AI 심층 리딩을 제공하는 모바일 우선 서비스입니다.

## 퍼널

```
①  광고 (인스타/메타/유튜브)
        ↓
②  무료 맛보기 랜딩  (/m/)
        │   POST /api/free-reading
        │   → 서버가 사주 계산(lunar-javascript) + AI 맛보기 생성
        ▼
    사주 네 기둥 + 오행 + 맛보기 + 결제 후크(질문·연락처)
        │   TossPayments 결제창
        │   POST /api/payment/confirm  (서버 승인검증)
        ▼
③  결제 승인 → 심층 리딩 생성(AI) → ④ 화면 표시 + 이메일/카톡 발송
```

> **키가 없어도 전체 퍼널이 mock 으로 끝까지 동작**합니다. 실제 연동(Gemini·Toss·SMTP·카카오)은 `.env` 로 켭니다.

## 구조

```
manifest.json              PWA 매니페스트
m/index.html               모바일 랜딩 + 입력 + 결과 (퍼널 UI)
m/css/app.css              디자인 시스템 (다크 미스틱 + 골드)
m/js/funnel.js             퍼널 클라이언트 (무료→결제→심층→발송)
m/img/                     이미지 에셋 (배포 환경에 배치)
assets/                    아이콘 / OG 이미지

server/
  server.js                Express 앱 + 정적 서빙 + API
  src/saju.js              사주 계산 (lunar-javascript 래핑 + 한글 변환)
  src/ai.js                Gemini 어댑터 (+ mock)
  src/reading.js           무료 맛보기 / 유료 심층 프롬프트 (+ mock)
  src/payment.js           TossPayments 결제 승인 검증 (+ mock)
  src/deliver.js           이메일(nodemailer) / 카카오 발송 (+ mock)
  test/smoke.js            퍼널 스모크 테스트
  .env.example             환경변수 템플릿
```

## 실행

```bash
cd server
npm install
cp .env.example .env        # 필요한 키 채우기 (없어도 mock 으로 실행됨)
npm start                   # http://localhost:3000/m/
npm test                    # 스모크 테스트
```

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET`  | `/api/client-key` | Toss 클라이언트 키 + 가격 |
| `GET`  | `/api/config`     | 가격 · AI 활성 여부 |
| `POST` | `/api/free-reading` | 사주 계산 + 무료 맛보기 |
| `POST` | `/api/payment/confirm` | 결제 승인검증 → 심층 리딩 → 발송 |
| `POST` | `/api/deliver`    | (관리용) 재발송 |
| `GET`  | `/api/health`     | 헬스체크 |

`POST /api/free-reading` 요청 예:
```json
{ "name":"김민지", "gender":"F", "birthdate":"1995-07-22",
  "hour":14, "minute":0, "calendar":"solar", "unknownTime":false }
```

## 환경변수 (`server/.env`)

| 변수 | 없을 때 | 용도 |
|---|---|---|
| `GEMINI_API_KEY` | mock 풀이 | AI 사주 풀이 (Google AI Studio) |
| `TOSS_CLIENT_KEY` / `TOSS_SECRET_KEY` | mock 승인 | TossPayments 결제 |
| `SMTP_*` | mock 로그 | 이메일 발송 |
| `KAKAO_ALIMTALK_TOKEN` | mock 로그 | 카카오 알림톡(템플릿 승인 필요) |
| `READING_PRICE` | `3900` | 심층 리딩 가격(원) |

## 모바일 최적화

- 뷰포트 `viewport-fit=cover` + `env(safe-area-inset-*)`, 확대 허용(접근성)
- 유동 타이포 `clamp()`, 폰트 `display=swap` + `preconnect`
- 터치 타겟 44~54px, 입력 폰트 16px(iOS 자동 줌 방지)
- 이미지 `aspect-ratio`/`width·height` 지정(CLS 방지), 히어로 `fetchpriority`
- `prefers-reduced-motion` 대응, 네이티브 `<details>` 아코디언
- 결제 리다이렉트 전후 상태를 `sessionStorage` 로 보존

## 남은 작업(연동 시)

- Gemini/Toss/SMTP 실제 키 발급 후 `.env` 설정
- 카카오 알림톡: 비즈채널 개설 + 템플릿 승인 → `src/deliver.js` 의 `sendKakao` 연동 지점 구현
- (선택) 결제 영수증/주문 저장용 DB, 결과 재열람 마이페이지
