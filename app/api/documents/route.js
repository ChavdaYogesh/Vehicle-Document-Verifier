import { NextResponse } from 'next/server';
import db from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const vehicle_id = formData.get('vehicle_id');
    const type = formData.get('type');
    const expiry_date = formData.get('expiry_date');
    const file = formData.get('file');

    if (!vehicle_id || !type || !expiry_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let upload_path = null;

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
      
      // Ensure the directory exists
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);
      
      upload_path = `/uploads/${filename}`;
    }

    // Check if document of this type already exists for this vehicle
    const existingStmt = db.prepare('SELECT id FROM documents WHERE vehicle_id = ? AND type = ?');
    const existing = existingStmt.get(vehicle_id, type);

    if (existing) {
      // Update
      const stmt = db.prepare(`
        UPDATE documents 
        SET expiry_date = ?, upload_path = coalesce(?, upload_path), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(expiry_date, upload_path, existing.id);
      return NextResponse.json({ id: existing.id, updated: true }, { status: 200 });
    } else {
      // Insert
      const stmt = db.prepare(`
        INSERT INTO documents (vehicle_id, type, upload_path, expiry_date)
        VALUES (?, ?, ?, ?)
      `);
      const info = stmt.run(vehicle_id, type, upload_path, expiry_date);
      return NextResponse.json({ id: info.lastInsertRowid }, { status: 201 });
    }
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
