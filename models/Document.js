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
    // No longer required, as some docs depend on others
  },
  expiryType: {
    type: String,
    enum: ['DIRECT', 'FITNESS_LINKED', 'MULTI_DOCUMENT_DEPENDENT', 'UNKNOWN'],
    default: 'DIRECT'
  },
  dependencyStatus: {
    type: String,
    enum: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'INVALID_DEPENDENCY', 'NO_EXPIRY_FOUND'],
    default: 'ACTIVE'
  },
  linkedDocuments: {
    type: [String],
    default: []
  },
  linkedExpirySource: {
    type: String
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
