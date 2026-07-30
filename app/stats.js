// 日付集計まわりの純粋関数（マイページ・通知・連続達成日数などで共通利用）。
// App.js内に散らばっていたのをここへまとめ、テストできる形にする。

export const DAY_MS = 86400000;
export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// 達成率（%）。保存が0件のときは0。
export function achievementRate(doneCount, total) {
  return total > 0 ? Math.round((doneCount / total) * 100) : 0;
}

// 直近7日（今日を含む）の達成数を、古い日→新しい日の順で返す。
export function weeklyDoneCounts(done, now = Date.now()) {
  const today = startOfDay(now);
  const week = [...Array(7)].map((_, i) => today - (6 - i) * DAY_MS);
  const counts = week.map((d) => done.filter((it) => startOfDay(it.doneAt) === d).length);
  return { week, counts };
}
