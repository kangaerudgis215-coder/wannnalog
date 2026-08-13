import { visibleItems, snsPlatformsPresent, upcomingItems } from '../filter';

const items = [
  { id: 'a', title: '達成済み', category: 'eat', heat: 3, dueTag: 'today', doneAt: 100, createdAt: 1 },
  { id: 'b', title: '本気・カフェ', category: 'eat', heat: 3, dueTag: 'none', doneAt: null, createdAt: 3 },
  { id: 'c', title: '本気・古い', category: 'go', heat: 3, dueTag: 'thisWeek', doneAt: null, createdAt: 2 },
  { id: 'd', title: '中くらい', category: 'go', heat: 2, dueTag: 'none', doneAt: null, createdAt: 5 },
  { id: 'e', title: 'Xから保存', category: 'see', heat: 1, dueTag: 'none', doneAt: null, sourcePlatform: 'x', createdAt: 4 },
  { id: 'f', title: '締切なし', category: 'eat', heat: 2, dueTag: 'none', doneAt: null, createdAt: 6 },
];

describe('visibleItems', () => {
  test('all は未達成のみ、配列順のまま', () => {
    expect(visibleItems(items, 'all').map((it) => it.id)).toEqual(['b', 'c', 'd', 'e', 'f']);
  });
  test('done は達成済みのみ', () => {
    expect(visibleItems(items, 'done').map((it) => it.id)).toEqual(['a']);
  });
  test('serious は本気(heat=3)の未達成を、新しい順で', () => {
    expect(visibleItems(items, 'serious').map((it) => it.id)).toEqual(['b', 'c']);
  });
  test('カテゴリ指定は未達成のうち一致するものを熱量順で', () => {
    expect(visibleItems(items, 'go').map((it) => it.id)).toEqual(['c', 'd']);
  });
  test('sns: 接頭辞はそのSNS由来の未達成のみ', () => {
    expect(visibleItems(items, 'sns:x').map((it) => it.id)).toEqual(['e']);
    expect(visibleItems(items, 'sns:instagram')).toEqual([]);
  });
});

describe('snsPlatformsPresent', () => {
  test('未達成アイテムのSNS種別を重複なく返す', () => {
    expect(snsPlatformsPresent(items)).toEqual(['x']);
  });
  test('該当なしなら空配列', () => {
    expect(snsPlatformsPresent([{ id: 'z', doneAt: null }])).toEqual([]);
  });
});

describe('upcomingItems', () => {
  test('締切が今日・今週の未達成のみ、既定で最大4件', () => {
    expect(upcomingItems(items).map((it) => it.id)).toEqual(['c']);
  });
  test('limit で件数を絞れる', () => {
    const many = [
      { id: '1', doneAt: null, dueTag: 'today' },
      { id: '2', doneAt: null, dueTag: 'today' },
      { id: '3', doneAt: null, dueTag: 'thisWeek' },
    ];
    expect(upcomingItems(many, 2).map((it) => it.id)).toEqual(['1', '2']);
  });
});
