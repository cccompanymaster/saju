'use strict';
/**
 * idol-hero.js — 스크롤 모핑 히어로
 * .idol-hero__track 구간을 스크롤하는 동안 인물 레이어를 크로스페이드한다.
 * 인물 데이터는 HTML의 .idol-layer[data-name] 에서 읽는다(이미지/자리표시 자동).
 */
(function () {
  function init() {
    var hero = document.querySelector('.idol-hero');
    if (!hero) return;
    var track = hero.querySelector('.idol-hero__track');
    var stage = hero.querySelector('.idol-hero__stage');
    var layers = Array.prototype.slice.call(hero.querySelectorAll('.idol-layer'));
    var nameEl = hero.querySelector('.idol-name');
    var dots = Array.prototype.slice.call(hero.querySelectorAll('.idol-dots span'));
    if (!track || !stage || layers.length === 0) return;

    var names = layers.map(function (l) { return l.getAttribute('data-name') || ''; });
    var n = layers.length;
    var lastIdx = -1;
    var ticking = false;

    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    function update() {
      ticking = false;
      var rect = track.getBoundingClientRect();
      var total = rect.height - stage.offsetHeight; // 스크롤 가능 거리
      var scrolled = -rect.top;                      // 구간 내 진행 픽셀
      var p = total > 0 ? clamp01(scrolled / total) : 0;

      // 0..(n-1) 위치. 각 레이어는 자신과의 거리로 불투명도 결정 → 크로스페이드
      var pos = p * (n - 1);
      for (var i = 0; i < n; i++) {
        var d = Math.abs(i - pos);
        var o = clamp01(1 - d);          // 인접 레이어만 보임
        layers[i].style.opacity = o.toFixed(3);
        // 모핑 질감: 들어오는 인물은 살짝 확대→정렬
        var s = 1.06 - 0.06 * o;
        layers[i].style.transform = 'scale(' + s.toFixed(3) + ')';
        layers[i].style.zIndex = String(Math.round(o * 10));
      }

      var idx = Math.round(pos);
      if (idx !== lastIdx) {
        lastIdx = idx;
        if (nameEl) {
          nameEl.style.opacity = '0';
          setTimeout(function () { nameEl.textContent = names[idx] || ''; nameEl.style.opacity = '1'; }, 180);
        }
        dots.forEach(function (dot, di) { dot.classList.toggle('on', di === idx); });
      }
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
