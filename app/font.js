// 文字の太さ(fontWeight)から、使うフォントファミリーを選ぶ純粋ロジック。
// フォント名の文字列は App.js の FONT と対応（循環インポートを避けるためここでは文字列を直書き）。

export const BASE_FAMILIES = {
  base: 'ZenMaruGothic_400Regular',
  med: 'ZenMaruGothic_500Medium',
  bold: 'ZenMaruGothic_700Bold',
  xbold: 'ZenMaruGothic_900Black',
};

export function baseFamily(weight) {
  const w = parseInt(weight, 10) || 400;
  if (w >= 800) return BASE_FAMILIES.xbold;
  if (w >= 700) return BASE_FAMILIES.bold;
  if (w >= 500) return BASE_FAMILIES.med;
  return BASE_FAMILIES.base;
}
