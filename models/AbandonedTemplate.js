import mongoose from 'mongoose';

const creationHistorySchema = new mongoose.Schema(
  {
    templateId: { type: String, default: '' },
    name: { type: String, default: 'Someone Special' },
    nickname: { type: String, default: '' },
    sender: { type: String, default: '' },
    dob: { type: String, default: '' },
    age: { type: String, default: '' },
    date: { type: String, default: '' },
    message: { type: String, default: '' },
    photo: { type: String, default: '' },
    photoPublicId: { type: String, default: '' },
    gallery: { type: [String], default: [] },
    galleryPublicIds: { type: [String], default: [] },
    reasons: { type: [String], default: [] },
    galleryCount: { type: Number, default: 0 },
    reasonsCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    clientIp: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { _id: true }
);

const abandonedTemplateSchema = new mongoose.Schema(
  {
    templateId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    visitorId: { type: String, default: '', index: true, trim: true },
    name: { type: String, default: 'Someone Special', trim: true },
    nickname: { type: String, default: '', trim: true },
    sender: { type: String, default: '', trim: true },
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
    visitCount: { type: Number, default: 1 },
    lastVisitedAt: { type: Date, default: Date.now, index: true },
    creationHistory: { type: [creationHistorySchema], default: [] },
  },
  { timestamps: true }
);

abandonedTemplateSchema.index({ lastVisitedAt: -1 });
abandonedTemplateSchema.index({ createdAt: -1 });
abandonedTemplateSchema.index({ isConverted: 1, lastVisitedAt: -1 });

if (mongoose.models && mongoose.models.AbandonedTemplate) {
  delete mongoose.models.AbandonedTemplate;
}

export default mongoose.model('AbandonedTemplate', abandonedTemplateSchema);
