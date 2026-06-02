'use strict';
/**
 * i18n.js — 조선사주 다국어 (기본: 영어 / 한국어 토글)
 * data-i18n(텍스트), data-i18n-html(innerHTML), data-i18n-ph(placeholder)
 * window.I18N.t(key) 로 JS에서도 사용. window.__LANG__ 에 현재 언어.
 */
(function () {
  var DICT = {
    en: {
      brand: 'Joseon Saju',
      hero_badge: 'Joseon Court Edition · based on a patent-pending reading structure',
      hero_title: 'Joseon Saju',
      hero_headline: 'From your birth date, we read your<br/>Four Pillars and the current of your life.',
      topic_money: 'Money', topic_love: 'Love', topic_work: 'Work', topic_rel: 'Relationships',
      hero_cta: '✦ Read my Saju — free',
      hero_micro: 'Free preview · about 1 min · no payment',
      stat_strip_pre: '✦ So far ', stat_strip_post: ' people have had a reading ✦',
      feat_eyebrow: 'Free Preview',
      feat_title: 'What does the<br/>free preview show?',
      feat_sub: 'Your Four Pillars (computed from your birth date) and your innate temperament.',
      feat1_t: 'Innate temperament', feat1_d: 'Your nature by Day Master and Five Elements.',
      feat2_t: 'Current flow', feat2_d: 'The strong forces and the empty seats.',
      feat3_t: 'A deeper answer', feat3_d: 'An in-depth reading that answers your question.',
      search_eyebrow: 'Your Saju',
      search_title: 'Enter your<br/>birth date',
      search_sub: 'The more precise, the clearer the reading.',
      label_name: 'Name', ph_name: 'Enter your name',
      label_gender: 'Gender', g_m: 'Male', g_f: 'Female', g_o: 'Other',
      label_birth: 'Birth date', cal_solar: 'Solar', cal_lunar: 'Lunar', cal_leap: 'Leap',
      label_time: 'Birth time (24h · "unknown" allowed)', time_unknown: 'Unknown',
      truesolar: 'True solar time (recommended for Korea)',
      label_place: 'Birth place (optional)', ph_place: 'e.g. Seoul',
      btn_free: '✦ See my free Saju preview',
      privacy_summary: '🔒 How is my information handled?',
      privacy1: 'Your birth date, time and question are used only to generate this reading.',
      privacy2: 'Your result can be re-opened for 2 weeks from the time it is sent, via the secure link we deliver. After that it is deleted.',
      paid_lead: 'The preview shows the current;<br/>your question makes the answer clear.',
      worry_label: 'The one thing you most want to know',
      ph_worry: 'e.g. "Should I make this move now?"',
      contact_email: 'Email to receive the result', contact_phone: 'Phone (KakaoTalk, optional)',
      benefit1: '✓ A clear verdict on your question',
      benefit2: '✓ Integrated Myeongri · Five Elements · Ten Gods',
      benefit3: '✓ Good periods and periods to beware',
      benefit4: '✓ Concrete actions to take now',
      benefit5: '✓ Sent to your email · KakaoTalk · re-openable for 2 weeks',
      btn_paid: '☵ Unlock the in-depth Saju · ₩3,900',
      paid_patent: '📌 Based on the patent-pending reading structure of Maja-saem Kim Kyung-hee.\nThe in-depth reading is composed from your birth data and question.',
      paid_done: '✦ In-depth Saju complete',
      btn_pdf: '📜 Download PDF Saju booklet',
      btn_restart: 'Start over',
      kakao_login: '💬 Sign up / log in with Kakao',
      kakao_channel: '⭐ Add our KakaoTalk channel',
      about_summary: 'How was this Saju created?',
      about1: 'Joseon Saju is based on the patent-pending reading structure of Maja-saem Kim Kyung-hee.',
      about2: 'It reads the symbolic system of Saju (Four Pillars), Five Elements and Ten Gods to interpret the current of your life culturally and symbolically.',
      about3: 'It does not replace professional medical, legal, financial or psychological advice.',
      footer_disc: 'A cultural, symbolic reading of the Saju (Four Pillars) and Myeongri tradition.',
      footer_copy: '© 2026 Joseon Saju · All Rights Reserved',
      idol1: 'First Encounter', idol2: 'Second Encounter', idol3: 'Third Encounter',
      scroll_hint: 'scroll ↓',
      result_meta_strong: { 신강: 'Strong', 중화: 'Balanced', 신약: 'Weak' },
      reopen_title: '✦ Your saved Saju', reopen_expired: 'This result has expired (available for 2 weeks).',
      delivered: 'We also sent your PDF booklet to ',
    },
    ko: {
      brand: '조선사주',
      hero_badge: '조선 마녀 에디션 · 특허출원 리딩 구조 기반',
      hero_title: '조선사주',
      hero_headline: '생년월일로 사주를 풀어<br/>지금의 흐름을 읽어드립니다.',
      topic_money: '돈', topic_love: '사랑', topic_work: '일', topic_rel: '관계',
      hero_cta: '✦ 무료로 내 사주 맛보기',
      hero_micro: '무료 맛보기 · 약 1분 · 결제 없음',
      stat_strip_pre: '✦ 지금까지 ', stat_strip_post: '명이 사주를 보았습니다 ✦',
      feat_eyebrow: '무료 맛보기',
      feat_title: '무료로<br/>무엇을 보나요?',
      feat_sub: '생년월일로 세운 당신의 사주(네 기둥)와 타고난 기질을 읽어드립니다.',
      feat1_t: '타고난 기질', feat1_d: '일간(나)과 오행으로 본 성향.',
      feat2_t: '지금의 흐름', feat2_d: '강한 기운과 비어 있는 자리.',
      feat3_t: '더 깊은 답', feat3_d: '질문에 답하는 심층 리딩으로.',
      search_eyebrow: '사주 입력',
      search_title: '생년월일을<br/>적어 주세요',
      search_sub: '정확할수록, 풀이가 더 선명해집니다.',
      label_name: '이름 (한글·영어)', ph_name: '이름을 입력하세요',
      label_gender: '성별', g_m: '남성', g_f: '여성', g_o: '기타',
      label_birth: '생년월일', cal_solar: '양력', cal_lunar: '음력', cal_leap: '윤달',
      label_time: '출생 시간 (24시간제 · 모름 가능)', time_unknown: '모름',
      truesolar: '진태양시 보정 (한국 출생 권장)',
      label_place: '태어난 곳 (선택)', ph_place: '예: 한양(서울)',
      btn_free: '✦ 무료 사주 맛보기 보기',
      privacy_summary: '🔒 당신의 정보는 어떻게 처리되나요?',
      privacy1: '입력하신 생년월일·출생시간·질문은 이 리딩 생성에만 사용됩니다.',
      privacy2: '결과는 발송 시점으로부터 2주간, 발송해 드린 보안 링크로 다시 열람할 수 있으며 이후 삭제됩니다.',
      paid_lead: '맛보기는 흐름을 보여주고,<br/>당신의 질문은 답을 선명하게 만듭니다.',
      worry_label: '지금 가장 궁금한 한 가지',
      ph_worry: '예: "지금 이직을 해도 될까요?"',
      contact_email: '결과 받을 이메일', contact_phone: '연락처 (카톡, 선택)',
      benefit1: '✓ 질문에 대한 명확한 판정',
      benefit2: '✓ 명리·오행·십성 통합 리딩',
      benefit3: '✓ 좋은 시기와 주의할 시기',
      benefit4: '✓ 지금 해야 할 행동 조언',
      benefit5: '✓ 이메일·카톡 발송 · 2주간 재열람',
      btn_paid: '☵ 3,900원으로 심층 사주 열기',
      paid_patent: '📌 마자샘 김경희의 특허출원 리딩 구조 기반\n출생 정보와 질문을 바탕으로 심층 리딩을 구성합니다.',
      paid_done: '✦ 심층 사주 완료',
      btn_pdf: '📜 PDF 사주첩 내려받기',
      btn_restart: '처음으로',
      kakao_login: '💬 카카오로 회원가입 / 로그인',
      kakao_channel: '⭐ 카카오톡 채널 추가하기',
      about_summary: '이 사주는 어떻게 만들어졌나요?',
      about1: '조선사주는 마자샘 김경희의 특허출원 리딩 구조를 바탕으로 합니다.',
      about2: '사주(四柱)·오행·십성의 상징 체계를 함께 살펴 지금의 흐름을 문화적·상징적으로 읽어드립니다.',
      about3: '의료·법률·투자·재무·심리치료 등 전문 자문을 대체하지 않습니다.',
      footer_disc: '사주(四柱)·명리의 상징 체계를 함께 읽는 문화적·상징적 리딩입니다.',
      footer_copy: '© 2026 조선사주 · All Rights Reserved',
      idol1: '첫 번째 인연', idol2: '두 번째 인연', idol3: '세 번째 인연',
      scroll_hint: '스크롤 ↓',
      result_meta_strong: { 신강: '신강', 중화: '중화', 신약: '신약' },
      reopen_title: '✦ 저장된 내 사주', reopen_expired: '이 결과는 만료되었습니다 (2주간 보관).',
      delivered: 'PDF 사주첩을 함께 보내드렸습니다 — ',
    },
  };

  function pick() {
    var stored = null;
    try { stored = localStorage.getItem('joseon_lang'); } catch (e) {}
    return DICT[stored] ? stored : 'en'; // 기본 영어
  }

  var I18N = {
    lang: pick(),
    t: function (key) { var d = DICT[I18N.lang] || DICT.en; return (key in d) ? d[key] : (DICT.en[key] != null ? DICT.en[key] : key); },
    apply: function (lang) {
      if (DICT[lang]) I18N.lang = lang;
      window.__LANG__ = I18N.lang;
      try { localStorage.setItem('joseon_lang', I18N.lang); } catch (e) {}
      document.documentElement.lang = I18N.lang === 'en' ? 'en' : 'ko';
      var d = DICT[I18N.lang];
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var v = d[el.getAttribute('data-i18n')]; if (v != null) el.textContent = v;
      });
      document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
        var v = d[el.getAttribute('data-i18n-html')]; if (v != null) el.innerHTML = v;
      });
      document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
        var v = d[el.getAttribute('data-i18n-ph')]; if (v != null) el.setAttribute('placeholder', v);
      });
      document.querySelectorAll('.lang__btn').forEach(function (b) {
        var on = (b.getAttribute('data-lang') === (I18N.lang === 'en' ? 'ENG' : 'KOR'));
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: I18N.lang } }));
    },
  };

  window.I18N = I18N;
  window.__LANG__ = I18N.lang;

  document.addEventListener('DOMContentLoaded', function () {
    I18N.apply(I18N.lang);
    document.querySelectorAll('.lang__btn').forEach(function (b) {
      b.addEventListener('click', function () {
        I18N.apply(b.getAttribute('data-lang') === 'KOR' ? 'ko' : 'en');
      });
    });
  });
})();
