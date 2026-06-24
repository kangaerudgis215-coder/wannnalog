// 検索の純粋ロジック：キーワードでタイトル・誰と・カテゴリ名にマッチするものだけ残す。
// 大文字小文字は無視。前後の空白は無視。空文字なら全件そのまま返す。
export function matchesQuery(item, query, categoryLabel) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  const haystack = [item.title, categoryLabel, item.withWho].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q);
}

export function searchItems(items, query, getCategoryLabel) {
  const q = (query || '').trim();
  if (!q) return items;
  return items.filter((it) => matchesQuery(it, q, getCategoryLabel ? getCategoryLabel(it.category) : null));
}
