// WannaLog デザイントークン（Warm Cream テーマ）
// 色や余白の定数をここに集約。画面側はここを参照する。

export const colors = {
  cream: '#FAF7F2',     // 画面の地
  white: '#FFFFFF',     // カード面
  charcoal: '#2B2724',  // メイン文字
  warmgray: '#9A9088',  // サブ文字
  coral: '#FF6B4A',     // アクセント（保存・通知）
  honey: '#F2B544',     // 達成バッジ
  line: '#EFE9E1',      // ごく薄い区切り
};

// カテゴリ定義（key / 表示名 / 絵文字 / 色）
export const CATEGORIES = [
  { key: 'eat',  label: '食べたい', emoji: '🍽️', color: '#FF6B4A' },
  { key: 'go',   label: '行きたい', emoji: '📍', color: '#3A8DDE' },
  { key: 'see',  label: '見たい',   emoji: '🎬', color: '#7C5CE7' },
  { key: 'want', label: '欲しい',   emoji: '🛍️', color: '#C86DD7' },
  { key: 'do',   label: 'やりたい', emoji: '💪', color: '#43A047' },
  { key: 'know', label: '知りたい', emoji: '📖', color: '#F29624' },
];

export function getCategory(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];
}

// 通知の文面（カテゴリごとに“わくわく再点火”のトーン）
export function reminderBody(categoryKey) {
  switch (categoryKey) {
    case 'eat':  return 'まだ食べてないね。今週末どう？🍜';
    case 'go':   return 'まだ行けてないね。次の休み、行っちゃう？🗺️';
    case 'see':  return 'まだ観てないね。今夜どう？🎬';
    case 'want': return 'まだ手に入れてないね。ちょっと見てみる？🛍️';
    case 'do':   return '少しだけやってみない？一歩で前に進むよ💪';
    case 'know': return '気になってたこと、調べてみる？📖';
    default:     return 'これ、まだ楽しみにしてるよね？✨';
  }
}
