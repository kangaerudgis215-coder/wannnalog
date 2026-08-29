import { notifyBucket, NOTIFY_SECTIONS, groupNotifyItems } from '../notify';

const DAY = 86400000;

describe('notifyBucket', () => {
  const now = new Date('2026-07-01T10:00:00').getTime();

  test('at が null/未定義なら later', () => {
    expect(notifyBucket(null, now)).toBe('later');
    expect(notifyBucket(undefined, now)).toBe('later');
  });

  test('今日中(明日0時より前)は today', () => {
    expect(notifyBucket(now + 1000, now)).toBe('today');
  });

  test('明日〜6日後は week', () => {
    const tomorrowStart = new Date('2026-07-02T00:00:00').getTime();
    expect(notifyBucket(tomorrowStart, now)).toBe('week');
    expect(notifyBucket(tomorrowStart + 6 * DAY - 1, now)).toBe('week');
  });

  test('7日後以降は later', () => {
    const weekLater = new Date('2026-07-01T00:00:00').getTime() + 7 * DAY;
    expect(notifyBucket(weekLater, now)).toBe('later');
  });

  test('nowを省略しても動く（現在時刻を使う）', () => {
    expect(notifyBucket(null)).toBe('later');
  });
});

describe('NOTIFY_SECTIONS', () => {
  test('今日/今週/それ以降の順で並ぶ', () => {
    expect(NOTIFY_SECTIONS.map((s) => s.key)).toEqual(['today', 'week', 'later']);
  });
});

describe('groupNotifyItems', () => {
  const now = new Date('2026-07-01T10:00:00').getTime();

  test('達成済み・通知なしのアイテムは除外する', () => {
    const items = [
      { id: 'done', remind: 'tomorrow', doneAt: 1, createdAt: now },
      { id: 'none', remind: 'none', createdAt: now },
      { id: 'unset', createdAt: now },
    ];
    const groups = groupNotifyItems(items, now);
    expect(groups.today).toEqual([]);
    expect(groups.week).toEqual([]);
    expect(groups.later).toEqual([]);
  });

  test('今日/今週/それ以降に振り分ける', () => {
    const items = [
      { id: 'todayItem', remind: 'at', remindAt: now + 1000 },
      { id: 'weekItem', remind: '3days', createdAt: now },
      { id: 'laterItem', remind: 'at', remindAt: now + 30 * 24 * 60 * 60 * 1000 },
    ];
    const groups = groupNotifyItems(items, now);
    expect(groups.today.map((it) => it.id)).toEqual(['todayItem']);
    expect(groups.week.map((it) => it.id)).toEqual(['weekItem']);
    expect(groups.later.map((it) => it.id)).toEqual(['laterItem']);
  });

  test('同じ区分内では次に思い出す時刻が早い順', () => {
    const items = [
      { id: 'later', remind: 'at', remindAt: now + 2000 },
      { id: 'sooner', remind: 'at', remindAt: now + 1000 },
    ];
    const groups = groupNotifyItems(items, now);
    expect(groups.today.map((it) => it.id)).toEqual(['sooner', 'later']);
  });

  test('次に思い出す時刻が不明（null）なアイテムはlaterに回る', () => {
    const items = [
      { id: 'unknown', remind: 'at' }, // remindAt未設定 → nextRemindAtはnull
      { id: 'known', remind: 'at', remindAt: now + 1000 },
    ];
    const groups = groupNotifyItems(items, now);
    expect(groups.today.map((it) => it.id)).toEqual(['known']);
    expect(groups.later.map((it) => it.id)).toEqual(['unknown']);
  });

  test('順序が逆でも同じ結果になる（既知→不明の並び）', () => {
    const items = [
      { id: 'known2', remind: 'at', remindAt: now + 1000 },
      { id: 'unknown2', remind: 'at' },
    ];
    const groups = groupNotifyItems(items, now);
    expect(groups.today.map((it) => it.id)).toEqual(['known2']);
    expect(groups.later.map((it) => it.id)).toEqual(['unknown2']);
  });

  test('nowを省略しても動く（現在時刻を使う）', () => {
    expect(groupNotifyItems([])).toEqual({ today: [], week: [], later: [] });
  });
});
