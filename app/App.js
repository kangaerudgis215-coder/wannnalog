// WannaLog — ダーク/ライト対応・アイコン化・写真前面UI
// タブ：ホーム / ビジョン / ＋ / 通知 / マイページ

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated, Image, KeyboardAvoidingView, Linking, Modal, Platform,
  Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { palettes, CATEGORIES, getCategory, reminderBody } from './theme';
import { actionLinks, dueLabel } from './links';
import { REMIND_OPTIONS, reminderSeconds, remindLabel } from './notify';
import { HEAT_OPTIONS, heatLabel, defaultRemindForHeat, byHeatThenNew } from './heat';

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

async function scheduleReminder(item, seconds) {
  const cat = getCategory(item.category);
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: cat.label + '：' + item.title, body: reminderBody(item.category), data: { id: item.id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    });
  } catch (e) { console.warn('通知の予約に失敗:', e); return null; }
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
  const [celebrating, setCelebrating] = useState(false);
  const celebAnim = useRef(new Animated.Value(0)).current;

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

  async function addItem(title, category, due, imageUri, remind, heat) {
    const r = remind || '3days';
    const item = { id: String(Date.now()), title, category, dueTag: due || 'none', imageUri: imageUri || null, remind: r, heat: heat || 2, notifId: null, createdAt: Date.now(), doneAt: null };
    const secs = reminderSeconds(r);
    if (secs) item.notifId = await scheduleReminder(item, secs);
    await persist([item, ...items]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('保存しました', r === 'none' ? 'ボードに追加しました。' : `${remindLabel(r)}、そっと思い出させます。`);
  }

  function runCelebration() {
    setCelebrating(true); celebAnim.setValue(0);
    Animated.sequence([
      Animated.timing(celebAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(celebAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setCelebrating(false));
  }

  async function markDone(id) {
    await persist(items.map((it) => (it.id === id ? { ...it, doneAt: Date.now() } : it)));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); runCelebration();
  }
  async function updateItem(id, patch) { await persist(items.map((it) => (it.id === id ? { ...it, ...patch } : it))); }
  async function setItemRemind(id, choice) {
    const it = items.find((x) => x.id === id); if (!it) return;
    if (it.notifId) { try { await Notifications.cancelScheduledNotificationAsync(it.notifId); } catch (e) {} }
    let notifId = null; const secs = reminderSeconds(choice);
    if (secs) notifId = await scheduleReminder(it, secs);
    await persist(items.map((x) => (x.id === id ? { ...x, remind: choice, notifId } : x)));
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
            onRemind={(choice) => setItemRemind(selected.id, choice)}
            onDelete={() => { deleteItem(selected.id); setSelectedId(null); }}
          />
        ) : (
          <>
            {tab === 'home' && <HomeTab items={items} filter={filter} setFilter={setFilter} onOpen={openItem} doneCount={doneCount} activeCount={activeCount} />}
            {tab === 'vision' && <VisionTab slots={visionSlots} title={visionTitle} onSetTitle={saveVisionTitle} onFill={fillVisionSlot} onClear={clearVisionSlot} onAdd={addVisionSlot} onRemove={removeVisionSlot} onLabel={setVisionLabel} />}
            {tab === 'notify' && <NotifyTab items={items} onOpen={openItem} />}
            {tab === 'mypage' && <MyPageTab items={items} doneCount={doneCount} name={profileName} onName={saveName} mode={mode} onToggleMode={toggleMode} onOpen={openItem} />}
            <TabBar tab={tab} onTab={setTab} onAdd={() => setSaveOpen(true)} />
          </>
        )}

        <SaveModal visible={saveOpen} onClose={() => setSaveOpen(false)}
          onSave={(title, category, due, imageUri, remind, heat) => { addItem(title, category, due, imageUri, remind, heat); setSaveOpen(false); }} />

        {celebrating && (
          <Animated.View pointerEvents="none" style={[s.celebrate, { opacity: celebAnim }]}>
            <Ionicons name="sparkles" size={64} color={t.gold} />
            <Text style={s.celebrateText}>叶えた！</Text>
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
      {done && <View style={s.tileDone}><Ionicons name="checkmark-circle" size={22} color={t.gold} /></View>}
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
  let visible;
  if (filter === 'done') visible = items.filter((it) => it.doneAt);
  else if (filter === 'serious') visible = items.filter((it) => !it.doneAt && (it.heat || 2) === 3).slice().sort(byHeatThenNew);
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
                <Text style={s.notifySub}>{remindLabel(item.remind)}に思い出します</Text>
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
function MyPageTab({ items, doneCount, name, onName, mode, onToggleMode, onOpen }) {
  const t = useTheme(); const s = useStyles();
  const done = items.filter((it) => it.doneAt);
  const total = items.length;
  const rate = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const seriousDone = done.filter((it) => (it.heat || 2) === 3).length;
  const casualDone = done.filter((it) => (it.heat || 2) === 1).length;
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

/* ---------- 保存シート ---------- */
function SaveModal({ visible, onClose, onSave }) {
  const t = useTheme(); const s = useStyles();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('eat');
  const [due, setDue] = useState('none');
  const [image, setImage] = useState(null);
  const [heat, setHeat] = useState(2);
  const [remind, setRemind] = useState('3days');

  // 熱量を変えると「思い出す（通知）」の既定が出し分けされる
  function chooseHeat(h) { setHeat(h); setRemind(defaultRemindForHeat(h)); }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('写真へのアクセスが許可されていません'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
    if (!res.canceled) setImage(res.assets[0].uri);
  }
  function resetForm() { setTitle(''); setCategory('eat'); setDue('none'); setImage(null); setHeat(2); setRemind('3days'); }
  function handleSave() {
    if (!title.trim()) { Alert.alert('タイトルを入力してください'); return; }
    onSave(title.trim(), category, due, image, remind, heat); resetForm();
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
            <Pressable style={s.photoPick} onPress={pickImage}>
              {image ? <Image source={{ uri: image }} style={s.photoPreview} />
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
            <View style={s.catWrap}>
              {REMIND_OPTIONS.map((r) => (
                <Pressable key={r.key} onPress={() => setRemind(r.key)} style={optChip(remind === r.key, t.accent)}>
                  <Text style={[s.catChipText, remind === r.key && { color: '#fff' }]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={s.saveBtn} onPress={handleSave}><Text style={s.saveBtnText}>保存する</Text></Pressable>
            <Text style={s.saveNote}>{remind === 'none' ? 'ボードに追加します（通知なし）。' : `保存すると、${remindLabel(remind)}そっと思い出させます。`}</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------- 詳細 ---------- */
function DetailScreen({ item, onBack, onDone, onUpdate, onRemind, onDelete }) {
  const t = useTheme(); const s = useStyles();
  const cat = getCategory(item.category);
  const done = !!item.doneAt;
  const due = dueLabel(item.dueTag);
  const heat = item.heat || 2;
  const links = actionLinks(item.category, item.title);
  const [title, setTitle] = useState(item.title);
  const [memo, setMemo] = useState(item.memo || '');
  const [editMode, setEditMode] = useState(false);

  async function testNotify() { await scheduleReminder(item, 10); Alert.alert('テスト通知を予約しました', '約10秒後に通知が届きます。'); }
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
            {item.imageUri && <Pressable onPress={() => onUpdate({ imageUri: null })} style={s.photoActBtn}><Ionicons name="close" size={16} color="#E5484D" /><Text style={[s.photoActText, { color: '#E5484D' }]}>外す</Text></Pressable>}
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
            <View style={s.catWrap}>
              {REMIND_OPTIONS.map((r) => (
                <Pressable key={r.key} onPress={() => onRemind(r.key)} style={optChip((item.remind || 'none') === r.key, t.accent)}>
                  <Text style={[s.catChipText, (item.remind || 'none') === r.key && { color: '#fff' }]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.sectionLabel}>メモ</Text>
            <TextInput style={s.memoInput} value={memo} onChangeText={(v) => { setMemo(v); onUpdate({ memo: v }); }} placeholder="ひとことメモ（任意）" placeholderTextColor={t.sub} multiline />
          </>
        ) : (
          <>
            <View style={s.summaryRow}>
              <View style={[s.pill, { backgroundColor: cat.color }]}><Ionicons name={cat.icon} size={13} color="#fff" /><Text style={s.pillTextOn}>{cat.label}</Text></View>
              <View style={s.pill}><Ionicons name="flame" size={13} color={t.accent} /><Text style={s.pillText}>{heatLabel(heat)}</Text></View>
              {due ? <View style={s.pill}><Ionicons name="time-outline" size={13} color={t.sub} /><Text style={s.pillText}>{due}まで</Text></View> : null}
              <View style={s.pill}><Ionicons name="notifications-outline" size={13} color={t.sub} /><Text style={s.pillText}>{remindLabel(item.remind || 'none')}</Text></View>
            </View>
            {memo ? <Text style={s.memoText}>{memo}</Text> : null}
          </>
        )}

        <Text style={s.sectionLabel}>アクション</Text>
        {links.map((l) => (
          <Pressable key={l.url} style={s.actionBtn} onPress={() => openLink(l.url)}>
            <Text style={s.actionText}>{l.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={t.sub} />
          </Pressable>
        ))}

        {done ? (
          <Pressable style={s.undoneBtn} onPress={() => onUpdate({ doneAt: null })}><Text style={s.undoneText}>未達成に戻す</Text></Pressable>
        ) : (
          <Pressable style={s.doneBtn} onPress={onDone}><Ionicons name="checkmark" size={18} color="#fff" /><Text style={s.doneText}>達成した！</Text></Pressable>
        )}
        {editMode && <Pressable onPress={testNotify}><Text style={s.testNotifyLink}>通知の動作をテスト（10秒後に届きます）</Text></Pressable>}
      </ScrollView>
    </View>
  );
}

/* ---------- スタイル（テーマから生成） ---------- */
function makeStyles(t) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    topbar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    brand: { fontSize: 23, fontWeight: '900', color: t.text, letterSpacing: 0.5 },
    screenTitle: { fontSize: 24, fontWeight: '900', color: t.text, letterSpacing: 0.3 },
    greet: { fontSize: 12.5, color: t.sub, marginTop: 4 },

    chips: { gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.surface, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
    chipActive: { backgroundColor: t.accent },
    chipText: { fontSize: 13, fontWeight: '600', color: t.text },
    chipTextActive: { color: '#fff' },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: t.text, paddingHorizontal: 20, paddingBottom: 10, paddingTop: 8 },
    empty: { textAlign: 'center', color: t.sub, marginTop: 44, paddingHorizontal: 40, lineHeight: 22 },

    visionTitle: { fontSize: 30, fontWeight: '900', color: t.text, letterSpacing: 2, marginTop: 4, padding: 0 },
    visionEmpty: { borderRadius: 20, borderWidth: 1.5, borderColor: t.line, borderStyle: 'dashed', backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', gap: 6 },
    visionEmptyText: { color: t.sub, fontSize: 12, fontWeight: '600' },
    visionAdd: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, marginTop: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: t.surface },
    visionAddText: { color: t.accent, fontSize: 14, fontWeight: '800' },
    visionLabelWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.22)' },
    visionSlotLabel: { color: '#fff', fontSize: 19, fontWeight: '900', letterSpacing: 1, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 8 },

    masonryRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 2 },
    masonryCol: { flex: 1, gap: 12 },
    pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },

    // 写真前面タイル
    tile: { borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: t.surface },
    tileImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    tileShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)', top: '55%' },
    tileTag: { position: 'absolute', left: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
    tileTagText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    tileDone: { position: 'absolute', right: 10, top: 10 },
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

    statCard: { margin: 20, marginTop: 16, backgroundColor: t.surface, borderRadius: 22, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center' },
    statTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    statBlock: { alignItems: 'center', paddingHorizontal: 26 },
    statDivider: { width: 1, height: 46, backgroundColor: t.line },
    statNum: { fontSize: 46, fontWeight: '900', color: t.accent },
    statPct: { fontSize: 24, fontWeight: '900', color: t.accent },
    statLabel: { fontSize: 13, fontWeight: '800', color: t.text, marginTop: 0 },
    graphRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginTop: 20, height: 76 },
    graphCol: { alignItems: 'center', gap: 6 },
    graphBarTrack: { height: 64, justifyContent: 'flex-end' },
    graphBar: { width: 16, borderRadius: 8, backgroundColor: t.accent },
    graphDay: { fontSize: 10, color: t.sub },
    statSub: { fontSize: 12, color: t.sub, marginTop: 14 },

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
    label: { marginTop: 18, marginBottom: 10, fontSize: 13, fontWeight: '700', color: t.text },
    catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
    catChipText: { fontSize: 13, fontWeight: '600', color: t.text },
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
    actionText: { fontSize: 15, fontWeight: '700', color: t.text },
    doneBtn: { marginTop: 16, backgroundColor: t.accent, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    doneText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    undoneBtn: { marginTop: 16, backgroundColor: t.surface, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: t.line },
    undoneText: { color: t.sub, fontSize: 15, fontWeight: '700' },
    testNotifyLink: { textAlign: 'center', color: t.sub, fontSize: 12, marginTop: 18, textDecorationLine: 'underline' },

    celebrate: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: t.mode === 'dark' ? 'rgba(15,17,21,0.7)' : 'rgba(250,247,242,0.7)' },
    celebrateText: { marginTop: 10, fontSize: 26, fontWeight: '900', color: t.accent },
  });
}
