export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'error' in err) {
    const body = (err as { error?: { error?: { message?: string } } }).error;
    if (body?.error?.message) {
      return body.error.message;
    }
  }
  return fallback;
}
