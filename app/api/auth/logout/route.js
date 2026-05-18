import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';

export async function POST() {
  try {
    const sessionToken = cookies().get('session_token')?.value;
    
    if (sessionToken) {
      db.prepare('UPDATE users SET session_token = NULL WHERE session_token = ?').run(sessionToken);
    }

    cookies().delete('session_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
