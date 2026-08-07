// ホーム画面の並び（masonry / feature）を決める純粋ロジック。テストしやすい形。
// 熱量(heat)=本気(3)のカードは、間隔をあけて大きく目立たせる「featureカード」として挟む。

// featureカードの後、次のfeatureまで最低これだけ通常カードを挟む
export const FEATURE_GAP = 6;

export function homeBlocks(visible) {
  const blocks = []; let buffer = []; let since = 0;
  const flush = () => { if (buffer.length) { blocks.push({ type: 'masonry', items: buffer }); buffer = []; } };
  visible.forEach((it) => {
    if ((it.heat || 2) === 3 && since >= FEATURE_GAP) { flush(); blocks.push({ type: 'feature', item: it }); since = 0; }
    else { buffer.push(it); since++; }
  });
  flush();
  return blocks;
}
