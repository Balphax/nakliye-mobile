import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './src/screens/LoginScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ConnectScreen from './src/screens/ConnectScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { authAPI } from './src/services/api';
import { setupNotificationHandlers, registerFCMToken } from './src/services/notifications';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ emoji, label, focused, unread }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
        {unread > 0 && (
          <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 10, color: focused ? '#f59e0b' : '#64748b', fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function MainTabs({ route }) {
  const { user } = route.params;
  const [unread, setUnread] = useState(0);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#111827', borderTopColor: '#243049', borderTopWidth: 1, height: 65, paddingBottom: 8 },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Messages"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📦" label="Mesajlar" focused={focused} unread={unread}/> }}
      >
        {() => <MessagesScreen userId={user._id} onUnreadChange={setUnread}/>}
      </Tab.Screen>
      <Tab.Screen
        name="Connect"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔗" label="Bağlan" focused={focused}/> }}
      >
        {() => <ConnectScreen userId={user._id}/>}
      </Tab.Screen>
      <Tab.Screen
        name="Settings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="Ayarlar" focused={focused}/> }}
      >
        {(props) => <SettingsScreen {...props} user={user}/>}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function SplashScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0f1e', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontWeight: '900', fontSize: 36, color: '#f59e0b', letterSpacing: 2 }}>NAKLİYE<Text style={{ color: '#f1f5f9', fontWeight: '400' }}>Bot</Text></Text>
      <ActivityIndicator color="#f59e0b" size="large"/>
    </View>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
    setupNotificationHandlers(() => {});
  }, []);

  async function checkAuth() {
    try {
      const res = await authAPI.me();
      setUser(res.data);
      setInitialRoute('App');
      await registerFCMToken();
    } catch(e) {
      setInitialRoute('Login');
    }
    setLoading(false);
  }

  if (loading) return <SplashScreen/>;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1e"/>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen}/>
          <Stack.Screen name="App">
            {(props) => <MainTabs {...props} route={{ ...props.route, params: { user: user || props.route.params?.user } }}/>}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
