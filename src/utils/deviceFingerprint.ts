/**
 * Generates a stable device fingerprint for anonymous cart persistence.
 * Uses browser signals that are stable across sessions but don't identify
 * the individual — not used for tracking, only for cart continuity.
 * 
 * The fingerprint is stored as an HTTP-only cookie set by the server,
 * so it survives localStorage clears and private browsing (within a device).
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const signals = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(navigator.hardwareConcurrency || 0),
  ];

  // Canvas fingerprint (subtle rendering differences between GPU/driver combos)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Vyra🌿', 2, 15);
      signals.push(canvas.toDataURL());
    }
  } catch {
    // Canvas blocked in some environments
  }

  const combined = signals.join('|');

  // Use Web Crypto API for SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
