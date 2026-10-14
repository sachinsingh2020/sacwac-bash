import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    picture: {
      type: String,
      default: '',
    },
    provider: {
      type: String,
      enum: ['google', 'email'],
      default: 'google',
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

if (mongoose.models && mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model('User', userSchema);
