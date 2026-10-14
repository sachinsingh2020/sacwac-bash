import mongoose from 'mongoose';

const verificationTokenSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index auto-deletes expired codes
    },
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.VerificationToken) {
  delete mongoose.models.VerificationToken;
}

export default mongoose.model('VerificationToken', verificationTokenSchema);
