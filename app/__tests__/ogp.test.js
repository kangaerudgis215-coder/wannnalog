import { isUrl, parseOgp, resolveImage, extractPlaceFromUrl, cleanTitle, isMapsUrl, guessCategoryFromUrl, buildLinkAttachPatch } from '../ogp';

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

describe('buildLinkAttachPatch', () => {
  test('YouTubeはサムネを優先で使う', () => {
    const sns = { platform: 'youtube', url: 'https://youtu.be/abc123', thumbnail: 'https://img.youtube.com/vi/abc123/hqdefault.jpg' };
    const patch = buildLinkAttachPatch('https://youtu.be/abc123', sns, { image: null });
    expect(patch).toEqual({ sourceUrl: 'https://youtu.be/abc123', sourcePlatform: 'youtube', imageUri: 'https://img.youtube.com/vi/abc123/hqdefault.jpg' });
  });
  test('SNS判定が無ければOGP画像を使う', () => {
    const patch = buildLinkAttachPatch('https://zozo.jp/shop/x', null, { image: 'https://img/x.jpg' });
    expect(patch).toEqual({ sourceUrl: 'https://zozo.jp/shop/x', sourcePlatform: null, imageUri: 'https://img/x.jpg' });
  });
  test('地図は汎用ピンを避けるためOGP画像を使わない', () => {
    const patch = buildLinkAttachPatch('https://maps.google.com/?q=x', null, { image: 'https://pin.png' });
    expect(patch).toEqual({ sourceUrl: 'https://maps.google.com/?q=x', sourcePlatform: null });
    expect(patch.imageUri).toBeUndefined();
  });
  test('画像が無ければ imageUri を含めない（sourceUrlは常に保存）', () => {
    const sns = { platform: 'instagram', url: 'https://instagram.com/p/x', thumbnail: null };
    const patch = buildLinkAttachPatch('https://instagram.com/p/x', sns, { image: null });
    expect(patch).toEqual({ sourceUrl: 'https://instagram.com/p/x', sourcePlatform: 'instagram' });
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
