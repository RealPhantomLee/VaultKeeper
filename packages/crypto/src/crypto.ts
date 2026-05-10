import nacl from "tweetnacl";
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from "tweetnacl-util";
import { EncryptedPayload } from "@vaultkeeper/types";
import { argon2id as wasmArgon2id } from "hash-wasm";

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

export interface DerivedKeys {
  encryptionKey: Uint8Array;
  macKey: Uint8Array;
}

export const KEY_LENGTH = nacl.secretbox.keyLength;
export const NONCE_LENGTH = nacl.secretbox.nonceLength;
export const SALT_LENGTH = 16;

export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

export async function deriveKeysFromPassword(
  password: string,
  salt: Uint8Array,
): Promise<DerivedKeys> {
  const passwordBytes = decodeUTF8(password);
  const keyMaterial = await argon2id(passwordBytes, salt, 64);

  return {
    encryptionKey: keyMaterial.slice(0, 32),
    macKey: keyMaterial.slice(32, 64),
  };
}

async function argon2id(
  password: Uint8Array,
  salt: Uint8Array,
  outputLength: number,
): Promise<Uint8Array> {
  const result = await wasmArgon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 65536,
    hashLength: outputLength,
    outputType: "binary",
  });
  return result as Uint8Array;
}

export function encrypt(plaintext: string, key: Uint8Array): EncryptedPayload {
  const nonce = nacl.randomBytes(NONCE_LENGTH);
  const plaintextBytes = decodeUTF8(plaintext);
  const ciphertext = nacl.secretbox(plaintextBytes, nonce, key);

  return {
    ciphertext: encodeBase64(ciphertext),
    nonce: encodeBase64(nonce),
    salt: encodeBase64(nacl.randomBytes(SALT_LENGTH)),
    algorithm: "xchacha20-poly1305",
    version: 1,
  };
}

export function decrypt(payload: EncryptedPayload, key: Uint8Array): string {
  const ciphertext = decodeBase64(payload.ciphertext);
  const nonce = decodeBase64(payload.nonce);
  const plaintext = nacl.secretbox.open(ciphertext, nonce, key);

  if (!plaintext) {
    throw new Error("Decryption failed: invalid key or corrupted data");
  }

  return encodeUTF8(plaintext);
}

export function encryptObject<T extends Record<string, unknown>>(
  obj: T,
  key: Uint8Array,
): EncryptedPayload {
  return encrypt(JSON.stringify(obj), key);
}

export function decryptObject<T>(payload: EncryptedPayload, key: Uint8Array): T {
  return JSON.parse(decrypt(payload, key)) as T;
}

export function hashContent(content: string): string {
  const bytes = decodeUTF8(content);
  const hash = nacl.hash(bytes);
  return encodeBase64(hash);
}

export function generateSalt(): Uint8Array {
  return nacl.randomBytes(SALT_LENGTH);
}

export function generateNonce(): Uint8Array {
  return nacl.randomBytes(NONCE_LENGTH);
}

export function generateAuthToken(): string {
  const bytes = nacl.randomBytes(32);
  return encodeBase64(bytes).replace(/[^a-zA-Z0-9]/g, "");
}

// TODO(crypto-review): tweetnacl does not expose HMAC. Replace with Web Crypto
// `crypto.subtle.verify('HMAC', ...)` or pull in @noble/hashes. The current
// implementation does NOT use the key and must not be relied on for security.
export function verifyMac(data: string, mac: string, _key: Uint8Array): boolean {
  const dataBytes = decodeUTF8(data);
  const macBytes = decodeBase64(mac);
  const expectedMac = nacl.hash(dataBytes);
  return constantTimeCompare(expectedMac, macBytes);
}

function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export function generateVaultId(): string {
  const bytes = nacl.randomBytes(16);
  return encodeBase64(bytes).substring(0, 22);
}

export function generateDeviceId(): string {
  const bytes = nacl.randomBytes(16);
  return encodeBase64(bytes).substring(0, 22);
}
