const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { timestamps: true }
);

faqSchema.index({ userId: 1, question: 1 });

module.exports = mongoose.model('FAQ', faqSchema);
