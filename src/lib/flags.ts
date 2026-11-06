// Country code (e.g. "JP") -> flag emoji, which phones render natively.
export function flagEmoji(code: string): string {
  const cc = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🏳️';
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
