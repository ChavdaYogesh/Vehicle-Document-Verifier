import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Document from '@/models/Document';
import path from 'path';
import fs from 'fs/promises';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    await connectToDatabase();
    
    // Get document first to delete file
    const doc = await Document.findById(id);

    if (doc && doc.upload_path) {
      const filePath = path.join(process.cwd(), 'public', doc.upload_path);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Failed to delete file:', err);
      }
    }

    const deleted = await Document.findByIdAndDelete(id);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
