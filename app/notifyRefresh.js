// 通知の「中身（タイトル・カテゴリ）」を最新にそろえるための純粋ロジック。
// 予約済みの通知は、予約した時点のタイトルで届く。詳細画面でタイトルやカテゴリを
// 書き換えたら、同じタイミングのまま予約し直して、新しい名前で届くようにする。

import { reminderPlan, reminderSeconds } from './notify';

// 予約し直しが必要か：通知が予約されていて未達成、かつタイトル/カテゴリが変わったとき。
// before = 今の通知を予約した時点のアイテム、after = 今のアイテム。
export function reminderContentChanged(before, after) {
  if (!before || !after) return false;
  if (after.doneAt || !after.notifId) return false;
  if (before.notifId !== after.notifId) return false; // 別の予約に変わっている＝比べる相手が違う
  return before.title !== after.title || before.category !== after.category;
}

// 「今のタイミングのまま」予約し直すためのプラン（純粋関数）。null＝触らない。
// 明日/3日後/1週間後は「設定した時刻＋日数」の時刻を日時指定で予約する
// （今から数え直すと、通知が後ろにずれてしまうため）。
// その時刻がもう過ぎている（届き済み・または推定がずれている）なら、今の予約には触らない。
export function keepTimingPlan(item, now = Date.now()) {
  const r = (item && item.remind) || 'none';
  const secs = reminderSeconds(r);
  if (secs == null) return reminderPlan(item, now); // 日時指定・毎日・毎週はそのまま
  const at = (item.remindSetAt || item.createdAt || 0) + secs * 1000;
  if (at <= now) return null;
  return { kind: 'date', at };
}
