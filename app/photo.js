// 写真がまだ付いていない「したい」の判定（純粋関数）。
// ホームの「写真なし」フィルタに使う＝熱いうちにタイトルだけで保存したものを、あとで仕上げやすくする。

// 達成済みは「仕上げ待ち」に含めない（もう終わったことなので）。
export function needsPhoto(item) {
  return !item.doneAt && !item.imageUri;
}

export function countNeedsPhoto(items) {
  return items.filter(needsPhoto).length;
}
