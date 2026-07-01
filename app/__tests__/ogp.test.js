import { isUrl, parseOgp, resolveImage, extractPlaceFromUrl, cleanTitle, planOgpAutoFill } from '../ogp';

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

describe('extractPlaceFromUrl', () => {
  test('Googleマップ /place/ から店名を復元', () => {
    expect(extractPlaceFromUrl('https://www.google.com/maps/place/鎌倉+蕎麦屋/@35.3,139.5'))
      .toBe('鎌倉 蕎麦屋');
    expect(extractPlaceFromUrl('https://maps.google.com/maps/place/%E4%B8%80%E8%98%AD/data=x'))
      .toBe('一蘭');
  });
  test('該当しないURLは null', () => {
    expect(extractPlaceFromUrl('https://example.com/x')).toBeNull();
    expect(extractPlaceFromUrl(undefined)).toBeNull();
  });
});

describe('cleanTitle', () => {
  test('汎用タイトル(Google マップ)は URL由来の店名に置換', () => {
    expect(cleanTitle('Google マップ', 'https://www.google.com/maps/place/一蘭+渋谷/@x', '入力'))
      .toBe('一蘭 渋谷');
  });
  test('「店名 - Google マップ」は店名を取り出す', () => {
    expect(cleanTitle('スターバックス 鎌倉店 - Google マップ', 'https://maps.google.com/x', ''))
      .toBe('スターバックス 鎌倉店');
  });
  test('良いタイトルはそのまま', () => {
    expect(cleanTitle('AirPods Pro 第2世代', 'https://amazon.co.jp/x', '')).toBe('AirPods Pro 第2世代');
  });
  test('汎用かつ手掛かり無しは fallback、それも無ければ null', () => {
    expect(cleanTitle('Google マップ', 'https://maps.google.com/x', '手入力')).toBe('手入力');
    expect(cleanTitle('Google マップ', 'https://maps.google.com/x', '')).toBeNull();
  });
});

describe('planOgpAutoFill', () => {
  test('タイトル未入力・写真未選択なら両方反映', () => {
    const plan = planOgpAutoFill({
      ogpTitle: 'すてきなカフェ', ogpImage: 'https://img/x.jpg',
      url: 'https://example.com/a', currentTitle: '', hasImage: false,
    });
    expect(plan).toEqual({ title: 'すてきなカフェ', image: 'https://img/x.jpg' });
  });
  test('タイトル入力済みなら title は上書きしない', () => {
    const plan = planOgpAutoFill({
      ogpTitle: 'すてきなカフェ', ogpImage: 'https://img/x.jpg',
      url: 'https://example.com/a', currentTitle: '手入力のタイトル', hasImage: false,
    });
    expect(plan.title).toBeNull();
    expect(plan.image).toBe('https://img/x.jpg');
  });
  test('写真選択済みなら image は上書きしない', () => {
    const plan = planOgpAutoFill({
      ogpTitle: 'すてきなカフェ', ogpImage: 'https://img/x.jpg',
      url: 'https://example.com/a', currentTitle: '', hasImage: true,
    });
    expect(plan.image).toBeNull();
  });
  test('OGPが空でも落ちない', () => {
    const plan = planOgpAutoFill({
      ogpTitle: null, ogpImage: null, url: 'https://example.com/a', currentTitle: '', hasImage: false,
    });
    expect(plan).toEqual({ title: null, image: null });
  });
});
