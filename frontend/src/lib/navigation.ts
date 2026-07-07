export const appNavigateEvent = 'kanbankaii:navigate';

export function navigateTo(path: string) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new CustomEvent(appNavigateEvent, { detail: { path } }));
}
