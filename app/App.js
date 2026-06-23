// WannaLog — ダーク/ライト対応・アイコン化・写真前面UI
// タブ：ホーム / ビジョン / ＋ / 通知 / マイページ

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated, Image, KeyboardAvoidingView, Linking, Modal, Platform,
  Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { palettes, CATEGORIES, getCategory, reminderBody } from './theme';
import { actionLinks, dueLabel } from './links';
import { reminderPlan, remindSummary } from './notify';
import { HEAT_OPTIONS, heatLabel, defaultRemindForHeat, byHeatThenNew } from './heat';
import { parseGps, coordsMapsUrl } from './geo';
import { parseSnsLink, snsMeta } from './sns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_800ExtraBold, Poppins_900Black } from '@expo-google-fonts/poppins';
import { MPLUSRounded1c_400Regular, MPLUSRounded1c_500Medium, MPLUSRounded1c_700Bold, MPLUSRounded1c_800ExtraBold } from '@expo-google-fonts/m-plus-rounded-1c';
import { ShipporiMincho_400Regular } from '@expo-google-fonts/shippori-mincho';

// フォント名（weight→ファミリーの対応。カスタムフォントは weight が自動で効かないため）
const FONT = {
  base: 'MPLUSRounded1c_400Regular', med: 'MPLUSRounded1c_500Medium',
  bold: 'MPLUSRounded1c_700Bold', xbold: 'MPLUSRounded1c_800ExtraBold',
  enSb: 'Poppins_600SemiBold', enXb: 'Poppins_800ExtraBold', enBlack: 'Poppins_900Black',
  mincho: 'ShipporiMincho_400Regular',
};
function baseFamily(weight) {
  const w = parseInt(weight, 10) || 400;
  if (w >= 800) return FONT.xbold;
  if (w >= 700) return FONT.bold;
  if (w >= 500) return FONT.med;
  return FONT.base;
}

const STORAGE_KEY = 'wannalog_items_v1';
const THEME_KEY = 'wannalog_theme';
const PROFILE_KEY = 'wannalog_profile';
const VISION_KEY = 'wannalog_vision_v1';
const VISION_TITLE_KEY = 'wannalog_vision_title';

// ビジョンボードは「したい」とは別データ。テンプレの枠に写真を嵌める。
const VISION_SEED = [
  { id: 'v1', imageUri: null }, { id: 'v2', imageUri: null }, { id: 'v3', imageUri: null },
  { id: 'v4', imageUri: null }, { id: 'v5', imageUri: null }, { id: 'v6', imageUri: null },
];

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
  const [mode, setMode] = useState('dark');
  const [profileName, setProfileName] = useState('あなた');
  const [items, setItems] = useState([]);
  const [visionSlots, setVisionSlots] = useState(VISION_SEED);
  const [visionTitle, setVisionTitle] = useState('2026 VISION');
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('home');
  const [selectedId, setSelectedId] = useState(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [praise, setPraise] = useState(PRAISE[0]);
  const celebAnim = useRef(new Animated.Value(0)).current;
  const [fontsLoaded] = useFonts({
    Poppins_400Regular, Poppins_600SemiBold, Poppins_800ExtraBold, Poppins_900Black,
    MPLUSRounded1c_400Regular, MPLUSRounded1c_500Medium, MPLUSRounded1c_700Bold, MPLUSRounded1c_800ExtraBold,
    ShipporiMincho_400Regular,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') await Notifications.requestPermissionsAsync();
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw)); else { setItems(SEED); AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED)); }
      const m = await AsyncStorage.getItem(THEME_KEY); if (m) setMode(m);
      const p = await AsyncStorage.getItem(PROFILE_KEY); if (p) setProfileName(p);
      const vs = await AsyncStorage.getItem(VISION_KEY);
      if (vs) setVisionSlots(JSON.parse(vs)); else AsyncStorage.setItem(VISION_KEY, JSON.stringify(VISION_SEED));
      const vt = await AsyncStorage.getItem(VISION_TITLE_KEY); if (vt) setVisionTitle(vt);
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

  // ビジョンボード操作（「したい」とは別データ）
  async function persistVision(next) { setVisionSlots(next); await AsyncStorage.setItem(VISION_KEY, JSON.stringify(next)); }
  async function fillVisionSlot(id) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('写真へのアクセスが許可されていません'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
    if (!res.canceled) { await persistVision(visionSlots.map((sl) => (sl.id === id ? { ...sl, imageUri: res.assets[0].uri } : sl))); Haptics.selectionAsync(); }
  }
  async function clearVisionSlot(id) { await persistVision(visionSlots.map((sl) => (sl.id === id ? { ...sl, imageUri: null } : sl))); }
  async function addVisionSlot() { await persistVision([...visionSlots, { id: String(Date.now()), imageUri: null }]); }
  async function removeVisionSlot(id) { await persistVision(visionSlots.filter((sl) => sl.id !== id)); }
  async function saveVisionTitle(v) { setVisionTitle(v); await AsyncStorage.setItem(VISION_TITLE_KEY, v); }
  async function setVisionLabel(id, text) { await persistVision(visionSlots.map((sl) => (sl.id === id ? { ...sl, label: text } : sl))); }

  async function persist(next) { setItems(next); await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }

  async function addItem(title, category, due, imageUri, heat, reminder, link) {
    const rem = reminder || { remind: '3days' };
    const item = { id: String(Date.now()), title, category, dueTag: due || 'none', imageUri: imageUri || null, heat: heat || 2, sourceUrl: link?.url || null, sourcePlatform: link?.platform || null, ...rem, notifId: null, createdAt: Date.now(), doneAt: null };
    item.notifId = await scheduleReminder(item);
    await persist([item, ...items]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('保存しました', item.remind === 'none' ? 'ボードに追加しました。' : `${remindSummary(item)} に思い出させます。`);
  }

  function runCelebration() {
    setPraise(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    setCelebrating(true); celebAnim.setValue(0);
    Animated.sequence([
      Animated.spring(celebAnim, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(celebAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setCelebrating(false));
  }

  async function markDone(id) {
    await persist(items.map((it) => (it.id === id ? { ...it, doneAt: Date.now() } : it)));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); runCelebration();
  }
  async function updateItem(id, patch) { await persist(items.map((it) => (it.id === id ? { ...it, ...patch } : it))); }
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
    <ThemeCtx.Provider value={t}>
      <SafeAreaView style={s.safe}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        {selected ? (
          <DetailScreen
            key={selected.id} item={selected}
            onBack={() => setSelectedId(null)}
            onDone={() => { markDone(selected.id); setSelectedId(null); }}
            onUpdate={(patch) => updateItem(selected.id, patch)}
            onReminder={(reminder) => applyReminder(selected.id, reminder)}
            onDelete={() => { deleteItem(selected.id); setSelectedId(null); }}
          />
        ) : (
          <>
            {tab === 'home' && <HomeTab items={items} filter={filter} setFilter={setFilter} onOpen={openItem} doneCount={doneCount} activeCount={activeCount} />}
            {tab === 'vision' && <VisionTab slots={visionSlots} title={visionTitle} onSetTitle={saveVisionTitle} onFill={fillVisionSlot} onClear={clearVisionSlot} onAdd={addVisionSlot} onRemove={removeVisionSlot} onLabel={setVisionLabel} />}
            {tab === 'notify' && <NotifyTab items={items} onOpen={openItem} />}
            {tab === 'mypage' && <MyPageTab items={items} doneCount={doneCount} name={profileName} onName={saveName} mode={mode} onToggleMode={toggleMode} onOpen={openItem} onOpenGift={() => setGiftOpen(true)} />}
            <TabBar tab={tab} onTab={setTab} onAdd={() => setSaveOpen(true)} />
          </>
        )}

        <SaveModal visible={saveOpen} onClose={() => setSaveOpen(false)}
          onSave={(title, category, due, imageUri, heat, reminder, link) => { addItem(title, category, due, imageUri, heat, reminder, link); setSaveOpen(false); }} />

        <GiftModal visible={giftOpen} onClose={() => setGiftOpen(false)} items={items} name={profileName} onOpen={(it) => { setGiftOpen(false); openItem(it); }} />

        {celebrating && (
          <Animated.View pointerEvents="none" style={[s.celebrate, { opacity: celebAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
            <Animated.View style={{ alignItems: 'center', transform: [{ scale: celebAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }}>
              <Ionicons name="trophy" size={66} color={t.gold} />
              <Text style={s.celebrateEn}>{praise}</Text>
              <Text style={s.celebrateText}>叶えた！</Text>
            </Animated.View>
          </Animated.View>
        )}
      </SafeAreaView>
    </ThemeCtx.Provider>
  );
}

/* ---------- 共通：登場アニメ & マソンリー ---------- */
function FadeInView({ index = 0, children }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 340, delay: Math.min(index, 8) * 45, useNativeDriver: true }).start(); }, []);
  return <Animated.View style={{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>{children}</Animated.View>;
}
const TILE_HEIGHTS = [160, 215, 175, 235, 165, 205];
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

/* ---------- 達成演出：英語のほめ言葉（紙吹雪は不自然だったので外した） ---------- */
const PRAISE = ['Amazing!', 'You did it!', 'Dream unlocked!', 'Way to go!', 'Legend!', 'Nailed it!', 'One step closer!'];

/* ---------- 写真前面タイル（ホーム/ビジョン共通） ---------- */
function PhotoTile({ item, onPress, height = 180 }) {
  const t = useTheme(); const s = useStyles();
  const cat = getCategory(item.category);
  const done = !!item.doneAt;
  const due = dueLabel(item.dueTag);
  return (
    <Pressable style={({ pressed }) => [s.tile, { height }, pressed && s.pressed]} onPress={onPress}>
      {item.imageUri
        ? <Image source={{ uri: item.imageUri }} style={s.tileImg} />
        : <View style={[s.tileImg, { backgroundColor: cat.color, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name={cat.icon} size={46} color="rgba(255,255,255,0.9)" />
          </View>}
      <View style={s.tileShade} />
      <View style={[s.tileTag, { backgroundColor: cat.color + 'E6' }]}>
        <Ionicons name={cat.icon} size={11} color="#fff" />
        <Text style={s.tileTagText}>{cat.label}</Text>
      </View>
      {done
        ? <View style={s.tileDone}><Ionicons name="checkmark-circle" size={22} color={t.gold} /></View>
        : item.sourcePlatform
          ? <View style={s.tileSns}><Ionicons name={snsMeta(item.sourcePlatform).icon} size={14} color="#fff" /></View>
          : null}
      <View style={s.tileBottom}>
        <Text style={s.tileTitle} numberOfLines={2}>{item.title}</Text>
        <View style={s.tileMetaRow}>
          {!done && due ? (
            <View style={s.tileDueRow}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={s.tileDue}>{due}まで</Text>
            </View>
          ) : <View />}
          <View style={s.tileFlames}>
            {[1, 2, 3].map((n) => (
              <Ionicons key={n} name="flame" size={11} color={n <= (item.heat || 2) ? t.gold : 'rgba(255,255,255,0.32)'} />
            ))}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/* ---------- ホーム ---------- */
function HomeTab({ items, filter, setFilter, onOpen, doneCount, activeCount }) {
  const t = useTheme(); const s = useStyles();
  // 保存元SNS（重複なし）。サービス別の絞り込みチップに使う。
  const snsPresent = [...new Set(items.filter((it) => !it.doneAt && it.sourcePlatform).map((it) => it.sourcePlatform))];
  let visible;
  if (filter === 'done') visible = items.filter((it) => it.doneAt);
  else if (filter === 'serious') visible = items.filter((it) => !it.doneAt && (it.heat || 2) === 3).slice().sort(byHeatThenNew);
  else if (filter.startsWith('sns:')) { const p = filter.slice(4); visible = items.filter((it) => !it.doneAt && it.sourcePlatform === p).slice().sort(byHeatThenNew); }
  else visible = items.filter((it) => !it.doneAt && (filter === 'all' || it.category === filter)).slice().sort(byHeatThenNew);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <View style={s.topbar}>
        <View style={s.brandRow}>
          <Ionicons name="sparkles" size={20} color={t.accent} />
          <Text style={s.brand}>WannaLog</Text>
        </View>
        <Text style={s.greet}>叶えた {doneCount}・のこり {activeCount}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        <Chip label="すべて" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip icon="flame" label="本気" active={filter === 'serious'} onPress={() => setFilter('serious')} />
        {CATEGORIES.map((c) => (
          <Chip key={c.key} icon={c.icon} label={c.label} active={filter === c.key} onPress={() => setFilter(c.key)} />
        ))}
        {snsPresent.map((p) => (
          <Chip key={p} icon={snsMeta(p).icon} label={snsMeta(p).label} active={filter === 'sns:' + p} onPress={() => setFilter('sns:' + p)} />
        ))}
        <Chip icon="trophy" label={`叶えた ${doneCount}`} active={filter === 'done'} onPress={() => setFilter('done')} />
      </ScrollView>
      {visible.length === 0 ? (
        <Text style={s.empty}>{filter === 'done' ? 'まだ叶えたものはありません。\n小さな一歩から。' : '最初の“したい”を、＋から置いてみよう。'}</Text>
      ) : (
        <Masonry items={visible} renderTile={(it, i) => (
          <FadeInView key={it.id} index={i}>
            <PhotoTile item={it} height={TILE_HEIGHTS[i % TILE_HEIGHTS.length]} onPress={() => onOpen(it)} />
          </FadeInView>
        )} />
      )}
    </ScrollView>
  );
}

/* ---------- ビジョンボード（別データ・枠に写真を嵌めるムードボード） ---------- */
function VisionTab({ slots, title, onSetTitle, onFill, onClear, onAdd, onRemove, onLabel }) {
  const t = useTheme(); const s = useStyles();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <View style={s.topbar}>
        <Text style={s.greet}>なりたい自分・叶えたい夢</Text>
        <TextInput style={s.visionTitle} value={title} onChangeText={onSetTitle} placeholder="2026 VISION" placeholderTextColor={t.sub} maxLength={24} />
      </View>
      <Masonry items={slots} renderTile={(slot, i) => (
        <FadeInView key={slot.id} index={i}>
          <VisionSlot slot={slot} height={TILE_HEIGHTS[i % TILE_HEIGHTS.length]} onFill={() => onFill(slot.id)} onClear={() => onClear(slot.id)} onRemove={() => onRemove(slot.id)} onLabel={(text) => onLabel(slot.id, text)} />
        </FadeInView>
      )} />
      <Pressable style={s.visionAdd} onPress={onAdd}>
        <Ionicons name="add" size={18} color={t.accent} />
        <Text style={s.visionAddText}>枠を追加</Text>
      </Pressable>
    </ScrollView>
  );
}
function VisionSlot({ slot, height, onFill, onClear, onRemove, onLabel }) {
  const t = useTheme(); const s = useStyles();
  function editLabel() {
    if (Alert.prompt) {
      Alert.prompt('ひとことコメント', '画像の上にスタイリッシュに表示されます', (text) => onLabel(text), 'plain-text', slot.label || '');
    } else {
      Alert.alert('コメント', 'この端末では文字入力ダイアログが使えません。');
    }
  }
  if (slot.imageUri) {
    const menu = () => Alert.alert('この枠', undefined, [
      { text: slot.label ? 'コメントを編集' : 'コメントを入れる', onPress: editLabel },
      { text: '写真を変更', onPress: onFill },
      { text: '写真を外す', onPress: onClear },
      { text: '枠を削除', style: 'destructive', onPress: onRemove },
      { text: 'キャンセル', style: 'cancel' },
    ]);
    return (
      <Pressable style={({ pressed }) => [s.tile, { height }, pressed && s.pressed]} onPress={menu}>
        <Image source={{ uri: slot.imageUri }} style={s.tileImg} />
        {slot.label ? (
          <View style={s.visionLabelWrap}>
            <Text style={s.visionSlotLabel} numberOfLines={3}>{slot.label}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  }
  return (
    <Pressable style={[s.visionEmpty, { height }]} onPress={onFill}>
      <Ionicons name="add-circle-outline" size={28} color={t.sub} />
      <Text style={s.visionEmptyText}>写真を入れる</Text>
    </Pressable>
  );
}

/* ---------- 通知 ---------- */
function NotifyTab({ items, onOpen }) {
  const t = useTheme(); const s = useStyles();
  const reminders = items.filter((it) => !it.doneAt && it.remind && it.remind !== 'none');
  return (
    <View style={{ flex: 1 }}>
      <View style={s.topbar}>
        <Text style={s.screenTitle}>通知</Text>
        <Text style={s.greet}>これから、そっと思い出すこと</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110, gap: 10 }} showsVerticalScrollIndicator={false}>
        {reminders.length === 0 ? (
          <Text style={s.empty}>思い出す予定はありません。{'\n'}保存時に「思い出す」を選ぶと、ここに並びます。</Text>
        ) : reminders.map((item) => {
          const cat = getCategory(item.category);
          return (
            <Pressable key={item.id} style={({ pressed }) => [s.notifyRow, pressed && s.pressed]} onPress={() => onOpen(item)}>
              <View style={[s.notifyIcon, { backgroundColor: cat.color }]}><Ionicons name={cat.icon} size={18} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.notifyTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={s.notifySub}>{remindSummary(item)}に思い出します</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.sub} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ---------- マイページ ---------- */
const DAY_MS = 86400000;
function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function MyPageTab({ items, doneCount, name, onName, mode, onToggleMode, onOpen, onOpenGift }) {
  const t = useTheme(); const s = useStyles();
  const done = items.filter((it) => it.doneAt);
  const publicCount = items.filter((it) => it.isPublic && !it.doneAt).length;
  const total = items.length;
  const rate = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const seriousDone = done.filter((it) => (it.heat || 2) === 3).length;
  const casualDone = done.filter((it) => (it.heat || 2) === 1).length;
  // カテゴリ別の達成（そのカテゴリの中で叶えた割合）
  const byCat = CATEGORIES.map((c) => {
    const catItems = items.filter((it) => it.category === c.key);
    const catDone = catItems.filter((it) => it.doneAt).length;
    return { ...c, total: catItems.length, done: catDone, rate: catItems.length ? catDone / catItems.length : 0 };
  }).filter((c) => c.total > 0);
  // 直近7日の達成数バー
  const today = startOfDay(Date.now());
  const week = [...Array(7)].map((_, i) => today - (6 - i) * DAY_MS);
  const counts = week.map((d) => done.filter((it) => startOfDay(it.doneAt) === d).length);
  const max = Math.max(1, ...counts);
  const W = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      <View style={s.topbar}><Text style={s.screenTitle}>マイページ</Text></View>

      {/* プロフィール */}
      <View style={s.profileRow}>
        <View style={s.avatar}><Ionicons name="person" size={26} color={t.bg} /></View>
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

      {/* ギフトページ（ほしいものリストの共有） */}
      <Pressable style={s.giftCard} onPress={onOpenGift}>
        <View style={s.giftIcon}><Ionicons name="gift" size={22} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.giftCardTitle}>ギフトページ</Text>
          <Text style={s.giftCardSub}>{publicCount > 0 ? `公開中 ${publicCount}件・友だちに共有できます` : '公開した「ほしい」を友だちに共有'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.sub} />
      </Pressable>

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
        {(seriousDone > 0 || casualDone > 0) && (
          <Text style={s.statSub}>本気で叶えた {seriousDone}　／　気になっただけ {casualDone}</Text>
        )}
      </View>

      {/* カテゴリ別の達成バー（色分け） */}
      {byCat.length > 0 && (
        <View style={s.catStatCard}>
          <Text style={s.catStatTitle}>カテゴリ別の達成</Text>
          {byCat.map((c) => (
            <View key={c.key} style={s.catStatRow}>
              <View style={s.catStatHead}>
                <Ionicons name={c.icon} size={14} color={c.color} />
                <Text style={s.catStatLabel}>{c.label}</Text>
                <Text style={s.catStatNum}>{c.done}/{c.total}</Text>
              </View>
              <View style={s.catStatTrack}>
                <View style={[s.catStatFill, { width: `${Math.round(c.rate * 100)}%`, backgroundColor: c.color }]} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 達成コレクション（小さく敷き詰め） */}
      <Text style={s.sectionTitle}>叶えたコレクション</Text>
      {done.length === 0 ? (
        <Text style={s.empty}>達成したものが、ここに飾られます。</Text>
      ) : (
        <View style={s.denseWrap}>
          {done.map((item) => (
            <Pressable key={item.id} style={s.denseTile} onPress={() => onOpen(item)}>
              {item.imageUri
                ? <Image source={{ uri: item.imageUri }} style={s.denseImg} />
                : <View style={[s.denseImg, { backgroundColor: getCategory(item.category).color, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name={getCategory(item.category).icon} size={22} color="#fff" />
                  </View>}
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/* ---------- タブバー ---------- */
function TabBar({ tab, onTab, onAdd }) {
  return (
    <>
      <TabBarInner tab={tab} onTab={onTab} onAdd={onAdd} />
    </>
  );
}
function TabBarInner({ tab, onTab, onAdd }) {
  const t = useTheme(); const s = useStyles();
  const item = (key, icon, label) => (
    <Pressable style={s.tab} onPress={() => onTab(key)}>
      <Ionicons name={tab === key ? icon : icon + '-outline'} size={23} color={tab === key ? t.accent : t.sub} />
      <Text style={[s.tabLabel, tab === key && { color: t.accent, fontWeight: '800' }]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={s.tabbar}>
      {item('home', 'home', 'ホーム')}
      {item('vision', 'sparkles', 'ビジョン')}
      <Pressable style={s.tabAdd} onPress={onAdd}><Ionicons name="add" size={30} color="#fff" /></Pressable>
      {item('notify', 'notifications', '通知')}
      {item('mypage', 'person', 'マイページ')}
    </View>
  );
}

function Chip({ icon, label, active, onPress }) {
  const t = useTheme(); const s = useStyles();
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      {icon ? <Ionicons name={icon} size={13} color={active ? (t.mode === 'dark' ? t.bg : '#fff') : t.text} /> : null}
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

/* ---------- 保存シート ---------- */
function SaveModal({ visible, onClose, onSave }) {
  const t = useTheme(); const s = useStyles();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('eat');
  const [due, setDue] = useState('none');
  const [image, setImage] = useState(null);
  const [link, setLink] = useState('');
  const [heat, setHeat] = useState(2);
  const [reminder, setReminder] = useState({ remind: '3days' });

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
  function resetForm() { setTitle(''); setCategory('eat'); setDue('none'); setImage(null); setLink(''); setHeat(2); setReminder({ remind: '3days' }); }
  function handleSave() {
    if (!title.trim()) { Alert.alert('タイトルを入力してください'); return; }
    const finalImage = image || (sns ? sns.thumbnail : null);
    const linkInfo = sns
      ? { url: sns.url, platform: sns.platform }
      : (link.trim() ? { url: link.trim(), platform: null } : null);
    onSave(title.trim(), category, due, finalImage, heat, reminder, linkInfo); resetForm();
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

            <Pressable style={s.photoPick} onPress={pickImage}>
              {previewUri ? <Image source={{ uri: previewUri }} style={s.photoPreview} />
                : <View style={s.photoPickInner}><Ionicons name="image-outline" size={22} color={t.sub} /><Text style={s.photoPickText}>写真を選ぶ（任意・切り取りできます）</Text></View>}
            </Pressable>
            {image && <Pressable onPress={() => setImage(null)}><Text style={s.removeText}>写真を外す</Text></Pressable>}

            <Text style={s.label}>カテゴリ</Text>
            <View style={s.catWrap}>
              {CATEGORIES.map((c) => (
                <Pressable key={c.key} onPress={() => setCategory(c.key)} style={optChip(category === c.key, c.color)}>
                  <Ionicons name={c.icon} size={13} color={category === c.key ? '#fff' : t.text} />
                  <Text style={[s.catChipText, category === c.key && { color: '#fff' }]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.label}>熱量（本気度）</Text>
            <View style={s.catWrap}>
              {HEAT_OPTIONS.map((h) => (
                <Pressable key={h.key} onPress={() => chooseHeat(h.key)} style={optChip(heat === h.key, t.accent)}>
                  <Ionicons name="flame" size={13} color={heat === h.key ? '#fff' : (h.key === 3 ? t.accent : t.sub)} />
                  <Text style={[s.catChipText, heat === h.key && { color: '#fff' }]}>{h.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.label}>いつまでに</Text>
            <View style={s.catWrap}>
              {DUE_OPTIONS.map((d) => (
                <Pressable key={d.key} onPress={() => setDue(d.key)} style={optChip(due === d.key, t.accent)}>
                  <Text style={[s.catChipText, due === d.key && { color: '#fff' }]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>

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

/* ---------- ギフトページ（プレビュー＆共有） ---------- */
// 「ギフトに公開」した“ほしい”を、友だちに見せる体で表示。共有は端末標準の共有シート。
// ここはアプリ内なので商品リンクは“ただの検索リンク”（アフィリ化は将来のWebページ側でのみ）。
function GiftModal({ visible, onClose, items, name, onOpen }) {
  const t = useTheme(); const s = useStyles();
  const list = items.filter((it) => it.isPublic && !it.doneAt);
  async function share() {
    if (list.length === 0) { Alert.alert('まだ公開中の「ほしい」がありません', '詳細画面で「ギフトページに公開」をオンにしてください。'); return; }
    const body = list.map((it) => `・${it.title}`).join('\n');
    try { await Share.share({ message: `${name}のほしいものリスト\n\n${body}\n\n— WannaLog で作成` }); } catch (e) {}
  }
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.detailBar}>
          <Pressable onPress={onClose} style={s.detailBarBtn}><Ionicons name="chevron-back" size={24} color={t.text} /></Pressable>
          <Pressable onPress={share} style={s.giftShareBtn}><Ionicons name="share-social-outline" size={16} color="#fff" /><Text style={s.giftShareText}>共有する</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={s.giftHero}>{name}さんへの{'\n'}贈りもの候補</Text>
          <Text style={s.giftLead}>友だちがこのページから贈れます。{'\n'}（これは将来のWeb公開ページの“見本”です）</Text>
          {list.length === 0 ? (
            <Text style={s.empty}>まだ公開中の「ほしい」はありません。{'\n'}詳細画面で「ギフトページに公開」をオンにすると、ここに並びます。</Text>
          ) : list.map((item) => {
            const cat = getCategory(item.category);
            const link = actionLinks(item.category, item.title)[0];
            return (
              <View key={item.id} style={s.giftRow}>
                <Pressable onPress={() => onOpen(item)}>
                  {item.imageUri
                    ? <Image source={{ uri: item.imageUri }} style={s.giftThumb} />
                    : <View style={[s.giftThumb, { backgroundColor: cat.color, alignItems: 'center', justifyContent: 'center' }]}><Ionicons name={cat.icon} size={24} color="#fff" /></View>}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={s.giftRowTitle} numberOfLines={2}>{item.title}</Text>
                  <Pressable style={s.giftBuy} onPress={() => link && Linking.openURL(link.url).catch(() => {})}>
                    <Ionicons name="bag-handle-outline" size={14} color={t.accent} />
                    <Text style={s.giftBuyText}>{link ? link.label : '見てみる'}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {list.length > 0 && <Text style={s.giftDisclaimer}>※ 公開ページのリンクには広告（アフィリエイト）を含む予定です。</Text>}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/* ---------- 詳細 ---------- */
function DetailScreen({ item, onBack, onDone, onUpdate, onReminder, onDelete }) {
  const t = useTheme(); const s = useStyles();
  const cat = getCategory(item.category);
  const done = !!item.doneAt;
  const due = dueLabel(item.dueTag);
  const heat = item.heat || 2;
  const links = [
    ...(item.sourceUrl ? [{ icon: snsMeta(item.sourcePlatform).icon, label: `${snsMeta(item.sourcePlatform).label}で開く`, url: item.sourceUrl }] : []),
    ...(item.lat != null ? [{ icon: 'location', label: '撮影場所を地図で開く', url: coordsMapsUrl(item.lat, item.lng) }] : []),
    ...actionLinks(item.category, item.title),
  ];
  const [title, setTitle] = useState(item.title);
  const [memo, setMemo] = useState(item.memo || '');
  const [editMode, setEditMode] = useState(false);

  async function testNotify() { await scheduleInSeconds(item, 10); Alert.alert('テスト通知を予約しました', '約10秒後に通知が届きます。'); }
  function openLink(url) { Linking.openURL(url).catch(() => Alert.alert('リンクを開けませんでした')); }
  function confirmDelete() {
    Alert.alert('削除しますか？', 'この「したい」を削除します。元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' }, { text: '削除', style: 'destructive', onPress: onDelete },
    ]);
  }
  async function changePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('写真へのアクセスが許可されていません'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
    if (!res.canceled) onUpdate({ imageUri: res.assets[0].uri });
  }
  // 撮影場所を読む：切り抜き無し＋EXIFありで取り込み、GPSがあれば保存
  async function readLocationFromPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('写真へのアクセスが許可されていません'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, exif: true, quality: 0.6 });
    if (res.canceled) return;
    const asset = res.assets[0];
    const gps = parseGps(asset.exif);
    const patch = { imageUri: asset.uri };
    if (gps) { patch.lat = gps.lat; patch.lng = gps.lng; Alert.alert('場所を読み取りました', '「撮影場所を地図で開く」から開けます。'); }
    else { Alert.alert('位置情報が見つかりませんでした', 'この写真にGPSが無いか、iPhoneの設定で写真の位置情報が許可されていない可能性があります。'); }
    onUpdate(patch);
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
        {item.imageUri
          ? <Image source={{ uri: item.imageUri }} style={s.detailPhoto} />
          : <View style={[s.detailPhoto, { backgroundColor: cat.color, alignItems: 'center', justifyContent: 'center' }]}><Ionicons name={cat.icon} size={72} color="rgba(255,255,255,0.9)" /></View>}
        {editMode && (
          <View style={s.photoActions}>
            <Pressable onPress={changePhoto} style={s.photoActBtn}><Ionicons name="camera-outline" size={16} color={t.accent} /><Text style={s.photoActText}>写真を変更</Text></Pressable>
            <Pressable onPress={readLocationFromPhoto} style={s.photoActBtn}><Ionicons name="location-outline" size={16} color={t.accent} /><Text style={s.photoActText}>場所を読む</Text></Pressable>
            {item.imageUri && <Pressable onPress={() => onUpdate({ imageUri: null, lat: null, lng: null })} style={s.photoActBtn}><Ionicons name="close" size={16} color="#E5484D" /><Text style={[s.photoActText, { color: '#E5484D' }]}>外す</Text></Pressable>}
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
                  <Ionicons name={c.icon} size={13} color={item.category === c.key ? '#fff' : t.text} />
                  <Text style={[s.catChipText, item.category === c.key && { color: '#fff' }]}>{c.label}</Text>
                </Pressable>
              ))}
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

            <View style={s.giftToggleRow}>
              <View style={s.settingLeft}>
                <Ionicons name="gift-outline" size={18} color={t.accent} />
                <Text style={s.settingText}>ギフトページに公開</Text>
              </View>
              <Switch value={!!item.isPublic} onValueChange={(v) => onUpdate({ isPublic: v })} trackColor={{ true: t.accent }} />
            </View>
            <Text style={s.giftToggleHint}>オンにすると「マイページ → ギフトページ」に並び、友だちに共有できます（誕生日・記念日に便利）。</Text>
          </>
        ) : (
          <>
            <View style={s.summaryRow}>
              <View style={[s.pill, { backgroundColor: cat.color }]}><Ionicons name={cat.icon} size={13} color="#fff" /><Text style={s.pillTextOn}>{cat.label}</Text></View>
              <View style={s.pill}><Ionicons name="flame" size={13} color={t.accent} /><Text style={s.pillText}>{heatLabel(heat)}</Text></View>
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

        {done ? (
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
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    brand: { fontSize: 23, fontWeight: '900', color: t.text, letterSpacing: 0.5, fontFamily: FONT.enBlack },
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
    visionEmpty: { borderRadius: 20, borderWidth: 1.5, borderColor: t.line, borderStyle: 'dashed', backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', gap: 6 },
    visionEmptyText: { color: t.sub, fontSize: 12, fontWeight: '600' },
    visionAdd: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, marginTop: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: t.surface },
    visionAddText: { color: t.accent, fontSize: 14, fontWeight: '800' },
    visionLabelWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.22)' },
    visionSlotLabel: { color: '#fff', fontSize: 20, fontWeight: '400', letterSpacing: 2, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 8, fontFamily: FONT.mincho },

    masonryRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 2 },
    masonryCol: { flex: 1, gap: 12 },
    pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },

    // 写真前面タイル
    tile: { borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: t.surface },
    tileImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    tileShade: { ...StyleSheet.absoluteFillObject, top: '66%', backgroundColor: 'rgba(0,0,0,0.5)' },
    tileTag: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
    tileTagText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    tileDone: { position: 'absolute', right: 10, top: 10 },
    tileSns: { position: 'absolute', right: 10, top: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
    tileBottom: { padding: 12 },
    tileTitle: { color: '#fff', fontSize: 14.5, fontWeight: '800', lineHeight: 19, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
    tileMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
    tileDueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tileDue: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
    tileFlames: { flexDirection: 'row', gap: 1 },

    // 通知
    notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surface, borderRadius: 16, padding: 14 },
    notifyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    notifyTitle: { fontSize: 15, fontWeight: '700', color: t.text },
    notifySub: { fontSize: 12, color: t.sub, marginTop: 3 },

    // マイページ
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, marginTop: 4, backgroundColor: t.surface, borderRadius: 18, padding: 16 },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
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
    giftHero: { fontSize: 28, fontWeight: '900', color: t.text, lineHeight: 36, marginTop: 8 },
    giftLead: { fontSize: 13, color: t.sub, marginTop: 10, lineHeight: 20 },
    giftRow: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: t.surface, borderRadius: 16, padding: 12, marginTop: 14 },
    giftThumb: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
    giftRowTitle: { fontSize: 15, fontWeight: '800', color: t.text, lineHeight: 20 },
    giftBuy: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, alignSelf: 'flex-start', backgroundColor: t.bg, borderWidth: 1, borderColor: t.line, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
    giftBuyText: { color: t.accent, fontWeight: '700', fontSize: 12.5 },
    giftDisclaimer: { fontSize: 11, color: t.sub, marginTop: 20, lineHeight: 16 },

    statCard: { margin: 20, marginTop: 16, backgroundColor: t.surface, borderRadius: 22, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center' },
    statTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    statBlock: { alignItems: 'center', paddingHorizontal: 26 },
    statDivider: { width: 1, height: 46, backgroundColor: t.line },
    statNum: { fontSize: 46, fontWeight: '900', color: t.accent, fontFamily: FONT.enBlack },
    statPct: { fontSize: 24, fontWeight: '900', color: t.accent, fontFamily: FONT.enBlack },
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
    catStatFill: { height: '100%', borderRadius: 999, minWidth: 6 },

    denseWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 20 },
    denseTile: { width: '23.5%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden' },
    denseImg: { width: '100%', height: '100%' },

    // タブバー
    tabbar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, backgroundColor: t.tabbar, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: t.line, paddingTop: 12 },
    tab: { alignItems: 'center', gap: 3, width: 64 },
    tabLabel: { fontSize: 10, color: t.sub, fontWeight: '600' },
    tabAdd: { width: 56, height: 56, marginTop: -16, borderRadius: 28, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', shadowColor: t.accent, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },

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
    removeText: { textAlign: 'center', color: '#E5484D', fontSize: 12, fontWeight: '700', marginTop: 8 },
    snsDetected: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    snsDetectedText: { color: t.accent, fontSize: 12.5, fontWeight: '700' },
    label: { marginTop: 18, marginBottom: 10, fontSize: 13, fontWeight: '700', color: t.text },
    catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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

    celebrate: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: t.mode === 'dark' ? 'rgba(15,17,21,0.7)' : 'rgba(250,247,242,0.7)' },
    celebrateEn: { marginTop: 12, fontSize: 30, fontWeight: '900', color: t.gold, letterSpacing: 0.5, fontFamily: FONT.enBlack },
    celebrateText: { marginTop: 4, fontSize: 22, fontWeight: '900', color: t.text },
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
