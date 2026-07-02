import { guessCategory } from '../classify';

describe('guessCategory', () => {
  test('食べ物の手がかりで eat', () => {
    expect(guessCategory('渋谷のラーメン屋')).toBe('eat');
    expect(guessCategory('鎌倉の海が見えるカフェ')).toBe('eat');
  });

  test('レシピの手がかりで cook', () => {
    expect(guessCategory('カレーの作り方レシピ')).toBe('cook');
  });

  test('旅行の手がかりで go', () => {
    expect(guessCategory('モルディブ旅行のホテル')).toBe('go');
  });

  test('映画・配信の手がかりで see', () => {
    expect(guessCategory('DUNE PART2をIMAXで観る、配信も')).toBe('see');
  });

  test('購入の手がかりで want', () => {
    expect(guessCategory('新作コスメが欲しい')).toBe('want');
  });

  test('体験の手がかりで do', () => {
    expect(guessCategory('陶芸のワークショップを体験してみたい')).toBe('do');
  });

  test('調べものの手がかりで know', () => {
    expect(guessCategory('AIの仕組みを知りたい')).toBe('know');
  });

  test('手がかりが無ければ null', () => {
    expect(guessCategory('あいうえお')).toBe(null);
    expect(guessCategory('')).toBe(null);
    expect(guessCategory(undefined)).toBe(null);
  });

  test('一致数が多い方を優先', () => {
    // eat: カフェ(1) / go: 行きたい(1) → 同数はCATEGORIES順で先勝ち(eat)
    expect(guessCategory('あのカフェに行きたい')).toBe('eat');
    // go: 旅行+ホテル(2) が eat: カフェ(1) を上回る
    expect(guessCategory('カフェもあるホテルで旅行')).toBe('go');
  });
});
