'use strict';
/**
 * funnel.js — 조선사주 퍼널 클라이언트
 * ① 무료 맛보기(/api/free-reading) → ② Toss 결제 → ③ 승인+심층(/api/payment/confirm) → ④ 화면+발송
 */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var STORE = 'maja_pending'; // 결제 리다이렉트 전후 상태 보존

  // 오행 = 전통 오방색 (목靑·화赤·토黃·금白·수黑)
  var OHAENG_COLORS = { 목: '#2e6da4', 화: '#c0392b', 토: '#c9a227', 금: '#7e8790', 수: '#2b2b38' };
  var state = { saju: null, birth: null };

  /* ---------- 유틸 ---------- */
  function api(path, body) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || !j.ok) throw new Error(j.error || ('요청 실패 (' + r.status + ')'));
        return j;
      });
    });
  }
  function show(el) { if (el) el.classList.remove('is-hidden'); }
  function hide(el) { if (el) el.classList.add('is-hidden'); }
  function scrollTo(el) { if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function loading(btn, on, txt) {
    if (!btn) return;
    if (on) { btn.dataset._t = btn.textContent; btn.textContent = txt || '잠시만요…'; btn.disabled = true; }
    else { btn.textContent = btn.dataset._t || btn.textContent; btn.disabled = false; }
  }

  function lang() { return window.__LANG__ || 'en'; }
  function t(k) { return window.I18N ? window.I18N.t(k) : k; }

  /* ---------- 입력 수집 ---------- */
  function collectBirth() {
    var unknown = $('#bt-unknown').checked;
    return {
      name: $('#person-name').value.trim(),
      gender: (document.querySelector('input[name="gender"]:checked') || {}).value || 'O',
      birthdate: $('#birthdate').value.trim(),
      calendar: (document.querySelector('input[name="lunar"]:checked') || {}).value || 'solar',
      hour: parseInt($('#bt-hour').value, 10),
      minute: parseInt($('#bt-min').value, 10),
      unknownTime: unknown,
      birthPlace: $('#birth-place').value.trim(),
      trueSolarTime: $('#bt-truesolar').checked,
    };
  }

  /* ---------- 결과 렌더 ---------- */
  var ZODIAC_EN = { '쥐': 'Rat', '소': 'Ox', '호랑이': 'Tiger', '토끼': 'Rabbit', '용': 'Dragon', '뱀': 'Snake', '말': 'Horse', '양': 'Goat', '원숭이': 'Monkey', '닭': 'Rooster', '개': 'Dog', '돼지': 'Pig' };
  function renderSaju(s) {
    var ko = lang() === 'ko';
    $('#r-name').textContent = ko ? (s.name + '님의 사주') : (s.name + "'s Saju");
    var zodiac = ko ? (s.zodiac + '띠') : (ZODIAC_EN[s.zodiac] || s.zodiac);
    $('#r-meta').textContent = (ko ? '양력 ' : 'Solar ') + s.solar + (ko ? ' · 음력 ' : ' · Lunar ') + s.lunar + ' · ' + zodiac
      + (s.dayMaster && s.dayMaster.strength ? ' · ' + strengthLabel(s.dayMaster.strength)
          + (s.dayMaster.yongsin ? ' · ' + (ko ? '용신 ' : 'Yongsin ') + s.dayMaster.yongsin.hanja : '') : '');

    var labels = ko ? { year: '년주', month: '월주', day: '일주', hour: '시주' }
                    : { year: 'Year', month: 'Month', day: 'Day', hour: 'Hour' };
    var html = '';
    ['year', 'month', 'day', 'hour'].forEach(function (k) {
      var p = s.pillars[k];
      if (!p) {
        html += '<div class="pillar pillar--empty"><p class="pillar__label">' + labels[k] + '</p>'
          + '<p class="pillar__hanja">—</p><p class="pillar__han">' + (ko ? '모름' : 'unknown') + '</p></div>';
        return;
      }
      var isDay = k === 'day';
      html += '<div class="pillar"><p class="pillar__label">' + labels[k] + (isDay ? (ko ? ' (나)' : ' (me)') : '') + '</p>'
        + '<p class="pillar__hanja">' + p.hanja + '</p><p class="pillar__han">' + p.han + ' · ' + p.eumyang + p.ohaeng + '</p></div>';
    });
    $('#r-pillars').innerHTML = html;

    // 오행 막대
    var c = s.ohaeng.count, max = Math.max.apply(null, Object.keys(c).map(function (k) { return c[k]; })) || 1;
    var ob = '';
    ['목', '화', '토', '금', '수'].forEach(function (k) {
      var pct = Math.round((c[k] / max) * 100);
      ob += '<div class="ohaeng__row"><span class="ohaeng__name">' + k + '</span>'
        + '<span class="ohaeng__track"><span class="ohaeng__fill" style="width:' + pct + '%;background:' + (OHAENG_COLORS[k] || '') + '"></span></span>'
        + '<span class="ohaeng__n">' + c[k] + '</span></div>';
    });
    $('#r-ohaeng').innerHTML = ob;
  }

  /* ---------- ① 무료 맛보기 ---------- */
  function onFreeSubmit(e) {
    e.preventDefault();
    var err = $('#form-error'); hide(err);
    var birth = collectBirth();
    if (!birth.name) return showErr(err, '이름을 입력해 주세요.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth.birthdate)) return showErr(err, '생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.');

    var btn = $('#btn-free');
    loading(btn, true, lang() === 'ko' ? '사주를 풀고 있어요…' : 'Reading your Saju…');
    api('/api/free-reading', Object.assign({ lang: lang() }, birth))
      .then(function (res) {
        state.saju = res.saju; state.birth = birth;
        renderSaju(res.saju);
        $('#r-teaser').textContent = res.teaser;
        show($('#free-result'));
        scrollTo($('#free-result'));
      })
      .catch(function (ex) { showErr(err, ex.message); })
      .finally(function () { loading(btn, false); });
  }
  function showErr(el, msg) { if (el) { el.textContent = msg; show(el); } return false; }
  function strengthLabel(k) { var m = window.I18N && window.I18N.t('result_meta_strong'); return (m && m[k]) || k; }

  /* ---------- ② 결제 시작 ---------- */
  function onPayClick() {
    var err = $('#pay-error'); hide(err);
    if (!state.birth) return showErr(err, '먼저 무료 맛보기를 진행해 주세요.');
    var email = $('#contact-email').value.trim();
    var phone = $('#contact-phone').value.trim();
    if (!email && !phone) return showErr(err, '결과를 받을 이메일 또는 연락처를 입력해 주세요.');

    var pending = {
      birth: state.birth,
      question: $('#worry').value.trim(),
      contact: { email: email, phone: phone },
      lang: lang(),
    };
    var btn = $('#btn-paid');
    loading(btn, true, '결제창을 여는 중…');

    fetch('/api/client-key').then(function (r) { return r.json(); })
      .then(function (cfg) {
        var amount = (cfg && cfg.amount) || 3900;
        var orderId = 'maja_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        pending.orderId = orderId; pending.amount = amount;
        sessionStorage.setItem(STORE, JSON.stringify(pending));

        if (!cfg || !cfg.clientKey || typeof TossPayments === 'undefined') {
          // 결제키 미설정(개발) → 결제 건너뛰고 바로 승인(mock) 흐름
          return confirmAndShow({ paymentKey: 'mock_' + orderId, orderId: orderId, amount: amount });
        }
        var toss = TossPayments(cfg.clientKey);
        var payment = toss.payment({ customerKey: TossPayments.ANONYMOUS });
        return payment.requestPayment({
          method: 'CARD',
          amount: { currency: 'KRW', value: amount },
          orderId: orderId,
          orderName: '조선사주 심층 사주 리딩',
          successUrl: location.origin + '/m/?pay=success',
          failUrl: location.origin + '/m/?pay=fail',
        });
      })
      .catch(function (ex) {
        if (ex && ex.code === 'USER_CANCEL') { /* 사용자가 닫음 */ }
        else showErr(err, (ex && ex.message) || '결제를 시작할 수 없습니다.');
      })
      .finally(function () { loading(btn, false); });
  }

  /* ---------- ③④ 승인 + 심층 + 발송 ---------- */
  function confirmAndShow(payInfo) {
    var pending = readPending();
    if (!pending) throw new Error('결제 정보를 찾을 수 없습니다. 다시 시도해 주세요.');

    show($('#paid-result'));
    $('#paid-body').innerHTML = '<div class="loading-inline"><span class="spinner"></span> '
      + (lang() === 'ko' ? '사주를 풀어 적고 있습니다…' : 'Writing your in-depth Saju…') + '</div>';
    scrollTo($('#paid-result'));

    return api('/api/payment/confirm', {
      paymentKey: payInfo.paymentKey,
      orderId: payInfo.orderId,
      amount: payInfo.amount,
      birth: pending.birth,
      question: pending.question,
      contact: pending.contact,
      lang: pending.lang || lang(),
    }).then(function (res) {
      sessionStorage.removeItem(STORE);
      $('#paid-meta').textContent = res.saju.name + '님 · ' + res.saju.pillarsText;
      $('#paid-body').textContent = res.reading;

      var dn = $('#delivery-note');
      var ko = lang() === 'ko';
      var sent = (res.delivery || []).filter(function (d) { return d.ok && !d.skipped; })
        .map(function (d) { return d.channel === 'email' ? (ko ? '이메일' : 'email') : (ko ? '카카오' : 'KakaoTalk'); });
      if (sent.length) {
        dn.innerHTML = '' + t('delivered') + sent.join(' · ') + '.'
          + (res.reAccessUrl ? '<br/><a href="' + res.reAccessUrl + '" style="color:var(--jade);word-break:break-all">'
              + (ko ? '내 결과 다시 보기 (2주간)' : 'Re-open my result (2 weeks)') + '</a>' : '');
        show(dn);
      }

      // PDF 즉시 내려받기
      var pdfBtn = $('#btn-pdf');
      if (pdfBtn && res.pdfBase64) {
        try {
          var bin = atob(res.pdfBase64), len = bin.length, bytes = new Uint8Array(len);
          for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
          var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
          pdfBtn.href = url;
          pdfBtn.setAttribute('download', res.pdfName || '조선사주_사주첩.pdf');
          show(pdfBtn);
        } catch (e) { /* ignore */ }
      }
      hide($('#free-result'));
    }).catch(function (ex) {
      $('#paid-body').innerHTML = '<p class="form-error">리딩 생성 중 오류가 발생했습니다: '
        + (ex.message || '') + '</p>';
    });
  }

  function readPending() {
    try { return JSON.parse(sessionStorage.getItem(STORE) || 'null'); } catch (e) { return null; }
  }

  function renderPaid(res) {
    if (res.saju) { renderSaju(res.saju); show($('#free-result')); }
    if (res.saju) $('#paid-meta').textContent = res.saju.name + ' · ' + res.saju.pillarsText;
    $('#paid-body').textContent = res.reading;
    var pdfBtn = $('#btn-pdf');
    if (pdfBtn && res.pdfBase64) {
      try {
        var bin = atob(res.pdfBase64), len = bin.length, bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        pdfBtn.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        pdfBtn.setAttribute('download', res.pdfName || 'Joseon_Saju.pdf');
        show(pdfBtn);
      } catch (e) {}
    }
    hide($('#free-result'));
    show($('#paid-result'));
  }

  /* 재열람: /m/?r=TOKEN (발송일로부터 2주) */
  function handleReopen() {
    var q = new URLSearchParams(location.search);
    var token = q.get('r');
    if (!token) return false;
    show($('#paid-result'));
    $('#paid-body').innerHTML = '<div class="loading-inline"><span class="spinner"></span> '
      + (lang() === 'ko' ? '저장된 결과를 불러옵니다…' : 'Loading your saved result…') + '</div>';
    scrollTo($('#paid-result'));
    fetch('/api/result/' + encodeURIComponent(token)).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, j: j }; });
    }).then(function (o) {
      if (o.status === 200 && o.j.ok) { renderPaid(o.j); }
      else { $('#paid-body').innerHTML = '<p class="form-error">' + (window.I18N ? I18N.t('reopen_expired') : 'This result has expired.') + '</p>'; }
    }).catch(function () {
      $('#paid-body').innerHTML = '<p class="form-error">' + (window.I18N ? I18N.t('reopen_expired') : 'This result has expired.') + '</p>';
    });
    return true;
  }

  /* 결제 리다이렉트 복귀 처리 */
  function handleReturn() {
    var q = new URLSearchParams(location.search);
    var pay = q.get('pay');
    if (!pay) return false;
    history.replaceState({}, '', '/m/'); // 쿼리 정리
    if (pay === 'fail') {
      alert('결제가 취소되었거나 실패했습니다. 다시 시도해 주세요.');
      return true;
    }
    if (pay === 'success') {
      var paymentKey = q.get('paymentKey');
      var orderId = q.get('orderId');
      var amount = Number(q.get('amount'));
      var pending = readPending();
      if (pending && paymentKey && orderId) {
        confirmAndShow({ paymentKey: paymentKey, orderId: orderId, amount: amount || pending.amount });
        return true;
      }
    }
    return false;
  }

  /* ---------- 부가 UX ---------- */
  function initUX() {
    // 스플래시
    var splash = $('#splash');
    var hideSplash = function () { if (splash) splash.classList.add('hide'); };
    window.addEventListener('load', function () { setTimeout(hideSplash, 600); });
    setTimeout(hideSplash, 2400);

    // 부드러운 앵커
    $$('.js-scroll').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var t = $(a.getAttribute('href'));
        if (t) { e.preventDefault(); scrollTo(t); }
      });
    });

    // 하단 고정 CTA
    var cta = $('#sticky-cta'), hero = $('.idol-hero') || $('.hero'), search = $('#search');
    if (cta && hero && search && 'IntersectionObserver' in window) {
      // 히어로·폼·결과 화면에서는 숨김 (결과 화면엔 자체 CTA가 있음)
      var fr = $('#free-result'), pr = $('#paid-result');
      var vis = { hero: true, search: false, fr: false, pr: false };
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.target === hero) vis.hero = en.isIntersecting;
          if (en.target === search) vis.search = en.isIntersecting;
          if (en.target === fr) vis.fr = en.isIntersecting;
          if (en.target === pr) vis.pr = en.isIntersecting;
        });
        cta.classList.toggle('show', !vis.hero && !vis.search && !vis.fr && !vis.pr);
      }, { threshold: 0.12 });
      io.observe(hero); io.observe(search);
      if (fr) io.observe(fr);
      if (pr) io.observe(pr);
    }

    // 언어 토글(시각 상태)
    $$('.lang').forEach(function (g) {
      $$('.lang__btn', g).forEach(function (b) {
        b.addEventListener('click', function () {
          $$('.lang__btn', g).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
        });
      });
    });

    // 생년월일 자동 하이픈
    var bd = $('#birthdate');
    bd.addEventListener('input', function () {
      var v = bd.value.replace(/\D/g, '').slice(0, 8);
      if (v.length > 6) v = v.slice(0, 4) + '-' + v.slice(4, 6) + '-' + v.slice(6);
      else if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4);
      bd.value = v;
    });

    // 출생시간 모름
    var unk = $('#bt-unknown');
    unk.addEventListener('change', function () {
      [$('#bt-hour'), $('#bt-min')].forEach(function (i) { i.disabled = unk.checked; i.style.opacity = unk.checked ? '0.4' : '1'; });
    });

    // 글자 수
    var worry = $('#worry'), counter = $('#worry-counter');
    if (worry) worry.addEventListener('input', function () { counter.textContent = worry.value.length + ' / 100'; });

    // 연락처 자동 하이픈
    var phone = $('#contact-phone');
    if (phone) phone.addEventListener('input', function () {
      var v = phone.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 7) v = v.slice(0, 3) + '-' + v.slice(3, 7) + '-' + v.slice(7);
      else if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3);
      phone.value = v;
    });

    // 통계 카운트업
    var stat = $('#stat-count');
    if (stat) {
      var target = parseInt(stat.textContent.replace(/,/g, ''), 10) || 0, cur = 0, step = Math.max(1, Math.round(target / 40));
      var t = setInterval(function () { cur += step; if (cur >= target) { cur = target; clearInterval(t); } stat.textContent = cur.toLocaleString('ko-KR'); }, 28);
    }

    // 다시 시작
    var restart = $('#btn-restart');
    if (restart) restart.addEventListener('click', function () {
      hide($('#paid-result')); scrollTo($('#search'));
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initUX();
    initDemoBadge();
    $('#form-reading').addEventListener('submit', onFreeSubmit);
    $('#btn-paid').addEventListener('click', onPayClick);
    if (!handleReopen()) handleReturn();
  });

  /* 키 미설정 시 데모(mock) 모드 안내 배지 */
  function initDemoBadge() {
    fetch('/api/config').then(function (r) { return r.json(); }).then(function (c) {
      if (!c || (c.clientKey && c.aiEnabled)) return;
      var miss = [];
      if (!c.clientKey) miss.push('결제');
      if (!c.aiEnabled) miss.push('AI');
      var b = document.createElement('div');
      b.className = 'demo-badge';
      b.textContent = '데모 모드 · ' + miss.join('·') + ' mock';
      b.title = '실제 키(.env)를 설정하면 자동으로 실서비스로 전환됩니다.';
      document.body.appendChild(b);
    }).catch(function () {});
  }
})();
