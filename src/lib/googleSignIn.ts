import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { api, type AuthResult } from './api';
import { API_URL } from './config';

// Sign in with Google. Google's page opens in the phone's secure sign-in
// sheet (via the website's server, which holds the Google setup); the server
// sends the app back a one-time code that only this attempt's secret
// (`verifier`) can redeem.
//
// Returns null if the person closes the sheet.
export async function signInWithGoogle(): Promise<AuthResult | null> {
  const verifier = (Crypto.randomUUID() + Crypto.randomUUID()).replace(/-/g, '');
  const challenge = (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const redirect = Linking.createURL('auth'); // atlasphere://auth (exp://…/--/auth in Expo Go)
  const url = `${API_URL}/auth/google?app=1&redirect=${encodeURIComponent(redirect)}&challenge=${challenge}`;

  const result = await WebBrowser.openAuthSessionAsync(url, redirect);
  if (result.type !== 'success') return null;
  const params = Linking.parse(result.url).queryParams || {};
  const code = typeof params.code === 'string' ? params.code : '';
  if (params.error === 'cancelled') return null;
  if (!code) throw new Error('Google sign-in didn’t work. Please try again, or use your email.');
  return api.googleSignIn(code, verifier);
}

// Whether the server has Google sign-in set up (asked once per launch). Not
// in the browser build: the website has its own Google button.
let known: boolean | null = Platform.OS === 'web' ? false : null;
let pending: Promise<boolean> | null = null;
export function useGoogleAvailable(): boolean {
  const [available, setAvailable] = useState(known === true);
  useEffect(() => {
    if (known !== null) return;
    let cancelled = false;
    pending = pending || api.authProviders().then((r) => !!r.google).catch(() => false);
    pending.then((v) => { known = v; if (!cancelled) setAvailable(v); });
    return () => { cancelled = true; };
  }, []);
  return available;
}
