// The appointment on a real map (Apple Maps on iPhone; Google Maps on Android when a key is set),
// with the person's own position shown by the phone only. Falls back to a drawn map otherwise.
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { Slot } from '../types';
import { C } from '../theme';

const hasAndroidKey = !!(Constants.expoConfig?.extra as { hasGoogleMapsKey?: boolean } | undefined)?.hasGoogleMapsKey;

export function PlanMap({ slot, height = 230, title }: { slot: Slot; height?: number; title?: string }) {
  if (Platform.OS === 'android' && !hasAndroidKey) return <Drawn height={height} />;
  return (
    <View style={{ height, borderRadius: 22, overflow: 'hidden' }}>
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={{ latitude: slot.lat, longitude: slot.lon, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
        showsUserLocation
        showsMyLocationButton
        toolbarEnabled={false}
      >
        <Marker coordinate={{ latitude: slot.lat, longitude: slot.lon }} title={title} pinColor={C.teal} />
      </MapView>
    </View>
  );
}

function Drawn({ height }: { height: number }) {
  return (
    <View style={{ height, borderRadius: 22, overflow: 'hidden', backgroundColor: '#E8F1EC' }}>
      <Svg width="100%" height={height} viewBox="0 0 340 230">
        <Rect x="0" y="0" width="340" height="230" fill="#E8F1EC" />
        <Path d="M0 160 H340 M120 0 V230 M0 60 H340 M250 0 V230" stroke="#FFFFFF" strokeWidth="14" />
        <Path d="M60 190 H120 V60 H230" stroke={C.tealMid} strokeWidth="5" fill="none" strokeLinecap="round" />
        <Circle cx="60" cy="190" r="10" fill={C.blue} />
        <Circle cx="230" cy="60" r="12" fill={C.teal} />
      </Svg>
    </View>
  );
}
