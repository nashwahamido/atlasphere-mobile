import Constants from 'expo-constants';

// Backend address. Override for local development with EXPO_PUBLIC_API_URL,
// e.g. EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 npx expo start
const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || fromConfig || 'https://atlasphere.up.railway.app').replace(/\/$/, '');
