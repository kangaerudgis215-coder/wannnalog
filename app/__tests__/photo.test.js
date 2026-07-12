import { needsPhoto, countNeedsPhoto } from '../photo';

describe('needsPhoto', () => {
  test('画像が無く未達成なら true', () => {
    expect(needsPhoto({ imageUri: null, doneAt: null })).toBe(true);
  });
  test('画像があれば false', () => {
    expect(needsPhoto({ imageUri: 'file://a.jpg', doneAt: null })).toBe(false);
  });
  test('画像が無くても達成済みなら false（仕上げ待ちに含めない）', () => {
    expect(needsPhoto({ imageUri: null, doneAt: 12345 })).toBe(false);
  });
});

describe('countNeedsPhoto', () => {
  test('画像なし・未達成の件数だけ数える', () => {
    const items = [
      { imageUri: null, doneAt: null },
      { imageUri: 'x', doneAt: null },
      { imageUri: null, doneAt: 1 },
      { imageUri: null, doneAt: null },
    ];
    expect(countNeedsPhoto(items)).toBe(2);
  });
  test('空配列は0', () => {
    expect(countNeedsPhoto([])).toBe(0);
  });
});
