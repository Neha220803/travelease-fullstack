import { extractErrorMessage } from '@app/core/api/api-error';

describe('extractErrorMessage', () => {
  it('reads the backend ApiResponse error message', () => {
    const err = { error: { error: { message: 'Destination is required' } } };
    expect(extractErrorMessage(err, 'fallback')).toBe('Destination is required');
  });

  it('falls back when the shape does not match', () => {
    expect(extractErrorMessage(new Error('network'), 'fallback')).toBe('fallback');
  });

  it('falls back on null/undefined input', () => {
    expect(extractErrorMessage(null, 'fallback')).toBe('fallback');
    expect(extractErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
