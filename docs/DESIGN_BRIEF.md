# 조선사주 — 디자인 개선 요청 프롬프트 (Claude용)

아래 전체를 복사해 Claude(웹/앱 또는 Claude Code)에 붙여넣으면 됩니다.
- **Claude Code(이 저장소에서)**: 그대로 붙여넣으면 `m/index.html` + `m/css/app.css`를 직접 수정합니다.
- **Claude 웹/앱(저장소 없이)**: 마지막 줄의 산출물 형식을 "단일 HTML 파일(스타일 인라인)"로 바꿔 요청하세요.

---

## 프롬프트 시작

너는 한국 헤리티지 럭셔리 브랜드를 전문으로 하는 월드클래스 웹 디자이너다. 설화수·오설록·국립중앙박물관 뮤지엄숍 굿즈·조선호텔 수준의 "현대적으로 재해석된 조선 미감"을 구현할 수 있어야 한다.

**프로젝트**: '조선사주(朝鮮四柱)' — 생년월일로 사주를 풀어주는 모바일 웹 서비스. 퍼널은 [랜딩 히어로 → 무료 사주 맛보기(폼+결과) → 3,900원 심층 결제 → 결과+PDF]. 타깃은 20~30대 여성 중심, 광고(인스타/메타) 유입. 기본 언어 영어, 한국어 토글.

**현재 문제**: 지금 시안은 "한지 배경 + 갈색 글씨" 수준의 평범한 템플릿 느낌이다. 싸구려 사주카페가 아니라 **백화점 1층 화장품 매장 같은 고급감**, "이건 돈 내고 받을 만한 물건"이라는 인상을 줘야 한다.

### 1. 아트 디렉션 — "달빛 아래 한지" (Moonlit Hanji)

- **무드**: 고요한 밤의 궁궐. 신비롭지만 무겁지 않고, 전통적이지만 낡지 않게. 점집이 아니라 **헤리티지 럭셔리 브랜드의 시즌 캠페인 페이지**처럼.
- **컬러 시스템** (이 토큰을 기준으로 정밀 튜닝 가능):
  - 바탕(밤): `#0E1B2E`(deep navy) → `#1A2C47` 그라데이션. 순수 검정 금지.
  - 종이(낮 섹션): `#F7F2E7`(warm ivory) — 노랗게 뜨지 않는 차분한 한지색.
  - 금(포인트): `#C9A23F` 단색 + 아주 절제된 사용(선·세리프 디테일·아이콘). **금색 떡칠 금지.**
  - 주칠(낙관): `#B23A2E` — 낙관 도장과 핵심 CTA 단 두 곳에만.
  - 먹(텍스트): `#1F1A14` / 보조 `#6B5F4E`.
- **타이포그래피**:
  - 헤드라인: 명조 계열(Nanum Myeongjo/Noto Serif KR) — 자간을 +0.02~0.08em으로 벌려 "현판" 느낌. 영문 헤드라인은 Cormorant Garamond 등 클래식 세리프.
  - 본문: Pretendard. 본문 16px/행간 1.7, 모바일 가독 최우선.
  - 위계는 크기보다 **굵기·자간·여백**으로. 폰트 크기 종류는 5단계 이하로 제한.
- **그래픽 모티프**: 보름달(은은한 radial glow), 산 능선 실루엣, 구름 문양(雲紋), 가는 금선 괘선(테두리 1px), 낙관 도장. 모티프는 페이지 전체에서 **3개 이하만 반복** 사용해 통일감.
- **질감**: 한지 텍스처는 opacity 3~5%의 노이즈/섬유 정도로만. 사진처럼 보이는 종이 텍스처 금지.
- **모션**: 스크롤 시 fade-up(12px, 0.6s, cubic-bezier(0.22,1,0.36,1)) 한 종류만. 과한 패럴럭스·회전·바운스 금지. `prefers-reduced-motion` 존중.

### 2. 섹션별 요구

1. **히어로**: 풀스크린 밤하늘. 보름달 + 능선. 중앙에 낙관 도장(四) → 브랜드명(자간 넓은 명조) → 한 줄 카피 → 단 하나의 CTA(주칠 버튼). 스크롤하면 기존 인물 크로스페이드(.idol-hero 구조 유지)가 자연스럽게 이어질 것.
2. **신뢰 띠**: "지금까지 N명" 카운터 — 숫자는 금색 세리프, 나머지는 작게.
3. **무엇을 보나요**: 카드 3장. 카드마다 한자 1자(命/運/問)를 워터마크처럼 크게 깔고 위에 제목+한 줄 설명. 아이콘 일러스트·이모지 금지.
4. **입력 폼**: 가장 공들일 것. 종이(아이보리) 섹션으로 전환. 입력칸은 밑줄(1px 먹색) 스타일 또는 아주 옅은 면+1px 테두리. 라디오(성별/양음력)는 알약형 세그먼트, 선택 시 먹색 채움. 라벨은 작은 명조. **폼이 관공서 양식처럼 보이면 실패.**
5. **무료 결과**: 사주 네 기둥은 "현판 4개"처럼 — 한자 크게(명조 800), 기둥마다 가는 금선 테두리, 일주(나)만 주칠 포인트. 오행 바는 전통 오방색을 채도 낮춰 사용.
6. **결제 후크**: 어두운 카드로 전환(밤하늘 미니어처). 혜택 리스트는 ✓ 대신 가는 금색 점괘선. 가격 버튼은 주칠. "3,900원"의 숫자만 세리프로 키울 것.
7. **푸터**: 최소한으로. 면책 문구는 9~10px 회갈색.

### 3. 절대 금지 (안티 패턴)

- 보라/네온 그라데이션, 유리morphism, 그림자 떡칠, 둥근 모서리 16px 이상
- 이모지 아이콘(🔮✨ 등) — 전부 한자·문양·가는 선 아이콘으로 대체
- 기본 시스템 폰트 느낌, 가운데 정렬 남발, 섹션마다 다른 스타일
- 스톡 일러스트 느낌, "AI가 만든 듯한" 보편적 레이아웃

### 4. 기술 제약 (반드시 지킬 것 — JS가 이 ID/구조를 참조한다)

- 파일: `m/index.html`(마크업) + `m/css/app.css`(스타일 전면 재작성 가능). JS 3종(`funnel.js`, `i18n.js`, `kakao.js`)은 수정하지 말 것.
- **보존할 ID**: `form-reading, person-name, gender-label, birthdate, bt-hour, bt-min, bt-unknown, bt-truesolar, birth-place, btn-free, form-error, free-result, r-name, r-meta, r-pillars, r-ohaeng, r-teaser, worry, worry-counter, contact-email, contact-phone, btn-paid, pay-error, paid-result, paid-head, paid-meta, paid-body, delivery-note, btn-pdf, btn-restart, btn-kakao-login, btn-kakao-channel, btn-kakao-channel-foot, sticky-cta, stat-count, splash, search, top` 그리고 `<svg>` 안의 `#breeze` 필터(실사진 머리카락 모션용)도 그대로 둘 것.
- **보존할 구조/클래스**: 라디오 `name="gender"`·`name="lunar"`, `.lang__btn[data-lang]`, 모든 `data-i18n`/`data-i18n-html`/`data-i18n-ph` 속성, `.js-scroll`, `.is-hidden`, `.idol-hero`(내부 `.idol-hero__track/.idol-hero__stage/.idol-frame/.idol-layer/.idol-dots/.idol-name/.idol-copy` 포함), 동적 렌더 클래스 `.pillar/.pillar__label/.pillar__hanja/.pillar__han/.ohaeng__row/.ohaeng__name/.ohaeng__track/.ohaeng__fill/.ohaeng__n/.reading-body/.loading-inline/.spinner/.form-error/.btn/.btn--gold/.btn--plum/.btn--kakao/.btn--ghost/.demo-badge`
- 모바일 퍼스트(기준 390px), `viewport-fit=cover`+safe-area, 입력 폰트 16px(iOS 줌 방지), 터치 타겟 44px+, CSP상 외부 리소스는 fonts.googleapis/gstatic·cdn.jsdelivr·tosspayments·kakao만.

### 5. 합격 기준

- 첫 화면 3초 안에 "고급 브랜드"라는 인상 — 스크린샷만 봐도 광고 소재로 쓸 수 있을 것
- 전 섹션이 하나의 디자인 언어(모티프 3개 이하, 폰트 5단계 이하, 컬러 토큰만 사용)
- Lighthouse 접근성 90+, 콘솔 에러 0, 결제까지 퍼널 동작 무결
- 작업 후: 위 보존 ID가 전부 존재하는지 grep으로 자체 검증하고, 390px 스크린샷(히어로/폼/무료결과/결제후크) 4장을 보여줄 것

먼저 무드보드 수준의 방향(컬러·타이포·모티프 적용 계획)을 5줄로 요약해 보여주고, 내 확인 없이 바로 전체 구현까지 진행하라.

## 프롬프트 끝

---

## (선택) PDF 사주첩 디자인 개선용 추가 프롬프트

> 위 프롬프트로 웹을 개선한 뒤, 이어서 아래를 붙여넣으세요.

`server/src/pdf.js`의 PDF 사주첩도 같은 디자인 언어로 격상하라. 표지는 위 웹 히어로와 동일한 "달빛 아래 한지" 무드(보름달·능선·낙관·금 괘선), 본문은 종이색 바탕에 명조 본문, 장(章) 표지는 한자 워터마크+금선. 명식표는 "현판 4개" 스타일로 웹과 통일. 제약: `buildHtml(saju, readingText, question, lang)` 시그니처와 `◆ 장 / ○ 항목 / ▷ 뜻풀이` 파싱 규칙(`renderReading`)을 유지하고, 나눔명조 base64 내장(`fontFaceCss`)을 계속 사용할 것. 완료 후 `npm run test:pdf`(KO/EN 30~40p)가 통과해야 한다.
