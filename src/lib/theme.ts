import { createContext, createElement, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { getItem, setItem } from './storage';

// Atlasphere brand colours (same as the website), in a light and a dark set.
// Screens read them with useColors() / makeStyles(), so they follow the theme.
export const light = {
  navy: '#0B3856',       // headings, icons and other "ink"
  navyFill: '#0B3856',   // navy surfaces with white text on them (tiles, selected chips)
  blue: '#3B5F8A',
  orange: '#E8933A',
  orangePressed: '#D4822F',
  text: '#0B3856',
  textMuted: '#5B6B7C',
  border: '#D6E0EA',
  field: '#F2F6FA',
  bg: '#FFFFFF',
  error: '#C62828',
  errorBg: '#FDECEA',
  success: '#1B7F4B',
  successBg: '#E7F6EE',
  white: '#FFFFFF',
  // Tinted backgrounds and their text
  highlightBg: '#FDF1E4',
  highlightBorder: '#F5CFA4',
  rangeBg: '#E3ECF6',
  faint: '#B8C3CF',
  placeholder: '#8A99A8',
  holidayBg: '#F3E8FF',
  holidayText: '#7E22CE',
  holidayStrong: '#581C87',
  busyBg: '#FEF3C7',
  busyText: '#A16207',
  hotBg: '#FEE2E2',
  hotText: '#B91C1C',
  closedBg: '#E5E7EB',
  closedText: '#4B5563',
  warnText: '#92400E',
  mapBg: '#E5E7EB',
};

export type Palette = typeof light;

export const dark: Palette = {
  navy: '#E6EEF6',
  navyFill: '#1F4C70',
  blue: '#7FA7D6',
  orange: '#E8933A',
  orangePressed: '#D4822F',
  text: '#E6EEF6',
  textMuted: '#9AACBF',
  border: '#2A3B4E',
  field: '#16212D',
  bg: '#0C141D',
  error: '#F28B82',
  errorBg: '#3A1F1F',
  success: '#6FD39A',
  successBg: '#15301F',
  white: '#FFFFFF',
  highlightBg: '#33261A',
  highlightBorder: '#7A5428',
  rangeBg: '#1E3248',
  faint: '#4A5A6B',
  placeholder: '#6F8193',
  holidayBg: '#2D2042',
  holidayText: '#D8B4FE',
  holidayStrong: '#EBD9FF',
  busyBg: '#3A2E12',
  busyText: '#FCD34D',
  hotBg: '#3F1D1D',
  hotText: '#FCA5A5',
  closedBg: '#26313D',
  closedText: '#C3CCD6',
  warnText: '#FCD34D',
  mapBg: '#1B2530',
};

export const radius = { field: 12, button: 999, card: 18 };

export type ThemePreference = 'system' | 'light' | 'dark';
type ThemeValue = { colors: Palette; scheme: 'light' | 'dark'; preference: ThemePreference; setPreference: (p: ThemePreference) => void };

const PREF_KEY = 'atlasphere.theme';
const ThemeContext = createContext<ThemeValue>({ colors: light, scheme: 'light', preference: 'system', setPreference: () => {} });

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');
  useEffect(() => {
    getItem(PREF_KEY).then((v) => { if (v === 'light' || v === 'dark') setPref(v); }).catch(() => {});
  }, []);
  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    setItem(PREF_KEY, p === 'system' ? null : p).catch(() => {});
  }, []);
  const scheme: 'light' | 'dark' = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(() => ({ colors: scheme === 'dark' ? dark : light, scheme, preference, setPreference }), [scheme, preference, setPreference]);
  return createElement(ThemeContext.Provider, { value }, children);
}

export const useTheme = () => use(ThemeContext);
export const useColors = () => use(ThemeContext).colors;

// Styles that depend on the colours, built once per theme:
//   const useStyles = makeStyles((colors) => ({ title: { color: colors.navy } }));
//   function Screen() { const styles = useStyles(); ... }
type StyleObject = Parameters<typeof StyleSheet.create>[0];

export function makeStyles<S extends StyleObject>(build: (colors: Palette) => S & StyleObject) {
  const cache = new Map<Palette, Readonly<S>>();
  return function useStyles(): Readonly<S> {
    const colors = useColors();
    let styles = cache.get(colors);
    if (!styles) {
      styles = StyleSheet.create(build(colors));
      cache.set(colors, styles);
    }
    return styles;
  };
}
