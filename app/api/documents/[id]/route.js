import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Document from '@/models/Document';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    await connectToDatabase();
    
    const deleted = await Document.findByIdAndDelete(id);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
