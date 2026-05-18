import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import db from './db';
import { cookies } from 'next/headers';

// Simple password hashing using scrypt
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password, hash) {
  const [salt, key] = hash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = scryptSync(password, salt, 64);
  return timingSafeEqual(keyBuffer, derivedKey);
}

export function generateSessionToken() {
  return randomBytes(32).toString('hex');
}

export function getSession() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  
  if (!sessionToken) return null;

  const user = db.prepare('SELECT id, name, email, fcm_token FROM users WHERE session_token = ?').get(sessionToken);
  return user || null;
}
