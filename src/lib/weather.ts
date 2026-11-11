import type { Busy, DayWeather, WeatherKind } from './api';

// Same wording and icons as the website's Destination tab.
const WEATHER: Record<WeatherKind, { icon: string; label: string }> = {
  clear: { icon: '☀️', label: 'Sunny' },
  partly: { icon: '⛅', label: 'Partly cloudy' },
  cloudy: { icon: '☁️', label: 'Cloudy' },
  fog: { icon: '🌫️', label: 'Fog' },
  drizzle: { icon: '🌦️', label: 'Drizzle' },
  rain: { icon: '🌧️', label: 'Rain' },
  snow: { icon: '❄️', label: 'Snow' },
  storm: { icon: '⛈️', label: 'Thunderstorms' },
};

export function weatherIcon(kind: WeatherKind | undefined, isDay?: boolean | null) {
  if (kind === 'clear' && isDay === false) return '🌙';
  return (WEATHER[kind || 'cloudy'] || WEATHER.cloudy).icon;
}
export function weatherLabel(kind: WeatherKind | undefined, isDay?: boolean | null) {
  if (kind === 'clear' && isDay === false) return 'Clear';
  return (WEATHER[kind || 'cloudy'] || WEATHER.cloudy).label;
}
// A "typical" day (past years) only says how often it rained.
export function dayLabel(w: DayWeather | null) {
  if (!w) return '';
  if (w.source !== 'typical') return weatherLabel(w.kind);
  if (w.kind === 'snow') return 'Often snowy';
  if (w.kind === 'rain') return 'Often rainy';
  if (w.kind === 'partly') return 'Some rain';
  return 'Usually dry';
}
export const temp = (n: number | null | undefined) => (typeof n === 'number' ? Math.round(n) + '°' : '–');

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDate(iso: string, withDay = true) {
  const d = new Date(iso + 'T12:00:00Z');
  const s = d.getUTCDate() + ' ' + MON[d.getUTCMonth()];
  return withDay ? DAY[d.getUTCDay()] + ' ' + s : s;
}
export function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 86400000);
}
export function busyText(b: Busy | null | undefined) {
  if (!b || !b.reasons.length) return '';
  const s = b.reasons.join(' · ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Local time at the destination, and how far ahead/behind you it is.
export function localTime(timeZone: string, now = new Date()) {
  try {
    const time = new Intl.DateTimeFormat(undefined, { timeZone, hour: '2-digit', minute: '2-digit' }).format(now);
    const day = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'long' }).format(now);
    const parts: Record<string, string> = {};
    new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(now).forEach((p) => { parts[p.type] = p.value; });
    const there = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
    const minutes = Math.round((there - Math.floor(now.getTime() / 60000) * 60000) / 60000) + now.getTimezoneOffset();
    let diff = 'Same time as you';
    if (minutes !== 0) {
      const abs = Math.abs(minutes), h = Math.floor(abs / 60), m = abs % 60;
      diff = (h ? h + ' h' : '') + (m ? (h ? ' ' : '') + m + ' min' : '') + (minutes > 0 ? ' ahead of you' : ' behind you');
    }
    const hour = +parts.hour % 24;
    return { time, day, diff, isDay: hour >= 6 && hour < 19 };
  } catch {
    return null;
  }
}
