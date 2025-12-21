const encoder = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const keyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  
  const result = new Uint8Array(salt.length + keyBytes.length);
  result.set(salt);
  result.set(keyBytes, salt.length);
  
  return btoa(String.fromCharCode(...result));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const data = Uint8Array.from(atob(hash), c => c.charCodeAt(0));
  const salt = data.slice(0, 16);
  const storedKey = data.slice(16);
  
  const key = await deriveKey(password, salt);
  const keyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  
  if (keyBytes.length !== storedKey.length) return false;
  
  let match = true;
  for (let i = 0; i < keyBytes.length; i++) {
    if (keyBytes[i] !== storedKey[i]) match = false;
  }
  
  return match;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}
