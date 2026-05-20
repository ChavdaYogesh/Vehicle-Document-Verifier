import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Vehicle from '@/models/Vehicle';
import { getSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { token } = await request.json();
    if (!token?.trim()) {
      return NextResponse.json({ error: 'FCM token required' }, { status: 400 });
    }

    await connectToDatabase();
    
    await User.findByIdAndUpdate(user.id, { fcm_token: token.trim() });
    
    // Update vehicles where owner_fcm_token is null or empty
    await Vehicle.updateMany(
      { user_id: user.id, $or: [{ owner_fcm_token: null }, { owner_fcm_token: "" }] },
      { owner_fcm_token: token.trim() }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
