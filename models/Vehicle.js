import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  license_plate: {
    type: String,
    required: true,
    unique: true,
  },
  owner_email: {
    type: String,
  },
  owner_phone: {
    type: String,
  },
  owner_fcm_token: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
