// ホームタブの「どのカードを表示するか」を決める純粋関数。
// App.js内に散らばっていたのをここへまとめ、テストできる形にする。
import { byHeatThenNew } from './heat';

// 選択中のフィルタ（すべて/叶えた/本気/カテゴリ別/SNS別）に応じて表示するアイテムを返す。
export function visibleItems(items, filter) {
  if (filter === 'done') return items.filter((it) => it.doneAt);
  if (filter === 'serious') return items.filter((it) => !it.doneAt && (it.heat || 2) === 3).slice().sort(byHeatThenNew);
  if (filter.startsWith('sns:')) {
    const p = filter.slice(4);
    return items.filter((it) => !it.doneAt && it.sourcePlatform === p).slice().sort(byHeatThenNew);
  }
  if (filter === 'all') return items.filter((it) => !it.doneAt); // 手動並べ替えの順（配列順）をそのまま表示
  return items.filter((it) => !it.doneAt && it.category === filter).slice().sort(byHeatThenNew);
}

// 保存元SNS（重複なし・未達成のみ）。サービス別の絞り込みチップに使う。
export function snsPlatformsPresent(items) {
  return [...new Set(items.filter((it) => !it.doneAt && it.sourcePlatform).map((it) => it.sourcePlatform))];
}

// 「そろそろ思い出す」：締切が近い（今日/今週）未達成を先頭から最大 limit 件。
export function upcomingItems(items, limit = 4) {
  return items.filter((it) => !it.doneAt && (it.dueTag === 'today' || it.dueTag === 'thisWeek')).slice(0, limit);
}
