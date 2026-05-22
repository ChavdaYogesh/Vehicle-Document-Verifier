import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Document from '@/models/Document';
import { syncVehicleDependencies } from '@/lib/dependency';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const vehicle_id = formData.get('vehicle_id');
    const type = formData.get('type');
    const expiry_date = formData.get('expiry_date');
    const expiryType = formData.get('expiryType') || 'DIRECT';
    const file = formData.get('file');
    
    const extractedText = formData.get('extractedText');
    const extractionConfidence = formData.get('extractionConfidence');
    const extractionStatus = formData.get('extractionStatus') || 'manual';
    const detectedDocumentType = formData.get('detectedDocumentType');

    if (!vehicle_id || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let upload_path = null;

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Str = buffer.toString('base64');
      const mimeType = file.type || 'application/octet-stream';
      upload_path = `data:${mimeType};base64,${base64Str}`;
    }

    await connectToDatabase();

    // Check if document of this type already exists for this vehicle
    let existingDoc = await Document.findOne({ vehicle_id, type });

    if (existingDoc) {
      // Update
      existingDoc.expiryType = expiryType;
      existingDoc.expiry_date = expiry_date ? new Date(expiry_date) : undefined;
      
      if (upload_path) existingDoc.upload_path = upload_path;
      if (extractedText) existingDoc.extractedText = extractedText;
      if (extractionConfidence) existingDoc.extractionConfidence = Number(extractionConfidence);
      if (extractionStatus) existingDoc.extractionStatus = extractionStatus;
      if (detectedDocumentType) existingDoc.detectedDocumentType = detectedDocumentType;
      
      await existingDoc.save();
      
      await syncVehicleDependencies(vehicle_id);
      
      return NextResponse.json({ id: existingDoc._id.toString(), updated: true }, { status: 200 });
    } else {
      // Insert
      const newDoc = await Document.create({
        vehicle_id,
        type,
        upload_path,
        expiryType,
        expiry_date: expiry_date ? new Date(expiry_date) : undefined,
        extractedText,
        extractionConfidence: extractionConfidence ? Number(extractionConfidence) : undefined,
        extractionStatus,
        detectedDocumentType
      });
      
      await syncVehicleDependencies(vehicle_id);
      
      return NextResponse.json({ id: newDoc._id.toString() }, { status: 201 });
    }
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
