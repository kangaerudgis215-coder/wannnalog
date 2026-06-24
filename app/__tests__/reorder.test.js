import { moveItem } from '../reorder';

describe('moveItem', () => {
  test('下へ移動できる', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });
  test('上へ移動できる', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });
  test('範囲外の to は端に丸める', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
    expect(moveItem(['a', 'b', 'c'], 2, -5)).toEqual(['c', 'a', 'b']);
  });
  test('同じ位置なら順序は変わらない', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });
  test('元の配列は破壊しない', () => {
    const src = ['a', 'b', 'c'];
    moveItem(src, 0, 2);
    expect(src).toEqual(['a', 'b', 'c']);
  });
});
