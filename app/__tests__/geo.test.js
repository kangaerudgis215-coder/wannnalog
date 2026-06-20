import { parseGps, coordsMapsUrl } from '../geo';

describe('parseGps', () => {
  test('N/E のリファレンスで正の緯度経度', () => {
    expect(parseGps({ GPSLatitude: 35.66, GPSLatitudeRef: 'N', GPSLongitude: 139.7, GPSLongitudeRef: 'E' }))
      .toEqual({ lat: 35.66, lng: 139.7 });
  });
  test('S/W のリファレンスで負に変換', () => {
    expect(parseGps({ GPSLatitude: 33.8, GPSLatitudeRef: 'S', GPSLongitude: 151.2, GPSLongitudeRef: 'W' }))
      .toEqual({ lat: -33.8, lng: -151.2 });
  });
  test('符号付き数値（Refなし）はそのまま', () => {
    expect(parseGps({ GPSLatitude: -22.9, GPSLongitude: -43.1 })).toEqual({ lat: -22.9, lng: -43.1 });
  });
  test('latitude/longitude 形式も対応', () => {
    expect(parseGps({ latitude: 40.7, longitude: -74.0 })).toEqual({ lat: 40.7, lng: -74.0 });
  });
  test('GPSが無い/0,0/不正は null', () => {
    expect(parseGps(null)).toBeNull();
    expect(parseGps({})).toBeNull();
    expect(parseGps({ GPSLatitude: 0, GPSLongitude: 0 })).toBeNull();
    expect(parseGps({ GPSLatitude: 'x', GPSLongitude: 'y' })).toBeNull();
  });
});

describe('coordsMapsUrl', () => {
  test('地図URLを生成', () => {
    expect(coordsMapsUrl(35.6, 139.7)).toBe('https://www.google.com/maps/search/?api=1&query=35.6,139.7');
  });
});
