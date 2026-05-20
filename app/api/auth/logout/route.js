import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function POST() {
  try {
    const sessionToken = cookies().get('session_token')?.value;
    
    if (sessionToken) {
      await connectToDatabase();
      await User.updateOne({ session_token: sessionToken }, { $unset: { session_token: 1 } });
    }

    cookies().delete('session_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
