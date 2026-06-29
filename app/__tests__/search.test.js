import { matchesSearch, searchItems } from '../search';

const items = [
  { id: '1', title: '一蘭 渋谷店で豚骨ラーメン', memo: '', recipe: '', withWho: null },
  { id: '2', title: 'モルディブの透明な海', memo: '来年こそ', recipe: '', withWho: 'partner' },
  { id: '3', title: 'DUNE PART2をIMAXで観る', memo: '', recipe: '', withWho: null },
];

describe('matchesSearch', () => {
  it('空のキーワードは常に一致する', () => {
    expect(matchesSearch(items[0], '')).toBe(true);
    expect(matchesSearch(items[0], '   ')).toBe(true);
  });

  it('タイトルの部分一致でヒットする', () => {
    expect(matchesSearch(items[0], 'ラーメン')).toBe(true);
    expect(matchesSearch(items[0], '寿司')).toBe(false);
  });

  it('メモにも一致する', () => {
    expect(matchesSearch(items[1], '来年')).toBe(true);
  });

  it('大文字小文字を区別しない', () => {
    expect(matchesSearch(items[2], 'imax')).toBe(true);
    expect(matchesSearch(items[2], 'IMAX')).toBe(true);
  });
});

describe('searchItems', () => {
  it('一致するものだけを残す', () => {
    expect(searchItems(items, '観る').map((it) => it.id)).toEqual(['3']);
  });

  it('空のキーワードは全件返す', () => {
    expect(searchItems(items, '').map((it) => it.id)).toEqual(['1', '2', '3']);
  });
});
