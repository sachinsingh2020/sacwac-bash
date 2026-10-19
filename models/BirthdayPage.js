import mongoose from 'mongoose';

const birthdayPageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true, trim: true },
  name: { type: String, required: true, trim: true },
  nickname: { type: String, default: '' },
  sender: { type: String, default: '', trim: true },
  dob: { type: String, default: '' },
  age: { type: String, default: '' },
  date: { type: String, required: true },
  message: { type: String, required: true },
  reasons: { type: [String], default: [] },
  photo: { type: String, default: '' },
  photoPublicId: { type: String, default: '' },
  gallery: { type: [String], default: [] },
  galleryPublicIds: { type: [String], default: [] },
  isPaid: { type: Boolean, default: false },
  convertedByAdmin: { type: Boolean, default: false },
  paymentId: { type: String, default: '' },
  orderId: { type: String, default: '' },
  amountPaid: { type: Number, default: 0 },
  userEmail: { type: String, default: '', lowercase: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reminderSent: { type: Boolean, default: false },
  reminderSentAt: { type: Date, default: null },
}, { timestamps: true });

if (mongoose.models && mongoose.models.BirthdayPage) {
  delete mongoose.models.BirthdayPage;
}

export default mongoose.model('BirthdayPage', birthdayPageSchema);
