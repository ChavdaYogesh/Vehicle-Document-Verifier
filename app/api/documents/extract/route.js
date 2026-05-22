import { NextResponse } from 'next/server';
import { processImageBuffer, processPdfBuffer, extractDocumentData } from '@/lib/ocr';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    
    let textResult = { text: '', confidence: 0 };

    if (mimeType.includes('image/')) {
      textResult = await processImageBuffer(buffer);
    } else if (mimeType === 'application/pdf') {
      textResult = await processPdfBuffer(buffer);
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, JPG, or PNG.' }, { status: 400 });
    }

    if (!textResult.text || textResult.text.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No readable text found in document',
        rawText: ''
      });
    }

    const extractedData = extractDocumentData(textResult.text);

    return NextResponse.json({
      success: true,
      documentType: extractedData.documentType,
      expiryDate: extractedData.expiryDate,
      vehicleNumber: extractedData.vehicleNumber,
      confidence: Math.round(textResult.confidence),
      rawText: textResult.text.substring(0, 500) // Don't return massive strings to the frontend
    });

  } catch (error) {
    console.error('Extraction Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
