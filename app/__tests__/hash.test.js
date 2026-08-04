import { hashCode, CARD_ASPECTS, cardAspect } from '../hash';

describe('hashCode', () => {
  test('同じ文字列なら常に同じ数値になる', () => {
    expect(hashCode('wannalog-1')).toBe(hashCode('wannalog-1'));
  });

  test('違う文字列なら基本的に違う数値になる', () => {
    expect(hashCode('a')).not.toBe(hashCode('b'));
  });

  test('常に0以上の整数になる（マイナスにならない）', () => {
    for (const s of ['', 'x', '負になりやすい文字列テスト', '12345678901234567890']) {
      expect(hashCode(s)).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(hashCode(s))).toBe(true);
    }
  });
});

describe('cardAspect', () => {
  test('CARD_ASPECTSの中のどれかを返す', () => {
    for (const id of ['a', 'b', 'c', 1, 2, 3, 'item-42']) {
      expect(CARD_ASPECTS).toContain(cardAspect(id));
    }
  });

  test('同じidなら常に同じ縦横比になる（再描画で見た目が変わらない）', () => {
    expect(cardAspect('same-id')).toBe(cardAspect('same-id'));
    expect(cardAspect(7)).toBe(cardAspect(7));
  });
});
