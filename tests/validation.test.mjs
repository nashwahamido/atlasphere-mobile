// Unit tests for the client-side form rules (mirror of the server's rules).
// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

import { fullPhone, isEmail, validateCode, validateLogin, validateRegister } from '../src/lib/validation.ts';

const good = { username: 'Nashwa', email: 'nashwa@example.com', phone: '+353871234567', password: 'secret12' };

test('a valid sign-up has no errors', () => {
  assert.deepEqual(validateRegister(good), {});
});

test('sign-up rules match the server', () => {
  assert.match(validateRegister({ ...good, username: 'ab' }).username, /3–20/);
  assert.match(validateRegister({ ...good, username: 'a'.repeat(21) }).username, /3–20/);
  assert.match(validateRegister({ ...good, email: 'nope' }).email, /doesn’t look right/);
  assert.match(validateRegister({ ...good, password: '12345' }).password, /6–12/);
  assert.match(validateRegister({ ...good, password: '1234567890123' }).password, /6–12/);
  assert.match(validateRegister({ ...good, phone: '' }).phone, /enter/);
  assert.match(validateRegister({ ...good, phone: '+3531' }).phone, /doesn’t look right/);
});

test('phone numbers are combined into international format', () => {
  assert.equal(fullPhone('+353', '087 123 4567'), '+353871234567');
  assert.equal(fullPhone('+44', '(07700) 900-123'), '+447700900123');
  assert.equal(fullPhone('+1', '  '), '');
});

test('login and code checks', () => {
  assert.deepEqual(validateLogin('a@b.co', 'x'), {});
  assert.ok(validateLogin('', '').email);
  assert.ok(validateLogin('a@b.co', '').password);
  assert.equal(validateCode('123456'), undefined);
  assert.ok(validateCode('12345'));
  assert.ok(validateCode('12345a'));
  assert.equal(isEmail(' spaced@example.com '), true);
});
