const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI not set — FAQ features disabled');
    return;
  }
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
    console.log('📦 MongoDB connected');
  } catch (e) {
    console.error('MongoDB connection failed:', e?.message || e);
  }
}

module.exports = { connectDB };
