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

function pad(n) { return String(n).padStart(2, '0'); }
const WD = ['日', '月', '火', '水', '木', '金', '土'];

// アイテムの通知設定 → 予約プラン（純粋関数）。
// remind: 'none'|'tomorrow'|'3days'|'week'|'at'|'daily'|'weekly'
// at: remindAt(ms) / daily・weekly: remindHour, remindMinute, remindWeekday(1=日)
export function reminderPlan(item, now = Date.now()) {
  const r = (item && item.remind) || 'none';
  if (r === 'at') {
    if (!item.remindAt || item.remindAt <= now) return null; // 過去/未設定は予約しない
    return { kind: 'date', at: item.remindAt };
  }
  if (r === 'daily') return { kind: 'daily', hour: item.remindHour ?? 9, minute: item.remindMinute ?? 0 };
  if (r === 'weekly') return { kind: 'weekly', weekday: item.remindWeekday ?? 1, hour: item.remindHour ?? 9, minute: item.remindMinute ?? 0 };
  const secs = reminderSeconds(r);
  return secs ? { kind: 'interval', seconds: secs } : null;
}

// 次に思い出す予定の時刻(ms)を推定（純粋関数・通知画面の時系列グループ分けに使う）。
// interval(明日/3日後/1週間後)は createdAt を基準に概算する。
export function nextRemindAt(item, now = Date.now()) {
  const r = (item && item.remind) || 'none';
  if (r === 'none') return null;
  if (r === 'at') return item.remindAt || null;
  if (r === 'daily') {
    const d = new Date(now); d.setHours(item.remindHour ?? 9, item.remindMinute ?? 0, 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  if (r === 'weekly') {
    const d = new Date(now); d.setHours(item.remindHour ?? 9, item.remindMinute ?? 0, 0, 0);
    const targetDow = ((item.remindWeekday ?? 1) - 1 + 7) % 7; // 1=日 → 0=Sun
    let add = (targetDow - d.getDay() + 7) % 7;
    if (add === 0 && d.getTime() <= now) add = 7;
    d.setDate(d.getDate() + add);
    return d.getTime();
  }
  const secs = reminderSeconds(r);
  if (secs == null) return null;
  return (item.createdAt || now) + secs * 1000;
}

// 表示用の要約（純粋関数）
export function remindSummary(item) {
  const r = (item && item.remind) || 'none';
  if (r === 'at' && item.remindAt) {
    const d = new Date(item.remindAt);
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  if (r === 'daily') return `毎日 ${pad(item.remindHour ?? 9)}:${pad(item.remindMinute ?? 0)}`;
  if (r === 'weekly') return `毎週${WD[(item.remindWeekday ?? 1) - 1]} ${pad(item.remindHour ?? 9)}:${pad(item.remindMinute ?? 0)}`;
  return remindLabel(r);
}
