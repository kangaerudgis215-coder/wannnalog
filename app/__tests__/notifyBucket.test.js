import { notifyBucket, NOTIFY_SECTIONS } from '../notify';

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
