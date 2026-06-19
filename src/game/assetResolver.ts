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

export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return assetModules[`../../${path}`] ?? `${base}/${path}`;
}

export function audioUrls(files: { ogg?: string; mp3?: string; wav?: string }): string[] {
  return [files.ogg, files.mp3].filter(Boolean).map((file) => assetUrl(file!));
}
