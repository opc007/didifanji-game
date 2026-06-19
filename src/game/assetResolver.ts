const assetModules = import.meta.glob(
  [
    "../../assets/characters/png/*.png",
    "../../assets/items/png/*.png",
    "../../assets/items/icons-128/*.png",
    "../../assets/transitions/start_screen.png",
    "../../assets/transitions/game_over_screen.png",
    "../../assets/transitions/victory_screen.png",
    "../../assets/concepts/levels/*.png",
    "../../assets/audio/**/*.ogg",
    "../../assets/audio/**/*.mp3"
  ],
  {
    eager: true,
    query: "?url",
    import: "default"
  }
) as Record<string, string>;

/** 检测是否为移动设备（基于屏幕宽度 + UA） */
const isMobile = (() => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const narrowScreen = window.innerWidth < 768;
  return mobileUA || narrowScreen;
})();

/**
 * 大图文件名集合（构建时由 vite-plugin-mobile-assets 生成压缩版）。
 * 只有这些文件在手机端会加载 mobile/ 子目录的压缩版本。
 */
const MOBILE_ASSET_THRESHOLD_KB = 200;

export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const resolved = assetModules[`../../${path}`] ?? `${base}/${path}`;

  // 手机端：如果文件名是大图，重定向到 mobile/ 子目录
  if (isMobile && path.endsWith(".png")) {
    const filename = resolved.split("/").pop();
    if (filename) {
      // 检查是否是大图文件名（包含已知的大图关键字）
      const isLargeAsset =
        /start_screen|game_over|victory_screen|level-\d{2}-map|sister_|brother_/.test(filename);
      if (isLargeAsset) {
        // 替换路径：.../assets/xxx.png → .../assets/mobile/xxx.png
        return resolved.replace(/\/assets\/([^/]+\.png)$/, "/assets/mobile/$1");
      }
    }
  }

  return resolved;
}

export function audioUrls(files: { ogg?: string; mp3?: string; wav?: string }): string[] {
  return [files.ogg, files.mp3].filter(Boolean).map((file) => assetUrl(file!));
}
