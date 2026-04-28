import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { waAPI } from '../services/api';
import io from 'socket.io-client';
import { API_URL } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ConnectScreen({ userId }) {
  const [method, setMethod] = useState('qr');
  const [qrData, setQrData] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [statusMsg, setStatusMsg] = useState('Bağlanıyor...');
  const [pairingPhone, setPairingPhone] = useState('');
  const [pairingCode, setPairingCode] = useState(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    setupSocket();
    startConnection();
    return () => socketRef.current?.disconnect();
  }, []);

  async function setupSocket() {
    const cookie = await AsyncStorage.getItem('session_cookie');
    const socket = io(API_URL, {
      extraHeaders: cookie ? { Cookie: cookie } : {},
      transports: ['websocket'],
    });
    socketRef.current = socket;
    socket.emit('auth', userId);
    socket.on('wa_qr', (qr) => setQrData(qr));
    socket.on('wa_status', ({ status, message }) => {
      setStatus(status);
      setStatusMsg(message);
      if (status === 'connected') setQrData(null);
    });
  }

  async function startConnection() {
    try { await waAPI.connect(); } catch(e) {}
  }

  async function requestPairing() {
    if (!pairingPhone) return Alert.alert('Hata', 'Telefon numarası girin');
    setPairingLoading(true);
    try {
      const res = await waAPI.pairing(pairingPhone);
      if (res.data.success) {
        setPairingCode(res.data.code);
      } else {
        Alert.alert('Hata', res.data.error || 'Kod alınamadı');
      }
    } catch(e) {
      Alert.alert('Hata', 'Bağlantı hatası');
    }
    setPairingLoading(false);
  }

  const isConnected = status === 'connected';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>

      {/* Durum */}
      <View style={[s.statusBar, isConnected && s.statusBarConnected]}>
        <View style={[s.statusDot, isConnected && s.statusDotConnected]}/>
        <Text style={[s.statusText, isConnected && s.statusTextConnected]}>
          {isConnected ? '✓ WhatsApp Bağlı' : statusMsg}
        </Text>
      </View>

      {isConnected ? (
        <View style={s.connectedBox}>
          <Text style={s.connectedIcon}>✅</Text>
          <Text style={s.connectedTitle}>WhatsApp Bağlandı!</Text>
          <Text style={s.connectedDesc}>Mesajlar artık otomatik olarak filtrelenecek ve bildirim alacaksınız.</Text>
        </View>
      ) : (
        <>
          {/* Yöntem seçimi */}
          <View style={s.methodTabs}>
            <TouchableOpacity style={[s.methodTab, method === 'qr' && s.methodTabActive]} onPress={() => setMethod('qr')}>
              <Text style={[s.methodTabText, method === 'qr' && s.methodTabTextActive]}>📱 QR Kod</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.methodTab, method === 'phone' && s.methodTabActive]} onPress={() => setMethod('phone')}>
              <Text style={[s.methodTabText, method === 'phone' && s.methodTabTextActive]}>📞 Telefon Kodu</Text>
            </TouchableOpacity>
          </View>

          {method === 'qr' ? (
            <View style={s.qrSection}>
              <View style={s.qrBox}>
                {qrData ? (
                  <Image source={{ uri: qrData }} style={s.qrImage} resizeMode="contain"/>
                ) : (
                  <View style={s.qrPlaceholder}>
                    <ActivityIndicator color="#9ca3af" size="large"/>
                    <Text style={s.qrPlaceholderText}>QR hazırlanıyor...</Text>
                  </View>
                )}
              </View>
              <View style={s.steps}>
                {[
                  ['1', 'WhatsApp\'ı açın'],
                  ['2', '⋮ → Bağlı Cihazlar → Cihaz Bağla'],
                  ['3', 'Yukarıdaki QR kodu okutun'],
                ].map(([num, text]) => (
                  <View key={num} style={s.step}>
                    <View style={s.stepNum}><Text style={s.stepNumText}>{num}</Text></View>
                    <Text style={s.stepText}>{text}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={s.pairingSection}>
              <View style={s.steps}>
                {[
                  ['1', 'Aşağıya WhatsApp numaranızı girin'],
                  ['2', 'WhatsApp\'ta Bağlı Cihazlar → Telefon Numarasıyla Bağla'],
                  ['3', 'Gelen 8 haneli kodu WhatsApp\'a girin'],
                ].map(([num, text]) => (
                  <View key={num} style={s.step}>
                    <View style={s.stepNum}><Text style={s.stepNumText}>{num}</Text></View>
                    <Text style={s.stepText}>{text}</Text>
                  </View>
                ))}
              </View>
              <TextInput
                style={s.pairingInput}
                placeholder="05XX XXX XX XX"
                placeholderTextColor="#64748b"
                value={pairingPhone}
                onChangeText={setPairingPhone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={s.btn} onPress={requestPairing} disabled={pairingLoading}>
                {pairingLoading ? <ActivityIndicator color="#000"/> : <Text style={s.btnText}>KOD İSTE</Text>}
              </TouchableOpacity>
              {pairingCode && (
                <View style={s.codeBox}>
                  <Text style={s.codeLabel}>WhatsApp'a gireceğiniz kod:</Text>
                  <Text style={s.codeText}>{pairingCode}</Text>
                  <Text style={s.codeDesc}>Bu kodu WhatsApp'ta "Telefon Numarasıyla Bağla" ekranına girin.</Text>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1e' },
  scroll: { padding: 16, gap: 16, alignItems: 'center' },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1a2235', borderWidth: 1, borderColor: '#243049', borderRadius: 12, padding: 12, width: '100%' },
  statusBarConnected: { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)' },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#64748b' },
  statusDotConnected: { backgroundColor: '#10b981', shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 4 },
  statusText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  statusTextConnected: { color: '#10b981' },
  connectedBox: { alignItems: 'center', padding: 30, gap: 12 },
  connectedIcon: { fontSize: 64 },
  connectedTitle: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  connectedDesc: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  methodTabs: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 10, padding: 3, width: '100%', gap: 3 },
  methodTab: { flex: 1, padding: 9, borderRadius: 8, alignItems: 'center' },
  methodTabActive: { backgroundColor: '#f59e0b' },
  methodTabText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
  methodTabTextActive: { color: '#000' },
  qrSection: { alignItems: 'center', gap: 16, width: '100%' },
  qrBox: { backgroundColor: '#fff', borderRadius: 16, padding: 14, width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  qrImage: { width: 192, height: 192 },
  qrPlaceholder: { alignItems: 'center', gap: 10 },
  qrPlaceholderText: { color: '#9ca3af', fontSize: 13 },
  pairingSection: { width: '100%', gap: 14 },
  steps: { backgroundColor: '#1a2235', borderRadius: 14, borderWidth: 1, borderColor: '#243049', padding: 14, gap: 0, width: '100%' },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#243049' },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText: { color: '#000', fontSize: 12, fontWeight: '800' },
  stepText: { color: '#94a3b8', fontSize: 13, lineHeight: 20, flex: 1, paddingTop: 2 },
  pairingInput: { backgroundColor: '#1a2235', borderWidth: 1, borderColor: '#243049', borderRadius: 10, padding: 14, fontSize: 18, color: '#f1f5f9', textAlign: 'center', letterSpacing: 2, width: '100%' },
  btn: { backgroundColor: '#f59e0b', borderRadius: 10, padding: 14, alignItems: 'center', width: '100%' },
  btnText: { color: '#000', fontWeight: '700', fontSize: 16, letterSpacing: 1 },
  codeBox: { backgroundColor: '#1a2235', borderWidth: 2, borderColor: '#f59e0b', borderRadius: 14, padding: 20, alignItems: 'center', gap: 8, width: '100%' },
  codeLabel: { color: '#64748b', fontSize: 13 },
  codeText: { color: '#f59e0b', fontSize: 38, fontWeight: '800', letterSpacing: 8, fontFamily: 'monospace' },
  codeDesc: { color: '#64748b', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
