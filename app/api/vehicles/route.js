import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const stmt = db.prepare('SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC');
    const vehicles = stmt.all(user.id);
    return NextResponse.json(vehicles);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, license_plate, owner_email, owner_phone, owner_fcm_token } = body;

    if (!name || !license_plate) {
      return NextResponse.json({ error: 'Name and License Plate are required' }, { status: 400 });
    }

    const stmt = db.prepare(`
      INSERT INTO vehicles (user_id, name, license_plate, owner_email, owner_phone, owner_fcm_token)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const userRow = db.prepare('SELECT fcm_token FROM users WHERE id = ?').get(user.id);
    const fcmToken = owner_fcm_token || userRow?.fcm_token || null;

    const info = stmt.run(
      user.id,
      name,
      license_plate,
      owner_email || null,
      owner_phone || null,
      fcmToken
    );

    return NextResponse.json({ id: info.lastInsertRowid }, { status: 201 });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'License plate already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
