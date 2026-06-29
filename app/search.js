// 検索ロジック（純粋関数・テスト用に分離）
// タイトル・メモ・レシピ・誰とタグから、キーワードに一致するか判定する。

function norm(s) {
  return (s || '').toString().toLowerCase();
}

export function matchesSearch(item, query) {
  const q = norm(query).trim();
  if (!q) return true;
  const haystack = [item.title, item.memo, item.recipe, item.withWho].map(norm).join(' ');
  return haystack.includes(q);
}

export function searchItems(items, query) {
  return items.filter((it) => matchesSearch(it, query));
}
