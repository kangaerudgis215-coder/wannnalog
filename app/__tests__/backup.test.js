import { buildBackupPayload, buildBackupText } from '../backup';

describe('buildBackupPayload', () => {
  test('アプリ名・件数・中身を含む形にまとめる', () => {
    const items = [{ id: '1', title: 'すしを食べる' }, { id: '2', title: '京都に行く' }];
    const payload = buildBackupPayload(items, 1000);
    expect(payload.app).toBe('WannaLog');
    expect(payload.exportedAt).toBe(1000);
    expect(payload.count).toBe(2);
    expect(payload.items).toEqual(items);
  });

  test('itemsが空でも壊れない', () => {
    const payload = buildBackupPayload([], 1000);
    expect(payload.count).toBe(0);
    expect(payload.items).toEqual([]);
  });

  test('items が未指定(undefined)でも壊れない', () => {
    const payload = buildBackupPayload(undefined, 1000);
    expect(payload.count).toBe(0);
    expect(payload.items).toEqual([]);
  });
});

describe('buildBackupText', () => {
  test('JSON文字列として読み戻せる', () => {
    const items = [{ id: '1', title: 'すしを食べる', doneAt: null }];
    const text = buildBackupText(items, 2000);
    const parsed = JSON.parse(text);
    expect(parsed.items).toEqual(items);
    expect(parsed.exportedAt).toBe(2000);
  });

  test('nowを省略しても現在時刻が入る', () => {
    const before = Date.now();
    const text = buildBackupText([], );
    const parsed = JSON.parse(text);
    const after = Date.now();
    expect(parsed.exportedAt).toBeGreaterThanOrEqual(before);
    expect(parsed.exportedAt).toBeLessThanOrEqual(after);
  });
});
