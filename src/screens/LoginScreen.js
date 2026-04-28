import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { authAPI } from '../services/api';
import { registerFCMToken } from '../services/notifications';

export default function LoginScreen({ navigation }) {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState({ contact: '', password: '' });
  const [register, setRegister] = useState({ name: '', phone: '', email: '', password: '' });

  async function handleLogin() {
    if (!login.contact || !login.password) return Alert.alert('Hata', 'Tüm alanları doldurun');
    setLoading(true);
    try {
      const res = await authAPI.login(login.contact, login.password);
      await registerFCMToken();
      navigation.replace('App');
    } catch(e) {
      Alert.alert('Hata', e.response?.data?.error || 'Giriş başarısız');
    }
    setLoading(false);
  }

  async function handleRegister() {
    if (!register.name) return Alert.alert('Hata', 'Ad soyad zorunlu');
    if (!register.phone && !register.email) return Alert.alert('Hata', 'Telefon veya e-posta girin');
    if (!register.password || register.password.length < 6) return Alert.alert('Hata', 'Şifre en az 6 karakter olmalı');
    setLoading(true);
    try {
      await authAPI.register({
        name: register.name,
        phone: register.phone || undefined,
        email: register.email || undefined,
        password: register.password,
      });
      await registerFCMToken();
      navigation.replace('App');
    } catch(e) {
      Alert.alert('Hata', e.response?.data?.error || 'Kayıt başarısız');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>NAKLİYE<Text style={s.logoSub}>Bot</Text></Text>
        <Text style={s.tagline}>WhatsApp Nakliye Mesaj Filtresi</Text>

        <View style={s.card}>
          {/* Tab */}
          <View style={s.tabs}>
            <TouchableOpacity style={[s.tab, tab === 'login' && s.tabActive]} onPress={() => setTab('login')}>
              <Text style={[s.tabText, tab === 'login' && s.tabTextActive]}>Giriş Yap</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tab, tab === 'register' && s.tabActive]} onPress={() => setTab('register')}>
              <Text style={[s.tabText, tab === 'register' && s.tabTextActive]}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>

          {tab === 'login' ? (
            <View style={s.form}>
              <Text style={s.label}>TELEFON VEYA E-POSTA</Text>
              <TextInput style={s.input} placeholder="05XX veya email@..." placeholderTextColor="#64748b"
                value={login.contact} onChangeText={v => setLogin({...login, contact: v})}
                autoCapitalize="none" keyboardType="email-address"/>
              <Text style={s.label}>ŞİFRE</Text>
              <TextInput style={s.input} placeholder="Şifreniz" placeholderTextColor="#64748b"
                value={login.password} onChangeText={v => setLogin({...login, password: v})}
                secureTextEntry onSubmitEditing={handleLogin}/>
              <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#000"/> : <Text style={s.btnText}>GİRİŞ YAP</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.form}>
              <View style={s.trialBadge}><Text style={s.trialText}>🎉 30 gün ücretsiz deneme</Text></View>
              <Text style={s.label}>AD SOYAD</Text>
              <TextInput style={s.input} placeholder="Adınız Soyadınız" placeholderTextColor="#64748b"
                value={register.name} onChangeText={v => setRegister({...register, name: v})}/>
              <Text style={s.label}>TELEFON</Text>
              <TextInput style={s.input} placeholder="05XX XXX XX XX" placeholderTextColor="#64748b"
                value={register.phone} onChangeText={v => setRegister({...register, phone: v})}
                keyboardType="phone-pad"/>
              <Text style={s.dividerText}>— veya —</Text>
              <Text style={s.label}>E-POSTA</Text>
              <TextInput style={s.input} placeholder="email@example.com" placeholderTextColor="#64748b"
                value={register.email} onChangeText={v => setRegister({...register, email: v})}
                autoCapitalize="none" keyboardType="email-address"/>
              <Text style={s.label}>ŞİFRE</Text>
              <TextInput style={s.input} placeholder="En az 6 karakter" placeholderTextColor="#64748b"
                value={register.password} onChangeText={v => setRegister({...register, password: v})}
                secureTextEntry onSubmitEditing={handleRegister}/>
              <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#000"/> : <Text style={s.btnText}>ÜCRETSİZ BAŞLA</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1e' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  logo: { fontFamily: 'System', fontWeight: '900', fontSize: 36, color: '#f59e0b', letterSpacing: 2 },
  logoSub: { color: '#f1f5f9', fontWeight: '400' },
  tagline: { color: '#64748b', fontSize: 13, marginBottom: 28, marginTop: 4 },
  card: { backgroundColor: '#1a2235', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, borderWidth: 1, borderColor: '#243049' },
  tabs: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 10, padding: 3, marginBottom: 20, gap: 3 },
  tab: { flex: 1, padding: 9, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#f59e0b' },
  tabText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#000' },
  form: { gap: 10 },
  label: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  input: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#243049', borderRadius: 10, padding: 12, fontSize: 15, color: '#f1f5f9' },
  btn: { backgroundColor: '#f59e0b', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 6 },
  btnText: { color: '#000', fontWeight: '700', fontSize: 16, letterSpacing: 1 },
  trialBadge: { backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: 8, padding: 10 },
  trialText: { color: '#f59e0b', fontSize: 13, textAlign: 'center' },
  dividerText: { color: '#64748b', fontSize: 12, textAlign: 'center', marginVertical: 4 },
});
