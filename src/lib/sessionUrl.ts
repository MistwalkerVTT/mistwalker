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

export function getInviteCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('join') || params.get('invite') || params.get('code');
  if (code) return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Check path: /join/VAULT9
  const match = window.location.pathname.match(/\/join\/([A-Za-z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1].trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  return null;
}

export function getJoinUrl(inviteCode: string): string {
  if (typeof window === 'undefined') return `/?join=${encodeURIComponent(inviteCode)}`;
  const cleanCode = inviteCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(cleanCode)}`;
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
