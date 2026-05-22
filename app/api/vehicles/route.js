import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import User from '@/models/User';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const vehicles = await Vehicle.find({ user_id: user.id }).sort({ createdAt: -1 }).lean();
    
    // Map _id to id for the frontend
    const formattedVehicles = vehicles.map(v => ({...v, id: v._id.toString()}));
    
    return NextResponse.json(formattedVehicles);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, license_plate } = body;

    if (!name || !license_plate) {
      return NextResponse.json({ error: 'Name and License Plate are required' }, { status: 400 });
    }

    await connectToDatabase();

    const newVehicle = await Vehicle.create({
      user_id: user.id,
      name,
      license_plate
    });

    return NextResponse.json({ id: newVehicle._id.toString() }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) { // MongoDB duplicate key error code
      return NextResponse.json({ error: 'License plate already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
