import { describe, it, expect } from "vitest";
import {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  computeMac,
  verifyMac,
  deriveKeysFromPassword,
  generateNonce,
  generateSalt,
  generateAuthToken,
  generateKeyPair,
  generateVaultId,
  generateDeviceId,
  hashContent,
  KEY_LENGTH,
  NONCE_LENGTH,
  SALT_LENGTH,
} from "./crypto";

function key32(): Uint8Array {
  const k = new Uint8Array(KEY_LENGTH);
  for (let i = 0; i < k.length; i++) k[i] = i;
  return k;
}

describe("encrypt / decrypt", () => {
  it("round-trips plaintext", () => {
    const k = key32();
    const payload = encrypt("hello vault", k);
    expect(decrypt(payload, k)).toBe("hello vault");
  });

  it("round-trips unicode", () => {
    const k = key32();
    const text = "🔐 zażółć gęślą jaźń — مرحبا";
    expect(decrypt(encrypt(text, k), k)).toBe(text);
  });

  it("fails with the wrong key", () => {
    const k = key32();
    const payload = encrypt("secret", k);
    const wrong = key32();
    wrong[0] ^= 0xff;
    expect(() => decrypt(payload, wrong)).toThrow(/Decryption failed/);
  });

  it("produces a different nonce on every call", () => {
    const k = key32();
    const a = encrypt("same plaintext", k);
    const b = encrypt("same plaintext", k);
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("encryptObject round-trips structured data", () => {
    const k = key32();
    const obj = { title: "n1", tags: ["a", "b"], n: 42 };
    const payload = encryptObject(obj, k);
    expect(decryptObject<typeof obj>(payload, k)).toEqual(obj);
  });
});

describe("HMAC (computeMac / verifyMac)", () => {
  // Regression: an earlier verifyMac ignored the key entirely. These tests
  // pin the contract that the key is actually authenticated against.
  it("round-trips a tag", () => {
    const k = key32();
    const tag = computeMac("payload", k);
    expect(verifyMac("payload", tag, k)).toBe(true);
  });

  it("rejects a tag computed under a different key", () => {
    const k = key32();
    const k2 = key32();
    k2[0] ^= 0x01;
    const tag = computeMac("payload", k);
    expect(verifyMac("payload", tag, k2)).toBe(false);
  });

  it("rejects a tampered payload", () => {
    const k = key32();
    const tag = computeMac("payload", k);
    expect(verifyMac("Payload", tag, k)).toBe(false);
  });

  it("rejects malformed base64 without throwing", () => {
    const k = key32();
    expect(verifyMac("payload", "this is !!! not base64", k)).toBe(false);
  });

  it("rejects a tag of the wrong length", () => {
    const k = key32();
    expect(verifyMac("payload", "AAAA", k)).toBe(false);
  });
});

describe("deriveKeysFromPassword", () => {
  it("is deterministic for the same password + salt", async () => {
    const salt = new Uint8Array(SALT_LENGTH).fill(7);
    const a = await deriveKeysFromPassword("hunter2", salt);
    const b = await deriveKeysFromPassword("hunter2", salt);
    expect(Array.from(a.encryptionKey)).toEqual(Array.from(b.encryptionKey));
    expect(Array.from(a.macKey)).toEqual(Array.from(b.macKey));
  });

  it("produces different keys for different salts", async () => {
    const a = await deriveKeysFromPassword("hunter2", new Uint8Array(SALT_LENGTH).fill(1));
    const b = await deriveKeysFromPassword("hunter2", new Uint8Array(SALT_LENGTH).fill(2));
    expect(Array.from(a.encryptionKey)).not.toEqual(Array.from(b.encryptionKey));
  });

  it("returns 32-byte encryption key and 32-byte mac key", async () => {
    const { encryptionKey, macKey } = await deriveKeysFromPassword(
      "x",
      new Uint8Array(SALT_LENGTH),
    );
    expect(encryptionKey.byteLength).toBe(32);
    expect(macKey.byteLength).toBe(32);
  });

  it("produces independent encryption and mac keys", async () => {
    const { encryptionKey, macKey } = await deriveKeysFromPassword(
      "x",
      new Uint8Array(SALT_LENGTH).fill(9),
    );
    expect(Array.from(encryptionKey)).not.toEqual(Array.from(macKey));
  });
});

describe("size primitives", () => {
  it("generateNonce is NONCE_LENGTH bytes", () => {
    expect(generateNonce().byteLength).toBe(NONCE_LENGTH);
  });

  it("generateSalt is SALT_LENGTH bytes", () => {
    expect(generateSalt().byteLength).toBe(SALT_LENGTH);
  });

  it("generateAuthToken is alphanumeric", () => {
    const t = generateAuthToken();
    expect(t.length).toBeGreaterThan(0);
    expect(t).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it("generateKeyPair returns base64 keys", () => {
    const kp = generateKeyPair();
    expect(typeof kp.publicKey).toBe("string");
    expect(typeof kp.secretKey).toBe("string");
    expect(kp.publicKey).not.toBe(kp.secretKey);
  });

  it("generateVaultId / generateDeviceId are 22-char identifiers", () => {
    expect(generateVaultId().length).toBe(22);
    expect(generateDeviceId().length).toBe(22);
  });

  it("hashContent is deterministic", () => {
    expect(hashContent("vault content")).toBe(hashContent("vault content"));
  });

  it("hashContent differs for different inputs", () => {
    expect(hashContent("a")).not.toBe(hashContent("b"));
  });
});
