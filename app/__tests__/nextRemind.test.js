import { nextRemindAt } from '../notify';

const DAY = 86400000;

describe('nextRemindAt', () => {
  const now = new Date('2026-07-01T10:00:00').getTime();

  test('none は null', () => {
    expect(nextRemindAt({ remind: 'none' }, now)).toBe(null);
  });

  test('at は remindAt を返す', () => {
    expect(nextRemindAt({ remind: 'at', remindAt: now + 1000 }, now)).toBe(now + 1000);
  });

  test('interval は createdAt + 秒', () => {
    const created = now - DAY; // 1日前に作成
    expect(nextRemindAt({ remind: '3days', createdAt: created }, now)).toBe(created + 3 * DAY);
    expect(nextRemindAt({ remind: 'tomorrow', createdAt: created }, now)).toBe(created + DAY);
  });

  test('daily は今日の時刻が過ぎていれば翌日', () => {
    const at = nextRemindAt({ remind: 'daily', remindHour: 9, remindMinute: 0 }, now); // 9時は過ぎている
    const d = new Date(at);
    expect(d.getDate()).toBe(2); // 翌日
    expect(d.getHours()).toBe(9);
  });

  test('daily は今日の時刻が未来なら今日', () => {
    const at = nextRemindAt({ remind: 'daily', remindHour: 22, remindMinute: 0 }, now);
    const d = new Date(at);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(22);
  });

  // now は 2026-07-01（水曜）。remindWeekday は 1=日〜7=土。
  test('weekly は今週のまだ来ていない曜日ならその日', () => {
    const at = nextRemindAt({ remind: 'weekly', remindWeekday: 6, remindHour: 9, remindMinute: 0 }, now); // 6=金
    const d = new Date(at);
    expect(d.getDate()).toBe(3); // 7/3（金）
    expect(d.getDay()).toBe(5);
  });

  test('weekly は今日の曜日で時刻が過ぎていれば来週', () => {
    const at = nextRemindAt({ remind: 'weekly', remindWeekday: 4, remindHour: 9, remindMinute: 0 }, now); // 4=水＝今日、9時は過ぎている
    const d = new Date(at);
    expect(d.getDate()).toBe(8); // 翌週の水曜
    expect(d.getDay()).toBe(3);
  });

  test('weekly は今日の曜日で時刻が未来なら今日', () => {
    const at = nextRemindAt({ remind: 'weekly', remindWeekday: 4, remindHour: 22, remindMinute: 0 }, now);
    const d = new Date(at);
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(22);
  });
});
