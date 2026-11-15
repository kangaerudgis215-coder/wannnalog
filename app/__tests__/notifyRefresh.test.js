import { reminderContentChanged, keepTimingPlan } from '../notifyRefresh';

const DAY = 24 * 60 * 60 * 1000;
const base = { id: '1', title: 'ラーメン', category: 'eat', notifId: 'n1', doneAt: null };

describe('reminderContentChanged', () => {
  test('タイトルが変わったら予約し直す', () => {
    expect(reminderContentChanged(base, { ...base, title: '一蘭のラーメン' })).toBe(true);
  });
  test('カテゴリが変わったら予約し直す', () => {
    expect(reminderContentChanged(base, { ...base, category: 'go' })).toBe(true);
  });
  test('タイトルもカテゴリも同じなら何もしない', () => {
    expect(reminderContentChanged(base, { ...base, memo: 'メモだけ変更' })).toBe(false);
  });
  test('通知が無い・達成済みなら何もしない', () => {
    expect(reminderContentChanged(base, { ...base, title: 'x', notifId: null })).toBe(false);
    expect(reminderContentChanged(base, { ...base, title: 'x', doneAt: 123 })).toBe(false);
  });
  test('予約自体が別物に変わっていたら比べない', () => {
    expect(reminderContentChanged(base, { ...base, title: 'x', notifId: 'n2' })).toBe(false);
  });
  test('どちらかが無ければ何もしない', () => {
    expect(reminderContentChanged(null, base)).toBe(false);
    expect(reminderContentChanged(base, undefined)).toBe(false);
  });
});

describe('keepTimingPlan', () => {
  const now = 1_000_000_000_000;
  test('3日後：保存した時刻＋3日を日時指定で予約（今から数え直さない）', () => {
    const it = { remind: '3days', createdAt: now - DAY };
    expect(keepTimingPlan(it, now)).toEqual({ kind: 'date', at: now + 2 * DAY });
  });
  test('設定し直した時刻(remindSetAt)があればそちらを基準にする', () => {
    const it = { remind: 'tomorrow', createdAt: now - 5 * DAY, remindSetAt: now - 1000 };
    expect(keepTimingPlan(it, now)).toEqual({ kind: 'date', at: now - 1000 + DAY });
  });
  test('時刻がもう過ぎていたら触らない（null）', () => {
    expect(keepTimingPlan({ remind: 'week', createdAt: now - 8 * DAY }, now)).toBeNull();
  });
  test('日時指定・毎日・毎週は今の設定のまま', () => {
    expect(keepTimingPlan({ remind: 'at', remindAt: now + DAY }, now)).toEqual({ kind: 'date', at: now + DAY });
    expect(keepTimingPlan({ remind: 'daily', remindHour: 8, remindMinute: 30 }, now)).toEqual({ kind: 'daily', hour: 8, minute: 30 });
    expect(keepTimingPlan({ remind: 'weekly', remindWeekday: 2, remindHour: 9, remindMinute: 0 }, now)).toEqual({ kind: 'weekly', weekday: 2, hour: 9, minute: 0 });
  });
  test('通知なしは null', () => {
    expect(keepTimingPlan({ remind: 'none' }, now)).toBeNull();
    expect(keepTimingPlan(null, now)).toBeNull();
  });
});
