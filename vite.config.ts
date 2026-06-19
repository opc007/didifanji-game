import { defineConfig } from "vite";
import { mobileAssetsPlugin } from "./scripts/vite-plugin-mobile-assets";

/** GitHub Pages: https://opc007.github.io/didifanji-game/ */
export default defineConfig({
  base: "/didifanji-game/",
  build: {
    outDir: "dist",
    assetsInlineLimit: 0
  },
  plugins: [
    mobileAssetsPlugin({ thresholdKB: 200, quality: "40-65" })
  ]
});
