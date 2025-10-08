import crypto from 'crypto';
import { machineIdSync } from 'node-machine-id';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key derived from machine ID
 * This ensures credentials are machine-specific
 */
function getEncryptionKey(): Buffer {
  try {
    const machineId = machineIdSync();
    // Derive a 32-byte key from machine ID using scrypt
    return crypto.scryptSync(machineId, 'yasban-salt-v1', KEY_LENGTH);
  } catch (error) {
    console.error('Error getting machine ID, using fallback:', error);
    // Fallback to a static key (less secure, but allows development)
    return crypto.scryptSync('yasban-fallback-key', 'yasban-salt-v1', KEY_LENGTH);
  }
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns format: iv:authTag:encrypted
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in format "iv:authTag:encrypted"
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 * Expects format: iv:authTag:encrypted
 * @param ciphertext - The encrypted string
 * @returns Decrypted plaintext
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) {
    throw new Error('Cannot decrypt empty string');
  }

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format. Expected format: iv:authTag:encrypted');
    }

    const [ivHex, authTagHex, encrypted] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data. Data may be corrupted or tampered with.');
  }
}

/**
 * Test encryption/decryption roundtrip
 * Used for testing and validation
 */
export function testEncryption(): boolean {
  try {
    const testData = 'Hello, Yasban! This is a test.';
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);

    if (testData !== decrypted) {
      console.error('Encryption test failed: decrypted data does not match original');
      return false;
    }

    console.log('✓ Encryption test passed');
    return true;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}

/**
 * Encrypt a JSON object
 * @param data - The object to encrypt
 * @returns Encrypted string
 */
export function encryptJSON(data: any): string {
  return encrypt(JSON.stringify(data));
}

/**
 * Decrypt a JSON object
 * @param ciphertext - The encrypted string
 * @returns Decrypted object
 */
export function decryptJSON<T = any>(ciphertext: string): T {
  const decrypted = decrypt(ciphertext);
  return JSON.parse(decrypted);
}
