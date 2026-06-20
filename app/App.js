// WannaLog — Phase 0 最小スライス（習慣ループ検証版）+ α
// 保存 → 通知で思い出す → 行動（導線）→ 達成チェック → 叶えたコレクション。
// あえて最小構成。写真・AI・スマート通知は後のフェーズで載せる。

import { useEffect, useRef, useState } from 'react';
import {
  Animated, FlatList, Image, KeyboardAvoidingView, Linking, Modal, Platform,
  Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { colors, CATEGORIES, getCategory, reminderBody } from './theme';
import { actionLinks, dueLabel } from './links';
import { isUrl, fetchOgp, cleanTitle } from './ogp';
import { REMIND_OPTIONS, reminderSeconds, remindLabel } from './notify';

const STORAGE_KEY = 'wannalog_items_v1';

// 通知を前面でも表示する設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 初回起動時に置くサンプル（ボードを寂しくしないため）
const SEED = [
  { id: 's1', title: '一蘭 渋谷店で豚骨ラーメン', category: 'eat', dueTag: 'thisWeek', createdAt: Date.now(), doneAt: null },
  { id: 's2', title: 'モルディブの透明な海', category: 'go', dueTag: 'none', createdAt: Date.now(), doneAt: null },
  { id: 's3', title: 'DUNE PART2をIMAXで観る', category: 'see', dueTag: 'none', createdAt: Date.now(), doneAt: null },
];

async function scheduleReminder(item, seconds) {
  const cat = getCategory(item.category);
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `${cat.emoji} ${item.title}`,
        body: reminderBody(item.category),
        data: { id: item.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
  } catch (e) {
    console.warn('通知の予約に失敗:', e);
    return null;
  }
}

export default function App() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | カテゴリkey | 'done'
  const [screen, setScreen] = useState('home'); // 'home' | 'detail'
  const [selectedId, setSelectedId] = useState(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const celebAnim = useRef(new Animated.Value(0)).current;

  // 起動時：通知許可 → データ読み込み
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') await Notifications.requestPermissionsAsync();

      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(JSON.parse(raw));
      } else {
        setItems(SEED);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      }
    })();
  }, []);

  // 通知タップで該当アイテムを開く
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const id = res.notification.request.content.data?.id;
      if (id) { setSelectedId(id); setScreen('detail'); }
    });
    return () => sub.remove();
  }, []);

  async function persist(next) {
    setItems(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async function addItem(title, category, due, imageUri, sourceUrl, remind) {
    const r = remind || '3days';
    const item = {
      id: String(Date.now()), title, category, dueTag: due || 'none',
      imageUri: imageUri || null,
      sourceUrl: sourceUrl || null,
      remind: r,
      notifId: null,
      createdAt: Date.now(), doneAt: null,
    };
    const secs = reminderSeconds(r);
    if (secs) item.notifId = await scheduleReminder(item, secs);
    await persist([item, ...items]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('保存しました ✨', r === 'none' ? 'ボードに追加しました。' : `${remindLabel(r)}、そっと思い出させます。`);
  }

  function runCelebration() {
    setCelebrating(true);
    celebAnim.setValue(0);
    Animated.sequence([
      Animated.timing(celebAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(celebAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setCelebrating(false));
  }

  async function markDone(id) {
    const next = items.map((it) => (it.id === id ? { ...it, doneAt: Date.now() } : it));
    await persist(next);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    runCelebration();
  }

  async function updateItem(id, patch) {
    await persist(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  // 「思い出す時期」を変更し、通知を取り直す
  async function setItemRemind(id, choice) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    if (it.notifId) { try { await Notifications.cancelScheduledNotificationAsync(it.notifId); } catch (e) {} }
    let notifId = null;
    const secs = reminderSeconds(choice);
    if (secs) notifId = await scheduleReminder(it, secs);
    await persist(items.map((x) => (x.id === id ? { ...x, remind: choice, notifId } : x)));
  }

  async function deleteItem(id) {
    const it = items.find((x) => x.id === id);
    if (it?.notifId) { try { await Notifications.cancelScheduledNotificationAsync(it.notifId); } catch (e) {} }
    await persist(items.filter((x) => x.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const selected = items.find((it) => it.id === selectedId);
  const doneCount = items.filter((it) => it.doneAt).length;
  const activeCount = items.length - doneCount;

  // 達成済みは普段のボードから外し、「叶えた」フィルタでのみ表示
  const visible = filter === 'done'
    ? items.filter((it) => it.doneAt)
    : items.filter((it) => !it.doneAt && (filter === 'all' || it.category === filter));

  if (screen === 'detail' && selected) {
    return (
      <DetailScreen
        key={selected.id}
        item={selected}
        onBack={() => setScreen('home')}
        onDone={() => { markDone(selected.id); setScreen('home'); }}
        onUpdate={(patch) => updateItem(selected.id, patch)}
        onRemind={(choice) => setItemRemind(selected.id, choice)}
        onDelete={() => { deleteItem(selected.id); setScreen('home'); }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {/* ヘッダー */}
      <View style={styles.topbar}>
        <View>
          <Text style={styles.brand}>✨ WannaLog</Text>
          <Text style={styles.greet}>叶えた {doneCount}・のこり {activeCount}</Text>
        </View>
        <Text style={styles.bell}>🔔</Text>
      </View>

      {/* カテゴリフィルタ */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="すべて" active={filter === 'all'} onPress={() => setFilter('all')} />
          {CATEGORIES.map((c) => (
            <Chip key={c.key} label={`${c.emoji} ${c.label}`} active={filter === c.key} onPress={() => setFilter(c.key)} />
          ))}
          <Chip label={`🏆 叶えた ${doneCount}`} active={filter === 'done'} onPress={() => setFilter('done')} />
        </ScrollView>
      </View>

      <Text style={styles.sectionTitle}>
        {filter === 'done' ? '叶えたコレクション 🏆' : '最近追加したもの'}
      </Text>

      <FlatList
        data={visible}
        keyExtractor={(it) => it.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 120, paddingTop: 4 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filter === 'done' ? 'まだ叶えたものはありません。\n小さな一歩から ✨' : '最初の“したい”を、＋から置いてみよう ✨'}
          </Text>
        }
        renderItem={({ item }) => (
          <Card item={item} onPress={() => { setSelectedId(item.id); setScreen('detail'); }} />
        )}
      />

      {/* 保存ボタン */}
      <Pressable style={styles.fab} onPress={() => setSaveOpen(true)}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <SaveModal
        visible={saveOpen}
        onClose={() => setSaveOpen(false)}
        onSave={(title, category, due, imageUri, sourceUrl, remind) => { addItem(title, category, due, imageUri, sourceUrl, remind); setSaveOpen(false); }}
      />

      {/* 達成セレモニー */}
      {celebrating && (
        <Animated.View pointerEvents="none" style={[styles.celebrate, { opacity: celebAnim }]}>
          <Text style={styles.celebrateEmoji}>🎉</Text>
          <Text style={styles.celebrateText}>叶えた！</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Card({ item, onPress }) {
  const cat = getCategory(item.category);
  const done = !!item.doneAt;
  const due = dueLabel(item.dueTag);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardPhotoWrap}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.cardPhotoImg} />
        ) : (
          <View style={[styles.cardPhoto, { backgroundColor: cat.color }]}>
            <Text style={styles.cardEmoji}>{cat.emoji}</Text>
          </View>
        )}
        <View style={styles.cardTag}>
          <Text style={styles.cardTagText}>{cat.label}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {done ? (
          <Text style={styles.cardDone}>叶えた ✓</Text>
        ) : due ? (
          <Text style={styles.cardDue}>⏰ {due}まで</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const DUE_OPTIONS = [
  { key: 'none', label: 'なし' },
  { key: 'thisWeek', label: '今週' },
  { key: 'thisMonth', label: '今月' },
];

function SaveModal({ visible, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('eat');
  const [due, setDue] = useState('none');
  const [image, setImage] = useState(null);
  const [sourceUrl, setSourceUrl] = useState(null);
  const [loadingOgp, setLoadingOgp] = useState(false);
  const [remind, setRemind] = useState('3days');

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('写真へのアクセスが許可されていません'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
    if (!res.canceled) setImage(res.assets[0].uri);
  }

  async function loadFromUrl() {
    const url = title.trim();
    setLoadingOgp(true);
    const ogp = await fetchOgp(url);
    setLoadingOgp(false);
    setSourceUrl(url);
    const good = cleanTitle(ogp.title, url, '');
    if (good) setTitle(good); // 「Google マップ」等の汎用名では上書きしない
    if (ogp.image && !image) setImage(ogp.image);
    if (!good && !ogp.image) Alert.alert('リンク先の情報が取得できませんでした', '店名・品名は手で入力してください。');
  }

  function resetForm() {
    setTitle(''); setCategory('eat'); setDue('none');
    setImage(null); setSourceUrl(null); setRemind('3days');
  }

  function handleSave() {
    if (!title.trim()) { Alert.alert('タイトルを入力してください'); return; }
    onSave(title.trim(), category, due, image, sourceUrl, remind);
    resetForm();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>何を残す？</Text>
            <Pressable onPress={onClose}><Text style={styles.sheetClose}>✕</Text></Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.input}
              placeholder="例：鎌倉の海が見えるカフェ（URLでもOK）"
              placeholderTextColor={colors.warmgray}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            {isUrl(title) && (
              <Pressable style={styles.urlBtn} onPress={loadFromUrl} disabled={loadingOgp}>
                <Text style={styles.urlBtnText}>{loadingOgp ? '読み込み中…' : '🔗 リンク先を読み込む'}</Text>
              </Pressable>
            )}

            <Pressable style={styles.photoPick} onPress={pickImage}>
              {image
                ? <Image source={{ uri: image }} style={styles.photoPreview} />
                : <Text style={styles.photoPickText}>🖼️ 写真を選ぶ（任意・切り取りできます）</Text>}
            </Pressable>
            {image && (
              <Pressable onPress={() => setImage(null)}>
                <Text style={styles.photoRemove}>✕ 写真を外す</Text>
              </Pressable>
            )}

            <Text style={styles.label}>カテゴリ</Text>
            <View style={styles.catWrap}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  style={[styles.catChip, category === c.key && { backgroundColor: c.color, borderColor: c.color }]}
                >
                  <Text style={[styles.catChipText, category === c.key && { color: '#fff' }]}>
                    {c.emoji} {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>いつまでに</Text>
            <View style={styles.catWrap}>
              {DUE_OPTIONS.map((d) => (
                <Pressable
                  key={d.key}
                  onPress={() => setDue(d.key)}
                  style={[styles.catChip, due === d.key && { backgroundColor: colors.coral, borderColor: colors.coral }]}
                >
                  <Text style={[styles.catChipText, due === d.key && { color: '#fff' }]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>思い出す（通知）</Text>
            <View style={styles.catWrap}>
              {REMIND_OPTIONS.map((r) => (
                <Pressable
                  key={r.key}
                  onPress={() => setRemind(r.key)}
                  style={[styles.catChip, remind === r.key && { backgroundColor: colors.coral, borderColor: colors.coral }]}
                >
                  <Text style={[styles.catChipText, remind === r.key && { color: '#fff' }]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>保存する</Text>
            </Pressable>
            <Text style={styles.saveNote}>
              {remind === 'none' ? 'ボードに追加します（通知なし）。' : `保存すると、${remindLabel(remind)}そっと思い出させます。`}
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DetailScreen({ item, onBack, onDone, onUpdate, onRemind, onDelete }) {
  const cat = getCategory(item.category);
  const done = !!item.doneAt;
  const due = dueLabel(item.dueTag);
  const links = [
    ...(item.sourceUrl ? [{ label: '🔗 リンクを開く', url: item.sourceUrl }] : []),
    ...actionLinks(item.category, item.title),
  ];

  const [title, setTitle] = useState(item.title);
  const [memo, setMemo] = useState(item.memo || '');

  async function testNotify() {
    await scheduleReminder(item, 10); // 10秒後にテスト通知
    Alert.alert('テスト通知を予約しました', '約10秒後に通知が届きます。アプリを閉じても届きます。');
  }

  function openLink(url) {
    Linking.openURL(url).catch(() => Alert.alert('リンクを開けませんでした'));
  }

  function confirmDelete() {
    Alert.alert('削除しますか？', 'この「したい」を削除します。元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: onDelete },
    ]);
  }

  async function changePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('写真へのアクセスが許可されていません'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
    if (!res.canceled) onUpdate({ imageUri: res.assets[0].uri });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.detailBar}>
        <Pressable onPress={onBack}><Text style={styles.back}>‹ 戻る</Text></Pressable>
        <Pressable onPress={confirmDelete}><Text style={styles.deleteLink}>🗑 削除</Text></Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.detailPhotoImg} />
        ) : (
          <View style={[styles.detailPhoto, { backgroundColor: cat.color }]}>
            <Text style={styles.detailEmoji}>{cat.emoji}</Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <Pressable onPress={changePhoto}><Text style={styles.photoActionText}>📷 写真を変更</Text></Pressable>
          {item.imageUri && (
            <Pressable onPress={() => onUpdate({ imageUri: null })}>
              <Text style={[styles.photoActionText, { color: '#E53935' }]}>✕ 写真を外す</Text>
            </Pressable>
          )}
        </View>

        <TextInput
          style={styles.detailTitleInput}
          value={title}
          onChangeText={(t) => { setTitle(t); onUpdate({ title: t }); }}
          placeholder="タイトル"
          placeholderTextColor={colors.warmgray}
        />
        <Text style={styles.detailCat}>
          {cat.emoji} {cat.label}{due ? `  ・  ${due}まで` : ''}
        </Text>

        {/* 編集：カテゴリ */}
        <Text style={styles.actionHeader}>カテゴリ</Text>
        <View style={styles.catWrap}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => onUpdate({ category: c.key })}
              style={[styles.catChip, item.category === c.key && { backgroundColor: c.color, borderColor: c.color }]}
            >
              <Text style={[styles.catChipText, item.category === c.key && { color: '#fff' }]}>{c.emoji} {c.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* 編集：期限 */}
        <Text style={styles.actionHeader}>いつまでに</Text>
        <View style={styles.catWrap}>
          {DUE_OPTIONS.map((d) => (
            <Pressable
              key={d.key}
              onPress={() => onUpdate({ dueTag: d.key })}
              style={[styles.catChip, item.dueTag === d.key && { backgroundColor: colors.coral, borderColor: colors.coral }]}
            >
              <Text style={[styles.catChipText, item.dueTag === d.key && { color: '#fff' }]}>{d.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* 編集：思い出す（通知） */}
        <Text style={styles.actionHeader}>思い出す（通知）</Text>
        <View style={styles.catWrap}>
          {REMIND_OPTIONS.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => onRemind(r.key)}
              style={[styles.catChip, (item.remind || 'none') === r.key && { backgroundColor: colors.coral, borderColor: colors.coral }]}
            >
              <Text style={[styles.catChipText, (item.remind || 'none') === r.key && { color: '#fff' }]}>{r.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* 編集：メモ */}
        <Text style={styles.actionHeader}>メモ</Text>
        <TextInput
          style={styles.memoInput}
          value={memo}
          onChangeText={(t) => { setMemo(t); onUpdate({ memo: t }); }}
          placeholder="ひとことメモ（任意）"
          placeholderTextColor={colors.warmgray}
          multiline
        />

        {/* アクション（カテゴリ別の行動導線） */}
        <Text style={styles.actionHeader}>アクション</Text>
        {links.map((l) => (
          <Pressable key={l.url} style={styles.actionBtn} onPress={() => openLink(l.url)}>
            <Text style={styles.actionText}>{l.label}</Text>
            <Text style={styles.actionArrow}>›</Text>
          </Pressable>
        ))}
        {done ? (
          <Pressable style={styles.undoneBtn} onPress={() => onUpdate({ doneAt: null })}>
            <Text style={styles.undoneText}>↩︎ 未達成に戻す</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.doneBtn} onPress={onDone}>
            <Text style={styles.doneText}>✅ 達成した！</Text>
          </Pressable>
        )}

        <Pressable onPress={testNotify}>
          <Text style={styles.testNotifyLink}>🔔 通知の動作をテスト（10秒後に届きます）</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  brand: { fontSize: 22, fontWeight: '800', color: colors.charcoal },
  greet: { fontSize: 12, color: colors.warmgray, marginTop: 3 },
  bell: { fontSize: 20 },

  chips: { gap: 8, paddingHorizontal: 20, paddingBottom: 14 },
  chip: { backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  chipActive: { backgroundColor: colors.charcoal },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.charcoal },
  chipTextActive: { color: '#fff' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.charcoal, paddingHorizontal: 20, paddingBottom: 10 },
  empty: { textAlign: 'center', color: colors.warmgray, marginTop: 40, paddingHorizontal: 40, lineHeight: 22 },

  card: { flex: 1, backgroundColor: colors.white, borderRadius: 18, overflow: 'hidden' },
  cardPhotoWrap: { height: 120 },
  cardPhoto: { height: 120, alignItems: 'center', justifyContent: 'center' },
  cardPhotoImg: { width: '100%', height: 120 },
  cardEmoji: { fontSize: 42 },
  cardTag: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  cardTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardMeta: { padding: 11 },
  cardTitle: { fontSize: 13.5, fontWeight: '700', color: colors.charcoal, lineHeight: 19 },
  cardDue: { marginTop: 6, fontSize: 11.5, color: colors.coral, fontWeight: '700' },
  cardDone: { marginTop: 6, fontSize: 11.5, color: colors.honey, fontWeight: '800' },

  fab: { position: 'absolute', right: 22, bottom: 34, width: 62, height: 62, borderRadius: 31, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', shadowColor: colors.coral, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '300', marginTop: -2 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 30, maxHeight: '88%' },
  photoRemove: { textAlign: 'center', color: '#E53935', fontSize: 12, fontWeight: '700', marginTop: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.charcoal },
  sheetClose: { fontSize: 18, color: colors.warmgray },
  input: { backgroundColor: colors.white, borderRadius: 14, padding: 14, fontSize: 16, color: colors.charcoal },
  urlBtn: { marginTop: 10, backgroundColor: colors.white, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: colors.coral },
  urlBtnText: { color: colors.coral, fontSize: 14, fontWeight: '700' },
  photoPick: { marginTop: 12, height: 120, borderRadius: 14, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoPickText: { color: colors.warmgray, fontSize: 13, fontWeight: '600' },
  photoPreview: { width: '100%', height: '100%' },
  label: { marginTop: 18, marginBottom: 10, fontSize: 13, fontWeight: '700', color: colors.charcoal },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  catChipText: { fontSize: 13, fontWeight: '600', color: colors.charcoal },
  saveBtn: { marginTop: 22, backgroundColor: colors.coral, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  saveNote: { textAlign: 'center', color: colors.warmgray, fontSize: 12, marginTop: 10 },

  detailBar: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { fontSize: 16, color: colors.charcoal },
  deleteLink: { fontSize: 14, color: '#E53935', fontWeight: '700' },
  detailTitleInput: { fontSize: 22, fontWeight: '800', color: colors.charcoal, marginTop: 16, paddingVertical: 2 },
  memoInput: { backgroundColor: colors.white, borderRadius: 14, padding: 14, fontSize: 15, color: colors.charcoal, minHeight: 80, textAlignVertical: 'top' },
  detailPhoto: { height: 220, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  detailPhotoImg: { width: '100%', height: 220, borderRadius: 20 },
  detailEmoji: { fontSize: 72 },
  detailTitle: { fontSize: 22, fontWeight: '800', color: colors.charcoal, marginTop: 16 },
  detailCat: { fontSize: 14, color: colors.warmgray, marginTop: 6 },
  actionHeader: { marginTop: 24, marginBottom: 10, fontSize: 13, fontWeight: '800', color: colors.charcoal },
  actionBtn: { marginBottom: 10, backgroundColor: colors.white, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionText: { fontSize: 15, fontWeight: '700', color: colors.charcoal },
  actionArrow: { fontSize: 20, color: colors.warmgray },
  doneBtn: { marginTop: 14, backgroundColor: colors.coral, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  doneText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  undoneBtn: { marginTop: 14, backgroundColor: colors.white, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  undoneText: { color: colors.warmgray, fontSize: 15, fontWeight: '700' },
  photoActions: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 10 },
  photoActionText: { color: colors.coral, fontSize: 13, fontWeight: '700' },
  testNotifyLink: { textAlign: 'center', color: colors.warmgray, fontSize: 12, marginTop: 16, textDecorationLine: 'underline' },

  celebrate: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(250,247,242,0.6)' },
  celebrateEmoji: { fontSize: 80 },
  celebrateText: { marginTop: 8, fontSize: 26, fontWeight: '800', color: colors.coral },
});
