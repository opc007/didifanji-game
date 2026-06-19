// 真实全流程测试：模拟点击 StartScene + 跳关卡到每一关 + 试运行每个场景
import { chromium } from 'playwright-chromium';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1024, height: 720 } });

const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERR: ' + e.message + '\n  ' + (e.stack || '').split('\n').slice(0, 5).join('\n  ')));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
});

await page.goto('http://localhost:18473/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(8000);

// 进入 StartScene，按 Space 开始
await page.keyboard.press('Space');
await page.waitForTimeout(2000);

// 在 GameScene 跑 4 秒
await page.waitForTimeout(4000);

// 按 Esc 回主菜单
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);

// 在主菜单，按 S 进 SettingsScene
await page.keyboard.press('s');
await page.waitForTimeout(1500);
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);

// 在主菜单，按 C 进 CodexScene
await page.keyboard.press('c');
await page.waitForTimeout(1500);
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);

// 直接通过 __game.scene.start 跳到每个关卡
const scenes = ['StartScene', 'SettingsScene', 'CodexScene', 'SecretScene'];
for (const s of scenes) {
  try {
    await page.evaluate((sceneName) => {
      window.__game.scene.start(sceneName);
    }, s);
    await page.waitForTimeout(800);
    console.log(`✓ scene ${s} opened without error`);
  } catch (e) {
    errors.push(`scene ${s}: ${e.message}`);
  }
}

// 跳到每个关卡，模拟 2 秒
for (let i = 0; i < 10; i++) {
  try {
    await page.evaluate((idx) => {
      window.__game.scene.start('GameScene', { levelIndex: idx });
    }, i);
    await page.waitForTimeout(2500);
    // 在关卡里移动几下
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(800);
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);
    console.log(`✓ level ${i + 1} ran without crash`);
  } catch (e) {
    errors.push(`level ${i + 1}: ${e.message}`);
  }
}

await page.screenshot({ path: '/tmp/playtest-all.png', fullPage: false });

if (errors.length === 0) {
  console.log('\n✓ ALL 10 LEVELS + 4 SCENES + SCENE SWITCHES passed with zero JS errors.');
} else {
  console.log('\n✗ ERRORS (' + errors.length + '):');
  errors.forEach((e, i) => console.log('  ' + (i + 1) + '. ' + e));
}

await browser.close();
