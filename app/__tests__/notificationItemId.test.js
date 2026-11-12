import { notificationItemId } from '../notify';

const res = (data) => ({ notification: { request: { content: { data } } } });

describe('notificationItemId', () => {
  test('通知に入れたアイテムidを取り出す', () => {
    expect(notificationItemId(res({ id: 'abc123' }))).toBe('abc123');
  });
  test('数値idも文字列にそろえる', () => {
    expect(notificationItemId(res({ id: 42 }))).toBe('42');
  });
  test('応答が無い（アプリを普通に開いた）ときは null', () => {
    expect(notificationItemId(null)).toBeNull();
    expect(notificationItemId(undefined)).toBeNull();
  });
  test('idが入っていない通知は null', () => {
    expect(notificationItemId(res({}))).toBeNull();
    expect(notificationItemId(res(undefined))).toBeNull();
    expect(notificationItemId({})).toBeNull();
  });
});
