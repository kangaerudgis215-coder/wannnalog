// 純粋ロジックのテスト（links.js / theme.js / store.js）
import { actionLinks, dueLabel } from '../links';
import { getCategory, reminderBody, CATEGORIES } from '../theme';
import { removeItem } from '../store';

describe('actionLinks', () => {
  test('食べたい は 食べログ と Googleマップ を返す', () => {
    const links = actionLinks('eat', 'ラーメン 一蘭');
    expect(links).toHaveLength(2);
    expect(links[0].url).toContain('tabelog.com');
    expect(links[1].url).toContain('google.com/maps');
  });

  test('欲しい は 楽天 と Amazon を返す', () => {
    const links = actionLinks('want', 'AirPods');
    const urls = links.map((l) => l.url).join(' ');
    expect(urls).toContain('rakuten.co.jp');
    expect(urls).toContain('amazon.co.jp');
  });

  test('タイトルはURLエンコードされる', () => {
    const [link] = actionLinks('know', 'ワインの 選び方');
    expect(link.url).toContain(encodeURIComponent('ワインの 選び方'));
    expect(link.url).not.toContain(' ');
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
  test('thisWeek -> 今週 / thisMonth -> 今月', () => {
    expect(dueLabel('thisWeek')).toBe('今週');
    expect(dueLabel('thisMonth')).toBe('今月');
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

  test('未知キーは既定（先頭カテゴリ）を返す', () => {
    expect(getCategory('???')).toBe(CATEGORIES[0]);
  });

  test('reminderBody はカテゴリ別の文言を返し、既定もある', () => {
    expect(typeof reminderBody('eat')).toBe('string');
    expect(reminderBody('eat').length).toBeGreaterThan(0);
    expect(typeof reminderBody('unknown')).toBe('string');
  });
});

describe('removeItem', () => {
  const items = [{ id: '1' }, { id: '2' }, { id: '3' }];

  test('指定したidのアイテムだけを取り除く', () => {
    expect(removeItem(items, '2')).toEqual([{ id: '1' }, { id: '3' }]);
  });

  test('存在しないidを渡しても元の配列と同じ内容のまま', () => {
    expect(removeItem(items, 'nope')).toEqual(items);
  });

  test('元の配列を変更しない（イミュータブル）', () => {
    removeItem(items, '1');
    expect(items).toHaveLength(3);
  });
});
