const { chromium } = require('playwright');
const fs = require('fs');

const adapter = fs.readFileSync('/home/claude/heh-homework/auth-store.js', 'utf8');
const page_html = `<!doctype html><html><head><meta charset="utf-8"><title>t</title>
<script>${adapter}</script></head><body>ok</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });

  // Serve our harness at any https://*.civilinitiatives.org/ URL.
  await ctx.route(
    url => url.hostname === 'civilinitiatives.org' || url.hostname.endsWith('.civilinitiatives.org'),
    route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: page_html }));

  const page = await ctx.newPage();
  const results = [];
  const check = (name, pass, detail='') => {
    results.push({ name, pass, detail });
    console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  -- ' + detail : ''));
  };

  // ---- 1. small value round-trips on the apex
  await page.goto('https://civilinitiatives.org/');
  let r = await page.evaluate(() => {
    window.HEHAuth.storage.setItem('k-small', 'hello world');
    return { v: window.HEHAuth.storage.getItem('k-small'), onDomain: window.HEHAuth.onDomain };
  });
  check('apex is recognised as on-domain', r.onDomain === true, 'onDomain=' + r.onDomain);
  check('small value round-trips', r.v === 'hello world', JSON.stringify(r.v));

  // ---- 2. a realistic, oversized session value chunks and reassembles
  r = await page.evaluate(() => {
    const session = JSON.stringify({
      access_token: 'a'.repeat(2600), refresh_token: 'r'.repeat(900),
      user: { id: 'x'.repeat(200), email: 'pupil@example.com',
              meta: { note: 'quotes " commas , semicolons ; and £ unicode ✓' } }
    });
    window.HEHAuth.storage.setItem('sb-hehs-live-auth-token', session);
    const back = window.HEHAuth.storage.getItem('sb-hehs-live-auth-token');
    const names = document.cookie.split('; ').map(c => c.split('=')[0])
                    .filter(n => n.indexOf('sb-hehs-live-auth-token') === 0);
    const biggest = Math.max(...document.cookie.split('; ').map(c => c.length));
    return { same: back === session, len: session.length, chunks: names.length, biggest };
  });
  check('oversized session survives a round-trip', r.same,
        r.len + ' chars across ' + r.chunks + ' cookies');
  check('session really did need chunking', r.chunks > 1, r.chunks + ' cookies');
  check('every cookie stays under the 4KB limit', r.biggest < 4096, 'largest=' + r.biggest + ' bytes');

  // ---- 3. THE POINT: a subdomain sees the session written on the apex
  const sub = await ctx.newPage();
  await sub.goto('https://learn.civilinitiatives.org/');
  r = await sub.evaluate(() => ({
    onDomain: window.HEHAuth.onDomain,
    token: window.HEHAuth.get('sb-hehs-live-auth-token'),
    small: window.HEHAuth.storage.getItem('k-small')
  }));
  check('subdomain is recognised as on-domain', r.onDomain === true);
  check('SUBDOMAIN READS THE APEX SESSION', !!r.token && r.token.indexOf('"access_token":"aaa') > 0,
        r.token ? r.token.length + ' chars' : 'nothing found');
  check('subdomain reads the small value too', r.small === 'hello world');

  // ---- 4. signing out on the subdomain clears it for the apex as well
  await sub.evaluate(() => window.HEHAuth.storage.removeItem('sb-hehs-live-auth-token'));
  await page.reload();
  r = await page.evaluate(() => ({
    token: window.HEHAuth.get('sb-hehs-live-auth-token'),
    leftover: document.cookie.split('; ').filter(c => c.indexOf('sb-hehs-live') === 0).length
  }));
  check('sign-out on a subdomain clears the apex', r.token === null, 'got ' + JSON.stringify(r.token));
  check('no orphaned chunks left behind', r.leftover === 0, r.leftover + ' left');

  // ---- 5. an existing localStorage sign-in is migrated, not lost
  r = await page.evaluate(() => {
    localStorage.setItem('sb-hehs-live-auth-token', '{"access_token":"legacy-token"}');
    const got = window.HEHAuth.storage.getItem('sb-hehs-live-auth-token');
    const inCookie = document.cookie.indexOf('sb-hehs-live-auth-token') >= 0;
    return { got, inCookie, stillLocal: localStorage.getItem('sb-hehs-live-auth-token') };
  });
  check('an existing localStorage session is still found', r.got === '{"access_token":"legacy-token"}');
  check('and is copied into the cookie', r.inCookie === true);

  // ---- 6. off the domain (the lab on github.io) it falls back quietly
  await ctx.route(url => url.hostname === 'silocell.github.io',
    route => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: page_html }));
  const lab = await ctx.newPage();
  await lab.goto('https://silocell.github.io/HEH-Launchpad-Lab/');
  r = await lab.evaluate(() => {
    window.HEHAuth.storage.setItem('k-lab', 'lab value');
    return { onDomain: window.HEHAuth.onDomain,
             v: window.HEHAuth.storage.getItem('k-lab'),
             usedLocal: localStorage.getItem('k-lab') === 'lab value',
             cookies: document.cookie };
  });
  check('github.io is correctly NOT treated as on-domain', r.onDomain === false);
  check('lab falls back to localStorage and still works', r.v === 'lab value' && r.usedLocal);
  check('lab sets no cookie at all', r.cookies.indexOf('k-lab') === -1, JSON.stringify(r.cookies));

  await browser.close();
  const failed = results.filter(r => !r.pass);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' passed');
  process.exit(failed.length ? 1 : 0);
})();
