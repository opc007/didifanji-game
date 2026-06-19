import type { Plugin } from "vite";
import { execSync } from "child_process";
import { readdirSync, statSync, mkdirSync, existsSync, copyFileSync, renameSync } from "fs";
import { join } from "path";

/**
 * Vite 插件：构建时压缩所有大 PNG。
 * - 桌面端：quality 60-80（视觉几乎无损）
 * - 手机端：quality 35-55（更激进压缩）
 * 两套都在构建时生成，运行时自动选择。
 */
export function mobileAssetsPlugin(options?: { thresholdKB?: number }): Plugin {
  const thresholdKB = options?.thresholdKB ?? 100;

  return {
    name: "mobile-assets",
    apply: "build",
    closeBundle() {
      const distDir = join(__dirname, "..", "dist");
      const assetsDir = join(distDir, "assets");
      const mobileDir = join(assetsDir, "mobile");

      if (!existsSync(assetsDir)) return;
      mkdirSync(mobileDir, { recursive: true });

      // 收集所有大于阈值的 PNG
      const largePngs: string[] = [];
      for (const file of readdirSync(assetsDir)) {
        if (!file.endsWith(".png")) continue;
        const fullPath = join(assetsDir, file);
        const sizeKB = statSync(fullPath).size / 1024;
        if (sizeKB >= thresholdKB) {
          largePngs.push(fullPath);
        }
      }

      if (largePngs.length === 0) {
        console.log(`[mobile-assets] 没有超过 ${thresholdKB}KB 的 PNG，跳过`);
        return;
      }

      console.log(`[mobile-assets] 发现 ${largePngs.length} 个大 PNG，开始双重压缩...`);

      let desktopOriginal = 0;
      let desktopCompressed = 0;
      let mobileCompressed = 0;

      for (const src of largePngs) {
        const filename = src.split("/").pop()!;
        const origSize = statSync(src).size;
        desktopOriginal += origSize;

        // ── 桌面端：quality 60-80（原地替换）──
        const tmpFile = src + ".tmp";
        let desktopOk = false;
        try {
          execSync(
            `pngquant --quality=60-80 --speed 1 --force --output "${tmpFile}" "${src}"`,
            { stdio: "pipe" }
          );
          renameSync(tmpFile, src);
          desktopOk = true;
        } catch {
          try { execSync(`rm -f "${tmpFile}"`, { stdio: "pipe" }); } catch {}
        }
        desktopCompressed += desktopOk ? statSync(src).size : origSize;

        // ── 手机端：quality 35-55 ──
        const mobileDest = join(mobileDir, filename);
        let mobileOk = false;
        try {
          execSync(
            `pngquant --quality=35-55 --speed 1 --force --output "${mobileDest}" "${src}"`,
            { stdio: "pipe" }
          );
          mobileOk = true;
        } catch {
          // 回退：直接用桌面版
          if (!existsSync(mobileDest)) copyFileSync(src, mobileDest);
        }
        mobileCompressed += mobileOk ? statSync(mobileDest).size : (desktopOk ? statSync(src).size : origSize);
      }

      const desktopRatio = ((1 - desktopCompressed / desktopOriginal) * 100).toFixed(0);
      const mobileRatio = ((1 - mobileCompressed / desktopOriginal) * 100).toFixed(0);
      console.log(
        `[mobile-assets] 桌面: ${(desktopOriginal/1024/1024).toFixed(1)}MB → ${(desktopCompressed/1024/1024).toFixed(1)}MB (节省 ${desktopRatio}%)`
      );
      console.log(
        `[mobile-assets] 手机: → ${(mobileCompressed/1024/1024).toFixed(1)}MB (节省 ${mobileRatio}%)`
      );
    }
  };
}
