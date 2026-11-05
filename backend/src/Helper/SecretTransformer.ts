import CryptoJS from "crypto-js";
import { ValueTransformer } from "typeorm";

const PREFIX = "enc:v1:";

const key = (): string => {
  const k = process.env.SECERT_KEY;
  if (!k) {
    throw new Error("SECERT_KEY is not configured; refusing to read/write encrypted secrets.");
  }
  return k;
};

/**
 * TypeORM column transformer: encrypts secrets (API/access tokens) at rest and decrypts them
 * transparently when entities are loaded. Legacy plain-text values (no prefix) are returned
 * as-is and get encrypted the next time the row is saved.
 */
export const EncryptedColumn: ValueTransformer = {
  to(value: string | null | undefined) {
    if (value === null || value === undefined || value === "") return value as any;
    if (typeof value === "string" && value.startsWith(PREFIX)) return value;
    return PREFIX + CryptoJS.AES.encrypt(String(value), key()).toString();
  },
  from(value: string | null | undefined) {
    if (typeof value !== "string" || !value.startsWith(PREFIX)) return value as any;
    return CryptoJS.AES.decrypt(value.slice(PREFIX.length), key()).toString(CryptoJS.enc.Utf8);
  },
};
