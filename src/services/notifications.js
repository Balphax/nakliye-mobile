import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import Sound from 'react-native-sound';
import { Platform } from 'react-native';
import { authAPI } from './api';

// Kanal oluştur (Android)
PushNotification.createChannel(
  {
    channelId: 'nakliye_messages',
    channelName: 'Nakliye Mesajları',
    channelDescription: 'WhatsApp grup filtresi bildirimleri',
    importance: 4,
    vibrate: true,
    playSound: true,
    soundName: 'default',
  },
  () => {}
);

// Yerel bildirim göster
export function showLocalNotification(title, body, data = {}) {
  PushNotification.localNotification({
    channelId: 'nakliye_messages',
    title,
    message: body,
    playSound: true,
    soundName: 'default',
    vibrate: true,
    vibration: 500,
    priority: 'high',
    importance: 'high',
    userInfo: data,
    largeIcon: 'ic_launcher',
    smallIcon: 'ic_notification',
    color: '#f59e0b',
  });
}

// Ses çal
const sounds = {};
export function playNotificationSound(soundType = 'double_beep') {
  Sound.setCategory('Playback');
  const soundMap = {
    double_beep: 'double_beep',
    long_beep: 'long_beep',
    triple_beep: 'triple_beep',
    soft_chime: 'soft_chime',
    truck_horn: 'truck_horn',
  };
  const soundName = soundMap[soundType] || 'double_beep';
  try {
    const sound = new Sound(`${soundName}.mp3`, Sound.MAIN_BUNDLE, (error) => {
      if (!error) sound.play(() => sound.release());
    });
  } catch(e) {}
}

// FCM token al ve sunucuya kaydet
export async function registerFCMToken() {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) return null;

    const token = await messaging().getToken();
    if (token) {
      await authAPI.saveFcmToken(token);
      console.log('FCM token kaydedildi');
    }
    return token;
  } catch(e) {
    console.error('FCM token hatası:', e);
    return null;
  }
}

// Arka plan mesajı işle
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Arka plan mesajı:', remoteMessage);
  showLocalNotification(
    remoteMessage.notification?.title || 'Yeni Mesaj',
    remoteMessage.notification?.body || ''
  );
});

// Bildirime tıklanınca
export function setupNotificationHandlers(onNotificationPress) {
  PushNotification.configure({
    onNotification: (notification) => {
      if (notification.userInteraction) {
        onNotificationPress?.(notification);
      }
    },
    requestPermissions: Platform.OS === 'ios',
  });

  // Uygulama açıkken gelen FCM mesajı
  return messaging().onMessage(async (remoteMessage) => {
    showLocalNotification(
      remoteMessage.notification?.title || 'Yeni Mesaj',
      remoteMessage.notification?.body || ''
    );
  });
}
