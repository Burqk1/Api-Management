/**
 * Simple client-side encryption for cloud sync data.
 * Uses user ID as part of the key derivation so data is user-specific.
 * This is a lightweight obfuscation layer — for production, use a proper
 * encryption library (e.g., expo-crypto or tweetnacl).
 */

function deriveKey(userId: string): number {
  let hash = 0;
  const seed = `fetchlab_sync_${userId}`;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 256;
}

export function encryptSync(data: string, userId: string): string {
  const key = deriveKey(userId);
  const bytes = Array.from(data).map((ch, i) =>
    String.fromCharCode(ch.charCodeAt(0) ^ ((key + i) % 256))
  );
  // Base64 encode to make it safe for JSON transport
  try {
    return btoa(bytes.join(''));
  } catch {
    // Fallback for non-ASCII
    return btoa(encodeURIComponent(bytes.join('')));
  }
}

export function decryptSync(encrypted: string, userId: string): string {
  const key = deriveKey(userId);
  let decoded: string;
  try {
    decoded = atob(encrypted);
  } catch {
    try {
      decoded = decodeURIComponent(atob(encrypted));
    } catch {
      return encrypted; // Return as-is if decryption fails (legacy unencrypted data)
    }
  }
  return Array.from(decoded).map((ch, i) =>
    String.fromCharCode(ch.charCodeAt(0) ^ ((key + i) % 256))
  ).join('');
}
