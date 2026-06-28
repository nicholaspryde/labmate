import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { getCalendarTokenEncryptionKey } from "@/lib/calendar/env";

const ALGORITHM = "aes-256-gcm";

function getKeyBuffer(): Buffer {
  const raw = getCalendarTokenEncryptionKey();
  if (!raw) {
    throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY is not configured.");
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY must be 32 bytes base64-encoded.");
  }

  return key;
}

export function encryptToken(plaintext: string): string {
  const key = getKeyBuffer();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptToken(payload: string): string {
  const key = getKeyBuffer();
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted token payload.");
  }

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
