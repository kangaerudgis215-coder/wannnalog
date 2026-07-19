import { isUrl, parseOgp, resolveImage, extractPlaceFromUrl, cleanTitle, isMapsUrl, guessCategoryFromUrl, buildOgpImportPatch } from '../ogp';

describe('isMapsUrl', () => {
  test('Googleマップのリンクを判定', () => {
    expect(isMapsUrl('https://maps.google.com/?q=x')).toBe(true);
    expect(isMapsUrl('https://www.google.com/maps/place/Cafe')).toBe(true);
    expect(isMapsUrl('https://maps.app.goo.gl/abc')).toBe(true);
    expect(isMapsUrl('https://example.com')).toBe(false);
  });
});

describe('guessCategoryFromUrl', () => {
  test('通販は欲しい', () => {
    expect(guessCategoryFromUrl('https://www.amazon.co.jp/dp/x')).toBe('want');
    expect(guessCategoryFromUrl('https://zozo.jp/shop/x')).toBe('want');
    expect(guessCategoryFromUrl('https://item.rakuten.co.jp/x')).toBe('want');
  });
  test('レシピ/動画/グルメ/地図', () => {
    expect(guessCategoryFromUrl('https://cookpad.com/recipe/1')).toBe('cook');
    expect(guessCategoryFromUrl('https://youtu.be/x')).toBe('see');
    expect(guessCategoryFromUrl('https://tabelog.com/x')).toBe('eat');
    expect(guessCategoryFromUrl('https://maps.google.com/x')).toBe('go');
  });
  test('不明は null', () => {
    expect(guessCategoryFromUrl('https://example.com')).toBe(null);
  });
});

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

describe('buildOgpImportPatch', () => {
  const ogp = { title: 'すてきなカフェ', image: 'https://img/x.jpg', description: null };

  test('空欄なら画像・タイトル・カテゴリを反映', () => {
    const patch = buildOgpImportPatch({ ogp, url: 'https://tabelog.com/x', current: { title: '', imageUri: null, category: null } });
    expect(patch).toEqual({ imageUri: 'https://img/x.jpg', title: 'すてきなカフェ', category: 'eat' });
  });

  test('すでに入力済みの項目は上書きしない', () => {
    const patch = buildOgpImportPatch({
      ogp,
      url: 'https://tabelog.com/x',
      current: { title: '手入力タイトル', imageUri: 'file://own.jpg', category: 'want' },
    });
    expect(patch).toEqual({});
  });

  test('カテゴリが未設定(none)なら推測して埋める', () => {
    const patch = buildOgpImportPatch({ ogp, url: 'https://cookpad.com/recipe/1', current: { title: '入力済み', imageUri: 'x', category: 'none' } });
    expect(patch).toEqual({ category: 'cook' });
  });

  test('Googleマップは画像を反映しない（汎用ピンのため）', () => {
    const patch = buildOgpImportPatch({
      ogp: { title: 'Google マップ', image: 'https://maps/pin.png' },
      url: 'https://www.google.com/maps/place/一蘭+渋谷/@x',
      current: { title: '', imageUri: null, category: null },
    });
    expect(patch.imageUri).toBeUndefined();
    expect(patch.title).toBe('一蘭 渋谷');
    expect(patch.category).toBe('go');
  });

  test('OGPが何も取れなければ空パッチ', () => {
    expect(buildOgpImportPatch({ ogp: { title: null, image: null }, url: 'https://example.com', current: { title: '', imageUri: null, category: null } })).toEqual({});
  });
});
