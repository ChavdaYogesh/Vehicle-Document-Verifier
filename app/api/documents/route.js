import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Document from '@/models/Document';
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

    await connectToDatabase();

    // Check if document of this type already exists for this vehicle
    let existingDoc = await Document.findOne({ vehicle_id, type });

    if (existingDoc) {
      // Update
      existingDoc.expiry_date = new Date(expiry_date);
      if (upload_path) existingDoc.upload_path = upload_path;
      
      await existingDoc.save();
      
      return NextResponse.json({ id: existingDoc._id.toString(), updated: true }, { status: 200 });
    } else {
      // Insert
      const newDoc = await Document.create({
        vehicle_id,
        type,
        upload_path,
        expiry_date: new Date(expiry_date)
      });
      return NextResponse.json({ id: newDoc._id.toString() }, { status: 201 });
    }
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
