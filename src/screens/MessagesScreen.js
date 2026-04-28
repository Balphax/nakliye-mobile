import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Linking, Alert, Animated, RefreshControl } from 'react-native';
import { messagesAPI, settingsAPI } from '../services/api';
import { playNotificationSound } from '../services/notifications';
import io from 'socket.io-client';
import { API_URL } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MessagesScreen({ userId }) {
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState({ keywords: [], soundEnabled: true, ttsEnabled: false, selectedSound: 'double_beep', timeBased: false, dayStart: '07:00', nightStart: '22:00', daySound: 'soft_chime', nightSound: 'long_beep' });
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    loadData();
    setupSocket();
    return () => socketRef.current?.disconnect();
  }, []);

  async function loadData() {
    try {
      const [msgRes, settRes] = await Promise.all([messagesAPI.getAll(), settingsAPI.get()]);
      setMessages(msgRes.data);
      setSettings(settRes.data);
    } catch(e) {}
  }

  async function setupSocket() {
    const cookie = await AsyncStorage.getItem('session_cookie');
    const socket = io(API_URL, {
      extraHeaders: cookie ? { Cookie: cookie } : {},
      transports: ['websocket'],
    });
    socketRef.current = socket;
    socket.emit('auth', userId);
    socket.on('new_message', (msg) => {
      setMessages(prev => [msg, ...prev]);
      if (settings.soundEnabled) playNotificationSound(getCurrentSound());
    });
    socket.on('messages_cleared', () => setMessages([]));
    socket.on('settings_updated', (s) => setSettings(s));
  }

  function getCurrentSound() {
    if (settings.timeBased) {
      const now = new Date();
      const m = now.getHours() * 60 + now.getMinutes();
      const [dh, dm] = (settings.dayStart || '07:00').split(':').map(Number);
      const [nh, nm] = (settings.nightStart || '22:00').split(':').map(Number);
      return (m >= dh * 60 + dm && m < nh * 60 + nm) ? settings.daySound : settings.nightSound;
    }
    return settings.selectedSound || 'double_beep';
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function markRead(id) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
    messagesAPI.markRead(id);
  }

  function callPhone(phone) {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('90')) clean = '+' + clean;
    else if (clean.startsWith('0')) clean = '+9' + clean;
    else clean = '+90' + clean;
    Linking.openURL(`tel:${clean}`);
  }

  function formatPhone(num) {
    const n = num.replace(/\D/g, '').replace(/^90/, '0').replace(/^9/, '0');
    if (n.length === 11) return `${n.slice(0,4)} ${n.slice(4,7)} ${n.slice(7,9)} ${n.slice(9)}`;
    return n;
  }

  async function clearAll() {
    Alert.alert('Mesajları Temizle', 'Tüm mesajlar silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await messagesAPI.clear();
        setMessages([]);
      }}
    ]);
  }

  function highlightKeywords(text) {
    if (!text || !settings.keywords?.length) return <Text style={s.msgBody}>{text}</Text>;
    const parts = [];
    let remaining = text;
    let key = 0;
    settings.keywords.forEach(kw => {
      const regex = new RegExp(`(${kw})`, 'gi');
      remaining = remaining.replace(regex, `|||HL:${kw}|||`);
    });
    const split = remaining.split('|||');
    split.forEach(part => {
      if (part.startsWith('HL:')) {
        parts.push(<Text key={key++} style={s.highlight}>{part.slice(3)}</Text>);
      } else {
        parts.push(<Text key={key++}>{part}</Text>);
      }
    });
    return <Text style={s.msgBody}>{parts}</Text>;
  }

  const unread = messages.filter(m => !m.read).length;

  function renderMessage({ item: msg }) {
    const isExpanded = expandedIds.has(msg.id);
    const isLong = msg.body?.length > 200;
    const time = new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const date = new Date(msg.timestamp).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

    return (
      <TouchableOpacity style={[s.msgCard, !msg.read && s.msgUnread]} onPress={() => markRead(msg.id)} activeOpacity={0.8}>
        <View style={s.msgHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.msgSender}>{msg.sender}</Text>
            {msg.group ? <Text style={s.msgGroup}>📱 {msg.group}</Text> : null}
          </View>
          <Text style={s.msgTime}>{date} {time}</Text>
        </View>

        <View style={s.keywordTag}><Text style={s.keywordText}>🏷 {msg.keyword}</Text></View>

        <Text style={[s.msgBody, isLong && !isExpanded && s.msgBodyShort]} numberOfLines={isLong && !isExpanded ? 4 : undefined}>
          {highlightKeywords(msg.body)}
        </Text>

        {isLong && (
          <TouchableOpacity onPress={() => toggleExpand(msg.id)} style={s.expandBtn}>
            <Text style={s.expandText}>{isExpanded ? '▲ Kapat' : '▼ Devamını gör'}</Text>
          </TouchableOpacity>
        )}

        {msg.phones?.length > 0 && (
          <View style={s.phonesRow}>
            {msg.phones.map((phone, i) => (
              <TouchableOpacity key={i} style={s.phoneChip} onPress={() => callPhone(phone)}>
                <Text style={s.phoneIcon}>📞</Text>
                <View>
                  <Text style={s.phoneLabel}>TIKLA & ARA</Text>
                  <Text style={s.phoneNum}>{formatPhone(phone)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.toolbar}>
        <Text style={s.count}>{messages.length} mesaj {unread > 0 ? `· ${unread} yeni` : ''}</Text>
        <TouchableOpacity onPress={clearAll}><Text style={s.clearBtn}>Temizle</Text></TouchableOpacity>
      </View>
      <FlatList
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b"/>}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📡</Text>
            <Text style={s.emptyTitle}>Henüz mesaj yok</Text>
            <Text style={s.emptyDesc}>WhatsApp bağlandıktan sonra{'\n'}filtrelenen mesajlar burada görünür</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1e' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#243049', backgroundColor: '#111827' },
  count: { color: '#64748b', fontSize: 12 },
  clearBtn: { color: '#ef4444', fontSize: 12, fontWeight: '700', borderWidth: 1, borderColor: '#ef4444', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 },
  list: { padding: 10, gap: 10 },
  msgCard: { backgroundColor: '#1a2235', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#243049' },
  msgUnread: { borderColor: '#f59e0b', shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  msgHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  msgSender: { color: '#f1f5f9', fontWeight: '700', fontSize: 16 },
  msgGroup: { color: '#64748b', fontSize: 11, marginTop: 2 },
  msgTime: { color: '#64748b', fontSize: 11 },
  keywordTag: { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 8 },
  keywordText: { color: '#f59e0b', fontSize: 11, fontWeight: '700' },
  msgBody: { color: '#cbd5e1', fontSize: 14, lineHeight: 22 },
  msgBodyShort: { maxHeight: 88, overflow: 'hidden' },
  highlight: { color: '#f59e0b', fontWeight: '700', backgroundColor: 'rgba(245,158,11,0.1)' },
  expandBtn: { paddingVertical: 6 },
  expandText: { color: '#f59e0b', fontSize: 13, fontWeight: '600' },
  phonesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#243049' },
  phoneChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', borderRadius: 12, padding: 10, paddingHorizontal: 14, flex: 1, minWidth: 150 },
  phoneIcon: { fontSize: 20 },
  phoneLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  phoneNum: { color: '#10b981', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48, opacity: 0.4 },
  emptyTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  emptyDesc: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
