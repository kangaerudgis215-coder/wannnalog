import { DAY_MS, WEEKDAY_LABELS, startOfDay, achievementRate, weeklyDoneCounts, currentStreak } from '../stats';

describe('startOfDay', () => {
  test('時刻を00:00:00に揃える', () => {
    const ts = new Date(2026, 5, 21, 15, 30, 0).getTime();
    const result = new Date(startOfDay(ts));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(21);
  });
});

describe('achievementRate', () => {
  test('保存が0件なら0%', () => {
    expect(achievementRate(0, 0)).toBe(0);
  });
  test('達成数/総数を%に四捨五入', () => {
    expect(achievementRate(1, 3)).toBe(33);
    expect(achievementRate(2, 4)).toBe(50);
  });
});

describe('weeklyDoneCounts', () => {
  test('直近7日分（古い→新しい）の配列を返す', () => {
    const now = new Date(2026, 5, 21, 10, 0, 0).getTime();
    const { week, counts } = weeklyDoneCounts([], now);
    expect(week).toHaveLength(7);
    expect(counts).toHaveLength(7);
    expect(counts.every((c) => c === 0)).toBe(true);
    expect(new Date(week[6]).getDate()).toBe(21);
    expect(new Date(week[0]).getDate()).toBe(15);
  });

  test('doneAtの日付ごとに達成数を数える', () => {
    const now = new Date(2026, 5, 21, 10, 0, 0).getTime();
    const todayDoneAt = new Date(2026, 5, 21, 18, 0, 0).getTime();
    const yesterdayDoneAt1 = new Date(2026, 5, 20, 9, 0, 0).getTime();
    const yesterdayDoneAt2 = new Date(2026, 5, 20, 21, 0, 0).getTime();
    const done = [
      { doneAt: todayDoneAt },
      { doneAt: yesterdayDoneAt1 },
      { doneAt: yesterdayDoneAt2 },
    ];
    const { counts } = weeklyDoneCounts(done, now);
    expect(counts[6]).toBe(1); // 今日
    expect(counts[5]).toBe(2); // 昨日
    expect(counts.slice(0, 5).every((c) => c === 0)).toBe(true);
  });
});

describe('currentStreak', () => {
  test('達成が1件もなければ0', () => {
    const now = new Date(2026, 5, 21, 10, 0, 0).getTime();
    expect(currentStreak([], now)).toBe(0);
  });

  test('今日から連続で達成があれば日数を数える', () => {
    const now = new Date(2026, 5, 21, 10, 0, 0).getTime();
    const items = [
      { doneAt: new Date(2026, 5, 21, 9, 0, 0).getTime() }, // 今日
      { doneAt: new Date(2026, 5, 20, 9, 0, 0).getTime() }, // 昨日
      { doneAt: new Date(2026, 5, 19, 9, 0, 0).getTime() }, // 一昨日
    ];
    expect(currentStreak(items, now)).toBe(3);
  });

  test('途中で途切れていればそこで止まる', () => {
    const now = new Date(2026, 5, 21, 10, 0, 0).getTime();
    const items = [
      { doneAt: new Date(2026, 5, 21, 9, 0, 0).getTime() }, // 今日
      { doneAt: new Date(2026, 5, 19, 9, 0, 0).getTime() }, // 一昨日（昨日が抜けている）
    ];
    expect(currentStreak(items, now)).toBe(1);
  });

  test('今日まだ達成していなければ0', () => {
    const now = new Date(2026, 5, 21, 10, 0, 0).getTime();
    const items = [
      { doneAt: new Date(2026, 5, 20, 9, 0, 0).getTime() }, // 昨日
    ];
    expect(currentStreak(items, now)).toBe(0);
  });
});

test('WEEKDAY_LABELSは日〜土の7要素', () => {
  expect(WEEKDAY_LABELS).toEqual(['日', '月', '火', '水', '木', '金', '土']);
});

test('DAY_MSは24時間のミリ秒', () => {
  expect(DAY_MS).toBe(24 * 60 * 60 * 1000);
});
