import type { Plugin } from "vite";
import { execSync } from "child_process";
import { readdirSync, statSync, mkdirSync, existsSync, copyFileSync } from "fs";
import { join, relative } from "path";

/**
 * Vite 插件：构建时自动为大 PNG 生成压缩版（供手机端使用）。
 * 压缩后的文件放在 dist/assets/mobile/ 下，保持相同的目录结构。
 */
export function mobileAssetsPlugin(options?: { thresholdKB?: number; quality?: string }): Plugin {
  const thresholdKB = options?.thresholdKB ?? 200;
  const quality = options?.quality ?? "40-65";

  return {
    name: "mobile-assets",
    apply: "build",
    closeBundle() {
      const distDir = join(__dirname, "..", "dist");
      const mobileDir = join(distDir, "assets", "mobile");

      if (!existsSync(distDir)) return;
      mkdirSync(mobileDir, { recursive: true });

      // 收集所有大于阈值的 PNG
      const largePngs: string[] = [];
      const assetsDir = join(distDir, "assets");
      if (!existsSync(assetsDir)) return;

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

      console.log(`[mobile-assets] 发现 ${largePngs.length} 个大 PNG，压缩到 quality ${quality}...`);

      // 用 pngquant 批量压缩
      try {
        for (const src of largePngs) {
          const filename = src.split("/").pop()!;
          const dest = join(mobileDir, filename);
          execSync(
            `pngquant --quality=${quality} --speed 1 --force --output "${dest}" "${src}"`,
            { stdio: "pipe" }
          );
        }
      } catch (e) {
        // pngquant 可能对某些 PNG 失败，回退到 sips
        console.warn("[mobile-assets] pngquant 部分失败，用 sips 回退压缩...");
        for (const src of largePngs) {
          const filename = src.split("/").pop()!;
          const dest = join(mobileDir, filename);
          if (!existsSync(dest)) {
            try {
              execSync(`sips -s format png -s formatOptions low "${src}" --out "${dest}"`, { stdio: "pipe" });
            } catch {
              // 如果 sips 也失败，直接复制原文件
              copyFileSync(src, dest);
            }
          }
        }
      }

      // 打印压缩结果
      let originalTotal = 0;
      let compressedTotal = 0;
      for (const src of largePngs) {
        const filename = src.split("/").pop()!;
        const dest = join(mobileDir, filename);
        const origSize = statSync(src).size;
        originalTotal += origSize;
        if (existsSync(dest)) {
          compressedTotal += statSync(dest).size;
        } else {
          compressedTotal += origSize;
        }
      }

      const ratio = ((1 - compressedTotal / originalTotal) * 100).toFixed(0);
      console.log(
        `[mobile-assets] 压缩完成: ${(originalTotal/1024/1024).toFixed(1)}MB → ${(compressedTotal/1024/1024).toFixed(1)}MB (节省 ${ratio}%)`
      );
    }
  };
}
