# 조선사주(朝鮮四柱) — 사주 리딩 서비스

생년월일로 **사주(四柱八字)** 를 계산해 무료 맛보기를 보여주고, 결제 후 AI 심층 리딩을 제공하는 모바일 우선 서비스입니다. 한지·먹·낙관의 조선 미감으로 디자인했습니다.

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
③  결제 승인 → 심층 리딩 생성(AI) → 한지풍 PDF 사주첩 생성
        ▼
④  화면 표시 + PDF 즉시 내려받기 + 이메일(PDF첨부)/카톡 발송
```

> **키가 없어도 전체 퍼널이 mock 으로 끝까지 동작**합니다. 실제 연동(Claude·Toss·SMTP·카카오)은 `.env` 로 켭니다.

## 사주 깊이 (철학관 이상)

만세력(`lunar-javascript`) 위에 다음을 계산합니다 — **천간·지지 십성, 지장간, 십이운성,
납음오행, 공망, 대운(10년 단위, 현재 대운 표시), 신살(역마·도화·화개·천을귀인),
오행 강약**. 해석은 **조선 왕후(중전마마)의 어투**로, 항목마다 *사주 근거 → 실제 삶의
장면 예시*를 들어 풀어냅니다. 결제 후에는 이 내용을 **한지풍 PDF 사주첩**(나눔명조 내장)으로
만들어 화면 내려받기 + 이메일 첨부로 전달합니다.

## 구조

```
manifest.json              PWA 매니페스트
sw.js                      서비스워커 (오프라인·설치)
robots.txt / sitemap.xml   SEO
m/index.html               모바일 랜딩 + 입력 + 결과 (퍼널 UI) + JSON-LD
m/css/app.css              디자인 시스템 (다크 미스틱 + 골드)
m/js/funnel.js             퍼널 클라이언트 (무료→결제→심층→발송)
m/img/                     이미지 에셋 (배포 환경에 배치)
assets/                    아이콘 / OG 이미지

server/
  server.js                Express 앱 + 정적 서빙 + API
  src/saju.js              사주 심층 계산 (십성·지장간·운성·납음·공망·대운·신살)
  src/ai.js                Claude(Anthropic SDK) 어댑터 — Opus 4.8·adaptive thinking·캐싱 (+ mock)
  src/reading.js           무료 맛보기 / 유료 심층 (왕후 어투, 삶 예시) (+ mock)
  src/pdf.js               한지풍 PDF 사주첩 렌더 (playwright/chromium, 나눔명조 내장)
  src/payment.js           TossPayments 결제 승인 검증 (+ mock)
  src/deliver.js           이메일(PDF첨부)/카카오 발송 (+ mock)
  assets/fonts/            나눔명조(PDF 한글 내장용)
  test/smoke.js            퍼널 스모크 테스트
  .env.example             환경변수 템플릿
```

## 실행

```bash
cd server
npm install
npx playwright install chromium   # PDF 사주첩 생성용(없으면 PDF는 생략, 메일은 텍스트로 발송)
cp .env.example .env              # 필요한 키 채우기 (없어도 mock 으로 실행됨)
npm start                         # http://localhost:3000/m/
npm test                          # 스모크 테스트
```

> PDF 생성은 `playwright`(chromium)로 HTML→PDF 렌더링합니다. chromium이 없으면
> `renderPdf` 가 안전하게 `null` 을 반환하고, 이메일은 본문 텍스트로 발송됩니다.

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
| `ANTHROPIC_API_KEY` | mock 풀이 | AI 사주 풀이 (Claude Opus 4.8) |
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

- Claude(Anthropic)/Toss/SMTP 실제 키 발급 후 `.env` 설정
- 카카오 알림톡: 비즈채널 개설 + 템플릿 승인 → `src/deliver.js` 의 `sendKakao` 연동 지점 구현
- (선택) 결제 영수증/주문 저장용 DB, 결과 재열람 마이페이지
