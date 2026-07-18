import { matchesQuery, filterByQuery } from '../search';

const items = [
  { id: 'a', title: '鎌倉の海が見えるカフェ', category: 'eat', withWho: 'partner' },
  { id: 'b', title: 'パスタのレシピ', category: 'cook', recipe: 'トマトとバジルで作る', withWho: null },
  { id: 'c', title: '京都旅行', category: 'go', memo: '紅葉の時期に行きたい', withWho: 'friend' },
  { id: 'd', title: '無題', category: null, withWho: null },
];

describe('matchesQuery', () => {
  test('空欄・空文字はすべて一致する', () => {
    expect(matchesQuery(items[0], '')).toBe(true);
    expect(matchesQuery(items[0], '   ')).toBe(true);
    expect(matchesQuery(items[0], undefined)).toBe(true);
  });
  test('タイトルの部分一致（大文字小文字を無視）', () => {
    expect(matchesQuery(items[0], '鎌倉')).toBe(true);
    expect(matchesQuery(items[0], 'かまくら')).toBe(false);
  });
  test('メモ・レシピも検索対象', () => {
    expect(matchesQuery(items[1], 'バジル')).toBe(true);
    expect(matchesQuery(items[2], '紅葉')).toBe(true);
  });
  test('カテゴリ名・「誰と」でも一致する', () => {
    expect(matchesQuery(items[0], '食べたい')).toBe(true);
    expect(matchesQuery(items[0], '恋人と')).toBe(true);
    expect(matchesQuery(items[2], '友達と')).toBe(true);
  });
  test('一致しない語は false', () => {
    expect(matchesQuery(items[0], '存在しないキーワード')).toBe(false);
  });
  test('カテゴリ未設定のアイテムでも落ちない', () => {
    expect(matchesQuery(items[3], 'なにか')).toBe(false);
    expect(matchesQuery(items[3], '')).toBe(true);
  });
});

describe('filterByQuery', () => {
  test('空欄なら全件そのまま返す', () => {
    expect(filterByQuery(items, '')).toBe(items);
  });
  test('キーワードで絞り込む', () => {
    const result = filterByQuery(items, '京都');
    expect(result.map((it) => it.id)).toEqual(['c']);
  });
  test('該当0件なら空配列', () => {
    expect(filterByQuery(items, 'ぜったいに無い言葉')).toEqual([]);
  });
});
