// 真实模拟用户测试：启动 chromium、打开 selftest URL、抓 console、跑流程
import { chromium } from 'playwright-chromium';

const errors = [];
const warnings = [];
const logs = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1024, height: 720 } });
const page = await context.newPage();

page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message + '\n  ' + (e.stack || '').split('\n').slice(0, 3).join('\n  ')));
page.on('console', (msg) => {
  const t = msg.type();
  const text = msg.text();
  if (t === 'error') errors.push('CONSOLE.ERROR: ' + text);
  else if (t === 'warning') warnings.push('WARN: ' + text);
  else logs.push(`[${t}] ${text.slice(0, 200)}`);
});

console.log('1. 打开 http://localhost:18473/?selftest=1');
await page.goto('http://localhost:18473/?selftest=1', { waitUntil: 'domcontentloaded', timeout: 20000 });

// 等待 PreloadScene 加载完
console.log('2. 等待 8 秒让 Preload 加载完...');
await page.waitForTimeout(8000);

// 在 StartScene 页面点 Space 进 GameScene
console.log('3. 按 Space 进 GameScene...');
await page.keyboard.press('Space');
await page.waitForTimeout(1500);
await page.keyboard.press('Space');  // 双保险
await page.waitForTimeout(8000);

// 抓取 __selftest 结果
const result = await page.evaluate(() => {
  const r = window.__selftest || null;
  const ls = localStorage.getItem('selftest_result');
  return { result: r, ls: ls ? JSON.parse(ls) : null };
});

console.log('\n=== SELFTEST RESULT ===');
console.log(JSON.stringify(result, null, 2));

// 抓个截图
await page.screenshot({ path: '/tmp/selftest-screenshot.png' });
console.log('\n截图保存到 /tmp/selftest-screenshot.png');

console.log('\n=== Console Logs ===');
logs.forEach(l => console.log(l));

if (warnings.length) {
  console.log('\n=== Warnings ===');
  warnings.forEach(w => console.log(w));
}

if (errors.length) {
  console.log('\n=== ERRORS (' + errors.length + ') ===');
  errors.forEach((e, i) => { console.log('--- #' + (i + 1) + ' ---'); console.log(e); });
  await browser.close();
  process.exit(1);
}

console.log('\n✓ No console errors during selftest.');
await browser.close();
