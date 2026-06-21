import { parseSnsLink, youtubeId, snsMeta } from '../sns';

describe('youtubeId', () => {
  test('各形式から動画IDを取り出す', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://www.youtube.com/shorts/abc123XYZ_-')).toBe('abc123XYZ_-');
    expect(youtubeId('https://www.youtube.com/embed/dQw4w9WgXcQ?start=1')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe('dQw4w9WgXcQ');
  });
  test('動画IDが無ければ null', () => {
    expect(youtubeId('https://www.youtube.com/')).toBeNull();
    expect(youtubeId('https://example.com/watch?v=xxxxxx')).toBe('xxxxxx'); // v= は拾う（呼び出し側で host を判定）
    expect(youtubeId(undefined)).toBeNull();
  });
});

describe('parseSnsLink', () => {
  test('YouTube はサムネ付き', () => {
    expect(parseSnsLink('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      platform: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
    expect(parseSnsLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ').thumbnail)
      .toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
  test('X / Twitter', () => {
    expect(parseSnsLink('https://x.com/user/status/123').platform).toBe('x');
    expect(parseSnsLink('https://twitter.com/user/status/123').platform).toBe('x');
    expect(parseSnsLink('https://x.com/user/status/123').thumbnail).toBeNull();
  });
  test('Instagram / TikTok', () => {
    expect(parseSnsLink('https://www.instagram.com/p/abc/').platform).toBe('instagram');
    expect(parseSnsLink('https://www.tiktok.com/@user/video/123').platform).toBe('tiktok');
    expect(parseSnsLink('https://vm.tiktok.com/ZSabc/').platform).toBe('tiktok');
  });
  test('対応外・非URLは null', () => {
    expect(parseSnsLink('https://example.com/foo')).toBeNull();
    expect(parseSnsLink('ただのメモ')).toBeNull();
    expect(parseSnsLink('')).toBeNull();
    expect(parseSnsLink(undefined)).toBeNull();
  });
  test('前後の空白は無視', () => {
    expect(parseSnsLink('  https://youtu.be/dQw4w9WgXcQ  ').platform).toBe('youtube');
  });
});

describe('snsMeta', () => {
  test('既知のプラットフォーム', () => {
    expect(snsMeta('youtube')).toEqual({ label: 'YouTube', icon: 'logo-youtube' });
    expect(snsMeta('x')).toEqual({ label: 'X', icon: 'logo-twitter' });
    expect(snsMeta('instagram').label).toBe('Instagram');
    expect(snsMeta('tiktok').label).toBe('TikTok');
  });
  test('不明は汎用リンク', () => {
    expect(snsMeta(null)).toEqual({ label: 'リンク', icon: 'link' });
    expect(snsMeta('???').icon).toBe('link');
  });
});
