import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import { syncVehicleDependencies } from '@/lib/dependency';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await connectToDatabase();
    const vehicles = await Vehicle.find({});
    
    for (const vehicle of vehicles) {
      await syncVehicleDependencies(vehicle._id);
    }
    
    return NextResponse.json({ success: true, message: `Recalculated dependencies for ${vehicles.length} vehicles` });
  } catch (error) {
    console.error('Recalculate Error:', error);
    return NextResponse.json({ error: 'Failed to recalculate dependencies' }, { status: 500 });
  }
}
