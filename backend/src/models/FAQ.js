import mongoose from 'mongoose';

const FAQItemSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true }
}, { _id: false });

const FAQSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, index: true },
  items: { type: [FAQItemSchema], default: [] }
}, { timestamps: true });

export default mongoose.model('FAQ', FAQSchema);
