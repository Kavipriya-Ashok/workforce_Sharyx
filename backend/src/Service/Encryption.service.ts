import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import CryptoJS from 'crypto-js';
import { randomBytes, scrypt, timingSafeEqual } from "crypto";

@Injectable()
export class EncryptionService {
  constructor(private _ConfigService: ConfigService) { }
  Decrypt(text: string) {
    const DuplicateKey = CryptoJS.enc.Hex.parse(text);
    const OriginalKey = DuplicateKey.toString(CryptoJS.enc.Base64);
    return CryptoJS.AES.decrypt(OriginalKey, String(this._ConfigService.get("Encryption.SecertKey")),).toString(CryptoJS.enc.Utf8);
  }

  Encrypt(text: string) {
    const OriginalKey = CryptoJS.AES.encrypt(text, String(this._ConfigService.get("Encryption.SecertKey")),).toString();
    const DuplicateKey = CryptoJS.enc.Base64.parse(OriginalKey);
    return DuplicateKey.toString(CryptoJS.enc.Hex);
  }

  /**
   * One-way password hashing (scrypt, per-user random salt).
   * Stored format: scrypt$<salt hex>$<hash hex>
   */
  HashPassword(plain: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = randomBytes(16);
      scrypt(plain, salt, 64, (err, derived) => {
        if (err) return reject(err);
        resolve(`scrypt$${salt.toString("hex")}$${derived.toString("hex")}`);
      });
    });
  }

  /**
   * Verifies a password against the new scrypt format or the legacy
   * reversible-AES format. `needsRehash` tells the caller to upgrade the stored
   * value to scrypt (done transparently on a successful login).
   */
  async VerifyPassword(plain: string, stored: string): Promise<{ valid: boolean; needsRehash: boolean }> {
    if (!stored || typeof plain !== "string") return { valid: false, needsRehash: false };
    if (stored.startsWith("scrypt$")) {
      const [, saltHex, hashHex] = stored.split("$");
      const expected = Buffer.from(hashHex, "hex");
      const derived: Buffer = await new Promise((resolve, reject) =>
        scrypt(plain, Buffer.from(saltHex, "hex"), expected.length, (e, d) => (e ? reject(e) : resolve(d)))
      );
      return { valid: derived.length === expected.length && timingSafeEqual(derived, expected), needsRehash: false };
    }
    let legacy = "";
    try { legacy = this.Decrypt(stored); } catch { legacy = ""; }
    const a = Buffer.from(legacy);
    const b = Buffer.from(plain);
    const valid = legacy.length > 0 && a.length === b.length && timingSafeEqual(a, b);
    return { valid, needsRehash: valid };
  }

}
