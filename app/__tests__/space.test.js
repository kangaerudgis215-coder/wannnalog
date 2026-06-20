import { PERSONAL_SPACE_ID, withSpaceId } from '../space';

describe('withSpaceId', () => {
  test('spaceId が無いアイテムには personal を付与する', () => {
    const list = [{ id: 'a', title: 'x' }];
    expect(withSpaceId(list)[0].spaceId).toBe(PERSONAL_SPACE_ID);
  });

  test('既に spaceId があるアイテムは変えない', () => {
    const list = [{ id: 'a', spaceId: 'team1' }];
    expect(withSpaceId(list)[0].spaceId).toBe('team1');
  });

  test('元の配列・オブジェクトは変更しない（イミュータブル）', () => {
    const list = [{ id: 'a' }];
    withSpaceId(list);
    expect(list[0].spaceId).toBeUndefined();
  });
});
