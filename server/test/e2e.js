'use strict';
/**
 * e2e.js — 퍼널 자동 테스트 (서버 기동 → 브라우저로 전 과정 확인 → 종료)
 * 실행: npm run test:e2e   (chromium 필요: npx playwright install chromium)
 * 키가 없어도 mock 으로 동작하므로 그대로 통과해야 정상.
 */
const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.E2E_PORT || 3123;
const BASE = `http://localhost:${PORT}`;

let chromium = null;
try { chromium = require('playwright').chromium; }
catch (_) { try { chromium = require('playwright-core').chromium; } catch (e) {} }

function waitHealth(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    (function poll() {
      http.get(`${BASE}/api/health`, (r) => { r.resume(); r.statusCode === 200 ? resolve() : retry(); })
        .on('error', retry);
      function retry() { Date.now() > deadline ? reject(new Error('서버 기동 시간 초과')) : setTimeout(poll, 300); }
    })();
  });
}

const checks = [];
function check(name, cond) { checks.push({ name, ok: !!cond }); console.log((cond ? '  ✓ ' : '  ✗ ') + name); }

(async () => {
  if (!chromium) {
    console.log('⚠ playwright(chromium) 미설치 → E2E 건너뜀. `npx playwright install chromium` 후 다시 실행하세요.');
    process.exit(0);
  }

  // 1) 서버 기동 (mock 모드, 테스트 포트)
  const srv = spawn(process.execPath, ['server.js'], {
    cwd: __dirname + '/..',
    env: Object.assign({}, process.env, { PORT: String(PORT), APP_BASE_URL: BASE }),
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  let browser;
  try {
    await waitHealth(10000);
    console.log('서버 기동 완료:', BASE);

    browser = await chromium.launch({ args: ['--no-sandbox'] });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // 2) 기본 영어 로드
    await page.goto(`${BASE}/m/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    check('기본 언어가 영어', (await page.getAttribute('html', 'lang')) === 'en');
    check('히어로 CTA 영어', /free/i.test(await page.textContent('.idol-copy .btn--gold')));

    // 3) 한국어 토글
    await page.click('header .lang__btn[data-lang="KOR"]');
    await page.waitForTimeout(150);
    check('한국어 토글 동작', /무료/.test(await page.textContent('.idol-copy .btn--gold')));
    await page.click('header .lang__btn[data-lang="ENG"]');
    await page.waitForTimeout(150);

    // 4) 무료 맛보기
    await page.evaluate(() => document.querySelector('#search').scrollIntoView());
    await page.fill('#person-name', 'Mina');
    await page.fill('#birthdate', '19950722');
    await page.click('#btn-free');
    await page.waitForSelector('#free-result:not(.is-hidden)', { timeout: 10000 });
    check('무료 사주 결과 표시', (await page.textContent('#r-teaser')).length > 20);
    check('명식 4기둥 렌더', (await page.$$('#r-pillars .pillar')).length === 4);

    // 5) 유료(mock) → 심층 + 발송 + 재열람 링크
    await page.fill('#worry', 'Should I start a business?');
    await page.fill('#contact-email', 'test@example.com');
    await page.click('#btn-paid');
    await page.waitForFunction(() => {
      const b = document.querySelector('#paid-body');
      return b && !b.querySelector('.spinner') && b.textContent.length > 200;
    }, { timeout: 20000 });
    check('심층 리딩 항목 8개 이상', (await page.textContent('#paid-body')).split('○').length - 1 >= 8);
    check('발송 안내 표시', !(await page.$('#delivery-note.is-hidden')));

    // 6) 재열람(2주 토큰)
    const href = await page.getAttribute('#delivery-note a', 'href').catch(() => null);
    check('재열람 링크 생성', !!(href && /\/m\/\?r=/.test(href)));
    if (href) {
      const p2 = await ctx.newPage();
      await p2.goto(href, { waitUntil: 'networkidle' });
      await p2.waitForFunction(() => {
        const b = document.querySelector('#paid-body'); return b && b.textContent.length > 200;
      }, { timeout: 10000 });
      check('재열람으로 결과 복원', (await p2.textContent('#paid-body')).split('○').length - 1 >= 8);
      await p2.close();
    }

    check('콘솔 페이지 에러 없음', errors.length === 0);
    if (errors.length) console.log('   errors:', errors);
  } catch (e) {
    check('실행 오류 없음 (' + e.message + ')', false);
  } finally {
    if (browser) await browser.close().catch(() => {});
    srv.kill('SIGKILL');
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${failed.length ? '✗ 실패 ' + failed.length + '/' + checks.length : '✓ 전체 통과 (' + checks.length + ')'}`);
  process.exit(failed.length ? 1 : 0);
})();
