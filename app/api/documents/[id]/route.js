import { NextResponse } from 'next/server';
import db from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    // Get document first to delete file
    const docStmt = db.prepare('SELECT upload_path FROM documents WHERE id = ?');
    const doc = docStmt.get(id);

    if (doc && doc.upload_path) {
      const filePath = path.join(process.cwd(), 'public', doc.upload_path);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Failed to delete file:', err);
      }
    }

    const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
    const info = stmt.run(id);
    
    if (info.changes === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
