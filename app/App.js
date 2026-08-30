// WannaLog — ダーク/ライト対応・アイコン化・写真前面UI
// タブ：ホーム / ビジョン / ＋ / 通知 / マイページ

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, Image, KeyboardAvoidingView, Linking, Modal, Platform,
  Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Switch, Text, TextInput, useWindowDimensions, View, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { GestureHandlerRootView, ScrollView as GHScrollView, Swipeable, Gesture, GestureDetector } from 'react-native-gesture-handler';

import { palettes, CATEGORIES, getCategory, reminderBody, WITH_OPTIONS, getWith, catSoft } from './theme';
import { actionLinks, detailLinks, dueLabel } from './links';
import { reminderPlan, remindSummary, groupNotifyItems, NOTIFY_SECTIONS } from './notify';
import { HEAT_OPTIONS, heatLabel, defaultRemindForHeat } from './heat';
import { DAY_MS, achievementRate, weeklyDoneCounts, WEEKDAY_LABELS, categoryStats } from './stats';
import { moveItem } from './reorder';
import { homeBlocks } from './layout';
import { visibleItems, snsPlatformsPresent, upcomingItems } from './filter';
import { giftableItems, giftShareMessage } from './gift';
import { parseSnsLink, snsMeta } from './sns';
import { fetchOgp, cleanTitle, isUrl, isMapsUrl, guessCategoryFromUrl } from './ogp';
import { buildQuickCaptureItem, resolveSaveImageAndLink } from './draft';
import { PLANT, stageForCount, growthProgress, coinsForCount, WATER_MAX, ACHIEVE_GAIN, todayKey, remainingWaterToday, dayPeriod } from './garden';
import { cardAspect } from './hash';
import { VISION_FONTS, visionFont, VISION_CATEGORY_SEED, CATEGORY_COLORS, VISION_STAGES, stageAccent, TIMING_PRESETS, timingLabel, migrateVisions, achievedGallery, getCategoryById } from './vision';
import { baseFamily } from './font';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { ZenMaruGothic_400Regular, ZenMaruGothic_500Medium, ZenMaruGothic_700Bold, ZenMaruGothic_900Black } from '@expo-google-fonts/zen-maru-gothic';
import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { ShipporiMincho_400Regular } from '@expo-google-fonts/shippori-mincho';
import { ZenOldMincho_700Bold } from '@expo-google-fonts/zen-old-mincho';
import { MochiyPopOne_400Regular } from '@expo-google-fonts/mochiy-pop-one';

// フォント名（weight→ファミリーの対応）。見出し/本文=Zen Maru Gothic（丸ゴ）、数字強調=Fredoka。
const FONT = {
  base: 'ZenMaruGothic_400Regular', med: 'ZenMaruGothic_500Medium',
  bold: 'ZenMaruGothic_700Bold', xbold: 'ZenMaruGothic_900Black',
  num: 'Fredoka_700Bold', numSb: 'Fredoka_600SemiBold', numMed: 'Fredoka_500Medium',
  mincho: 'ShipporiMincho_400Regular', oldMincho: 'ZenOldMincho_700Bold', pop: 'MochiyPopOne_400Regular',
};
const STORAGE_KEY = 'wannalog_items_v1';
const THEME_KEY = 'wannalog_theme';
const PROFILE_KEY = 'wannalog_profile';
const PROFILE_PHOTO_KEY = 'wannalog_profile_photo';
const DENSITY_KEY = 'wannalog_density'; // 'compact'（既定）/ 'comfy'（ゆったり）
const VISION_KEY = 'wannalog_vision_v1';       // ビジョン（欲求）の配列。読み込み時にv2へ移行
const VISION_TITLE_KEY = 'wannalog_vision_title';
const VISION_CAT_KEY = 'wannalog_vision_categories'; // カテゴリ（種別）の配列
const TIMING_LABELS_KEY = 'wannalog_timing_labels';  // 「時期」の独自ラベル（再利用用）
const GARDEN_KEY = 'wannalog_garden_v1';
// 箱庭は「将来の設計」としてステイ。今はSNS認知づくりに集中するため非表示（true で復活）。
const GARDEN_ENABLED = false;
// 共有／プレゼント機能は一旦保留（true で復活）。スクショ保存の強化に集中する。
const SHARE_ENABLED = false;
// バックアップは試作・引っ越し用（リリース版はクラウド同期に置換予定）。今は非表示（true で復活）。
const BACKUP_ENABLED = false;

// ビジョン（欲求のストック）は「したい」とは別データ。初期は空（空状態が招待になる）。
const VISION_SEED = [];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

const SEED = [
  { id: 's1', title: '一蘭 渋谷店で豚骨ラーメン', category: 'eat', dueTag: 'thisWeek', remind: 'tomorrow', heat: 3, createdAt: Date.now(), doneAt: null },
  { id: 's2', title: 'モルディブの透明な海', category: 'go', dueTag: 'none', remind: '3days', heat: 2, createdAt: Date.now(), doneAt: null },
  { id: 's3', title: 'DUNE PART2をIMAXで観る', category: 'see', dueTag: 'none', remind: 'none', heat: 1, createdAt: Date.now(), doneAt: null },
];

const DUE_OPTIONS = [
  { key: 'none', label: 'なし' },
  { key: 'today', label: '今日' },
  { key: 'thisWeek', label: '今週' },
  { key: 'nextWeek', label: '来週' },
  { key: 'thisMonth', label: '今月' },
  { key: 'q1', label: 'Q1' },
  { key: 'q2', label: 'Q2' },
  { key: 'q3', label: 'Q3' },
  { key: 'q4', label: 'Q4' },
];

// カテゴリ用アイコン：set==='mci' は MaterialCommunityIcons（鍋・コック帽など）、それ以外は Ionicons。
function VIcon({ set, name, size, color, style }) {
  const C = set === 'mci' ? MaterialCommunityIcons : Ionicons;
  return <C name={name} size={size} color={color} style={style} />;
}

/* ---------- テーマ ---------- */
const ThemeCtx = createContext(palettes.dark);
const useTheme = () => useContext(ThemeCtx);
const _styleCache = {};
function useStyles() {
  const t = useTheme();
  if (!_styleCache[t.mode]) _styleCache[t.mode] = makeStyles(t);
  return _styleCache[t.mode];
}

async function _schedule(item, trigger) {
  const cat = getCategory(item.category);
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: cat.label + '：' + item.title, body: reminderBody(item.category), data: { id: item.id } },
      trigger,
    });
  } catch (e) { console.warn('通知の予約に失敗:', e); return null; }
}
// アイテムの通知設定（remind/at/daily/weekly）に従って予約
async function scheduleReminder(item) {
  const plan = reminderPlan(item);
  if (!plan) return null;
  const T = Notifications.SchedulableTriggerInputTypes;
  let trigger;
  if (plan.kind === 'interval') trigger = { type: T.TIME_INTERVAL, seconds: plan.seconds, repeats: false };
  else if (plan.kind === 'date') trigger = { type: T.DATE, date: new Date(plan.at) };
  else if (plan.kind === 'daily') trigger = { type: T.DAILY, hour: plan.hour, minute: plan.minute };
  else if (plan.kind === 'weekly') trigger = { type: T.WEEKLY, weekday: plan.weekday, hour: plan.hour, minute: plan.minute };
  else return null;
  return await _schedule(item, trigger);
}
async function scheduleInSeconds(item, seconds) {
  return await _schedule(item, { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false });
}

export default function App() {
  const [mode, setMode] = useState('light'); // キャンディボックス配色は明るいクリームが主役
  const [profileName, setProfileName] = useState('あなた');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [density, setDensity] = useState('compact');
  const [items, setItems] = useState([]);
  const [visionSlots, setVisionSlots] = useState(VISION_SEED);   // ビジョン配列（v2）
  const [visionCats, setVisionCats] = useState(VISION_CATEGORY_SEED); // カテゴリ配列
  const [timingLabels, setTimingLabels] = useState([]);          // 「時期」独自ラベル（再利用）
  const [visionTitle, setVisionTitle] = useState('MY VISION');
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('home');
  const [selectedId, setSelectedId] = useState(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false); // スクショ/リンクからのクイック保存
  const [visionAddOpen, setVisionAddOpen] = useState(false); // ビジョン追加（下の＋から）
  const [detailStartEdit, setDetailStartEdit] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [gardenOpen, setGardenOpen] = useState(false);
  const [garden, setGarden] = useState({ points: 0, waterDate: '', waterCount: 0 });
  const [celeb, setCeleb] = useState(null); // 達成演出：{ item }
  const mypageBounce = useRef(new Animated.Value(1)).current; // 達成の締めでマイページアイコンが弾む
  const [fontsLoaded] = useFonts({
    ZenMaruGothic_400Regular, ZenMaruGothic_500Medium, ZenMaruGothic_700Bold, ZenMaruGothic_900Black,
    Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold,
    ShipporiMincho_400Regular, ZenOldMincho_700Bold, MochiyPopOne_400Regular,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') await Notifications.requestPermissionsAsync();
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw)); else { setItems(SEED); AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED)); }
      const m = await AsyncStorage.getItem(THEME_KEY); if (m) setMode(m);
      const p = await AsyncStorage.getItem(PROFILE_KEY); if (p) setProfileName(p);
      const pp = await AsyncStorage.getItem(PROFILE_PHOTO_KEY); if (pp) setProfilePhoto(pp);
      const dn = await AsyncStorage.getItem(DENSITY_KEY); if (dn) setDensity(dn);
      // カテゴリ（無ければ初期テンプレを保存）
      const vc = await AsyncStorage.getItem(VISION_CAT_KEY);
      if (vc) setVisionCats(JSON.parse(vc)); else AsyncStorage.setItem(VISION_CAT_KEY, JSON.stringify(VISION_CATEGORY_SEED));
      // ビジョン（旧スロットは読み込み時にv2へ移行して保存し直す）
      const vs = await AsyncStorage.getItem(VISION_KEY);
      if (vs) {
        const migrated = migrateVisions(JSON.parse(vs));
        setVisionSlots(migrated);
        AsyncStorage.setItem(VISION_KEY, JSON.stringify(migrated));
      }
      const tl = await AsyncStorage.getItem(TIMING_LABELS_KEY); if (tl) setTimingLabels(JSON.parse(tl));
      const vt = await AsyncStorage.getItem(VISION_TITLE_KEY); if (vt) setVisionTitle(vt);
      const g = await AsyncStorage.getItem(GARDEN_KEY); if (g) setGarden(JSON.parse(g));
    })();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const id = res.notification.request.content.data?.id;
      if (id) setSelectedId(id);
    });
    return () => sub.remove();
  }, []);

  const t = palettes[mode] || palettes.dark;

  async function toggleMode() {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next); await AsyncStorage.setItem(THEME_KEY, next);
    Haptics.selectionAsync();
  }
  async function saveName(name) { setProfileName(name); await AsyncStorage.setItem(PROFILE_KEY, name); }
  async function pickProfilePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('写真へのアクセスが許可されていません'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (!res.canceled) { setProfilePhoto(res.assets[0].uri); await AsyncStorage.setItem(PROFILE_PHOTO_KEY, res.assets[0].uri); Haptics.selectionAsync(); }
  }
  async function setDensityPref(d) { setDensity(d); await AsyncStorage.setItem(DENSITY_KEY, d); Haptics.selectionAsync(); }

  // バックアップ書き出し：全データをJSONファイルにして共有（保存/AirDrop/iCloud）。
  async function exportData() {
    try {
      const payload = {
        app: 'WannaLog', version: 1, exportedAt: new Date().toISOString(),
        items, vision: { slots: visionSlots, title: visionTitle, categories: visionCats, timingLabels },
        profile: { name: profileName }, garden,
        prefs: { theme: mode, density },
      };
      const json = JSON.stringify(payload, null, 2);
      const uri = FileSystem.documentDirectory + `wannalog-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(uri, json);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'WannaLog バックアップを保存' });
      else await Share.share({ message: json });
    } catch (e) { Alert.alert('書き出しに失敗しました', String(e?.message || e)); }
  }
  // バックアップ読み込み：ファイルを選ぶ→確認→上書き復元（通知は貼り直す）。
  async function importData() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', '*/*'], copyToCacheDirectory: true });
      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri; if (!uri) return;
      const data = JSON.parse(await FileSystem.readAsStringAsync(uri));
      if (!data || !Array.isArray(data.items)) { Alert.alert('読み込めませんでした', 'WannaLog のバックアップファイルではないようです。'); return; }
      Alert.alert('読み込みますか？', '今のデータは上書きされます。よろしいですか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '上書きして復元', style: 'destructive', onPress: async () => {
          // 通知はバックアップ元の予約が無効なので、未達成アイテムは貼り直す
          const withNotif = [];
          for (const it of data.items) {
            let notifId = null;
            if (!it.doneAt && it.remind && it.remind !== 'none') { try { notifId = await scheduleReminder(it); } catch (e) {} }
            withNotif.push({ ...it, notifId });
          }
          await persist(withNotif);
          if (data.vision) {
            await persistVision(migrateVisions(data.vision.slots || VISION_SEED));
            if (data.vision.categories) await persistCats(data.vision.categories);
            if (data.vision.timingLabels) await persistTimingLabels(data.vision.timingLabels);
            await saveVisionTitle(data.vision.title || 'MY VISION');
          }
          if (data.profile?.name) await saveName(data.profile.name);
          if (data.garden) await persistGarden(data.garden);
          if (data.prefs?.theme) { setMode(data.prefs.theme); await AsyncStorage.setItem(THEME_KEY, data.prefs.theme); }
          if (data.prefs?.density) await setDensityPref(data.prefs.density);
          Alert.alert('復元しました', 'バックアップからデータを読み込みました。');
        } },
      ]);
    } catch (e) { Alert.alert('読み込みに失敗しました', String(e?.message || e)); }
  }
  // リンクを開く：端末の既定ブラウザで開く（ブラウザ選択はなし）。
  function openInBrowser(url) {
    if (!url) return;
    Linking.openURL(url).catch(() => Alert.alert('リンクを開けませんでした'));
  }

  // ビジョン（欲求ストック）操作。「したい」とは別データ。
  async function persistVision(next) { setVisionSlots(next); await AsyncStorage.setItem(VISION_KEY, JSON.stringify(next)); }
  async function persistCats(next) { setVisionCats(next); await AsyncStorage.setItem(VISION_CAT_KEY, JSON.stringify(next)); }
  async function persistTimingLabels(next) { setTimingLabels(next); await AsyncStorage.setItem(TIMING_LABELS_KEY, JSON.stringify(next)); }
  async function saveVisionTitle(v) { setVisionTitle(v); await AsyncStorage.setItem(VISION_TITLE_KEY, v); }

  // 新規ビジョンを追加（1画面シートから）。初期ステータスは「叶えたい」。
  async function addVision(data) {
    const maxOrder = visionSlots.reduce((m, v) => Math.max(m, v.order || 0), 0);
    const v = {
      id: String(Date.now()), categoryId: data.categoryId || null, title: (data.title || '').trim(),
      timing: data.timing || null, status: 'want', imageUri: data.imageUri || null,
      memo: (data.memo || '').trim(), font: data.font || 'mincho',
      createdAt: Date.now(), achievedAt: null, order: maxOrder + 1,
    };
    // 独自ラベルの時期は再利用リストに保存
    if (v.timing && v.timing.kind === 'label' && v.timing.text) await rememberTimingLabel(v.timing.text);
    await persistVision([...visionSlots, v]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  async function updateVision(id, patch) {
    if (patch.timing && patch.timing.kind === 'label' && patch.timing.text) await rememberTimingLabel(patch.timing.text);
    await persistVision(visionSlots.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }
  async function removeVision(id) { await persistVision(visionSlots.filter((v) => v.id !== id)); }
  // 写真をタップ→トリミングして差し替え（1ビジョン1枚）。
  async function pickVisionPhoto(id) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('写真へのアクセスが許可されていません'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
    if (!res.canceled) { await updateVision(id, { imageUri: res.assets[0].uri }); Haptics.selectionAsync(); }
  }
  // 「叶った」に変更：達成日を記録して達成演出（ホームと同じ演出を流用）。
  async function markVisionAchieved(id) {
    const v = visionSlots.find((x) => x.id === id); if (!v) return;
    await persistVision(visionSlots.map((x) => (x.id === id ? { ...x, status: 'done', achievedAt: Date.now() } : x)));
    setCeleb({ item: { imageUri: v.imageUri, title: v.title, category: null } });
  }
  // 「叶った」から戻す（達成日を消す）。
  async function revertVision(id, status) { await updateVision(id, { status, achievedAt: null }); }
  async function reorderVision(ids) {
    // 表示中(id順)を order に反映。並びに含まれないもの（達成分など）は末尾へ。
    const pos = Object.fromEntries(ids.map((id, i) => [id, i]));
    const next = visionSlots.map((v) => (pos[v.id] != null ? { ...v, order: pos[v.id] } : v));
    await persistVision(next);
    Haptics.selectionAsync();
  }
  // カテゴリ操作
  async function addCategory(name, color) {
    const c = { id: 'c' + Date.now(), name: (name || '').trim() || 'カテゴリ', color: color || CATEGORY_COLORS[0] };
    await persistCats([...visionCats, c]);
    return c;
  }
  async function updateCategory(id, patch) { await persistCats(visionCats.map((c) => (c.id === id ? { ...c, ...patch } : c))); }
  async function removeCategory(id) {
    // そのカテゴリのビジョンは「未分類」に戻す（消さない）。
    await persistVision(visionSlots.map((v) => (v.categoryId === id ? { ...v, categoryId: null } : v)));
    await persistCats(visionCats.filter((c) => c.id !== id));
  }
  async function rememberTimingLabel(text) {
    const t2 = (text || '').trim(); if (!t2 || timingLabels.includes(t2)) return;
    await persistTimingLabels([t2, ...timingLabels].slice(0, 12));
  }

  async function persist(next) { setItems(next); await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }

  // 箱庭：成長ポイント・水やり回数を保存
  async function persistGarden(next) { setGarden(next); await AsyncStorage.setItem(GARDEN_KEY, JSON.stringify(next)); }
  async function waterPlant() {
    const key = todayKey();
    const used = garden.waterDate === key ? (garden.waterCount || 0) : 0;
    if (used >= WATER_MAX) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }
    await persistGarden({ ...garden, points: (garden.points || 0) + 1, waterDate: key, waterCount: used + 1 });
    Haptics.selectionAsync();
  }

  async function addItem(data, opts = {}) {
    const { title, category, due, imageUri, heat, reminder, link, withWho } = data;
    const rem = reminder || { remind: '3days' };
    const item = { id: String(Date.now()), title, category: category || null, dueTag: due || 'none', imageUri: imageUri || null, heat: heat || 2, withWho: withWho || null, sourceUrl: link?.url || null, sourcePlatform: link?.platform || null, ...rem, notifId: null, createdAt: Date.now(), doneAt: null };
    item.notifId = await scheduleReminder(item);
    await persist([item, ...items]);
    if (!opts.silent) { // クイック保存は独自アニメがあるのでAlert抑制
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('保存しました', item.remind === 'none' ? 'ボードに追加しました。' : `${remindSummary(item)} に思い出させます。`);
    }
    return item.id;
  }

  function triggerMypageBounce() {
    mypageBounce.setValue(1);
    Animated.sequence([
      Animated.spring(mypageBounce, { toValue: 1.35, friction: 4, useNativeDriver: true }),
      Animated.spring(mypageBounce, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }

  async function markDone(id) {
    const it0 = items.find((x) => x.id === id);
    const next = items.map((it) => (it.id === id ? { ...it, doneAt: Date.now() } : it));
    await persist(next);
    await persistGarden({ ...garden, points: (garden.points || 0) + ACHIEVE_GAIN }); // 達成ボーナスで植物が大きく育つ
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (it0) setCeleb({ item: { ...it0, doneAt: Date.now() } });
  }
  async function updateItem(id, patch) { await persist(items.map((it) => (it.id === id ? { ...it, ...patch } : it))); }
  // 手動並べ替え：未達成カードを指定順に並べ、達成済みは末尾に保持して保存。
  async function reorderItems(activeIds) {
    const map = Object.fromEntries(items.map((it) => [it.id, it]));
    const active = activeIds.map((id) => map[id]).filter(Boolean);
    const done = items.filter((it) => it.doneAt);
    await persist([...active, ...done]);
    Haptics.selectionAsync();
  }
  // 通知設定を丸ごと差し替え：古い予約を取り消し→新設定で予約し直す
  async function applyReminder(id, reminder) {
    const it = items.find((x) => x.id === id); if (!it) return;
    if (it.notifId) { try { await Notifications.cancelScheduledNotificationAsync(it.notifId); } catch (e) {} }
    const updated = { ...it, remind: 'none', remindAt: null, remindHour: null, remindMinute: null, remindWeekday: null, ...reminder };
    const notifId = await scheduleReminder(updated);
    await persist(items.map((x) => (x.id === id ? { ...updated, notifId } : x)));
  }
  async function deleteItem(id) {
    const it = items.find((x) => x.id === id);
    if (it?.notifId) { try { await Notifications.cancelScheduledNotificationAsync(it.notifId); } catch (e) {} }
    await persist(items.filter((x) => x.id !== id)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const selected = items.find((it) => it.id === selectedId);
  const doneCount = items.filter((it) => it.doneAt).length;
  const activeCount = items.length - doneCount;
  const openItem = (it) => { Haptics.selectionAsync(); setSelectedId(it.id); };

  const s = _styleCache[mode] || (_styleCache[mode] = makeStyles(t));

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeCtx.Provider value={t}>
      <SafeAreaView style={s.safe}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        {selected ? (
          <DetailScreen
            key={selected.id} item={selected} startInEdit={detailStartEdit}
            onBack={() => { setSelectedId(null); setDetailStartEdit(false); }}
            onDone={() => { markDone(selected.id); setSelectedId(null); }}
            onUpdate={(patch) => updateItem(selected.id, patch)}
            onReminder={(reminder) => applyReminder(selected.id, reminder)}
            onOpenLink={openInBrowser}
            onDelete={() => { deleteItem(selected.id); setSelectedId(null); }}
          />
        ) : (
          <>
            {tab === 'home' && <HomeTab items={items} filter={filter} setFilter={setFilter} onOpen={openItem} onReorder={reorderItems} density={density} doneCount={doneCount} activeCount={activeCount} />}
            {tab === 'vision' && <VisionTab
              visions={visionSlots} cats={visionCats} title={visionTitle} timingLabels={timingLabels}
              addOpen={visionAddOpen} onCloseAdd={() => setVisionAddOpen(false)}
              onSetTitle={saveVisionTitle} onAdd={addVision} onUpdate={updateVision} onRemove={removeVision}
              onPickPhoto={pickVisionPhoto} onAchieve={markVisionAchieved} onRevert={revertVision} onReorder={reorderVision}
              onAddCategory={addCategory} onUpdateCategory={updateCategory} onRemoveCategory={removeCategory} />}
            {tab === 'notify' && <NotifyTab items={items} onOpen={openItem} onSnooze={(id) => applyReminder(id, { remind: 'at', remindAt: Date.now() + DAY_MS })} onStop={(id) => applyReminder(id, { remind: 'none' })} />}
            {tab === 'mypage' && <MyPageTab items={items} doneCount={doneCount} garden={garden} name={profileName} onName={saveName} photoUri={profilePhoto} onPickPhoto={pickProfilePhoto} density={density} onDensity={setDensityPref} onExport={exportData} onImport={importData} mode={mode} onToggleMode={toggleMode} onOpen={openItem} onOpenGift={() => setGiftOpen(true)} onOpenGarden={() => setGardenOpen(true)} />}
            <TabBar tab={tab} onTab={setTab} onAdd={() => { if (tab === 'vision') setVisionAddOpen(true); else setQuickOpen(true); }} mypageBounce={mypageBounce} />
          </>
        )}

        <QuickCaptureModal visible={quickOpen} onClose={() => setQuickOpen(false)}
          onSave={(draft) => { addItem(draft, { silent: true }); setQuickOpen(false); }}
          onEdit={async (draft) => { const id = await addItem(draft, { silent: true }); setQuickOpen(false); setDetailStartEdit(true); setSelectedId(id); }}
          onManual={() => { setQuickOpen(false); setSaveOpen(true); }} />

        <SaveModal visible={saveOpen} onClose={() => setSaveOpen(false)}
          onSave={(data) => { addItem(data); setSaveOpen(false); }} />

        <GiftModal visible={giftOpen} onClose={() => setGiftOpen(false)} items={items} name={profileName} onOpenLink={openInBrowser} onOpen={(it) => { setGiftOpen(false); openItem(it); }} />

        <GardenModal visible={gardenOpen} onClose={() => setGardenOpen(false)} garden={garden} doneCount={doneCount} onWater={waterPlant} />

        {celeb && <Celebration celeb={celeb} onTabBounce={triggerMypageBounce} onDone={() => setCeleb(null)} />}
      </SafeAreaView>
    </ThemeCtx.Provider>
    </GestureHandlerRootView>
  );
}

/* ---------- 共通：登場アニメ & マソンリー ---------- */
function FadeInView({ index = 0, children }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 340, delay: Math.min(index, 8) * 45, useNativeDriver: true }).start(); }, []);
  return <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>{children}</Animated.View>;
}
function Masonry({ items, renderTile }) {
  const s = useStyles();
  const cols = [[], []];
  items.forEach((it, i) => cols[i % 2].push({ it, i }));
  return (
    <View style={s.masonryRow}>
      {cols.map((col, c) => (
        <View key={c} style={s.masonryCol}>{col.map(({ it, i }) => renderTile(it, i))}</View>
      ))}
    </View>
  );
}

/* ---------- 達成演出（ポラロイド現像＋紙吹雪） ---------- */
// 達成時の英語の称賛メッセージ（短い一言。数パターンからランダムで1つ選ぶ）
const PRAISE = ['GREAT!', 'EXCELLENT!', 'BRAVO!', 'SUPER!', 'GOOD!', 'AMAZING!', 'PERFECT!', 'NICE!', 'WELL DONE!', 'YES!'];
function pickPraise() { return PRAISE[Math.floor(Math.random() * PRAISE.length)]; }

// カードの周りでキラキラ瞬く星（キラキラ演出）。位置は一度だけ決めて再描画で動かない。
function Sparkles({ count = 14, color = '#FFFFFF' }) {
  const parts = useRef([...Array(count)].map(() => ({
    x: (Math.random() * 2 - 1) * 150,                 // カード中心からの左右
    y: (Math.random() * 2 - 1) * 190,                 // 上下
    size: 7 + Math.random() * 12,
    delay: Math.random() * 900,
    dur: 700 + Math.random() * 700,
    a: new Animated.Value(0),
  }))).current;
  useEffect(() => {
    parts.forEach((p) => {
      Animated.loop(Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(p.a, { toValue: 1, duration: p.dur, useNativeDriver: true }),
        Animated.timing(p.a, { toValue: 0, duration: p.dur, useNativeDriver: true }),
      ])).start();
    });
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {parts.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: '50%', top: '50%',
          marginLeft: p.x, marginTop: p.y,
          opacity: p.a,
          transform: [{ scale: p.a.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
        }}>
          <Ionicons name="sparkles" size={p.size} color={color} />
        </Animated.View>
      ))}
    </View>
  );
}

// 紙吹雪：画面の上から下へまっすぐ降ってくる（ゆるい横ゆれ＋回転＋フェード）。
function Confetti({ colors, count }) {
  const { height } = useWindowDimensions();
  const parts = useRef([...Array(count)].map(() => ({
    startX: Math.random() * 100,                 // 画面横位置(%)
    drift: (Math.random() * 2 - 1) * 36,         // 落下中のゆるい横ゆれ(px)
    delay: Math.random() * 700,                  // ばらけて降り始める
    dur: 2400 + Math.random() * 1600,            // 落下にかかる時間
    size: 6 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: (Math.random() * 2 - 1) * 720,
    round: Math.random() > 0.5,
    a: new Animated.Value(0),
  }))).current;
  useEffect(() => {
    Animated.parallel(parts.map((p) => Animated.timing(p.a, { toValue: 1, duration: p.dur, delay: p.delay, easing: Easing.linear, useNativeDriver: true }))).start();
  }, []);
  const fallTo = height + 60;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {parts.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: p.startX + '%', top: -40,
          width: p.size, height: p.round ? p.size : p.size * 0.5,
          borderRadius: p.round ? p.size / 2 : 1, backgroundColor: p.color,
          opacity: p.a.interpolate({ inputRange: [0, 0.06, 0.85, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: p.a.interpolate({ inputRange: [0, 1], outputRange: [0, fallTo] }) },       // まっすぐ落下
            { translateX: p.a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.drift, 0] }) }, // ゆるい横ゆれ
            { rotate: p.a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', p.rot + 'deg'] }) },
          ],
        }} />
      ))}
    </View>
  );
}

function Celebration({ celeb, onTabBounce, onDone }) {
  const t = useTheme(); const s = useStyles();
  const { width, height } = useWindowDimensions();
  // 演出は熱量に関わらず一律で豪華に（本気/気になっただけの区別は無し）。
  const { item } = celeb;
  const cat = getCategory(item.category);
  const praise = useRef(pickPraise()).current;         // 表示のたびに1パターン選ぶ
  const bg = useRef(new Animated.Value(0)).current;    // 背景のふわっとフェード
  const pop = useRef(new Animated.Value(0)).current;   // カード＆チェックのやわらかいポップ
  const fly = useRef(new Animated.Value(0)).current;   // 最後にマイページタブへ飛ぶ
  const [confetti, setConfetti] = useState(false);
  const done = useRef(false);
  function finish() { if (!done.current) { done.current = true; onDone(); } }

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(bg, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start(() => setConfetti(true));
    // ゆっくり見せてから、カードをマイページタブへ吸い込ませる
    const timer = setTimeout(() => {
      onTabBounce && onTabBounce();
      Animated.parallel([
        Animated.timing(fly, { toValue: 1, duration: 620, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(bg, { toValue: 0, duration: 620, delay: 160, useNativeDriver: true }),
      ]).start(() => finish());
    }, 2900);
    return () => clearTimeout(timer);
  }, []);

  function skip() {
    if (done.current) return;
    Animated.timing(bg, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => { onTabBounce && onTabBounce(); finish(); });
  }
  const colors = [cat.tint, '#FFFFFF', t.gold];
  // マイページタブ（右端）へ向かう飛び先。中心からの移動量。
  const flyX = width * 0.36;
  const flyY = height * 0.42;

  return (
    <Animated.View style={[s.celebrate, { opacity: bg }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} />
      <Animated.View style={{
        alignItems: 'center',
        opacity: fly.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateX: fly.interpolate({ inputRange: [0, 1], outputRange: [0, flyX] }) },
          { translateY: Animated.add(
              pop.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
              fly.interpolate({ inputRange: [0, 1], outputRange: [0, flyY] })
            ) },
          { scale: Animated.multiply(
              pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
              fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0.18] })
            ) },
        ],
      }}>
        {/* 周囲で瞬く星 */}
        {confetti && <Sparkles count={18} color={t.gold} />}
        <View style={s.celebCardWrap}>
          <View style={[s.celebCard, { shadowColor: cat.tint }]}>
            <View style={s.celebPhotoWrap}>
              {item.imageUri
                ? <Image source={{ uri: item.imageUri }} style={s.celebPhoto} />
                : <LinearGradient colors={[catSoft(cat, t.mode), '#FFFFFF']} style={[s.celebPhoto, { alignItems: 'center', justifyContent: 'center' }]}>
                    <VIcon set={cat.iconSet} name={cat.icon} size={54} color={cat.tint} />
                  </LinearGradient>}
              <View style={s.celebCheck}><Ionicons name="checkmark-circle" size={54} color={cat.tint} /></View>
            </View>
            <Text style={s.celebCaption} numberOfLines={1}>{item.title}</Text>
          </View>
        </View>
        <Text style={s.celebBig}>{praise}</Text>
      </Animated.View>
      {confetti && <Confetti colors={colors} count={110} />}
    </Animated.View>
  );
}

/* ---------- 触感フィードバック（押すとバネで縮む） ---------- */
function PressBounce({ onPress, onLongPress, style, children, scaleTo = 0.97 }) {
  const a = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(a, { toValue: v, useNativeDriver: true, stiffness: 300, damping: 20, mass: 0.6 }).start();
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} onPressIn={() => to(scaleTo)} onPressOut={() => to(1)}>
      <Animated.View style={[style, { transform: [{ scale: a }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ---------- Wishカード（キャンディボックス：画像＋白い情報パネルの2段） ---------- */
// feature=true は2列幅の大カード（本気を目立たせる／ゆったり表示にも使う）
function PhotoTile({ item, onPress, onLongPress, feature = false }) {
  const t = useTheme(); const s = useStyles();
  const cat = getCategory(item.category);
  const done = !!item.doneAt;
  const due = dueLabel(item.dueTag);
  const w = getWith(item.withWho);
  const heat = item.heat || 2;
  return (
    <PressBounce onPress={onPress} onLongPress={onLongPress} style={[s.card, { shadowColor: cat.tint }]}>
      <View style={{ width: '100%', aspectRatio: feature ? 3 / 2 : cardAspect(item.id) }}>
        {item.imageUri
          ? <Image source={{ uri: item.imageUri }} style={s.cardImg} />
          : <LinearGradient colors={[catSoft(cat, t.mode), t.surface]} style={[s.cardImg, s.cardCenter]}>
              <VIcon set={cat.iconSet} name={cat.icon} size={46} color={cat.tint} />
            </LinearGradient>}
        {/* frosted カテゴリチップ */}
        <BlurView intensity={26} tint={t.mode === 'dark' ? 'dark' : 'light'} style={s.cardChip}>
          <VIcon set={cat.iconSet} name={cat.icon} size={12} color={cat.tint} />
          <Text style={[s.cardChipText, { color: cat.tint }]}>{cat.label}</Text>
        </BlurView>
        {done
          ? <View style={s.cardBadge}><Ionicons name="checkmark-circle" size={22} color={cat.tint} /></View>
          : item.sourcePlatform
            ? <View style={s.cardSns}><Ionicons name={snsMeta(item.sourcePlatform).icon} size={13} color="#fff" /></View>
            : null}
        {done && <View style={s.cardDoneOverlay} pointerEvents="none" />}
      </View>
      <View style={s.cardPanel}>
        <Text style={feature ? s.cardTitleBig : s.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={s.cardMetaRow}>
          {w ? <View style={s.cardMeta}><Ionicons name={w.icon} size={11} color={t.sub} /><Text style={s.cardMetaText}>{w.label}</Text></View> : null}
          {!done && due ? <View style={s.cardMeta}><Ionicons name="time-outline" size={11} color={t.sub} /><Text style={s.cardMetaText}>{due}まで</Text></View> : null}
        </View>
        <View style={s.cardDots}>
          {[1, 2, 3].map((n) => <View key={n} style={[s.cardDot, { backgroundColor: n <= heat ? cat.tint : t.line }]} />)}
        </View>
      </View>
    </PressBounce>
  );
}

/* ---------- ホーム ---------- */
// 熱量「本気」を6枚ごとに1回だけ2列幅のfeatureカードに昇格し、間は2列マソンリー。
function HomeTab({ items, filter, setFilter, onOpen, onReorder, density, doneCount, activeCount }) {
  const t = useTheme(); const s = useStyles();
  const [reorderMode, setReorderMode] = useState(false);
  const [dragging, setDragging] = useState(false);   // ドラッグ中は外側スクロールを止める
  // 保存元SNS（重複なし）。サービス別の絞り込みチップに使う。
  const snsPresent = snsPlatformsPresent(items);
  const visible = visibleItems(items, filter);
  const canSort = filter === 'all' && visible.length > 1;
  const inReorder = reorderMode && canSort;
  const byId = Object.fromEntries(visible.map((it) => [it.id, it]));
  // 「そろそろ思い出す」：締切が近い（今日/今週）未達成を先出し（0件なら非表示）
  const upcoming = filter === 'all' && !inReorder ? upcomingItems(items) : [];
  const comfy = density === 'comfy' && filter === 'all';
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false} scrollEnabled={!dragging}>
      <View style={s.topbar}>
        <View style={s.brandRow}>
          <Text style={s.brand}>WannaLog</Text>
          {canSort && (
            <Pressable style={s.ghostBtn} onPress={() => setReorderMode((v) => !v)} accessibilityLabel="並べ替え">
              <Ionicons name={inReorder ? 'checkmark' : 'swap-vertical'} size={18} color={inReorder ? t.accent : t.sub} />
            </Pressable>
          )}
        </View>
        <View style={s.statCapsule}>
          <Text style={s.statCapsuleText}>叶えた <Text style={s.statCapsuleNum}>{doneCount}</Text>　・　のこり <Text style={s.statCapsuleNum}>{activeCount}</Text></Text>
        </View>
      </View>

      {inReorder ? (
        <View>
          <View style={s.reorderBar}>
            <Text style={s.reorderBarText}>右端の ≡ をつまんで、上下にドラッグ</Text>
            <Pressable onPress={() => setReorderMode(false)} style={s.reorderDone}><Text style={s.reorderDoneText}>完了</Text></Pressable>
          </View>
          <View style={{ paddingHorizontal: 20 }}>
            <DragReorderList ids={visible.map((it) => it.id)} onChange={onReorder} onDragActive={setDragging} renderRow={(id, { dragging: rowDragging, grip }) => {
              const it = byId[id]; if (!it) return null;
              const cat = getCategory(it.category);
              return (
                <View style={[s.sortRow, { borderLeftWidth: 3, borderLeftColor: cat.tint }, rowDragging && s.sortRowDrag]}>
                  {it.imageUri
                    ? <Image source={{ uri: it.imageUri }} style={s.sortThumb} />
                    : <View style={[s.sortThumb, { backgroundColor: catSoft(cat, t.mode), alignItems: 'center', justifyContent: 'center' }]}><VIcon set={cat.iconSet} name={cat.icon} size={18} color={cat.tint} /></View>}
                  <Text style={s.sortTitle} numberOfLines={1}>{it.title}</Text>
                  {grip}
                </View>
              );
            }} />
          </View>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            <Chip label="すべて" active={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip icon="flame" label="本気" active={filter === 'serious'} onPress={() => setFilter('serious')} />
            {CATEGORIES.map((c) => (
              <Chip key={c.key} cat={c} label={c.label} active={filter === c.key} onPress={() => setFilter(c.key)} />
            ))}
            {snsPresent.map((p) => (
              <Chip key={p} icon={snsMeta(p).icon} label={snsMeta(p).label} active={filter === 'sns:' + p} onPress={() => setFilter('sns:' + p)} />
            ))}
            <Chip icon="trophy" label={`叶えた ${doneCount}`} active={filter === 'done'} onPress={() => setFilter('done')} />
          </ScrollView>

          {upcoming.length > 0 && <RemindCarousel items={upcoming} onOpen={onOpen} />}
          {canSort && <Text style={s.reorderHintHome}>右上の ⇅ を押すと、並べ替えできます</Text>}

          {visible.length === 0 ? (
            <EmptyState text={filter === 'done' ? 'まだ叶えたものはありません。\n小さな一歩から。' : 'まだ何もありません。\n気になったことを、逃さないうちに。'} />
          ) : comfy ? (
            <View style={{ paddingHorizontal: 20, gap: 16, paddingTop: 2 }}>
              {visible.map((it, i) => (
                <FadeInView key={it.id} index={i}><PhotoTile item={it} onPress={() => onOpen(it)} feature /></FadeInView>
              ))}
            </View>
          ) : filter === 'all' ? (
            homeBlocks(visible).map((b, bi) => b.type === 'feature'
              ? <FadeInView key={b.item.id} index={bi}><View style={{ paddingHorizontal: 20, paddingTop: 2 }}><PhotoTile item={b.item} feature onPress={() => onOpen(b.item)} /></View></FadeInView>
              : <Masonry key={'m' + bi} items={b.items} renderTile={(it, i) => (
                  <FadeInView key={it.id} index={i}><PhotoTile item={it} onPress={() => onOpen(it)} /></FadeInView>
                )} />
            )
          ) : (
            <Masonry items={visible} renderTile={(it, i) => (
              <FadeInView key={it.id} index={i}><PhotoTile item={it} onPress={() => onOpen(it)} /></FadeInView>
            )} />
          )}
        </>
      )}
    </ScrollView>
  );
}

// 「そろそろ思い出す」横スクロールカルーセル（写真＋タイトル＋残り日数）
function RemindCarousel({ items, onOpen }) {
  const t = useTheme(); const s = useStyles();
  const { width } = useWindowDimensions();
  const w = Math.round(width * 0.7);
  return (
    <View>
      <Text style={s.carouselTitle}>そろそろ思い出す</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {items.map((it) => {
          const cat = getCategory(it.category);
          return (
            <PressBounce key={it.id} onPress={() => onOpen(it)} style={[s.remindCard, { width: w, shadowColor: cat.tint }]}>
              <View style={{ width: '100%', aspectRatio: 16 / 9 }}>
                {it.imageUri
                  ? <Image source={{ uri: it.imageUri }} style={s.cardImg} />
                  : <LinearGradient colors={[catSoft(cat, t.mode), t.surface]} style={[s.cardImg, s.cardCenter]}><VIcon set={cat.iconSet} name={cat.icon} size={40} color={cat.tint} /></LinearGradient>}
              </View>
              <View style={s.remindPanel}>
                <Text style={s.cardTitle} numberOfLines={1}>{it.title}</Text>
                <View style={s.cardMeta}><Ionicons name="time-outline" size={11} color={t.sub} /><Text style={s.cardMetaText}>{dueLabel(it.dueTag)}まで</Text></View>
              </View>
            </PressBounce>
          );
        })}
      </ScrollView>
    </View>
  );
}

// 空状態：無機質なグレーでなく、パステルの円＋やさしい一言
function EmptyState({ text }) {
  const s = useStyles();
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyBlob1} />
      <View style={s.emptyBlob2} />
      <Text style={s.empty}>{text}</Text>
    </View>
  );
}

/* ---------- ビジョン（上＝全リスト / 下＝画像ありのビジュアライザー） ---------- */
function fmtYMD(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
// ホールドして完了：長押しでゲージが満ちると完了（誤タップ防止＋達成の“重み”を演出）。
function HoldToComplete({ onComplete, label = 'ホールドして完了', compact = false, duration = 1150 }) {
  const t = useTheme(); const s = useStyles();
  const progress = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const holding = useRef(false);
  const anim = useRef(null);
  const [w, setW] = useState(0);
  const start = () => {
    holding.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(glow, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    anim.current = Animated.timing(progress, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => {
      if (finished && holding.current) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); holding.current = false; progress.setValue(0); glow.setValue(0); onComplete(); }
    });
  };
  const cancel = () => {
    if (!holding.current) return;
    holding.current = false; anim.current && anim.current.stop();
    Animated.parallel([
      Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };
  const fillW = progress.interpolate({ inputRange: [0, 1], outputRange: [0, w] });
  return (
    <Pressable onPressIn={start} onPressOut={cancel} onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[s.holdBtn, compact && s.holdBtnSm]}>
      <Animated.View pointerEvents="none" style={[s.holdGlow, { opacity: glow }]} />
      <Animated.View pointerEvents="none" style={[s.holdFill, { width: fillW }]} />
      <View style={s.holdRow} pointerEvents="none">
        <Text style={[s.holdText, compact && { fontSize: 13 }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={15} color="#fff" />
        <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.55)" style={{ marginLeft: -8 }} />
        <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.28)" style={{ marginLeft: -8 }} />
      </View>
    </Pressable>
  );
}
// 開いた瞬間・スワイプするたびに、文字が下から順に浮かび上がるための補間ヘルパー。
function useReveal(dep) {
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [dep]);
  const line = (a, b) => ({
    opacity: reveal.interpolate({ inputRange: [a, b], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [{ translateY: reveal.interpolate({ inputRange: [a, b], outputRange: [16, 0], extrapolate: 'clamp' }) }],
  });
  return line;
}
// カード確認画面（全カード共通）：上に画像、下はグラデでぼかし、タイトルや期限を浮かび上がらせる。
function FullscreenVisualizer({ visible, items, index, onClose, catName, catColor, onToggleFav, onHold, onEdit }) {
  const s = useStyles(); const { width, height } = useWindowDimensions();
  const [idx, setIdx] = useState(index || 0);
  useEffect(() => { setIdx(index || 0); }, [index, visible]);
  const cur = (visible && items.length) ? items[Math.min(idx, items.length - 1)] : null;
  const line = useReveal(cur ? cur.id : 'none');
  if (!visible || !items.length || !cur) return null;
  const f = visionFont(cur.font); const timing = timingLabel(cur.timing);
  const imgH = Math.round(height * 0.62);
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={s.fsWrap}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          contentOffset={{ x: (index || 0) * width, y: 0 }}
          onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {items.map((v) => (
            <View key={v.id} style={{ width }}>
              {v.imageUri
                ? <Image source={{ uri: v.imageUri }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: imgH }} />
                : <LinearGradient colors={[catColor(v.categoryId), '#1B1712']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: imgH }} />}
              {/* 画像の下端を背景の濃色へ溶け込ませて、下に文字を置ける余白をつくる */}
              <LinearGradient colors={['transparent', 'transparent', '#161311']} locations={[0, 0.46, 0.72]} style={StyleSheet.absoluteFill} />
              {/* 上部を少し暗くして操作アイコンを見やすく */}
              <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent']} locations={[0, 0.18]} style={StyleSheet.absoluteFill} />
            </View>
          ))}
        </ScrollView>
        <SafeAreaView style={s.fsTopBar} pointerEvents="box-none">
          <Pressable onPress={onClose} style={s.fsBtn}><Ionicons name="close" size={24} color="#fff" /></Pressable>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => onToggleFav(cur)} style={s.fsBtn}><Ionicons name={cur.favorite ? 'heart' : 'heart-outline'} size={22} color={cur.favorite ? '#FF6F91' : '#fff'} /></Pressable>
            <Pressable onPress={() => onEdit(cur)} style={s.fsBtn}><Ionicons name="create-outline" size={22} color="#fff" /></Pressable>
          </View>
        </SafeAreaView>
        <SafeAreaView style={s.fsBottom} pointerEvents="box-none">
          <Animated.View style={line(0, 0.35)}><View style={s.fsCatChip}><View style={[s.catDot, { backgroundColor: catColor(cur.categoryId) }]} /><Text style={s.fsCatText}>{catName(cur.categoryId)}</Text></View></Animated.View>
          <Animated.Text style={[s.fsTitle, { fontFamily: f.family }, line(0.12, 0.5)]} numberOfLines={3}>{cur.title}</Animated.Text>
          {timing ? <Animated.View style={[s.fsTimingRow, line(0.32, 0.7)]}><Text style={s.fsTimingLabel}>期限</Text><Text style={s.fsTimingText}>{timing}</Text></Animated.View> : null}
          {cur.memo ? <Animated.Text style={[s.fsSub, line(0.42, 0.82)]} numberOfLines={3}>{cur.memo}</Animated.Text> : null}
          <Animated.View style={[{ marginTop: 16 }, line(0.55, 0.98)]}><HoldToComplete onComplete={() => onHold(cur)} /></Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
function VisionTab({ visions, cats, title, timingLabels, addOpen, onCloseAdd, onSetTitle, onAdd, onUpdate, onRemove, onPickPhoto, onAchieve, onRevert, onReorder, onAddCategory, onUpdateCategory, onRemoveCategory }) {
  const t = useTheme(); const s = useStyles();
  const [editId, setEditId] = useState(null);
  const [achievedOpen, setAchievedOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const [fullIndex, setFullIndex] = useState(0);
  const [reorderMode, setReorderMode] = useState(false);
  const [dragging, setDragging] = useState(false);

  const editing = visions.find((v) => v.id === editId) || null;
  const byId = Object.fromEntries(visions.map((v) => [v.id, v]));
  const active = visions.filter((v) => v.status !== 'done').slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const known = new Set(cats.map((c) => c.id));
  const catOf = (v) => (v.categoryId && known.has(v.categoryId)) ? v.categoryId : '__none';
  const canSort = active.length > 1;
  const inReorder = reorderMode && canSort;

  const catColor = (id) => (getCategoryById(cats, id)?.color) || '#9A938A';
  const catNameOf = (id) => (getCategoryById(cats, id)?.name) || '未分類';

  // タグ（カテゴリ）ごとの段。「すべて」は作らない。空の段は出さない。
  const sections = [];
  cats.forEach((c) => { const items = active.filter((v) => v.categoryId === c.id); if (items.length) sections.push({ id: c.id, name: c.name, color: c.color, items }); });
  const unc = active.filter((v) => catOf(v) === '__none'); if (unc.length) sections.push({ id: '__none', name: '未分類', color: '#9A938A', items: unc });

  // カードを触ると確認画面（フルスクリーン）へ。編集はその中の鉛筆ボタンからのみ。
  const openDetail = (v) => { const i = active.findIndex((x) => x.id === v.id); setFullIndex(Math.max(0, i)); setFullOpen(true); };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={t.mode === 'dark' ? ['#1C1A17', '#211E1A'] : ['#FAF7F2', '#F3EFE7']} style={StyleSheet.absoluteFill} />
      <View style={s.vHeader}>
        <TextInput style={s.vHeaderTitle} value={title} onChangeText={onSetTitle} placeholder="MY VISION" placeholderTextColor={t.sub} maxLength={20} editable={!inReorder} />
        <View style={s.vHeadBtns}>
          <Pressable style={s.vActionIcon} onPress={() => setManageOpen(true)} accessibilityLabel="カテゴリ"><Ionicons name="pricetags-outline" size={17} color={t.sub} /></Pressable>
          <Pressable style={s.vActionIcon} onPress={() => setAchievedOpen(true)} accessibilityLabel="叶った夢"><Ionicons name="trophy-outline" size={17} color={t.gold} /></Pressable>
          {canSort && <Pressable style={s.vActionIcon} onPress={() => setReorderMode((v) => !v)} accessibilityLabel="並べ替え"><Ionicons name={inReorder ? 'checkmark' : 'swap-vertical'} size={17} color={inReorder ? t.accent : t.sub} /></Pressable>}
        </View>
      </View>

      {inReorder ? (
        <View style={{ flex: 1 }}>
          <View style={s.reorderBar}><Text style={s.reorderBarText}>右端の ≡ をつまんで、上下にドラッグ</Text><Pressable onPress={() => setReorderMode(false)} style={s.reorderDone}><Text style={s.reorderDoneText}>完了</Text></Pressable></View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} scrollEnabled={!dragging} showsVerticalScrollIndicator={false}>
            <DragReorderList ids={active.map((v) => v.id)} onChange={onReorder} onDragActive={setDragging} renderRow={(id, { dragging: rd, grip }) => {
              const v = byId[id]; if (!v) return null;
              return (
                <View style={[s.sortRow, { borderLeftWidth: 3, borderLeftColor: catColor(v.categoryId) }, rd && s.sortRowDrag]}>
                  {v.imageUri
                    ? <Image source={{ uri: v.imageUri }} style={s.sortThumb} />
                    : <View style={[s.sortThumb, { backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="sparkles-outline" size={18} color={t.sub} /></View>}
                  <Text style={s.sortTitle} numberOfLines={1}>{v.title || '（無題）'}</Text>{grip}
                </View>
              );
            }} />
          </ScrollView>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 6, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {sections.length === 0 ? (
            <View style={s.vEmpty}>
              <Text style={s.vEmptyTitle}>叶えたい夢を、ここに。</Text>
              <Text style={s.vEmptyText}>下の ＋ から、ひとつ願ってみましょう。{'\n'}例：スイス旅行 / マラソン完走 / 憧れの部屋</Text>
            </View>
          ) : sections.map((sec) => (
            <View key={sec.id} style={{ marginBottom: 10, marginTop: 6 }}>
              <View style={s.shelfHead}>
                <View style={[s.catDot, { backgroundColor: sec.color, width: 10, height: 10, borderRadius: 5 }]} />
                <Text style={s.shelfTitle}>{sec.name}</Text>
                <View style={s.shelfBadge}><Text style={s.shelfBadgeText}>{sec.items.length}</Text></View>
              </View>
              <Masonry items={sec.items} renderTile={(v) => <VisionCard key={v.id} slot={v} onPress={() => openDetail(v)} />} />
            </View>
          ))}
        </ScrollView>
      )}

      <VisionAddModal visible={addOpen} onClose={onCloseAdd} onSave={onAdd} cats={cats} timingLabels={timingLabels} onAddCategory={onAddCategory} />
      <AchievedModal visible={achievedOpen} onClose={() => setAchievedOpen(false)} visions={visions} cats={cats} onOpen={(v) => { setAchievedOpen(false); setEditId(v.id); }} />
      <CategoryManageModal visible={manageOpen} onClose={() => setManageOpen(false)} cats={cats} onAdd={onAddCategory} onUpdate={onUpdateCategory} onRemove={onRemoveCategory} />
      <FullscreenVisualizer visible={fullOpen} items={active} index={fullIndex} onClose={() => setFullOpen(false)} catName={catNameOf} catColor={catColor}
        onToggleFav={(v) => onUpdate(v.id, { favorite: !v.favorite })} onHold={(v) => { setFullOpen(false); onAchieve(v.id); }} onEdit={(v) => { setFullOpen(false); setEditId(v.id); }} />
      <VisionEditModal
        vision={editing} cats={cats} timingLabels={timingLabels}
        onClose={() => setEditId(null)}
        onUpdate={(patch) => editing && onUpdate(editing.id, patch)}
        onRemove={() => { if (editing) { onRemove(editing.id); setEditId(null); } }}
        onPickPhoto={onPickPhoto} onAchieve={onAchieve} onRevert={onRevert} onAddCategory={onAddCategory}
      />
    </View>
  );
}
// Pinteret型マソンリーのカード：写真が主役。角丸＋写真に重ねた白タイトル＋ステータスバッジ＋時期タグ。
function VisionCard({ slot, onPress }) {
  const t = useTheme(); const s = useStyles();
  const f = visionFont(slot.font);
  const st = visionStage(slot.status); const acc = stageAccent(slot.status);
  const ar = cardAspect(slot.id);
  const tm = timingLabel(slot.timing);
  return (
    <PressBounce onPress={onPress} style={s.vCard}>
      <View style={{ width: '100%', aspectRatio: ar }}>
        {slot.imageUri
          ? <Image source={{ uri: slot.imageUri }} style={s.cardImg} />
          : <LinearGradient colors={[catSoft(null, t.mode), t.surface]} style={[s.cardImg, s.cardCenter]}><Ionicons name="sparkles-outline" size={30} color={t.sub} /></LinearGradient>}
        <LinearGradient colors={['rgba(0,0,0,0.05)', 'transparent', 'rgba(0,0,0,0.74)']} style={StyleSheet.absoluteFill} />
        {/* ステータスバッジ（ドット＋文字） */}
        <View style={s.vStatusBadge}>
          <View style={[s.vStatusDot, { backgroundColor: acc ? acc.grad[0] : '#fff' }]} />
          <Text style={s.vStatusText}>{st.label}</Text>
        </View>
        {slot.favorite ? <View style={s.vCardFav}><Ionicons name="heart" size={12} color="#fff" /></View> : null}
        {/* 時期タグ */}
        {tm ? <View style={s.vTimingTag}><Ionicons name="time-outline" size={10} color="#fff" /><Text style={s.vTimingTagText}>{tm}</Text></View> : null}
        {/* タイトル（写真に重ねる） */}
        {slot.title ? <Text style={[s.vCardTitle, { fontFamily: f.family }]} numberOfLines={2}>{slot.title}</Text> : null}
      </View>
    </PressBounce>
  );
}
// フォーカスすると accent の細枠が浮かぶ入力欄
function FocusInput({ multiline, style, ...props }) {
  const t = useTheme(); const s = useStyles();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput {...props} multiline={multiline}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      placeholderTextColor={t.sub}
      style={[multiline ? s.memoInput : s.input, s.focusField, focused && { borderColor: t.accent }, style]} />
  );
}
// カテゴリ選択（＋新規作成つき）
function CategoryPicker({ cats, value, onChange, onAddCategory }) {
  const t = useTheme(); const s = useStyles();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(''); const [color, setColor] = useState(CATEGORY_COLORS[0]);
  return (
    <View>
      <View style={s.catWrap}>
        {cats.map((c) => {
          const on = value === c.id;
          return (
            <Pressable key={c.id} onPress={() => onChange(c.id)} style={[s.catChip, { borderColor: c.color }, on && { backgroundColor: c.color }]}>
              <View style={[s.catDot, { backgroundColor: on ? '#fff' : c.color }]} />
              <Text style={[s.catChipText, { color: on ? '#fff' : t.text }]}>{c.name}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setCreating((v) => !v)} style={[s.catChip, s.catChipDashed]}><Ionicons name="add" size={13} color={t.accent} /><Text style={[s.catChipText, { color: t.accent }]}>カテゴリ</Text></Pressable>
      </View>
      {creating && (
        <View style={s.newCatBox}>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="新しいカテゴリ名" placeholderTextColor={t.sub} maxLength={12} />
          <View style={[s.catWrap, { marginTop: 8 }]}>
            {CATEGORY_COLORS.map((col) => (
              <Pressable key={col} onPress={() => setColor(col)} style={[s.colorDot, { backgroundColor: col }, color === col && s.colorDotOn]} />
            ))}
          </View>
          <Pressable onPress={async () => { const nm = name.trim(); if (!nm) return; const c = await onAddCategory(nm, color); setName(''); setCreating(false); if (c) onChange(c.id); }} style={[s.saveBtn, { marginTop: 10 }]}><Text style={s.saveBtnText}>カテゴリを追加</Text></Pressable>
        </View>
      )}
    </View>
  );
}
// 時期の選択（プリセット＋独自ラベル＋日付。どれか一つ）
function TimingPicker({ value, onChange, labels, onAddLabel }) {
  const t = useTheme(); const s = useStyles();
  const [showLabel, setShowLabel] = useState(false);
  const [labelText, setLabelText] = useState('');
  const [showDate, setShowDate] = useState(false);
  const isPreset = (k) => value && value.kind === 'preset' && value.key === k;
  const isLabel = (txt) => value && value.kind === 'label' && value.text === txt;
  const isDate = value && value.kind === 'date';
  const chip = (on, onPress, label, key) => (
    <Pressable key={key} onPress={onPress} style={[s.catChip, on && { backgroundColor: t.accent, borderColor: t.accent }]}>
      <Text style={[s.catChipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
  return (
    <View>
      <View style={s.catWrap}>
        {TIMING_PRESETS.map((p) => chip(isPreset(p.key), () => onChange(isPreset(p.key) ? null : { kind: 'preset', key: p.key }), p.label, p.key))}
        {(labels || []).map((lt) => chip(isLabel(lt), () => onChange(isLabel(lt) ? null : { kind: 'label', text: lt }), lt, 'L' + lt))}
        <Pressable onPress={() => { setShowLabel((v) => !v); setShowDate(false); }} style={[s.catChip, s.catChipDashed]}><Ionicons name="add" size={13} color={t.accent} /><Text style={[s.catChipText, { color: t.accent }]}>自分の言葉</Text></Pressable>
        <Pressable onPress={() => { setShowDate((v) => !v); setShowLabel(false); }} style={[s.catChip, s.catChipDashed, isDate && { backgroundColor: t.accent, borderColor: t.accent }]}><Ionicons name="calendar-outline" size={13} color={isDate ? '#fff' : t.accent} /><Text style={[s.catChipText, { color: isDate ? '#fff' : t.accent }]}>{isDate ? timingLabel(value) : '日付'}</Text></Pressable>
      </View>
      {showLabel && (
        <View style={s.newCatRow}>
          <TextInput style={[s.input, { flex: 1 }]} value={labelText} onChangeText={setLabelText} placeholder="例：30歳になるまで" placeholderTextColor={t.sub} maxLength={16} />
          <Pressable onPress={() => { const txt = labelText.trim(); if (txt) { onChange({ kind: 'label', text: txt }); onAddLabel && onAddLabel(txt); } setLabelText(''); setShowLabel(false); }} style={s.newCatAdd}><Text style={s.newCatAddText}>追加</Text></Pressable>
        </View>
      )}
      {showDate && (
        <DateTimePicker value={isDate ? new Date(value.date) : new Date()} mode="date" display="inline"
          onChange={(e, d) => { setShowDate(false); if (d) onChange({ kind: 'date', date: d.toISOString().slice(0, 10) }); }} />
      )}
    </View>
  );
}
// 新規ビジョン追加（1画面シート）
function VisionAddModal({ visible, onClose, onSave, cats, timingLabels, onAddCategory }) {
  const t = useTheme(); const s = useStyles();
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [timing, setTiming] = useState(null);
  const [image, setImage] = useState(null);
  const [memo, setMemo] = useState('');
  useEffect(() => { if (visible) { setTitle(''); setCategoryId(null); setTiming(null); setImage(null); setMemo(''); } }, [visible]);
  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('写真へのアクセスが許可されていません'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
    if (!res.canceled) setImage(res.assets[0].uri);
  }
  function save() {
    if (!title.trim()) { Alert.alert('タイトルを入力してください'); return; }
    if (!categoryId) { Alert.alert('カテゴリを選んでください', '「＋カテゴリ」で新しく作ることもできます。'); return; }
    onSave({ title, categoryId, timing, imageUri: image, memo });
    onClose();
  }
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <View style={s.sheetHeader}><Text style={s.sheetTitle}>叶えたい夢を追加</Text><Pressable onPress={onClose}><Ionicons name="close" size={22} color={t.sub} /></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextInput style={s.input} placeholder="何を叶えたい？（例：スイス旅行）" placeholderTextColor={t.sub} value={title} onChangeText={setTitle} autoFocus />
            <Text style={s.label}>カテゴリ（必須）</Text>
            <CategoryPicker cats={cats} value={categoryId} onChange={setCategoryId} onAddCategory={onAddCategory} />
            <Text style={s.label}>時期（任意）</Text>
            <TimingPicker value={timing} onChange={setTiming} labels={timingLabels} />
            <Text style={s.label}>写真（任意・1枚）</Text>
            <Pressable style={s.photoPick} onPress={pick}>
              {image ? <Image source={{ uri: image }} style={s.photoPreview} /> : <View style={s.photoPickInner}><Ionicons name="image-outline" size={22} color={t.sub} /><Text style={s.photoPickText}>写真を選ぶ（切り取りできます）</Text></View>}
            </Pressable>
            {image && <View style={s.photoSubRow}><Pressable style={s.photoSubBtn} onPress={() => setImage(null)}><Ionicons name="close" size={15} color="#E5484D" /><Text style={[s.photoSubText, { color: '#E5484D' }]}>写真を外す</Text></Pressable></View>}
            <Text style={s.label}>メモ（任意）</Text>
            <FocusInput value={memo} onChangeText={setMemo} placeholder="一言そえる（任意）" maxLength={60} />
            <Pressable style={s.saveBtn} onPress={save}><Text style={s.saveBtnText}>ボードに追加</Text></Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
// 拡大表示＋編集（タイトル・カテゴリ・時期・状態・メモ・字体）。「叶った」は確認を挟む。
function VisionEditModal({ vision, cats, timingLabels, onClose, onUpdate, onRemove, onPickPhoto, onAchieve, onRevert, onAddCategory }) {
  const t = useTheme(); const s = useStyles();
  if (!vision) return null;
  const f = visionFont(vision.font);
  const isDone = vision.status === 'done';
  const confirmRemove = () => Alert.alert('この夢を削除しますか？', '元に戻せません。', [
    { text: 'キャンセル', style: 'cancel' },
    { text: '削除', style: 'destructive', onPress: onRemove },
  ]);
  function setStage(key) {
    if (key === vision.status) return;
    onUpdate({ status: key, ...(isDone ? { achievedAt: null } : {}) });
  }
  return (
    <Modal visible={!!vision} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.detailBar}>
          <Pressable onPress={onClose} style={s.detailBarBtn}><Ionicons name="chevron-back" size={24} color={t.text} /></Pressable>
          <Pressable onPress={confirmRemove} style={s.detailBarBtn}><Ionicons name="trash-outline" size={20} color="#E5484D" /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => onPickPhoto(vision.id)} style={s.visionBigPhotoWrap}>
            {vision.imageUri
              ? <Image source={{ uri: vision.imageUri }} style={s.visionBigPhoto} />
              : <LinearGradient colors={[catSoft(null, t.mode), t.surface]} style={[s.visionBigPhoto, s.visionBigEmpty]}>
                  <Ionicons name="image-outline" size={38} color={t.sub} />
                  <Text style={s.visionEmptyText}>写真を入れる（任意）</Text>
                </LinearGradient>}
            <View style={s.photoTapHint}><Ionicons name="create-outline" size={13} color="#fff" /><Text style={s.photoTapHintText}>写真を編集</Text></View>
          </Pressable>

          <Text style={s.sectionLabel}>タイトル</Text>
          <FocusInput value={vision.title} onChangeText={(v) => onUpdate({ title: v })} placeholder="何を叶えたい？" maxLength={40} />

          <Text style={s.sectionLabel}>カテゴリ</Text>
          <CategoryPicker cats={cats} value={vision.categoryId} onChange={(id) => onUpdate({ categoryId: id })} onAddCategory={onAddCategory} />

          <Text style={s.sectionLabel}>時期（任意）</Text>
          <TimingPicker value={vision.timing} onChange={(tm) => onUpdate({ timing: tm })} labels={timingLabels} />

          <Text style={s.sectionLabel}>いまの状態</Text>
          <View style={s.catWrap}>
            {VISION_STAGES.filter((st) => st.key !== 'done').map((st) => {
              const on = vision.status === st.key;
              const acc = stageAccent(st.key);
              return (
                <Pressable key={st.key} onPress={() => setStage(st.key)} style={[s.catChip, on && { backgroundColor: acc.grad[0], borderColor: acc.grad[0] }]}>
                  <Ionicons name={st.icon} size={13} color={on ? '#fff' : t.sub} />
                  <Text style={[s.catChipText, on && { color: '#fff' }]}>{st.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {isDone ? (
            <View style={{ marginTop: 12 }}>
              <View style={s.doneNote}><Ionicons name="checkmark-circle" size={16} color={t.gold} /><Text style={s.doneNoteText}>この夢は叶いました</Text></View>
              <Pressable style={[s.undoneBtn, { marginTop: 10 }]} onPress={() => onRevert(vision.id, 'doing')}><Text style={s.undoneText}>「叶えている最中」に戻す</Text></Pressable>
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              <HoldToComplete onComplete={() => { onAchieve(vision.id); onClose(); }} />
            </View>
          )}

          <Text style={s.sectionLabel}>メモ（任意）</Text>
          <FocusInput value={vision.memo || ''} onChangeText={(v) => onUpdate({ memo: v })} placeholder="一言そえる（任意）" multiline />

          <Text style={s.sectionLabel}>字体</Text>
          <View style={s.catWrap}>
            {VISION_FONTS.map((fo) => {
              const on = (vision.font || 'mincho') === fo.key;
              return (
                <Pressable key={fo.key} onPress={() => onUpdate({ font: fo.key })} style={[s.catChip, on && { backgroundColor: t.accent, borderColor: t.accent }]}>
                  <Text style={[s.catChipText, { fontFamily: fo.family }, on && { color: '#fff' }]}>{fo.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
// 「叶った夢」一覧（達成日の新しい順・カテゴリ切替）
function AchievedModal({ visible, onClose, visions, cats, onOpen }) {
  const t = useTheme(); const s = useStyles();
  const [catFilter, setCatFilter] = useState(null);
  const list = useMemo(() => achievedGallery(visions, catFilter), [visions, catFilter]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.detailBar}>
          <Pressable onPress={onClose} style={s.detailBarBtn}><Ionicons name="chevron-back" size={24} color={t.text} /></Pressable>
          <Text style={s.detailBarTitle}>叶った夢</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            <Chip label="すべて" active={catFilter === null} onPress={() => setCatFilter(null)} />
            {cats.map((c) => <Chip key={c.id} label={c.name} active={catFilter === c.id} onPress={() => setCatFilter(c.id)} />)}
          </ScrollView>
          {list.length === 0
            ? <View style={s.vEmpty}><Text style={s.vEmptyTitle}>まだ叶った夢はありません。</Text><Text style={s.vEmptyText}>ひとつずつ、叶えていきましょう。</Text></View>
            : <Masonry items={list} renderTile={(v) => <VisionCard key={v.id} slot={v} onPress={() => onOpen(v)} />} />}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
// カテゴリの管理（追加・改名・色・削除）
function CategoryManageModal({ visible, onClose, cats, onAdd, onUpdate, onRemove }) {
  const t = useTheme(); const s = useStyles();
  const [name, setName] = useState(''); const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const confirmDelete = (c) => Alert.alert(`「${c.name}」を削除しますか？`, 'このカテゴリの夢は「未分類」に移ります（消えません）。', [
    { text: 'キャンセル', style: 'cancel' },
    { text: '削除', style: 'destructive', onPress: () => onRemove(c.id) },
  ]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.detailBar}>
          <Pressable onPress={onClose} style={s.detailBarBtn}><Ionicons name="chevron-back" size={24} color={t.text} /></Pressable>
          <Text style={s.detailBarTitle}>カテゴリ</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {cats.map((c) => (
            <View key={c.id} style={s.catManageRow}>
              <View style={[s.catDot, { backgroundColor: c.color, width: 14, height: 14, borderRadius: 7 }]} />
              <TextInput style={s.catManageInput} defaultValue={c.name} onEndEditing={(e) => onUpdate(c.id, { name: e.nativeEvent.text.trim() || c.name })} placeholderTextColor={t.sub} maxLength={12} />
              <Pressable onPress={() => confirmDelete(c)} style={s.detailBarBtn}><Ionicons name="trash-outline" size={18} color="#E5484D" /></Pressable>
            </View>
          ))}
          <Text style={s.sectionLabel}>新しいカテゴリ</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="名前（例：健康）" placeholderTextColor={t.sub} maxLength={12} />
          <View style={[s.catWrap, { marginTop: 8 }]}>
            {CATEGORY_COLORS.map((col) => (
              <Pressable key={col} onPress={() => setColor(col)} style={[s.colorDot, { backgroundColor: col }, color === col && s.colorDotOn]} />
            ))}
          </View>
          <Pressable onPress={() => { const nm = name.trim(); if (!nm) return; onAdd(nm, color); setName(''); }} style={[s.saveBtn, { marginTop: 12 }]}><Text style={s.saveBtnText}>追加する</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/* ---------- 通知（時系列セクション＋左スワイプでスヌーズ/削除） ---------- */
function NotifyRow({ item, onOpen, onSnooze, onStop }) {
  const t = useTheme(); const s = useStyles();
  const cat = getCategory(item.category);
  const rightActions = () => (
    <View style={s.swipeActions}>
      <Pressable style={[s.swipeAction, { backgroundColor: '#F2A93B' }]} onPress={onSnooze}>
        <Ionicons name="alarm-outline" size={18} color="#fff" /><Text style={s.swipeText}>スヌーズ</Text>
      </Pressable>
      <Pressable style={[s.swipeAction, { backgroundColor: '#C96A66' }]} onPress={onStop}>
        <Ionicons name="notifications-off-outline" size={18} color="#fff" /><Text style={s.swipeText}>削除</Text>
      </Pressable>
    </View>
  );
  return (
    <Swipeable renderRightActions={rightActions} overshootRight={false}>
      <Pressable style={({ pressed }) => [s.notifyRow, pressed && s.pressed]} onPress={onOpen}>
        <View style={[s.notifyIcon, { backgroundColor: cat.color }]}><VIcon set={cat.iconSet} name={cat.icon} size={18} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.notifyTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={s.notifySub}>{remindSummary(item)}に思い出します</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.sub} />
      </Pressable>
    </Swipeable>
  );
}
function NotifyTab({ items, onOpen, onSnooze, onStop }) {
  const t = useTheme(); const s = useStyles();
  const now = Date.now();
  const groups = groupNotifyItems(items, now);
  const total = groups.today.length + groups.week.length + groups.later.length;
  return (
    <View style={{ flex: 1 }}>
      <View style={s.topbar}>
        <Text style={s.screenTitle}>通知</Text>
        <Text style={s.greet}>今のこの気持ちを、いつでもそっと思い出せます</Text>
      </View>
      {total === 0 ? (
        <EmptyState text={'まだ思い出す予定はありません。\n保存時に「思い出す」を選ぶと、ここに並びます。'} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {NOTIFY_SECTIONS.map((sec) => groups[sec.key].length > 0 && (
            <View key={sec.key}>
              <Text style={s.notifySection}>{sec.label}</Text>
              <View style={{ gap: 10, marginBottom: 8 }}>
                {groups[sec.key].map((item) => (
                  <NotifyRow key={item.id} item={item} onOpen={() => onOpen(item)} onSnooze={() => onSnooze(item.id)} onStop={() => onStop(item.id)} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/* ---------- マイページ ---------- */
// カテゴリ別の達成バー：表示時に白いハイライトが一度すっと流れる（達成演出と世界観をつなぐ）
function CatStatBar({ c }) {
  const s = useStyles();
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(sweep, { toValue: 1, duration: 950, delay: 250, useNativeDriver: true }).start(); }, []);
  return (
    <View style={s.catStatRow}>
      <View style={s.catStatHead}>
        <VIcon set={c.iconSet} name={c.icon} size={14} color={c.tint} />
        <Text style={s.catStatLabel}>{c.label}</Text>
        <Text style={s.catStatNum}>{c.done}/{c.total}</Text>
      </View>
      <View style={s.catStatTrack}>
        <View style={[s.catStatFill, { width: `${Math.round(c.rate * 100)}%`, backgroundColor: c.tint }]}>
          <Animated.View style={[s.catStatShine, {
            opacity: sweep.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.75, 0] }),
            transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-50, 240] }) }, { skewX: '-20deg' }],
          }]} />
        </View>
      </View>
    </View>
  );
}
function MyPageTab({ items, doneCount, garden, name, onName, photoUri, onPickPhoto, density, onDensity, onExport, onImport, mode, onToggleMode, onOpen, onOpenGift, onOpenGarden }) {
  const t = useTheme(); const s = useStyles();
  const done = items.filter((it) => it.doneAt);
  const publicCount = items.filter((it) => it.isPublic && !it.doneAt).length;
  const plantStage = growthProgress((garden && garden.points) || 0);
  const total = items.length;
  const rate = achievementRate(doneCount, total);
  // カテゴリ別の達成（そのカテゴリの中で叶えた割合）
  const byCat = categoryStats(items, CATEGORIES);
  // 直近7日の達成数バー
  const { week, counts } = weeklyDoneCounts(done);
  const max = Math.max(1, ...counts);
  const W = WEEKDAY_LABELS;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <View style={s.topbar}><Text style={s.screenTitle}>マイページ</Text></View>

      {/* プロフィール（写真をタップで設定できる） */}
      <View style={s.profileRow}>
        <Pressable style={s.avatar} onPress={onPickPhoto}>
          {photoUri
            ? <Image source={{ uri: photoUri }} style={s.avatarImg} />
            : <Ionicons name="person" size={26} color={t.bg} />}
          <View style={s.avatarEdit}><Ionicons name="camera" size={12} color="#fff" /></View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.profileLabel}>名前</Text>
          <TextInput style={s.nameInput} value={name} onChangeText={onName} placeholder="あなたの名前" placeholderTextColor={t.sub} />
        </View>
      </View>

      {/* テーマ切替 */}
      <View style={s.settingRow}>
        <View style={s.settingLeft}>
          <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={20} color={t.accent} />
          <Text style={s.settingText}>ダークモード</Text>
        </View>
        <Switch value={mode === 'dark'} onValueChange={onToggleMode} trackColor={{ true: t.accent }} />
      </View>

      {/* 表示密度（コンパクト / ゆったり） */}
      <View style={s.settingRow}>
        <View style={s.settingLeft}>
          <Ionicons name="grid-outline" size={20} color={t.accent} />
          <Text style={s.settingText}>表示</Text>
        </View>
        <View style={s.segment}>
          {[{ k: 'compact', l: 'コンパクト' }, { k: 'comfy', l: 'ゆったり' }].map((d) => (
            <Pressable key={d.k} onPress={() => onDensity(d.k)} style={[s.segBtn, density === d.k && s.segBtnOn]}>
              <Text style={[s.segText, density === d.k && s.segTextOn]}>{d.l}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* バックアップ（試作・引っ越し用：BACKUP_ENABLED で表示） */}
      {BACKUP_ENABLED && (
      <>
      <View style={s.settingRow}>
        <View style={s.settingLeft}>
          <Ionicons name="save-outline" size={20} color={t.accent} />
          <Text style={s.settingText}>バックアップ</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable style={s.backupBtn} onPress={onExport}><Ionicons name="share-outline" size={14} color={t.accent} /><Text style={s.backupBtnText}>書き出す</Text></Pressable>
          <Pressable style={s.backupBtn} onPress={onImport}><Ionicons name="download-outline" size={14} color={t.accent} /><Text style={s.backupBtnText}>読み込む</Text></Pressable>
        </View>
      </View>
      <Text style={s.backupHint}>「したい」やビジョンを書き出して保存できます。機種変更や本物アプリへの引っ越しに（※写真そのものは含まれません）。</Text>
      </>
      )}

      {/* 箱庭（将来用にステイ：GARDEN_ENABLED で表示切替） */}
      {GARDEN_ENABLED && (
      <Pressable style={s.giftCard} onPress={onOpenGarden}>
        <View style={[s.giftIcon, { backgroundColor: '#2E7D52' }]}><Ionicons name="leaf" size={22} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.giftCardTitle}>箱庭</Text>
          <Text style={s.giftCardSub}>{`${PLANT.name}｜Lv.${plantStage.lv} ${plantStage.label}`}{plantStage.maxed ? '（完成！）' : `・あと${plantStage.remaining}回で成長`}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.sub} />
      </Pressable>
      )}

      {/* ギフトページ（共有機能・一旦保留：SHARE_ENABLED で復活） */}
      {SHARE_ENABLED && (
      <Pressable style={s.giftCard} onPress={onOpenGift}>
        <View style={s.giftIcon}><Ionicons name="gift" size={22} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.giftCardTitle}>ギフトページ</Text>
          <Text style={s.giftCardSub}>{publicCount > 0 ? `公開中 ${publicCount}件・友だちに共有できます` : '公開した「ほしい」を友だちに共有'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.sub} />
      </Pressable>
      )}

      {/* 達成サマリー＋グラフ */}
      <View style={s.statCard}>
        <View style={s.statTopRow}>
          <View style={s.statBlock}><Text style={s.statNum}>{doneCount}</Text><Text style={s.statLabel}>叶えた</Text></View>
          <View style={s.statDivider} />
          <View style={s.statBlock}><Text style={s.statNum}>{rate}<Text style={s.statPct}>%</Text></Text><Text style={s.statLabel}>達成率</Text></View>
        </View>
        <View style={s.graphRow}>
          {counts.map((c, i) => (
            <View key={i} style={s.graphCol}>
              <View style={s.graphBarTrack}>
                <View style={[s.graphBar, { height: 8 + (c / max) * 56 }]} />
              </View>
              <Text style={s.graphDay}>{W[new Date(week[i]).getDay()]}</Text>
            </View>
          ))}
        </View>
        <Text style={s.statSub}>この1週間で {counts.reduce((a, b) => a + b, 0)} 個 達成</Text>
      </View>

      {/* カテゴリ別の達成バー（色分け） */}
      {byCat.length > 0 && (
        <View style={s.catStatCard}>
          <Text style={s.catStatTitle}>カテゴリ別の達成</Text>
          {byCat.map((c) => <CatStatBar key={c.key} c={c} />)}
        </View>
      )}

      {/* 達成コレクション（小さく敷き詰め） */}
      <Text style={s.sectionTitle}>叶えたコレクション</Text>
      {done.length === 0 ? (
        <Text style={s.empty}>達成したものが、ここに飾られます。</Text>
      ) : (
        <View style={s.denseWrap}>
          {done.map((item) => {
            const dc = getCategory(item.category);
            return (
              <Pressable key={item.id} style={s.denseTile} onPress={() => onOpen(item)}>
                {item.imageUri
                  ? <Image source={{ uri: item.imageUri }} style={s.denseImg} />
                  : <LinearGradient colors={[catSoft(dc, t.mode), t.surface]} style={[s.denseImg, { alignItems: 'center', justifyContent: 'center' }]}>
                      <VIcon set={dc.iconSet} name={dc.icon} size={24} color={dc.tint} />
                    </LinearGradient>}
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

/* ---------- タブバー ---------- */
function TabBar({ tab, onTab, onAdd, mypageBounce }) {
  return <TabBarInner tab={tab} onTab={onTab} onAdd={onAdd} mypageBounce={mypageBounce} />;
}
// 選択中はパステルのピルを敷き、切替時にアイコンがバネで弾む
function TabItem({ active, icon, label, soft, onPress, extraScale }) {
  const t = useTheme(); const s = useStyles();
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (active) { a.setValue(0.78); Animated.spring(a, { toValue: 1, friction: 4, useNativeDriver: true }).start(); } }, [active]);
  const scale = extraScale ? Animated.multiply(a, extraScale) : a;
  return (
    <Pressable style={s.tab} onPress={onPress}>
      <Animated.View style={[s.tabIconWrap, active && { backgroundColor: soft }, { transform: [{ scale }] }]}>
        <Ionicons name={active ? icon : icon + '-outline'} size={22} color={active ? t.accent : t.sub} />
      </Animated.View>
      <Text style={[s.tabLabel, active && { color: t.accent, fontWeight: '800' }]}>{label}</Text>
    </Pressable>
  );
}
function TabBarInner({ tab, onTab, onAdd, mypageBounce }) {
  const t = useTheme(); const s = useStyles();
  const scale = useRef(new Animated.Value(1)).current;   // 押下スクワッシュ
  const pulse = useRef(new Animated.Value(1)).current;    // アイドルの呼吸
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(6000),
      Animated.timing(pulse, { toValue: 1.04, duration: 500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const press = (v) => Animated.spring(scale, { toValue: v, useNativeDriver: true, stiffness: 320, damping: 16, mass: 0.6 }).start();
  const soft = (k) => catSoft(getCategory(k), t.mode);
  return (
    <View style={s.tabbar}>
      <TabItem active={tab === 'home'} icon="home" label="ホーム" soft={soft('eat')} onPress={() => onTab('home')} />
      <TabItem active={tab === 'vision'} icon="sparkles" label="ビジョン" soft={soft('see')} onPress={() => onTab('vision')} />
      <Pressable onPress={onAdd} onPressIn={() => press(0.92)} onPressOut={() => press(1)}>
        <Animated.View style={[s.tabAdd, { transform: [{ scale: Animated.multiply(scale, pulse) }] }]}>
          <LinearGradient colors={[t.accent, t.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tabAddGrad}>
            <Ionicons name="add" size={30} color="#fff" />
          </LinearGradient>
        </Animated.View>
      </Pressable>
      <TabItem active={tab === 'notify'} icon="notifications" label="通知" soft={soft('go')} onPress={() => onTab('notify')} />
      <TabItem active={tab === 'mypage'} icon="person" label="マイページ" soft={soft('want')} onPress={() => onTab('mypage')} extraScale={mypageBounce} />
    </View>
  );
}

function Chip({ icon, iconSet, cat, label, active, onPress }) {
  const t = useTheme(); const s = useStyles();
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active) Animated.sequence([
      Animated.timing(a, { toValue: 1.08, duration: 110, useNativeDriver: true }),
      Animated.spring(a, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [active]);
  const ic = icon || (cat && cat.icon);
  const icSet = iconSet || (cat && cat.iconSet);
  if (cat) {
    return (
      <Animated.View style={{ transform: [{ scale: a }] }}>
        <Pressable onPress={onPress}
          style={[s.chipCat, active ? { backgroundColor: catSoft(cat, t.mode), borderColor: catSoft(cat, t.mode) } : { backgroundColor: t.surface, borderColor: cat.tint }]}>
          <VIcon set={icSet} name={ic} size={13} color={cat.tint} />
          <Text style={[s.chipCatText, { color: active ? cat.tint : t.sub }]}>{label}</Text>
        </Pressable>
      </Animated.View>
    );
  }
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      {ic ? <VIcon set={icSet} name={ic} size={13} color={active ? (t.mode === 'dark' ? t.bg : '#fff') : t.text} /> : null}
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/* ---------- 通知タイミングの編集 ---------- */
const REMIND_MODES = [
  { key: 'none', label: 'なし' },
  { key: 'tomorrow', label: '明日' },
  { key: '3days', label: '3日後' },
  { key: 'week', label: '1週間後' },
  { key: 'at', label: '日時を指定' },
  { key: 'daily', label: '毎日' },
  { key: 'weekly', label: '毎週' },
];
const WEEKDAYS = [
  { k: 1, l: '日' }, { k: 2, l: '月' }, { k: 3, l: '火' }, { k: 4, l: '水' },
  { k: 5, l: '木' }, { k: 6, l: '金' }, { k: 7, l: '土' },
];
// 既定の指定日時：明日の9:00
function defaultFutureDate() { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }

// 通知タイミングを選ぶUI。value/onChange は { remind, remindAt, remindHour, remindMinute, remindWeekday }
function ReminderEditor({ value, onChange }) {
  const t = useTheme(); const s = useStyles();
  const v = value || { remind: 'none' };
  const remind = v.remind || 'none';
  function set(patch) { onChange({ ...v, ...patch }); }
  function choose(key) {
    if (key === 'at' && !v.remindAt) set({ remind: key, remindAt: defaultFutureDate().getTime() });
    else set({ remind: key });
  }
  const optChip = (selected) => [s.catChip, selected && { backgroundColor: t.accent, borderColor: t.accent }];
  const atDate = v.remindAt ? new Date(v.remindAt) : defaultFutureDate();
  const timeDate = (() => { const d = new Date(); d.setHours(v.remindHour ?? 9, v.remindMinute ?? 0, 0, 0); return d; })();
  return (
    <View>
      <View style={s.catWrap}>
        {REMIND_MODES.map((r) => (
          <Pressable key={r.key} onPress={() => choose(r.key)} style={optChip(remind === r.key)}>
            <Text style={[s.catChipText, remind === r.key && { color: '#fff' }]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      {remind === 'at' && (
        <View style={s.reminderPickRow}>
          <Text style={s.reminderHint}>日時</Text>
          <DateTimePicker value={atDate} mode="datetime" display="compact"
            themeVariant={t.mode} accentColor={t.accent}
            onChange={(e, d) => { if (d) set({ remindAt: d.getTime() }); }} />
        </View>
      )}

      {(remind === 'daily' || remind === 'weekly') && (
        <View style={s.reminderPickRow}>
          <Text style={s.reminderHint}>時刻</Text>
          <DateTimePicker value={timeDate} mode="time" display="compact"
            themeVariant={t.mode} accentColor={t.accent}
            onChange={(e, d) => { if (d) set({ remindHour: d.getHours(), remindMinute: d.getMinutes() }); }} />
        </View>
      )}

      {remind === 'weekly' && (
        <View style={[s.catWrap, { marginTop: 10 }]}>
          {WEEKDAYS.map((w) => (
            <Pressable key={w.k} onPress={() => set({ remindWeekday: w.k })} style={optChip((v.remindWeekday ?? 1) === w.k)}>
              <Text style={[s.catChipText, (v.remindWeekday ?? 1) === w.k && { color: '#fff' }]}>{w.l}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={s.reminderSummary}>
        {remind === 'none' ? '通知なし' : remindSummary(v) + ' に思い出します'}
      </Text>
    </View>
  );
}

/* ---------- クイック保存（スクショ/リンク → スキャン演出 → カードが生成される） ---------- */
const SCAN_ICONS = ['scan-outline', 'sparkles-outline', 'image-outline', 'text-outline', 'pricetag-outline'];
function QuickCaptureModal({ visible, onClose, onSave, onEdit, onManual }) {
  const t = useTheme(); const s = useStyles();
  const [phase, setPhase] = useState('pick'); // pick | processing | reveal | saving
  const [draft, setDraft] = useState({ title: '', category: null, imageUri: null, link: '' });
  const [linkInput, setLinkInput] = useState('');
  const [iconIdx, setIconIdx] = useState(0);
  const scan = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const catPop = useRef(new Animated.Value(0)).current;
  const titleR = useRef(new Animated.Value(0)).current;
  const settle = useRef(new Animated.Value(0)).current;
  const draftRef = useRef(draft); draftRef.current = draft;

  useEffect(() => { if (visible) { setPhase('pick'); setDraft({ title: '', category: null, imageUri: null, link: '' }); setLinkInput(''); settle.setValue(0); } }, [visible]);
  useEffect(() => {
    if (phase !== 'processing') return;
    scan.setValue(0);
    const loop = Animated.loop(Animated.timing(scan, { toValue: 1, duration: 1100, useNativeDriver: true }));
    loop.start();
    const timer = setInterval(() => setIconIdx((i) => i + 1), 320);
    return () => { loop.stop(); clearInterval(timer); };
  }, [phase]);

  async function startFromImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('写真へのアクセスが許可されていません'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled) return;
    setDraft({ title: '', category: null, imageUri: res.assets[0].uri, link: '' });
    setPhase('processing');
    setTimeout(runReveal, 1700); // ExpoGoでは画像OCR不可→演出のみ（タイトルは編集で）
  }
  async function startFromLink() {
    const url = linkInput.trim();
    if (!isUrl(url)) { Alert.alert('リンクを入力してください', 'http(s):// で始まるURLを貼ってください。'); return; }
    setDraft({ title: '', category: guessCategoryFromUrl(url), imageUri: null, link: url });
    setPhase('processing');
    const started = Date.now();
    const ogp = await fetchOgp(url);
    const maps = isMapsUrl(url);
    setDraft({ title: cleanTitle(ogp.title, ogp.finalUrl || url, '') || '', category: guessCategoryFromUrl(url), imageUri: (ogp.image && !maps) ? ogp.image : null, link: url });
    setTimeout(runReveal, Math.max(0, 1100 - (Date.now() - started)));
  }
  function runReveal() {
    setPhase('reveal');
    shimmer.setValue(0); catPop.setValue(0); titleR.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleR, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.spring(catPop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      ]),
    ]).start(() => Haptics.selectionAsync());
  }
  function buildDraft() {
    return buildQuickCaptureItem(draftRef.current);
  }
  function doSave() {
    setPhase('saving');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.timing(settle, { toValue: 1, duration: 540, useNativeDriver: true }).start(() => onSave(buildDraft()));
  }

  const cat = getCategory(draft.category);
  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [0, 300] });
  const settleScale = settle.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] });
  const settleY = settle.interpolate({ inputRange: [0, 1], outputRange: [0, 280] });
  const settleOpacity = settle.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.qcBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={phase === 'pick' ? onClose : undefined} />

        {phase === 'pick' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.qcSheetWrap}>
            <View style={s.qcSheet}>
              <View style={s.qcHandle} />
              <Text style={s.qcTitle}>今の気持ち、熱いままに残しましょう</Text>
              <Text style={s.qcSub}>スクショ、リンクからワンタップで保存できます。</Text>
              <PressBounce onPress={startFromImage} style={{ borderRadius: 18, overflow: 'hidden', marginTop: 16 }}>
                <LinearGradient colors={[t.accent, t.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.qcBigBtn}>
                  <Ionicons name="image" size={22} color="#fff" /><Text style={s.qcBigBtnText}>写真から</Text>
                </LinearGradient>
              </PressBounce>
              <View style={s.qcLinkRow}>
                <Ionicons name="link" size={16} color={t.sub} />
                <TextInput style={s.qcLinkInput} value={linkInput} onChangeText={setLinkInput} placeholder="リンクから" placeholderTextColor={t.sub} autoCapitalize="none" autoCorrect={false} keyboardType="url" onSubmitEditing={startFromLink} returnKeyType="go" />
                <Pressable onPress={startFromLink} style={s.qcLinkGo}><Ionicons name="arrow-forward" size={18} color="#fff" /></Pressable>
              </View>
              <Pressable onPress={onManual} style={s.qcManual}><Text style={s.qcManualText}>自分で書いて残す</Text></Pressable>
            </View>
          </KeyboardAvoidingView>
        )}

        {phase === 'processing' && (
          <View style={s.qcCenter}>
            {draft.imageUri ? (
              <View style={s.qcScanCard}>
                <Image source={{ uri: draft.imageUri }} style={s.qcScanImg} />
                <View style={s.qcScanTint} />
                <Animated.View style={[s.qcScanLine, { transform: [{ translateY: scanY }] }]} />
                <View style={s.qcScanBadge}><Ionicons name="scan" size={14} color="#fff" /><Text style={s.qcScanBadgeText}>読み取り中…</Text></View>
              </View>
            ) : (
              <View style={s.qcLoadCard}>
                <Ionicons name={SCAN_ICONS[iconIdx % SCAN_ICONS.length]} size={42} color={t.accent} />
                <Text style={s.qcLoadText}>情報取得中…</Text>
              </View>
            )}
          </View>
        )}

        {(phase === 'reveal' || phase === 'saving') && (
          <View style={s.qcCenter}>
            <Animated.View style={{ transform: [{ scale: settleScale }, { translateY: settleY }], opacity: settleOpacity }}>
              <View style={[s.qcCard, { shadowColor: cat.tint }]}>
                <View style={{ width: '100%', aspectRatio: 4 / 5 }}>
                  {draft.imageUri
                    ? <Image source={{ uri: draft.imageUri }} style={s.cardImg} />
                    : <LinearGradient colors={[catSoft(cat, t.mode), t.surface]} style={[s.cardImg, s.cardCenter]}><VIcon set={cat.iconSet} name={cat.icon} size={44} color={cat.tint} /></LinearGradient>}
                  <Animated.View pointerEvents="none" style={[s.qcShine, { opacity: shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.85, 0] }), transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-160, 260] }) }, { rotate: '18deg' }] }]} />
                  <Animated.View style={[s.qcCardChip, { backgroundColor: cat.tint, transform: [{ scale: catPop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]}>
                    <VIcon set={cat.iconSet} name={cat.icon} size={11} color="#fff" /><Text style={s.qcCardChipText}>{cat.label}</Text>
                  </Animated.View>
                </View>
                <Animated.View style={[s.qcCardPanel, { opacity: titleR, transform: [{ translateY: titleR.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
                  <Text style={s.qcCardTitle} numberOfLines={2}>{draft.title || '（タイトルは編集で）'}</Text>
                </Animated.View>
              </View>
            </Animated.View>

            {phase === 'reveal' && (
              <View style={s.qcConfirm}>
                <Text style={s.qcConfirmText}>この情報でいいですか？</Text>
                <View style={s.qcConfirmBtns}>
                  <Pressable style={s.qcEditBtn} onPress={() => onEdit(buildDraft())}><Ionicons name="create-outline" size={16} color={t.accent} /><Text style={s.qcEditText}>編集する</Text></Pressable>
                  <PressBounce onPress={doSave} style={{ borderRadius: 999, overflow: 'hidden', flex: 1 }}>
                    <LinearGradient colors={[t.accent, t.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.qcSaveBtn}><Ionicons name="checkmark" size={18} color="#fff" /><Text style={s.qcSaveText}>保存</Text></LinearGradient>
                  </PressBounce>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

/* ---------- 保存シート ---------- */
function SaveModal({ visible, onClose, onSave }) {
  const t = useTheme(); const s = useStyles();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(null); // 既定は未設定（あとで編集で選べる）
  const [due, setDue] = useState('none');
  const [image, setImage] = useState(null);
  const [withWho, setWithWho] = useState(null); // 誰と
  const [link, setLink] = useState('');
  const [heat, setHeat] = useState(2);
  const [reminder, setReminder] = useState({ remind: '3days' });
  const [ogpLoading, setOgpLoading] = useState(false); // リンク読み込み中

  const sns = parseSnsLink(link);            // SNSリンクを認識（X/Instagram/YouTube など）
  const previewUri = image || (sns && sns.thumbnail); // 写真未選択でもYouTubeはサムネを表示

  // 熱量を変えると「思い出す（通知）」の既定が出し分けされる
  function chooseHeat(h) { setHeat(h); setReminder({ remind: defaultRemindForHeat(h) }); }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('写真へのアクセスが許可されていません'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
    if (!res.canceled) setImage(res.assets[0].uri);
  }
  // リンク先のOGP（タイトル・画像）を読み取り、空欄なら自動で埋める
  async function loadFromLink() {
    const url = link.trim();
    if (!isUrl(url)) { Alert.alert('リンクを入力してください', 'http(s):// で始まるURLを貼ってください。'); return; }
    setOgpLoading(true);
    const ogp = await fetchOgp(url);
    setOgpLoading(false);
    const maps = isMapsUrl(url); // マップの og:image は汎用ピンなので画像は使わない
    let got = false;
    if (ogp.image && !maps && !image) { setImage(ogp.image); got = true; }
    const better = cleanTitle(ogp.title, ogp.finalUrl || url, '');
    if (better && !title.trim()) { setTitle(better); got = true; }
    const guess = guessCategoryFromUrl(url); // ドメインからカテゴリを推測
    if (guess) { setCategory(guess); got = true; }
    if (!got) Alert.alert('自動で読み取れませんでした', 'このサイトは自動読み込みに対応していない場合があります（Amazon・Instagram・X などは制限が強めです）。写真は「写真を選ぶ」から手動で追加できます。');
  }
  function resetForm() { setTitle(''); setCategory(null); setDue('none'); setImage(null); setWithWho(null); setLink(''); setHeat(2); setReminder({ remind: '3days' }); }
  function handleSave() {
    if (!title.trim()) { Alert.alert('タイトルを入力してください'); return; }
    const { imageUri: finalImage, linkInfo } = resolveSaveImageAndLink({ image, sns, link });
    onSave({ title: title.trim(), category, due, imageUri: finalImage, heat, reminder, link: linkInfo, withWho }); resetForm();
  }

  const optChip = (selected, color) => [s.catChip, selected && { backgroundColor: color, borderColor: color }];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>何を残す？</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={22} color={t.sub} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* 入力に合わせて“実際に並ぶカード”がその場で育つプレビュー */}
            <View style={s.previewWrap}>
              <View style={{ width: 170 }}>
                <PhotoTile item={{ id: 'preview', title: title.trim() || '（タイトル）', category, imageUri: previewUri, heat, withWho, dueTag: due, doneAt: null }} onPress={() => {}} />
              </View>
            </View>

            <TextInput style={s.input} placeholder="例：鎌倉の海が見えるカフェ" placeholderTextColor={t.sub}
              value={title} onChangeText={setTitle} autoFocus />

            <TextInput style={[s.input, { marginTop: 12 }]} placeholder="リンクを貼る（X・Instagram・YouTube など／任意）"
              placeholderTextColor={t.sub} value={link} onChangeText={setLink}
              autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            {sns && (
              <View style={s.snsDetected}>
                <Ionicons name={snsMeta(sns.platform).icon} size={15} color={t.accent} />
                <Text style={s.snsDetectedText}>{snsMeta(sns.platform).label} のリンクを認識{sns.thumbnail ? '（サムネを表示します）' : ''}</Text>
              </View>
            )}
            {isUrl(link.trim()) && (
              <Pressable style={[s.linkLoadBtn, ogpLoading && { opacity: 0.6 }]} onPress={loadFromLink} disabled={ogpLoading}>
                {ogpLoading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="download-outline" size={16} color="#fff" />}
                <Text style={s.linkLoadText}>{ogpLoading ? '読み込み中…' : 'リンクから画像・タイトルを読み込む'}</Text>
              </Pressable>
            )}

            <Pressable style={s.photoPick} onPress={pickImage}>
              {previewUri ? <Image source={{ uri: previewUri }} style={s.photoPreview} />
                : <View style={s.photoPickInner}><Ionicons name="image-outline" size={22} color={t.sub} /><Text style={s.photoPickText}>写真を選ぶ（任意・切り取りできます）</Text></View>}
            </Pressable>
            {image && (
              <View style={s.photoSubRow}>
                <Pressable style={s.photoSubBtn} onPress={() => setImage(null)}>
                  <Ionicons name="close" size={15} color="#E5484D" />
                  <Text style={[s.photoSubText, { color: '#E5484D' }]}>写真を外す</Text>
                </Pressable>
              </View>
            )}

            <Text style={s.label}>カテゴリ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.rowScroll}>
              {CATEGORIES.map((c) => (
                <Pressable key={c.key} onPress={() => setCategory(category === c.key ? null : c.key)} style={optChip(category === c.key, c.color)}>
                  <VIcon set={c.iconSet} name={c.icon} size={13} color={category === c.key ? '#fff' : t.text} />
                  <Text style={[s.catChipText, category === c.key && { color: '#fff' }]}>{c.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.label}>誰と（任意）</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.rowScroll}>
              {WITH_OPTIONS.map((wo) => {
                const on = withWho === wo.key;
                return (
                  <Pressable key={wo.key} onPress={() => setWithWho(on ? null : wo.key)} style={optChip(on, t.accent)}>
                    <Ionicons name={wo.icon} size={13} color={on ? '#fff' : t.sub} />
                    <Text style={[s.catChipText, on && { color: '#fff' }]}>{wo.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={s.label}>熱量（本気度）</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.rowScroll}>
              {HEAT_OPTIONS.map((h) => (
                <Pressable key={h.key} onPress={() => chooseHeat(h.key)} style={optChip(heat === h.key, t.accent)}>
                  <Ionicons name="flame" size={13} color={heat === h.key ? '#fff' : (h.key === 3 ? t.accent : t.sub)} />
                  <Text style={[s.catChipText, heat === h.key && { color: '#fff' }]}>{h.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.label}>いつまでに</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.rowScroll}>
              {DUE_OPTIONS.map((d) => (
                <Pressable key={d.key} onPress={() => setDue(d.key)} style={optChip(due === d.key, t.accent)}>
                  <Text style={[s.catChipText, due === d.key && { color: '#fff' }]}>{d.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.label}>思い出す（通知）</Text>
            <ReminderEditor value={reminder} onChange={setReminder} />

            <Pressable style={s.saveBtn} onPress={handleSave}><Text style={s.saveBtnText}>保存する</Text></Pressable>
            <Text style={s.saveNote}>{reminder.remind === 'none' ? 'ボードに追加します（通知なし）。' : 'タイミングが来たら、そっと思い出させます。'}</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------- 並べ替え（右端のグリップをつまんで上下ドラッグ） ---------- */
// 1行の高さ（sortRow：thumb 44 + 上下パディング 16 + marginBottom 10 の目安）
const DRAG_ROW_H = 70;

// 右端の「≡（グリップ）」をつまんで上下にドラッグする並べ替えリスト（矢印・長押し不要）。
// グリップだけにジェスチャーを付けるので、行の他の場所は普通にスクロールできる。
// ids は親が持つ現在の並び。入れ替わるたびに onChange(新しい並び) を呼ぶ（制御コンポーネント）。
function DragReorderList({ ids, renderRow, onChange, onDragActive, rowH = DRAG_ROW_H }) {
  const t = useTheme(); const s = useStyles();
  const [dragId, setDragId] = useState(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const idsRef = useRef(ids); idsRef.current = ids;   // 常に最新の並びを参照
  const committed = useRef(0);                         // すでに入れ替えで反映した移動量(px)

  const begin = (id) => {
    committed.current = 0;
    dragY.setValue(0);
    setDragId(id);
    onDragActive && onDragActive(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  const update = (id, ty) => {
    dragY.setValue(ty - committed.current);
    const cur = idsRef.current;
    const i = cur.indexOf(id);
    if (i < 0) return;
    const rel = ty - committed.current;
    if (rel > rowH * 0.6 && i < cur.length - 1) {
      committed.current += rowH;
      Haptics.selectionAsync();
      onChange(moveItem(cur, i, i + 1));
    } else if (rel < -rowH * 0.6 && i > 0) {
      committed.current -= rowH;
      Haptics.selectionAsync();
      onChange(moveItem(cur, i, i - 1));
    }
  };
  const end = () => {
    setDragId(null);
    committed.current = 0;
    onDragActive && onDragActive(false);
    Animated.spring(dragY, { toValue: 0, useNativeDriver: false, friction: 9, tension: 120 }).start();
  };

  return (
    <View>
      {ids.map((id) => {
        const dragging = id === dragId;
        // グリップをつまんだ瞬間からドラッグ開始（長押し不要・縦方向だけ反応）。
        const pan = Gesture.Pan()
          .activeOffsetY([-4, 4])
          .hitSlop({ top: 10, bottom: 10, left: 12, right: 12 })
          .onStart(() => begin(id))
          .onUpdate((e) => update(id, e.translationY))
          .onFinalize(() => end());
        const grip = (
          <GestureDetector gesture={pan}>
            <View style={s.sortGrip}><Ionicons name="reorder-three" size={28} color={dragging ? t.accent : t.sub} /></View>
          </GestureDetector>
        );
        return (
          <Animated.View key={id} style={[
            { marginBottom: 10 },
            dragging && { transform: [{ translateY: dragY }], zIndex: 30 },
          ]}>
            {renderRow(id, { dragging, grip })}
          </Animated.View>
        );
      })}
    </View>
  );
}

/* ---------- ギフトページ（プレビュー＆共有） ---------- */
// 「ギフトに公開」した“ほしい”を、友だちに見せる体で表示。共有は端末標準の共有シート。
// ここはアプリ内なので商品リンクは“ただの検索リンク”（アフィリ化は将来のWebページ側でのみ）。
function GiftModal({ visible, onClose, items, name, onOpenLink, onOpen }) {
  const t = useTheme(); const s = useStyles();
  const list = giftableItems(items);
  async function share() {
    if (list.length === 0) { Alert.alert('まだ公開中の「ほしい」がありません', '詳細画面で「ギフトページに公開」をオンにしてください。'); return; }
    try { await Share.share({ message: giftShareMessage(name, list) }); } catch (e) {}
  }
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.detailBar}>
          <Pressable onPress={onClose} style={s.detailBarBtn}><Ionicons name="chevron-back" size={24} color={t.text} /></Pressable>
          <PressBounce onPress={share} style={{ borderRadius: 999, overflow: 'hidden' }}>
            <LinearGradient colors={[t.accent, t.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.giftShareBtn}>
              <Ionicons name="share-social-outline" size={16} color="#fff" /><Text style={s.giftShareText}>共有する</Text>
            </LinearGradient>
          </PressBounce>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* タイトル背景のごく薄いリボン装飾 */}
          <View style={s.giftHeroWrap}>
            <Ionicons name="ribbon" size={96} color={t.accent} style={s.giftDecor1} />
            <Ionicons name="gift" size={72} color={t.gold} style={s.giftDecor2} />
            <Text style={s.giftHero}>{name}さんへの{'\n'}贈りもの候補</Text>
            <Text style={s.giftLead}>友だちがこのページから贈れます。{'\n'}（これは将来のWeb公開ページの“見本”です）</Text>
          </View>
          {list.length === 0 ? (
            <Text style={s.empty}>まだ公開中の「ほしい」はありません。{'\n'}詳細画面で「ギフトページに公開」をオンにすると、ここに並びます。</Text>
          ) : list.map((item) => {
            const cat = getCategory(item.category);
            const link = actionLinks(item.category, item.title)[0];
            return (
              <View key={item.id} style={s.giftBox}>
                <View style={[s.giftRibbon, { backgroundColor: cat.tint }]} />
                <Pressable onPress={() => onOpen(item)}>
                  {item.imageUri
                    ? <Image source={{ uri: item.imageUri }} style={s.giftThumb} />
                    : <LinearGradient colors={[catSoft(cat, t.mode), t.surface]} style={[s.giftThumb, { alignItems: 'center', justifyContent: 'center' }]}><VIcon set={cat.iconSet} name={cat.icon} size={24} color={cat.tint} /></LinearGradient>}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <View style={[s.giftCatBadge, { backgroundColor: catSoft(cat, t.mode) }]}>
                    <VIcon set={cat.iconSet} name={cat.icon} size={11} color={cat.tint} />
                    <Text style={[s.giftCatBadgeText, { color: cat.tint }]}>{cat.label}</Text>
                  </View>
                  <Text style={s.giftRowTitle} numberOfLines={2}>{item.title}</Text>
                  <Pressable style={{ alignSelf: 'flex-start', borderRadius: 999, overflow: 'hidden', marginTop: 8 }} onPress={() => link && onOpenLink(link.url)}>
                    <LinearGradient colors={[t.accent, t.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.giftBuyGrad}>
                      <Ionicons name="bag-handle-outline" size={14} color="#fff" />
                      <Text style={s.giftBuyGradText}>{link ? link.label : '見てみる'}</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {list.length > 0 && <Text style={s.giftDisclaimer}>※ 公開ページのリンクには広告（アフィリエイト）を含む予定です。</Text>}
          <Text style={s.giftBrand}>WannaLog で作られました</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/* ---------- 箱庭（達成で植物を育てる・G1最小ループ） ---------- */
// 仮アート：段階ごとにアイコン＋大きさ＋色を変える。将来 同梱PNG に差し替え予定。
const PLANT_STAGE_ART = [
  { icon: 'ellipse', size: 26, color: '#C9A27A', glow: 0.10 }, // Lv1 種
  { icon: 'leaf-outline', size: 44, color: '#8AD6A8', glow: 0.16 }, // Lv2 双葉
  { icon: 'leaf', size: 60, color: '#46B36B', glow: 0.22 }, // Lv3 幼木
  { icon: 'flower-outline', size: 76, color: '#7FE0A6', glow: 0.30 }, // Lv4 成木
  { icon: 'sparkles', size: 92, color: '#F2B544', glow: 0.42 }, // Lv5 幻想樹
];
function GardenModal({ visible, onClose, garden, doneCount, onWater }) {
  const t = useTheme(); const s = useStyles();
  const period = dayPeriod();
  const points = (garden && garden.points) || 0;
  const p = growthProgress(points);
  const coins = coinsForCount(doneCount);
  const left = remainingWaterToday(garden);
  const art = PLANT_STAGE_ART[p.lv - 1];
  const [showDex, setShowDex] = useState(false);
  const pop = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) { pop.setValue(0); Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start(); }
  }, [visible, p.lv]);
  function water() {
    onWater();
    sway.setValue(0);
    Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.spring(sway, { toValue: 0, friction: 3, useNativeDriver: true }),
    ]).start();
  }
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.detailBar}>
          <Pressable onPress={onClose} style={s.detailBarBtn}><Ionicons name="chevron-back" size={24} color={t.text} /></Pressable>
          <View style={s.gardenTopRight}>
            <View style={s.coinPill}><Ionicons name="ellipse" size={12} color={t.gold} /><Text style={s.coinText}>{coins}</Text></View>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={s.giftHero}>箱庭</Text>
          <Text style={s.giftLead}>{period.greet}。{PLANT.name}（{PLANT.reading}）の様子を見にきました。</Text>

          {/* お部屋（仮ドット絵：窓の外＝朝昼夜／床に植物を据え置き） */}
          <View style={s.room}>
            <View style={[s.roomWindow, { backgroundColor: period.sky }]}>
              <Ionicons name={period.icon} size={26} color={period.key === 'night' ? '#FCE9A0' : '#FFD66B'} />
            </View>
            <View style={s.roomFloor} />
            <Animated.View style={[s.roomPlant, { transform: [{ rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-6deg'] }) }] }]}>
              <Animated.View style={[s.plantGlow, { backgroundColor: art.color, opacity: art.glow, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]} />
              <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
                <Ionicons name={art.icon} size={art.size} color={art.color} />
              </Animated.View>
              <View style={s.plantPot} />
            </Animated.View>
            <View style={s.roomLv}><Text style={s.roomLvText}>Lv.{p.lv}　{p.label}</Text></View>
          </View>

          {/* 進捗 */}
          {p.maxed ? (
            <Text style={s.plantMsg}>幻想樹まで育ちました。{'\n'}（次の植物・お部屋づくりは近日追加）</Text>
          ) : (
            <View style={s.plantProgWrap}>
              <View style={s.plantProgTrack}><View style={[s.plantProgFill, { width: `${Math.round(p.ratio * 100)}%` }]} /></View>
              <Text style={s.plantMsg}>「{p.nextLabel}」まで あと <Text style={{ color: t.accent, fontWeight: '900' }}>{p.remaining}</Text></Text>
            </View>
          )}

          {/* 水やり＋図鑑 */}
          <View style={s.gardenBtnRow}>
            <Pressable onPress={water} disabled={left <= 0}
              style={({ pressed }) => [s.waterBtn, left <= 0 && s.waterBtnOff, pressed && left > 0 && s.doneBtnPressed]}>
              <Ionicons name="water" size={18} color={left > 0 ? '#fff' : t.sub} />
              <Text style={[s.waterBtnText, left <= 0 && { color: t.sub }]}>{left > 0 ? `水やり（残り${left}/${WATER_MAX}）` : 'また明日'}</Text>
            </Pressable>
            <Pressable onPress={() => setShowDex((v) => !v)} style={s.dexBtn}>
              <Ionicons name="book-outline" size={18} color={t.accent} />
              <Text style={s.dexBtnText}>図鑑</Text>
            </Pressable>
          </View>

          {showDex && (
            <View style={s.dex}>
              {PLANT.stages.map((st) => {
                const unlocked = p.lv >= st.lv; const a = PLANT_STAGE_ART[st.lv - 1];
                return (
                  <View key={st.lv} style={s.dexItem}>
                    <View style={[s.dexThumb, !unlocked && { opacity: 0.3 }]}>
                      <Ionicons name={unlocked ? a.icon : 'lock-closed'} size={unlocked ? 22 : 15} color={unlocked ? a.color : t.sub} />
                    </View>
                    <Text style={s.dexLabel}>{unlocked ? st.label : '???'}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={s.plantMsg2}>叶えると <Text style={{ color: t.accent, fontWeight: '900' }}>＋{ACHIEVE_GAIN}</Text>、水やり1回で ＋1 育ちます。</Text>
          <Text style={s.plantNote}>※ いまは仮の絵です。ドット絵に差し替え予定（お部屋・インテリアも今後）。</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/* ---------- 詳細 ---------- */
function DetailScreen({ item, startInEdit, onBack, onDone, onUpdate, onReminder, onOpenLink, onDelete }) {
  const t = useTheme(); const s = useStyles();
  const cat = getCategory(item.category);
  const done = !!item.doneAt;
  const due = dueLabel(item.dueTag);
  const heat = item.heat || 2;
  const w = getWith(item.withWho);
  const links = detailLinks(item);
  const [title, setTitle] = useState(item.title);
  const [memo, setMemo] = useState(item.memo || '');
  const [editMode, setEditMode] = useState(!!startInEdit);

  async function testNotify() { await scheduleInSeconds(item, 10); Alert.alert('テスト通知を予約しました', '約10秒後に通知が届きます。'); }
  const openLink = onOpenLink;
  function confirmDelete() {
    Alert.alert('削除しますか？', 'この「したい」を削除します。元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' }, { text: '削除', style: 'destructive', onPress: onDelete },
    ]);
  }
  // 写真をタップ→そのまま写真ライブラリの切り取り(トリミング)画面へ（allowsEditing）
  async function changePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('写真へのアクセスが許可されていません'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
    if (!res.canceled) onUpdate({ imageUri: res.assets[0].uri });
  }
  const optChip = (selected, color) => [s.catChip, selected && { backgroundColor: color, borderColor: color }];

  return (
    <View style={{ flex: 1 }}>
      <View style={s.detailBar}>
        <Pressable onPress={onBack} style={s.detailBarBtn}><Ionicons name="chevron-back" size={24} color={t.text} /></Pressable>
        <View style={s.detailBarRight}>
          <Pressable onPress={() => setEditMode((v) => !v)} style={[s.editToggle, editMode && { backgroundColor: t.accent, borderColor: t.accent }]}>
            <Ionicons name={editMode ? 'checkmark' : 'create-outline'} size={15} color={editMode ? '#fff' : t.accent} />
            <Text style={[s.editToggleText, editMode && { color: '#fff' }]}>{editMode ? '完了' : '編集'}</Text>
          </Pressable>
          <Pressable onPress={confirmDelete} style={s.detailBarBtn}><Ionicons name="trash-outline" size={20} color="#E5484D" /></Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {/* 写真は1タップでトリミング（切り取り）へ。無い場合はタップで写真を追加。 */}
        <Pressable onPress={changePhoto}>
          {item.imageUri
            ? <View>
                <Image source={{ uri: item.imageUri }} style={s.detailPhoto} />
                <View style={s.photoTapHint}><Ionicons name="create-outline" size={13} color="#fff" /><Text style={s.photoTapHintText}>写真を編集</Text></View>
              </View>
            : <View style={[s.detailPhoto, { backgroundColor: cat.color, alignItems: 'center', justifyContent: 'center' }]}>
                <VIcon set={cat.iconSet} name={cat.icon} size={72} color="rgba(255,255,255,0.9)" />
                <View style={s.photoTapHint}><Ionicons name="image-outline" size={13} color="#fff" /><Text style={s.photoTapHintText}>タップで写真を追加</Text></View>
              </View>}
        </Pressable>
        {editMode && item.imageUri && (
          <View style={s.photoActions}>
            <Pressable onPress={changePhoto} style={s.photoActBtn}><Ionicons name="create-outline" size={16} color={t.accent} /><Text style={s.photoActText}>写真を編集</Text></Pressable>
            <Pressable onPress={() => onUpdate({ imageUri: null })} style={s.photoActBtn}><Ionicons name="close" size={16} color="#E5484D" /><Text style={[s.photoActText, { color: '#E5484D' }]}>外す</Text></Pressable>
          </View>
        )}

        {editMode
          ? <TextInput style={s.detailTitleInput} value={title} onChangeText={(v) => { setTitle(v); onUpdate({ title: v }); }} placeholder="タイトル" placeholderTextColor={t.sub} />
          : <Text style={s.detailTitleInput}>{item.title}</Text>}

        {editMode ? (
          <>
            <Text style={s.sectionLabel}>カテゴリ</Text>
            <View style={s.catWrap}>
              {CATEGORIES.map((c) => (
                <Pressable key={c.key} onPress={() => onUpdate({ category: c.key })} style={optChip(item.category === c.key, c.color)}>
                  <VIcon set={c.iconSet} name={c.icon} size={13} color={item.category === c.key ? '#fff' : t.text} />
                  <Text style={[s.catChipText, item.category === c.key && { color: '#fff' }]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.sectionLabel}>誰と（任意）</Text>
            <View style={s.catWrap}>
              {WITH_OPTIONS.map((wo) => {
                const on = item.withWho === wo.key;
                return (
                  <Pressable key={wo.key} onPress={() => onUpdate({ withWho: on ? null : wo.key })} style={optChip(on, t.accent)}>
                    <Ionicons name={wo.icon} size={13} color={on ? '#fff' : t.sub} />
                    <Text style={[s.catChipText, on && { color: '#fff' }]}>{wo.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.sectionLabel}>熱量（本気度）</Text>
            <View style={s.catWrap}>
              {HEAT_OPTIONS.map((h) => (
                <Pressable key={h.key} onPress={() => onUpdate({ heat: h.key })} style={optChip(heat === h.key, t.accent)}>
                  <Ionicons name="flame" size={13} color={heat === h.key ? '#fff' : (h.key === 3 ? t.accent : t.sub)} />
                  <Text style={[s.catChipText, heat === h.key && { color: '#fff' }]}>{h.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.sectionLabel}>いつまでに</Text>
            <View style={s.catWrap}>
              {DUE_OPTIONS.map((d) => (
                <Pressable key={d.key} onPress={() => onUpdate({ dueTag: d.key })} style={optChip(item.dueTag === d.key, t.accent)}>
                  <Text style={[s.catChipText, item.dueTag === d.key && { color: '#fff' }]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.sectionLabel}>思い出す（通知）</Text>
            <ReminderEditor
              value={{ remind: item.remind || 'none', remindAt: item.remindAt, remindHour: item.remindHour, remindMinute: item.remindMinute, remindWeekday: item.remindWeekday }}
              onChange={onReminder} />

            <Text style={s.sectionLabel}>メモ</Text>
            <TextInput style={s.memoInput} value={memo} onChangeText={(v) => { setMemo(v); onUpdate({ memo: v }); }} placeholder="ひとことメモ（任意）" placeholderTextColor={t.sub} multiline />

            {SHARE_ENABLED && (
              <>
                <View style={s.giftToggleRow}>
                  <View style={s.settingLeft}>
                    <Ionicons name="gift-outline" size={18} color={t.accent} />
                    <Text style={s.settingText}>ギフトページに公開</Text>
                  </View>
                  <Switch value={!!item.isPublic} onValueChange={(v) => onUpdate({ isPublic: v })} trackColor={{ true: t.accent }} />
                </View>
                <Text style={s.giftToggleHint}>オンにすると「マイページ → ギフトページ」に並び、友だちに共有できます（誕生日・記念日に便利）。</Text>
              </>
            )}
          </>
        ) : (
          <>
            <View style={s.summaryRow}>
              <View style={[s.pill, { backgroundColor: cat.color }]}><VIcon set={cat.iconSet} name={cat.icon} size={13} color="#fff" /><Text style={s.pillTextOn}>{cat.label}</Text></View>
              <View style={s.pill}><Ionicons name="flame" size={13} color={t.accent} /><Text style={s.pillText}>{heatLabel(heat)}</Text></View>
              {w ? <View style={s.pill}><Ionicons name={w.icon} size={13} color={t.accent} /><Text style={s.pillText}>{w.label}</Text></View> : null}
              {due ? <View style={s.pill}><Ionicons name="time-outline" size={13} color={t.sub} /><Text style={s.pillText}>{due}まで</Text></View> : null}
              <View style={s.pill}><Ionicons name="notifications-outline" size={13} color={t.sub} /><Text style={s.pillText}>{remindSummary(item)}</Text></View>
              {item.isPublic ? <View style={[s.pill, { backgroundColor: t.accent }]}><Ionicons name="gift" size={13} color="#fff" /><Text style={s.pillTextOn}>ギフト公開中</Text></View> : null}
            </View>
            {memo ? <Text style={s.memoText}>{memo}</Text> : null}
          </>
        )}

        <Text style={s.sectionLabel}>アクション</Text>
        {links.map((l) => (
          <Pressable key={l.url} style={s.actionBtn} onPress={() => openLink(l.url)}>
            <View style={s.actionLeft}>
              <Ionicons name={l.icon || 'open-outline'} size={18} color={t.accent} />
              <Text style={s.actionText}>{l.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.sub} />
          </Pressable>
        ))}

        {editMode ? (
          // 編集（入力）中は「完了」。入力の時点で達成しているわけではないので達成ボタンは出さない。
          <Pressable style={({ pressed }) => [s.doneBtn, pressed && s.doneBtnPressed]} onPress={() => setEditMode(false)}><Ionicons name="checkmark" size={22} color="#fff" /><Text style={s.doneText}>完了</Text></Pressable>
        ) : done ? (
          <Pressable style={s.undoneBtn} onPress={() => onUpdate({ doneAt: null })}><Text style={s.undoneText}>未達成に戻す</Text></Pressable>
        ) : (
          <Pressable style={({ pressed }) => [s.doneBtn, pressed && s.doneBtnPressed]} onPress={onDone}><Ionicons name="checkmark-circle" size={24} color="#fff" /><Text style={s.doneText}>達成した！</Text></Pressable>
        )}
        {editMode && <Pressable onPress={testNotify}><Text style={s.testNotifyLink}>通知の動作をテスト（10秒後に届きます）</Text></Pressable>}
      </ScrollView>
    </View>
  );
}

/* ---------- スタイル（テーマから生成） ---------- */
function makeStyles(t) {
  const styles = {
    safe: { flex: 1, backgroundColor: t.bg },
    topbar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
    sortRowDrag: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10, backgroundColor: t.surface2 },
    sortThumb: { width: 44, height: 44, borderRadius: 10, overflow: 'hidden' },
    sortTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: t.text },
    sortGrip: { paddingHorizontal: 8, paddingVertical: 10 },
    reorderBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 12, backgroundColor: t.capsule, borderRadius: 999, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 },
    reorderBarText: { fontSize: 13, color: t.text, fontWeight: '800' },
    reorderDone: { backgroundColor: t.accent, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
    reorderDoneText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    reorderHintHome: { fontSize: 11.5, color: t.sub, paddingHorizontal: 20, marginBottom: 8 },
    brand: { fontSize: 24, fontWeight: '700', color: t.text, letterSpacing: 0.3, fontFamily: FONT.bold },
    screenTitle: { fontSize: 24, fontWeight: '900', color: t.text, letterSpacing: 0.3 },
    greet: { fontSize: 12.5, color: t.sub, marginTop: 4 },

    chips: { gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.surface, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
    chipActive: { backgroundColor: t.accent },
    chipText: { fontSize: 13, fontWeight: '600', color: t.text },
    chipTextActive: { color: '#fff' },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: t.text, paddingHorizontal: 20, paddingBottom: 10, paddingTop: 8 },
    empty: { textAlign: 'center', color: t.sub, marginTop: 44, paddingHorizontal: 40, lineHeight: 22 },

    visionTitle: { fontSize: 32, fontWeight: '400', color: t.text, letterSpacing: 4, marginTop: 6, padding: 0, fontFamily: FONT.mincho },
    visionEmptyText: { color: t.sub, fontSize: 12, fontWeight: '600' },
    visionAdd: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, marginTop: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: t.surface },
    visionAddText: { color: t.accent, fontSize: 14, fontWeight: '800' },
    visionLabelWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.22)' },
    // ビジョンボード（マニフェスト・エディトリアル）
    heroWrap: { paddingHorizontal: 20, marginTop: 14 },
    heroCard: { borderRadius: 20, overflow: 'hidden', aspectRatio: 4 / 3, backgroundColor: t.surface, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 9 },
    heroImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    heroTextWrap: { position: 'absolute', left: 18, right: 18, bottom: 16, gap: 4 },
    heroKicker: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 2, fontFamily: FONT.bold },
    heroTitle: { color: '#fff', fontSize: 26, lineHeight: 33, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 10 },
    // ステータスのアクセント丸バッジ（アイコンのみ・文字ラベルなし）
    vBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 999, overflow: 'hidden' },
    heroBadge: { top: 14, left: 14 },
    vBadgeGrad: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    // マソンリーのカード（グラデのフチ＋写真オーバーレイに白文字）
    vCardBorder: { borderRadius: 16, padding: 1.5 },
    vCardInner: { borderRadius: 14.5, overflow: 'hidden', backgroundColor: t.surface },
    vCardTitle: { position: 'absolute', left: 11, right: 11, bottom: 10, color: '#fff', fontSize: 15, lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8 },
    // Pinterest型カード（写真主役・角丸・オーバーレイ）
    vCard: { borderRadius: 14, overflow: 'hidden', backgroundColor: t.surface2, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
    vStatusBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    vStatusDot: { width: 7, height: 7, borderRadius: 4 },
    vStatusText: { color: '#fff', fontSize: 10.5, fontWeight: '800' },
    vTimingTag: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4 },
    vTimingTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    vCardFav: { position: 'absolute', top: 38, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center' },
    // セクション見出し＋件数バッジ
    shelfHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 6 },
    shelfTitle: { fontSize: 16, color: t.text, fontFamily: FONT.bold },
    shelfBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: t.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(28,26,23,0.06)' },
    shelfBadgeText: { fontSize: 12, color: t.sub, fontWeight: '800', fontFamily: FONT.num },
    // 空状態（夢への招待）
    vEmpty: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 40, gap: 8 },
    vEmptyTitle: { fontSize: 20, color: t.text, fontFamily: FONT.mincho, letterSpacing: 1 },
    vEmptyText: { fontSize: 13, color: t.sub, textAlign: 'center', lineHeight: 21 },
    // ビジョン v3：ヘッダー・カテゴリタブ・リスト行・ビジュアライザー・フルスクリーン
    vHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
    vHeaderTitle: { flex: 1, fontSize: 22, color: t.text, letterSpacing: 3, fontFamily: FONT.mincho, padding: 0 },
    vHeadBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    vAddIcon: { backgroundColor: t.accent },
    vTabRow: { gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
    vTab: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.surface, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
    vTabOn: { backgroundColor: t.text },
    vTabText: { fontSize: 13, fontWeight: '700', color: t.text },
    vTabTextOn: { color: t.bg },
    vTabCount: { fontSize: 12, fontWeight: '800', color: t.sub, fontFamily: FONT.num },
    vRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line },
    vRowDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
    vRowTitle: { fontSize: 15.5, fontWeight: '700', color: t.text },
    vRowMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    vRowMetaText: { fontSize: 11.5, color: t.sub, fontWeight: '600' },
    vRowThumb: { width: 46, height: 46, borderRadius: 10 },
    vizCard: { flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: t.surface2 },
    vizTop: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    vizChip: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
    vizChipText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    vizIconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.32)' },
    vizBottom: { position: 'absolute', left: 16, right: 16, bottom: 16, gap: 4 },
    vizTitle: { color: '#fff', fontSize: 22, lineHeight: 28, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8 },
    vizSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12.5, lineHeight: 18 },
    vizDone: { position: 'absolute', right: 12, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
    vizDoneText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    vizCounter: { position: 'absolute', right: 14, top: 54, color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700', fontFamily: FONT.num },
    vizDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingTop: 8 },
    vizDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.line },
    vizDotOn: { backgroundColor: t.accent, width: 16 },
    vizEmpty: { flex: 1, marginHorizontal: 20, marginBottom: 10, borderRadius: 20, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: t.line, borderStyle: 'dashed' },
    vizEmptyText: { color: t.sub, fontSize: 12.5, fontWeight: '600', paddingHorizontal: 30, textAlign: 'center' },
    fsWrap: { flex: 1, backgroundColor: '#161311' },
    fsTopBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
    fsBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
    fsBottom: { position: 'absolute', left: 22, right: 22, bottom: 28, gap: 9 },
    fsCatChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
    fsCatText: { color: 'rgba(255,255,255,0.9)', fontSize: 12.5, fontWeight: '800' },
    fsTitle: { color: '#fff', fontSize: 30, lineHeight: 38 },
    fsSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 21 },
    fsTimingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    fsTimingLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '700' },
    fsTimingText: { color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: FONT.num },
    // タグの段の白いカード（画像＋タイトル）
    shelfCard: { backgroundColor: t.surface, borderRadius: 16, padding: 6, paddingBottom: 8, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    shelfCardImgWrap: { width: '100%', aspectRatio: 1, borderRadius: 11, overflow: 'hidden' },
    shelfCardTitle: { fontSize: 12.5, lineHeight: 17, color: t.text, fontWeight: '700', marginTop: 7, paddingHorizontal: 2 },
    shelfFav: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    // ホールドして完了ボタン（ゲージが満ちると発火・ネオングロー）
    holdBtn: { height: 54, borderRadius: 27, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    holdBtnSm: { height: 46, borderRadius: 23 },
    holdGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 27, backgroundColor: t.accent, opacity: 0 },
    holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: t.accent },
    holdRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    holdText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5, marginRight: 2 },
    doneNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.surface2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'flex-start' },
    doneNoteText: { color: t.text, fontSize: 13, fontWeight: '800' },
    // ビジョンの操作行（追加・叶った夢・カテゴリ）
    vActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginTop: 4 },
    vActionPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.surface, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
    vActionPrimary: { backgroundColor: t.accent },
    vActionText: { fontSize: 13, fontWeight: '800', color: t.text },
    vActionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface },
    // カテゴリ選択・作成
    catDot: { width: 8, height: 8, borderRadius: 4 },
    catChipDashed: { borderStyle: 'dashed', borderColor: t.accent, backgroundColor: 'transparent' },
    newCatBox: { backgroundColor: t.surface, borderRadius: 14, padding: 12, marginTop: 8 },
    newCatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    newCatAdd: { backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
    newCatAddText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
    colorDotOn: { borderColor: t.text },
    catManageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.surface, borderRadius: 14, paddingLeft: 14, paddingRight: 4, paddingVertical: 4, marginBottom: 8 },
    catManageInput: { flex: 1, fontSize: 15, fontWeight: '700', color: t.text, paddingVertical: 10 },
    detailBarTitle: { fontSize: 16, fontWeight: '800', color: t.text },
    visionBigPhotoWrap: { borderRadius: 22, overflow: 'hidden' },
    visionBigPhoto: { width: '100%', height: 300, borderRadius: 22 },
    visionBigEmpty: { backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
    visionBigLabel: { color: '#fff', fontSize: 28, textAlign: 'center', letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 10, fontFamily: FONT.mincho, paddingHorizontal: 16 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },

    masonryRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 20, paddingTop: 2 },
    masonryCol: { flex: 1, gap: 14 },
    pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },

    // ヘッダーの統計カプセル
    ghostBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface },
    statCapsule: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: t.capsule, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    statCapsuleText: { fontSize: 12.5, color: t.sub, fontWeight: '600' },
    statCapsuleNum: { color: t.accent, fontFamily: FONT.num, fontSize: 14 },

    // カテゴリチップ（キャンディボックス）
    chipCat: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
    chipCatText: { fontSize: 13, fontWeight: '700' },

    // Wishカード（画像＋白い情報パネルの2段・カテゴリ色グロー影）
    card: { borderRadius: 24, backgroundColor: t.surface, overflow: 'hidden', shadowOpacity: 0.30, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
    cardImg: { width: '100%', height: '100%' },
    cardCenter: { alignItems: 'center', justifyContent: 'center' },
    cardChip: { position: 'absolute', left: 8, top: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
    cardChipText: { fontSize: 11, fontWeight: '800' },
    cardBadge: { position: 'absolute', right: 8, top: 8, backgroundColor: t.surface, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    cardSns: { position: 'absolute', right: 8, top: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    cardDoneOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.08)' },
    cardPanel: { padding: 12, gap: 6, backgroundColor: t.surface },
    cardTitle: { fontSize: 14.5, lineHeight: 20, color: t.text, fontFamily: FONT.bold },
    cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: t.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    cardMetaText: { fontSize: 11, color: t.sub, fontWeight: '600' },
    cardTitleBig: { fontSize: 20, lineHeight: 26, color: t.text, fontFamily: FONT.bold },
    cardDots: { flexDirection: 'row', gap: 5, marginTop: 1 },
    cardDot: { width: 7, height: 7, borderRadius: 4 },
    // 「そろそろ思い出す」カルーセル
    carouselTitle: { fontSize: 14, color: t.text, paddingHorizontal: 20, marginTop: 2, marginBottom: 10, fontFamily: FONT.bold },
    remindCard: { borderRadius: 20, backgroundColor: t.surface, overflow: 'hidden', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
    remindPanel: { padding: 12, gap: 6 },

    // 空状態（パステルの丸＋やさしい一言）
    emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40 },
    emptyBlob1: { position: 'absolute', top: 44, width: 120, height: 120, borderRadius: 60, backgroundColor: t.accent, opacity: 0.10 },
    emptyBlob2: { position: 'absolute', top: 92, left: '54%', width: 66, height: 66, borderRadius: 33, backgroundColor: t.gold, opacity: 0.12 },

    // 通知
    notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderRadius: 16, padding: 14 },
    notifyIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    notifySection: { fontSize: 12, color: t.sub, fontWeight: '700', marginTop: 16, marginBottom: 8, marginLeft: 4 },
    swipeActions: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, gap: 8 },
    swipeAction: { width: 74, alignSelf: 'stretch', borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 3 },
    swipeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    notifyTitle: { fontSize: 15, fontWeight: '700', color: t.text },
    notifySub: { fontSize: 12, color: t.sub, marginTop: 3 },

    // マイページ
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, marginTop: 4, backgroundColor: t.surface, borderRadius: 18, padding: 16 },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
    avatarImg: { width: 52, height: 52, borderRadius: 26 },
    avatarEdit: { position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: t.sub, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.surface },
    segment: { flexDirection: 'row', backgroundColor: t.surface2, borderRadius: 999, padding: 3, gap: 2 },
    segBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
    segBtnOn: { backgroundColor: t.accent },
    segText: { fontSize: 13, fontWeight: '700', color: t.sub },
    segTextOn: { color: '#fff' },
    backupBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.surface2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
    backupBtnText: { color: t.accent, fontSize: 13, fontWeight: '800' },
    backupHint: { fontSize: 11.5, color: t.sub, marginHorizontal: 20, marginTop: 8, lineHeight: 17 },
    profileLabel: { fontSize: 11, color: t.sub, marginBottom: 2 },
    nameInput: { fontSize: 18, fontWeight: '800', color: t.text, padding: 0 },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 12, backgroundColor: t.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    settingText: { fontSize: 15, fontWeight: '700', color: t.text },

    // ギフトページ
    giftCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, marginTop: 12, backgroundColor: t.surface, borderRadius: 16, padding: 16 },
    giftIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
    giftCardTitle: { fontSize: 15, fontWeight: '800', color: t.text },
    giftCardSub: { fontSize: 12, color: t.sub, marginTop: 3 },
    giftToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, backgroundColor: t.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
    giftToggleHint: { fontSize: 12, color: t.sub, marginTop: 8, lineHeight: 18 },
    giftShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.accent, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
    giftShareText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    giftHeroWrap: { marginTop: 8, overflow: 'hidden' },
    giftDecor1: { position: 'absolute', right: -12, top: -16, opacity: 0.08, transform: [{ rotate: '12deg' }] },
    giftDecor2: { position: 'absolute', right: 70, top: 30, opacity: 0.08, transform: [{ rotate: '-10deg' }] },
    giftHero: { fontSize: 28, color: t.text, lineHeight: 36, fontFamily: FONT.bold },
    giftLead: { fontSize: 13, color: t.sub, marginTop: 10, lineHeight: 20 },
    giftBox: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: t.surface, borderRadius: 20, padding: 12, paddingLeft: 16, marginTop: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    giftRibbon: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
    giftThumb: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
    giftCatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginBottom: 5 },
    giftCatBadgeText: { fontSize: 11, fontWeight: '800' },
    giftRowTitle: { fontSize: 15, fontWeight: '800', color: t.text, lineHeight: 20 },
    giftBuyGrad: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8 },
    giftBuyGradText: { color: '#fff', fontWeight: '800', fontSize: 12.5 },
    giftDisclaimer: { fontSize: 11, color: t.sub, marginTop: 20, lineHeight: 16 },
    giftBrand: { fontSize: 12, color: t.sub, textAlign: 'center', marginTop: 18, fontFamily: FONT.bold, letterSpacing: 0.5 },

    // 箱庭
    gardenTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    coinPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
    coinText: { color: t.gold, fontWeight: '900', fontSize: 14 },
    // お部屋（仮）：壁＋窓（朝昼夜）＋床＋据え置き植物
    room: { marginTop: 18, height: 300, borderRadius: 24, backgroundColor: t.surface2, overflow: 'hidden' },
    roomWindow: { position: 'absolute', top: 22, alignSelf: 'center', width: '64%', height: 104, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(0,0,0,0.18)' },
    roomFloor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, backgroundColor: '#3B2F23' },
    roomPlant: { position: 'absolute', bottom: 52, alignSelf: 'center', alignItems: 'center' },
    roomLv: { position: 'absolute', top: 12, left: 14, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    roomLvText: { color: '#fff', fontWeight: '900', fontSize: 13 },
    plantGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90 },
    plantPot: { width: 110, height: 24, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: '#7A5A3C', marginTop: 8 },
    plantProgWrap: { marginTop: 18 },
    plantProgTrack: { height: 12, borderRadius: 999, backgroundColor: t.surface2, overflow: 'hidden' },
    plantProgFill: { height: '100%', borderRadius: 999, backgroundColor: t.accent, minWidth: 8 },
    plantMsg: { fontSize: 14, color: t.text, marginTop: 12, lineHeight: 21, textAlign: 'center' },
    plantMsg2: { fontSize: 13, color: t.sub, marginTop: 18, lineHeight: 20, textAlign: 'center' },
    plantNote: { fontSize: 11, color: t.sub, marginTop: 12, textAlign: 'center' },
    gardenBtnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    waterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3A8DDE', borderRadius: 16, paddingVertical: 16 },
    waterBtnOff: { backgroundColor: t.surface },
    waterBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
    dexBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: t.surface, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, borderWidth: 1, borderColor: t.line },
    dexBtnText: { color: t.accent, fontWeight: '800', fontSize: 14 },
    dex: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, backgroundColor: t.surface, borderRadius: 16, padding: 14 },
    dexItem: { alignItems: 'center', gap: 6, flex: 1 },
    dexThumb: { width: 46, height: 46, borderRadius: 12, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' },
    dexLabel: { fontSize: 11, color: t.sub, fontWeight: '700' },

    statCard: { margin: 20, marginTop: 16, backgroundColor: t.surface, borderRadius: 22, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center' },
    statTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    statBlock: { alignItems: 'center', paddingHorizontal: 26 },
    statDivider: { width: 1, height: 46, backgroundColor: t.line },
    statNum: { fontSize: 46, fontWeight: '900', color: t.accent, fontFamily: FONT.num },
    statPct: { fontSize: 24, fontWeight: '900', color: t.accent, fontFamily: FONT.num },
    statLabel: { fontSize: 13, fontWeight: '800', color: t.text, marginTop: 0 },
    graphRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginTop: 20, height: 76 },
    graphCol: { alignItems: 'center', gap: 6 },
    graphBarTrack: { height: 64, justifyContent: 'flex-end' },
    graphBar: { width: 16, borderRadius: 8, backgroundColor: t.accent },
    graphDay: { fontSize: 10, color: t.sub },
    statSub: { fontSize: 12, color: t.sub, marginTop: 14 },

    // カテゴリ別の達成バー
    catStatCard: { marginHorizontal: 20, marginTop: 4, backgroundColor: t.surface, borderRadius: 22, padding: 20 },
    catStatTitle: { fontSize: 15, fontWeight: '800', color: t.text, marginBottom: 14 },
    catStatRow: { marginBottom: 14 },
    catStatHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    catStatLabel: { fontSize: 13, fontWeight: '700', color: t.text, flex: 1 },
    catStatNum: { fontSize: 12, fontWeight: '800', color: t.sub },
    catStatTrack: { height: 10, borderRadius: 999, backgroundColor: t.surface2, overflow: 'hidden' },
    catStatFill: { height: '100%', borderRadius: 999, minWidth: 6, overflow: 'hidden' },
    catStatShine: { position: 'absolute', top: 0, bottom: 0, width: 26, backgroundColor: 'rgba(255,255,255,0.85)' },

    denseWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 20 },
    denseTile: { width: '23.5%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden' },
    denseImg: { width: '100%', height: '100%' },

    // タブバー
    tabbar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, backgroundColor: t.tabbar, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: t.line, paddingTop: 12 },
    tab: { alignItems: 'center', gap: 2, width: 64 },
    tabIconWrap: { width: 46, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    tabLabel: { fontSize: 10, color: t.sub, fontWeight: '600' },
    tabAdd: { width: 60, height: 60, marginTop: -18, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: t.accent, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
    tabAddGrad: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },

    // クイック保存
    qcBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
    qcSheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    qcSheet: { backgroundColor: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 34 },
    qcHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.line, marginBottom: 16 },
    qcTitle: { fontSize: 20, color: t.text, fontFamily: FONT.bold },
    qcSub: { fontSize: 13, color: t.sub, marginTop: 6 },
    qcBigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
    qcBigBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', fontFamily: FONT.bold },
    qcLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: t.surface, borderRadius: 14, paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
    qcLinkInput: { flex: 1, fontSize: 15, color: t.text, paddingVertical: 8 },
    qcLinkGo: { width: 38, height: 38, borderRadius: 12, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
    qcManual: { alignSelf: 'center', marginTop: 18, paddingVertical: 8 },
    qcManualText: { color: t.sub, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
    qcCenter: { alignItems: 'center', justifyContent: 'center' },
    qcScanCard: { width: 230, height: 300, borderRadius: 22, overflow: 'hidden', backgroundColor: t.surface },
    qcScanImg: { width: '100%', height: '100%' },
    qcScanTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
    qcScanLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: t.accent, shadowColor: t.accent, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
    qcScanBadge: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    qcScanBadgeText: { color: '#fff', fontSize: 11.5, fontWeight: '800' },
    qcLoadCard: { width: 230, height: 150, borderRadius: 22, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', gap: 12 },
    qcLoadText: { color: t.text, fontSize: 15, fontWeight: '800', fontFamily: FONT.bold },
    qcCard: { width: 230, borderRadius: 24, backgroundColor: t.surface, overflow: 'hidden', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
    qcShine: { position: 'absolute', top: -40, bottom: -40, width: 70, backgroundColor: 'rgba(255,255,255,0.8)' },
    qcCardChip: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
    qcCardChipText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    qcCardPanel: { padding: 14 },
    qcCardTitle: { fontSize: 15, lineHeight: 21, color: t.text, fontFamily: FONT.bold },
    qcConfirm: { marginTop: 24, alignItems: 'center', width: 320, maxWidth: '90%' },
    qcConfirmText: { fontSize: 15, color: '#fff', fontWeight: '800', marginBottom: 14 },
    qcConfirmBtns: { flexDirection: 'row', gap: 12, alignItems: 'stretch', alignSelf: 'stretch' },
    qcEditBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 18, paddingVertical: 18, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' },
    qcEditText: { color: t.accent, fontSize: 15, fontWeight: '800' },
    qcSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18, paddingHorizontal: 24 },
    qcSaveText: { color: '#fff', fontSize: 18, fontWeight: '900', fontFamily: FONT.bold },

    // 保存シート
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 30, maxHeight: '90%' },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sheetTitle: { fontSize: 19, fontWeight: '800', color: t.text },
    input: { backgroundColor: t.surface, borderRadius: 14, padding: 14, fontSize: 16, color: t.text },
    photoPick: { marginTop: 12, height: 120, borderRadius: 14, borderWidth: 1, borderColor: t.line, borderStyle: 'dashed', backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    photoPickInner: { alignItems: 'center', gap: 6 },
    photoPickText: { color: t.sub, fontSize: 13, fontWeight: '600' },
    photoPreview: { width: '100%', height: '100%' },
    photoSubRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },
    photoSubBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    photoSubText: { color: t.accent, fontSize: 13, fontWeight: '700' },
    snsDetected: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    snsDetectedText: { color: t.accent, fontSize: 12.5, fontWeight: '700' },
    linkLoadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 11 },
    linkLoadText: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
    label: { marginTop: 18, marginBottom: 10, fontSize: 13, fontWeight: '700', color: t.text },
    catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    rowScroll: { flexDirection: 'row', gap: 8, paddingRight: 12 },
    previewWrap: { alignItems: 'center', marginBottom: 6 },
    focusField: { borderWidth: 1, borderColor: t.line, borderRadius: 16 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
    catChipText: { fontSize: 13, fontWeight: '600', color: t.text },
    reminderPickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
    reminderHint: { fontSize: 13, fontWeight: '700', color: t.sub },
    reminderSummary: { marginTop: 12, fontSize: 13, fontWeight: '700', color: t.accent },
    saveBtn: { marginTop: 22, backgroundColor: t.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    saveNote: { textAlign: 'center', color: t.sub, fontSize: 12, marginTop: 10 },

    // 詳細
    detailBar: { paddingHorizontal: 12, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailBarBtn: { padding: 6 },
    detailBarRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    editToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: t.accent },
    editToggleText: { color: t.accent, fontWeight: '800', fontSize: 13 },
    summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
    pillText: { color: t.text, fontWeight: '700', fontSize: 12.5 },
    pillTextOn: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
    memoText: { color: t.sub, fontSize: 14, lineHeight: 21, marginTop: 14 },
    detailPhoto: { width: '100%', height: 240, borderRadius: 22 },
    photoTapHint: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    photoTapHintText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    photoActions: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12 },
    photoActBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    photoActText: { color: t.accent, fontSize: 13, fontWeight: '700' },
    detailTitleInput: { fontSize: 24, fontWeight: '900', color: t.text, marginTop: 16, paddingVertical: 2 },
    detailCatRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    detailCat: { fontSize: 14, color: t.sub },
    sectionLabel: { marginTop: 24, marginBottom: 10, fontSize: 13, fontWeight: '800', color: t.text },
    memoInput: { backgroundColor: t.surface, borderRadius: 14, padding: 14, fontSize: 15, color: t.text, minHeight: 80, textAlignVertical: 'top' },
    actionBtn: { marginBottom: 10, backgroundColor: t.surface, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    actionText: { fontSize: 15, fontWeight: '700', color: t.text },
    doneBtn: { marginTop: 16, backgroundColor: t.accent, borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: t.accent, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
    doneBtnPressed: { transform: [{ scale: 0.96 }], opacity: 0.95 },
    doneText: { color: '#fff', fontSize: 17, fontWeight: '900' },
    undoneBtn: { marginTop: 16, backgroundColor: t.surface, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: t.line },
    undoneText: { color: t.sub, fontSize: 15, fontWeight: '700' },
    testNotifyLink: { textAlign: 'center', color: t.sub, fontSize: 12, marginTop: 18, textDecorationLine: 'underline' },

    celebrate: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: t.mode === 'dark' ? 'rgba(15,17,21,0.78)' : 'rgba(250,247,242,0.82)' },
    // ポラロイド化するカード
    celebCard: { width: 220, borderRadius: 20, backgroundColor: '#FFFFFF', padding: 10, paddingBottom: 16, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
    celebPhotoWrap: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    celebPhoto: { width: '100%', height: '100%' },
    celebCheck: { position: 'absolute', backgroundColor: '#fff', borderRadius: 27 },
    celebCaption: { marginTop: 10, fontSize: 15, color: '#2B2622', textAlign: 'center', fontFamily: FONT.bold },
    celebCardWrap: { alignItems: 'center', justifyContent: 'center' },
    celebBig: { marginTop: 18, fontSize: 30, color: t.gold, fontFamily: FONT.bold, letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,0.15)', textShadowRadius: 6 },
  };
  // 文字スタイルには weight に応じたフォントを自動割り当て（fontFamily 指定済みは尊重）
  for (const k in styles) {
    const st = styles[k];
    if (st && (st.fontSize != null || st.fontWeight != null) && st.fontFamily == null) {
      st.fontFamily = baseFamily(st.fontWeight);
    }
  }
  return StyleSheet.create(styles);
}
