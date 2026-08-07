import { isValidEmailFormat } from './auth';

describe('isValidEmailFormat', () => {
  it('accepts an ordinary email address', () => {
    expect(isValidEmailFormat('alice@example.com')).toBe(true);
  });

  it('accepts an address with surrounding whitespace', () => {
    expect(isValidEmailFormat('  alice@example.com  ')).toBe(true);
  });

  it('rejects a value missing the @', () => {
    expect(isValidEmailFormat('alice.example.com')).toBe(false);
  });

  it('rejects a value missing a domain dot', () => {
    expect(isValidEmailFormat('alice@example')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmailFormat('')).toBe(false);
  });

  it('rejects a value with internal whitespace', () => {
    expect(isValidEmailFormat('alice @example.com')).toBe(false);
  });
});
