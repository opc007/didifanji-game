import { defineConfig } from "vite";

/** GitHub Pages: https://opc007.github.io/didifanji-game/ */
export default defineConfig({
  base: "/didifanji-game/",
  build: {
    outDir: "dist",
    assetsInlineLimit: 0
  }
});
