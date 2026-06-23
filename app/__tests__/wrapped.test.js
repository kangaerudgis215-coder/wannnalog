import { wrappedLabel, topCategoryKey, buildWrapped } from '../wrapped';

describe('wrappedLabel', () => {
  test('達成が0件なら「はじまりの人」', () => {
    expect(wrappedLabel(0, 0)).toBe('これから叶える、はじまりの人');
  });
  test('達成率でタイプが変わる', () => {
    expect(wrappedLabel(80, 5)).toBe('即行動タイプ');
    expect(wrappedLabel(50, 5)).toBe('じっくり叶えるタイプ');
    expect(wrappedLabel(20, 5)).toBe('夢を集めるタイプ');
    expect(wrappedLabel(5, 5)).toBe('夢のコレクター');
  });
});

describe('topCategoryKey', () => {
  test('もっとも多いカテゴリを返す', () => {
    const done = [
      { category: 'food' }, { category: 'food' }, { category: 'travel' },
    ];
    expect(topCategoryKey(done)).toEqual({ key: 'food', count: 2 });
  });
  test('達成が無ければ key は null', () => {
    expect(topCategoryKey([])).toEqual({ key: null, count: 0 });
  });
});

describe('buildWrapped', () => {
  test('全体から振り返り情報をまとめる', () => {
    const items = [
      { category: 'food', heat: 3, doneAt: 100 },
      { category: 'food', heat: 1, doneAt: 200 },
      { category: 'travel', doneAt: null },
    ];
    const w = buildWrapped(items);
    expect(w.total).toBe(3);
    expect(w.doneCount).toBe(2);
    expect(w.rate).toBe(67);
    expect(w.topCategoryKey).toBe('food');
    expect(w.topCategoryCount).toBe(2);
    expect(w.seriousDone).toBe(1);
    expect(w.casualDone).toBe(1);
    expect(w.label).toBe('じっくり叶えるタイプ');
  });
  test('全件0なら達成率0でラベルは「はじまりの人」', () => {
    const w = buildWrapped([]);
    expect(w.rate).toBe(0);
    expect(w.label).toBe('これから叶える、はじまりの人');
  });
});
