import { notifyBucket, NOTIFY_SECTIONS, groupNotifyItems, notifyTotalCount, notifySubText } from '../notify';

const DAY = 86400000;

describe('notifyBucket', () => {
  const now = new Date('2026-07-01T10:00:00').getTime();

  test('at が null/未定義なら later', () => {
    expect(notifyBucket(null, now)).toBe('later');
    expect(notifyBucket(undefined, now)).toBe('later');
  });

  test('時刻が過ぎていれば past（お知らせ済み）', () => {
    expect(notifyBucket(now - 1000, now)).toBe('past');
    expect(notifyBucket(now, now)).toBe('past');
    expect(notifyBucket(now - 10 * DAY, now)).toBe('past');
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
  test('今日/今週/それ以降/お知らせ済みの順で並ぶ', () => {
    expect(NOTIFY_SECTIONS.map((s) => s.key)).toEqual(['today', 'week', 'later', 'past']);
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
    expect(groups.past).toEqual([]);
  });

  test('届き終わった1回きりの通知は「今日」ではなく「お知らせ済み」に入る（新しい順）', () => {
    const items = [
      { id: 'oldTomorrow', remind: 'tomorrow', createdAt: now - 10 * DAY }, // 9日前に届いた
      { id: 'pastAt', remind: 'at', remindAt: now - 60 * 1000 },           // 1分前に届いた
      { id: 'future', remind: 'at', remindAt: now + 1000 },
    ];
    const groups = groupNotifyItems(items, now);
    expect(groups.today.map((it) => it.id)).toEqual(['future']);
    expect(groups.past.map((it) => it.id)).toEqual(['pastAt', 'oldTomorrow']);
  });

  test('毎日/毎週の通知は昔に作ったものでもお知らせ済みにならない', () => {
    const items = [
      { id: 'daily', remind: 'daily', remindHour: 9, remindMinute: 0, createdAt: now - 100 * DAY },
      { id: 'weekly', remind: 'weekly', remindWeekday: 1, remindHour: 9, remindMinute: 0, createdAt: now - 100 * DAY },
    ];
    const groups = groupNotifyItems(items, now);
    expect(groups.past).toEqual([]);
    expect(notifyTotalCount(groups)).toBe(2);
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
    expect(groupNotifyItems([])).toEqual({ today: [], week: [], later: [], past: [] });
  });
});

describe('notifyTotalCount', () => {
  test('全区分が空なら0', () => {
    expect(notifyTotalCount({ today: [], week: [], later: [], past: [] })).toBe(0);
  });

  test('各区分の件数を合計する', () => {
    const groups = { today: [{ id: 'a' }], week: [{ id: 'b' }, { id: 'c' }], later: [{ id: 'd' }], past: [{ id: 'e' }] };
    expect(notifyTotalCount(groups)).toBe(5);
  });

  test('groupNotifyItemsの結果をそのまま渡しても数える', () => {
    const now = new Date('2026-07-01T10:00:00').getTime();
    const items = [
      { id: 'todayItem', remind: 'at', remindAt: now + 1000 },
      { id: 'laterItem', remind: 'at', remindAt: now + 30 * 24 * 60 * 60 * 1000 },
    ];
    expect(notifyTotalCount(groupNotifyItems(items, now))).toBe(2);
  });
});

describe('notifySubText', () => {
  const now = new Date('2026-07-01T10:00:00').getTime();

  test('これから届く通知は「思い出します」', () => {
    expect(notifySubText({ remind: 'daily', remindHour: 9, remindMinute: 0 }, now)).toBe('毎日 09:00に思い出します');
  });

  test('時刻が過ぎた1回きりの通知は「お知らせ済み」', () => {
    const at = new Date('2026-06-30T08:05:00').getTime();
    expect(notifySubText({ remind: 'at', remindAt: at }, now)).toBe('6/30 08:05にお知らせ済み');
    expect(notifySubText({ remind: 'tomorrow', createdAt: now - 5 * DAY }, now)).toBe('明日にお知らせ済み');
  });

  test('nowを省略しても動く', () => {
    expect(notifySubText({ remind: 'at', remindAt: Date.now() + DAY })).toMatch(/に思い出します$/);
  });
});
