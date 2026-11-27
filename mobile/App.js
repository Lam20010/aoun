// Aoun mobile app: the same design and live agents as the web prototype, full screen on the phone.
// The page comes from the Aoun server; no keys or personal data live in the app.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';

const APP_URL = 'https://aoun-voice-tools.onrender.com/app';

export default function App() {
  const web = useRef(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Ask for the microphone once, and let the call play out loud even in silent mode.
    requestRecordingPermissionsAsync().catch(() => {});
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true }).catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {!failed && (
        <WebView
          ref={web}
          source={{ uri: APP_URL }}
          style={styles.web}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          geolocationEnabled
          bounces={false}
          scrollEnabled={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
          onLoadEnd={() => setLoading(false)}
          onError={() => setFailed(true)}
          onHttpError={(e) => { if (e.nativeEvent.statusCode >= 500) setFailed(true); }}
          originWhitelist={['https://*']}
        />
      )}
      {loading && !failed && (
        <View style={styles.cover}>
          <ActivityIndicator color="#96D7C6" size="large" />
          <Text style={styles.note}>لحظة، نجهّز عون…</Text>
        </View>
      )}
      {failed && (
        <View style={styles.cover}>
          <Text style={styles.note}>ما قدرنا نفتح عون. تأكّدي من النت.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => { setFailed(false); setLoading(true); }}>
            <Text style={styles.btnText}>جرّبي مرة ثانية</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  web: { flex: 1, backgroundColor: '#000' },
  cover: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F2E30', gap: 16 },
  note: { color: '#FFFFFF', fontSize: 17, textAlign: 'center', writingDirection: 'rtl', paddingHorizontal: 24 },
  btn: { backgroundColor: '#96D7C6', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 22 },
  btnText: { color: '#0F2E30', fontSize: 16, fontWeight: '600' },
});
