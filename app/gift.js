// ギフトページの対象アイテムと共有文言（純粋関数＝テストしやすい）

// ギフトページに出す対象：公開設定がオンで、まだ達成していないアイテムのみ
export function giftableItems(items) {
  return items.filter((it) => it.isPublic && !it.doneAt);
}

// 共有シートに渡す本文（タイトルを箇条書きにする）
export function giftShareMessage(name, list) {
  const body = list.map((it) => `・${it.title}`).join('\n');
  return `${name}のほしいものリスト\n\n${body}\n\n— WannaLog で作成`;
}
