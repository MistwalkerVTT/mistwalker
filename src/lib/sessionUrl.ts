/**
 * Multi-Session & Room URL Resolution Utilities
 * Handles extracting and constructing session-scoped URLs for multi-DM isolation.
 */

export function getActiveSessionId(): string {
  if (typeof window === 'undefined') return 'default';
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('session') || params.get('room') || 'default';
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'default';
}

export function getPlayerViewUrl(sessionId?: string): string {
  if (typeof window === 'undefined') return '/?view=player';
  const sId = sessionId || getActiveSessionId();
  const sessionParam = sId && sId !== 'default' ? `&session=${encodeURIComponent(sId)}` : '';
  return `${window.location.origin}${window.location.pathname}?view=player${sessionParam}`;
}

export function getDmViewUrl(sessionId: string): string {
  if (typeof window === 'undefined') return '/';
  const cleanId = sessionId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const sessionParam = cleanId && cleanId !== 'default' ? `?session=${encodeURIComponent(cleanId)}` : '';
  return `${window.location.origin}${window.location.pathname}${sessionParam}`;
}
