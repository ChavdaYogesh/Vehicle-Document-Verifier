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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Document || mongoose.model('Document', DocumentSchema);
