// 写真のEXIFから撮影場所(緯度経度)を取り出す純粋ロジック。テストしやすい形。
// iOSは GPSLatitude/GPSLongitude + Ref(N/S/E/W) で来ることが多い。符号付き数値の場合もある。

export function parseGps(exif) {
  if (!exif) return null;
  let lat = exif.GPSLatitude != null ? exif.GPSLatitude : exif.latitude;
  let lng = exif.GPSLongitude != null ? exif.GPSLongitude : exif.longitude;
  if (lat == null || lng == null) return null;
  const rawLat = Number(lat);
  const rawLng = Number(lng);
  if (Number.isNaN(rawLat) || Number.isNaN(rawLng)) return null;
  lat = Math.abs(rawLat);
  lng = Math.abs(rawLng);
  const latRef = exif.GPSLatitudeRef;
  const lngRef = exif.GPSLongitudeRef;
  if (latRef === 'S') lat = -lat;
  else if (!latRef && rawLat < 0) lat = -lat;
  if (lngRef === 'W') lng = -lng;
  else if (!lngRef && rawLng < 0) lng = -lng;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

export function coordsMapsUrl(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
