import { browserUrl } from '../links';

describe('browserUrl', () => {
  test('safari（既定）は元のURLをそのまま返す', () => {
    expect(browserUrl('https://example.com/a', 'safari')).toBe('https://example.com/a');
    expect(browserUrl('https://example.com/a')).toBe('https://example.com/a');
  });

  test('chrome は https を googlechromes:// に変換する', () => {
    expect(browserUrl('https://www.google.com/search?q=x', 'chrome'))
      .toBe('googlechromes://www.google.com/search?q=x');
  });

  test('chrome は http を googlechrome:// に変換する', () => {
    expect(browserUrl('http://example.com', 'chrome')).toBe('googlechrome://example.com');
  });

  test('http(s) 以外や不正値はそのまま返す', () => {
    expect(browserUrl('mailto:a@b.com', 'chrome')).toBe('mailto:a@b.com');
    expect(browserUrl(null, 'chrome')).toBe(null);
  });
});
