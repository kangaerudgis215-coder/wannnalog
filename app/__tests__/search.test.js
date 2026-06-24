import { matchesQuery, searchItems } from '../search';

const items = [
  { id: '1', title: '渋谷の焼肉屋', category: 'eat', withWho: null },
  { id: '2', title: '京都旅行', category: 'go', withWho: '友達' },
  { id: '3', title: 'NetflixのSF映画', category: 'watch', withWho: null },
];

describe('matchesQuery', () => {
  test('空文字なら常にtrue', () => {
    expect(matchesQuery(items[0], '', '食べたい')).toBe(true);
    expect(matchesQuery(items[0], '   ', '食べたい')).toBe(true);
  });

  test('タイトルの部分一致でtrue', () => {
    expect(matchesQuery(items[0], '焼肉', '食べたい')).toBe(true);
  });

  test('大文字小文字を無視する', () => {
    expect(matchesQuery(items[2], 'netflix', '見たい')).toBe(true);
    expect(matchesQuery(items[2], 'NETFLIX', '見たい')).toBe(true);
  });

  test('誰とタグにも一致する', () => {
    expect(matchesQuery(items[1], '友達', '行きたい')).toBe(true);
  });

  test('カテゴリ名にも一致する', () => {
    expect(matchesQuery(items[1], '行きたい', '行きたい')).toBe(true);
  });

  test('一致しないものはfalse', () => {
    expect(matchesQuery(items[0], '寿司', '食べたい')).toBe(false);
  });
});

describe('searchItems', () => {
  const getCategoryLabel = (key) => ({ eat: '食べたい', go: '行きたい', watch: '見たい' }[key] || '');

  test('空クエリなら全件そのまま', () => {
    expect(searchItems(items, '', getCategoryLabel)).toEqual(items);
  });

  test('キーワードに合うものだけ残す', () => {
    const result = searchItems(items, '京都', getCategoryLabel);
    expect(result.map((it) => it.id)).toEqual(['2']);
  });

  test('一致なしなら空配列', () => {
    expect(searchItems(items, 'ありえない単語xyz', getCategoryLabel)).toEqual([]);
  });
});
