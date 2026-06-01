# 스크롤 모핑 히어로 (Idol Hero) 가이드

스크롤을 내리면 **메인 인물이 다른 인물로 바뀌는** 히어로입니다.
지금은 머리카락이 흔들리는 **SVG 자리표시 초상 3종**(가상 인물)이 들어 있고,
실제 사진을 넣으면 자동으로 교체됩니다.

---

## 1. 실제 사진으로 교체

아래 경로에 이미지를 넣으면 자리표시 초상 대신 자동으로 사용됩니다.

```
m/img/idols/idol-1.webp   ← 첫 번째 인물
m/img/idols/idol-2.webp   ← 두 번째 인물
m/img/idols/idol-3.webp   ← 세 번째 인물
```

- 파일이 없으면 자동으로 `portrait-1.svg` 등(자리표시)으로 폴백합니다(`onerror`).
- **권장 스펙**: 세로형 3:4, 1200×1600 정도, `webp`(또는 `jpg`), 인물을 가운데 정렬, 어두운/단색 배경이면 합성감이 좋습니다.
- 인물 이름/문구는 `m/index.html` 의 `data-name="첫 번째 인연"` 을 바꾸면 스크롤 시 캡션도 함께 바뀝니다.

> ⚠️ **초상권 주의**: 실존 K-pop 아이돌 등 특정 인물의 사진은 초상권·퍼블리시티권 문제가 있습니다.
> **본인이 촬영/계약한 모델 사진, 라이선스 스톡, 또는 AI로 생성한 가상 인물** 이미지를 사용하세요.

### 인물 수 늘리기/줄이기
1. `index.html` 의 `.idol-layer` 블록을 추가/삭제하고 `.idol-dots` 의 `<span>` 개수를 맞춥니다.
2. `m/css/idol-hero.css` 의 스크롤 길이를 인물 수에 맞춰 조정합니다(인물 N명 ≈ `N*90vh`):
   ```css
   .idol-hero__track { height: 300vh; } /* 3인 → 4인이면 380vh 정도 */
   ```
JS(`idol-hero.js`)는 레이어 개수를 자동으로 인식하므로 코드 수정은 필요 없습니다.

---

## 2. 머리카락 흔들림(모션) — 구현 방법

목적과 예산에 따라 4가지 방법이 있습니다. **현재 코드에는 ①②가 이미 들어 있습니다.**

### ① (적용됨) 자리표시 SVG의 자체 애니메이션
`portrait-*.svg` 안에서 앞머리 가닥을 `<animateTransform>` 으로 좌우로 흔듭니다.
SVG를 `<img>` 로 써도 내부 애니메이션이 동작합니다. → **자리표시는 지금도 머리카락이 흔들립니다.**

### ② (적용됨) 실사진용 "바람결" 필터 — 가장 간단
`index.html` 상단에 SVG `feTurbulence + feDisplacementMap` 필터(`#breeze`)가 있습니다.
실제 사진 `<img>` 에 클래스만 추가하면 잔물결처럼 일렁이는 머리카락/한복 효과가 납니다:
```html
<img src="/m/img/idols/idol-1.webp" class="idol-breeze" ... />
```
- 강도 조절: `index.html` 의 `<feDisplacementMap scale="9">` 값(↑ 강하게), 속도는 `<animate dur="9s">`.
- 장점: 사진 1장이면 끝. 단점: 머리뿐 아니라 이미지 전체가 미세하게 일렁입니다.
  머리만 흔들고 싶으면 **머리 영역만 잘라낸 PNG를 별도 레이어로 얹어** 그 레이어에만 `idol-breeze` 를 적용하세요.

### ③ 짧은 영상 루프 — 가장 자연스러움(추천)
모델의 3~6초짜리 무음 루프 영상을 배경처럼 재생합니다(머리카락이 실제로 흔들림).
```html
<div class="idol-layer" data-name="첫 번째 인연">
  <video src="/m/img/idols/idol-1.mp4" autoplay muted loop playsinline
         poster="/m/img/idols/idol-1.webp"
         style="width:100%;height:100%;object-fit:cover"></video>
</div>
```
- `muted playsinline` 필수(모바일 자동재생 조건). `webm`+`mp4` 둘 다 두면 호환성↑.
- 용량 주의: 720×960, 1~2Mbps, 5초 이하 권장. 첫 화면은 `poster` 로 즉시 표시.

### ④ 리깅 애니메이션 — 최고 품질(공수 큼)
- **Live2D Cubism** + `pixi-live2d-display`: 사진/일러스트를 잘라 본(bone)을 심어 머리카락·옷·눈깜빡임을 실시간 물리로 흔듭니다. 버튜버에서 쓰는 방식.
- **Spine** / **Rive**(`@rive-app/canvas`): 웹 친화적 본 애니메이션. Rive는 용량이 작고 상호작용도 쉽습니다.
- 정적 사진을 움직이는 영상으로 바꾸는 **AI 도구**: Runway Gen-3, Kling, Pika, 또는 오픈소스 **LivePortrait**(머리/표정 모션) → 결과 영상을 ③ 방식으로 사용.

---

## 3. 동작 원리(요약)

- `m/js/idol-hero.js` 가 `.idol-hero__track`(높이 300vh) 구간의 **스크롤 진행도 p(0~1)** 를 계산.
- `p × (인물수-1)` 위치를 기준으로 각 레이어의 **불투명도 = 1 − |거리|** 로 크로스페이드.
- 들어오는 인물은 `scale(1.06→1)` 로 살짝 확대되며 자리잡아 "변신" 느낌을 줍니다.
- 가장 가까운 인물 인덱스가 바뀌면 캡션(`.idol-name`)과 점 인디케이터를 갱신.
- `prefers-reduced-motion` 사용자는 자동 모션(숨결·광택)을 끄고 스크롤 전환만 유지합니다.

CSS의 `@keyframes idolBreath`(숨결 확대), `idolShine`(빛 스윕)은 정지 이미지에도 "살아있는" 느낌을 줍니다.
