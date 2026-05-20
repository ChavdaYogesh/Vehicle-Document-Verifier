import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for this user.'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email for this user.'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password for this user.'],
  },
  session_token: {
    type: String,
  },
  fcm_token: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
