// 振り返りシェアカード（Wrapped）の集計ロジック。テストしやすい純粋関数。
// 今はアプリ内に「自分用」で表示するだけ（画像化・シェアは将来）。

// 達成率・件数から、ひとことの診断ラベルを返す
export function wrappedLabel(rate, doneCount) {
  if (doneCount === 0) return 'これから叶える、はじまりの人';
  if (rate >= 70) return '即行動タイプ';
  if (rate >= 40) return 'じっくり叶えるタイプ';
  if (rate >= 15) return '夢を集めるタイプ';
  return '夢のコレクター';
}

// 達成済みアイテムの中で、もっとも多いカテゴリのキーを返す（同数なら先に多く出た方）
export function topCategoryKey(doneItems) {
  const counts = {};
  doneItems.forEach((it) => { counts[it.category] = (counts[it.category] || 0) + 1; });
  let best = null; let bestCount = 0;
  Object.keys(counts).forEach((key) => {
    if (counts[key] > bestCount) { best = key; bestCount = counts[key]; }
  });
  return { key: best, count: bestCount };
}

// items全体から、振り返りカードに表示する一式をまとめる
export function buildWrapped(items) {
  const done = items.filter((it) => it.doneAt);
  const total = items.length;
  const doneCount = done.length;
  const rate = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const top = topCategoryKey(done);
  const seriousDone = done.filter((it) => (it.heat || 2) === 3).length;
  const casualDone = done.filter((it) => (it.heat || 2) === 1).length;

  return {
    total,
    doneCount,
    rate,
    topCategoryKey: top.key,
    topCategoryCount: top.count,
    seriousDone,
    casualDone,
    label: wrappedLabel(rate, doneCount),
  };
}
