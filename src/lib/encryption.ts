/**
 * Encryption utility for API keys
 * Uses AES-256-GCM for secure encryption
 */

import crypto from 'crypto';
import { log } from '@/lib/logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32';

export interface EncryptResult {
  encrypted: string;
  iv: string;
  tag: string;
}

export function encrypt(text: string): string {
  log('Encryption module loaded', 'INFO');
  log('Encryption key configured: ' + JSON.stringify({
    keyLength: ENCRYPTION_KEY.length,
    isDefault: ENCRYPTION_KEY === 'default-encryption-key-change-in-production-32'
  }), 'DEBUG');
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const key = crypto.pbkdf2Sync(
      ENCRYPTION_KEY,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      'sha512'
    );

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
    const encrypted = Buffer.concat([
      Buffer.from(cipher.update(text, 'utf8')),
      Buffer.from(cipher.final())
    ]);
    const tag = cipher.getAuthTag();

    log('Encryption successful', 'INFO');
    
    // Combine all parts: salt + iv + tag + encrypted data
    const combined = Buffer.concat([salt, iv, tag, encrypted]);
    return combined.toString('base64');
  } catch (error) {
    log('Encryption failed: ' + (error as Error).message, 'ERROR');
    throw new Error('Encryption failed: ' + (error as Error).message);
  }
}

export function decrypt(encryptedText: string): string {
  log('Decryption starting...', 'INFO');
  
  try {
    const combined = Buffer.from(encryptedText, 'base64');
    
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = crypto.pbkdf2Sync(
      ENCRYPTION_KEY,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      'sha512'
    );

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      Buffer.from(decipher.update(encrypted)),
      Buffer.from(decipher.final())
    ]);

    log('Decryption successful', 'INFO');
    return decrypted.toString('utf8');
  } catch (error) {
    log('Decryption failed: ' + (error as Error).message, 'ERROR');
    throw new Error('Decryption failed: ' + (error as Error).message);
  }
}
