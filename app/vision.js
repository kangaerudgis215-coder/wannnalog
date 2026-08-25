// ビジョンボードの純粋ロジック（字体・進み具合タグの定義と検索）
// フォント名の文字列は App.js の FONT と対応（循環インポートを避けるためここでは文字列を直書き）。

// ビジョンカードの字体（3パターン）。登録時に1枚ずつ選べる。
export const VISION_FONTS = [
  { key: 'mincho', label: '明朝', family: 'ZenOldMincho_700Bold', spacing: 2 },
  { key: 'round', label: '丸ゴ', family: 'ZenMaruGothic_700Bold', spacing: 0.5 },
  { key: 'pop', label: 'ポップ', family: 'MochiyPopOne_400Regular', spacing: 1 },
];
export function visionFont(key) {
  return VISION_FONTS.find((f) => f.key === key) || VISION_FONTS[0];
}

// 進み具合タグ（実行中／計画中）。スタイリッシュに色＋アイコンで表示。
export const VISION_STATUS = [
  { key: 'planning', label: '計画中', color: '#3A8DDE', icon: 'bulb' },
  { key: 'doing', label: '実行中', color: '#43A047', icon: 'walk' },
];
export function visionStatus(key) {
  return VISION_STATUS.find((x) => x.key === key) || null;
}

// ビジョンボードの棚（実行中／計画中／そのほか）。表紙(hero)は棚には出さない。
export const VISION_SHELVES = [
  { key: 'doing', emoji: '🔥', label: '実行中の夢', match: (sl) => sl.status === 'doing' },
  { key: 'planning', emoji: '💡', label: '計画中の夢', match: (sl) => sl.status === 'planning' },
  { key: 'other', emoji: '✨', label: 'そのほかの夢', match: (sl) => !sl.status },
];

// 枠の一覧から、表紙に選ぶ1枚(hero)と、棚ごとに分けた残りを組み立てる。
// hero は「実行中」を優先し、無ければ写真つきの先頭。空の棚は結果から除く。
export function buildVisionBoard(slots) {
  const withImg = slots.filter((sl) => sl.imageUri);
  const hero = withImg.find((sl) => sl.status === 'doing') || withImg[0] || null;
  const rest = slots.filter((sl) => !hero || sl.id !== hero.id);
  const shelves = VISION_SHELVES.map((sec) => ({ ...sec, items: rest.filter(sec.match) })).filter((sec) => sec.items.length > 0);
  return { hero, shelves };
}
