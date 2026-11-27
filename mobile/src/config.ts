// Where the app talks to. Agent ids live in src/agents; no secret keys ever live in the app.
import Constants from 'expo-constants';

export const API_BASE: string =
  (Constants.expoConfig?.extra as { apiBase?: string } | undefined)?.apiBase ??
  'https://aoun-voice-tools.onrender.com';
