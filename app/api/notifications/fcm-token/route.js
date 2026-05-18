import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { token } = await request.json();
    if (!token?.trim()) {
      return NextResponse.json({ error: 'FCM token required' }, { status: 400 });
    }

    db.prepare('UPDATE users SET fcm_token = ? WHERE id = ?').run(token.trim(), user.id);
    db.prepare('UPDATE vehicles SET owner_fcm_token = ? WHERE user_id = ? AND owner_fcm_token IS NULL').run(
      token.trim(),
      user.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
