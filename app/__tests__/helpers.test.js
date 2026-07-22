// 純粋ロジックのテスト（links.js / theme.js）
import { actionLinks, dueLabel } from '../links';
import { getCategory, reminderBody, NEUTRAL_CATEGORY } from '../theme';

describe('actionLinks', () => {
  test('食べたい は 地図 と 食べログ(Google) を返す', () => {
    const links = actionLinks('eat', 'ラーメン 一蘭');
    expect(links).toHaveLength(2);
    expect(links[0].url).toContain('google.com/maps');
    expect(links[1].url).toContain('google.com/search');
    expect(links[1].url).toContain(encodeURIComponent('食べログ'));
  });

  test('欲しい は 楽天 と Amazon を返す', () => {
    const links = actionLinks('want', 'AirPods');
    const urls = links.map((l) => l.url).join(' ');
    expect(urls).toContain('rakuten.co.jp');
    expect(urls).toContain('amazon.co.jp');
  });

  test('タイトルはURLエンコードされ、生のスペースを含まない', () => {
    const [link] = actionLinks('know', 'ワインの 選び方');
    expect(link.url).toContain(encodeURIComponent('ワインの 選び方'));
    expect(link.url).not.toMatch(/\s/);
  });

  test('未知のカテゴリは Google検索（既定）を返す', () => {
    const links = actionLinks('unknown-key', 'なにか');
    expect(links).toHaveLength(1);
    expect(links[0].url).toContain('google.com/search');
  });

  test('空タイトルでもクラッシュしない', () => {
    expect(() => actionLinks('eat', '')).not.toThrow();
    expect(() => actionLinks('eat', undefined)).not.toThrow();
  });
});

describe('dueLabel', () => {
  test('期限ラベル各種', () => {
    expect(dueLabel('today')).toBe('今日');
    expect(dueLabel('thisWeek')).toBe('今週');
    expect(dueLabel('nextWeek')).toBe('来週');
    expect(dueLabel('thisMonth')).toBe('今月');
    expect(dueLabel('q1')).toBe('Q1');
    expect(dueLabel('q4')).toBe('Q4');
  });
  test('none / undefined は null', () => {
    expect(dueLabel('none')).toBeNull();
    expect(dueLabel(undefined)).toBeNull();
  });
});

describe('theme', () => {
  test('getCategory は該当カテゴリを返す', () => {
    expect(getCategory('eat').label).toBe('食べたい');
    expect(getCategory('go').label).toBe('行きたい');
  });
  test('未知キー・none・未指定は既定（未設定カテゴリ）を返す', () => {
    expect(getCategory('???')).toBe(NEUTRAL_CATEGORY);
    expect(getCategory('none')).toBe(NEUTRAL_CATEGORY);
    expect(getCategory(undefined)).toBe(NEUTRAL_CATEGORY);
  });
  test('reminderBody はカテゴリ別の文言を返し、既定もある', () => {
    expect(typeof reminderBody('eat')).toBe('string');
    expect(reminderBody('eat').length).toBeGreaterThan(0);
    expect(typeof reminderBody('unknown')).toBe('string');
  });
});
