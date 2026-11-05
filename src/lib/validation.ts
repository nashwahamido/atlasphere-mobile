// Client-side checks that mirror the server's rules, so people see problems
// before submitting. The server still validates everything.
export type RegisterInput = { username: string; email: string; phone: string; password: string };
export type FieldErrors = Partial<Record<keyof RegisterInput | 'code', string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

// Combines a country code and a local number into +<digits>, dropping spaces,
// dashes, brackets and a leading trunk 0 (e.g. "+353" + "087 123 4567" -> "+353871234567").
export function fullPhone(countryCode: string, local: string): string {
  const digits = local.replace(/[^\d]/g, '').replace(/^0+/, '');
  return digits ? countryCode + digits : '';
}

export function validateRegister(input: RegisterInput): FieldErrors {
  const errors: FieldErrors = {};
  const name = input.username.trim();
  if (!name) errors.username = 'Please enter your name.';
  else if (name.length < 3 || name.length > 20) errors.username = 'Name must be 3–20 characters.';
  if (!input.email.trim()) errors.email = 'Please enter your email.';
  else if (!isEmail(input.email)) errors.email = 'That email doesn’t look right.';
  const phoneDigits = input.phone.replace(/[^\d]/g, '');
  if (!phoneDigits) errors.phone = 'Please enter your phone number.';
  else if (phoneDigits.length < 8 || phoneDigits.length > 15) errors.phone = 'That phone number doesn’t look right.';
  if (!input.password) errors.password = 'Please choose a password.';
  else if (input.password.length < 6 || input.password.length > 12) errors.password = 'Password must be 6–12 characters.';
  return errors;
}

export function validateLogin(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = 'Please enter your email.';
  else if (!isEmail(email)) errors.email = 'That email doesn’t look right.';
  if (!password) errors.password = 'Please enter your password.';
  return errors;
}

export function validateCode(code: string): string | undefined {
  return /^\d{6}$/.test(code) ? undefined : 'Please enter the 6-digit code.';
}
