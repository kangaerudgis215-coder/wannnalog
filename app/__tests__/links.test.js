import { actionLinks, dueLabel } from '../links';

describe('actionLinks', () => {
  test('eat：地図と食べログのリンクを返す', () => {
    const links = actionLinks('eat', '寿司');
    expect(links).toHaveLength(2);
    expect(links[0].url).toBe('https://www.google.com/maps/search/?api=1&query=%E5%AF%BF%E5%8F%B8');
    expect(links[1].url).toContain('%E9%A3%9F%E3%81%B9%E3%83%AD%E3%82%B0');
  });

  test('go：地図とネット検索の2件を返す', () => {
    const links = actionLinks('go', '京都');
    expect(links).toHaveLength(2);
    expect(links[0].label).toBe('地図で探す');
  });

  test('want：楽天とAmazonの2件を返す', () => {
    const links = actionLinks('want', 'イヤホン');
    expect(links).toHaveLength(2);
    expect(links[0].url).toContain('search.rakuten.co.jp');
    expect(links[1].url).toContain('amazon.co.jp');
  });

  test('see：配信検索とネット検索の2件を返す', () => {
    const links = actionLinks('see', '映画A');
    expect(links).toHaveLength(2);
    expect(links[0].url).toContain(encodeURIComponent('配信'));
  });

  test('know/do/未知カテゴリ：ネット検索のみ1件を返す', () => {
    expect(actionLinks('know', 'AI')).toHaveLength(1);
    expect(actionLinks('do', '筋トレ')).toHaveLength(1);
    expect(actionLinks('something-else', 'x')).toHaveLength(1);
  });

  test('タイトルが空でも前後の空白を除いて落ちない', () => {
    expect(() => actionLinks('eat', '  ')).not.toThrow();
    expect(() => actionLinks('eat', undefined)).not.toThrow();
  });
});

describe('dueLabel', () => {
  test('既知のタグは日本語ラベルを返す', () => {
    expect(dueLabel('today')).toBe('今日');
    expect(dueLabel('thisWeek')).toBe('今週');
    expect(dueLabel('nextWeek')).toBe('来週');
    expect(dueLabel('thisMonth')).toBe('今月');
    expect(dueLabel('q1')).toBe('Q1');
    expect(dueLabel('q2')).toBe('Q2');
    expect(dueLabel('q3')).toBe('Q3');
    expect(dueLabel('q4')).toBe('Q4');
  });

  test('未知の値やnoneはnullを返す', () => {
    expect(dueLabel('none')).toBeNull();
    expect(dueLabel(undefined)).toBeNull();
    expect(dueLabel('2099-01-01')).toBeNull();
  });
});
