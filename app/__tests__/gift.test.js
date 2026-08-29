import { giftableItems, giftShareMessage } from '../gift';

describe('giftableItems', () => {
  const items = [
    { id: 'a', title: '公開・未達成', isPublic: true, doneAt: null },
    { id: 'b', title: '公開・達成済み', isPublic: true, doneAt: 100 },
    { id: 'c', title: '非公開・未達成', isPublic: false, doneAt: null },
    { id: 'd', title: '非公開設定なし', doneAt: null },
  ];

  test('公開設定オン かつ 未達成のみを返す', () => {
    expect(giftableItems(items).map((it) => it.id)).toEqual(['a']);
  });

  test('該当なしなら空配列', () => {
    expect(giftableItems([{ id: 'z', isPublic: false, doneAt: null }])).toEqual([]);
  });
});

describe('giftShareMessage', () => {
  test('名前と箇条書きの本文を組み立てる', () => {
    const msg = giftShareMessage('さくら', [{ title: '鎌倉の海カフェ' }, { title: '富士登山' }]);
    expect(msg).toBe('さくらのほしいものリスト\n\n・鎌倉の海カフェ\n・富士登山\n\n— WannaLog で作成');
  });

  test('対象が空でも文言は組み立てられる', () => {
    expect(giftShareMessage('たろう', [])).toBe('たろうのほしいものリスト\n\n\n\n— WannaLog で作成');
  });
});
