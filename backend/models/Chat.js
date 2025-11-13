const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, required: true },
    contactId: { type: String, index: true, required: true },
    lastMessageAt: { type: Date, index: true },
    counters: {
      total: { type: Number, default: 0 },
      faq: { type: Number, default: 0 },
      ai: { type: Number, default: 0 },
      manual: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

chatSchema.index({ userId: 1, contactId: 1 }, { unique: true });

module.exports = mongoose.model('Chat', chatSchema);
