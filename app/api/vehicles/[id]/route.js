import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Document from '@/models/Document';
import { getSession } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    
    await connectToDatabase();
    
    // Get vehicle and check ownership
    const vehicle = await Vehicle.findOne({ _id: id, user_id: user.id }).lean();
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found or unauthorized' }, { status: 404 });
    }
    
    // Get documents for this vehicle
    const documents = await Document.find({ vehicle_id: id }).sort({ type: 1 }).lean();
    
    // Format ids
    vehicle.id = vehicle._id.toString();
    const formattedDocs = documents.map(d => ({...d, id: d._id.toString()}));
    
    return NextResponse.json({ ...vehicle, documents: formattedDocs });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    
    await connectToDatabase();
    const deleted = await Vehicle.findOneAndDelete({ _id: id, user_id: user.id });
    
    if (!deleted) {
      return NextResponse.json({ error: 'Vehicle not found or unauthorized' }, { status: 404 });
    }
    
    // Delete associated documents
    await Document.deleteMany({ vehicle_id: id });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
