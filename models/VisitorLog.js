import mongoose from 'mongoose';

const visitorLogSchema = new mongoose.Schema(
  {
    slug: { type: String, default: '', index: true, trim: true },
    pageTitle: { type: String, default: '' },
    url: { type: String, default: '' },
    referrer: { type: String, default: 'Direct / Bookmark' },
    ip: { type: String, default: 'Unknown', index: true },
    city: { type: String, default: 'Unknown' },
    region: { type: String, default: 'Unknown' },
    country: { type: String, default: 'Unknown', index: true },
    countryCode: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    isExactGps: { type: Boolean, default: false },
    locationCaptured: { type: Boolean, default: false },
    locationPermission: { type: String, default: 'unknown' },
    timezone: { type: String, default: '' },
    isp: { type: String, default: '' },
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
