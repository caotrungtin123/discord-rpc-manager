function keyMaterial(): Uint8Array {
  const raw = process.env["TOKEN_ENC_KEY"];
  if (!raw) throw new Error("TOKEN_ENC_KEY missing");
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = parseInt(raw.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  // fall back: derive 32 bytes from an arbitrary string
  const bytes = new TextEncoder().encode(raw);
  const out = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) out[i % 32] ^= bytes[i]!;
  return out;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", keyMaterial(), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptToken(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey();
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)),
  );
  return `${toB64(iv)}.${toB64(cipher)}`;
}

export async function decryptToken(payload: string): Promise<string> {
  const [ivPart, dataPart] = payload.split(".");
  if (!ivPart || !dataPart) throw new Error("bad ciphertext");
  const key = await getKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivPart) },
    key,
    fromB64(dataPart),
  );
  return new TextDecoder().decode(plain);
}
