import { describe, expect, it } from 'vitest';
import { errorMessage, isNetworkError } from '../errors';

describe('errorMessage', () => {
  it('uses the API message', () => {
    expect(errorMessage({ status: 422, code: 'X', message: 'Team is full' })).toBe('Team is full');
  });
  it('explains a network failure', () => {
    const e = { status: 0, code: 'NETWORK', message: 'Cannot reach the server.' };
    expect(errorMessage(e)).toMatch(/No connection/);
    expect(isNetworkError(e)).toBe(true);
  });
  it('reads plain errors and unknown values', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage(undefined)).toBe('Something went wrong');
    expect(isNetworkError(new Error('x'))).toBe(false);
  });
});
