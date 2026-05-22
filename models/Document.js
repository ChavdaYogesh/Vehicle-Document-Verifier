import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  vehicle_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  upload_path: {
    type: String,
  },
  expiry_date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    default: 'valid',
  },
  extractedText: {
    type: String,
  },
  extractionConfidence: {
    type: Number,
  },
  extractionStatus: {
    type: String,
    enum: ['pending', 'success', 'failed', 'manual', 'unsupported'],
    default: 'manual',
  },
  detectedDocumentType: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Document || mongoose.model('Document', DocumentSchema);
