import mongoose from 'mongoose';

const abandonedTemplateSchema = new mongoose.Schema(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: { type: String, default: 'Someone Special', trim: true },
    nickname: { type: String, default: '', trim: true },
    dob: { type: String, default: '' },
    age: { type: String, default: '' },
    date: { type: String, default: '' },
    message: { type: String, default: '' },
    reasons: { type: [String], default: [] },
    photo: { type: String, default: '' },
    photoPublicId: { type: String, default: '' },
    gallery: { type: [String], default: [] },
    galleryPublicIds: { type: [String], default: [] },
    userEmail: { type: String, default: '', lowercase: true, trim: true },
    clientIp: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    isConverted: { type: Boolean, default: false }, // true if user eventually paid
  },
  { timestamps: true }
);

abandonedTemplateSchema.index({ createdAt: -1 });

if (mongoose.models && mongoose.models.AbandonedTemplate) {
  delete mongoose.models.AbandonedTemplate;
}

export default mongoose.model('AbandonedTemplate', abandonedTemplateSchema);
