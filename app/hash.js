// IDや文字列から「毎回同じ結果になる（決定論的な）」数値を作る小道具。
// カードの縦横比・ピンの色・付箋の傾きなど、再描画しても見た目がガタつかないようにするために使う。
export function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// 画像の縦横比は 1:1 / 4:5 / 3:4 の3種類を、IDから決定論的に割り当て（再描画で変わらない）
export const CARD_ASPECTS = [1, 4 / 5, 3 / 4];
export function cardAspect(id) {
  return CARD_ASPECTS[hashCode(String(id)) % CARD_ASPECTS.length];
}
