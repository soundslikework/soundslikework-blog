import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRawEmail, cleanName, EMAIL_RE } from './contactEmail.ts';

const base = { fromName: 'Site', from: 'a@b.co', to: 'me@b.co', domain: 'b.co', email: 'x@y.zz', message: 'hi' };

test('header injection in name cannot add a header', () => {
  const name = cleanName('Eve\r\nBcc: evil@x.zz');
  const headers = buildRawEmail({ ...base, name }).split('\r\n\r\n')[0].split('\r\n');
  assert.ok(!headers.some((h) => h.startsWith('Bcc:')));
});

test('address punctuation is stripped from the name', () => {
  assert.equal(cleanName('a, <evil@x.zz>'), 'a evil@x.zz');
});

test('non-ASCII name is encoded in headers', () => {
  const raw = buildRawEmail({ ...base, name: 'José' });
  assert.match(raw, /Subject: =\?UTF-8\?B\?/);
});

test('email regex rejects whitespace and angle brackets', () => {
  assert.ok(EMAIL_RE.test('x@y.zz'));
  assert.ok(!EMAIL_RE.test('x@y.zz>, evil@x.zz'));
  assert.ok(!EMAIL_RE.test('x y@z.zz'));
});
