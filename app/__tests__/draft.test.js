import { buildQuickCaptureItem, resolveSaveImageAndLink, buildNewItem } from '../draft';

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

describe('buildNewItem', () => {
  test('入力値を反映し、notifId未予約・未達成の新規アイテムを作る', () => {
    const item = buildNewItem(
      { title: '鎌倉の海カフェ', category: 'eat', due: 'weekend', imageUri: 'file://a.jpg', heat: 3, reminder: { remind: '1week' }, link: { url: 'https://example.com', platform: 'x' }, withWho: 'friend' },
      1000,
    );
    expect(item).toEqual({
      id: '1000', title: '鎌倉の海カフェ', category: 'eat', dueTag: 'weekend', imageUri: 'file://a.jpg',
      heat: 3, withWho: 'friend', sourceUrl: 'https://example.com', sourcePlatform: 'x',
      remind: '1week', notifId: null, createdAt: 1000, doneAt: null,
    });
  });

  test('未指定項目は既定値にフォールバック（カテゴリ/画像/同行者/リンクはnull、期限はnone、熱量は2、リマインドは3日後）', () => {
    const item = buildNewItem({ title: 'タイトル' }, 1000);
    expect(item.category).toBeNull();
    expect(item.dueTag).toBe('none');
    expect(item.imageUri).toBeNull();
    expect(item.heat).toBe(2);
    expect(item.withWho).toBeNull();
    expect(item.sourceUrl).toBeNull();
    expect(item.sourcePlatform).toBeNull();
    expect(item.remind).toBe('3days');
    expect(item.notifId).toBeNull();
    expect(item.doneAt).toBeNull();
  });

  test('dataとnowを省略しても動く', () => {
    expect(typeof buildNewItem().id).toBe('string');
  });
});
