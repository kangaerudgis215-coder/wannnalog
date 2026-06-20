import { reminderSeconds, defaultRemindForDue, remindLabel, REMIND_OPTIONS, reminderPlan, remindSummary } from '../notify';

const DAY = 24 * 60 * 60;

describe('reminderSeconds', () => {
  test('選択ごとの秒数', () => {
    expect(reminderSeconds('tomorrow')).toBe(DAY);
    expect(reminderSeconds('3days')).toBe(3 * DAY);
    expect(reminderSeconds('week')).toBe(7 * DAY);
  });
  test('なし/未知は null', () => {
    expect(reminderSeconds('none')).toBeNull();
    expect(reminderSeconds('???')).toBeNull();
    expect(reminderSeconds(undefined)).toBeNull();
  });
});

describe('defaultRemindForDue', () => {
  test('期限に応じた既定', () => {
    expect(defaultRemindForDue('thisWeek')).toBe('3days');
    expect(defaultRemindForDue('thisMonth')).toBe('week');
    expect(defaultRemindForDue('none')).toBe('3days');
    expect(defaultRemindForDue(undefined)).toBe('3days');
  });
});

describe('remindLabel', () => {
  test('キー→表示名', () => {
    expect(remindLabel('tomorrow')).toBe('明日');
    expect(remindLabel('none')).toBe('なし');
    expect(remindLabel('???')).toBe('なし');
  });
  test('REMIND_OPTIONS は4つ', () => {
    expect(REMIND_OPTIONS).toHaveLength(4);
  });
});

describe('reminderPlan', () => {
  const now = 1000000;
  test('相対（3日後）は interval', () => {
    expect(reminderPlan({ remind: '3days' }, now)).toEqual({ kind: 'interval', seconds: 3 * 24 * 60 * 60 });
  });
  test('none は null', () => {
    expect(reminderPlan({ remind: 'none' }, now)).toBeNull();
  });
  test('日時指定：未来は date / 過去は null', () => {
    expect(reminderPlan({ remind: 'at', remindAt: now + 5000 }, now)).toEqual({ kind: 'date', at: now + 5000 });
    expect(reminderPlan({ remind: 'at', remindAt: now - 5000 }, now)).toBeNull();
    expect(reminderPlan({ remind: 'at' }, now)).toBeNull();
  });
  test('毎日・毎週', () => {
    expect(reminderPlan({ remind: 'daily', remindHour: 8, remindMinute: 30 }, now)).toEqual({ kind: 'daily', hour: 8, minute: 30 });
    expect(reminderPlan({ remind: 'weekly', remindWeekday: 7, remindHour: 21, remindMinute: 0 }, now)).toEqual({ kind: 'weekly', weekday: 7, hour: 21, minute: 0 });
  });
  test('毎日の既定は 9:00', () => {
    expect(reminderPlan({ remind: 'daily' }, now)).toEqual({ kind: 'daily', hour: 9, minute: 0 });
  });
});

describe('remindSummary', () => {
  test('相対はラベル', () => {
    expect(remindSummary({ remind: '3days' })).toBe('3日後');
    expect(remindSummary({ remind: 'none' })).toBe('なし');
  });
  test('毎日・毎週の表示', () => {
    expect(remindSummary({ remind: 'daily', remindHour: 8, remindMinute: 5 })).toBe('毎日 08:05');
    expect(remindSummary({ remind: 'weekly', remindWeekday: 1, remindHour: 9, remindMinute: 0 })).toBe('毎週日 09:00');
  });
});
