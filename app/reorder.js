// 並べ替えの純粋ロジック：配列の from 番目を to 番目へ移動した新しい配列を返す。
// to は範囲外でも端に丸める。元配列は壊さない（テストしやすい純粋関数）。
export function moveItem(arr, from, to) {
  const n = arr.length;
  const next = arr.slice();
  if (from < 0 || from >= n) return next;
  const dest = Math.max(0, Math.min(n - 1, to));
  const [x] = next.splice(from, 1);
  next.splice(dest, 0, x);
  return next;
}
