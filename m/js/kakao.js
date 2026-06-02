'use strict';
/**
 * kakao.js — 카카오 로그인(회원가입) + 채널 친구추가
 * 서버 /api/config 의 kakaoJsKey / kakaoChannelId 가 있을 때만 버튼을 노출·활성화.
 * 키가 없으면 버튼은 숨김(기능 불가) → 데모 환경에서도 안전.
 */
(function () {
  function $(id) { return document.getElementById(id); }

  document.addEventListener('DOMContentLoaded', function () {
    fetch('/api/config').then(function (r) { return r.json(); }).then(function (cfg) {
      cfg = cfg || {};
      var hasKakao = !!(window.Kakao && cfg.kakaoJsKey);
      if (hasKakao) { try { if (!Kakao.isInitialized()) Kakao.init(cfg.kakaoJsKey); } catch (e) { hasKakao = false; } }

      // 채널 친구추가 버튼
      if (cfg.kakaoChannelId) {
        ['btn-kakao-channel', 'btn-kakao-channel-foot'].forEach(function (id) {
          var b = $(id); if (!b) return;
          b.classList.remove('is-hidden');
          b.addEventListener('click', function () {
            if (hasKakao && Kakao.Channel && Kakao.Channel.addChannel) {
              try { return Kakao.Channel.addChannel({ channelPublicId: cfg.kakaoChannelId }); } catch (e) {}
            }
            window.open('https://pf.kakao.com/' + cfg.kakaoChannelId, '_blank', 'noopener');
          });
        });
      }

      // 카카오 로그인(회원가입) 버튼
      if (hasKakao) {
        var lb = $('btn-kakao-login');
        if (lb) { lb.classList.remove('is-hidden'); lb.addEventListener('click', kakaoLogin); }
      }
    }).catch(function () {});
  });

  function kakaoLogin() {
    if (!(window.Kakao && Kakao.Auth)) return;
    Kakao.Auth.login({
      scope: 'account_email,profile_nickname',
      success: function () {
        Kakao.API.request({
          url: '/v2/user/me',
          success: function (res) {
            var acc = res.kakao_account || {};
            var email = acc.email || '';
            var nick = (acc.profile && acc.profile.nickname) || '';
            var e = $('contact-email'); if (email && e && !e.value) e.value = email;
            var n = $('person-name'); if (nick && n && !n.value) n.value = nick;
            try { localStorage.setItem('joseon_user', JSON.stringify({ email: email, nick: nick })); } catch (_) {}
            var lb = $('btn-kakao-login');
            if (lb) lb.textContent = (window.__LANG__ === 'ko')
              ? ('✓ ' + (nick || '카카오') + ' 로그인됨')
              : ('✓ Logged in' + (nick ? ' · ' + nick : ''));
          },
        });
      },
      fail: function () {},
    });
  }
})();
