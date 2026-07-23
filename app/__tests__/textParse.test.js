import { guessCategoryFromText } from '../textParse';

describe('guessCategoryFromText', () => {
  test('カテゴリ名そのものが書かれていればそれを使う', () => {
    expect(guessCategoryFromText('鎌倉の海が見えるカフェに行きたい')).toBe('go');
    expect(guessCategoryFromText('新作のスニーカーが欲しい')).toBe('want');
    expect(guessCategoryFromText('あのアニメ映画を見たい')).toBe('see');
    expect(guessCategoryFromText('資格試験について知りたい')).toBe('know');
    expect(guessCategoryFromText('富士山に登ってみたい')).toBe(null); // 「やりたい」を含まない例は null
    expect(guessCategoryFromText('富士登山に挑戦やりたい')).toBe('do');
    expect(guessCategoryFromText('肉じゃがを作りたい')).toBe('cook');
  });

  test('カテゴリ名が無くてもトピックのキーワードで推測', () => {
    expect(guessCategoryFromText('一蘭 渋谷店で豚骨ラーメン')).toBe('eat');
    expect(guessCategoryFromText('肉じゃがのレシピ')).toBe('cook');
    expect(guessCategoryFromText('道後温泉に一泊二日の旅行')).toBe('go');
    expect(guessCategoryFromText('推しのライブ配信')).toBe('see');
    expect(guessCategoryFromText('資格取得のセミナー')).toBe('know');
    expect(guessCategoryFromText('ヨガ教室の体験')).toBe('do');
  });

  test('手がかりが無ければ null', () => {
    expect(guessCategoryFromText('モルディブの透明な海')).toBe(null);
    expect(guessCategoryFromText('')).toBe(null);
    expect(guessCategoryFromText('   ')).toBe(null);
    expect(guessCategoryFromText(undefined)).toBe(null);
  });

  test('前後の空白は無視する', () => {
    expect(guessCategoryFromText('  ラーメン食べたい  ')).toBe('eat');
  });
});
