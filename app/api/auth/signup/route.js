import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword, generateSessionToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    await connectToDatabase();
    const { name, email, password } = await req.json();

    if (!name || !email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Invalid input. Password must be at least 6 characters.' }, { status: 400 });
    }

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = hashPassword(password);
    const sessionToken = generateSessionToken();

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      session_token: sessionToken,
    });

    // Set cookie
    cookies().set({
      name: 'session_token',
      value: sessionToken,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    return NextResponse.json({ success: true, user: { id: user._id, name, email } });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
