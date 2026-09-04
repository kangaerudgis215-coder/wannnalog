import { reminderSeconds, defaultRemindForDue, remindLabel, REMIND_OPTIONS, reminderPlan, remindSummary, defaultReminderAt, reminderChoicePatch, reminderAtPickerMs, reminderTimePickerMs } from '../notify';

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
  test('毎週の既定は 日曜 9:00', () => {
    expect(reminderPlan({ remind: 'weekly' }, now)).toEqual({ kind: 'weekly', weekday: 1, hour: 9, minute: 0 });
  });
  test('remindが無いアイテムは none 扱いで null', () => {
    expect(reminderPlan({}, now)).toBeNull();
  });
  test('nowを省略しても動く（現在時刻を使う）', () => {
    expect(reminderPlan({ remind: 'none' })).toBeNull();
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
  test('日時指定は M/D HH:MM の表示', () => {
    const remindAt = new Date(2026, 6, 15, 8, 5, 0).getTime();
    expect(remindSummary({ remind: 'at', remindAt })).toBe('7/15 08:05');
  });
  test('日時指定でも予約時刻が未設定なら通常ラベルにフォールバック', () => {
    expect(remindSummary({ remind: 'at' })).toBe(remindLabel('at'));
  });
  test('毎日・毎週の既定値（時刻未設定）', () => {
    expect(remindSummary({ remind: 'daily' })).toBe('毎日 09:00');
    expect(remindSummary({ remind: 'weekly' })).toBe('毎週日 09:00');
  });
  test('remindが無いアイテムは「なし」', () => {
    expect(remindSummary({})).toBe('なし');
  });
});

describe('defaultReminderAt', () => {
  test('翌日9:00(ms)を返す', () => {
    const now = new Date(2026, 6, 15, 20, 30, 0).getTime();
    const at = defaultReminderAt(now);
    const d = new Date(at);
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });
  test('nowを省略しても動く（現在時刻を使う）', () => {
    expect(typeof defaultReminderAt()).toBe('number');
  });
});

describe('reminderChoicePatch', () => {
  const now = new Date(2026, 6, 15, 20, 30, 0).getTime();
  test('「日時指定」に切り替え、まだ未設定なら既定値も一緒に入れる', () => {
    const patch = reminderChoicePatch('at', { remind: 'none' }, now);
    expect(patch.remind).toBe('at');
    expect(patch.remindAt).toBe(defaultReminderAt(now));
  });
  test('「日時指定」で既に日時が設定済みなら上書きしない', () => {
    const patch = reminderChoicePatch('at', { remind: 'at', remindAt: 12345 }, now);
    expect(patch).toEqual({ remind: 'at' });
  });
  test('それ以外の種類はそのまま remind だけ変える', () => {
    expect(reminderChoicePatch('daily', { remind: 'none' }, now)).toEqual({ remind: 'daily' });
    expect(reminderChoicePatch('none', { remind: 'at', remindAt: 1 }, now)).toEqual({ remind: 'none' });
  });
  test('nowを省略しても動く（現在時刻を使う）', () => {
    expect(reminderChoicePatch('at', {}).remind).toBe('at');
  });
  test('valueを省略しても動く', () => {
    expect(reminderChoicePatch('daily', undefined, now)).toEqual({ remind: 'daily' });
  });
});

describe('reminderAtPickerMs', () => {
  const now = new Date(2026, 6, 15, 20, 30, 0).getTime();
  test('remindAtが設定済みならそれを返す', () => {
    expect(reminderAtPickerMs({ remindAt: 999 }, now)).toBe(999);
  });
  test('未設定なら既定値（翌日9:00）', () => {
    expect(reminderAtPickerMs({}, now)).toBe(defaultReminderAt(now));
    expect(reminderAtPickerMs(null, now)).toBe(defaultReminderAt(now));
  });
  test('nowを省略しても動く（現在時刻を使う）', () => {
    expect(typeof reminderAtPickerMs({})).toBe('number');
  });
});

describe('reminderTimePickerMs', () => {
  test('remindHour/remindMinuteをnowの日付にあてはめる', () => {
    const now = new Date(2026, 6, 15, 20, 30, 0).getTime();
    const ms = reminderTimePickerMs({ remindHour: 8, remindMinute: 5 }, now);
    const d = new Date(ms);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(8);
    expect(d.getMinutes()).toBe(5);
  });
  test('未設定なら既定 9:00', () => {
    const now = new Date(2026, 6, 15, 20, 30, 0).getTime();
    const d = new Date(reminderTimePickerMs({}, now));
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });
  test('nowを省略しても動く（現在時刻を使う）', () => {
    expect(typeof reminderTimePickerMs({})).toBe('number');
  });
  test('valueを省略しても動く', () => {
    const now = new Date(2026, 6, 15, 20, 30, 0).getTime();
    const d = new Date(reminderTimePickerMs(undefined, now));
    expect(d.getHours()).toBe(9);
  });
});
