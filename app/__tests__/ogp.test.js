import { isUrl, parseOgp, resolveImage } from '../ogp';

describe('isUrl', () => {
  test('http/https をURLと判定', () => {
    expect(isUrl('https://example.com/a')).toBe(true);
    expect(isUrl('http://example.com')).toBe(true);
    expect(isUrl('  https://example.com  ')).toBe(true);
  });
  test('URLでないものは false', () => {
    expect(isUrl('鎌倉のカフェ')).toBe(false);
    expect(isUrl('example.com')).toBe(false);
    expect(isUrl('')).toBe(false);
    expect(isUrl(undefined)).toBe(false);
  });
});

describe('parseOgp', () => {
  test('og:title / og:image / og:description を抽出', () => {
    const html = `
      <meta property="og:title" content="すてきなカフェ" />
      <meta property="og:image" content="https://img/x.jpg" />
      <meta property="og:description" content="海が見える" />
    `;
    const o = parseOgp(html);
    expect(o.title).toBe('すてきなカフェ');
    expect(o.image).toBe('https://img/x.jpg');
    expect(o.description).toBe('海が見える');
  });

  test('content が property より前の順序でも抽出', () => {
    const html = `<meta content="逆順タイトル" property="og:title">`;
    expect(parseOgp(html).title).toBe('逆順タイトル');
  });

  test('og:image が無ければ twitter:image にフォールバック', () => {
    const html = `<meta name="twitter:image" content="https://img/tw.jpg">`;
    expect(parseOgp(html).image).toBe('https://img/tw.jpg');
  });

  test('og:title が無ければ <title> にフォールバック', () => {
    const html = `<title>ページの題名</title>`;
    expect(parseOgp(html).title).toBe('ページの題名');
  });

  test('HTMLエンティティをデコード', () => {
    const html = `<meta property="og:title" content="A &amp; B &quot;X&quot;">`;
    expect(parseOgp(html).title).toBe('A & B "X"');
  });

  test('空入力でも落ちない', () => {
    expect(parseOgp('')).toEqual({ title: null, image: null, description: null });
  });
});

describe('resolveImage', () => {
  test('プロトコル相対を https 化', () => {
    expect(resolveImage('//cdn/x.jpg', 'https://a.com/p')).toBe('https://cdn/x.jpg');
  });
  test('ルート相対をオリジンで解決', () => {
    expect(resolveImage('/img/x.jpg', 'https://a.com/page/1')).toBe('https://a.com/img/x.jpg');
  });
  test('パス相対をベースパスで解決', () => {
    expect(resolveImage('x.jpg', 'https://a.com/page/1')).toBe('https://a.com/page/x.jpg');
  });
  test('絶対URLはそのまま / null は null', () => {
    expect(resolveImage('https://a/b.jpg', 'https://a.com')).toBe('https://a/b.jpg');
    expect(resolveImage(null, 'https://a.com')).toBeNull();
  });
});
