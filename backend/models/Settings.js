const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, unique: true, required: true },
    aiEnabled: { type: Boolean, default: true },
    faqThreshold: { type: Number, default: 0.42 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
