// 深度全流程测试：模拟真实用户操作，覆盖所有核心系统
import { chromium } from 'playwright-chromium';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1024, height: 720 } });

const errors = [];
const warnings = [];
page.on('pageerror', (e) => {
  const msg = 'PAGEERR: ' + e.message + '\n  ' + (e.stack || '').split('\n').slice(0, 5).join('\n  ');
  errors.push(msg);
  console.error('  [ERR]', e.message.split('\n')[0]);
});
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error') {
    errors.push('CONSOLE: ' + text);
    console.error('  [CONSOLE-ERR]', text.split('\n')[0]);
  }
});

let passed = 0;
let failed = 0;
function ok(label) { passed++; console.log(`  ✓ ${label}`); }
function fail(label, reason) { failed++; errors.push(`TEST FAIL: ${label} - ${reason}`); console.error(`  ✗ ${label}: ${reason}`); }

console.log('=== 深度全流程测试 ===\n');

// ─── 1. 加载 ─────────────────────────────────────────
console.log('[1] 加载游戏...');
await page.goto('http://localhost:18473/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(6000);
const title = await page.title();
ok(`页面加载完成: ${title}`);

// ─── 2. StartScene ───────────────────────────────────
console.log('\n[2] StartScene 测试...');
const hasStartBtn = await page.evaluate(() => {
  const game = window.__game;
  if (!game) return false;
  const scene = game.scene.getScene('StartScene');
  return scene && scene.scene.isActive();
});
hasStartBtn ? ok('StartScene 已激活') : fail('StartScene', '未激活');

// ─── 3. Settings 场景 ────────────────────────────────
console.log('\n[3] SettingsScene 测试...');
await page.evaluate(() => window.__game.scene.start('SettingsScene'));
await page.waitForTimeout(1500);
const settingsOk = await page.evaluate(() => {
  const s = window.__game.scene.getScene('SettingsScene');
  return s && s.scene.isActive();
});
settingsOk ? ok('SettingsScene 打开成功') : fail('SettingsScene', '无法打开');

// 测试滑块交互
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(300);
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(300);
ok('设置滑块键盘交互无报错');

// 回主菜单
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);

// ─── 4. Codex 场景 ───────────────────────────────────
console.log('\n[4] CodexScene 测试...');
await page.evaluate(() => window.__game.scene.start('CodexScene'));
await page.waitForTimeout(1500);
const codexOk = await page.evaluate(() => {
  const s = window.__game.scene.getScene('CodexScene');
  return s && s.scene.isActive();
});
codexOk ? ok('CodexScene 打开成功') : fail('CodexScene', '无法打开');
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);

// ─── 5. SecretScene ──────────────────────────────────
console.log('\n[5] SecretScene 测试...');
await page.evaluate(() => window.__game.scene.start('SecretScene'));
await page.waitForTimeout(1500);
const secretOk = await page.evaluate(() => {
  const s = window.__game.scene.getScene('SecretScene');
  return s && s.scene.isActive();
});
secretOk ? ok('SecretScene 打开成功') : fail('SecretScene', '无法打开');
await page.keyboard.press('Escape');
await page.waitForTimeout(1000);

// ─── 6. 逐关深度测试 ─────────────────────────────────
console.log('\n[6] 逐关深度测试 (10关)...');
for (let i = 0; i < 10; i++) {
  const levelErrors = [];
  const origErrCount = errors.length;

  await page.evaluate((idx) => {
    window.__game.scene.start('GameScene', { levelIndex: idx });
  }, i);
  await page.waitForTimeout(2000);

  // 等待场景完全创建
  const sceneReady = await page.evaluate(() => {
    const g = window.__game;
    const gs = g.scene.getScene('GameScene');
    return gs && gs.scene.isActive() && gs.player != null;
  });
  if (!sceneReady) {
    fail(`关卡 ${i + 1}`, 'GameScene 未就绪或 player 为 null');
    await page.evaluate(() => window.__game.scene.start('StartScene'));
    await page.waitForTimeout(1000);
    continue;
  }

  // 模拟真实操作序列：跑 → 跳 → 攻击 → 跑 → 下砸
  // 向右跑
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.keyboard.press('Space'); // 跳
  await page.waitForTimeout(400);
  await page.keyboard.press('j');     // 攻击/投射
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(200);

  // 向左跑
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(600);
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(200);

  // 下砸
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowDown');
  await page.waitForTimeout(300);

  // 使用技能 T（嘲讽）和 Y（呐喊）
  await page.keyboard.press('t');
  await page.waitForTimeout(500);
  await page.keyboard.press('y');
  await page.waitForTimeout(500);

  // 再攻击几次触发连击
  for (let j = 0; j < 3; j++) {
    await page.keyboard.press('j');
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(500);

  // 检查玩家状态
  const playerState = await page.evaluate(() => {
    const gs = window.__game.scene.getScene('GameScene');
    if (!gs || !gs.player || !gs.state) return null;
    return {
      x: Math.round(gs.player.x),
      y: Math.round(gs.player.y),
      hp: gs.state.hp,
      coins: gs.state.coins,
      activeItem: gs.state.activeItem,
    };
  });

  const newErrCount = errors.length;
  const levelHadErrors = newErrCount > origErrCount;

  if (playerState && !levelHadErrors) {
    ok(`关卡 ${i + 1}: player@(${playerState.x},${playerState.y}) hp=${playerState.hp} coins=${playerState.coins}`);
  } else if (levelHadErrors) {
    fail(`关卡 ${i + 1}`, `${newErrCount - origErrCount} 个 JS 错误`);
  } else {
    fail(`关卡 ${i + 1}`, '无法获取玩家状态');
  }

  // 回 StartScene 准备下一关
  await page.evaluate(() => window.__game.scene.start('StartScene'));
  await page.waitForTimeout(800);
}

// ─── 7. 连续游玩压力测试 ─────────────────────────────
console.log('\n[7] 连续游玩压力测试 (30秒)...');
await page.evaluate(() => window.__game.scene.start('GameScene', { levelIndex: 0 }));
await page.waitForTimeout(2000);

const stressStart = errors.length;
const actions = [
  () => page.keyboard.down('ArrowRight'),
  () => page.keyboard.up('ArrowRight'),
  () => page.keyboard.down('ArrowLeft'),
  () => page.keyboard.up('ArrowLeft'),
  () => page.keyboard.press('Space'),
  () => page.keyboard.press('j'),
  () => page.keyboard.press('t'),
  () => page.keyboard.press('y'),
  () => page.keyboard.down('ArrowDown'),
  () => page.keyboard.up('ArrowDown'),
];

const stressEnd = Date.now() + 30000;
while (Date.now() < stressEnd) {
  const action = actions[Math.floor(Math.random() * actions.length)];
  await action();
  await page.waitForTimeout(100 + Math.random() * 200);
}
await page.waitForTimeout(1000);

const stressErrors = errors.length - stressStart;
if (stressErrors === 0) {
  ok('30秒压力测试零报错');
} else {
  fail('压力测试', `${stressErrors} 个 JS 错误`);
}

// ─── 8. 移动速度验证 ─────────────────────────────────
console.log('\n[8] 移动速度验证...');
await page.evaluate(() => window.__game.scene.start('GameScene', { levelIndex: 0 }));
await page.waitForTimeout(2000);

const pos1 = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('GameScene');
  return gs && gs.player ? { x: gs.player.x, y: gs.player.y } : null;
});
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1000);
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(100);
const pos2 = await page.evaluate(() => {
  const gs = window.__game.scene.getScene('GameScene');
  return gs && gs.player ? { x: gs.player.x, y: gs.player.y } : null;
});

if (pos1 && pos2) {
  const dx = pos2.x - pos1.x;
  if (dx > 250) {
    ok(`1秒移动距离: ${Math.round(dx)}px (速度正常)`);
  } else {
    fail('移动速度', `1秒仅移动 ${Math.round(dx)}px，期望 >250px`);
  }
} else {
  fail('移动速度', '无法获取玩家位置');
}

// ─── 9. 自检模式 ─────────────────────────────────────
console.log('\n[9] 自检模式 (selftest)...');
await page.goto('http://localhost:18473/?selftest=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(8000);
await page.keyboard.press('Space'); // 进入 GameScene
await page.waitForTimeout(6000);

const selftest = await page.evaluate(() => window.__selftest);
if (selftest && selftest.passed) {
  ok(`自检通过: ${selftest.details || 'all checks ok'}`);
} else if (selftest) {
  fail('自检', `failed: ${JSON.stringify(selftest)}`);
} else {
  // selftest 可能还没跑完，再等一下
  await page.waitForTimeout(4000);
  const retry = await page.evaluate(() => window.__selftest);
  if (retry && retry.passed) {
    ok(`自检通过(重试): ${retry.details || 'all checks ok'}`);
  } else {
    fail('自检', retry ? `failed: ${JSON.stringify(retry)}` : 'selftest 结果为 null');
  }
}

// ─── 最终截图 ─────────────────────────────────────────
await page.screenshot({ path: '/tmp/playtest-deep.png', fullPage: false });

// ─── 汇总 ────────────────────────────────────────────
console.log('\n' + '='.repeat(50));
console.log(`测试结果: ${passed} 通过, ${failed} 失败`);
if (errors.length === 0) {
  console.log('✓ 零 JS 报错，全部通过！');
} else {
  console.log(`✗ 共 ${errors.length} 个 JS 错误:`);
  // 去重
  const unique = [...new Set(errors.map(e => e.split('\n')[0]))];
  unique.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
}
console.log('='.repeat(50));

await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
