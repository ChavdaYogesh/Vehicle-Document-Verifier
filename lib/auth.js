import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import connectToDatabase from './mongodb';
import User from '@/models/User';
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

export async function getSession() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  
  if (!sessionToken) return null;

  await connectToDatabase();
  const user = await User.findOne({ session_token: sessionToken }).select('_id name email fcm_token').lean();
  
  if (user) {
    // Map _id to id for backwards compatibility in existing routes if needed
    user.id = user._id.toString();
  }
  
  return user || null;
}
