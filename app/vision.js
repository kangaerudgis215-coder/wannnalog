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
