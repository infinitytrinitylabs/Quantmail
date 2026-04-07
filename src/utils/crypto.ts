import CryptoJS from "crypto-js";
import { v4 as uuidv4 } from "uuid";
import argon2 from "argon2";

export function deriveBiometricHash(facialMatrixData: string): string {
  return CryptoJS.SHA256(facialMatrixData).toString(CryptoJS.enc.Hex);
}

export function generateMasterSSOToken(userId: string, secret: string): string {
  const payload = JSON.stringify({
    sub: userId,
    iat: Date.now(),
    jti: uuidv4(),
  });
  const signature = CryptoJS.HmacSHA256(payload, secret).toString(CryptoJS.enc.Hex);
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${signature}`;
}

export function verifyMasterSSOToken(token: string, secret: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf-8");
    const expectedSig = CryptoJS.HmacSHA256(payload, secret).toString(CryptoJS.enc.Hex);
    if (signature !== expectedSig) return null;
    const parsed = JSON.parse(payload) as { sub: string };
    return parsed.sub;
  } catch {
    return null;
  }
}

export async function hashSecret(secret: string): Promise<string> {
  return argon2.hash(secret, { type: argon2.argon2id });
}

export async function verifySecret(hash: string, secret: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, secret);
  } catch {
    return false;
  }
}

export function encryptApiKey(apiKey: string, secret: string): string {
  return CryptoJS.AES.encrypt(`qm:${apiKey}`, secret).toString();
}

export function decryptApiKey(encrypted: string, secret: string): string | null {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, secret);
    const plaintext = bytes.toString(CryptoJS.enc.Utf8);
    if (!plaintext.startsWith("qm:")) return null;
    return plaintext.slice(3);
  } catch {
    return null;
  }
}
