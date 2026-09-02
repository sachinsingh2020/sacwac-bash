import mongoose from 'mongoose';

const birthdayPageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true, trim: true },
  name: { type: String, required: true, trim: true },
  nickname: { type: String, default: '' },
  age: { type: String, default: '' },
  date: { type: String, required: true },
  message: { type: String, required: true },
  photo: { type: String, default: '' },
  photoPublicId: { type: String, default: '' },
  gallery: { type: [String], default: [] },
  galleryPublicIds: { type: [String], default: [] }
}, { timestamps: true });

export default mongoose.models.BirthdayPage || mongoose.model('BirthdayPage', birthdayPageSchema);
