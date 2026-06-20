// 通知タイミングの純粋ロジック（テストしやすい形）。
// アイテムごとに「いつ思い出すか」を選べるようにする。

export const REMIND_OPTIONS = [
  { key: 'none', label: 'なし' },
  { key: 'tomorrow', label: '明日' },
  { key: '3days', label: '3日後' },
  { key: 'week', label: '1週間後' },
];

const DAY = 24 * 60 * 60;

// 選択 → 通知までの秒数（なし/未知は null）
export function reminderSeconds(choice) {
  switch (choice) {
    case 'tomorrow': return DAY;
    case '3days': return 3 * DAY;
    case 'week': return 7 * DAY;
    default: return null;
  }
}

// 期限から既定の「思い出す時期」を決める
export function defaultRemindForDue(dueTag) {
  switch (dueTag) {
    case 'thisWeek': return '3days';
    case 'thisMonth': return 'week';
    default: return '3days';
  }
}

// 表示名
export function remindLabel(choice) {
  const o = REMIND_OPTIONS.find((x) => x.key === choice);
  return o ? o.label : 'なし';
}
