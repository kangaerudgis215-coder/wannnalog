import { homeBlocks, FEATURE_GAP, splitMasonryCols } from '../layout';

function makeItems(heats) {
  return heats.map((heat, i) => ({ id: String(i), heat, createdAt: i }));
}

describe('homeBlocks', () => {
  test('本気(3)が無ければ全部ひとつのmasonryブロック', () => {
    const items = makeItems([2, 1, 2, undefined]);
    const blocks = homeBlocks(items);
    expect(blocks).toEqual([{ type: 'masonry', items }]);
  });

  test('間隔が空いていない本気カードはfeature扱いにならない', () => {
    const items = makeItems([3, 2, 2]);
    const blocks = homeBlocks(items);
    expect(blocks).toEqual([{ type: 'masonry', items }]);
  });

  test('直前のfeatureからFEATURE_GAP件以上あいた本気カードはfeatureブロックになる', () => {
    const heats = [3, ...Array(FEATURE_GAP).fill(2), 3];
    const items = makeItems(heats);
    const blocks = homeBlocks(items);
    // 最初の本気カードは since=0 なので masonry の先頭に留まる
    expect(blocks[0]).toEqual({ type: 'masonry', items: items.slice(0, FEATURE_GAP + 1) });
    expect(blocks[1]).toEqual({ type: 'feature', item: items[FEATURE_GAP + 1] });
  });

  test('空配列は空配列を返す', () => {
    expect(homeBlocks([])).toEqual([]);
  });
});

describe('splitMasonryCols', () => {
  test('偶数indexは左列、奇数indexは右列に振り分ける（元のindexも保持）', () => {
    const items = ['a', 'b', 'c'];
    expect(splitMasonryCols(items)).toEqual([
      [{ it: 'a', i: 0 }, { it: 'c', i: 2 }],
      [{ it: 'b', i: 1 }],
    ]);
  });

  test('空配列を渡すと空の2列を返す', () => {
    expect(splitMasonryCols([])).toEqual([[], []]);
  });

  test('偶数個の場合は両列が同じ件数になる', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(splitMasonryCols(items)).toEqual([
      [{ it: 'a', i: 0 }, { it: 'c', i: 2 }],
      [{ it: 'b', i: 1 }, { it: 'd', i: 3 }],
    ]);
  });
});
