require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Database = require('better-sqlite3');
const path = require('path');

// Basic Models for Migration
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  session_token: String,
  fcm_token: String,
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model('User', UserSchema);

const VehicleSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  license_plate: String,
  owner_email: String,
  owner_phone: String,
  owner_fcm_token: String,
  createdAt: { type: Date, default: Date.now },
});
const Vehicle = mongoose.model('Vehicle', VehicleSchema);

const DocumentSchema = new mongoose.Schema({
  vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  type: String,
  upload_path: String,
  expiry_date: Date,
  status: { type: String, default: 'valid' },
  createdAt: { type: Date, default: Date.now },
});
const DocumentModel = mongoose.model('Document', DocumentSchema);

async function migrate() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) throw new Error('MONGODB_URI not found');

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional, remove if you want to append)
    await User.deleteMany({});
    await Vehicle.deleteMany({});
    await DocumentModel.deleteMany({});
    console.log('Cleared existing MongoDB data');

    const dbPath = path.join(__dirname, '..', 'documents.db');
    const sqlite = new Database(dbPath, { readonly: true });
    
    // 1. Migrate Users
    const users = sqlite.prepare('SELECT * FROM users').all();
    const userMap = {}; // SQLite id -> MongoDB ObjectId
    
    for (const sqliteUser of users) {
      const newUser = await User.create({
        name: sqliteUser.name,
        email: sqliteUser.email,
        password: sqliteUser.password,
        session_token: sqliteUser.session_token,
        fcm_token: sqliteUser.fcm_token,
        createdAt: new Date(sqliteUser.created_at)
      });
      userMap[sqliteUser.id] = newUser._id;
    }
    console.log(`Migrated ${users.length} users`);

    // 2. Migrate Vehicles
    const vehicles = sqlite.prepare('SELECT * FROM vehicles').all();
    const vehicleMap = {}; // SQLite id -> MongoDB ObjectId

    for (const sqliteVehicle of vehicles) {
      const newVehicle = await Vehicle.create({
        user_id: userMap[sqliteVehicle.user_id],
        name: sqliteVehicle.name,
        license_plate: sqliteVehicle.license_plate,
        owner_email: sqliteVehicle.owner_email,
        owner_phone: sqliteVehicle.owner_phone,
        owner_fcm_token: sqliteVehicle.owner_fcm_token,
        createdAt: new Date(sqliteVehicle.created_at)
      });
      vehicleMap[sqliteVehicle.id] = newVehicle._id;
    }
    console.log(`Migrated ${vehicles.length} vehicles`);

    // 3. Migrate Documents
    const documents = sqlite.prepare('SELECT * FROM documents').all();
    
    for (const sqliteDoc of documents) {
      await DocumentModel.create({
        vehicle_id: vehicleMap[sqliteDoc.vehicle_id],
        type: sqliteDoc.type,
        upload_path: sqliteDoc.upload_path,
        expiry_date: new Date(sqliteDoc.expiry_date),
        status: sqliteDoc.status,
        createdAt: new Date(sqliteDoc.created_at)
      });
    }
    console.log(`Migrated ${documents.length} documents`);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
