const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, required: true },
    contactId: { type: String, index: true, required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },
    source: { type: String, enum: ['faq', 'ai', 'manual', null], default: null },
  },
  { timestamps: true }
);

messageSchema.index({ userId: 1, contactId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
