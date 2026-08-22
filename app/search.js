// ホームの「キーワードで検索」用の絞り込みロジック（純粋関数・UIから分離してテストしやすくする）
import { getCategory, getWith } from './theme';

// 検索対象になる文字列を1つにまとめる（タイトル・メモ・カテゴリ名・「誰と」）
function searchableText(item) {
  const cat = getCategory(item.category);
  const w = getWith(item.withWho);
  return [item.title, item.memo, cat?.label, w?.label]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

// 大文字小文字・前後の空白を無視した部分一致
export function matchesQuery(item, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  return searchableText(item).includes(q);
}

export function filterByQuery(items, query) {
  const q = (query || '').trim();
  if (!q) return items;
  return items.filter((it) => matchesQuery(it, q));
}
