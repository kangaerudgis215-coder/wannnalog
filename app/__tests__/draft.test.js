import { buildQuickCaptureItem, resolveSaveImageAndLink } from '../draft';

describe('buildQuickCaptureItem', () => {
  test('タイトル・カテゴリ・画像・リンクをそのまま反映する', () => {
    const item = buildQuickCaptureItem({ title: ' 鎌倉の海カフェ ', category: 'eat', imageUri: 'file://a.jpg', link: 'https://example.com' });
    expect(item.title).toBe('鎌倉の海カフェ');
    expect(item.category).toBe('eat');
    expect(item.imageUri).toBe('file://a.jpg');
    expect(item.link).toEqual({ url: 'https://example.com', platform: null });
    expect(item.heat).toBe(2);
    expect(item.due).toBe('none');
    expect(item.withWho).toBeNull();
    expect(item.reminder).toEqual({ remind: '3days' });
  });

  test('タイトル未入力（空白のみ）は「（無題）」になる', () => {
    expect(buildQuickCaptureItem({ title: '   ' }).title).toBe('（無題）');
    expect(buildQuickCaptureItem({}).title).toBe('（無題）');
  });

  test('カテゴリ・画像・リンク未指定はnullになる', () => {
    const item = buildQuickCaptureItem({ title: 'タイトル' });
    expect(item.category).toBeNull();
    expect(item.imageUri).toBeNull();
    expect(item.link).toBeNull();
  });
});

describe('resolveSaveImageAndLink', () => {
  test('画像を選んでいればそれを優先する', () => {
    const { imageUri, linkInfo } = resolveSaveImageAndLink({ image: 'file://picked.jpg', sns: null, link: '' });
    expect(imageUri).toBe('file://picked.jpg');
    expect(linkInfo).toBeNull();
  });

  test('画像未選択でもSNSリンクならサムネを使う', () => {
    const { imageUri, linkInfo } = resolveSaveImageAndLink({
      image: null,
      sns: { url: 'https://youtube.com/watch?v=abc', platform: 'youtube', thumbnail: 'https://img.youtube.com/abc.jpg' },
      link: 'https://youtube.com/watch?v=abc',
    });
    expect(imageUri).toBe('https://img.youtube.com/abc.jpg');
    expect(linkInfo).toEqual({ url: 'https://youtube.com/watch?v=abc', platform: 'youtube' });
  });

  test('SNS以外の通常リンクは前後の空白を除いてplatform:nullで保存する', () => {
    const { imageUri, linkInfo } = resolveSaveImageAndLink({ image: null, sns: null, link: '  https://example.com  ' });
    expect(imageUri).toBeNull();
    expect(linkInfo).toEqual({ url: 'https://example.com', platform: null });
  });

  test('画像もリンクも無ければ両方null', () => {
    const { imageUri, linkInfo } = resolveSaveImageAndLink({ image: null, sns: null, link: '' });
    expect(imageUri).toBeNull();
    expect(linkInfo).toBeNull();
  });
});
