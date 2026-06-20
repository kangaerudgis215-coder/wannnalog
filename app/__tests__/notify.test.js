import { reminderSeconds, defaultRemindForDue, remindLabel, REMIND_OPTIONS } from '../notify';

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
