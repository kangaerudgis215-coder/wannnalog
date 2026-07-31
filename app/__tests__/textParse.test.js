import { guessCategoryFromText, extractTitleFromText, parseQuickText } from '../textParse';

describe('guessCategoryFromText', () => {
  test('キーワードからカテゴリを推測', () => {
    expect(guessCategoryFromText('鎌倉の海が見えるカフェ')).toBe('eat');
    expect(guessCategoryFromText('肉じゃがのレシピ')).toBe('cook');
    expect(guessCategoryFromText('沖縄旅行に行きたい')).toBe('go');
    expect(guessCategoryFromText('新作映画を見たい')).toBe('see');
    expect(guessCategoryFromText('AirPods Proが欲しい')).toBe('want');
    expect(guessCategoryFromText('富士山登山に挑戦したい')).toBe('do');
    expect(guessCategoryFromText('英会話講座について知りたい')).toBe('know');
  });
  test('複数キーワードが混ざる場合は先に定義したカテゴリを優先', () => {
    expect(guessCategoryFromText('食べたいレシピを探す')).toBe('eat');
  });
  test('該当キーワードが無ければ null', () => {
    expect(guessCategoryFromText('ただのメモ')).toBe(null);
  });
  test('空文字・未入力は null', () => {
    expect(guessCategoryFromText('')).toBe(null);
    expect(guessCategoryFromText(undefined)).toBe(null);
    expect(guessCategoryFromText('   ')).toBe(null);
  });
});

describe('extractTitleFromText', () => {
  test('最初の意味のある行をタイトルにする', () => {
    expect(extractTitleFromText('鎌倉 一蘭\n渋谷店\n#ラーメン #グルメ')).toBe('鎌倉 一蘭');
  });
  test('数字・日付だけの行は飛ばす', () => {
    expect(extractTitleFromText('2026/07/20\n12,345 いいね\n素敵なカフェ')).toBe('素敵なカフェ');
  });
  test('ハッシュタグだけの行は飛ばし、行内の末尾ハッシュタグは除去', () => {
    expect(extractTitleFromText('#おすすめ\nすてきなカフェ #カフェ巡り')).toBe('すてきなカフェ');
  });
  test('40文字を超える場合は切り詰める', () => {
    const long = 'あ'.repeat(50);
    const result = extractTitleFromText(long);
    expect(result.length).toBe(40);
  });
  test('空文字・未入力は null', () => {
    expect(extractTitleFromText('')).toBe(null);
    expect(extractTitleFromText(undefined)).toBe(null);
  });
  test('意味のある行が無ければ null', () => {
    expect(extractTitleFromText('#tag\n123\n456')).toBe(null);
  });
});

describe('parseQuickText', () => {
  test('タイトルとカテゴリをまとめて返す', () => {
    expect(parseQuickText('鎌倉の海カフェ\n#カフェ')).toEqual({ title: '鎌倉の海カフェ', category: 'eat' });
  });
  test('空入力は両方 null', () => {
    expect(parseQuickText('')).toEqual({ title: null, category: null });
  });
});
