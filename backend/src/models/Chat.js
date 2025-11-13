import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  text: { type: String, required: true },
  source: { type: String, enum: ['whatsapp', 'dashboard', 'faq', 'ai'], required: true },
  language: { type: String, default: 'auto' },
  responseType: { type: String, enum: ['faq', 'ai', 'manual', 'none'], default: 'none' },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const ChatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  contactId: { type: String, index: true },
  contactName: { type: String },
  messages: { type: [MessageSchema], default: [] },
  lastMessageAt: { type: Date, default: Date.now },
}, { timestamps: true });

ChatSchema.index({ userId: 1, contactId: 1 }, { unique: true });

export default mongoose.model('Chat', ChatSchema);
