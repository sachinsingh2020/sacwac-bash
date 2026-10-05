import mongoose from 'mongoose';

const visitorLogSchema = new mongoose.Schema(
  {
    slug: { type: String, default: '', index: true, trim: true },
    pageTitle: { type: String, default: '' },
    url: { type: String, default: '' },
    referrer: { type: String, default: 'Direct / Bookmark' },
    ip: { type: String, default: 'Unknown', index: true },
    timezone: { type: String, default: '' },
    browser: { type: String, default: 'Unknown' },
    browserVersion: { type: String, default: '' },
    os: { type: String, default: 'Unknown' },
    osVersion: { type: String, default: '' },
    device: { type: String, default: 'Desktop' }, // Desktop, Mobile, Tablet
    screenResolution: { type: String, default: '' },
    language: { type: String, default: '' },
    visitorId: { type: String, default: '', index: true }, // Client persistent UUID
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

visitorLogSchema.index({ createdAt: -1 });
visitorLogSchema.index({ slug: 1, createdAt: -1 });

if (mongoose.models && mongoose.models.VisitorLog) {
  delete mongoose.models.VisitorLog;
}

export default mongoose.model('VisitorLog', visitorLogSchema);
