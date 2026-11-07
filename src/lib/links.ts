import * as WebBrowser from 'expo-web-browser';

import { API_URL } from './config';

// Pages that live on the Atlasphere website.
export const PRIVACY_URL = API_URL + '/privacy';
export const TERMS_URL = API_URL + '/terms';
export const HELP_URL = API_URL + '/help';

// Opens a website page in the in-app browser.
export function openPage(url: string) {
  return WebBrowser.openBrowserAsync(url).catch(() => undefined);
}
