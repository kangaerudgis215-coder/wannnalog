import { savedAlertMessage } from '../notify';

describe('savedAlertMessage（保存直後のメッセージ）', () => {
  test('通知なしなら「ボードに追加しました」', () => {
    expect(savedAlertMessage({ remind: 'none' }, false)).toBe('ボードに追加しました。');
    expect(savedAlertMessage({}, false)).toBe('ボードに追加しました。');
    expect(savedAlertMessage(null, false)).toBe('ボードに追加しました。');
  });
  test('予約できたら、いつ思い出すかを伝える', () => {
    expect(savedAlertMessage({ remind: 'tomorrow' }, true)).toBe('明日 に思い出させます。');
    expect(savedAlertMessage({ remind: 'daily', remindHour: 8, remindMinute: 5 }, true)).toBe('毎日 08:05 に思い出させます。');
  });
  test('過去の日時などで予約できなかったら「思い出させます」とは言わない', () => {
    const msg = savedAlertMessage({ remind: 'at', remindAt: Date.now() - 1000 }, false);
    expect(msg).not.toMatch(/思い出させます/);
    expect(msg).toMatch(/過ぎている/);
  });
});
