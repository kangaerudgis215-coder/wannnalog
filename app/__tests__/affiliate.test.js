import { buildAffiliateUrl, shopSearchUrl } from '../affiliate';

describe('buildAffiliateUrl', () => {
  test('楽天はアフィリリンク経由になる', () => {
    const url = 'https://item.rakuten.co.jp/shop/abc/';
    const out = buildAffiliateUrl(url, { rakuten: 'abc123.def456' });
    expect(out).toContain('https://hb.afl.rakuten.co.jp/hgc/abc123.def456/');
    expect(out).toContain(encodeURIComponent(url));
  });
  test('Amazonはタグが付く', () => {
    expect(buildAffiliateUrl('https://www.amazon.co.jp/dp/B000', { amazon: 'mytag-22' }))
      .toBe('https://www.amazon.co.jp/dp/B000?tag=mytag-22');
    // 既存クエリがあれば & で連結
    expect(buildAffiliateUrl('https://www.amazon.co.jp/s?k=本', { amazon: 'mytag-22' }))
      .toBe('https://www.amazon.co.jp/s?k=本&tag=mytag-22');
  });
  test('ID未設定・対応外はそのまま', () => {
    expect(buildAffiliateUrl('https://item.rakuten.co.jp/x/', {})).toBe('https://item.rakuten.co.jp/x/');
    expect(buildAffiliateUrl('https://example.com/x', { amazon: 't' })).toBe('https://example.com/x');
    expect(buildAffiliateUrl('')).toBeNull();
  });
});

describe('shopSearchUrl', () => {
  test('店ごとの検索URL', () => {
    expect(shopSearchUrl('amazon', 'コーヒー')).toBe('https://www.amazon.co.jp/s?k=' + encodeURIComponent('コーヒー'));
    expect(shopSearchUrl('rakuten', 'コーヒー')).toBe('https://search.rakuten.co.jp/search/mall/' + encodeURIComponent('コーヒー') + '/');
  });
  test('query未指定は空文字扱い', () => {
    expect(shopSearchUrl('amazon')).toBe('https://www.amazon.co.jp/s?k=');
  });
});
