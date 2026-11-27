import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AgentSessionProvider } from '../src/voice/AgentSession';
import { C } from '../src/theme';

// Direction is handled per language inside the app (Arabic/Urdu right-to-left, English left-to-right),
// so the system layout direction is kept fixed.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export default function RootLayout() {
  useEffect(() => {}, []);
  return (
    <SafeAreaProvider>
      <AgentSessionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade' }}>
          <Stack.Screen name="incoming" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="call" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
      </AgentSessionProvider>
    </SafeAreaProvider>
  );
}
