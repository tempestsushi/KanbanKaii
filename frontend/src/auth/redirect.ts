export function safeAuthRedirect(search = window.location.search): string {
  const requested = new URLSearchParams(search).get('redirect');
  if (!requested || !requested.startsWith('/') || requested.startsWith('//')) {
    return '/dashboard';
  }
  return requested;
}
