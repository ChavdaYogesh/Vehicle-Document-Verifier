import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    
    // Get vehicle and check ownership
    const vehicleStmt = db.prepare('SELECT * FROM vehicles WHERE id = ? AND user_id = ?');
    const vehicle = vehicleStmt.get(id, user.id);
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found or unauthorized' }, { status: 404 });
    }
    
    // Get documents for this vehicle
    const docsStmt = db.prepare('SELECT * FROM documents WHERE vehicle_id = ? ORDER BY type ASC');
    const documents = docsStmt.all(id);
    
    return NextResponse.json({ ...vehicle, documents });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const stmt = db.prepare('DELETE FROM vehicles WHERE id = ? AND user_id = ?');
    const info = stmt.run(id, user.id);
    
    if (info.changes === 0) {
      return NextResponse.json({ error: 'Vehicle not found or unauthorized' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
