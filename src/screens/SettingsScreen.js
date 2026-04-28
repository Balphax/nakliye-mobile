import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { settingsAPI, authAPI } from '../services/api';

const SOUNDS = [
  { id: 'double_beep', icon: '🔔', name: 'Çift Bip', desc: 'Varsayılan' },
  { id: 'long_beep', icon: '📢', name: 'Uzun Bip', desc: 'Gece için' },
  { id: 'triple_beep', icon: '🚨', name: 'Üçlü Alarm', desc: 'Dikkat çekici' },
  { id: 'soft_chime', icon: '🎵', name: 'Yumuşak Çan', desc: 'Gündüz için' },
  { id: 'truck_horn', icon: '🚛', name: 'Kamyon Korna', desc: 'En güçlü' },
];

export default function SettingsScreen({ navigation, user }) {
  const [settings, setSettings] = useState({
    keywords: ['Kocaeli'],
    soundEnabled: true,
    ttsEnabled: false,
    selectedSound: 'double_beep',
    timeBased: false,
    dayStart: '07:00',
    nightStart: '22:00',
    daySound: 'soft_chime',
    nightSound: 'long_beep',
  });
  const [kwInput, setKwInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const res = await settingsAPI.get();
      setSettings(res.data);
    } catch(e) {}
  }

  async function save(newSettings) {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    try {
      await settingsAPI.save(merged);
    } catch(e) {}
  }

  function addKeyword() {
    const val = kwInput.trim();
    if (!val || settings.keywords.includes(val)) return;
    save({ keywords: [...settings.keywords, val] });
    setKwInput('');
  }

  function removeKeyword(kw) {
    save({ keywords: settings.keywords.filter(k => k !== kw) });
  }

  async function logout() {
    Alert.alert('Çıkış Yap', 'Çıkmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: async () => {
        await authAPI.logout();
        navigation.replace('Login');
      }}
    ]);
  }

  const sub = user?.subscription;
  const daysLeft = sub?.status === 'trial'
    ? Math.max(0, Math.ceil((new Date(sub.trialEnds) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>

      {/* Abonelik */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>💳 ABONELİK</Text>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{user?.name}</Text>
            <Text style={s.sub}>
              {sub?.status === 'trial' ? `Deneme — ${daysLeft} gün kaldı` :
               sub?.status === 'active' ? 'Aktif abonelik' : 'Abonelik süresi doldu'}
            </Text>
          </View>
          <View style={[s.badge,
            sub?.status === 'active' ? s.badgeActive :
            sub?.status === 'expired' ? s.badgeExpired : s.badgeTrial]}>
            <Text style={[s.badgeText,
              sub?.status === 'active' ? s.badgeTextActive :
              sub?.status === 'expired' ? s.badgeTextExpired : s.badgeTextTrial]}>
              {sub?.status === 'trial' ? 'DENEME' : sub?.status === 'active' ? 'AKTİF' : 'SÜRESI DOLDU'}
            </Text>
          </View>
        </View>
      </View>

      {/* Filtre kelimeleri */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>🎯 FİLTRE KELİMELERİ</Text>
        <View style={s.chipsWrap}>
          {settings.keywords.map(kw => (
            <View key={kw} style={s.chip}>
              <Text style={s.chipText}>{kw}</Text>
              <TouchableOpacity onPress={() => removeKeyword(kw)} style={s.chipRemove}>
                <Text style={s.chipRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={s.kwRow}>
          <TextInput
            style={s.kwInput}
            placeholder="Şehir veya kelime ekle..."
            placeholderTextColor="#64748b"
            value={kwInput}
            onChangeText={setKwInput}
            onSubmitEditing={addKeyword}
            maxLength={30}
          />
          <TouchableOpacity style={s.addBtn} onPress={addKeyword}>
            <Text style={s.addBtnText}>+ Ekle</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ses ayarları */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>🔔 BİLDİRİM SESİ</Text>
        <View style={s.row}>
          <View><Text style={s.label}>Ses Aktif</Text><Text style={s.sub}>Yeni mesajda ses çalsın</Text></View>
          <Switch value={settings.soundEnabled} onValueChange={v => save({ soundEnabled: v })} trackColor={{ true: '#f59e0b' }} thumbColor="#fff"/>
        </View>
        {SOUNDS.map(sound => (
          <TouchableOpacity key={sound.id} style={[s.soundOption, settings.selectedSound === sound.id && s.soundOptionSelected]}
            onPress={() => save({ selectedSound: sound.id })}>
            <View style={s.soundLeft}>
              <Text style={s.soundIcon}>{sound.icon}</Text>
              <View>
                <Text style={s.soundName}>{sound.name}</Text>
                <Text style={s.soundDesc}>{sound.desc}</Text>
              </View>
            </View>
            {settings.selectedSound === sound.id && <Text style={s.checkmark}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Saat bazlı ses */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>🌙 SAAT BAZLI SES</Text>
        <View style={s.row}>
          <View><Text style={s.label}>Saat Bazlı Ses</Text><Text style={s.sub}>Gece/gündüz farklı ses</Text></View>
          <Switch value={settings.timeBased} onValueChange={v => save({ timeBased: v })} trackColor={{ true: '#f59e0b' }} thumbColor="#fff"/>
        </View>
        {settings.timeBased && (
          <View style={s.timeWrap}>
            <Text style={s.timeInfo}>☀️ Gündüz saatleri arası gündüz sesi, dışında gece sesi çalar.</Text>
            <View style={s.timeRow}>
              <Text style={s.timeLabel}>☀️ Gündüz</Text>
              <TextInput style={s.timeInput} value={settings.dayStart} onChangeText={v => save({ dayStart: v })} placeholder="07:00" placeholderTextColor="#64748b"/>
            </View>
            <View style={s.timeRow}>
              <Text style={s.timeLabel}>🌙 Gece</Text>
              <TextInput style={s.timeInput} value={settings.nightStart} onChangeText={v => save({ nightStart: v })} placeholder="22:00" placeholderTextColor="#64748b"/>
            </View>
          </View>
        )}
      </View>

      {/* Sesli okuma */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>🔊 SESLİ OKUMA</Text>
        <View style={s.row}>
          <View><Text style={s.label}>Sesli Okuma (TTS)</Text><Text style={s.sub}>Mesajı otomatik sesli oku</Text></View>
          <Switch value={settings.ttsEnabled} onValueChange={v => save({ ttsEnabled: v })} trackColor={{ true: '#f59e0b' }} thumbColor="#fff"/>
        </View>
      </View>

      {/* Çıkış */}
      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1e' },
  scroll: { padding: 14, gap: 14, paddingBottom: 40 },
  section: { backgroundColor: '#1a2235', borderRadius: 14, borderWidth: 1, borderColor: '#243049', overflow: 'hidden' },
  sectionTitle: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, padding: 10, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#243049', backgroundColor: '#111827' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, borderBottomWidth: 1, borderBottomColor: '#243049' },
  label: { color: '#f1f5f9', fontSize: 14, fontWeight: '500' },
  sub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  badgeTrial: { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' },
  badgeActive: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)' },
  badgeExpired: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextTrial: { color: '#f59e0b' },
  badgeTextActive: { color: '#10b981' },
  badgeTextExpired: { color: '#fca5a5' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 13 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  chipRemove: { padding: 2 },
  chipRemoveText: { color: '#f59e0b', fontSize: 13 },
  kwRow: { flexDirection: 'row', gap: 8, padding: 13, paddingTop: 0 },
  kwInput: { flex: 1, backgroundColor: '#111827', borderWidth: 1, borderColor: '#243049', borderRadius: 9, padding: 10, fontSize: 14, color: '#f1f5f9' },
  addBtn: { backgroundColor: '#f59e0b', borderRadius: 9, padding: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  soundOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#243049' },
  soundOptionSelected: { backgroundColor: 'rgba(245,158,11,0.08)' },
  soundLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  soundIcon: { fontSize: 20 },
  soundName: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  soundDesc: { color: '#64748b', fontSize: 11 },
  checkmark: { color: '#f59e0b', fontSize: 18, fontWeight: '700' },
  timeWrap: { padding: 13, gap: 10 },
  timeInfo: { color: '#64748b', fontSize: 12, backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)', borderRadius: 8, padding: 9, lineHeight: 18 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeLabel: { color: '#64748b', fontSize: 13, width: 70 },
  timeInput: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#243049', borderRadius: 8, padding: 8, fontSize: 15, color: '#f1f5f9', width: 90, textAlign: 'center' },
  logoutBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
