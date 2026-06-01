# 마녀의 리뷰 — 모바일 페이지

조선 마녀 에디션 · 보석카드 리딩 서비스의 모바일 우선(mobile-first) 프런트엔드입니다.

## 구조

```
/manifest.json        PWA 매니페스트
/m/index.html         모바일 랜딩 + 입력 페이지
/m/css/app.css        디자인 시스템 (다크 미스틱 + 골드 액센트)
/m/img/               이미지 에셋 (배포 환경에 배치)
/assets/              아이콘 / OG 이미지
```

## 모바일 최적화 포인트

- **뷰포트**: `viewport-fit=cover` 노치 대응, 확대 허용(접근성). 안전영역(`env(safe-area-inset-*)`) 반영.
- **타이포**: `clamp()` 기반 유동 크기, 폰트 `display=swap` 으로 텍스트 즉시 표시(FOIT 방지), `preconnect` 사전 연결.
- **터치**: 모든 인터랙티브 요소 최소 44~54px 터치 타겟, `touch-action: manipulation`, 입력 폰트 16px(iOS 자동 줌 방지).
- **성능 / CLS**: 이미지 `width/height`·`aspect-ratio` 지정, 히어로 `fetchpriority="high"`, 그 외 `loading="lazy"`. 스크립트는 인라인 경량 1개만 사용.
- **접근성**: 시맨틱 랜드마크, `aria-*` 라벨, `prefers-reduced-motion` 모션 감소 대응, 네이티브 `<details>` 아코디언.
- **UX**: 하단 고정 CTA(히어로/폼 영역에서는 자동 숨김), 부드러운 앵커 스크롤, 생년월일 자동 하이픈, 글자 수 카운터.

## 로컬 미리보기

```bash
python3 -m http.server 8080
# http://localhost:8080/m/
```

이미지 에셋(`/m/img/*`)은 배포 환경에 존재하며, 없을 경우 히어로는 폴백(🌙)으로 표시됩니다.
