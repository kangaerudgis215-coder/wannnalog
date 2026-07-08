import { guessCategoryFromText, extractTitleFromText, analyzeText } from '../textAnalysis';

describe('guessCategoryFromText', () => {
  test('レシピっぽい文章は作りたい', () => {
    expect(guessCategoryFromText('簡単オムライスのレシピ\n材料：卵2個\n大さじ1のバターを使う')).toBe('cook');
  });
  test('グルメ系の文章は食べたい', () => {
    expect(guessCategoryFromText('渋谷のランチ特集\n人気の定食屋さんを食べログで紹介')).toBe('eat');
  });
  test('観光系の文章は行きたい', () => {
    expect(guessCategoryFromText('鎌倉の観光スポット\nアクセス：鎌倉駅から徒歩10分\n営業時間 9:00-17:00')).toBe('go');
  });
  test('動画系の文章は見たい', () => {
    expect(guessCategoryFromText('話題のドラマ最新シーズンのあらすじ\n配信中')).toBe('see');
  });
  test('通販系の文章は欲しい', () => {
    expect(guessCategoryFromText('人気スニーカー在庫あり\n送料無料クーポン配布中')).toBe('want');
  });
  test('該当キーワードが無いテキストは null', () => {
    expect(guessCategoryFromText('こんにちは、今日はいい天気です')).toBeNull();
  });
  test('空・未定義は null', () => {
    expect(guessCategoryFromText('')).toBeNull();
    expect(guessCategoryFromText(undefined)).toBeNull();
  });
});

describe('extractTitleFromText', () => {
  test('1行目をタイトルとして採用', () => {
    expect(extractTitleFromText('鎌倉の海が見えるカフェ\n住所：神奈川県鎌倉市...')).toBe('鎌倉の海が見えるカフェ');
  });
  test('記号だけの行は飛ばして次の行を採用', () => {
    expect(extractTitleFromText('---\n海辺のカフェ\n営業中')).toBe('海辺のカフェ');
  });
  test('「タイトル - サイト名」はタイトル部分だけ採用', () => {
    expect(extractTitleFromText('AirPods Pro 第2世代 - Amazon.co.jp')).toBe('AirPods Pro 第2世代');
  });
  test('「タイトル｜サイト名」もタイトル部分だけ採用', () => {
    expect(extractTitleFromText('鬼滅の刃 最新話まとめ｜アニメ配信サイト')).toBe('鬼滅の刃 最新話まとめ');
  });
  test('長すぎる行は句読点で自然に切る', () => {
    const long = '鎌倉で人気の海が見えるおしゃれなカフェで、ゆったりとした時間を過ごせるお店です。営業時間は朝から夜まで';
    const result = extractTitleFromText(long);
    expect(result.length).toBeLessThan(long.length);
    expect(result.startsWith('鎌倉で人気の海が見えるおしゃれなカフェで')).toBe(true);
  });
  test('空・未定義は null', () => {
    expect(extractTitleFromText('')).toBeNull();
    expect(extractTitleFromText(undefined)).toBeNull();
  });
});

describe('analyzeText', () => {
  test('タイトルとカテゴリをまとめて返す', () => {
    expect(analyzeText('簡単オムライスのレシピ\n材料：卵2個・大さじ1のバター')).toEqual({
      title: '簡単オムライスのレシピ',
      category: 'cook',
    });
  });
});
