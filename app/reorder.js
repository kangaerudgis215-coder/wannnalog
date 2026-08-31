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

// 手動並べ替え：未達成カードを activeIds の順に並べ、達成済みは元の順のまま末尾に保持した新しい配列を返す。
export function reorderedItems(items, activeIds) {
  const map = Object.fromEntries(items.map((it) => [it.id, it]));
  const active = activeIds.map((id) => map[id]).filter(Boolean);
  const done = items.filter((it) => it.doneAt);
  return [...active, ...done];
}
