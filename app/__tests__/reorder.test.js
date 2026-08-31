import { moveItem, reorderedItems } from '../reorder';

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
  test('範囲外の from は何もせずコピーを返す', () => {
    expect(moveItem(['a', 'b', 'c'], -1, 0)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 3, 0)).toEqual(['a', 'b', 'c']);
  });
});

describe('reorderedItems', () => {
  const a = { id: 'a', doneAt: null };
  const b = { id: 'b', doneAt: null };
  const c = { id: 'c', doneAt: 100 };

  test('未達成カードをactiveIdsの順に並べ、達成済みは末尾に保持する', () => {
    expect(reorderedItems([a, b, c], ['b', 'a']).map((it) => it.id)).toEqual(['b', 'a', 'c']);
  });

  test('達成済みが複数あっても元の順のまま末尾に保持する', () => {
    const c2 = { id: 'c2', doneAt: 200 };
    expect(reorderedItems([a, b, c, c2], ['b', 'a']).map((it) => it.id)).toEqual(['b', 'a', 'c', 'c2']);
  });

  test('activeIdsに存在しないidが混ざっていても無視する', () => {
    expect(reorderedItems([a, b, c], ['b', 'ghost', 'a']).map((it) => it.id)).toEqual(['b', 'a', 'c']);
  });

  test('達成済みが無ければ未達成のみを返す', () => {
    expect(reorderedItems([a, b], ['b', 'a']).map((it) => it.id)).toEqual(['b', 'a']);
  });
});
