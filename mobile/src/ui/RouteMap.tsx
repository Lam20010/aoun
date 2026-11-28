// The route on a real map (Apple Maps on iPhone; Google Maps on Android when a key is set): the path
// from the server (Google Directions when the server has a key), home and the destination.
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { C } from '../theme';
import { RouteDrawn } from './RouteDrawn';

const hasAndroidKey = !!(Constants.expoConfig?.extra as { hasGoogleMapsKey?: boolean } | undefined)?.hasGoogleMapsKey;

export function RouteMap({ points, height = 240, title, color = C.tealMid }: { points: [number, number][]; height?: number; title?: string; color?: string }) {
  if (points.length < 2 || (Platform.OS === 'android' && !hasAndroidKey)) return <RouteDrawn points={points.length ? points : [[0, 0], [0, 0]]} height={height} title={title} color={color} />;
  const lats = points.map((p) => p[0]), lons = points.map((p) => p[1]);
  const region = { latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lons) + Math.max(...lons)) / 2,
    latitudeDelta: Math.max(0.008, (Math.max(...lats) - Math.min(...lats)) * 1.8), longitudeDelta: Math.max(0.008, (Math.max(...lons) - Math.min(...lons)) * 1.8) };
  const end = points[points.length - 1];
  return (
    <View style={{ height, borderRadius: 22, overflow: 'hidden' }}>
      <MapView style={{ flex: 1 }} provider={PROVIDER_DEFAULT} initialRegion={region} showsUserLocation toolbarEnabled={false}>
        <Polyline coordinates={points.map(([latitude, longitude]) => ({ latitude, longitude }))} strokeColor={color} strokeWidth={5} />
        <Marker coordinate={{ latitude: end[0], longitude: end[1] }} title={title} pinColor={C.teal} />
      </MapView>
    </View>
  );
}
