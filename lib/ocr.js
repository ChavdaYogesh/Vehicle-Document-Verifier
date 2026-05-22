import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import sharp from 'sharp';

const DOC_TYPES = [
  'Insurance', 'PUC', 'Fitness', 'RC', 'Calibration', '9 number', 'Gujarat Permit', 'National Permit'
];

export async function processImageBuffer(buffer) {
  // Compress and grayscale using sharp to improve OCR speed/accuracy
  const processedBuffer = await sharp(buffer)
    .resize(1800, null, { withoutEnlargement: true }) // Resize width to max 1800px
    .grayscale()
    .normalize() // Enhance contrast
    .jpeg({ quality: 80 }) // Compress
    .toBuffer();

  const { data } = await Tesseract.recognize(processedBuffer, 'eng', {
    logger: m => console.log(m),
  });

  return { text: data.text, confidence: data.confidence };
}

export async function processPdfBuffer(buffer) {
  try {
    const data = await pdfParse(buffer);
    return { text: data.text, confidence: 90 }; // pdf-parse is direct text extraction
  } catch (error) {
    console.error('PDF Parse error:', error);
    return { text: '', confidence: 0 };
  }
}

export function extractDocumentData(text) {
  let detectedType = null;
  let vehicleNumber = null;
  let expiryDate = null;
  
  const rawText = text.replace(/\n/g, ' ').toUpperCase();

  // 1. Detect Document Type
  const keywords = {
    'Insurance': ['INSURANCE POLICY', 'POLICY NUMBER', 'INSURED VEHICLE', 'COMPREHENSIVE POLICY'],
    'PUC': ['POLLUTION UNDER CONTROL', 'PUC CERTIFICATE', 'EMISSION TEST'],
    'Fitness': ['CERTIFICATE OF FITNESS', 'FITNESS VALIDITY', 'FITNESS EXPIRY'],
    'RC': ['REGISTRATION CERTIFICATE', 'RC BOOK', 'CHASSIS NUMBER'],
    'Calibration': ['CALIBRATION CERTIFICATE', 'CALIBRATION DUE DATE', 'CALIBRATION VALID'],
    '9 number': ['FORM 9', '9 NUMBER', 'AUTHORIZATION NUMBER'],
    'Gujarat Permit': ['GUJARAT STATE PERMIT', 'GUJARAT PERMIT', 'VALID IN GUJARAT'],
    'National Permit': ['NATIONAL PERMIT', 'ALL INDIA PERMIT', 'GOODS CARRIAGE PERMIT']
  };

  for (const [docType, keys] of Object.entries(keywords)) {
    if (keys.some(k => rawText.includes(k))) {
      detectedType = docType;
      break;
    }
  }

  // 2. Detect Vehicle Number
  // Format: GJ01AB1234 or GJ-01-AB-1234
  const vehicleRegex = /[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,2}[-\s]?[0-9]{4}/g;
  const vehicleMatches = rawText.match(vehicleRegex);
  if (vehicleMatches && vehicleMatches.length > 0) {
    // Clean it up to standard format (e.g. GJ01AB1234)
    vehicleNumber = vehicleMatches[0].replace(/[-\s]/g, '');
  }

  // 3. Detect Expiry Date
  // Common prefixes: Valid Upto, Valid Until, Expiry Date, Valid Till
  const dateRegex = /(?:VALID\s*(?:UPTO|UNTIL|TILL)|EXPIRY\s*DATE|VALIDITY|DUE\s*DATE)[\s\S]{0,30}?(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{1,2}\s*[A-Z]{3,}\s*\d{2,4})/i;
  
  const dateMatch = rawText.match(dateRegex);
  
  if (dateMatch && dateMatch[1]) {
    const rawDate = dateMatch[1];
    expiryDate = parseDateString(rawDate);
  } else {
    // Fallback: Look for ANY date if specific prefixes aren't found
    const genericDateRegex = /(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{1,2}\s*[A-Z]{3,}\s*\d{2,4})/g;
    const allDates = rawText.match(genericDateRegex);
    if (allDates && allDates.length > 0) {
      // Pick the date furthest in the future as a naive guess for expiry
      let maxDate = null;
      allDates.forEach(d => {
        const parsed = parseDateString(d);
        if (parsed) {
          const dObj = new Date(parsed);
          if (!maxDate || dObj > new Date(maxDate)) {
            maxDate = parsed;
          }
        }
      });
      expiryDate = maxDate;
    }
  }

  return {
    documentType: detectedType,
    vehicleNumber: vehicleNumber,
    expiryDate: expiryDate,
    rawText: rawText
  };
}

function parseDateString(dateStr) {
  // Convert 14/10/2026 or 14-10-2026 to YYYY-MM-DD
  const parts = dateStr.replace(/\./g, '-').replace(/\//g, '-').split('-');
  
  if (parts.length === 3) {
    // Assume DD-MM-YYYY
    const [d, m, y] = parts;
    const year = y.length === 2 ? `20${y}` : y;
    if (d.length <= 2 && m.length <= 2) {
      return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // Handle formats like "14 OCT 2026"
  const dObj = new Date(dateStr);
  if (!isNaN(dObj.getTime())) {
    return dObj.toISOString().split('T')[0];
  }

  return null;
}
